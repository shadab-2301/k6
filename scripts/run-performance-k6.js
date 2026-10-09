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
// --fileValid <seconds>: limit for the upload -> PENDINIT file validation wait. Omitted = wait with no limit.
const fileValidArg = String(readArg("--fileValid", readArg("--file-valid", ""))).trim();
const fileValidSeconds = fileValidArg === "" ? 0 : Number(fileValidArg);
if (fileValidArg !== "" && !(Number.isFinite(fileValidSeconds) && fileValidSeconds > 0)) {
  console.error("Invalid --fileValid. Use a number of seconds greater than 0, e.g. --fileValid 300.");
  process.exit(1);
}
env.K6_FILE_VALIDATION_TIMEOUT_MS = String(Math.round(fileValidSeconds * 1000));
// Without --fileValid the k6 scenario still needs a ceiling; 24h keeps the PENDINIT wait effectively unlimited.
const UNLIMITED_FILE_VALIDATION_SCENARIO_SECONDS = 24 * 60 * 60;
console.log(`[k6][config] file validation (PENDINIT) timeout=${fileValidSeconds > 0 ? `${fileValidSeconds}s` : "none (wait until PENDINIT; set --fileValid <seconds> to limit)"}`);
const explicitMaxDuration = readArg("--max-duration", "");
const derivedMaxDurationSeconds = fileValidSeconds > 0
  ? Math.ceil(fileValidSeconds + (Number(pollTimeoutMs) * 2 + 30000) / 1000)
  : UNLIMITED_FILE_VALIDATION_SCENARIO_SECONDS;
const requestedMaxDurationSeconds = durationSeconds(explicitMaxDuration);
const scenarioMaxDurationSeconds = Math.max(requestedMaxDurationSeconds, derivedMaxDurationSeconds);
env.K6_MAX_DURATION = `${Number.isFinite(scenarioMaxDurationSeconds) ? scenarioMaxDurationSeconds : 195}s`;
setEnvFromArg("K6_PAYMENT_TYPE", "--payment-type", readArg("--payment-type", "INT"));
setEnvFromArg("K6_RAIL", "--rail", readArg("--rail", "INT"));
setEnvFromArg("K6_MIX_BATCH", "--mix", readArg("--mix", ""));
if (env.K6_MIX_BATCH) {
  console.log(`[k6][config] mixed batch upload: ${env.K6_MIX_BATCH} (--payment-type and --rail are ignored)`);
}
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

function localIsoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const explicitPaymentDate = readArg("--payment-date", "");
if (explicitPaymentDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(explicitPaymentDate) || Number.isNaN(new Date(explicitPaymentDate).getTime())) {
    console.error("Invalid --payment-date. Use YYYY-MM-DD.");
    process.exit(1);
  }
  env.K6_PAYMENT_DATE = explicitPaymentDate;
} else if (hasFlag("--future")) {
  const rawDays = readArg("--future", "");
  const futureDays = /^\d+$/.test(rawDays) ? Number(rawDays) : 1;
  if (futureDays < 1) {
    console.error("--future must be at least 1 day.");
    process.exit(1);
  }
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + futureDays);
  env.K6_PAYMENT_DATE = localIsoDate(futureDate);
}
if (env.K6_PAYMENT_DATE) {
  console.log(`[k6][config] paymentDate=${env.K6_PAYMENT_DATE}`);
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

const authMode = String(readArg("--auth-mode", "SINGLE_AUTH")).trim().toUpperCase();
if (!["SINGLE_AUTH", "DUAL_AUTH"].includes(authMode)) {
  console.error("Unsupported auth mode. Use --auth-mode SINGLE_AUTH or DUAL_AUTH.");
  process.exit(1);
}
if (authMode === "DUAL_AUTH" && selectedEnv !== "UAT") {
  console.error("The Dual Auth script currently supports only --env UAT.");
  process.exit(1);
}
env.K6_AUTH_MODE = authMode;
if (authMode === "DUAL_AUTH" && !env.K6_PAYMENT_DATE) {
  env.K6_PAYMENT_DATE = localIsoDate(new Date());
}
const scriptFile = authMode === "DUAL_AUTH"
  ? "dual-auth-bulk-payments-performance.k6.js"
  : "bulk-payments-performance.k6.js";
const scriptPath = path.join(__dirname, "..", "apps", "test", "scripts", "performance", scriptFile);

const rootDir = path.join(__dirname, "..");
const reportsDir = path.join(rootDir, "reports", "performance");
const batchUploadDir = path.join(rootDir, "BatchPerfuploaded");
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
      if (req.method !== "POST" || !["/records-capture", "/execution-capture", "/batch-file-capture"].includes(req.url)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, message: "Not found" }));
        return;
      }

      try {
        const raw = await readRequestBody(req);
        const payload = JSON.parse(raw || "{}");

        if (req.url === "/batch-file-capture") {
          const safePart = (value) => String(value || "").replace(/[^A-Za-z0-9._-]/g, "");
          const fileName = [payload.env, payload.paymentType, payload.rail, payload.fileName].map(safePart).filter(Boolean).join("_");
          fs.mkdirSync(batchUploadDir, { recursive: true });
          const filePath = path.join(batchUploadDir, fileName || `batch_${Date.now()}.csv`);
          fs.writeFileSync(filePath, String(payload.content || ""), "utf8");
          console.log(`[k6][batch-file] saved ${path.relative(rootDir, filePath)}`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
          return;
        }

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
          paymentType: row.paymentType || capture.paymentType || "",
          railType: row.railType || capture.railType || "",
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

const reportHeaderImagePath = path.join(__dirname, "..", "config", "inages", "performance.png");
let reportHeaderImageCache;

function reportHeaderImageDataUri() {
  if (reportHeaderImageCache !== undefined) return reportHeaderImageCache;
  try {
    reportHeaderImageCache = `data:image/png;base64,${fs.readFileSync(reportHeaderImagePath).toString("base64")}`;
  } catch {
    console.warn(`[k6][report][WARN] Header image not found at ${path.relative(rootDir, reportHeaderImagePath)}; using text header.`);
    reportHeaderImageCache = null;
  }
  return reportHeaderImageCache;
}

function renderReportHeader(title, facts) {
  const image = reportHeaderImageDataUri();
  const banner = image ? `<img class="report-banner" src="${image}" alt="Performance Report branding">` : "";
  const factsHtml = facts
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `<div class="report-fact"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`)
    .join("");
  return `<header class="report-header">
    <div class="report-masthead">
      <div class="report-title">
        <h1>${escapeHtml(title)}</h1>
        <p>Generated on ${escapeHtml(new Date().toLocaleString())}</p>
      </div>
      ${banner}
    </div>
    <div class="report-facts">${factsHtml}</div>
  </header>`;
}

function statusTone(value) {
  const text = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (["PASSED", "PASS", "SUCCESS", "SENT", "SCHEDULED", "SCHED", "COMPLETED"].includes(text)) return "pass";
  if (["FAILED", "FAIL", "REJECTED", "TIMED_OUT", "MISSING_RECORDS", "PAYMENT_FAILED", "PAYMENT_REJECTED", "ERROR"].includes(text)) return "fail";
  if (["IN_PROGRESS", "INCOMPLETE", "PENDING", "UNKNOWN"].includes(text)) return "warn";
  return "neutral";
}

function statusBadge(value) {
  const text = String(value || "n/a");
  return `<span class="badge badge-${statusTone(text)}">${escapeHtml(text.replace(/_/g, " "))}</span>`;
}

const REPORT_BASE_CSS = `
  :root {
    --ink:#111827; --text:#1f2937; --muted:#6b7280; --line:#e5e7eb; --line-strong:#d1d5db; --surface:#f9fafb; --head:#f3f4f6;
    --pass:#166534; --pass-bg:#f0fdf4; --pass-line:#bbf7d0;
    --fail:#b91c1c; --fail-bg:#fef2f2; --fail-line:#fecaca;
    --warn:#92400e; --warn-bg:#fffbeb; --warn-line:#fde68a;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { background:#ffffff; }
  body { font-family:"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif; color:var(--text); font-size:14px; line-height:1.5; -webkit-font-smoothing:antialiased; }
  .visually-hidden { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
  .container { max-width:1280px; margin:0 auto; padding:24px 32px 40px; background:#ffffff; }
  .report-header { border:1px solid var(--line); border-radius:8px; overflow:hidden; margin-bottom:24px; background:#ffffff; }
  .report-masthead { display:flex; flex-wrap:wrap-reverse; align-items:center; justify-content:space-between; gap:16px; }
  .report-title { padding:20px 24px; min-width:0; }
  .report-title h1 { font-size:22px; font-weight:600; color:var(--ink); letter-spacing:-.01em; }
  .report-title p { margin-top:4px; font-size:13px; color:var(--muted); }
  .report-banner { display:block; height:180px; width:auto; max-width:100%; margin-left:auto; object-fit:contain; object-position:right center; }
  .report-facts { display:flex; flex-wrap:wrap; border-top:1px solid var(--line); }
  .report-fact { flex:1 1 180px; padding:12px 20px; border-right:1px solid var(--line); }
  .report-fact:last-child { border-right:0; }
  .report-fact > span { display:block; font-size:11px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
  .report-fact > strong { display:block; margin-top:2px; font-size:14px; font-weight:600; color:var(--ink); }
  .section { margin-top:32px; }
  .section h2 { font-size:17px; font-weight:600; color:var(--ink); padding-bottom:10px; margin-bottom:16px; border-bottom:1px solid var(--line); }
  .section h3 { font-size:14px; font-weight:600; color:var(--ink); margin:22px 0 8px; }
  .table-scroll { width:100%; overflow-x:auto; border:1px solid var(--line); border-radius:6px; background:#ffffff; }
  .data-table { width:100%; border-collapse:separate; border-spacing:0; font-size:13px; font-variant-numeric:tabular-nums; }
  .data-table th { position:sticky; top:0; z-index:1; background:var(--head); color:#374151; font-size:11.5px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; text-align:left; white-space:nowrap; padding:10px 12px; border-bottom:1px solid var(--line-strong); }
  .data-table td { padding:9px 12px; border-bottom:1px solid var(--line); vertical-align:top; color:var(--text); }
  .data-table tbody tr:last-child td { border-bottom:0; }
  .data-table.striped tbody tr:nth-child(even) td { background:#fcfcfd; }
  .data-table.striped tbody tr:hover td { background:var(--head); }
  .data-table .num { text-align:right; white-space:nowrap; }
  .data-table .id { font-family:Consolas, "SFMono-Regular", Menlo, monospace; font-size:12.5px; white-space:nowrap; }
  .data-table .nowrap { white-space:nowrap; }
  .table-note { margin-top:8px; color:var(--muted); font-size:12.5px; }
  .badge { display:inline-block; padding:2px 8px; border-radius:4px; border:1px solid var(--line-strong); background:var(--head); color:#374151; font-size:11.5px; font-weight:600; letter-spacing:.03em; text-transform:uppercase; white-space:nowrap; }
  .badge-pass { color:var(--pass); background:var(--pass-bg); border-color:var(--pass-line); }
  .badge-fail { color:var(--fail); background:var(--fail-bg); border-color:var(--fail-line); }
  .badge-warn { color:var(--warn); background:var(--warn-bg); border-color:var(--warn-line); }
  .empty-state { padding:12px 14px; border:1px dashed var(--line-strong); border-radius:6px; background:var(--surface); color:var(--muted); }
  .footer { margin-top:40px; padding-top:14px; border-top:1px solid var(--line); display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; color:var(--muted); font-size:12px; }
  @media print {
    .container { padding:0; max-width:none; }
    .table-scroll { overflow:visible; border:0; }
    .data-table th { position:static; }
    thead { display:table-header-group; }
    tr { page-break-inside:avoid; }
  }
`;

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

function isSentStatus(statusCode) {
  return String(statusCode || "").trim().toUpperCase() === "SENT";
}

function ftIdOutcomeCounts(execution) {
  const counts = { PASSED: 0, SENT: 0, FAILED: 0, REJECTED: 0, IN_PROGRESS: 0 };
  for (const payment of execution.payments || []) {
    const group = String(payment.resultGroup || "").toUpperCase();
    if (counts[group] !== undefined) {
      counts[group] += 1;
    }
    if (isSentStatus(payment.statusCode)) counts.SENT += 1;
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

function renderDualAuthExecutionTable(executions) {
  const rows = [...executions].sort((first, second) =>
    Number(first.vu || 0) - Number(second.vu || 0) || Number(first.iteration || 0) - Number(second.iteration || 0)
  ).map((execution) => {
    const timings = execution.timings || {};
    const timestamps = execution.timestamps || {};
    const counts = ftIdOutcomeCounts(execution);
    const validationMs = elapsedBetween(timestamps.uploadStartedAt, timestamps.pendinitEndedAt);
    return `<tr class="batch-stage">
      <td>${escapeHtml(execution.paymentType || "n/a")}</td>
      <td>${escapeHtml(execution.railType || "n/a")}</td>
      <td class="num">${escapeHtml(execution.paymentCount ?? "n/a")}</td>
      <td class="num">${escapeHtml(formatDurationMs(validationMs))}</td>
      <td class="num">${escapeHtml(formatDurationMs(timings.initiationApiMs))}</td>
      <td class="num">${escapeHtml(formatDurationMs(timings.approvalApiMs))}</td>
      <td class="num">${escapeHtml(formatDurationMs(timings.pendingAuthToFinalMs))}</td>
      <td class="id">${escapeHtml(execution.fileId || "n/a")}</td>
    </tr>
    <tr class="batch-start"><td colspan="8">
      <div class="trace-batch-title">VU ${escapeHtml(execution.vu)} / Iteration ${escapeHtml(execution.iteration)} ${statusBadge(overallResult(execution))}</div>
      <div class="trace-identifiers">
        <span><strong>File Name:</strong> ${escapeHtml(execution.fileName || "n/a")}</span>
        <span><strong>Parent Transaction ID:</strong> ${escapeHtml(uniqueJoined(execution.parentTransactionIds))}</span>
        <span><strong>BKREF:</strong> ${escapeHtml(uniqueJoined(execution.bkRefIds))}</span>
      </div>
      ${execution.failure ? `<div class="trace-subsection trace-failure"><div class="trace-subtitle">Failure Summary</div><div>${escapeHtml(stageLabel(execution.failure.stage))}: ${escapeHtml(conciseFailureReason(execution.failure))}</div></div>` : ""}
      <div class="trace-subsection"><div class="trace-subtitle">FT-ID Outcome Summary</div>
        <div class="trace-outcomes"><span>Passed: <strong>${counts.PASSED}</strong></span><span>Sent: <strong>${counts.SENT}</strong></span><span>Failed: <strong>${counts.FAILED}</strong></span><span>Rejected: <strong>${counts.REJECTED}</strong></span><span>In Progress: <strong>${counts.IN_PROGRESS}</strong></span></div>
      </div>
    </td></tr>`;
  }).join("");
  return `<div class="table-scroll"><table class="data-table execution-table"><thead><tr>
    ${performanceColumnHeaders(true)}
  </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function performanceColumnHeaders(dualAuth) {
  return [
    `<th>Payment Type</th>`,
    `<th>RAIL Type</th>`,
    `<th class="num">Records</th>`,
    `<th class="num">File Validation Time</th>`,
    `<th class="num">Initiation API TAT</th>`,
    ...(dualAuth ? [`<th class="num">Approval API TAT</th>`] : []),
    dualAuth
      ? `<th class="num">Time From Pending Auth to Sent / Sched</th>`
      : `<th class="num">Time From Pending Initiation to Sent / Sched</th>`,
    `<th>File ID</th>`,
  ].join("");
}

const TIMELINE_COLORS = {
  start: "#334155",
  upload: "#2563eb",
  validation: "#f59e0b",
  initiation: "#16a34a",
  pendingApproval: "#7c3aed",
  approval: "#dc2626",
  pending: "#7cc4fa",
  final: "#1e40af",
};

function executionTotalDurationMs(execution, dualAuth) {
  const ts = execution.timestamps || {};
  if (dualAuth) return elapsedBetween(ts.uploadStartedAt, ts.sentEndedAt);
  const stages = executionStageRows(execution);
  const start = stages[0]?.start || ts.uploadStartedAt;
  const end = stages[stages.length - 1]?.end || ts.sentEndedAt || ts.initiationEndedAt || ts.pendinitEndedAt;
  return elapsedBetween(start, end) ?? totalExecutionDurationMs(execution.timings);
}

function utcClock(value, precision = "ms") {
  const iso = new Date(value).toISOString();
  return precision === "minute" ? iso.slice(11, 16) : precision === "second" ? iso.slice(11, 19) : iso.slice(11, 23);
}

function formatSecondsWithMinutes(ms) {
  if (!Number.isFinite(Number(ms)) || ms === null) return "n/a";
  const seconds = Number(ms) / 1000;
  return `${seconds.toFixed(2)}s (${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(2)}s)`;
}

function timelineTicks(startMs, endMs) {
  const span = endMs - startMs;
  const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200].map((s) => s * 1000);
  const step = steps.find((candidate) => span / candidate <= 10) || steps[steps.length - 1];
  const ticks = [];
  for (let t = Math.ceil(startMs / step) * step; t <= endMs; t += step) ticks.push(t);
  return { ticks, precision: step < 60000 ? "second" : "minute" };
}

// Greedy row assignment: each item goes into the first row whose previous item ends before it starts.
function assignRows(items, gap = 0.6) {
  const rowEnds = [];
  for (const item of [...items].sort((a, b) => a.from - b.from)) {
    let row = rowEnds.findIndex((end) => end + gap <= item.from);
    if (row === -1) { row = rowEnds.length; rowEnds.push(item.to); } else { rowEnds[row] = item.to; }
    item.row = row;
  }
  return Math.max(1, rowEnds.length);
}

function renderLinearTimeline(execution, environment, dualAuth, showRunLabel) {
  const ts = execution.timestamps || {};
  const timings = execution.timings || {};
  const eventDefs = [
    ["Execution Started", ts.executionStartedAt || ts.uploadStartedAt, TIMELINE_COLORS.start],
    ["File Upload Started", ts.fileUploadStartedAt || ts.uploadStartedAt, TIMELINE_COLORS.upload],
    ["File Upload Completed", ts.fileUploadCompletedAt, TIMELINE_COLORS.upload],
    ["Pending Initiation Observed", ts.pendingInitiationObservedAt, TIMELINE_COLORS.validation],
    ["Initiation Started", ts.initiationStartedAt, TIMELINE_COLORS.initiation],
    ["Initiation Finished", ts.initiationFinishedAt, TIMELINE_COLORS.initiation],
    ...(dualAuth ? [
      ["Pending Approval Observed", ts.pendingApprovalObservedAt, TIMELINE_COLORS.pendingApproval],
      ["Approval Started", ts.approvalStartedAt, TIMELINE_COLORS.approval],
      ["Approval Finished", ts.approvalEndedAt, TIMELINE_COLORS.approval],
    ] : []),
    ["Final Status Observed", ts.finalStatusObservedAt, TIMELINE_COLORS.final],
  ];
  const events = eventDefs
    .map(([label, value, color]) => ({ label, value, color, t: Date.parse(value || "") }))
    .filter((event) => Number.isFinite(event.t));
  if (events.length < 2) return "";

  const startMs = Number.isFinite(Date.parse(ts.executionStartedAt || ts.uploadStartedAt || "")) ? Date.parse(ts.executionStartedAt || ts.uploadStartedAt) : Math.min(...events.map((e) => e.t));
  const finalMs = Date.parse(ts.finalStatusObservedAt || "");
  const endMs = Number.isFinite(finalMs) ? finalMs : Math.max(...events.map((e) => e.t));
  if (!(endMs > startMs)) return "";
  const pos = (t) => Math.min(100, Math.max(0, ((t - startMs) / (endMs - startMs)) * 100));
  const at = (label) => events.find((event) => event.label === label)?.t;

  // Event labels above the axis. Markers stay at their true positions; labels are spread sideways
  // (over as few rows as fit) and joined to their marker by a leader line when displaced.
  const LABEL_WIDTH = 12.5;
  const LABEL_GAP = 0.6;
  for (const event of events) event.pos = pos(event.t);
  const labelRows = Math.max(1, Math.ceil((events.length * (LABEL_WIDTH + LABEL_GAP)) / 100));
  const byPosition = [...events].sort((a, b) => a.pos - b.pos);
  for (let row = 0; row < labelRows; row++) {
    const rowEvents = byPosition.filter((_, index) => index % labelRows === row);
    let previous = -Infinity;
    for (const event of rowEvents) {
      event.row = row;
      event.center = Math.max(event.pos, LABEL_WIDTH / 2, previous + LABEL_WIDTH + LABEL_GAP);
      previous = event.center;
    }
    let next = Infinity;
    for (const event of [...rowEvents].reverse()) {
      event.center = Math.min(event.center, 100 - LABEL_WIDTH / 2, next - LABEL_WIDTH - LABEL_GAP);
      next = event.center;
    }
  }
  const LABEL_ROW_H = 46;
  const LEADER_H = 26;
  const labelsH = labelRows * LABEL_ROW_H + LEADER_H;

  const pendingStartLabel = dualAuth ? "Pending Approval Observed" : "Pending Initiation Observed";
  const stageDefs = [
    { key: "upload", name: "File Upload", from: at("File Upload Started"), to: at("File Upload Completed") },
    { key: "validation", name: "File Validation", sub: "(Upload to Pending Initiation)", from: at("File Upload Completed"), to: at("Pending Initiation Observed") },
    { key: "initiation", name: "Initiation API", from: at("Initiation Started"), to: at("Initiation Finished") },
    ...(dualAuth ? [{ key: "approval", name: "Approval API", from: at("Approval Started"), to: at("Approval Finished") }] : []),
    { key: "pending", name: dualAuth ? "Pending Auth → Sent/Sched" : "Pending Initiation → Sent/Sched", from: (dualAuth ? at("Approval Finished") : undefined) ?? at(pendingStartLabel) ?? Date.parse(ts.pendinitEndedAt || ""), to: at("Final Status Observed") },
  ];
  const MIN_BAR = 0.8;
  const stages = stageDefs.filter((stage) => Number.isFinite(stage.from) && Number.isFinite(stage.to) && stage.to >= stage.from).map((stage) => {
    const left = pos(stage.from);
    const width = Math.max(pos(stage.to) - left, MIN_BAR);
    const barLeft = Math.min(left, 100 - width);
    const durationText = `${((stage.to - stage.from) / 1000).toFixed(2)}s`;
    const nameWidth = Math.max(stage.name.length, (stage.sub || "").length) * 0.62;
    const center = barLeft + width / 2;
    const inside = width >= durationText.length * 0.75 + 1;
    const nameFrom = Math.max(0, Math.min(100 - nameWidth, center - nameWidth / 2));
    return { ...stage, barLeft, width, durationText, inside, nameFrom, nameWidth,
      from: Math.min(barLeft, nameFrom), to: Math.max(barLeft + width + (inside ? 0 : durationText.length * 0.75 + 1), nameFrom + nameWidth) };
  });
  const laneCount = assignRows(stages, 1);
  const LANE_H = 64;
  const barsTop = labelsH + 22;
  const barsH = laneCount * LANE_H;

  const { ticks, precision } = timelineTicks(startMs, endMs);
  const plotH = barsTop + barsH + 10;

  const labelTop = (event) => (labelRows - 1 - event.row) * LABEL_ROW_H;
  const labelsHtml = events.map((event) => `<div class="lt-label" style="left:${event.center.toFixed(3)}%;top:${labelTop(event)}px">
        <strong>${escapeHtml(event.label)}</strong><span>${escapeHtml(utcClock(event.value))}</span></div>`).join("");
  const leadersHtml = `<svg class="lt-leaders" viewBox="0 0 100 ${labelsH}" preserveAspectRatio="none" style="height:${labelsH}px">${events.map((event) => {
    const y1 = labelTop(event) + LABEL_ROW_H - 6;
    return `<line x1="${event.center.toFixed(3)}" y1="${y1}" x2="${event.pos.toFixed(3)}" y2="${labelsH}" stroke="${event.color}" />`;
  }).join("")}</svg>`;
  const markersHtml = events.map((event) => `
      <div class="lt-line" style="left:${event.pos.toFixed(3)}%;top:${labelsH + 8}px;height:${plotH - labelsH - 8}px"></div>
      <div class="lt-dot" style="left:${event.pos.toFixed(3)}%;top:${labelsH + 2}px;background:${event.color}" title="${escapeHtml(event.label)} ${escapeHtml(formatTimestamp(event.value))}"></div>`).join("");
  const gridHtml = ticks.map((t) => `<div class="lt-grid" style="left:${pos(t).toFixed(3)}%;top:${labelsH + 8}px;height:${plotH - labelsH - 8}px"></div>`).join("");
  const barsHtml = stages.map((stage) => {
    const top = barsTop + stage.row * LANE_H;
    const durationOutside = stage.inside ? "" : `<div class="lt-bar-outside" style="left:calc(${(stage.barLeft + stage.width).toFixed(3)}% + 4px);top:${top}px">${escapeHtml(stage.durationText)}</div>`;
    return `<div class="lt-bar lt-${stage.key}" style="left:${stage.barLeft.toFixed(3)}%;width:${stage.width.toFixed(3)}%;top:${top}px" title="${escapeHtml(stage.name)} ${escapeHtml(stage.durationText)}">${stage.inside ? escapeHtml(stage.durationText) : ""}</div>${durationOutside}
      <div class="lt-bar-name" style="left:${stage.nameFrom.toFixed(3)}%;width:${stage.nameWidth.toFixed(3)}%;top:${top + 26}px"><strong>${escapeHtml(stage.name)}</strong>${stage.sub ? `<span>${escapeHtml(stage.sub)}</span>` : ""}</div>`;
  }).join("");
  const axisHtml = ticks.map((t) => `<div class="lt-tick" style="left:${pos(t).toFixed(3)}%">${escapeHtml(utcClock(t, precision))}</div>`).join("");

  const perBatch = Array.isArray(execution.perBatch) ? execution.perBatch : [];
  const bkRows = perBatch.map((entry) => {
    const segment = (fromIso, toIso, cls, title) => {
      const from = Date.parse(fromIso || ""); const to = Date.parse(toIso || "");
      if (!Number.isFinite(from)) return "";
      const left = pos(from);
      const width = Number.isFinite(to) ? Math.max(pos(to) - left, 0.5) : 0.5;
      return `<div class="lt-bk-seg ${cls}" style="left:${Math.min(left, 100 - width).toFixed(3)}%;width:${width.toFixed(3)}%" title="${escapeHtml(title)}: ${escapeHtml(formatTimestamp(fromIso))}${Number.isFinite(to) ? ` to ${escapeHtml(formatTimestamp(toIso))}` : ""}"></div>`;
    };
    const label = `${entry.paymentType || "n/a"}/${entry.rail || "n/a"} - ${entry.bkRef || entry.transactionId || "n/a"}`;
    return `<div class="lt-bk-row"><div class="lt-bk-label" title="${escapeHtml(`${entry.transactionId} / ${entry.bkRef}`)}">${escapeHtml(label)}</div>
        <div class="lt-bk-track">${segment(entry.initiationStartedAt, entry.initiationFinishedAt, "lt-initiation", "Initiation")}${dualAuth ? segment(entry.approvalStartedAt, entry.approvalFinishedAt, "lt-approval", "Approval") : ""}${segment(entry.finalStatusObservedAt, "", "lt-final", "Final status observed")}</div></div>`;
  }).join("");
  const bkHtml = bkRows ? `<div class="lt-bk"><div class="lt-bk-title">Per-BK initiation${dualAuth ? " / approval" : ""} markers</div>${bkRows}</div>` : "";

  const sorted = [...events].sort((a, b) => a.t - b.t);
  const eventRows = sorted.map((event, index) => `<tr><td class="num">${index + 1}</td><td>${escapeHtml(event.label)}</td><td class="nowrap">${escapeHtml(formatTimestamp(event.value))}</td><td class="num">${index === 0 ? "-" : `${((event.t - sorted[index - 1].t) / 1000).toFixed(2)}s`}</td></tr>`).join("");

  const legend = stages.map((stage) => `<div class="lt-legend-item"><span class="lt-swatch lt-${stage.key}"></span>${escapeHtml(stage.name)} (${escapeHtml(stage.durationText)})</div>`).join("");
  const totalMs = executionTotalDurationMs(execution, dualAuth);
  const result = overallResult(execution);
  const passed = result === "Passed";
  const metrics = [
    ["File Validation Time", formatDurationMs(elapsedBetween(ts.uploadStartedAt, ts.pendinitEndedAt))],
    ["Initiation API TAT", formatDurationMs(timings.initiationApiMs)],
    ["Approval API TAT", dualAuth ? formatDurationMs(timings.approvalApiMs) : "N/A"],
    [dualAuth ? "Pending Auth → Sent/Sched" : "Pending Initiation → Sent/Sched", formatDurationMs(dualAuth ? timings.pendingAuthToFinalMs : timings.pendingInitiToFinalMs)],
    ["Total Duration", formatDurationMs(totalMs)],
    ["Final Status", execution.statuses?.sent || "n/a"],
  ].map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td class="num">${escapeHtml(value)}</td></tr>`).join("");
  const railText = String(execution.railType || "n/a").split("+").join(" + ");
  const typeRail = String(execution.paymentType || "").toUpperCase() === "MIX" ? `MIX (${railText})` : `${execution.paymentType || "n/a"} / ${railText}`;

  return `<div class="lt-card">
    <div class="lt-head">
      <div>
        <div class="lt-title">Bulk Payments Execution Timeline (Linear View)${showRunLabel ? ` <span class="lt-run">VU ${escapeHtml(execution.vu)} / Iteration ${escapeHtml(execution.iteration)}</span>` : ""}</div>
        <div class="lt-meta">
          <span>File: <strong>${escapeHtml(execution.fileName || "n/a")}</strong></span>
          <span>File ID: <strong>${escapeHtml(execution.fileId || "n/a")}</strong></span>
          <span>Environment: <strong>${escapeHtml(environment || "n/a")}</strong></span>
          <span>Payment Type / Rail: <strong>${escapeHtml(typeRail)}</strong></span>
          <span>Total Records: <strong>${escapeHtml(execution.paymentCount ?? "n/a")}</strong></span>
        </div>
      </div>
      <div class="lt-status ${passed ? "lt-status-pass" : "lt-status-fail"}">
        <div class="lt-status-title">Overall Status: ${escapeHtml(result.toUpperCase())}</div>
        <div>Final Status: <strong>${escapeHtml(execution.statuses?.sent || "n/a")}</strong></div>
        <div>Total Duration: <strong>${escapeHtml(formatSecondsWithMinutes(totalMs))}</strong></div>
      </div>
    </div>
    <div class="lt-scroll"><div class="lt-plot" style="height:${plotH}px">
      ${gridHtml}${leadersHtml}${markersHtml}${labelsHtml}${barsHtml}
      <div class="lt-axis" style="top:${plotH}px"></div>
    </div>
    <div class="lt-axis-labels">${axisHtml}</div>
    <div class="lt-axis-title">Time (UTC)</div>
    ${bkHtml}</div>
    <div class="lt-lower">
      <div>
        <h3>Timeline Events</h3>
        <div class="table-scroll"><table class="data-table striped"><thead><tr><th class="num">#</th><th>Event</th><th>Timestamp (UTC)</th><th class="num">Duration from Previous</th></tr></thead><tbody>${eventRows}</tbody></table></div>
      </div>
      <div>
        <h3>Stage Legend</h3>
        <div class="lt-legend">${legend}</div>
        <h3>Key Metrics</h3>
        <div class="table-scroll"><table class="data-table lt-metrics"><tbody>${metrics}</tbody></table></div>
      </div>
    </div>
  </div>`;
}

function renderLinearTimelines(executions, environment) {
  const dualAuth = authMode === "DUAL_AUTH";
  const sorted = [...executions].sort((a, b) => Number(a.vu || 0) - Number(b.vu || 0) || Number(a.iteration || 0) - Number(b.iteration || 0));
  const cards = sorted.map((execution) => renderLinearTimeline(execution, environment, dualAuth, sorted.length > 1)).filter(Boolean).join("");
  return cards ? `<section class="section">${cards}</section>` : "";
}

function renderPerBatchBreakdown(executions) {
  const withBatches = [...executions]
    .filter((execution) => Array.isArray(execution.perBatch) && execution.perBatch.length > 0)
    .sort((a, b) => Number(a.vu || 0) - Number(b.vu || 0) || Number(a.iteration || 0) - Number(b.iteration || 0));
  if (withBatches.length === 0) return "";

  const dualAuth = authMode === "DUAL_AUTH";
  const pendingLabel = dualAuth ? "Pending Auth &rarr; Sent/Sched" : "Pending Initiation &rarr; Sent/Sched";
  const stamp = (value) => (value ? escapeHtml(formatTimestamp(value)) : "N/A");
  const tables = withBatches.map((execution) => {
    const rows = execution.perBatch.map((entry) => `
      <tr>
        <td class="batch-name">${escapeHtml(entry.batchName || "n/a")}</td>
        <td class="nowrap">${escapeHtml(entry.paymentType || "n/a")}</td>
        <td class="nowrap">${escapeHtml(entry.rail || "n/a")}</td>
        <td class="num">${escapeHtml(entry.recordCount ?? "n/a")}</td>
        <td class="id">${escapeHtml(entry.transactionId || "n/a")}</td>
        <td class="id">${escapeHtml(entry.bkRef || "n/a")}</td>
        <td class="num">${escapeHtml(formatDurationMs(entry.initiationApiMs))}</td>
        <td class="num">${dualAuth ? escapeHtml(formatDurationMs(entry.approvalApiMs)) : "N/A"}</td>
        <td class="num">${escapeHtml(formatDurationMs(entry.pendingToFinalMs))}</td>
        <td>${statusBadge(entry.finalStatus || "n/a")}</td>
      </tr>
      <tr class="per-bk-detail"><td colspan="10"><div class="per-bk-timestamps">
        <div><span>Initiation Started:</span> <strong>${stamp(entry.initiationStartedAt)}</strong></div>
        <div><span>Initiation Finished:</span> <strong>${stamp(entry.initiationFinishedAt)}</strong></div>
        ${dualAuth ? `<div><span>Pending Approval Observed:</span> <strong>${stamp(entry.pendingApprovalObservedAt)}</strong></div>
        <div><span>Approval Started:</span> <strong>${stamp(entry.approvalStartedAt)}</strong></div>
        <div><span>Approval Finished:</span> <strong>${stamp(entry.approvalFinishedAt)}</strong></div>` : ""}
        <div><span>Final Status Observed:</span> <strong>${stamp(entry.finalStatusObservedAt)}</strong></div>
      </div></td></tr>`).join("");
    const heading = withBatches.length > 1 ? `<h3>VU ${escapeHtml(execution.vu)} / Iteration ${escapeHtml(execution.iteration)}</h3>` : "";
    return `${heading}<div class="table-scroll"><table class="data-table per-bk-table"><thead><tr>
      <th>Batch</th><th>Payment Type</th><th>Rail</th><th class="num">Records</th><th>Transaction ID</th><th>BKREF</th>
      <th class="num">Initiation API TAT</th><th class="num">Approval API TAT</th><th class="num">${pendingLabel}</th><th>Final Status</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
  }).join("");

  return `<section class="section">
      <h2>Per-BK Transaction Breakdown</h2>
      ${tables}
    </section>`;
}

function renderPerformanceMetricsTable(executions) {
  if (executions.length === 0) {
    return `<div class="empty-state">No execution data was collected before the run ended.</div>`;
  }

  const dualAuth = authMode === "DUAL_AUTH";
  const rows = [...executions]
    .sort((a, b) => Number(a.vu || 0) - Number(b.vu || 0) || Number(a.iteration || 0) - Number(b.iteration || 0))
    .map((execution) => {
      const timings = execution.timings || {};
      const timestamps = execution.timestamps || {};
      return `<tr>
        <td class="nowrap">${escapeHtml(execution.paymentType || "n/a")}</td>
        <td class="nowrap">${escapeHtml(execution.railType || "n/a")}</td>
        <td class="num">${escapeHtml(execution.paymentCount ?? "n/a")}</td>
        <td class="num">${escapeHtml(formatDurationMs(elapsedBetween(timestamps.uploadStartedAt, timestamps.pendinitEndedAt)))}</td>
        <td class="num">${escapeHtml(formatDurationMs(timings.initiationApiMs))}</td>
        ${dualAuth ? `<td class="num">${escapeHtml(formatDurationMs(timings.approvalApiMs))}</td>` : ""}
        <td class="num">${escapeHtml(formatDurationMs(dualAuth ? timings.pendingAuthToFinalMs : timings.pendingInitiToFinalMs))}</td>
        <td class="id">${escapeHtml(execution.fileId || "n/a")}</td>
      </tr>`;
    })
    .join("");

  return `<div class="table-scroll"><table class="data-table striped"><thead><tr>
    ${performanceColumnHeaders(dualAuth)}
  </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderExecutionTraceTable(executions) {
  if (executions.length === 0) {
    return `<div class="empty-state">No execution data was collected before the run ended.</div>`;
  }

  if (authMode === "DUAL_AUTH") return renderDualAuthExecutionTable(executions);

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
      `<tr class="batch-stage">
        <td>${escapeHtml(execution.paymentType || "n/a")}</td>
        <td>${escapeHtml(execution.railType || "n/a")}</td>
        <td class="num">${escapeHtml(execution.paymentCount ?? "n/a")}</td>
        <td class="num">${escapeHtml(formatDurationMs(elapsedBetween(execution.timestamps?.uploadStartedAt, execution.timestamps?.pendinitEndedAt)))}</td>
        <td class="num">${escapeHtml(formatDurationMs(execution.timings?.initiationApiMs))}</td>
        <td class="num">${escapeHtml(formatDurationMs(execution.timings?.pendingInitiToFinalMs))}</td>
        <td class="id">${escapeHtml(execution.fileId || "n/a")}</td>
      </tr>`,
      `<tr class="batch-start"><td colspan="7">
        <div class="trace-batch-title">${escapeHtml(batchLabel)} ${statusBadge(result)}</div>
        <div class="trace-identifiers">
          <span><strong>File Name:</strong> ${escapeHtml(execution.fileName || "n/a")}</span>
          <span><strong>File ID:</strong> ${escapeHtml(execution.fileId || "n/a")}</span>
          <span><strong>Parent Transaction ID:</strong> ${escapeHtml(uniqueJoined(execution.parentTransactionIds))}</span>
          <span><strong>BKREF:</strong> ${escapeHtml(uniqueJoined(execution.bkRefIds))}</span>
          <span><strong>Total Execution Duration:</strong> ${escapeHtml(formatDurationMs(totalDuration))}</span>
        </div>
        ${failureSummary}
        <div class="trace-subsection">
          <div class="trace-subtitle">FT-ID Outcome Summary</div>
          <div class="trace-outcomes">
            <span>Passed: <strong>${counts.PASSED}</strong></span>
            <span>Sent: <strong>${counts.SENT}</strong></span>
            <span>Failed: <strong>${counts.FAILED}</strong></span>
            <span>Rejected: <strong>${counts.REJECTED}</strong></span>
            <span>In Progress: <strong>${counts.IN_PROGRESS}</strong></span>
          </div>
        </div>
      </td></tr>`,
    ];
  }).join("");

  return `<div class="table-scroll"><table class="data-table execution-table"><thead><tr>
    ${performanceColumnHeaders(false)}
  </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function paymentOnlyBuckets(buckets) {
  return Object.fromEntries(
    Object.entries(buckets).map(([bucketName, rows]) => [bucketName, rows.filter((row) => !row.batchLevel)])
  );
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
    return `<div class="empty-state">No payment records were collected for this run.</div>`;
  }

  const rowsHtml = rows
    .map((row, index) => {
      const page = Math.floor(index / pageSize) + 1;
      return `
        <tr class="payment-row" data-page="${page}">
          <td class="num">${index + 1}</td>
          <td class="id">${escapeHtml(row.ftId)}</td>
          <td class="nowrap">${escapeHtml(row.paymentType || "n/a")}</td>
          <td class="nowrap">${escapeHtml(row.railType || "n/a")}</td>
          <td class="id">${escapeHtml(row.transactionId)}</td>
          <td>${statusBadge(row.bucketName)}</td>
          <td class="nowrap">${escapeHtml(row.statusCode)}</td>
          <td>${escapeHtml(row.statusDescription)}</td>
          <td class="num">${escapeHtml(row.amount)}</td>
          <td class="nowrap">${escapeHtml(row.fromAccountReference)}</td>
          <td class="nowrap">${escapeHtml(row.toAccountReference)}</td>
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
    <div class="table-scroll"><table class="data-table striped payments-table">
      <thead>
        <tr>
          <th class="num">#</th>
          <th>FT ID</th>
          <th>Payment Type</th>
          <th>Rail</th>
          <th>Transaction ID</th>
          <th>Result Group</th>
          <th>Status Code</th>
          <th>Description</th>
          <th class="num">Amount</th>
          <th>From Reference</th>
          <th>To Reference</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table></div>`;
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
        return entry
          ? `<td class="matrix-cell"><div class="matrix-time">${escapeHtml(entry.timeTaken)}</div>${statusBadge(entry.status)}<div class="matrix-meta">${escapeHtml(entry.paymentCount)} payment(s)</div><div class="matrix-meta">${escapeHtml(String(entry.updatedAt || "").replace("T", " ").slice(0, 16))} UTC</div></td>`
          : `<td class="matrix-cell matrix-empty">Not run</td>`;
      }).join("");
      return `<tr><td class="nowrap"><strong>${escapeHtml(paymentType)}</strong></td><td class="nowrap">${escapeHtml(railType)}</td>${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Performance Matrix</title>
<style>
${REPORT_BASE_CSS}
  .matrix-table { min-width:900px; table-layout:fixed; }
  .matrix-table th:nth-child(1) { width:110px; }
  .matrix-table th:nth-child(2) { width:70px; }
  .matrix-table th { white-space:normal; }
  .matrix-time { font-size:14px; font-weight:600; color:var(--ink); margin-bottom:4px; font-variant-numeric:tabular-nums; }
  .matrix-meta { margin-top:3px; font-size:11.5px; color:var(--muted); }
  .matrix-empty { color:#9ca3af; }
</style>
</head>
<body>
<div class="container">
  ${renderReportHeader("Performance Matrix", [
    ["Report", "Performance Matrix"],
    ["Payment Type / Rail Combinations", escapeHtml(new Set(matrix.entries.map((entry) => `${entry.paymentType}|${entry.railType}`)).size)],
    ["Recorded Runs", escapeHtml(matrix.entries.length)],
    ["Last Updated", escapeHtml(formatTimestamp(new Date().toISOString()))],
  ])}
  <section class="section">
    <h2>Time Taken by Payment Volume</h2>
    <div class="table-scroll">
      <table class="data-table matrix-table">
        <thead>
          <tr><th>Payment Type</th><th>Rail</th>${ranges.map((range) => `<th>${range} Payments</th>`).join("")}</tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="8"><div class="empty-state">No runs recorded yet.</div></td></tr>`}</tbody>
      </table>
    </div>
  </section>
  <footer class="footer"><span>Performance Matrix</span><span>Generated on ${escapeHtml(new Date().toLocaleString())}</span></footer>
</div>
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

function buildIssuesHtml(buckets, totalShortfall, ftIdValidationCompleted, shortfalls = []) {
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
      observation: `${totalShortfall} fewer records were returned by the batch-payments records endpoint than the number of payments generated, within the poll window. Affected file ID(s): ${shortfalls.map((row) => `${row.fileId} (${row.shortfall} missing)`).join(", ") || "n/a"}.`,
      impact: "These payments cannot be confirmed as passed, failed, or rejected, so the true outcome of the run is unknown.",
      recommendations: ["Review the affected file IDs listed above", "Increase K6_RECORDS_POLL_TIMEOUT_MS if records are simply delayed", "Confirm the records endpoint indexes every payment for this file/BKREF"],
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
      recommendations: ["Review the FAILED rows in the All FT IDs / Payment Records table", "Check downstream payment processing logs", "Re-run affected transactions once root cause is fixed"],
    });
  }

  if (rejectedFtIds.length > 0) {
    issues.push({
      title: `${rejectedFtIds.length} payment(s) rejected after initiation`,
      priority: "high",
      observation: `${rejectedFtIds.length} FT ID(s) returned a rejected/declined status when validated via the batch-payments records endpoint.`,
      impact: "Rejected payments indicate validation or business rule failures that block settlement.",
      recommendations: ["Review the REJECTED rows in the All FT IDs / Payment Records table", "Confirm beneficiary/account details used in test data", "Check rejection reason codes with the payments team"],
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
    return `<div class="no-issues">No performance issues detected. All validated payments passed.</div>`;
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
            <div class="issue-section-title">Observation</div>
            <div class="issue-section-content">${escapeHtml(issue.observation)}</div>
          </div>
          <div class="issue-section">
            <div class="issue-section-title">Impact</div>
            <div class="issue-section-content">${escapeHtml(issue.impact)}</div>
          </div>
          <div class="issue-section">
            <div class="issue-section-title">Recommended Actions</div>
            <ul class="issue-recommendations">${issue.recommendations.map((rec) => `<li>${escapeHtml(rec)}</li>`).join("")}</ul>
          </div>
        </div>`
    )
    .join("");
}

function buildHtmlReport({ summary, buckets, shortfalls, totalShortfall, expectedTotal, ftIdValidationCompleted, runDetails, executions, environment }) {
  const paymentBuckets = paymentOnlyBuckets(buckets);
  const total = paymentBuckets.PASSED.length + paymentBuckets.FAILED.length + paymentBuckets.REJECTED.length + paymentBuckets.IN_PROGRESS.length + paymentBuckets.UNKNOWN.length;
  const allPayments = distinctPaymentRows(paymentBuckets);
  const sentTotal = allPayments.filter((row) => isSentStatus(row.statusCode)).length;
  const generatedAt = new Date();
  const showRunWindow = summary?.env?.singleBulkFile === true;
  const overallStatus = runStatus(summary, ftIdValidationCompleted, totalShortfall, buckets);
  const countValue = (count) => (ftIdValidationCompleted ? count : "N/A");
  const countTone = (count, tone) => (ftIdValidationCompleted && count > 0 ? ` ${tone}` : "");
  const headerFacts = [
    ["Environment", escapeHtml(environment || "n/a")],
    ["Payment Type / Rail", `${escapeHtml(summary?.env?.paymentType || "n/a")} / ${escapeHtml(summary?.env?.railType || "n/a")}`],
    ...(summary?.env?.mix ? [["Mixed Batch", escapeHtml(summary.env.mix)]] : []),
    ["Payments Requested", escapeHtml(summary?.env?.numPayments ?? "n/a")],
    ["VUs / Iterations per VU", `${escapeHtml(summary?.env?.vus ?? "n/a")} / ${escapeHtml(summary?.env?.iterations ?? "n/a")}`],
    ...(showRunWindow ? [
      ["Test Start", escapeHtml(formatTimestamp(summary?.startedAt || runStartedAt.toISOString()))],
      ["Test End", escapeHtml(formatTimestamp(summary?.endedAt))],
      ["Total Duration", `${((summary?.durationMs || 0) / 1000).toFixed(1)}s`],
    ] : []),
    ["Overall Status", statusBadge(overallStatus)],
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bulk Payments Performance Report - ${escapeHtml(environment || "")}</title>
<style>
${REPORT_BASE_CSS}
  .validation-table { table-layout:fixed; }
  .data-table.validation-table th, .data-table.validation-table td { text-align:center; white-space:normal; }
  .validation-table td { font-size:15px; font-weight:600; color:var(--ink); }
  .validation-table td.count-pass { color:var(--pass); }
  .validation-table td.count-fail { color:var(--fail); }
  .validation-table td.count-warn { color:var(--warn); }
  .summary-note { margin-top:12px; color:var(--muted); font-size:13px; }
  .execution-table { min-width:960px; }
  .execution-table tbody tr.batch-stage td { font-weight:600; color:var(--ink); background:#ffffff; border-top:1px solid var(--line-strong); }
  .execution-table tbody tr.batch-stage:first-child td { border-top:0; }
  .execution-table tbody tr.batch-start td { background:var(--surface); padding:16px 18px 18px; white-space:normal; word-break:break-word; }
  .trace-batch-title { display:flex; align-items:center; gap:10px; font-size:14px; font-weight:600; color:var(--ink); margin-bottom:10px; }
  .trace-identifiers { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:6px 24px; margin-bottom:6px; font-size:13px; }
  .trace-identifiers strong { color:var(--muted); font-weight:600; }
  .trace-subsection { margin-top:12px; padding-top:12px; border-top:1px solid var(--line); }
  .trace-subtitle { color:var(--ink); font-size:11.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-bottom:8px; }
  .trace-kv { display:grid; grid-template-columns:minmax(170px,240px) 1fr; gap:12px; padding:3px 0; font-size:13px; }
  .trace-kv span { color:var(--muted); }
  .trace-kv strong { color:var(--ink); font-weight:500; }
  .trace-failure { border-left:3px solid var(--fail); padding-left:12px; }
  .trace-outcomes { display:flex; flex-wrap:wrap; gap:8px; }
  .trace-outcomes span { background:#ffffff; border:1px solid var(--line); border-radius:4px; padding:5px 10px; font-size:13px; }
  .per-bk-table th { white-space:normal; vertical-align:bottom; }
  .per-bk-table td.batch-name { max-width:190px; word-break:break-all; }
  .per-bk-table tbody tr.per-bk-detail td { background:var(--surface); padding:8px 12px 12px; border-bottom:1px solid var(--line-strong); }
  .per-bk-timestamps { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px 20px; font-size:12px; }
  .per-bk-timestamps span { color:var(--muted); }
  .lt-card { border:1px solid var(--line); border-radius:8px; padding:18px 20px 20px; background:#ffffff; margin-bottom:20px; }
  .lt-head { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:16px; align-items:start; margin-bottom:18px; }
  @media (max-width: 900px) { .lt-head { grid-template-columns:1fr; } }
  .lt-title { font-size:19px; font-weight:700; color:#0f2a4a; }
  .lt-run { font-size:13px; font-weight:600; color:var(--muted); margin-left:8px; }
  .lt-meta { display:flex; flex-wrap:wrap; gap:4px 18px; margin-top:6px; font-size:12.5px; color:var(--muted); }
  .lt-meta strong { color:var(--ink); font-weight:600; }
  .lt-status { border-radius:8px; padding:10px 16px; font-size:13px; min-width:260px; }
  .lt-status-pass { background:var(--pass-bg); border:1px solid var(--pass-line); color:var(--pass); }
  .lt-status-fail { background:var(--fail-bg); border:1px solid var(--fail-line); color:var(--fail); }
  .lt-status-title { font-size:15px; font-weight:700; margin-bottom:2px; }
  .lt-status strong { color:var(--ink); font-weight:600; }
  .lt-scroll { overflow-x:auto; padding:0 64px 4px; }
  .lt-plot { position:relative; min-width:860px; }
  .lt-label { position:absolute; width:118px; transform:translateX(-50%); text-align:center; font-size:11px; line-height:1.25; color:var(--ink); background:#ffffff; z-index:4; }
  .lt-leaders { position:absolute; left:0; top:0; width:100%; overflow:visible; z-index:1; }
  .lt-leaders line { stroke-width:1; vector-effect:non-scaling-stroke; opacity:.7; }
  .lt-label strong { display:block; font-weight:600; }
  .lt-label span { color:var(--muted); font-variant-numeric:tabular-nums; }
  .lt-dot { position:absolute; width:12px; height:12px; border-radius:50%; transform:translateX(-50%); border:2px solid #ffffff; box-shadow:0 0 0 1px rgba(15,23,42,.25); z-index:3; }
  .lt-line { position:absolute; border-left:1.5px dashed #94a3b8; transform:translateX(-0.75px); z-index:1; }
  .lt-grid { position:absolute; border-left:1px solid #eef1f5; z-index:0; }
  .lt-bar { position:absolute; height:22px; border-radius:3px; color:#ffffff; font-size:11.5px; font-weight:700; text-align:center; line-height:22px; white-space:nowrap; overflow:hidden; z-index:2; }
  .lt-bar-outside { position:absolute; font-size:11.5px; font-weight:700; line-height:22px; color:var(--ink); white-space:nowrap; z-index:2; }
  .lt-bar-name { position:absolute; font-size:11.5px; line-height:1.3; text-align:center; color:var(--ink); z-index:2; }
  .lt-bar-name strong { display:block; font-weight:600; }
  .lt-bar-name span { display:block; color:var(--muted); font-size:11px; }
  .lt-upload { background:${TIMELINE_COLORS.upload}; }
  .lt-validation { background:${TIMELINE_COLORS.validation}; }
  .lt-initiation { background:${TIMELINE_COLORS.initiation}; }
  .lt-approval { background:${TIMELINE_COLORS.approval}; }
  .lt-pending { background:${TIMELINE_COLORS.pending}; color:#0f2a4a; }
  .lt-final { background:${TIMELINE_COLORS.final}; }
  .lt-axis { position:absolute; left:0; right:0; border-top:1.5px solid #94a3b8; }
  .lt-axis-labels { position:relative; height:22px; min-width:860px; }
  .lt-tick { position:absolute; top:6px; transform:translateX(-50%); font-size:11px; color:var(--muted); font-variant-numeric:tabular-nums; }
  .lt-axis-title { text-align:center; font-size:12px; font-weight:600; color:var(--ink); margin-top:4px; min-width:860px; }
  .lt-bk { margin-top:14px; padding-top:10px; border-top:1px solid var(--line); min-width:860px; }
  .lt-bk-title { font-size:11.5px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
  .lt-bk-row { margin:4px 0; }
  .lt-bk-label { font-size:11px; color:var(--ink); font-family:Consolas, "SFMono-Regular", Menlo, monospace; }
  .lt-bk-track { position:relative; height:8px; background:#f1f5f9; border-radius:4px; margin-top:2px; }
  .lt-bk-seg { position:absolute; top:0; height:8px; border-radius:4px; }
  .lt-lower { display:grid; grid-template-columns:minmax(0,3fr) minmax(260px,2fr); gap:20px; margin-top:18px; }
  .lt-lower h3 { margin-top:0; }
  .lt-lower > div > h3 + .lt-legend + h3 { margin-top:16px; }
  .lt-legend { border:1px solid var(--line); border-radius:6px; padding:10px 12px; font-size:12.5px; }
  .lt-legend-item { display:flex; align-items:center; gap:8px; padding:3px 0; }
  .lt-swatch { width:22px; height:12px; border-radius:2px; display:inline-block; }
  .lt-metrics td:first-child { color:var(--muted); }
  @media (max-width: 900px) { .lt-lower { grid-template-columns:1fr; } }
  .per-bk-timestamps strong { color:var(--ink); font-weight:500; }
  .pagination-controls { display:flex; align-items:center; justify-content:flex-end; gap:10px; margin:0 0 10px; font-size:13px; color:var(--muted); }
  .pagination-controls button { background:#ffffff; color:var(--ink); border:1px solid var(--line-strong); border-radius:4px; padding:6px 14px; cursor:pointer; font:inherit; font-weight:600; }
  .pagination-controls button:hover:not(:disabled) { background:var(--head); }
  .pagination-controls button:disabled { color:#9ca3af; cursor:not-allowed; }
  .issue-item { border:1px solid var(--line); border-left:3px solid var(--fail); border-radius:6px; padding:16px 18px; margin-bottom:12px; background:#ffffff; }
  .issue-item.medium { border-left-color:#b45309; }
  .issue-header { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px; }
  .issue-title { font-size:14.5px; font-weight:600; color:var(--ink); }
  .priority-badge { padding:2px 8px; border-radius:4px; font-size:11.5px; font-weight:600; letter-spacing:.03em; text-transform:uppercase; color:var(--fail); background:var(--fail-bg); border:1px solid var(--fail-line); }
  .priority-badge.medium { color:var(--warn); background:var(--warn-bg); border-color:var(--warn-line); }
  .issue-section { margin-top:10px; padding-top:10px; border-top:1px solid var(--line); }
  .issue-section-title { font-size:11.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
  .issue-section-content { font-size:13px; }
  .issue-recommendations { margin:0; padding-left:18px; font-size:13px; }
  .issue-recommendations li { margin:2px 0; }
  .no-issues { padding:14px 16px; border:1px solid var(--pass-line); border-left:3px solid var(--pass); border-radius:6px; background:var(--pass-bg); color:var(--pass); font-weight:500; }
  @media print { .pagination-controls { display:none; } .payment-row { display:table-row !important; } }
</style>
</head>
<body>
<div class="container">
  ${renderReportHeader("Bulk Payments Performance Report", headerFacts)}
  <main>
    ${renderLinearTimelines(executions, environment)}
    <section class="section">
      <h2>Batch Execution Trace</h2>
      ${renderExecutionTraceTable(executions)}
    </section>
    ${renderPerBatchBreakdown(executions)}
    <section class="section">
      <h2>Performance Metrics</h2>
      ${renderPerformanceMetricsTable(executions)}
    </section>
    <section class="section">
      <h2>Payment Validation Summary (FT IDs)</h2>
      <div class="table-scroll"><table class="data-table validation-table"><thead><tr>
        <th class="num">Passed</th><th class="num">Sent</th><th class="num">Failed</th><th class="num">Rejected</th><th class="num">In Progress</th><th class="num">Unvalidated / Missing</th><th class="num">Validated / Expected</th>
      </tr></thead><tbody><tr>
        <td class="num${countTone(paymentBuckets.PASSED.length, "count-pass")}">${countValue(paymentBuckets.PASSED.length)}</td>
        <td class="num${countTone(sentTotal, "count-pass")}">${countValue(sentTotal)}</td>
        <td class="num${countTone(paymentBuckets.FAILED.length, "count-fail")}">${countValue(paymentBuckets.FAILED.length)}</td>
        <td class="num${countTone(paymentBuckets.REJECTED.length, "count-fail")}">${countValue(paymentBuckets.REJECTED.length)}</td>
        <td class="num${countTone(paymentBuckets.IN_PROGRESS.length, "count-warn")}">${countValue(paymentBuckets.IN_PROGRESS.length)}</td>
        <td class="num${countTone(totalShortfall, "count-fail")}">${countValue(totalShortfall)}</td>
        <td class="num">${ftIdValidationCompleted ? `${total} / ${expectedTotal}` : `N/A / ${expectedTotal}`}</td>
      </tr></tbody></table></div>
      ${ftIdValidationCompleted ? "" : `<p class="summary-note">FT-ID validation did not complete. ${expectedTotal} payment(s) were requested; no FT-ID result was collected.</p>`}
    </section>
    <section class="section">
      <h2>All FT IDs / Payment Records</h2>
      ${renderAllPaymentsTable(allPayments, 25)}
    </section>
    <section class="section">
      <h2>Performance Issues</h2>
      ${buildIssuesHtml(buckets, totalShortfall, ftIdValidationCompleted, shortfalls)}
    </section>
  </main>
  <footer class="footer"><span>Bulk Payments Performance Report | ${escapeHtml(environment || "")}</span><span>Generated on ${escapeHtml(generatedAt.toLocaleString())}</span></footer>
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
    env.K6_BATCH_FILE_COLLECTOR_URL = `http://127.0.0.1:${collector.port}/batch-file-capture`;

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