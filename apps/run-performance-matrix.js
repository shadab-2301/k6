'use strict';

/**
 * Runs k6 dual-auth performance tests with bounded concurrency, reads the
 * Batch Execution Trace from each generated HTML report, and writes all
 * results into one Excel workbook.
 *
 * Install once:
 *   npm install exceljs
 *
 * Examples:
 *   node run-performance-matrix.js
 *   node run-performance-matrix.js --concurrency 8
 *   node run-performance-matrix.js --start-from ADHOC:PAYSHAP:1000
 *   node run-performance-matrix.js --only INT:INT:200
 *   node run-performance-matrix.js --output reports/performance/performance-results.xlsx
 *
 * Resume behavior:
 *   If the output workbook already exists, completed rows are loaded and
 *   skipped. Failed rows are retried unless --skip-failed is supplied.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ExcelJS = require('exceljs');

// Project root is one level above /apps regardless of where the runner is launched from.
const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.resolve(ROOT, 'reports', 'performance');

const cli = parseArgs(process.argv.slice(2));
const MAX_PARALLEL = positiveInt(cli.concurrency, 8);
// Keep the live Excel workbook beside this script in apps\performance-results.xlsx.
const OUTPUT_FILE = cli.output
  ? path.resolve(ROOT, cli.output)
  : path.resolve(__dirname, 'performance-results.xlsx');
const START_FROM = cli['start-from'] || null;
const ONLY = cli.only || null;
const SKIP_FAILED = Boolean(cli['skip-failed']);

const STANDARD_COUNTS = [1000, 3000, 5000, 7500, 10000, 15000, 20000];
const INT_COUNTS = [100, 200, 500, 1000, 3000, 5000, 7500, 10000, 15000, 20000];

const TEST_MATRIX = [
  ['TPT', 'EFT', STANDARD_COUNTS],
  ['TPT', 'RTGS', STANDARD_COUNTS],
  ['TPT', 'PAYSHAP', STANDARD_COUNTS],
  ['PRLSD', 'EFT', STANDARD_COUNTS],
  ['PRLSD', 'RTGS', STANDARD_COUNTS],
  ['PRLSD', 'PAYSHAP', STANDARD_COUNTS],
  ['PRLEX', 'EFT', STANDARD_COUNTS],
  ['PRLEX', 'RTGS', STANDARD_COUNTS],
  ['PRLEX', 'PAYSHAP', STANDARD_COUNTS],
  ['ADHOC', 'EFT', STANDARD_COUNTS],
  ['ADHOC', 'RTGS', STANDARD_COUNTS],
  ['ADHOC', 'PAYSHAP', STANDARD_COUNTS],
  ['INT', 'INT', INT_COUNTS]
];

const HEADERS = [
  'Payment Type',
  'RAIL Type',
  'Records',
  'File Validation Time',
  'Initiation API TAT',
  'Approval API TAT',
  'Time From Pending Auth to Sent / Sched',
  'File ID',
  'Status'
];

let workbook;
let worksheet;
let excelWriteChain = Promise.resolve();
let active = 0;
let completed = 0;
let failed = 0;

main().catch((error) => {
  console.error('\n[FATAL]', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});

async function main() {
  ensureDirectory(path.dirname(OUTPUT_FILE));
  ensureDirectory(REPORT_DIR);

  await initialiseWorkbook();

  let queue = expandMatrix(TEST_MATRIX);

  if (START_FROM) {
    const startIndex = queue.findIndex((test) => test.key === normaliseKey(START_FROM));
    if (startIndex < 0) {
      throw new Error(`--start-from value not found in matrix: ${START_FROM}`);
    }
    queue = queue.slice(startIndex);
  }

  if (ONLY) {
    const onlyKey = normaliseKey(ONLY);
    queue = queue.filter((test) => test.key === onlyKey);
    if (queue.length === 0) {
      throw new Error(`--only value not found in matrix: ${ONLY}`);
    }
  }

  const existing = readExistingResultKeys();
  queue = queue.filter((test) => {
    const priorStatus = existing.get(test.key);
    if (!priorStatus) return true;
    if (priorStatus === 'PASS') return false;
    return !SKIP_FAILED;
  });

  if (queue.length === 0) {
    console.log('No tests to run. All selected combinations already exist in the workbook.');
    console.log(`Workbook: ${OUTPUT_FILE}`);
    return;
  }

  console.log('');
  console.log('Performance matrix runner');
  console.log('-------------------------');
  console.log(`Selected tests : ${queue.length}`);
  console.log(`Concurrency    : ${MAX_PARALLEL}`);
  console.log(`Excel output   : ${OUTPUT_FILE}`);
  console.log('');

  // Create all selected rows immediately so progress is visible in Excel.
  await initialiseQueuedRows(queue);

  const sharedQueue = [...queue];
  const workerCount = Math.min(MAX_PARALLEL, sharedQueue.length);
  const workers = Array.from({ length: workerCount }, (_, index) => worker(index + 1, sharedQueue));

  await Promise.all(workers);
  await excelWriteChain;
  await workbook.xlsx.writeFile(OUTPUT_FILE);

  console.log('');
  console.log('Run complete');
  console.log('------------');
  console.log(`Completed : ${completed}`);
  console.log(`Failed    : ${failed}`);
  console.log(`Workbook  : ${OUTPUT_FILE}`);

  if (failed > 0) process.exitCode = 1;
}

async function worker(workerId, queue) {
  while (true) {
    const test = queue.shift();
    if (!test) return;

    active += 1;
    await queueExcelUpdate({
      paymentType: test.paymentType,
      rail: test.rail,
      records: test.payments,
      fileValidationTime: '',
      initiationApiTat: '',
      approvalApiTat: '',
      pendingAuthToFinal: '',
      fileId: '',
      status: 'Running'
    });
    console.log(`[worker ${workerId}] START ${test.key} | active=${active}`);

    let result;
    try {
      result = await runSingleTest(test, workerId);
    } catch (error) {
      if (String(error.message || '').startsWith('PROCESS_START_FAILED:')) {
        throw error;
      }
      result = {
        paymentType: test.paymentType,
        rail: test.rail,
        records: test.payments,
        fileValidationTime: 'n/a',
        initiationApiTat: 'n/a',
        approvalApiTat: 'n/a',
        pendingAuthToFinal: 'n/a',
        fileId: 'n/a',
        status: 'Failed',
        error: error.message
      };
    }

    active -= 1;
    completed += 1;
    if (normaliseStatus(result.status) !== 'PASS') failed += 1;

    await queueExcelUpdate(result);

    const suffix = result.error ? ` | ${result.error}` : '';
    console.log(
      `[worker ${workerId}] END   ${test.key} | status=${result.status} | ` +
      `fileId=${result.fileId} | active=${active}${suffix}`
    );
  }
}

function runSingleTest(test, workerId) {
  return new Promise((resolve, reject) => {
    const args = [
      'run',
      'perf:batch:dual:k6',
      '--',
      '--env', 'UAT',
      '--payment-type', test.paymentType,
      '--rail', test.rail,
      '--payments', String(test.payments),
      '--iterations', '1',
      '--vus', '1',
      '--poll-timeout-ms', '300000',
      '--max-duration', '30s',
      '--future', '180'
    ];

    // Node 24 on Windows rejects direct spawning of npm.cmd with EINVAL.
    // Invoke cmd.exe itself and pass the authored npm command as ONE /c string.
    const quotedArgs = args.map((arg) => cmdQuote(arg)).join(' ');
    const commandLine = `npm ${quotedArgs}`;
    const child = process.platform === 'win32'
      ? spawn(process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe', ['/d', '/s', '/c', commandLine], {
          cwd: ROOT,
          env: {
            ...process.env,
            PERF_MATRIX_RUN_KEY: test.key
          },
          windowsHide: false,
          shell: false
        })
      : spawn('npm', args, {
          cwd: ROOT,
          env: {
            ...process.env,
            PERF_MATRIX_RUN_KEY: test.key
          },
          windowsHide: false,
          shell: false
        });

    let output = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(`[${test.key}] ${text}`);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(`[${test.key}] ${text}`);
    });

    child.on('error', (error) => {
      error.message = `PROCESS_START_FAILED: ${error.message}`;
      reject(error);
    });

    child.on('close', async (exitCode) => {
      try {
        const combinedOutput = `${output}\n${stderr}`;
        const reportPath = await resolveGeneratedReportPath(combinedOutput);

        if (!reportPath) {
          throw new Error(`HTML report path was not found in terminal output; npm exit code=${exitCode}`);
        }

        const html = fs.readFileSync(reportPath, 'utf8');
        const parsed = parseBatchExecutionTrace(html, test);

        if (exitCode !== 0 && normaliseStatus(parsed.status) === 'PASS') {
          parsed.status = 'Failed';
          parsed.error = `npm process exited with code ${exitCode}`;
        } else if (exitCode !== 0) {
          parsed.error = `npm process exited with code ${exitCode}`;
        }

        parsed.reportPath = reportPath;
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function resolveGeneratedReportPath(consoleOutput) {
  const matches = [
    ...consoleOutput.matchAll(/\[k6\]\[report\]\s+HTML report written to\s+(.+?\.html)\s*(?:\r?\n|$)/gi)
  ];

  if (matches.length > 0) {
    const printedPath = stripAnsi(matches[matches.length - 1][1]).trim().replace(/^['"]|['"]$/g, '');
    const resolved = path.isAbsolute(printedPath)
      ? printedPath
      : path.resolve(ROOT, printedPath);

    if (await waitForFile(resolved, 10000)) return resolved;
  }

  // Fallback: newest bulk-payment report modified recently.
  const newest = newestReport(REPORT_DIR, 120000);
  if (newest && await waitForFile(newest, 3000)) return newest;
  return null;
}

function parseBatchExecutionTrace(html, requestedTest) {
  const sectionIndex = html.toLowerCase().indexOf('batch execution trace');
  if (sectionIndex < 0) {
    throw new Error('Batch Execution Trace section not found in HTML report');
  }

  const section = html.slice(sectionIndex);
  const tableMatch = section.match(/<table\b[^>]*>[\s\S]*?<\/table>/i);
  if (!tableMatch) {
    throw new Error('Batch Execution Trace table not found in HTML report');
  }

  const rows = extractHtmlRows(tableMatch[0]);
  if (rows.length < 2) {
    throw new Error('Batch Execution Trace data row not found in HTML report');
  }

  const headerIndex = rows.findIndex((row) => {
    const joined = row.join(' ').toLowerCase();
    return joined.includes('payment type') &&
      joined.includes('rail type') &&
      joined.includes('file validation time') &&
      joined.includes('file id');
  });

  if (headerIndex < 0 || !rows[headerIndex + 1]) {
    throw new Error('Could not identify Batch Execution Trace header/data rows');
  }

  const header = rows[headerIndex].map(normaliseLabel);
  const values = rows[headerIndex + 1];
  const record = {};

  header.forEach((name, index) => {
    record[name] = cleanCell(values[index] || '');
  });

  const tableAndFollowing = section.slice(0, 12000);
  const statusMatch = tableAndFollowing.match(
    /VU\s*\d+\s*\/\s*Iteration\s*\d+[\s\S]{0,800}?\b(PASSED|PASS|FAILED|FAIL)\b/i
  ) || tableAndFollowing.match(/\bOverall Status\s*:?[\s\S]{0,120}?\b(PASSED|PASS|FAILED|FAIL)\b/i);

  const parsed = {
    paymentType: valueByAliases(record, ['payment type']) || requestedTest.paymentType,
    rail: valueByAliases(record, ['rail type']) || requestedTest.rail,
    records: numberOrFallback(valueByAliases(record, ['records']), requestedTest.payments),
    fileValidationTime: valueByAliases(record, ['file validation time']) || 'n/a',
    initiationApiTat: valueByAliases(record, ['initiation api tat']) || 'n/a',
    approvalApiTat: valueByAliases(record, ['approval api tat']) || 'n/a',
    pendingAuthToFinal: valueByAliases(record, [
      'time from pending auth to sent / sched',
      'time from pending auth to sent/sched'
    ]) || 'n/a',
    fileId: valueByAliases(record, ['file id']) || 'n/a',
    status: statusMatch ? displayStatus(statusMatch[1]) : 'Failed'
  };

  validateParsedResult(parsed, requestedTest);
  return parsed;
}

function extractHtmlRows(tableHtml) {
  const rows = [];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const cells = [];
    const cellRegex = /<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(cleanCell(cellMatch[1]));
    }

    if (cells.length > 0) rows.push(cells);
  }

  return rows;
}

function cleanCell(value) {
  return decodeHtmlEntities(
    String(value)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function decodeHtmlEntities(value) {
  const named = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'"
  };

  return value
    .replace(/&(nbsp|amp|lt|gt|quot|apos);|&#39;/gi, (match) => named[match.toLowerCase()] || match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .trim();
}

function validateParsedResult(result, requestedTest) {
  if (String(result.paymentType).toUpperCase() !== requestedTest.paymentType) {
    throw new Error(`Report payment type mismatch: expected ${requestedTest.paymentType}, found ${result.paymentType}`);
  }
  if (String(result.rail).toUpperCase() !== requestedTest.rail) {
    throw new Error(`Report rail mismatch: expected ${requestedTest.rail}, found ${result.rail}`);
  }
  if (Number(result.records) !== requestedTest.payments) {
    throw new Error(`Report record count mismatch: expected ${requestedTest.payments}, found ${result.records}`);
  }
}

async function initialiseWorkbook() {
  workbook = new ExcelJS.Workbook();

  if (fs.existsSync(OUTPUT_FILE)) {
    await workbook.xlsx.readFile(OUTPUT_FILE);
    worksheet = workbook.getWorksheet('Performance Results') || workbook.worksheets[0];
  } else {
    worksheet = workbook.addWorksheet('Performance Results', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    worksheet.columns = [
      { header: HEADERS[0], key: 'paymentType', width: 16 },
      { header: HEADERS[1], key: 'rail', width: 14 },
      { header: HEADERS[2], key: 'records', width: 12 },
      { header: HEADERS[3], key: 'fileValidationTime', width: 23 },
      { header: HEADERS[4], key: 'initiationApiTat', width: 20 },
      { header: HEADERS[5], key: 'approvalApiTat', width: 19 },
      { header: HEADERS[6], key: 'pendingAuthToFinal', width: 39 },
      { header: HEADERS[7], key: 'fileId', width: 24 },
      { header: HEADERS[8], key: 'status', width: 13 }
    ];

    styleWorksheet();
    await workbook.xlsx.writeFile(OUTPUT_FILE);
  }

  ensureExpectedHeaders();
}

function ensureExpectedHeaders() {
  const current = worksheet.getRow(1).values.slice(1, 10).map((v) => String(v || '').trim());
  if (current.join('|') !== HEADERS.join('|')) {
    throw new Error(
      `Workbook header mismatch in ${OUTPUT_FILE}. Expected: ${HEADERS.join(' | ')}`
    );
  }
}

function styleWorksheet() {
  worksheet.autoFilter = { from: 'A1', to: 'I1' };
  worksheet.getRow(1).height = 30;
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorders();
  });
}

async function initialiseQueuedRows(queue) {
  queue.forEach((test) => {
    upsertResultRow({
      paymentType: test.paymentType,
      rail: test.rail,
      records: test.payments,
      fileValidationTime: '',
      initiationApiTat: '',
      approvalApiTat: '',
      pendingAuthToFinal: '',
      fileId: '',
      status: 'Queued'
    });
  });
  await workbook.xlsx.writeFile(OUTPUT_FILE);
}

function queueExcelUpdate(result) {
  excelWriteChain = excelWriteChain.then(async () => {
    upsertResultRow(result);
    await workbook.xlsx.writeFile(OUTPUT_FILE);
  });
  return excelWriteChain;
}

function upsertResultRow(result) {
  const key = createKey(result.paymentType, result.rail, result.records);
  let targetRow = null;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || targetRow) return;
    const rowKey = createKey(row.getCell(1).value, row.getCell(2).value, row.getCell(3).value);
    if (rowKey === key) targetRow = row;
  });

  const values = [
    result.paymentType,
    result.rail,
    Number(result.records),
    result.fileValidationTime,
    result.initiationApiTat,
    result.approvalApiTat,
    result.pendingAuthToFinal,
    result.fileId,
    displayStatus(result.status)
  ];

  if (!targetRow) targetRow = worksheet.addRow(values);
  else values.forEach((value, index) => { targetRow.getCell(index + 1).value = value; });

  targetRow.height = 22;
  targetRow.eachCell((cell, columnNumber) => {
    cell.alignment = {
      vertical: 'middle',
      horizontal: columnNumber === 8 ? 'left' : 'center',
      wrapText: false
    };
    cell.border = thinBorders();
  });

  const statusCell = targetRow.getCell(9);
  const status = String(result.status || '').trim().toUpperCase();
  const statusStyle = status === 'PASS' || status === 'PASSED'
    ? { font: 'FF006100', fill: 'FFC6EFCE' }
    : status === 'RUNNING'
      ? { font: 'FF9C6500', fill: 'FFFFEB9C' }
      : status === 'QUEUED'
        ? { font: 'FF1F4E78', fill: 'FFD9EAF7' }
        : { font: 'FF9C0006', fill: 'FFFFC7CE' };
  statusCell.font = { bold: true, color: { argb: statusStyle.font } };
  statusCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: statusStyle.fill }
  };

  sortDataRows();
}

function sortDataRows() {
  if (worksheet.rowCount <= 2) return;

  const paymentOrder = new Map(['TPT', 'PRLSD', 'PRLEX', 'ADHOC', 'INT'].map((v, i) => [v, i]));
  const railOrder = new Map(['EFT', 'RTGS', 'PAYSHAP', 'INT'].map((v, i) => [v, i]));
  const data = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    data.push(worksheet.getRow(rowNumber).values.slice(1, 10));
  }

  data.sort((a, b) =>
    (paymentOrder.get(String(a[0]).toUpperCase()) ?? 99) - (paymentOrder.get(String(b[0]).toUpperCase()) ?? 99) ||
    (railOrder.get(String(a[1]).toUpperCase()) ?? 99) - (railOrder.get(String(b[1]).toUpperCase()) ?? 99) ||
    Number(a[2]) - Number(b[2])
  );

  data.forEach((values, index) => {
    values.forEach((value, col) => {
      worksheet.getRow(index + 2).getCell(col + 1).value = value;
    });
  });
}

function readExistingResultKeys() {
  const map = new Map();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const paymentType = String(row.getCell(1).value || '').trim();
    const rail = String(row.getCell(2).value || '').trim();
    const records = Number(row.getCell(3).value);
    const status = normaliseStatus(row.getCell(9).value);

    if (paymentType && rail && Number.isFinite(records)) {
      map.set(createKey(paymentType, rail, records), status);
    }
  });

  return map;
}

function expandMatrix(matrix) {
  return matrix.flatMap(([paymentType, rail, counts]) =>
    counts.map((payments) => ({
      paymentType,
      rail,
      payments,
      key: createKey(paymentType, rail, payments)
    }))
  );
}

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i += 1) {
    const item = args[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) result[key] = true;
    else {
      result[key] = next;
      i += 1;
    }
  }
  return result;
}

function valueByAliases(record, aliases) {
  for (const alias of aliases) {
    const value = record[normaliseLabel(alias)];
    if (value !== undefined && value !== '') return value;
  }
  return '';
}

function normaliseLabel(value) {
  return String(value)
    .toLowerCase()
    .replace(/\u2192/g, 'to')
    .replace(/\s+/g, ' ')
    .trim();
}

function createKey(paymentType, rail, records) {
  return `${String(paymentType).trim().toUpperCase()}:${String(rail).trim().toUpperCase()}:${Number(records)}`;
}

function normaliseKey(value) {
  const parts = String(value).split(':');
  if (parts.length !== 3) return String(value).toUpperCase();
  return createKey(parts[0], parts[1], parts[2]);
}

function normaliseStatus(value) {
  const text = String(value || '').trim().toUpperCase();
  return text === 'PASS' || text === 'PASSED' ? 'PASS' : 'FAILED';
}

function displayStatus(value) {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'PASS' || text === 'PASSED') return 'Pass';
  if (text === 'RUNNING') return 'Running';
  if (text === 'QUEUED') return 'Queued';
  return 'Failed';
}

function numberOrFallback(value, fallback) {
  const number = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : fallback;
}

function newestReport(directory, maxAgeMs) {
  if (!fs.existsSync(directory)) return null;
  const now = Date.now();
  const candidates = fs.readdirSync(directory)
    .filter((name) => /^bulk-payments-report-.*\.html$/i.test(name))
    .map((name) => {
      const fullPath = path.join(directory, name);
      return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
    })
    .filter((item) => now - item.mtimeMs <= maxAgeMs)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0] ? candidates[0].fullPath : null;
}

async function waitForFile(filePath, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) return true;
    await sleep(150);
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function stripAnsi(value) {
  return String(value).replace(/\u001b\[[0-9;]*m/g, '');
}

function cmdQuote(value) {
  const text = String(value);
  // All runner-generated arguments are controlled constants / matrix values.
  // Quote only when CMD parsing requires it.
  if (!/[\s&|<>^()]/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function thinBorders() {
  const border = { style: 'thin', color: { argb: 'FFB7B7B7' } };
  return { top: border, left: border, bottom: border, right: border };
}
