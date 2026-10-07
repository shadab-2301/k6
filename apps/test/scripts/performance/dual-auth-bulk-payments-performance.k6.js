import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { setup, handleSummary, runBulkFlow, fetchBatchRecordsForBkrefs, logRuntimeExchange } from './bulk-payments-performance.k6.js';

export { setup, handleSummary };

let BASE_URL;
let COMPANY;

const approver = {
  loginId: __ENV.UAT_DUAL_AUTH_APP_LOGINGIN_ID,
  username: __ENV.UAT_DUAL_AUTH_APP_USERNAME,
  gcn: __ENV.UAT_DUAL_AUTH_APP_GCN,
};

const POLL_TIMEOUT_MS = Number(__ENV.K6_POLL_TIMEOUT_MS || 300000);
const POLL_INTERVAL_SECONDS = __ENV.K6_POLL_INTERVAL_MS
  ? Number(__ENV.K6_POLL_INTERVAL_MS) / 1000
  : Number(__ENV.K6_POLL_INTERVAL_SECONDS || 2);

export const options = {
  thresholds: {
    batch_flow_failure_rate: ['rate==0'],
  },
  scenarios: {
    dual_auth_batch_flow: {
      executor: 'per-vu-iterations',
      vus: Number(__ENV.PERF_VUS || 1),
      iterations: Number(__ENV.PERF_ITERATIONS || 1),
      maxDuration: __ENV.K6_MAX_DURATION || '10m30s',
    },
  },
};

function authHeaders(token, gcn) {
  return {
    Authorization: `Bearer ${token}`,
    GCN: gcn,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function requireValue(name, value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    fail(`[dual-auth] Missing required value: ${name}`);
  }
  return value;
}

function getAdoTokenFromExistingFlow(context) {
  return requireValue('ADO token', context.adoToken);
}

function generateBapiToken(adoToken, user) {
  requireValue('company', COMPANY);
  requireValue('username', user.username);
  requireValue('GCN', user.gcn);

  const url = `${BASE_URL}/tokens-service/api/v2/tokens` +
    `?company=${encodeURIComponent(COMPANY)}` +
    `&username=${encodeURIComponent(user.username)}`;

  const res = http.get(url, {
    headers: {
      Authorization: `Bearer ${adoToken}`,
      GCN: user.gcn,
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    tags: { name: 'dual_auth_bapi_token' },
  });

  check(res, {
    'dual auth BAPI token status is 200': (r) => r.status === 200,
  });

  if (res.status !== 200) {
    fail(`[dual-auth] BAPI token generation failed for ${user.username}: HTTP ${res.status}`);
  }

  let body;
  try { body = res.json(); } catch (_) {
    fail('[dual-auth] BAPI token response was not JSON');
  }

  const token = body && (body.jwt || body.access_token || body.token);
  return requireValue(`BAPI token for ${user.username}`, token);
}

function approveParentTransaction(parentTransactionId, approverToken, recordApproval) {
  requireValue('parentTransactionId', parentTransactionId);

  const url = `${BASE_URL}/payments-manager/api/v1/payment/` +
    `${encodeURIComponent(parentTransactionId)}/APPROVE?autoForward=true`;

  console.log(`[DUAL AUTH][APPROVER] Approving parent transactionId=${parentTransactionId}`);

  const approvalHeaders = {
    Authorization: `Bearer ${approverToken}`,
    GCN: approver.gcn,
    channel: __ENV.K6_CHANNEL || 'WEB',
  };
  const approvalStarted = Date.now();
  const res = http.patch(url, null, {
    headers: approvalHeaders,
    tags: { name: 'approve_parent_transaction' },
  });
  const approvalEnded = Date.now();
  if (recordApproval) recordApproval({
    startedAt: new Date(approvalStarted).toISOString(),
    endedAt: new Date(approvalEnded).toISOString(),
    apiMs: Number(res.timings?.duration ?? (approvalEnded - approvalStarted)),
    status: res.status,
  });
  logRuntimeExchange('approve_parent_transaction', 'PATCH', url, approvalHeaders, null, res);

  check(res, {
    'approve status is 200': (r) => r.status === 200,
  });

  if (res.status !== 200) {
    fail(`[dual-auth] Approval failed for parentTransactionId=${parentTransactionId}, HTTP ${res.status}`);
  }

  let body;
  try { body = res.json(); } catch (_) {
    fail('[dual-auth] Approve response was not JSON');
  }

  console.log(`[DUAL AUTH][APPROVER] Approval completed parentTransactionId=${parentTransactionId}`);
  return body;
}

function expectedFinalStatus(paymentDate) {
  requireValue('paymentDate', paymentDate);
  // Compare using YYYY-MM-DD to avoid local time-of-day affecting current/future classification.
  const today = new Date().toISOString().slice(0, 10);
  return paymentDate <= today ? 'SENT' : 'SCHEDULED';
}

export default function (ctx) {
  BASE_URL = ctx.baseUrl;
  COMPANY = ctx.dualAuthCompany;
  approver.username = ctx.dualAuthAppUsername;
  approver.gcn = ctx.dualAuthAppGCN;
  console.log(`[dual-auth][auth-context] authMode=DUAL_AUTH company=${COMPANY} role=INITIATOR`);
  console.log('[DUAL AUTH] Starting initiator flow');

  return runBulkFlow(ctx, (context) => {
    const adoToken = getAdoTokenFromExistingFlow(context);
    const paymentDate = requireValue('paymentDate', context.paymentDate);
    const expectedStatus = expectedFinalStatus(paymentDate);
    console.log(`[dual-auth][auth-context] authMode=DUAL_AUTH company=${COMPANY} role=APPROVER`);
    const approverToken = generateBapiToken(adoToken, approver);
    for (const parentTransactionId of context.parentTransactionIds) {
      approveParentTransaction(parentTransactionId, approverToken, context.recordApproval);
    }
    return pollApprovedChildren(context, expectedStatus, approverToken);
  });
}

function pollApprovedChildren(context, expectedStatus, approverToken) {
  const started = Date.now();
  let result;
  let payments = [];
  while (Date.now() - started < POLL_TIMEOUT_MS) {
    result = fetchBatchRecordsForBkrefs(
      context.baseUrl, authHeaders(approverToken, approver.gcn), context.bkRefIds, 100, context.jar
    );
    payments = result.records.map((record) => ({
      ftId: String(record.refId || ''),
      transactionId: String(record.transactionId || ''),
      statusCode: String(record.status?.code || '').toUpperCase(),
      resultGroup: normalizeFinalStatus(record.status?.code) === expectedStatus ? 'PASSED' : 'IN_PROGRESS',
    }));
    const uniqueIds = new Set(payments.map((payment) => payment.ftId).filter(Boolean));
    const complete = payments.length === context.expectedCount && uniqueIds.size === context.expectedCount &&
      payments.every((payment) => payment.resultGroup === 'PASSED');
    if (complete) {
      check(true, { 'all Dual Auth children reached expected status': () => true });
      console.log(`[PASS][DUAL AUTH] children=${payments.length} finalStatus=${expectedStatus}`);
      const finalStatusObservedAt = new Date(Date.now()).toISOString();
      const pendingAuthStarted = new Date(context.pendingAuthStartedAt || started).getTime();
      return {
        expectedStatus, payments, requests: result.requests, meta: result.meta,
        finalStatusObservedAt,
        pendingAuthToFinalMs: Date.now() - pendingAuthStarted,
      };
    }
    if (payments.some((payment) => /^(FAILED|REJECTED)$/.test(payment.statusCode))) {
      break;
    }
    const remainingMs = POLL_TIMEOUT_MS - (Date.now() - started);
    if (remainingMs > 0) sleep(Math.min(POLL_INTERVAL_SECONDS, remainingMs / 1000));
  }
  check(false, { 'all Dual Auth children reached expected status': () => false });
  throw new Error(`[dual-auth] Child validation failed expected=${expectedStatus} expectedCount=${context.expectedCount} actualCount=${payments.length} statuses=${JSON.stringify(payments.map((payment) => ({ ftId: payment.ftId, status: payment.statusCode })))}`);
}

function normalizeFinalStatus(statusCode) {
  const code = String(statusCode || '').toUpperCase();
  return code === 'SCHED' ? 'SCHEDULED' : code;
}
