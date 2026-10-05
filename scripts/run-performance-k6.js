const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const args = process.argv.slice(2);
const env = { ...process.env };

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (env[key] === undefined || env[key] === "") env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, "..", ".env.secrets"));
if (!env.K6_OTP && env.OTP) {
  env.K6_OTP = env.OTP;
}

// K6_VUS and K6_ITERATIONS are k6 configuration variables. Passing them in
// the environment replaces the scripted scenario with k6's default executor.
delete env.K6_VUS;
delete env.K6_ITERATIONS;

function readArg(flag, fallback = "") {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) {
    return fallback;
  }
  return args[index + 1];
}

function hasFlag(flag) {
  return args.includes(flag);
}

for (let index = 0; index < args.length; index += 1) {
  if (args[index] !== "-e" || index + 1 >= args.length) continue;
  const assignment = String(args[index + 1]);
  const separator = assignment.indexOf("=");
  if (separator > 0) {
    env[assignment.slice(0, separator)] = assignment.slice(separator + 1);
  }
}

function setEnvFromArg(envName, flag, fallback = "") {
  const value = readArg(flag, fallback);
  if (value !== "") {
    env[envName] = value;
  }
}

const selectedEnv = String(readArg("--env", env.ENV || "")).trim().toUpperCase();
if (selectedEnv !== "SIT" && selectedEnv !== "UAT") {
  console.error("Unsupported environment. Use --env SIT or --env UAT.");
  process.exit(1);
}
env.ENV = selectedEnv;
env.TIER = selectedEnv;

function durationSeconds(value) {
  const match = String(value || "").trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/i);
  if (!match) return 0;

  const amount = Number(match[1]);
  const unit = String(match[2] || "s").toLowerCase();
  if (!Number.isFinite(amount)) return 0;
  if (unit === "ms") return amount / 1000;
  if (unit === "m") return amount * 60;
  if (unit === "h") return amount * 3600;
  return amount;
}

setEnvFromArg("ENV", "--env", selectedEnv);
setEnvFromArg("PERF_VUS", "--vus", readArg("--vus", "1"));
setEnvFromArg("PERF_ITERATIONS", "--iterations", readArg("--iterations", "1"));
setEnvFromArg("K6_NUM_PAYMENTS", "--payments", readArg("--payments", "2"));
setEnvFromArg("K6_AMOUNT_MIN", "--amount-min", readArg("--amount-min", "10"));
setEnvFromArg("K6_AMOUNT_MAX", "--amount-max", readArg("--amount-max", "100"));
const pollTimeoutMs = readArg("--poll-timeout-ms", "120000");
setEnvFromArg("K6_POLL_TIMEOUT_MS", "--poll-timeout-ms", pollTimeoutMs);
env.K6_MAX_DURATION_MS = pollTimeoutMs;
setEnvFromArg("K6_POLL_INTERVAL_MS", "--poll-interval-ms", readArg("--poll-interval-ms", "2000"));
const explicitMaxDuration = readArg("--max-duration", "");
const derivedMaxDurationSeconds = Math.ceil((Number(pollTimeoutMs) * 2 + 30000) / 1000);
const requestedMaxDurationSeconds = durationSeconds(explicitMaxDuration);
const scenarioMaxDurationSeconds = Math.max(requestedMaxDurationSeconds, derivedMaxDurationSeconds);
env.K6_MAX_DURATION = `${Number.isFinite(scenarioMaxDurationSeconds) ? scenarioMaxDurationSeconds : 195}s`;
setEnvFromArg("K6_PAYMENT_TYPE", "--payment-type", readArg("--payment-type", "INT"));
setEnvFromArg("K6_RAIL", "--rail", readArg("--rail", "INT"));
setEnvFromArg("K6_TEST_DATA", "--test-data", readArg("--test-data", "VALID"));
setEnvFromArg("K6_USER_TYPE", "--user-type", readArg("--user-type", ""));
setEnvFromArg("K6_BATCH_FILE_PATH", "--batch-file", readArg("--batch-file", ""));
setEnvFromArg("K6_TEST_DATA_FILE", "--test-data-file", readArg("--test-data-file", ""));
setEnvFromArg("K6_CHANNEL", "--channel", readArg("--channel", "WEB"));
setEnvFromArg("K6_PAYMENT_TYPE_NAME", "--payment-type-name", readArg("--payment-type-name", ""));
setEnvFromArg("SAS_RETRY_IDEMPOTENCY_MODE", "--sas-retry-idempotency", readArg("--sas-retry-idempotency", "NEW"));
if (!["SAME", "NEW"].includes(String(env.SAS_RETRY_IDEMPOTENCY_MODE).trim().toUpperCase())) {
  console.error("Unsupported SAS retry idempotency mode. Use --sas-retry-idempotency SAME or NEW.");
  process.exit(1);
}
env.SAS_RETRY_IDEMPOTENCY_MODE = String(env.SAS_RETRY_IDEMPOTENCY_MODE).trim().toUpperCase();
if (hasFlag("--single-bulk-file")) {
  env.K6_SINGLE_BULK_FILE = "true";
}

const k6Candidates = [
  process.env.K6_PATH,
  path.join(process.env.ProgramFiles || "C:\\Program Files", "k6", "k6.exe"),
  path.join(process.env.ProgramFiles || "C:\\Program Files", "Grafana Labs", "k6.exe"),
  "k6",
].filter(Boolean);

const k6Path = k6Candidates.find((candidate) => candidate === "k6" || fs.existsSync(candidate));

if (!k6Path) {
  console.error("Unable to find k6. Set K6_PATH or install k6 so it is available in PATH.");
  process.exit(1);
}

const scriptPath = path.join(__dirname, "..", "apps", "test", "scripts", "performance", "bulk-payments-performance.k6.js");

const rootDir = path.join(__dirname, "..");
const reportsDir = path.join(rootDir, "reports", "performance");
const matrixJsonPath = path.join(reportsDir, "performance-matrix.json");
const matrixHtmlPath = path.join(reportsDir, "performance-matrix.html");
const runStartedAt = new Date();
const collectedRecordCaptures = [];
const collectedExecutions = [];

function ensureOutputDir() {
  fs.mkdirSync(reportsDir, { recursive: true });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function startCaptureServer() {
  ensureOutputDir();

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (req.method !== "POST" || (req.url !== "/records-capture" && req.url !== "/execution-capture")) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, message: "Not found" }));
        return;
      }

      try {
        const raw = await readRequestBody(req);
        const payload = JSON.parse(raw || "{}");

        if (req.url === "/execution-capture") {
          const existingIndex = collectedExecutions.findIndex((execution) =>
            String(execution?.vu || "") === String(payload?.vu || "") &&
            String(execution?.iteration || "") === String(payload?.iteration || "")
          );
          if (existingIndex === -1) {
            collectedExecutions.push(payload);
          } else {
            collectedExecutions[existingIndex] = payload;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        collectedRecordCaptures.push(payload);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, message: String(error.message || error) }));
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to determine collector server port"));
        return;
      }

      resolve({ server, port: address.port });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

function openHtmlReport(filePath) {
  const openSetting = String(env.K6_OPEN_HTML_REPORT || "true").trim().toLowerCase();
  if (openSetting === "false" || openSetting === "0" || openSetting === "no") {
    return;
  }

  const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", filePath] : [filePath];
  const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
}

function findLatestSummaryFile(sinceTime) {
  if (!fs.existsSync(reportsDir)) {
    return null;
  }

  const candidates = fs
    .readdirSync(reportsDir)
    .filter((name) => name.startsWith("bulk-payments-k6-summary-") && name.endsWith(".json"))
    .map((name) => {
      const filePath = path.join(reportsDir, name);
      return { filePath, mtimeMs: fs.statSync(filePath).mtimeMs };
    })
    .filter((entry) => entry.mtimeMs >= sinceTime.getTime())
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates.length > 0 ? candidates[0].filePath : null;
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function aggregateRecordCaptures(captures) {
  const buckets = { PASSED: [], FAILED: [], REJECTED: [], IN_PROGRESS: [], UNKNOWN: [] };
  const shortfalls = [];
  const runDetails = [];
  let expectedTotal = 0;
  let totalShortfall = 0;

  for (const capture of captures) {
    expectedTotal += Number(capture?.expectedTotal || 0);
    runDetails.push({
      fileId: capture?.fileId || "",
      paymentType: capture?.paymentType || "",
      railType: capture?.railType || "",
      parentTransactionIds: Array.isArray(capture?.parentTransactionIds) ? capture.parentTransactionIds : [],
      bkRefIds: Array.isArray(capture?.bkRefIds) ? capture.bkRefIds : [],
    });

    for (const bucketName of Object.keys(buckets)) {
      const rows = Array.isArray(capture?.buckets?.[bucketName]) ? capture.buckets[bucketName] : [];
      for (const row of rows) {
        buckets[bucketName].push({
          ...row,
          fileId: capture.fileId,
          paymentType: capture.paymentType || "",
          railType: capture.railType || "",
        });
      }
    }

    const shortfall = Number(capture?.shortfall || 0);
    if (shortfall > 0) {
      totalShortfall += shortfall;
      shortfalls.push({ fileId: capture.fileId, shortfall });
    }
  }

  return { buckets, shortfalls, totalShortfall, expectedTotal, runDetails };
}

function addBatchExecutionOutcomes(buckets, executions) {
  for (const execution of executions) {
    if (execution.status !== "FAILED") {
      continue;
    }

    const failure = execution.failure || {};
    const message = String(failure.message || "Batch execution failed");
    const isRejected = /lastStatus=(RJCT|REJECTED)|\bREJECTED\b|\bRJCT\b/i.test(message);
    const bucketName = isRejected ? "REJECTED" : "FAILED";
    const parentTransactionId = uniqueJoined(execution.parentTransactionIds);

    buckets[bucketName].push({
      fileId: execution.fileId || "",
      ftId: "",
      transactionId: parentTransactionId === "n/a" ? "" : parentTransactionId,
      statusCode: isRejected ? "RJCT" : "BATCH_FAILURE",
      statusDescription: `${failure.stage || "UNKNOWN"}: ${message}`,
      amount: "",
      fromAccountReference: "",
      toAccountReference: "",
      batchLevel: true,
    });
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function metricSummary(metrics, key, digits = 0) {
  const values = metrics?.[key] || {};
  const p95 = values["p(95)"];
  const avg = values.avg;
  if (p95 === undefined && avg === undefined) return "n/a";
  return `avg ${(Number(avg || 0) / 1000).toFixed(2)}s / p95 ${(Number(p95 || 0) / 1000).toFixed(2)}s`;
}

function metricAvgMs(metrics, key) {
  const avg = metrics?.[key]?.avg;
  return avg === undefined ? "n/a" : `${(Number(avg) / 1000).toFixed(2)}s`;
}

function uniqueJoined(values) {
  const unique = [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
  return unique.length > 0 ? unique.join(", ") : "n/a";
}

function safeFileToken(value, fallback = "unknown") {
  const token = String(value || fallback).trim().replace(/[^A-Za-z0-9_-]+/g, "_");
  return token || fallback;
}

function writeFtIdArtifacts(buckets, runDetails) {
  const groups = new Map();

  for (const run of runDetails) {
    const paymentType = run.paymentType || "UNKNOWN";
    const railType = run.railType || "UNKNOWN";
    const key = `${paymentType}|${railType}`;
    if (!groups.has(key)) groups.set(key, { paymentType, railType, records: [] });
  }

  for (const [bucketName, rows] of Object.entries(buckets)) {
    for (const row of rows) {
      if (row.batchLevel || !row.ftId) continue;
      const paymentType = row.paymentType || "UNKNOWN";
      const railType = row.railType || "UNKNOWN";
      const key = `${paymentType}|${railType}`;
      if (!groups.has(key)) groups.set(key, { paymentType, railType, records: [] });
      groups.get(key).records.push({
        ftId: row.ftId,
        transactionId: row.transactionId || "",
        fileId: row.fileId || "",
        statusGroup: bucketName,
        statusCode: row.statusCode || "",
        statusDescription: row.statusDescription || "",
        amount: row.amount || "",
      });
    }
  }

  const writtenFiles = [];
  const timestamp = runStartedAt.toISOString().replace(/[:.]/g, "-");
  for (const group of groups.values()) {
    const fileName = `ft-ids-${safeFileToken(group.paymentType)}-${safeFileToken(group.railType)}-${timestamp}.json`;
    const filePath = path.join(reportsDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      paymentType: group.paymentType,
      railType: group.railType,
      recordCount: group.records.length,
      records: group.records,
      runs: runDetails.filter((run) => run.paymentType === group.paymentType && run.railType === group.railType),
    }, null, 2), "utf8");
    writtenFiles.push(path.relative(rootDir, filePath));
  }

  return writtenFiles;
}

function totalExecutionDurationMs(timings) {
  const values = [timings?.uploadMs, timings?.pendinitMs, timings?.initiationMs, timings?.sentMs];
  if (values.some((value) => !Number.isFinite(Number(value)))) {
    return null;
  }

  return values.reduce((total, value) => total + Number(value), 0);
}

function elapsedBetween(start, end) {
  const started = new Date(start || "");
  const ended = new Date(end || "");
  if (Number.isNaN(started.getTime()) || Number.isNaN(ended.getTime())) return null;
  return ended.getTime() - started.getTime();
}

function formatTimestamp(value) {
  if (!value) return "n/a";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().replace("T", " ").replace("Z", " UTC");
}

function stageLabel(stage) {
  const normalized = String(stage || "").toUpperCase();
  if (normalized.includes("PENDINIT")) return "Upload to PENDINIT";
  if (normalized.includes("INITIATION")) return "Initiation";
  if (normalized.includes("SENT") || normalized.includes("FT")) return "FT-ID Validation";
  if (normalized.includes("UPLOAD")) return "Upload to PENDINIT";
  return normalized || "n/a";
}

function stageKeyFromFailure(failure) {
  const normalized = String(failure?.stage || "").toUpperCase();
  if (normalized.includes("PENDINIT") || normalized.includes("UPLOAD")) return "pendinit";
  if (normalized.includes("INITIATION")) return "initiation";
  if (normalized.includes("SENT") || normalized.includes("FT")) return "sent";
  return "";
}

function stageResult(execution, stage) {
  const failedStageKey = stageKeyFromFailure(execution.failure);
  if (execution.timeouts?.[stage.key] || (failedStageKey === stage.key && execution.failure?.timeoutMs !== "" && execution.failure?.timeoutMs !== undefined)) {
    return "Timed Out";
  }
  if (stage.key === "sent" && (execution.payments || []).some((payment) => ["FAILED", "REJECTED"].includes(String(payment.resultGroup || "").toUpperCase()))) {
    return "Failed";
  }
  if (failedStageKey === stage.key || stage.status === "FAILED") {
    return "Failed";
  }
  return "Success";
}

function overallResult(execution) {
  if (Object.values(execution.timeouts || {}).some(Boolean) || (execution.failure?.timeoutMs !== "" && execution.failure?.timeoutMs !== undefined && execution.failure?.timeoutMs !== null)) {
    return "Timed Out";
  }
  return String(execution.status || "").toUpperCase() === "PASSED" ? "Passed" : "Failed";
}

function failureDurationLabel(result) {
  return result === "Timed Out" ? "Duration Before Timeout" : "Duration Before Failure";
}

function conciseFailureReason(failure) {
  const message = String(failure?.message || "").trim();
  if (!message) return "n/a";
  return message
    .replace(/\s*Last backend status:.*$/i, "")
    .replace(/; expected=.*$/i, "")
    .trim()
    .replace(/[.;]\s*$/, "") || message;
}

function ftIdOutcomeCounts(execution) {
  const counts = { PASSED: 0, FAILED: 0, REJECTED: 0, IN_PROGRESS: 0 };
  for (const payment of execution.payments || []) {
    const group = String(payment.resultGroup || "").toUpperCase();
    if (counts[group] !== undefined) {
      counts[group] += 1;
    }
  }
  return counts;
}

function executionStageRows(execution) {
  return [
    {
      label: "Upload to PENDINIT",
      key: "pendinit",
      start: execution.timestamps?.uploadStartedAt,
      end: execution.timestamps?.pendinitEndedAt,
      duration: elapsedBetween(execution.timestamps?.uploadStartedAt, execution.timestamps?.pendinitEndedAt),
      request: execution.requestDetails?.pendinit,
    },
    { label: "Initiation", key: "initiation", start: execution.timestamps?.initiationStartedAt, end: execution.timestamps?.initiationEndedAt, duration: execution.timings?.initiationMs },
    {
      label: "FT-ID Validation",
      key: "sent",
      start: execution.timestamps?.sentStartedAt,
      end: execution.timestamps?.sentEndedAt,
      duration: execution.timings?.sentMs,
      request: (execution.requestDetails?.ftIds || []).map((item) => item.url).join("; "),
    },
  ].filter((stage) => stage.start || stage.end || stage.duration !== null && stage.duration !== undefined);
}

function renderExecutionTraceTable(executions) {
  if (executions.length === 0) {
    return `<div class="recommendation-item">No execution data was collected before the run ended.</div>`;
  }

  const sortedExecutions = [...executions].sort((a, b) =>
    Number(a.vu || 0) - Number(b.vu || 0) || Number(a.iteration || 0) - Number(b.iteration || 0)
  );

  const rows = sortedExecutions.flatMap((execution) => {
    const stages = executionStageRows(execution);
    const batchLabel = `VU ${execution.vu || "n/a"} / Iteration ${execution.iteration || "n/a"}`;
    const executionStart = stages[0]?.start || execution.timestamps?.uploadStartedAt;
    const executionEnd = stages[stages.length - 1]?.end || execution.timestamps?.sentEndedAt || execution.timestamps?.initiationEndedAt || execution.timestamps?.pendinitEndedAt;
    const totalDuration = elapsedBetween(executionStart, executionEnd) ?? totalExecutionDurationMs(execution.timings);
    const failedStageKey = stageKeyFromFailure(execution.failure);
    const failurePoint = execution.failure ? stageLabel(execution.failure.stage) : "n/a";
    const lastKnownStatus = execution.failure?.lastStatus || (failedStageKey ? execution.statuses?.[failedStageKey] : "") || "n/a";
    const counts = ftIdOutcomeCounts(execution);
    const result = overallResult(execution);
    const failureSummary = result !== "Passed" ? `
      <div class="trace-subsection trace-failure">
        <div class="trace-subtitle">Failure Summary</div>
        <div class="trace-kv"><span>Stage</span><strong>${escapeHtml(failurePoint)}</strong></div>
        <div class="trace-kv"><span>Last Known Status</span><strong>${escapeHtml(lastKnownStatus)}</strong></div>
        <div class="trace-kv"><span>Reason</span><strong>${escapeHtml(conciseFailureReason(execution.failure))}</strong></div>
        <div class="trace-kv"><span>${escapeHtml(failureDurationLabel(result))}</span><strong>${escapeHtml(formatDurationMs(execution.failure?.elapsedMs ?? totalDuration))}</strong></div>
      </div>` : "";

    return [
      `<tr class="batch-start"><td colspan="5">
        <div class="trace-batch-title">${escapeHtml(batchLabel)} | ${escapeHtml(result)}</div>
        <div class="trace-identifiers">
          <span><strong>File Name:</strong> ${escapeHtml(execution.fileName || "n/a")}</span>
          <span><strong>File ID:</strong> ${escapeHtml(execution.fileId || "n/a")}</span>
          <span><strong>Parent Transaction ID:</strong> ${escapeHtml(uniqueJoined(execution.parentTransactionIds))}</span>
          <span><strong>BKREF:</strong> ${escapeHtml(uniqueJoined(execution.bkRefIds))}</span>
          <span><strong>Total Execution Duration:</strong> ${escapeHtml(formatDurationMs(totalDuration))}</span>
        </div>
        <div class="trace-subsection">
          <div class="trace-subtitle">Execution Timeline</div>
          <div class="trace-kv"><span>Execution Started</span><strong>${escapeHtml(formatTimestamp(executionStart))}</strong></div>
          <div class="trace-kv"><span>Execution Finished</span><strong>${escapeHtml(formatTimestamp(executionEnd))}</strong></div>
          <div class="trace-kv"><span>Total Duration</span><strong>${escapeHtml(formatDurationMs(totalDuration))}</strong></div>
          <div class="trace-kv"><span>Result</span><strong>${escapeHtml(result.toUpperCase())}</strong></div>
          ${result !== "Passed" ? `<div class="trace-kv"><span>Failure Point</span><strong>${escapeHtml(failurePoint)}</strong></div>` : ""}
          ${result !== "Passed" ? `<div class="trace-kv"><span>Last Known Status</span><strong>${escapeHtml(lastKnownStatus)}</strong></div>` : ""}
        </div>
        ${failureSummary}
        <div class="trace-subsection">
          <div class="trace-subtitle">FT-ID Outcome Summary</div>
          <div class="trace-outcomes">
            <span>Passed: <strong>${counts.PASSED}</strong></span>
            <span>Failed: <strong>${counts.FAILED}</strong></span>
            <span>Rejected: <strong>${counts.REJECTED}</strong></span>
            <span>In Progress: <strong>${counts.IN_PROGRESS}</strong></span>
          </div>
        </div>
      </td></tr>`,
      ...stages.map((stage, index) => `
        <tr class="batch-stage">
          <td>${escapeHtml(stage.label)}</td>
          <td>${escapeHtml(formatTimestamp(stage.start))}</td>
          <td>${escapeHtml(formatTimestamp(stage.end))}</td>
          <td>${escapeHtml(formatDurationMs(stage.duration ?? elapsedBetween(stage.start, stage.end)))}</td>
          <td>${escapeHtml(stageResult(execution, stage))}</td>
        </tr>`),
    ];
  }).join("");

  return `<div class="table-scroll"><table class="endpoint-table execution-table"><thead><tr>
    <th>Process</th><th>Start Time</th><th>End Time</th><th>Duration</th><th>Result</th>
  </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function paymentOnlyBuckets(buckets) {
  return Object.fromEntries(
    Object.entries(buckets).map(([bucketName, rows]) => [bucketName, rows.filter((row) => !row.batchLevel)])
  );
}

function renderRecordsTable(rows, limit = 25) {
  if (rows.length === 0) {
    return `<div class="recommendation-item">None</div>`;
  }

  const shown = rows.slice(0, limit);
  const rowsHtml = shown
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.ftId)}</td>
          <td>${escapeHtml(row.transactionId)}</td>
          <td>${escapeHtml(row.statusCode)}</td>
          <td>${escapeHtml(row.statusDescription)}</td>
          <td>${escapeHtml(row.amount)}</td>
        </tr>`
    )
    .join("");

  const truncatedNote =
    rows.length > limit ? `<p style="margin-top:8px;color:#6c757d;">Showing ${limit} of ${rows.length} records.</p>` : "";

  return `
    <table class="endpoint-table">
      <thead>
        <tr><th>FT ID</th><th>Transaction ID</th><th>Status Code</th><th>Description</th><th>Amount</th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    ${truncatedNote}`;
}

function distinctPaymentRows(buckets) {
  const rows = [];
  const seen = new Set();

  for (const [bucketName, bucketRows] of Object.entries(buckets)) {
    for (const row of bucketRows) {
      if (row.batchLevel) {
        continue;
      }

      const key = row.ftId || row.transactionId || `${row.fileId}-${row.fromAccountReference}-${row.amount}`;
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      rows.push({ ...row, bucketName });
    }
  }

  return rows;
}

function renderAllPaymentsTable(rows, pageSize = 25) {
  if (rows.length === 0) {
    return `<div class="recommendation-item">No payment records were collected for this run.</div>`;
  }

  const rowsHtml = rows
    .map((row, index) => {
      const page = Math.floor(index / pageSize) + 1;
      return `
        <tr class="payment-row" data-page="${page}">
          <td>${index + 1}</td>
          <td>${escapeHtml(row.ftId)}</td>
          <td>${escapeHtml(row.paymentType || "n/a")}</td>
          <td>${escapeHtml(row.railType || "n/a")}</td>
          <td>${escapeHtml(row.transactionId)}</td>
          <td>${escapeHtml(row.bucketName)}</td>
          <td>${escapeHtml(row.statusCode)}</td>
          <td>${escapeHtml(row.statusDescription)}</td>
          <td>${escapeHtml(row.amount)}</td>
          <td>${escapeHtml(row.fromAccountReference)}</td>
          <td>${escapeHtml(row.toAccountReference)}</td>
        </tr>`;
    })
    .join("");

  const totalPages = Math.ceil(rows.length / pageSize);
  const controls = totalPages > 1
    ? `
      <div class="pagination-controls" data-page-size="${pageSize}" data-total-pages="${totalPages}">
        <button type="button" id="paymentsPrevPage">Previous</button>
        <span id="paymentsPageStatus">Page 1 of ${totalPages}</span>
        <button type="button" id="paymentsNextPage">Next</button>
      </div>`
    : "";

  return `
    ${controls}
    <table class="endpoint-table payments-table">
      <thead>
        <tr>
          <th>#</th>
          <th>FT ID</th>
          <th>Payment Type</th>
          <th>Rail</th>
          <th>Transaction ID</th>
          <th>Result Group</th>
          <th>Status Code</th>
          <th>Description</th>
          <th>Amount</th>
          <th>From Reference</th>
          <th>To Reference</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
}

function paymentCountRange(count) {
  const value = Number(count || 0);
  if (value <= 100) return "1-100";
  if (value <= 500) return "100-500";
  if (value <= 1000) return "500-1000";
  if (value <= 5000) return "1000-5000";
  if (value <= 10000) return "5000-10000";
  return "10000-20000";
}

function formatDurationMs(value) {
  const ms = Number(value || 0);
  if (!Number.isFinite(ms) || ms <= 0) return "n/a";
  return `${(ms / 1000).toFixed(2)}s`;
}

function runStatus(summary, ftIdValidationCompleted, totalShortfall, buckets) {
  const failedThreshold = (summary?.thresholds || []).some((item) =>
    Object.values(item.thresholds || {}).some((threshold) => threshold?.ok === false)
  );

  if (failedThreshold) return "FAILED";
  if (!ftIdValidationCompleted) return "INCOMPLETE";
  if (totalShortfall > 0) return "MISSING_RECORDS";
  if (buckets.FAILED.length > 0) return "PAYMENT_FAILED";
  if (buckets.REJECTED.length > 0) return "PAYMENT_REJECTED";
  if (buckets.IN_PROGRESS.length > 0) return "IN_PROGRESS";
  return "PASSED";
}

function readMatrix() {
  if (!fs.existsSync(matrixJsonPath)) {
    return { entries: [] };
  }

  return readJsonSafe(matrixJsonPath) || { entries: [] };
}

function writeMatrixHtml(matrix) {
  const ranges = ["1-100", "100-500", "500-1000", "1000-5000", "5000-10000", "10000-20000"];
  const rows = [...new Set(matrix.entries.map((entry) => `${entry.paymentType}|${entry.railType}`))]
    .sort()
    .map((key) => {
      const [paymentType, railType] = key.split("|");
      const cells = ranges.map((range) => {
        const entry = matrix.entries.find((item) => item.paymentType === paymentType && item.railType === railType && item.range === range);
        return `<td>${entry ? `${escapeHtml(entry.timeTaken)}<br><small>${escapeHtml(entry.status)}</small>` : ""}</td>`;
      }).join("");
      return `<tr><td>${escapeHtml(paymentType)}</td><td>${escapeHtml(railType)}</td>${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Performance Matrix</title>
<style>
  body { font-family: Segoe UI, Tahoma, sans-serif; background:#1f1f1f; color:#fff; padding:20px; }
  table { border-collapse:collapse; width:100%; max-width:1200px; }
  th, td { border:1px solid #666; padding:8px; text-align:left; vertical-align:top; }
  th { background:#2d2d2d; }
  small { color:#ccc; }
</style>
</head>
<body>
<h1>Performance Matrix</h1>
<table>
  <thead>
    <tr><th>Payment Type</th><th>Rail</th>${ranges.map((range) => `<th>${range}</th>`).join("")}</tr>
  </thead>
  <tbody>${rows || `<tr><td colspan="8">No runs recorded yet.</td></tr>`}</tbody>
</table>
</body>
</html>`;

  fs.writeFileSync(matrixHtmlPath, html, "utf8");
}

function updatePerformanceMatrix(summary, buckets, totalShortfall, ftIdValidationCompleted) {
  const paymentType = summary?.env?.paymentType || env.K6_PAYMENT_TYPE || "UNKNOWN";
  const railType = summary?.env?.railType || env.K6_RAIL || "UNKNOWN";
  const paymentCount = Number(summary?.env?.numPayments || env.K6_NUM_PAYMENTS || 0);
  const range = paymentCountRange(paymentCount);
  const matrix = readMatrix();
  const entry = {
    paymentType,
    railType,
    range,
    paymentCount,
    timeTaken: formatDurationMs(summary?.durationMs),
    durationMs: Number(summary?.durationMs || 0),
    status: runStatus(summary, ftIdValidationCompleted, totalShortfall, buckets),
    updatedAt: new Date().toISOString(),
  };

  matrix.entries = matrix.entries.filter((item) => !(item.paymentType === paymentType && item.railType === railType && item.range === range));
  matrix.entries.push(entry);
  fs.writeFileSync(matrixJsonPath, JSON.stringify(matrix, null, 2), "utf8");
  writeMatrixHtml(matrix);
  console.log(`[k6][matrix] Updated ${path.relative(rootDir, matrixHtmlPath)}`);
}

function renderShortfallTable(rows, limit = 25) {
  if (rows.length === 0) {
    return `<div class="recommendation-item">None</div>`;
  }

  const shown = rows.slice(0, limit);
  const rowsHtml = shown
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.fileId)}</td>
          <td>${escapeHtml(row.shortfall)}</td>
        </tr>`
    )
    .join("");

  const truncatedNote =
    rows.length > limit ? `<p style="margin-top:8px;color:#6c757d;">Showing ${limit} of ${rows.length} files.</p>` : "";

  return `
    <table class="endpoint-table">
      <thead>
        <tr><th>File ID</th><th>Missing Record Count</th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    ${truncatedNote}`;
}

function buildIssuesHtml(buckets, totalShortfall, ftIdValidationCompleted) {
  const issues = [];
  const failedFtIds = buckets.FAILED.filter((row) => !row.batchLevel);
  const rejectedFtIds = buckets.REJECTED.filter((row) => !row.batchLevel);
  const batchFailures = [...buckets.FAILED, ...buckets.REJECTED].filter((row) => row.batchLevel);

  if (!ftIdValidationCompleted) {
    issues.push({
      title: "FT-ID validation did not complete",
      priority: "high",
      observation: "The test ended before it posted FT-ID records to the report collector. No payment outcome was recorded for this run.",
      impact: "Passed, failed, rejected, and in-progress totals are unavailable. Zero values in this section must not be read as successful payment results.",
      recommendations: ["Review the first flow failure in the k6 output", "Increase K6_MAX_DURATION when the initiation step needs more time", "Run again after resolving the failing flow step"],
    });
  }

  if (totalShortfall > 0) {
    issues.push({
      title: `${totalShortfall} payment(s) could not be validated`,
      priority: "high",
      observation: `${totalShortfall} fewer records were returned by the batch-payments records endpoint than the number of payments generated, within the poll window.`,
      impact: "These payments cannot be confirmed as passed, failed, or rejected, so the true outcome of the run is unknown.",
      recommendations: ["Review the file IDs with a shortfall listed below", "Increase K6_RECORDS_POLL_TIMEOUT_MS if records are simply delayed", "Confirm the records endpoint indexes every payment for this file/BKREF"],
    });
  }

  if (batchFailures.length > 0) {
    const statuses = uniqueJoined(batchFailures.map((row) => row.statusDescription));
    issues.push({
      title: `${batchFailures.length} batch execution failure(s)`,
      priority: "high",
      observation: `The batch flow failed before all payments reached a final FT-ID outcome. Details are shown in the Batch Execution Trace. Latest batch detail: ${statuses}`,
      impact: "The batch-level process did not complete successfully, so FT-ID statuses may remain in progress or incomplete.",
      recommendations: ["Review the Batch Execution Trace failure reason", "Check the backend status shown for the failed stage", "Re-run the batch after resolving the batch-level failure"],
    });
  }

  if (failedFtIds.length > 0) {
    issues.push({
      title: `${failedFtIds.length} payment(s) failed after initiation`,
      priority: "high",
      observation: `${failedFtIds.length} FT ID(s) returned a failed status when validated via the batch-payments records endpoint.`,
      impact: "Failed payments will not reach the beneficiary and require manual investigation or resubmission.",
      recommendations: ["Review the failed FT IDs listed below", "Check downstream payment processing logs", "Re-run affected transactions once root cause is fixed"],
    });
  }

  if (rejectedFtIds.length > 0) {
    issues.push({
      title: `${rejectedFtIds.length} payment(s) rejected after initiation`,
      priority: "high",
      observation: `${rejectedFtIds.length} FT ID(s) returned a rejected/declined status when validated via the batch-payments records endpoint.`,
      impact: "Rejected payments indicate validation or business rule failures that block settlement.",
      recommendations: ["Review the rejected FT IDs listed below", "Confirm beneficiary/account details used in test data", "Check rejection reason codes with the payments team"],
    });
  }

  if (buckets.IN_PROGRESS.length > 0) {
    issues.push({
      title: `${buckets.IN_PROGRESS.length} payment(s) still in progress`,
      priority: "medium",
      observation: `${buckets.IN_PROGRESS.length} FT ID(s) had not reached a final status by the time records were fetched.`,
      impact: "Final settlement outcome is unknown; totals for passed/failed may change once these complete.",
      recommendations: ["Re-poll the batch-payments records endpoint after the run", "Increase K6_POLL_TIMEOUT_MS if payments consistently remain pending"],
    });
  }

  if (issues.length === 0) {
    return `<div class="no-issues">✅ No performance issues detected! All validated payments passed.</div>`;
  }

  return issues
    .map(
      (issue) => `
        <div class="issue-item ${issue.priority}">
          <div class="issue-header">
            <div class="issue-title">${escapeHtml(issue.title)}</div>
            <span class="priority-badge ${issue.priority}">${issue.priority}</span>
          </div>
          <div class="issue-section">
            <div class="issue-section-title">📌 Observation</div>
            <div class="issue-section-content">${escapeHtml(issue.observation)}</div>
          </div>
          <div class="issue-section">
            <div class="issue-section-title">💥 Impact</div>
            <div class="issue-section-content">${escapeHtml(issue.impact)}</div>
          </div>
          <div class="issue-section">
            <div class="issue-section-title">✅ Recommended Solutions</div>
            <div class="issue-section-content">${issue.recommendations.map((rec) => `<div class="recommendation-item">• ${escapeHtml(rec)}</div>`).join("")}</div>
          </div>
        </div>`
    )
    .join("");
}

function buildHtmlReport({ summary, buckets, shortfalls, totalShortfall, expectedTotal, ftIdValidationCompleted, runDetails, executions, environment }) {
  const metrics = summary?.metrics || {};
  const paymentBuckets = paymentOnlyBuckets(buckets);
  const total = paymentBuckets.PASSED.length + paymentBuckets.FAILED.length + paymentBuckets.REJECTED.length + paymentBuckets.IN_PROGRESS.length + paymentBuckets.UNKNOWN.length;
  const allPayments = distinctPaymentRows(paymentBuckets);
  const generatedAt = new Date();
  const showRunWindow = summary?.env?.singleBulkFile === true;
  const runWindowCards = showRunWindow ? `
    <div class="metadata-item"><label>Test Start Time</label><value>${escapeHtml(formatTimestamp(summary?.startedAt || runStartedAt.toISOString()))}</value></div>
    <div class="metadata-item"><label>Test End Time</label><value>${escapeHtml(formatTimestamp(summary?.endedAt))}</value></div>
    <div class="metadata-item"><label>Total Test Duration</label><value>${((summary?.durationMs || 0) / 1000).toFixed(1)}s</value></div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Bulk Payments Performance Report</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); padding:20px; }
  .container { max-width:1200px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 20px 60px rgba(0,0,0,.3); overflow:hidden; }
  .header { background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:#fff; padding:40px; text-align:center; }
  .header h1 { font-size:2.2em; margin-bottom:10px; }
  .metadata { background:#f8f9fa; padding:20px 40px; border-bottom:1px solid #e9ecef; display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:20px; }
  .metadata-item { padding:15px; background:#fff; border-radius:8px; border-left:4px solid #667eea; }
  .metadata-item label { display:block; color:#6c757d; font-size:.85em; font-weight:600; text-transform:uppercase; margin-bottom:5px; }
  .metadata-item value { display:block; color:#212529; font-size:1.2em; font-weight:500; }
  .reference-strip { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:12px; margin-bottom:14px; padding:14px; background:#f8f9fa; border-left:4px solid #667eea; border-radius:8px; color:#212529; }
  .content { padding:40px; }
  .section { margin-bottom:40px; }
  .section h2 { color:#667eea; font-size:1.6em; margin-bottom:20px; padding-bottom:10px; border-bottom:3px solid #667eea; }
  .metrics-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:20px; }
  .metric-card { background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:#fff; padding:20px; border-radius:10px; text-align:center; }
  .metric-card.success { background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%); }
  .metric-card.warning { background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%); }
  .metric-card .label { font-size:.85em; opacity:.9; margin-bottom:8px; }
  .metric-card .value { font-size:1.5em; font-weight:bold; }
  .table-scroll { width:100%; overflow-x:auto; padding-bottom:6px; }
  .endpoint-table { width:100%; border-collapse:collapse; margin-top:10px; }
  .endpoint-table th,.endpoint-table td { padding:10px; text-align:left; border-bottom:1px solid #dee2e6; font-size:.9em; }
  .endpoint-table th { background:#667eea; color:#fff; }
  .execution-table th,.execution-table td { vertical-align:top; white-space:normal; word-break:break-word; }
  .execution-table tbody tr.batch-start td { border-top:3px solid #667eea; font-weight:400; background:#f8f9ff; line-height:1.5; padding:16px; }
  .execution-table tbody tr.batch-stage td { font-weight:600; }
  .execution-table { min-width:1200px; }
  .trace-batch-title { font-size:1.05em; font-weight:700; color:#212529; margin-bottom:10px; }
  .trace-identifiers { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:6px 18px; margin-bottom:12px; }
  .trace-subsection { margin-top:10px; padding-top:10px; border-top:1px solid #dee2e6; }
  .trace-subtitle { color:#667eea; font-size:.85em; font-weight:700; text-transform:uppercase; margin-bottom:6px; }
  .trace-kv { display:grid; grid-template-columns:minmax(150px,220px) 1fr; gap:10px; margin:3px 0; }
  .trace-kv span { color:#6c757d; }
  .trace-kv strong { color:#212529; }
  .trace-failure { border-left:4px solid #f5576c; padding-left:12px; }
  .trace-outcomes { display:flex; flex-wrap:wrap; gap:10px; }
  .trace-outcomes span { background:#fff; border:1px solid #dee2e6; border-radius:6px; padding:6px 10px; }
  .payments-table { table-layout:auto; }
  .pagination-controls { display:flex; align-items:center; gap:12px; margin:12px 0; }
  .pagination-controls button { background:#667eea; color:#fff; border:0; border-radius:6px; padding:8px 14px; cursor:pointer; font-weight:600; }
  .pagination-controls button:disabled { background:#adb5bd; cursor:not-allowed; }
  .issue-item { background:#f8f9fa; border-left:4px solid #f5576c; padding:20px; margin-bottom:20px; border-radius:8px; }
  .issue-item.medium { border-left-color:#f093fb; }
  .issue-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; }
  .issue-title { font-size:1.2em; font-weight:600; }
  .priority-badge { padding:6px 12px; border-radius:20px; font-size:.8em; font-weight:600; text-transform:uppercase; background:#f5576c; color:#fff; }
  .priority-badge.medium { background:#f093fb; }
  .issue-section { margin-top:10px; padding-top:10px; border-top:1px solid rgba(0,0,0,.1); }
  .issue-section-title { font-weight:600; color:#667eea; font-size:.9em; text-transform:uppercase; margin-bottom:6px; }
  .recommendation-item { background:#e7f3ff; border-left:4px solid #2196F3; padding:10px; margin-bottom:8px; border-radius:4px; color:#1565c0; }
  .no-issues { background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%); color:#fff; padding:25px; text-align:center; border-radius:8px; }
  .footer { background:#f8f9fa; padding:20px 40px; border-top:1px solid #dee2e6; text-align:center; color:#6c757d; font-size:.9em; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>⚡ Bulk Payments Performance Report</h1>
    <p>${escapeHtml(environment)} Environment</p>
  </div>
  <div class="metadata">
    ${runWindowCards}
    <div class="metadata-item"><label>VUs / Iterations Per VU</label><value>${escapeHtml(summary?.env?.vus)} / ${escapeHtml(summary?.env?.iterations)}</value></div>
    <div class="metadata-item"><label>Payments Requested</label><value>${escapeHtml(summary?.env?.numPayments)}</value></div>
    <div class="metadata-item"><label>Payment Type</label><value>${escapeHtml(summary?.env?.paymentType || "n/a")}</value></div>
    <div class="metadata-item"><label>Rail Type</label><value>${escapeHtml(summary?.env?.railType || "n/a")}</value></div>
  </div>
  <div class="content">
    <div class="section">
      <h2>Batch Execution Trace</h2>
      ${renderExecutionTraceTable(executions)}
    </div>
    <div class="section">
      <h2>📊 Performance Metrics</h2>
      <div class="metrics-grid">
        <div class="metric-card"><div class="label">Upload to PENDINIT</div><div class="value">${metricSummary(metrics, "uploadToPendinitDuration")}</div></div>
        <div class="metric-card"><div class="label">Upload</div><div class="value">${metricSummary(metrics, "uploadDuration")}</div></div>
        <div class="metric-card"><div class="label">Time to PENDINIT</div><div class="value">${metricSummary(metrics, "pendinitDuration")}</div></div>
        <div class="metric-card"><div class="label">Initiation</div><div class="value">${metricSummary(metrics, "initiationDuration")}</div></div>
        <div class="metric-card"><div class="label">Time to SENT</div><div class="value">${metricSummary(metrics, "sentDuration")}</div></div>
      </div>
    </div>
    <div class="section">
      <h2>✅ Payment Validation Summary (FT IDs)</h2>
      <div class="metrics-grid">
        <div class="metric-card success"><div class="label">Passed</div><div class="value">${ftIdValidationCompleted ? paymentBuckets.PASSED.length : "N/A"}</div></div>
        <div class="metric-card warning"><div class="label">Failed FT IDs</div><div class="value">${ftIdValidationCompleted ? paymentBuckets.FAILED.length : "N/A"}</div></div>
        <div class="metric-card warning"><div class="label">Rejected FT IDs</div><div class="value">${ftIdValidationCompleted ? paymentBuckets.REJECTED.length : "N/A"}</div></div>
        <div class="metric-card"><div class="label">Still In Progress</div><div class="value">${ftIdValidationCompleted ? paymentBuckets.IN_PROGRESS.length : "N/A"}</div></div>
        <div class="metric-card warning"><div class="label">Unvalidated / Missing</div><div class="value">${ftIdValidationCompleted ? totalShortfall : "N/A"}</div></div>
      </div>
      <p style="margin-top:15px;color:#6c757d;">${ftIdValidationCompleted ? `Total validated: ${total} of ${expectedTotal} expected` : `FT-ID validation did not complete. ${expectedTotal} payment(s) were requested; no FT-ID result was collected.`}</p>

      <h3 style="margin-top:20px;color:#212529;">Failed</h3>
      ${renderRecordsTable(paymentBuckets.FAILED)}
      <h3 style="margin-top:20px;color:#212529;">Rejected</h3>
      ${renderRecordsTable(paymentBuckets.REJECTED)}
      <h3 style="margin-top:20px;color:#212529;">Unvalidated / Missing</h3>
      ${renderShortfallTable(shortfalls)}
    </div>
    <div class="section">
      <h2>📄 All FT IDs / Payment Records</h2>
      ${renderAllPaymentsTable(allPayments, 25)}
    </div>
    <div class="section">
      <h2>🚨 Performance Issues</h2>
      ${buildIssuesHtml(buckets, totalShortfall, ftIdValidationCompleted)}
    </div>
  </div>
  <div class="footer"><p>Generated on ${generatedAt.toLocaleString()} | Performance Testing Framework</p></div>
</div>
<script>
(function () {
  var controls = document.querySelector('.pagination-controls');
  if (!controls) return;

  var currentPage = 1;
  var totalPages = Number(controls.getAttribute('data-total-pages') || '1');
  var rows = Array.prototype.slice.call(document.querySelectorAll('.payment-row'));
  var prev = document.getElementById('paymentsPrevPage');
  var next = document.getElementById('paymentsNextPage');
  var status = document.getElementById('paymentsPageStatus');

  function renderPage() {
    rows.forEach(function (row) {
      row.style.display = Number(row.getAttribute('data-page')) === currentPage ? '' : 'none';
    });
    status.textContent = 'Page ' + currentPage + ' of ' + totalPages;
    prev.disabled = currentPage === 1;
    next.disabled = currentPage === totalPages;
  }

  prev.addEventListener('click', function () {
    if (currentPage > 1) {
      currentPage -= 1;
      renderPage();
    }
  });

  next.addEventListener('click', function () {
    if (currentPage < totalPages) {
      currentPage += 1;
      renderPage();
    }
  });

  renderPage();
}());
</script>
</body>
</html>`;
}

function writeHtmlReport() {
  const summaryFilePath = findLatestSummaryFile(runStartedAt);
  const summary = summaryFilePath ? readJsonSafe(summaryFilePath) : null;
  const { buckets, shortfalls, totalShortfall, expectedTotal: capturedExpectedTotal, runDetails } = aggregateRecordCaptures(collectedRecordCaptures);
  addBatchExecutionOutcomes(buckets, collectedExecutions);
  const ftIdValidationCompleted = capturedExpectedTotal > 0 || buckets.FAILED.length > 0 || buckets.REJECTED.length > 0;
  const expectedTotal = ftIdValidationCompleted
    ? capturedExpectedTotal
    : Number(summary?.env?.numPayments || 0) * Number(summary?.env?.iterations || 0) * Number(summary?.env?.vus || 0);
  const html = buildHtmlReport({
    summary,
    buckets,
    shortfalls,
    totalShortfall,
    expectedTotal,
    ftIdValidationCompleted,
    runDetails,
    executions: collectedExecutions,
    environment: env.ENV,
  });

  const ftArtifactFiles = writeFtIdArtifacts(buckets, runDetails);

  const ts = runStartedAt.toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(reportsDir, `bulk-payments-report-${ts}.html`);
  fs.writeFileSync(outPath, html, "utf8");
  updatePerformanceMatrix(summary, buckets, totalShortfall, ftIdValidationCompleted);
  const reportUrl = pathToFileURL(outPath).href;
  console.log(`[k6][report] HTML report written to ${path.relative(rootDir, outPath)}`);
  for (const artifactFile of ftArtifactFiles) {
    console.log(`[k6][ft-ids] saved ${artifactFile}`);
  }
  console.log(`[k6][report] Open in browser: ${reportUrl}`);
  openHtmlReport(outPath);
  return outPath;
}

async function run() {
  let collector;
  try {
    collector = await startCaptureServer();
    env.K6_RECORDS_COLLECTOR_URL = `http://127.0.0.1:${collector.port}/records-capture`;
    env.K6_EXECUTION_COLLECTOR_URL = `http://127.0.0.1:${collector.port}/execution-capture`;

    const child = spawn(k6Path, ["run", "-e", `ENV=${selectedEnv}`, "-e", `TIER=${selectedEnv}`, "-e", `SAS_RETRY_IDEMPOTENCY_MODE=${env.SAS_RETRY_IDEMPOTENCY_MODE}`, scriptPath], {
      stdio: "inherit",
      env,
      shell: false,
    });

    const exitCode = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", (code) => resolve(code || 0));
    });

    await closeServer(collector.server);

    try {
      writeHtmlReport();
    } catch (reportError) {
      console.error(`[k6][report][ERROR] ${String(reportError.message || reportError)}`);
    }

    process.exit(exitCode);
  } catch (error) {
    if (collector && collector.server) {
      await closeServer(collector.server);
    }

    try {
      writeHtmlReport();
    } catch (reportError) {
      console.error(`[k6][report][ERROR] ${String(reportError.message || reportError)}`);
    }

    console.error(`[k6][collector][ERROR] ${String(error.message || error)}`);
    process.exit(1);
  }
}

run();