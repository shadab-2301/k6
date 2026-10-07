const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptDir = path.resolve(__dirname, '../apps/test/scripts/performance');
const bulkSource = fs.readFileSync(path.join(scriptDir, 'bulk-payments-performance.k6.js'), 'utf8');
const dualSource = fs.readFileSync(path.join(scriptDir, 'dual-auth-bulk-payments-performance.k6.js'), 'utf8');

function executable(source, defaultName) {
  return source
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export \{.*\};\r?\n/gm, '')
    .replace(/export default function\s*\(/g, `function ${defaultName}(`)
    .replace(/export (function|const) /g, '$1 ');
}

function loadSetup(authMode, overrides = {}) {
  const metricValues = [];
  class Metric {
    constructor(name) { this.name = name; }
    add(value) { metricValues.push({ name: this.name, value }); }
  }
  const context = {
    __ENV: {
      ENV: 'UAT', K6_AUTH_MODE: authMode, K6_PAYMENT_TYPE: 'TPT', K6_RAIL: 'EFT', K6_NUM_PAYMENTS: '10',
      UAT_AUTH_URL: 'https://auth.example.test', UAT_CAPI_URL: 'https://capi.example.test',
      UAT_BAPI_URL: 'https://bapi.example.test', UAT_LOGIN_PASSWORD: 'test-password', UAT_OTP: 'test-otp',
      UAT_SINGLE_AUTH_COMPANY: 'single-company', UAT_SINGLE_AUTH_INI_LOGINGIN_ID: 'single-login',
      UAT_SINGLE_AUTH_INI_USERNAME: 'single-user', UAT_SINGLE_AUTH_INI_GCN: 'single-gcn',
      UAT_DUAL_AUTH_COMPANY: 'dual-company', UAT_DUAL_AUTH_INI_LOGINGIN_ID: 'dual-login',
      UAT_DUAL_AUTH_INI_USERNAME: 'dual-user', UAT_DUAL_AUTH_INI_GCN: 'dual-gcn',
      UAT_DUAL_AUTH_APP_USERNAME: 'approver-user', UAT_DUAL_AUTH_APP_GCN: 'approver-gcn',
    },
    open: (file, mode) => {
      if (file.endsWith('.env.platform')) return '';
      if (file.endsWith('adoTokenClient.json')) return '{}';
      const absolutePath = path.resolve(scriptDir, file);
      return mode === 'b' ? fs.readFileSync(absolutePath) : fs.readFileSync(absolutePath, 'utf8');
    },
    Counter: Metric, Rate: Metric, Trend: Metric,
    console: { info() {}, log() {}, warn() {}, error() {} },
    collectedMetricValues: metricValues,
  };
  Object.assign(context.__ENV, overrides);
  vm.createContext(context);
  vm.runInContext(executable(bulkSource, 'singleEntry') + '\nresult = setup(); csv = getEnvironmentBatchFile();', context);
  return context;
}

const dualSetup = loadSetup('DUAL_AUTH');
assert.equal(dualSetup.result.singleAuthCompany, 'dual-company');
assert.equal(dualSetup.result.singleAuthIniLoginginId, 'dual-login');
assert.equal(dualSetup.result.singleAuthIniUsername, 'dual-user');
assert.equal(dualSetup.result.singleAuthIniGCN, 'dual-gcn');
const dualFixture = JSON.parse(fs.readFileSync(path.resolve(scriptDir, '../../../../Test Data/UAT/payments/batch payments/TPT_BatchDualAuth.json'), 'utf8'));
assert.ok(dualSetup.csv.includes(dualFixture.fromAccount));
assert.equal(dualSetup.csv.trim().split(/\r?\n/).length, 12);
const singleSetup = loadSetup('SINGLE_AUTH');
assert.equal(singleSetup.result.singleAuthCompany, 'single-company');
assert.equal(singleSetup.result.singleAuthIniLoginginId, 'single-login');
dualSetup.__ENV.UAT_DUAL_AUTH_INI_USERNAME = '';
assert.throws(() => vm.runInContext('environmentConfig.dualAuthIniUsername = ""; setup();', dualSetup), /UAT_DUAL_AUTH_INI_USERNAME/);
const emptyDualData = loadSetup('DUAL_AUTH');
assert.throws(() => vm.runInContext('delete UAT_BATCH_DATA.TPT; setup();', emptyDualData), /BatchDualAuth.json/);
console.log('PASS setup selects isolated Dual Auth identities and fixture; Single Auth selection is unchanged');

for (const authMode of ['SINGLE_AUTH', 'DUAL_AUTH']) {
  for (const paymentType of authMode === 'SINGLE_AUTH' ? ['TPT', 'PRLSD', 'ADHOC'] : ['TPT', 'PRLSD']) {
    const context = loadSetup(authMode, {
      K6_PAYMENT_TYPE: paymentType, K6_RAIL: 'PAYSHAP', K6_NUM_PAYMENTS: '5000', K6_PAYMENT_DATE: '2099-12-01',
      ...(authMode === 'SINGLE_AUTH' && paymentType === 'PRLSD' ? {
        K6_TEST_DATA_JSON: JSON.stringify({
          paymentType: 'PRLSD', fromAccount: 'test-debit', singleDebit: true, defaultAmount: 2,
          beneficiaries: [
            { accountNumber: 'test-credit-1', branchCode: '001' },
            { accountNumber: 'test-credit-2', branchCode: '002' },
          ],
        }),
      } : {}),
    });
    const rows = context.csv.trim().split(/\r?\n/);
    assert.equal(rows.length, 5002);
    const details = rows.slice(1, -1).map(row => row.split(','));
    assert.ok(details.every(row => row[9] === 'PAYSHAP' && row[10] === '01/12/2099'));
    assert.ok(details.every(row => row[1] === details[0][1]));
    const totalCents = details.reduce((sum, row) => sum + Math.round(Number(row[8]) * 100), 0);
    assert.equal(rows.at(-1).split(',')[1], '5000');
    assert.equal(rows.at(-1).split(',')[2], (totalCents / 100).toFixed(2));
    if (new Set(details.map(row => row[5])).size > 1) {
      assert.ok(details.every((row, index) => index === 0 || row[5] !== details[index - 1][5]));
    }
    context.__VU = 1;
    context.__ITER = 0;
    vm.runInContext('batch = buildPaymentBatchXml(getEnvData(), configuredNumPayments); request = buildInitiateRequestBody(batch, "FILE", "TX");', context);
    assert.equal(context.batch.railType, 'PAYSHAP');
    assert.equal(context.batch.numPayments, 5000);
    assert.equal(context.request.rail, 'PAYSHAP');
    assert.equal(context.request.paymentDate, '2099-12-01');
    assert.equal(context.request.singleDebit, true);
  }
}
console.log('PASS TPT/PRLSD PAYSHAP in both auth modes and Single Auth ADHOC: 5000 CSV rows, account rotation, totals, future date and initiation rail');

function exerciseInitiator(paymentDate) {
  const context = loadSetup('DUAL_AUTH');
  Object.assign(context.__ENV, {
    K6_PAYMENT_DATE: paymentDate, K6_SAS_OTP_WAIT_SECONDS: '0',
    adoClient_id: 'test-client', adoClient_secret: 'test-secret', adoScope: 'test-scope',
  });
  context.__VU = 1;
  context.__ITER = 0;
  context.sleep = () => {};
  context.md5 = value => require('node:crypto').createHash('md5').update(String(value)).digest('hex');
  context.check = (value, predicates) => assert.ok(Object.values(predicates).every(predicate => predicate(value)));
  let otpCount = 0;
  let handover;
  let uploadedCsv;
  const snapshots = [];
  context.emitExecutionCapture = execution => snapshots.push(JSON.parse(JSON.stringify(execution)));
  const response = (body, status = 200, headers = {}) => ({
    status, headers, timings: { duration: 1 }, body: JSON.stringify(body), json: () => body,
  });
  context.http = {
    cookieJar: () => ({}),
    post: (url, body) => {
      if (url.endsWith('/auth')) {
        assert.equal(JSON.parse(body).Username, 'dual-login');
        return response({ LoggedIn: true, Authenticated: true }, 200, { 'Set-Cookie': 'SSO_STAGING=test-session; Path=/' });
      }
      if (url.endsWith('/auth/otp')) {
        otpCount++;
        return response({ Status: 'Ok', Result: false, Message: 'Invalid token' }, 200, { 'Set-Cookie': 'SSO_STAGING=test-session; Path=/' });
      }
      if (url.includes('/sas-url?')) {
        const parsed = new URL(url);
        assert.equal(parsed.searchParams.get('company'), 'dual-company');
        assert.equal(parsed.searchParams.get('username'), 'dual-user');
        return response({ sasUrl: 'https://blob.example.test/upload', uploadHeaders: { 'x-ms-blob-type': 'BlockBlob' }, fileId: 'FILE1' });
      }
      if (url.includes('/oauth2/v2.0/token')) return response({ access_token: 'test-ado' });
      throw new Error(`Unexpected POST ${url}`);
    },
    put: (url, body) => {
      assert.equal(url, 'https://blob.example.test/upload');
      uploadedCsv = body;
      return response({}, 201);
    },
    get: (url, params) => {
      if (url.includes('/tokens-service/')) {
        const parsed = new URL(url);
        assert.equal(parsed.searchParams.get('company'), 'dual-company');
        assert.equal(parsed.searchParams.get('username'), 'dual-user');
        assert.equal(params.headers.GCN, 'dual-gcn');
        return response({ jwt: 'test-initiator-token' });
      }
      assert.equal(params.headers.GCN, 'dual-gcn');
      if (url.endsWith('/files/FILE1')) return response({ data: { fileId: 'FILE1', status: { code: 'PENDINIT' } } });
      if (url.endsWith('/FILE1/batches')) return response({ data: [{ transactionId: 'parent1', bkReference: 'BK1', rail: { code: 'EFT' } }] });
      throw new Error(`Unexpected GET ${url}`);
    },
    batch: requests => requests.map(request => {
      assert.equal(JSON.parse(request[2]).paymentDate, paymentDate);
      assert.equal(request[3].headers.GCN, 'dual-gcn');
      return response({ data: { status: { code: 'PENDAUTH' } } });
    }),
  };
  context.afterInitiate = value => {
    handover = value;
    return { expectedStatus: 'SENT', payments: [], requests: [], meta: {} };
  };
  vm.runInContext('runBulkFlow(result, afterInitiate);', context);
  assert.ok(handover, 'shared initiator must reach the approval handover');
  assert.equal(handover.adoToken, 'test-ado');
  assert.equal(handover.parentTransactionIds.join(','), 'parent1');
  assert.equal(handover.bkRefIds.join(','), 'BK1');
  assert.equal(handover.expectedCount, 10);
  assert.equal(handover.paymentDate, paymentDate);
  assert.equal(otpCount, 2);
  assert.ok(uploadedCsv.includes(dualFixture.fromAccount));
  assert.ok(uploadedCsv.includes(paymentDate.split('-').reverse().join('/')));
  assert.equal(context.collectedMetricValues.find(metric => metric.name === 'batch_flow_failure_rate').value, false);
  const captured = snapshots.at(-1);
  for (const key of ['executionStartedAt', 'fileUploadStartedAt', 'fileUploadCompletedAt',
    'pendingInitiationObservedAt', 'initiationStartedAt', 'initiationFinishedAt', 'pendingApprovalObservedAt']) {
    assert.match(captured.timestamps[key], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  }
  assert.equal(captured.timestamps.executionStartedAt, captured.timestamps.uploadStartedAt);
  assert.ok(new Date(captured.timestamps.pendingInitiationObservedAt) <= new Date(captured.timestamps.pendinitEndedAt));
  context.__ITER = 1;
  vm.runInContext('runBulkFlow(result, afterInitiate);', context);
  assert.equal(snapshots.at(-1).iteration, 2);
  assert.notEqual(snapshots.at(-1).timestamps, captured.timestamps);
  assert.equal(snapshots.at(-1).timestamps.approvalStartedAt, undefined);
}

exerciseInitiator(new Date().toISOString().slice(0, 10));
exerciseInitiator('2099-12-01');
console.log('PASS shared initiator reaches approval handover with Dual Auth login/SAS/BAPI identity, both OTP calls and selected CSV/date');

function exercise(paymentDate, rounds, shouldPass) {
  let clock = Date.now();
  const pendingAuthStarted = clock - 100;
  let fetchCount = 0;
  const approvals = [];
  const approvalTimings = [];
  const checks = [];
  const context = {
    __ENV: { K6_AUTH_MODE: 'DUAL_AUTH', K6_POLL_TIMEOUT_MS: '3000', K6_POLL_INTERVAL_MS: '1000' },
    Date: class extends Date { static now() { return clock; } },
    console: { info() {}, log() {}, warn() {}, error() {} },
    setup() {}, handleSummary() {}, logRuntimeExchange() {},
    fail: message => { throw new Error(message); },
    check: (value, predicates) => { checks.push(...Object.values(predicates).map(predicate => predicate(value))); },
    sleep: seconds => { clock += seconds * 1000; },
    http: {
      get: (url, params) => {
        const parsed = new URL(url);
        assert.equal(parsed.host, 'bapi.example.test');
        assert.equal(parsed.searchParams.get('company'), 'dual-company');
        assert.equal(parsed.searchParams.get('username'), 'approver-user');
        assert.equal(params.headers.GCN, 'approver-gcn');
        assert.equal(params.headers.Authorization, 'Bearer test-ado');
        clock += 50;
        return { status: 200, json: () => ({ jwt: 'test-approver-token' }) };
      },
      patch: (url, body, params) => {
        assert.equal(body, null);
        assert.equal(params.headers.Authorization, 'Bearer test-approver-token');
        assert.equal(params.headers.GCN, 'approver-gcn');
        assert.equal(params.headers.channel, 'WEB');
        assert.equal(params.headers['Content-Type'], undefined);
        approvals.push(url);
        clock += 80;
        return { status: 200, timings: { duration: 75 }, json: () => ({}) };
      },
    },
    runBulkFlow: (ctx, callback) => callback({
      adoToken: 'test-ado', baseUrl: ctx.baseUrl, parentTransactionIds: ['parent1', 'parent2'],
      bkRefIds: ['BK1', 'BK2'], paymentDate, expectedCount: 2, jar: 'test-jar',
      pendingAuthStartedAt: new Date(pendingAuthStarted).toISOString(),
      recordApproval: timing => approvalTimings.push(timing),
    }),
    fetchBatchRecordsForBkrefs: (baseUrl, headers, bkrefs, pageSize, jar) => {
      assert.equal(baseUrl, 'https://bapi.example.test');
      assert.equal(headers.Authorization, 'Bearer test-approver-token');
      assert.equal(headers.GCN, 'approver-gcn');
      assert.equal(bkrefs.join(','), 'BK1,BK2');
      assert.equal(pageSize, 100);
      assert.equal(jar, 'test-jar');
      clock += 30;
      const rows = rounds[Math.min(fetchCount++, rounds.length - 1)];
      return { records: rows, requests: [{ url: 'records-request' }] };
    },
    ctx: { baseUrl: 'https://bapi.example.test', dualAuthCompany: 'dual-company', dualAuthAppUsername: 'approver-user', dualAuthAppGCN: 'approver-gcn' },
  };
  vm.createContext(context);
  vm.runInContext(executable(dualSource, 'dualEntry'), context);
  if (shouldPass) {
    vm.runInContext('result = dualEntry(ctx);', context);
    assert.equal(context.result.payments.length, 2);
    assert.equal(context.result.requests.length, 1);
    assert.equal(context.result.pendingAuthToFinalMs, clock - pendingAuthStarted);
    assert.equal(context.result.finalStatusObservedAt, new Date(clock).toISOString());
    assert.ok(checks.every(Boolean));
  } else {
    assert.throws(() => vm.runInContext('dualEntry(ctx);', context), /Child validation failed/);
    assert.equal(checks.at(-1), false);
  }
  assert.equal(approvals.length, 2);
  assert.equal(approvalTimings.length, 2);
  assert.ok(approvalTimings.every(timing => timing.apiMs === 75 && timing.status === 200));
  assert.ok(approvalTimings.every(timing => new Date(timing.endedAt) - new Date(timing.startedAt) === 80));
  assert.ok(approvals[0].endsWith('/parent1/APPROVE?autoForward=true'));
  assert.ok(approvals[1].endsWith('/parent2/APPROVE?autoForward=true'));
  return fetchCount;
}

function record(refId, status) {
  return { refId, transactionId: `tx-${refId}`, status: { code: status } };
}

const today = new Date().toISOString().slice(0, 10);
assert.equal(exercise(today, [[record('FT1', 'SENT')], [record('FT1', 'SENT'), record('FT2', 'SENT')]], true), 2);
exercise('2099-12-01', [[record('FT1', 'SCHEDULED'), record('FT2', 'SCHEDULED')]], true);
exercise('2099-12-01', [[record('FT1', 'SCHED'), record('FT2', 'SCHED')]], true);
exercise(today, [[record('FT1', 'SCHED'), record('FT2', 'SCHED')]], false);
exercise('2099-12-01', [[record('FT1', 'SENT'), record('FT2', 'SENT')]], false);
exercise(today, [[record('FT1', 'SENT')]], false);
exercise(today, [[record('FT1', 'SENT'), record('FT1', 'SENT')]], false);
exercise(today, [[record('FT1', 'UNKNOWN'), record('FT2', 'SENT')]], false);
exercise(today, [[record('FT1', 'REJECTED'), record('FT2', 'SENT')]], false);
assert.ok(!dualSource.includes('ADAPTER REQUIRED'));
console.log('PASS all parents approved; current/future status checks; partial, duplicate, unknown and rejected children fail');

const wrapperSource = fs.readFileSync(path.resolve(__dirname, 'run-performance-k6.js'), 'utf8');
const reportContext = {
  require: name => name === 'fs' ? { existsSync: () => false } : require(name),
  __dirname,
  process: { argv: ['node', 'runner', '--env', 'UAT', '--auth-mode', 'DUAL_AUTH'], env: {}, exit: code => { throw new Error(`Unexpected exit ${code}`); } },
  console: { log() {}, error() {} },
};
vm.createContext(reportContext);
vm.runInContext(wrapperSource.replace(/\brun\(\);\s*$/, ''), reportContext);
reportContext.executions = [{
  authMode: 'DUAL_AUTH', vu: 1, iteration: 1, paymentType: 'TPT', railType: 'EFT', paymentCount: 10,
  fileId: 'FILE-REPORT', fileName: 'batch', status: 'PASSED', parentTransactionIds: ['parent'], bkRefIds: ['BK'],
  timings: { initiationApiMs: 980, approvalApiMs: 250, pendingAuthToFinalMs: 1100 },
  timestamps: {
    uploadStartedAt: '2026-10-06T14:52:10.000Z', pendinitEndedAt: '2026-10-06T14:52:21.000Z',
    approvalStartedAt: '2026-10-06T14:52:22.100Z', approvalEndedAt: '2026-10-06T14:52:22.350Z',
    finalStatusObservedAt: '2026-10-06T14:52:23.100Z', sentEndedAt: '2026-10-06T14:52:23.100Z',
  },
  statuses: { sent: 'SCHEDULED' }, payments: [],
}];
vm.runInContext('html = renderExecutionTraceTable(executions);', reportContext);
const expectedColumns = ['PaymentTYPE', 'RAIL Type', 'Records', 'File Validation time', 'Initiation (API TAT)', 'Approval (API TAT)', 'Time from Pend App-&gt; Sent/Sched', 'File ID'];
assert.deepEqual([...reportContext.html.matchAll(/<th>(.*?)<\/th>/g)].map(match => match[1]), expectedColumns);
assert.ok(reportContext.html.includes('FILE-REPORT'));
assert.ok(reportContext.html.includes('Approval Started'));
for (const [key, value] of Object.entries({ initiationApiMs: 980, approvalApiMs: 250, pendingAuthToFinalMs: 1100 })) {
  reportContext.testValue = value;
  reportContext.timingKey = key;
  vm.runInContext('formatted = formatDurationMs(testValue); average = executionTimingSummary(executions, timingKey);', reportContext);
  assert.ok(reportContext.html.includes(reportContext.formatted));
  assert.equal(reportContext.average, reportContext.formatted);
}
reportContext.executions[0].timings = {};
reportContext.executions[0].status = 'FAILED';
reportContext.executions[0].failure = { stage: 'DUAL_AUTH_APPROVAL', message: 'Approval failed <test>' };
vm.runInContext('html = renderExecutionTraceTable(executions); average = executionTimingSummary(executions, "approvalApiMs");', reportContext);
assert.equal(reportContext.average, 'n/a');
assert.ok(reportContext.html.includes('Failure Summary'));
assert.ok(reportContext.html.includes('Approval failed &lt;test&gt;'));
assert.ok(!reportContext.html.includes('NaN'));
vm.runInContext('html = renderExecutionTraceTable([]);', reportContext);
assert.ok(reportContext.html.includes('No execution data'));
const singleReportContext = { ...reportContext, process: { ...reportContext.process, argv: ['node', 'runner', '--env', 'UAT'] } };
vm.createContext(singleReportContext);
vm.runInContext(wrapperSource.replace(/\brun\(\);\s*$/, '') + '\nhtml = renderExecutionTraceTable(executions);', singleReportContext);
assert.deepEqual([...singleReportContext.html.matchAll(/<th>(.*?)<\/th>/g)].map(match => match[1]),
  ['PaymentTYPE', 'RAIL Type', 'Records', 'File Validation time', 'Initiation (API TAT)', 'Time from Pend Initi-&gt; Sent/Sched', 'File ID']);
assert.ok(!singleReportContext.html.includes('<th>Approval (API TAT)</th>'));
singleReportContext.executions = [{ ...reportContext.executions[0], status: 'PASSED', failure: null,
  timings: { initiationApiMs: 980, pendingInitiToFinalMs: 2100 } }];
vm.runInContext('html = renderExecutionTraceTable(executions); apiDuration = formatDurationMs(980); finalDuration = formatDurationMs(2100);', singleReportContext);
assert.ok(singleReportContext.html.includes(singleReportContext.apiDuration));
assert.ok(singleReportContext.html.includes(singleReportContext.finalDuration));
assert.ok(singleReportContext.html.includes('colspan="7"'));
assert.ok(singleReportContext.html.includes('FT-ID Outcome Summary'));
console.log('PASS approval API timing boundaries, pending-to-final duration, Dual Auth and Single Auth report columns, failure/missing timings');

const timingStart = bulkSource.indexOf('        const expectedFinalStatus = expectedInitiateStatus(intBatch.paymentDate)');
const timingEnd = bulkSource.indexOf('        emitExecutionSnapshot(execution);', timingStart);
assert.ok(timingStart >= 0 && timingEnd > timingStart);
for (const [expectedInitiation, codes, timedOut, expectedDuration] of [
  ['INPROGRESS', ['SENT', 'SENT'], false, 2100],
  ['SCHEDULED', ['SCHED', 'SCHEDULED'], false, 2100],
  ['INPROGRESS', ['INPROGRESS', 'SENT'], false, undefined],
  ['SCHEDULED', ['SCHED'], false, undefined],
  ['INPROGRESS', ['SENT', 'SENT'], true, undefined],
]) {
  const timingContext = {
    execution: {
      timings: {}, payments: codes.map(statusCode => ({ statusCode })),
      timestamps: { pendinitEndedAt: '2026-10-06T14:52:21.000Z', sentEndedAt: '2026-10-06T14:52:23.100Z' },
    },
    intBatch: { paymentDate: '2026-10-07' }, sentTimedOut: timedOut, expectedRecordCount: 2,
    expectedInitiateStatus: () => expectedInitiation,
    canonicalInitiateStatus: code => code === 'SCHED' ? 'SCHEDULED' : code,
  };
  vm.runInNewContext(bulkSource.slice(timingStart, timingEnd), timingContext);
  assert.equal(timingContext.execution.timings.pendingInitiToFinalMs, expectedDuration);
  assert.equal(timingContext.execution.timestamps.finalStatusObservedAt,
    expectedDuration === undefined ? undefined : timingContext.execution.timestamps.sentEndedAt);
}
console.log('PASS Single Auth PENDINIT-to-final timing includes initiation; current/scheduled, incomplete and timeout timing checks');

const lifecycleLabels = ['File Upload Started', 'File Upload Completed', 'Pending Initiation Observed',
  'Initiation Started', 'Initiation Finished', 'Pending Approval Observed', 'Approval Started',
  'Approval Finished', 'Final Status Observed'];
reportContext.lifecycleExecution = { timestamps: {
  executionStartedAt: '2026-10-07T07:03:20.355Z',
  fileUploadStartedAt: '2026-10-07T07:03:21.230Z', fileUploadCompletedAt: '2026-10-07T07:03:22.012Z',
  pendingInitiationObservedAt: '2026-10-07T07:04:00.111Z', initiationStartedAt: '2026-10-07T07:04:01.222Z',
  initiationFinishedAt: '2026-10-07T07:04:02.333Z', pendingApprovalObservedAt: '2026-10-07T07:04:02.444Z',
  approvalStartedAt: '2026-10-07T07:06:48.230Z', approvalEndedAt: '2026-10-07T07:06:55.012Z',
  finalStatusObservedAt: '2026-10-07T07:11:01.645Z',
} };
vm.runInContext('timeline = renderLifecycleTimestamps(lifecycleExecution, true);', reportContext);
assert.deepEqual([...reportContext.timeline.matchAll(/<span>(.*?)<\/span>/g)].map(match => match[1]), lifecycleLabels);
assert.ok(reportContext.timeline.includes('2026-10-07 07:06:48.230 UTC'));
assert.ok(reportContext.timeline.includes('2026-10-07 07:11:01.645 UTC'));
vm.runInContext('timeline = renderLifecycleTimestamps(lifecycleExecution, false);', reportContext);
assert.ok(!reportContext.timeline.includes('Pending Approval Observed'));
assert.equal((reportContext.timeline.match(/N\/A - Auto-approved during initiation/g) || []).length, 2);
assert.ok(!reportContext.timeline.includes('2026-10-07 07:06:48.230 UTC'));
vm.runInContext('timeline = renderLifecycleTimestamps({}, true);', reportContext);
assert.ok(!reportContext.timeline.includes('Invalid Date'));
assert.equal((reportContext.timeline.match(/<strong>N\/A<\/strong>/g) || []).length, 9);

const captureContext = loadSetup('SINGLE_AUTH');
let captureClock = Date.parse('2026-10-07T07:00:00.000Z');
captureContext.Date = class extends Date {
  constructor(...args) { super(...(args.length ? args : [captureClock])); }
  static now() { return captureClock; }
};
captureContext.check = () => {};
captureContext.timestamps = {};
captureContext.http = { put: () => {
  assert.equal(captureContext.timestamps.fileUploadStartedAt, '2026-10-07T07:00:00.000Z');
  captureClock += 200;
  return { status: 201, headers: {}, body: '' };
} };
vm.runInContext('uploadFileToSasUrl("https://blob.example.test", {type:"blob"}, "csv", timestamps);', captureContext);
assert.equal(captureContext.timestamps.fileUploadCompletedAt, '2026-10-07T07:00:00.200Z');
captureContext.timestamps = {};
captureContext.http.put = () => ({ status: 500, headers: {}, body: '' });
assert.throws(() => vm.runInContext('uploadFileToSasUrl("https://blob.example.test", {type:"blob"}, "csv", timestamps);', captureContext), /File Manager upload failed/);
assert.equal(captureContext.timestamps.fileUploadCompletedAt, undefined);

const observationStart = bulkSource.indexOf('                    if (fileStatus === "PENDINIT" &&');
const observationEnd = bulkSource.indexOf('                    execution.statuses.pendinit', observationStart);
const observationContext = { execution: { timestamps: {} }, fileStatus: 'VAL_IN_PROG' };
vm.runInNewContext(bulkSource.slice(observationStart, observationEnd), observationContext);
assert.equal(observationContext.execution.timestamps.pendingInitiationObservedAt, undefined);
observationContext.fileStatus = 'PENDINIT';
vm.runInNewContext(bulkSource.slice(observationStart, observationEnd), observationContext);
const observed = observationContext.execution.timestamps.pendingInitiationObservedAt;
assert.ok(observed);
vm.runInNewContext(bulkSource.slice(observationStart, observationEnd), observationContext);
assert.equal(observationContext.execution.timestamps.pendingInitiationObservedAt, observed);
console.log('PASS lifecycle timestamps at HTTP boundaries, successful upload only, first status observation, iteration isolation, UTC milliseconds and Single Auth auto-approval fields');