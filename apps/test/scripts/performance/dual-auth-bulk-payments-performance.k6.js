import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { setup, handleSummary, runBulkFlow, fetchBatchRecordsForBkrefs, logRuntimeExchange, waitForBatchLevelFinalStatus } from './bulk-payments-performance.k6.js';

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
  batchPerHost: Math.max(6, Math.floor(Number(__ENV.K6_RECORDS_PAGE_CONCURRENCY || 20)), String(__ENV.K6_MIX_BATCH || '').split(',').filter((part) => part.trim()).length),
  batch: Math.max(20, Math.floor(Number(__ENV.K6_RECORDS_PAGE_CONCURRENCY || 20))),
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

const APPROVE_AUTO_FORWARD = String(__ENV.K6_APPROVE_AUTO_FORWARD || 'false').trim().toLowerCase() === 'true';
const APPROVE_REASON = __ENV.K6_APPROVE_REASON || 'k6 performance test approval';

// Item-level failures in the v2 bulk action response (shape not fixed: a plain array or { data: [...] } of
// per-transaction results, or a top-level error). Returns transactionId -> reason for every failed item.
function bulkApprovalFailures(payload, parentTransactionIds) {
  const failures = new Map();
  if (payload && !Array.isArray(payload) && payload.error) {
    const reason = payload.error.message || JSON.stringify(payload.error);
    parentTransactionIds.forEach((id) => failures.set(id, reason));
    return failures;
  }
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  for (const item of items) {
    const id = String(item?.transactionId || item?.data?.transactionId || '');
    if (!id) continue;
    const status = String(item?.status?.code || item?.status || '').toUpperCase();
    const failed = Boolean(item?.error || (Array.isArray(item?.errors) && item.errors.length > 0)) || item?.success === false ||
      /FAIL|REJECT|ERROR|DECLIN/.test(status);
    if (failed) failures.set(id, item?.error?.message || item?.errors?.[0]?.message || item?.message || status || 'failed');
  }
  return failures;
}

// Every initiated parent transaction (one per BK) is approved in ONE call to the v2 bulk action endpoint,
// with all transaction IDs in the request body. Each BK records that call's start, finish and API TAT.
function approveParentTransactions(parentTransactionIds, approverToken, recordApproval) {
  parentTransactionIds.forEach((id) => requireValue('parentTransactionId', id));

  const url = `${BASE_URL}/payments-manager/api/v2/payment/action`;
  const approvalHeaders = {
    Authorization: `Bearer ${approverToken}`,
    GCN: approver.gcn,
    channel: __ENV.K6_CHANNEL || 'WEB',
    'Content-Type': 'application/json',
  };
  const body = parentTransactionIds.map((transactionId) => ({
    transactionId,
    operation: 'APPROVE',
    reason: APPROVE_REASON,
    autoForward: APPROVE_AUTO_FORWARD,
  }));

  console.log(`[DUAL AUTH][APPROVER] Approving ${parentTransactionIds.length} parent transaction(s) in one v2 bulk call: ${parentTransactionIds.join(', ')}`);
  const startedAt = Date.now();
  const res = http.patch(url, JSON.stringify(body), { headers: approvalHeaders, tags: { name: 'approve_parent_transactions_bulk' } });
  const endedAt = Date.now();
  logRuntimeExchange('approve_parent_transactions', 'PATCH', url, approvalHeaders, body, res);

  const httpOk = res.status >= 200 && res.status < 300;
  let payload = null;
  try { payload = res.body ? res.json() : null; } catch (_) { payload = null; }
  const failures = httpOk ? bulkApprovalFailures(payload, parentTransactionIds) : new Map(parentTransactionIds.map((id) => [id, `HTTP ${res.status}`]));
  const apiMs = Number(res.timings?.duration ?? (endedAt - startedAt));

  for (const id of parentTransactionIds) {
    if (recordApproval) recordApproval({
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      apiMs,
      status: failures.has(id) ? (httpOk ? 'FAILED' : res.status) : 200,
      transactionId: id,
    });
  }
  check(res, { 'bulk approve status is 2xx': () => httpOk });
  check(null, { 'all parent transactions approved': () => failures.size === 0 });

  if (failures.size > 0) {
    fail(`[dual-auth] Bulk approval failed for ${failures.size} of ${parentTransactionIds.length} parent transaction(s): ${[...failures].map(([id, reason]) => `${id}: ${reason}`).join('; ')}`);
  }
  console.log(`[DUAL AUTH][APPROVER] Bulk approval completed for ${parentTransactionIds.length} parent transaction(s) apiMs=${apiMs.toFixed(0)}`);
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
    approveParentTransactions(context.parentTransactionIds, approverToken, context.recordApproval);
    return pollApprovedChildren(context, expectedStatus, approverToken);
  });
}

function pollApprovedChildren(context, expectedStatus, approverToken) {
  const started = Date.now();
  let result;
  let payments = [];
  let pass = 0;
  // Cheap per-poll check first: one get file batches request returns every BK's status. The FT records are
  // then read to confirm every FT's actual status (same time budget).
  const batchLevel = waitForBatchLevelFinalStatus({
    baseUrl: context.baseUrl, authHeaders: authHeaders(approverToken, approver.gcn), fileId: context.fileId, jar: context.jar,
    expectedStatus, deadlineMs: started + POLL_TIMEOUT_MS, intervalMs: POLL_INTERVAL_SECONDS * 1000,
    initiallyNotFinal: context.pendingAuthTransactionIds || [],
  });
  while (Date.now() - started < POLL_TIMEOUT_MS) {
    pass += 1;
    const passStarted = Date.now();
    result = fetchBatchRecordsForBkrefs(
      context.baseUrl, authHeaders(approverToken, approver.gcn), context.bkRefIds, null, context.jar
    );
    payments = result.records.map((record) => ({
      ftId: String(record.refId || ''),
      transactionId: String(record.transactionId || ''),
      statusCode: String(record.status?.code || '').toUpperCase(),
      resultGroup: normalizeFinalStatus(record.status?.code) === expectedStatus ? 'PASSED' : 'IN_PROGRESS',
    }));
    console.log(`[k6][RECORDS][POLL] pass=${pass} records=${payments.length}/${context.expectedCount} at${expectedStatus}=${payments.filter((payment) => payment.resultGroup === 'PASSED').length} requests=${result.requests.length} passMs=${Date.now() - passStarted}`);
    const uniqueIds = new Set(payments.map((payment) => payment.ftId).filter(Boolean));
    const complete = payments.length === context.expectedCount && uniqueIds.size === context.expectedCount &&
      payments.every((payment) => payment.resultGroup === 'PASSED');
    if (complete) {
      check(true, { 'all Dual Auth children reached expected status': () => true });
      console.log(`[PASS][DUAL AUTH] children=${payments.length} finalStatus=${expectedStatus}`);
      // Use the batch-level time only when every BK was seen moving to final and the FTs now confirm it.
      const finalStatusObservedAt = batchLevel && batchLevel.transitionObserved ? batchLevel.observedAt : new Date().toISOString();
      console.log(`[k6][FINAL-STATUS] observedAt=${finalStatusObservedAt} source=${batchLevel && batchLevel.transitionObserved ? 'batch status transition (confirmed by FT records)' : 'FT records poll'}`);
      const pendingAuthStarted = new Date(context.pendingAuthStartedAt || started).getTime();
      return {
        expectedStatus, payments, records: result.records, requests: result.requests, meta: result.meta,
        finalStatusObservedAt,
        pendingAuthToFinalMs: Date.parse(finalStatusObservedAt) - pendingAuthStarted,
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
