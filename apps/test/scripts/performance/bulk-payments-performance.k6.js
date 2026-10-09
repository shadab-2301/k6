import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { md5 } from "k6/crypto";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";

const ADO_TOKEN_CLIENT = JSON.parse(open("../../../../ApiRegistry/adoTokenClient.json"));
const PLATFORM_ENV = parseEnvFile(open("../../../../.env.platform"));

const TST_INT_DATA = JSON.parse(
    open("../../../../Test Data/TST/payments/batch payments/internal-transfer-batch-payment-test-data.json")
);
const STG_INT_DATA = JSON.parse(
    open("../../../../Test Data/STG/payments/batch payments/internal-transfer-batch-payment-test-data.json")
);
const TST_TPT_DATA = JSON.parse(
    open("../../../../Test Data/TST/payments/batch payments/domestic-batch-payment-test-data.json")
);
const TST_TPT_INVALID_DATA = JSON.parse(
    open("../../../../Test Data/TST/payments/batch payments/domestic-batch-payment-invalid-test-data.json")
);
const STG_TPT_DATA = JSON.parse(
    open("../../../../Test Data/STG/payments/batch payments/domestic-batch-payment-test-data.json")
);
const TST_PRLSD_DATA = JSON.parse(
    open("../../../../Test Data/TST/payments/batch payments/payroll-batch-payment-test-data.json")
);
const UAT_INT_DATA = JSON.parse(
    open("../../../../Test Data/UAT/payments/batch payments/internal-transfer-batch-payment-test-data.json")
);
const UAT_INT_BATCH_FILE = open(
    "../../../../Test Data/UAT/payments/batch payments/internal-transfer-batch-payment-v2.csv",
    "b"
);
const isDualAuth = String(__ENV.K6_AUTH_MODE || "").toUpperCase() === "DUAL_AUTH";
const authLabel = isDualAuth ? "DUAL AUTH" : "SINGLE AUTH";
const UAT_BATCH_DATA = isDualAuth ? {
    INT: parseOptionalJson(open("../../../../Test Data/UAT/payments/batch payments/INT_BatchDualAuth.json")),
    TPT: parseOptionalJson(open("../../../../Test Data/UAT/payments/batch payments/TPT_BatchDualAuth.json")),
    PRLSD: parseOptionalJson(open("../../../../Test Data/UAT/payments/batch payments/PRLSD_BatchDualAuth.json")),
    PRLEX: parseOptionalJson(open("../../../../Test Data/UAT/payments/batch payments/PRLEX_BatchDualAuth.json")),
    IAB: parseOptionalJson(open("../../../../Test Data/UAT/payments/batch payments/IAB_BatchDualAuth.json")),
    ADHOC: parseOptionalJson(open("../../../../Test Data/UAT/payments/batch payments/ADHOC_BatchDualAuth.json")),
} : {
    INT: parseOptionalJson(open("../../../../Test Data/UAT/payments/batch payments/INT_BatchSingleAuth.json")),
    TPT: parseOptionalJson(open("../../../../Test Data/UAT/payments/batch payments/TPT_BatchSingleAuth.json")),
    ADHOC: parseOptionalJson(open("../../../../Test Data/UAT/payments/batch payments/ADHOC_BatchSingleAuth.json")),

    PRLSD: parseOptionalJson(open("../../../../Test Data/UAT/payments/batch payments/PRLSD_BatchSingleAuth.json")),
    PRLEX: parseOptionalJson(open("../../../../Test Data/UAT/payments/batch payments/PRLEX_BatchSingleAuth.json")),
    IAB: parseOptionalJson(open("../../../../Test Data/UAT/payments/batch payments/IAB_BatchSingleAuth.json")),
};

const uploadDuration = new Trend("batch_upload_duration", true);
const uploadToPendinitDuration = new Trend("batch_upload_to_pendinit_duration", true);
const pendinitDuration = new Trend("batch_pendinit_duration", true);
const initiationDuration = new Trend("batch_initiation_duration", true);
const sentDuration = new Trend("batch_sent_duration", true);
const flowFailureRate = new Rate("batch_flow_failure_rate");
const authenticateDuration = new Trend("batch_authenticate_duration", true);
const otpDuration = new Trend("batch_otp_duration", true);
const sasDuration = new Trend("batch_sas_url_duration", true);
const initialOtpDuration = new Trend("batch_initial_otp_duration", true);
const challengeOtpDuration = new Trend("batch_challenge_otp_duration", true);
const totalFlowDuration = new Trend("batch_total_flow_duration", true);

const externalBatchFile = __ENV.K6_BATCH_FILE_PATH ? open(__ENV.K6_BATCH_FILE_PATH, "b") : null;
const externalTestDataFile = __ENV.K6_TEST_DATA_FILE ? open(__ENV.K6_TEST_DATA_FILE) : null;

function envNumber(keys, fallback) {
    for (const key of keys) {
        const raw = __ENV[key];
        if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
            const parsed = Number(raw);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }
    return fallback;
}

function envText(keys) {
    for (const key of keys) {
        const raw = __ENV[key];
        if (raw !== undefined && raw !== null) {
            const text = String(raw).trim();
            if (text) {
                return text;
            }
        }
    }
    return "";
}

function envFileText(keys) {
    for (const key of keys) {
        const value = PLATFORM_ENV[key];
        if (value !== undefined && value !== null) {
            const text = String(value).trim();
            if (text) {
                return text;
            }
        }
    }
    return "";
}

function parseEnvFile(text) {
    const values = {};
    String(text || "")
        .split(/\r?\n/)
        .forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) {
                return;
            }

            const index = trimmed.indexOf("=");
            if (index === -1) {
                return;
            }

            const key = trimmed.slice(0, index).trim();
            let value = trimmed.slice(index + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            values[key] = value;
        });
    return values;
}

function envBool(keys, fallback) {
    const text = envText(keys).toLowerCase();
    if (!text) return fallback;
    return text === "true" || text === "1" || text === "yes";
}

const vus = envNumber(["PERF_VUS"], 10);
const iterations = envNumber(["PERF_ITERATIONS"], 10);
const requestedNumPayments = envNumber(["K6_NUM_PAYMENTS", "NUM_PAYMENTS"], 5000);
const mixBatchSpec = envText(["K6_MIX_BATCH"]);
const isMixBatch = Boolean(mixBatchSpec);
const mixEntries = isMixBatch ? parseMixBatchSpec(mixBatchSpec, requestedNumPayments) : [];
const mixRails = [...new Set(mixEntries.map((entry) => entry.rail))];
const configuredNumPayments = isMixBatch ? mixEntries.reduce((sum, entry) => sum + entry.count, 0) : requestedNumPayments;
const configuredAmountMin = envNumber(["K6_AMOUNT_MIN", "AMOUNT_MIN"], 10);
const configuredAmountMax = envNumber(["K6_AMOUNT_MAX", "AMOUNT_MAX"], 100);
const strictLoadConfig = envBool(["K6_REQUIRE_EXPLICIT_LOAD_CONFIG"], false);
const singleBulkFile = envBool(["K6_SINGLE_BULK_FILE"], false);
const configuredPaymentType = isMixBatch ? "MIX" : sanitizeFileToken(envText(["K6_PAYMENT_TYPE"]) || "INT", "INT").toUpperCase();
const explicitRail = envText(["K6_RAIL"]);
const requestedRail = sanitizeFileToken(envText(["K6_RAIL"]) || configuredPaymentType, configuredPaymentType).toUpperCase();
const tptRailThreshold = 5000000;
const configuredRail = isMixBatch
    ? mixRails.join("+")
    : configuredPaymentType === "TPT" && !explicitRail
        ? configuredAmountMax <= tptRailThreshold
            ? "EFT"
            : "RTGS"
        : requestedRail;

// Mixed batch spec: comma-separated TYPE/RAIL[:COUNT] entries, e.g. "TPT/EFT:5,TPT/PAYSHAP:5,ADHOC/RTGS".
// COUNT defaults to --payments. INT entries always use the INT rail.
function parseMixBatchSpec(spec, defaultCount) {
    const entries = String(spec).split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
        const match = /^([A-Za-z]+)\s*[/:-]\s*([A-Za-z]+)(?:\s*:\s*(\d+))?$/.exec(part);
        if (!match) {
            throw new Error(`[k6][preflight] Invalid --mix entry "${part}". Use TYPE/RAIL or TYPE/RAIL:COUNT, e.g. TPT/EFT:5`);
        }
        const paymentType = match[1].toUpperCase();
        const rail = paymentType === "INT" ? "INT" : match[2].toUpperCase();
        const count = match[3] === undefined ? Number(defaultCount) : Number(match[3]);
        return { paymentType, rail, count, key: `${paymentType}/${rail}` };
    });
    if (entries.length < 2) {
        throw new Error("[k6][preflight] --mix needs at least two TYPE/RAIL entries, e.g. TPT/EFT:5,TPT/PAYSHAP:5");
    }
    const duplicate = entries.find((entry, index) => entries.findIndex((other) => other.key === entry.key) !== index);
    if (duplicate) {
        throw new Error(`[k6][preflight] --mix lists ${duplicate.key} more than once; combine the counts into one entry.`);
    }
    return entries;
}
const testDataVariant = envText(["K6_TEST_DATA"]).toUpperCase() || "VALID";
const pollingIntervalMs = envNumber(["K6_POLLING_INTERVAL_MS", "K6_POLL_INTERVAL_MS"], 2000);
const maxDurationMs = envNumber(["K6_MAX_DURATION_MS", "K6_POLL_TIMEOUT_MS"], 120000);
// 0 = wait for PENDINIT with no time limit (set by --fileValid <seconds> in the runner).
const fileValidationTimeoutMs = envNumber(["K6_FILE_VALIDATION_TIMEOUT_MS"], 0);
const scenarioMaxDuration = envText(["K6_MAX_DURATION"]) || `${Math.ceil((maxDurationMs * 2 + 30000) / 1000)}s`;

export const options = {
    scenarios: {
        bulk_batch_flow: {
            executor: "per-vu-iterations",
            vus,
            iterations,
            maxDuration: scenarioMaxDuration,
        },
    },
    thresholds: {
        batch_flow_failure_rate: ["rate<0.05"],
    },
};

function metricValues(data, metricName) {
    const values = data?.metrics?.[metricName]?.values;
    return values && typeof values === "object" ? values : {};
}

function buildSummary(data) {
    const startedAt = new Date(Date.now() - Number(data?.state?.testRunDurationMs || 0));
    const endedAt = new Date();

    return {
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMs: Number(data?.state?.testRunDurationMs || 0),
        env: {
            selectedEnv,
            vus,
            iterations,
            numPayments: configuredNumPayments,
            paymentType: configuredPaymentType,
            railType: configuredRail,
            mix: isMixBatch ? mixEntries.map((entry) => `${entry.key}:${entry.count}`).join(", ") : "",
            singleBulkFile,
        },
        metrics: {
            uploadDuration: metricValues(data, "batch_upload_duration"),
            uploadToPendinitDuration: metricValues(data, "batch_upload_to_pendinit_duration"),
            pendinitDuration: metricValues(data, "batch_pendinit_duration"),
            initiationDuration: metricValues(data, "batch_initiation_duration"),
            sentDuration: metricValues(data, "batch_sent_duration"),
            flowFailureRate: metricValues(data, "batch_flow_failure_rate"),
            checks: metricValues(data, "checks"),
            httpReqDuration: metricValues(data, "http_req_duration"),
        },
        thresholds: data?.metrics
            ? Object.entries(data.metrics)
                .filter(([, metric]) => metric?.thresholds && typeof metric.thresholds === "object")
                .map(([name, metric]) => ({
                    metric: name,
                    thresholds: metric.thresholds,
                }))
            : [],
    };
}

export function handleSummary(data) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const summary = buildSummary(data);
    const outFile = `reports/performance/bulk-payments-k6-summary-${ts}.json`;

    return {
        stdout: textSummary(data, { indent: " ", enableColors: true }),
        [outFile]: JSON.stringify(summary, null, 2),
    };
}

function validatePreflight() {
    const missing = [];
    const paymentProfile = getPaymentProfile();
    if (!environmentConfig.authBaseUrl) missing.push(`${selectedEnv}_AUTH_URL`);
    if (!environmentConfig.batchBaseUrl) missing.push(`${selectedEnv}_CAPI_URL`);
    if (!environmentConfig.paymentsBaseUrl) missing.push(`${selectedEnv}_BAPI_URL`);
    const identityPrefix = isDualAuth ? "dualAuth" : "singleAuth";
    const identityEnvPrefix = isDualAuth ? "DUAL_AUTH" : "SINGLE_AUTH";
    if (!environmentConfig[`${identityPrefix}IniLoginginId`]) missing.push(`${selectedEnv}_${identityEnvPrefix}_INI_LOGINGIN_ID`);
    if (!environmentConfig.password) missing.push(`${selectedEnv}_LOGIN_PASSWORD`);
    if (!environmentConfig[`${identityPrefix}Company`]) missing.push(`${selectedEnv}_${identityEnvPrefix}_COMPANY`);
    if (!environmentConfig[`${identityPrefix}IniUsername`]) missing.push(`${selectedEnv}_${identityEnvPrefix}_INI_USERNAME`);
    if (!environmentConfig[`${identityPrefix}IniGCN`]) missing.push(`${selectedEnv}_${identityEnvPrefix}_INI_GCN`);
    if (isDualAuth) {
        if (!environmentConfig.dualAuthAppUsername) missing.push(`${selectedEnv}_DUAL_AUTH_APP_USERNAME`);
        if (!environmentConfig.dualAuthAppGCN) missing.push(`${selectedEnv}_DUAL_AUTH_APP_GCN`);
    }
    if (!environmentConfig.initialOtp) missing.push(`${selectedEnv}_OTP`);
    const mixProblems = [];
    if (isMixBatch) {
        if (selectedEnv !== "UAT") mixProblems.push("--mix is only supported with --env UAT (it builds the CSV from the UAT *_Batch*Auth.json test data)");
        if (externalBatchFile) mixProblems.push("--mix cannot be combined with --batch-file");
        for (const entry of mixEntries) {
            if (!getPaymentProfile(entry.paymentType, entry.rail)) mixProblems.push(`Unsupported payment type and rail combination in --mix: ${entry.key}`);
            if (!Number.isSafeInteger(entry.count) || entry.count <= 0) mixProblems.push(`--mix payment count for ${entry.key} must be a whole number > 0`);
            if (!UAT_BATCH_DATA[entry.paymentType]) mixProblems.push(`Missing or empty ${entry.paymentType}_Batch${isDualAuth ? "Dual" : "Single"}Auth.json for --mix entry ${entry.key}`);
        }
        missing.push(...mixProblems);
    }
    if (mixProblems.length === 0 && !getEnvironmentBatchFile()) missing.push(`${selectedEnv} batch CSV for ${configuredPaymentType}/${configuredRail}`);

    if (strictLoadConfig) {
        if (!envText(["PERF_VUS"])) missing.push("PERF_VUS");
        if (!envText(["PERF_ITERATIONS"])) missing.push("PERF_ITERATIONS");
        if (!envText(["K6_NUM_PAYMENTS", "NUM_PAYMENTS"])) missing.push("K6_NUM_PAYMENTS (or NUM_PAYMENTS)");
        if (!envText(["K6_AMOUNT_MIN", "AMOUNT_MIN"])) missing.push("K6_AMOUNT_MIN (or AMOUNT_MIN)");
        if (!envText(["K6_AMOUNT_MAX", "AMOUNT_MAX"])) missing.push("K6_AMOUNT_MAX (or AMOUNT_MAX)");
    }

    if (configuredNumPayments <= 0) {
        missing.push("K6_NUM_PAYMENTS must be > 0");
    }

    if (configuredAmountMin <= 0 || configuredAmountMax <= 0 || configuredAmountMin > configuredAmountMax) {
        missing.push("K6_AMOUNT_MIN and K6_AMOUNT_MAX must be > 0 and min <= max");
    }

    if (configuredPaymentType === "TPT" && !explicitRail && configuredAmountMin <= tptRailThreshold && configuredAmountMax > tptRailThreshold) {
        missing.push("TPT amount range cannot cross R5,000,000 because a batch file supports one rail; run EFT and RTGS ranges separately");
    }

    if (!paymentProfile && !isMixBatch) {
missing.push(
    `Unsupported payment type and rail combination: ${configuredPaymentType}/${configuredRail}. ` +
    `Supported combinations are INT/INT, ` +
    `TPT/EFT, TPT/RTGS, TPT/PAYSHAP, ` +
    `ADHOC/EFT, ADHOC/RTGS, ADHOC/PAYSHAP, ` +
    `PRLSD/EFT, PRLSD/RTGS, PRLSD/PAYSHAP, ` +
    `PRLEX/EFT, PRLEX/RTGS, PRLEX/PAYSHAP, ` +
    `IAB/EFT, IAB/RTGS, and IAB/PAYSHAP`
);
    }

    if (paymentProfile && !paymentProfile.csvOnly && !RAIL_LOCAL_INSTRUMENTS[paymentProfile.rail]) {
        missing.push(`No local instrument is configured for rail ${paymentProfile.rail} (${configuredPaymentType}/${configuredRail})`);
    }

    if (!explicitRail && paymentProfile?.minimumAmount && configuredAmountMin < paymentProfile.minimumAmount) {
        missing.push(`K6_AMOUNT_MIN must be at least ${paymentProfile.minimumAmount} for ${configuredPaymentType}/${configuredRail}`);
    }

    if (iterations <= 0) {
        missing.push("PERF_ITERATIONS must be > 0 for per-vu-iterations executor");
    }

    if (missing.length > 0) {
        throw new Error(
            `[k6][preflight] Invalid or missing configuration:\n- ${missing.join("\n- ")}\n` +
            `Set K6_REQUIRE_EXPLICIT_LOAD_CONFIG=true to enforce explicit load vars every run.`
        );
    }
}

function getAdoConfigValue(key) {
    return String(__ENV[key] || ADO_TOKEN_CLIENT[key] || "").trim();
}

function getAppBearerTokenFromEnv() {
    const token = String(__ENV.K6_APP_TOKEN || "").trim();
    return token || "";
}

function getEnvData(paymentType = configuredPaymentType, rail = configuredRail) {
    if (selectedEnv === "UAT") {
        if (isDualAuth && !externalTestDataFile && !__ENV.K6_TEST_DATA_JSON && !UAT_BATCH_DATA[paymentType]) {
            throw new Error(`Missing or empty ${paymentType}_BatchDualAuth.json; Single Auth data cannot be used for Dual Auth.`);
        }
        if (!externalTestDataFile && !__ENV.K6_TEST_DATA_JSON && UAT_BATCH_DATA[paymentType]) {
            // File-level settings (channel, singleDebit) still come from the base UAT data.
            return { ...UAT_INT_DATA, ...UAT_BATCH_DATA[paymentType] };
        }
        if (paymentType === "INT" && rail === "INT" && !externalTestDataFile && !__ENV.K6_TEST_DATA_JSON) {
            return UAT_INT_DATA;
        }
        try {
            return JSON.parse(String(externalTestDataFile || __ENV.K6_TEST_DATA_JSON || ""));
        } catch {
            throw new Error("UAT test data is missing or invalid JSON; refusing to use SIT data.");
        }
    }
    if (paymentType === "PRLSD") {
        if (selectedEnv !== "SIT") throw new Error("PRLSD test data is not configured for UAT.");
        return TST_PRLSD_DATA;
    }

    if (paymentType === "TPT") {
        if (testDataVariant === "INVALID" && selectedEnv === "SIT") {
            return TST_TPT_INVALID_DATA;
        }
        return selectedEnv === "UAT" ? STG_TPT_DATA : TST_TPT_DATA;
    }

    return selectedEnv === "UAT" ? UAT_INT_DATA : TST_INT_DATA;
}

function getEnvironmentBatchFile() {
    if (isMixBatch) return buildMixedBatchCsv();
    if (externalBatchFile) return externalBatchFile;
    if (isDualAuth || configuredRail === "PAYSHAP" || externalTestDataFile || __ENV.K6_TEST_DATA_JSON) {
        return buildUatBatchCsv(getEnvData(), configuredNumPayments);
    }
    if (selectedEnv === "UAT" && UAT_BATCH_DATA[configuredPaymentType]) {
        return buildUatBatchCsv(UAT_BATCH_DATA[configuredPaymentType], configuredNumPayments);
    }
    if (selectedEnv === "UAT" && configuredPaymentType === "INT" && configuredRail === "INT") return UAT_INT_BATCH_FILE;
    return null;
}

function parseOptionalJson(text) {
    const trimmed = String(text || "").trim();
    return trimmed ? JSON.parse(trimmed) : null;
}

function csvField(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvPaymentDate() {
    const [year, month, day] = String(__ENV.K6_PAYMENT_DATE || new Date().toISOString().slice(0, 10)).split("-");
    return `${day}/${month}/${year}`;
}

function buildUatBatchRows(data, numPayments, paymentType = configuredPaymentType, rail = configuredRail, referenceOffset = 0) {
const isInternal = paymentType === "INT";
const isIab = paymentType === "IAB";

const counterparties = isInternal
    ? (data.toAccounts || []).map((accountNumber) => ({
        accountNumber,
        branchCode: data.beneficiaryId,
        name: ""
    }))
    : isIab
        ? (data.beneficiaries || []).map((b) => ({
            accountNumber: b.beneficiaryId,
            branchCode: "",
            name: b.beneficiaryName || "",
            myReference: b.myReference || ""
        }))
        : (data.beneficiaries || []).map((b) => ({
            accountNumber: b.accountNumber,
            branchCode: b.branchCode,
            name: b.myReference || b.beneficiaryName || ""
        }));
const invalidCounterparty = paymentType === "IAB"
    ? counterparties.some((c) => !c.accountNumber)
    : counterparties.some((c) => !c.accountNumber || !c.branchCode);

if (!data.fromAccount || counterparties.length === 0 || invalidCounterparty) {
    throw new Error(
        `[k6][FAIL][file_generation] ${paymentType}_${isDualAuth ? "BatchDualAuth" : "BatchSingleAuth"}.json needs fromAccount and ` +
        (isInternal
            ? "beneficiaryId plus at least one toAccounts entry."
            : paymentType === "IAB"
                ? "at least one beneficiary with beneficiaryId."
                : "at least one beneficiary with accountNumber and branchCode.")
    );
}

    const prefix = data.csv?.referencePrefix || paymentType;
    const endToEndPrefix = data.csv?.endToEndReferencePrefix || "E2E";
    const referenceStart = Number(data.csv?.referenceStart ?? 1) + referenceOffset;
    if (!Number.isSafeInteger(referenceStart) || referenceStart < 1 || !Number.isSafeInteger(referenceStart + numPayments - 1)) {
        throw new Error("[k6][FAIL][file_generation] csv.referenceStart must be a positive safe integer with room for all payment references.");
    }
    const railColumn = isInternal ? data.paymentMethod || "INTERNAL" : rail;
    const paymentDate = csvPaymentDate();
    const hasDefaultAmount = data.defaultAmount !== undefined && data.defaultAmount !== null && data.defaultAmount !== "";
    const rows = [];
    let totalCents = 0;
    for (let i = 0; i < numPayments; i++) {
        // Round-robin never repeats an account consecutively when more than one is configured.
        const counterparty = counterparties[i % counterparties.length];
        const amount = hasDefaultAmount ? Number(data.defaultAmount) : randomAmount(configuredAmountMin, configuredAmountMax);
        totalCents += Math.round(amount * 100);
        const fields = [
            "2", data.fromAccount, "", "", counterparty.name, counterparty.accountNumber, counterparty.branchCode,
            data.currency || "ZAR", amount.toFixed(2), railColumn, paymentDate,
            `${prefix}-${referenceStart + i}`, `${endToEndPrefix}-${referenceStart + i}-${prefix}`, data.csv?.flag || "N", "",
        ];
        if (isInternal) fields.push("");
        rows.push(fields.map(csvField).join(","));
    }
    return { rows, totalCents };
}

function assembleBatchCsv(detailRows, paymentCount, totalCents) {
    const rows = ["1,2,,,,,,,,,,,,,", ...detailRows, `99,${paymentCount},${(totalCents / 100).toFixed(2)},0,,,,,,,,,,,`];
    return `${rows.join("\r\n")}\r\n`;
}

function buildUatBatchCsv(data, numPayments) {
    const { rows, totalCents } = buildUatBatchRows(data, numPayments);
    return assembleBatchCsv(rows, numPayments, totalCents);
}

// One CSV holding every --mix entry's rows. References continue across entries that
// share a reference prefix so every payment reference in the file stays unique.
function buildMixedBatchCsv() {
    const detailRows = [];
    const usedByPrefix = {};
    let totalCents = 0;
    for (const entry of mixEntries) {
        const data = getEnvData(entry.paymentType, entry.rail);
        const prefix = data.csv?.referencePrefix || entry.paymentType;
        const offset = usedByPrefix[prefix] || 0;
        const built = buildUatBatchRows(data, entry.count, entry.paymentType, entry.rail, offset);
        usedByPrefix[prefix] = offset + entry.count;
        detailRows.push(...built.rows);
        totalCents += built.totalCents;
    }
    return assembleBatchCsv(detailRows, configuredNumPayments, totalCents);
}

function getPaymentProfile(paymentType = configuredPaymentType, rail = configuredRail) {
    const profiles = {
        "ADHOC/PAYSHAP": {
            paymentType: "ADHOC",
            rail: "PAYSHAP",
            source: "beneficiary",
            csvOnly: true,
            minimumAmount: 0,
        },
        "TPT/PAYSHAP": {
            paymentType: "TPT",
            rail: "PAYSHAP",
            source: "beneficiary",
            csvOnly: true,
            minimumAmount: 0,
        },
        "PRLSD/PAYSHAP": {
            paymentType: "PRLSD",
            rail: "PAYSHAP",
            source: "payroll",
            csvOnly: true,
            minimumAmount: 0,
        },
        "INT/INT": {
            paymentType: "INT",
            rail: "INT",
            source: "internal-transfer",
            creditAccountScheme: "ACCT",
            includeCreditorAgent: true,
            minimumAmount: 0,
        },
        "TPT/EFT": {
            paymentType: "TPT",
            rail: "EFT",
            source: "beneficiary",
            creditAccountScheme: "BENEID",
            includeCreditorAgent: true,
            minimumAmount: 0,
        },
        "TPT/RTGS": {
            paymentType: "TPT",
            rail: "RTGS",
            csvOnly: true,
            source: "beneficiary",
            creditAccountScheme: "BENEID",
            includeCreditorAgent: true,
            minimumAmount: 5000000.01,
        },
        "ADHOC/EFT": {
            paymentType: "ADHOC",
            rail: "EFT",
            source: "beneficiary",
            creditAccountScheme: "ACCT",
            includeCreditorAgent: true,
            minimumAmount: 0,
        },
        "ADHOC/RTGS": {
            paymentType: "ADHOC",
            rail: "RTGS",
            csvOnly: true,
            source: "beneficiary",
            creditAccountScheme: "ACCT",
            includeCreditorAgent: true,
            minimumAmount: 5000000.01,
        },
        "PRLSD/RTGS": {
            paymentType: "PRLSD",
            rail: "RTGS",
            csvOnly: true,
            source: "payroll",
            creditAccountScheme: "ACCT",
            includeCreditorAgent: true,
            minimumAmount: 5000000.01,
        },
        "PRLSD/EFT": {
            paymentType: "PRLSD",
            rail: "EFT",
            source: "payroll",
            creditAccountScheme: "ACCT",
            includeCreditorAgent: true,
            minimumAmount: 0,
        },
                "IAB/EFT": {
            paymentType: "IAB",
            rail: "EFT",
            source: "beneficiary",
            csvOnly: true,
            minimumAmount: 0,
        },
        "IAB/RTGS": {
            paymentType: "IAB",
            rail: "RTGS",
            source: "beneficiary",
            csvOnly: true,
            minimumAmount: 0,
        },
        "IAB/PAYSHAP": {
            paymentType: "IAB",
            rail: "PAYSHAP",
            source: "beneficiary",
            csvOnly: true,
            minimumAmount: 0,
        },
                "PRLEX/EFT": {
            paymentType: "PRLEX",
            rail: "EFT",
            source: "payroll",
            csvOnly: true,
            minimumAmount: 0,
        },
        "PRLEX/RTGS": {
            paymentType: "PRLEX",
            rail: "RTGS",
            source: "payroll",
            csvOnly: true,
            minimumAmount: 0,
        },
        "PRLEX/PAYSHAP": {
            paymentType: "PRLEX",
            rail: "PAYSHAP",
            source: "payroll",
            csvOnly: true,
            minimumAmount: 0,
        },
    };

    return profiles[`${paymentType}/${rail}`] || null;
}

const RAIL_LOCAL_INSTRUMENTS = {
    INT: "BKTR",
    EFT: "NURG",
    RTGS: "URGP",
};

function localInstructionForRail(rail) {
    const railKey = String(rail || "").trim().toUpperCase();
    const localInstrument = RAIL_LOCAL_INSTRUMENTS[railKey];
    if (!localInstrument) {
        throw new Error(`[k6][FAIL][file_generation] No local instrument is configured for rail=${railKey || "<missing>"} (${configuredPaymentType}/${configuredRail}); SAS URL was not requested.`);
    }
    return localInstrument;
}

function parseBool(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    return String(value).toLowerCase() === "true";
}

function makeRequestId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    const bytes = [];
    for (let i = 0; i < 16; i++) {
        bytes.push(Math.floor(Math.random() * 256));
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function makeIdempotencyKey() {
    // API requires idempotency-key length between 0 and 35, so hyphens are stripped from the UUID.
    const key = makeRequestId().replace(/-/g, "");
    if (!/^[0-9a-f]{32}$/i.test(key) || key.length > 35) {
        throw new Error("Generated idempotency key is not a valid UUID of 35 characters or fewer.");
    }
    return key;
}

function makeUniqueBatchFileName() {
    const timestamp = String(Date.now());
    const vu = String(__VU || 0);
    const iteration = String(__ITER || 0);
    const random = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    return `BulkPaymentV2${timestamp}${vu}${iteration}${random}`;
}

function randomAmount(min, max) {
    const minCents = Math.ceil(Number(min) * 100);
    const maxCents = Math.floor(Number(max) * 100);
    if (!Number.isFinite(minCents) || !Number.isFinite(maxCents) || minCents > maxCents) {
        throw new Error(`[k6][FAIL][file_generation] Invalid amount range min=${min} max=${max}`);
    }
    return (minCents + Math.floor(Math.random() * (maxCents - minCents + 1))) / 100;
}

function xmlEscape(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function nowIsoNoMs() {
    return new Date().toISOString().slice(0, 19);
}

function timestampForFileName(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function sanitizeBatchName(input, fallback = "Batch") {
    const candidate = String(input || fallback)
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, 35);

    return candidate || fallback;
}

function safeBodySnippet(body) {
    const text = typeof body === "string" ? body : String(body || "");
    return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

function safeSasErrorSnippet(body) {
    return safeBodySnippet(body)
        .replace(/(password|token|secret|authorization|cookie|sas|sig|signature)\s*[:=]\s*[^,}\s]+/gi, "$1=<redacted>")
        .replace(/https?:\/\/[^\s"']+/gi, "<url-redacted>");
}

function sanitizeFileToken(value, fallback) {
    const normalized = String(value || fallback || "").trim().replace(/[^A-Za-z0-9]+/g, "");
    return normalized || fallback;
}

function normalizeDateOnly(dateText) {
    const text = String(dateText || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return text;
    }

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }

    const yyyy = String(parsed.getFullYear());
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function expectedInitiateStatus(paymentDate) {
    const authMode = String(envText(["K6_AUTH_MODE", "K6_APPROVAL_MODE", "K6_PAYMENT_TYPE_NAME"]) || "SingleAuth").trim().toUpperCase();
    if (authMode !== "SINGLEAUTH" && authMode !== "SINGLE_AUTH") {
        return "";
    }

    return expectedFinalChildStatus(paymentDate);
}

function canonicalInitiateStatus(statusCode) {
    const normalized = String(statusCode || "").trim().toUpperCase();
    if (!normalized) return "";

    const aliases = {
        SCHED: "SCHEDULED",
        SCHEDULED: "SCHEDULED",
        IN_PROGRESS: "INPROGRESS",
        INPROGRESS: "INPROGRESS",
    };

    return aliases[normalized] || normalized;
}

/**
 * Extracts the BK-prefixed batch reference (BKREF) from a get-file-batches row.
 * This is a distinct field from transactionId (used to initiate) - the same
 * naming pattern as records' own transactionId/refId (FT-prefixed) pair.
 */
function extractBkRefId(row) {
    const candidates = [row?.bkReference, row?.refId, row?.bkRefId, row?.bkRef, row?.batchReference, row?.reference];

    for (const candidate of candidates) {
        const value = String(candidate || "").trim();
        if (value && value.toUpperCase().startsWith("BK")) {
            return value;
        }
    }

    for (const candidate of candidates) {
        const value = String(candidate || "").trim();
        if (value) return value;
    }

    return "";
}

/**
 * Classifies a batch payment record status code into one of the tracked
 * outcome buckets: PASSED, FAILED, REJECTED, IN_PROGRESS, UNKNOWN.
 */
function classifyRecordStatus(statusCode) {
    const normalized = String(statusCode || "").trim().toUpperCase();
    if (!normalized) return "UNKNOWN";

    const passedStatuses = ["SENT", "PROCESSED", "SUCCESS", "COMPLETED", "COMPLETE"];
    const failedStatuses = ["FAILED", "FAIL", "ERROR", "TIMEOUT", "EXPIRED"];
    const rejectedStatuses = ["REJECTED", "REJECT", "RJCT", "DECLINED", "CANCELLED", "CANCELED"];
    const inProgressStatuses = [
        "PENDINIT",
        "VAL_IN_PROG",
        "INITIATING",
        "INPROGRESS",
        "IN_PROGRESS",
        "PENDING",
        "SUBMITTED",
        "QUEUED",
        "NEW",
        "PROCESSING",
    ];

    if (passedStatuses.includes(normalized)) return "PASSED";
    if (failedStatuses.includes(normalized)) return "FAILED";
    if (rejectedStatuses.includes(normalized)) return "REJECTED";
    if (inProgressStatuses.includes(normalized)) return "IN_PROGRESS";
    return "PASSED";
}

/**
 * Pages through GET /batch-payments/:BKREF/records until all pages are
 * retrieved, returning the combined record list and the last page's meta.
 */
// Per-iteration map of BKREF / transactionId -> { paymentType, railType } for mixed batches, so each
// record can be labelled with the batch it belongs to. Empty for single type/rail runs.
let recordBatchLabels = {};

function batchRowPaymentType(row) {
    const value = row?.paymentType;
    if (value && typeof value === "object") return String(value.code || value.description || "");
    return String(value || "");
}

function firstCount(...values) {
    const found = values.find((value) => value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value)));
    return found === undefined ? null : Number(found);
}

function batchRowRecordCount(row) {
    return firstCount(row?.numberOfPayments, row?.noOfPayments, row?.batchNoOfPayments, row?.batchDetails?.batchNoOfPayments, row?.numberOfRecords, row?.recordCount);
}

// Per-transaction timing for MIX runs: one entry per get file batches row, keyed by transactionId,
// with BKREF -> transactionId taken from the same row. Reset each iteration after get file batches.
let perBatchTracking = null;

function startPerBatchTracking(batchRows, expectedFinalStatus, pendingStartedAt) {
    const byTransactionId = {};
    const transactionIdByBkref = {};
    for (const row of batchRows) {
        const transactionId = String(row?.transactionId || "");
        if (!transactionId) continue;
        const bkRef = extractBkRefId(row);
        byTransactionId[transactionId] = {
            transactionId,
            bkRef,
            batchName: String(row?.batchName || row?.name || ""),
            paymentType: batchRowPaymentType(row),
            rail: String(row?.rail?.code || "").toUpperCase(),
            recordCount: batchRowRecordCount(row),
            initiationStartedAt: "",
            initiationFinishedAt: "",
            initiationApiMs: null,
            initiationStatus: "",
            pendingApprovalObservedAt: "",
            approvalStartedAt: "",
            approvalFinishedAt: "",
            approvalApiMs: null,
            approvalHttpStatus: null,
            finalStatus: "",
            finalStatusObservedAt: "",
            pendingToFinalMs: null,
        };
        if (bkRef) transactionIdByBkref[bkRef] = transactionId;
    }
    perBatchTracking = { expectedFinalStatus, pendingStartedAt, byTransactionId, transactionIdByBkref };
    return Object.values(byTransactionId);
}

function perBatchEntry(transactionIdOrBkref) {
    if (!perBatchTracking) return null;
    const key = String(transactionIdOrBkref || "");
    return perBatchTracking.byTransactionId[key] || perBatchTracking.byTransactionId[perBatchTracking.transactionIdByBkref[key]] || null;
}

// Called after each BKREF's records are fetched. The first poll where every record of that BKREF is at
// the expected final status (and the batch's record count is reached, when known) sets its observed time.
function updatePerBatchFinalStatus(bkref, records) {
    const entry = perBatchEntry(bkref);
    if (!entry || entry.finalStatusObservedAt) return;
    const statuses = records.map((record) => canonicalInitiateStatus(record?.status?.code)).filter(Boolean);
    entry.finalStatus = uniqueStatusText(statuses, "NO_RECORDS");
    const countReached = entry.recordCount ? records.length >= entry.recordCount : records.length > 0;
    if (!countReached || statuses.length !== records.length || !statuses.every((status) => status === perBatchTracking.expectedFinalStatus)) return;
    entry.finalStatusObservedAt = new Date().toISOString();
    const pendingStart = isDualAuth ? entry.pendingApprovalObservedAt || entry.initiationFinishedAt : perBatchTracking.pendingStartedAt;
    entry.pendingToFinalMs = pendingStart ? Date.parse(entry.finalStatusObservedAt) - Date.parse(pendingStart) : null;
}

function fetchBatchRecords(baseUrl, authHeaders, bkref, pageSize, jar) {
    const size = Math.max(1, Math.min(100, Number(pageSize) || 50));
    const records = [];
    const requests = [];
    let page = 1;
    let totalPages = 1;
    let lastMeta = null;

    do {
        const url = `${baseUrl}/payments-manager/api/v1/batch-payments/${bkref}/records?page=${page}&size=${size}`;
        requests.push({ bkref, page, size, url });
        const res = http.get(url, {
            jar,
            headers: authHeaders,
            timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
            tags: { stage: "get_records" },
        });

        if (res.status !== 200) {
            logHttpFailure("get_records", {
                status: res.status,
                timings: res.timings,
                url,
                body: res.body,
                txId: bkref,
            });
            break;
        }

        const payload = res.json() || {};
        const rows = Array.isArray(payload.data) ? payload.data : [];
        const label = recordBatchLabels[bkref];
        records.push(...(label ? rows.map((row) => ({ ...row, __batchPaymentType: label.paymentType, __batchRail: label.railType })) : rows));
        lastMeta = payload.meta || null;
        totalPages = Number(lastMeta?.totalPages || 1);

        if (rows.length === 0 && page === 1) {
            console.warn(
                `[k6][RECORDS][DIAGNOSTIC] bkref=${bkref} url=${url} httpStatus=${res.status} meta=${JSON.stringify(lastMeta)} bodySnippet=${safeBodySnippet(res.body) || "<empty>"}`
            );
        }

        page += 1;
    } while (page <= totalPages);

    return { records, meta: lastMeta, requests };
}

/**
 * Fetches records for every parent/batch transaction ID (BKREF) returned by
 * get file batches, merging the pages from each into one record list.
 */
export function fetchBatchRecordsForBkrefs(baseUrl, authHeaders, bkrefs, pageSize, jar) {
    const records = [];
    const requests = [];
    let lastMeta = null;

    for (const bkref of bkrefs) {
        const result = fetchBatchRecords(baseUrl, authHeaders, bkref, pageSize, jar);
        updatePerBatchFinalStatus(bkref, result.records);
        records.push(...result.records);
        requests.push(...result.requests);
        lastMeta = result.meta || lastMeta;
    }

    return { records, meta: lastMeta, requests };
}

/**
 * Buckets fetched batch records by outcome. Validation against the expected
 * payment count happens separately because /batches only returns the batch
 * container's transactionId (used to initiate), not the per-payment IDs that
 * show up in /records - those two ID spaces never match by design.
 */
function expectedFinalChildStatus(paymentDate) {
    const paymentDateOnly = normalizeDateOnly(paymentDate);
    const todayDateOnly = normalizeDateOnly(new Date().toISOString().slice(0, 10));
    return paymentDateOnly && todayDateOnly && paymentDateOnly > todayDateOnly ? "SCHEDULED" : "SENT";
}

function classifyAgainstExpectedStatus(statusCode, expectedFinalStatus) {
    const bucket = classifyRecordStatus(statusCode);
    if (!expectedFinalStatus || bucket === "FAILED" || bucket === "REJECTED" || bucket === "UNKNOWN") return bucket;
    return canonicalInitiateStatus(statusCode) === expectedFinalStatus ? "PASSED" : "IN_PROGRESS";
}

function validateBatchRecords(records, expectedCount, expectedFinalStatus = "") {
    const buckets = { PASSED: [], FAILED: [], REJECTED: [], IN_PROGRESS: [], UNKNOWN: [] };

    for (const record of records) {
        const transactionId = String(record?.transactionId || "");
        const ftId = String(record?.refId || "");
        const statusCode = String(record?.status?.code || "");
        const statusDescription = String(record?.status?.description || "");
        const bucket = classifyAgainstExpectedStatus(statusCode, expectedFinalStatus);

        buckets[bucket].push({
            transactionId,
            ftId,
            statusCode,
            statusDescription,
            amount: record?.amount,
            toAccountReference: record?.toAccountReference || "",
            fromAccountReference: record?.fromAccountReference || "",
            ...(record?.__batchRail ? { paymentType: record.__batchPaymentType || "MIX", railType: record.__batchRail } : {}),
        });
    }

    const shortfall = Math.max(0, Number(expectedCount || 0) - records.length);
    const sentCount = records.filter((record) => String(record?.status?.code || "").trim().toUpperCase() === "SENT").length;

    return { buckets, shortfall, totalValidated: records.length, sentCount };
}

function paymentsFromValidation(validation) {
    return Object.entries(validation.buckets).flatMap(([resultGroup, payments]) =>
        payments.map((payment) => ({ ...payment, resultGroup }))
    );
}

function logChildPaymentCounts(fileId, expectedCount, validation, context) {
    console.log(
        `[k6][RECORDS] context=${context} fileId=${fileId} expected=${expectedCount} totalValidated=${validation.totalValidated} ` +
        `passed=${validation.buckets.PASSED.length} sent=${validation.sentCount} failed=${validation.buckets.FAILED.length} ` +
        `rejected=${validation.buckets.REJECTED.length} inProgress=${validation.buckets.IN_PROGRESS.length} ` +
        `unknown=${validation.buckets.UNKNOWN.length} missing=${validation.shortfall}`
    );
}

/**
 * One-shot fetch of every child payment in the batch with its actual backend status,
 * sent to the report collector. Used when the flow stops before the expected final
 * status so the report still shows what each payment actually reached.
 */
function captureActualChildPayments({ ctx, execution, intBatch, fileId, transactionIds, bkRefIds, context }) {
    const bkrefs = bkRefIds.length > 0 ? bkRefIds : transactionIds;
    const expectedTotal = Number(intBatch.numPayments || 0);
    if (bkrefs.length === 0) return null;
    try {
        const { records, meta, requests } = fetchBatchRecordsForBkrefs(ctx.baseUrl, ctx.authHeaders, bkrefs, 100, ctx.jar);
        const validation = validateBatchRecords(records, expectedTotal, expectedFinalChildStatus(intBatch.paymentDate));
        execution.payments = paymentsFromValidation(validation);
        execution.requestDetails.ftIds = requests;
        execution.statuses.sent = validationStatusText(validation);
        logChildPaymentCounts(fileId, expectedTotal, validation, context);
        emitRecordsCapture({
            fileId,
            paymentType: intBatch.paymentType,
            railType: intBatch.railType,
            parentTransactionIds: transactionIds,
            bkRefIds,
            meta,
            expectedTotal,
            shortfall: validation.shortfall,
            sentCount: validation.sentCount,
            buckets: validation.buckets,
        });
        emitExecutionSnapshot(execution);
        return validation;
    } catch (error) {
        console.warn(`[k6][RECORDS][WARN] context=${context} fileId=${fileId} could not capture child payments: ${String(error?.message || error)}`);
        return null;
    }
}

/**
 * Posts the FT ID validation results to the local Node collector (started by
 * scripts/run-performance-k6.js) so they can be aggregated into the HTML report.
 */
function emitRecordsCapture(payload) {
    const collectorUrl = envText(["K6_RECORDS_COLLECTOR_URL"]);
    if (!collectorUrl) {
        return;
    }

    const response = http.post(collectorUrl, JSON.stringify(payload), {
        headers: { "Content-Type": "application/json" },
        timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
        tags: { stage: "records_capture" },
    });

    if (response.status >= 300) {
        console.error(
            `[k6][WARN][records-capture] status=${response.status} url=${collectorUrl} body=${safeBodySnippet(response.body) || "<empty>"}`
        );
    }
}

function emitExecutionCapture(execution) {
    const collectorUrl = envText(["K6_EXECUTION_COLLECTOR_URL"]);
    if (!collectorUrl) return;

    const response = http.post(collectorUrl, JSON.stringify(execution), {
        headers: { "Content-Type": "application/json" },
        timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
        tags: { stage: "execution_capture" },
    });

    if (response.status >= 300) {
        console.error(`[k6][WARN][execution-capture] status=${response.status} body=${safeBodySnippet(response.body) || "<empty>"}`);
    }
}

function emitBatchFileCapture(fileName, body) {
    const collectorUrl = envText(["K6_BATCH_FILE_COLLECTOR_URL"]);
    if (!collectorUrl) return;

    let content = typeof body === "string" ? body : "";
    if (typeof body !== "string") {
        const bytes = new Uint8Array(body);
        for (let i = 0; i < bytes.length; i += 8192) content += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const response = http.post(collectorUrl, JSON.stringify({ env: selectedEnv, paymentType: configuredPaymentType, rail: configuredRail, fileName, content }), {
        headers: { "Content-Type": "application/json" },
        timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
        tags: { stage: "batch_file_capture" },
    });

    if (response.status >= 300) {
        console.error(`[k6][WARN][batch-file-capture] status=${response.status} body=${safeBodySnippet(response.body) || "<empty>"}`);
    }
}

function emitExecutionSnapshot(execution) {
    emitExecutionCapture({
        ...execution,
        timings: { ...execution.timings },
        timestamps: { ...execution.timestamps },
        statuses: { ...execution.statuses },
        timeouts: { ...execution.timeouts },
        requestDetails: {
            ...execution.requestDetails,
            ftIds: [...execution.requestDetails.ftIds],
        },
        parentTransactionIds: [...execution.parentTransactionIds],
        bkRefIds: [...execution.bkRefIds],
        payments: [...execution.payments],
        perBatch: (execution.perBatch || []).map((entry) => ({ ...entry })),
        failure: execution.failure ? { ...execution.failure } : null,
    });
}

function uniqueStatusText(values, fallback) {
    const statuses = [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
    return statuses.length > 0 ? statuses.join(",") : fallback;
}

function validationStatusText(validation) {
    const records = [
        ...validation.buckets.PASSED,
        ...validation.buckets.FAILED,
        ...validation.buckets.REJECTED,
        ...validation.buckets.IN_PROGRESS,
        ...validation.buckets.UNKNOWN,
    ];
    return uniqueStatusText(records.map((record) => record.statusCode), validation.shortfall > 0 ? "RECORDS_MISSING" : "UNKNOWN");
}

function setExecutionFailure(execution, failure) {
    execution.status = "FAILED";
    execution.failure = {
        stage: failure.stage,
        expectedStatus: failure.expectedStatus || "",
        lastStatus: failure.lastStatus || "",
        httpStatus: failure.httpStatus ?? "",
        apiError: failure.apiError || "",
        timeoutMs: failure.timeoutMs ?? "",
        elapsedMs: failure.elapsedMs ?? "",
        overrunMs: failure.overrunMs ?? "",
        message: failure.message || "",
    };
}

/**
 * Repeatedly fetches batch records until every expected payment has a record
 * and each record has moved out of an in-progress status, or until the polling
 * timeout is reached.
 */
function fetchAndValidateBatchRecordsWithRetry(baseUrl, authHeaders, bkrefs, expectedCount, pageSize, timeoutMs, intervalMs, jar, expectedFinalStatus = "") {
    const startedAt = Date.now();
    let attempt = 0;
    let timedOut = false;
    let lastRecords = [];
    let lastMeta = null;
    let lastRequests = [];
    let lastValidation = { buckets: { PASSED: [], FAILED: [], REJECTED: [], IN_PROGRESS: [], UNKNOWN: [] }, shortfall: expectedCount, totalValidated: 0, sentCount: 0 };

    while (attempt === 0 || Date.now() - startedAt < timeoutMs) {
        attempt += 1;
        const { records, meta, requests } = fetchBatchRecordsForBkrefs(baseUrl, authHeaders, bkrefs, pageSize, jar);
        lastRecords = records;
        lastMeta = meta;
        lastRequests = requests;
        lastValidation = validateBatchRecords(records, expectedCount, expectedFinalStatus);

        if (lastValidation.shortfall === 0 && lastValidation.buckets.IN_PROGRESS.length === 0) {
            break;
        }

        const elapsedMs = Date.now() - startedAt;
        if (elapsedMs >= timeoutMs) {
            timedOut = true;
            console.error(
                `[k6][SENT][TIMEOUT] bkrefs=${bkrefs.join(",")} expected=${expectedCount} actual=${lastValidation.totalValidated} ` +
                `inProgress=${lastValidation.buckets.IN_PROGRESS.length} elapsedMs=${elapsedMs} maxDurationMs=${timeoutMs}`
            );
            break;
        }

        const remainingMs = timeoutMs - elapsedMs;
        sleep(Math.max(0.2, Math.min(intervalMs, remainingMs) / 1000));
    }

    const elapsedMs = Date.now() - startedAt;
    return {
        records: lastRecords,
        meta: lastMeta,
        validation: lastValidation,
        attempts: attempt,
        elapsedMs,
        timedOut,
        requests: lastRequests,
    };
}

function logHttpFailure(stage, context) {
    const status = context?.status ?? "n/a";
    const durationMs = context?.timings?.duration ?? 0;
    const url = context?.url || "n/a";
    const txId = context?.txId || "n/a";
    const body = safeBodySnippet(context?.body || "");

    console.error(
        `[k6][FAIL][${stage}] status=${status} durationMs=${Number(durationMs).toFixed(0)} url=${url} txId=${txId} body=${body || "<empty>"}`
    );
}

function logFileValidationFailure(baseUrl, authHeaders, fileId, fileStatus, fileRecord, jar) {
    const detailUrl = `${baseUrl}/payments-manager/api/v1/files/${fileId}`;
    const detailResponse = http.get(detailUrl, {
        jar,
        headers: authHeaders,
        timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
        tags: { stage: "get_file_detail_on_failure" },
    });
    const detail = safeBodySnippet(detailResponse.body);
    const record = safeBodySnippet(JSON.stringify(fileRecord || {}));

    console.error(
        `[k6][FAIL][file-validation] fileId=${fileId} status=${fileStatus} detailStatus=${detailResponse.status} ` +
        `listRecord=${record || "<empty>"} detail=${detail || "<empty>"}`
    );
}

function isPendingBatchStatus(statusCode) {
    const normalized = String(statusCode || "").trim().toUpperCase();
    if (!normalized) return true;

    return [
        "PENDINIT",
        "VAL_IN_PROG",
        "INITIATING",
        "INPROGRESS",
        "PENDING",
        "SUBMITTED",
        "QUEUED",
        "NEW",
    ].includes(normalized);
}

function extractStatusCodeFromPayload(payload) {
    if (!payload) return "";

    if (typeof payload === "string") {
        try {
            const parsed = JSON.parse(payload);
            return extractStatusCodeFromPayload(parsed);
        } catch {
            const match = payload.match(/"status"\s*:\s*"?([A-Z_]+)"?/i);
            if (match && match[1]) return match[1];
            return "";
        }
    }

    const candidates = [
        payload?.data?.status?.code,
        payload?.data?.status,
        payload?.status?.code,
        payload?.status,
        payload?.data?.result?.status?.code,
        payload?.data?.result?.status,
        payload?.result?.status?.code,
        payload?.result?.status,
    ];

    for (const item of candidates) {
        const value = String(item || "").trim();
        if (value) return value;
    }

    return "";
}

function pollBatchInitiationCompletion(baseUrl, authHeaders, fileId, timeoutMs, intervalMs, jar) {
    const startedAt = Date.now();
    let lastStatus = "UNKNOWN";
    let completed = false;
    let finalStatus = "UNKNOWN";
    let finalResponseBody = "";

    while (Date.now() - startedAt <= timeoutMs) {
        const res = http.get(
            `${baseUrl}/payments-manager/api/v1/files/${fileId}`,
            {
                jar,
                headers: authHeaders,
                timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
                tags: { stage: "poll_file_status" },
            }
        );

        const payload = res.json() || {};
        const detail = payload?.data || payload;
        const statusCode = String(detail?.status?.code || detail?.status || "").trim();
        lastStatus = statusCode || lastStatus;
        finalStatus = statusCode || finalStatus;
        finalResponseBody = safeBodySnippet(JSON.stringify(payload));

        if (res.status === 200 && statusCode && !isPendingBatchStatus(statusCode)) {
            completed = true;
            break;
        }

        if (res.status !== 200) {
            console.error(
                `[k6][POLL][status] fileId=${fileId} status=${statusCode || "n/a"} httpStatus=${res.status} elapsedMs=${Date.now() - startedAt} body=${safeBodySnippet(res.body) || "<empty>"}`
            );
        } else if (statusCode) {
            console.info(
                `[k6][POLL][waiting] fileId=${fileId} status=${statusCode} elapsedMs=${Date.now() - startedAt} timeoutMs=${timeoutMs}`
            );
        }

        sleep(Math.max(0.2, intervalMs / 1000));
    }

    return {
        completed,
        elapsedMs: Date.now() - startedAt,
        lastStatus,
        finalStatus,
        responseBody: finalResponseBody,
    };
}

function nextWorkingDate(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    while (d.getDay() === 0 || d.getDay() === 6) {
        d.setDate(d.getDate() + 1);
    }
    return d.toISOString().slice(0, 10);
}

function buildPaymentTransactions(n, data, amountMin, amountMax, paymentProfile) {
    const txs = [];
    const seedTransactions = Array.isArray(data?.transactions) ? data.transactions : [];
    const creditAccounts = paymentProfile.source === "internal-transfer"
        ? data?.internalTransfer?.creditAccounts || []
        : seedTransactions.map((transaction) => transaction.creditAccountNumber || transaction.creditAccountId).filter(Boolean);
    for (let i = 0; i < n; i++) {
        const amount = randomAmount(amountMin, amountMax);
        const idSeed = `${Date.now()}-${__VU}-${__ITER}-${i + 1}`;
        const sourceTransaction = seedTransactions[i % Math.max(1, seedTransactions.length)] || {};
        const creditorMemberId = paymentProfile.includeCreditorAgent
            ? String(
                sourceTransaction.branchCode ||
                (paymentProfile.source === "internal-transfer"
                    ? data?.internalTransfer?.creditMemberId || "250655"
                    : TPT_BRANCH_CODES[i % TPT_BRANCH_CODES.length])
            )
            : "";
        txs.push({
            kind: paymentProfile.paymentType,
            creditAccountId: String(creditAccounts[i % Math.max(1, creditAccounts.length)] || "101355"),
            creditAccountScheme: sourceTransaction.creditAccountScheme || paymentProfile.creditAccountScheme,
            creditorMemberId,
            amount,
            remittanceInfo: `${paymentProfile.paymentType} ${paymentProfile.rail} performance payment ${i + 1}`,
            endToEndId: `E2E-${paymentProfile.paymentType}-${paymentProfile.rail}-${idSeed}`,
            notify: i % 2 === 0 ? "Y" : "N",
            email: i % 2 === 0 ? "test@example.com" : "",
        });
    }

    return txs;
}

function buildPmtInf(tx, index, settings) {
    const amount = Number(tx.amount).toFixed(2);
    const creditorAgent = tx.creditorMemberId
        ? `<CdtrAgt><FinInstnId><ClrSysMmbId><MmbId>${xmlEscape(tx.creditorMemberId)}</MmbId></ClrSysMmbId></FinInstnId></CdtrAgt>`
        : "";

    return `
    <PmtInf>
      <PmtInfId>Pmt-${settings.runId}-${index + 1}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${amount}</CtrlSum>
    <PmtTpInf><InstrPrty>NORM</InstrPrty><LclInstrm><Prtry>${xmlEscape(settings.localInstrument)}</Prtry></LclInstrm></PmtTpInf>
      <ReqdExctnDt><Dt>${settings.paymentDate}</Dt></ReqdExctnDt>
      <DbtrAcct><Id><Othr><Id>${xmlEscape(settings.debitAccount)}</Id></Othr></Id><Ccy>${xmlEscape(settings.currency)}</Ccy></DbtrAcct>
      <CdtTrfTxInf>
        <PmtId>
          <InstrId>INS-${settings.runId}-${index + 1}</InstrId>
          <EndToEndId>${xmlEscape(tx.endToEndId)}</EndToEndId>
        </PmtId>
        <Amt><InstdAmt Ccy="${xmlEscape(settings.currency)}">${amount}</InstdAmt></Amt>
        <CdtrAcct>
          <Id>
            <Othr>
              <Id>${xmlEscape(tx.creditAccountId)}</Id>
              <SchmeNm><Prtry>${xmlEscape(tx.creditAccountScheme)}</Prtry></SchmeNm>
            </Othr>
          </Id>
        </CdtrAcct>
        ${creditorAgent}
        <RmtInf><Ustrd>${xmlEscape(tx.remittanceInfo)}</Ustrd></RmtInf>
        <SplmtryData><PlcAndNm>BeneficiaryNotification</PlcAndNm><Envlp><Ntfy>${xmlEscape(tx.notify)}</Ntfy><Email>${xmlEscape(tx.email)}</Email></Envlp></SplmtryData>
      </CdtTrfTxInf>
    </PmtInf>`;
}

function buildPaymentBatchXml(data, numPayments) {
    if (isMixBatch) {
        return {
            fileDisplayName: makeUniqueBatchFileName(),
            channel: String(data.channel || "WEB"),
            railType: configuredRail,
            paymentType: configuredPaymentType,
            mixEntries,
            paymentDate: String(__ENV.K6_PAYMENT_DATE || new Date().toISOString().slice(0, 10)),
            singleDebit: parseBool(data.singleDebit, false),
            numPayments,
        };
    }

    const paymentProfile = getPaymentProfile();
    if (!paymentProfile) {
        throw new Error(`Unsupported payment type and rail combination: ${configuredPaymentType}/${configuredRail}`);
    }

    if (paymentProfile.csvOnly) {
        return {
            fileDisplayName: makeUniqueBatchFileName(),
            channel: String(data.channel || "WEB"),
            railType: configuredRail,
            paymentType: configuredPaymentType,
            paymentDate: String(__ENV.K6_PAYMENT_DATE || new Date().toISOString().slice(0, 10)),
            singleDebit: parseBool(data.singleDebit, false),
            numPayments,
        };
    }

    const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const currency = String(data?.currency || "ZAR");
    const channel = String(data?.channel || "WEB");
    const companyId = String(data?.companyId || "1805");
    const userId = String(data?.userId || "8865");
    const debitAccount = String(data?.internalTransfer?.debitAccount || data?.debitAccount || "1300307803580");
    const localInstrument = localInstructionForRail(paymentProfile.rail);
    const singleDebit = parseBool(data?.singleDebit, false) ? "true" : "false";
    const allowDuplicate = parseBool(data?.allowDuplicate, true) ? "true" : "false";
    const amountMin = configuredAmountMin;
    const amountMax = configuredAmountMax;

    const transactions = buildPaymentTransactions(numPayments, data, amountMin, amountMax, paymentProfile);
    const ctrlSum = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0).toFixed(2);
    const paymentDate = String(__ENV.K6_PAYMENT_DATE || new Date().toISOString().slice(0, 10));
    const generatedAt = new Date();
    const generatedTimestamp = timestampForFileName(generatedAt);
    const creationDateTime = nowIsoNoMs();
    const fileDisplayName = `Batch Perf ${paymentProfile.paymentType} ${paymentProfile.rail} ${generatedAt.toISOString().slice(0, 10)}_${runId}`;
    const paymentType = configuredPaymentType;
    const railType = configuredRail;

    const txBlocks = transactions.map((tx, idx) =>
        buildPmtInf(tx, idx, {
            runId,
            localInstrument,
            paymentDate,
            debitAccount,
            currency,
        })
    );

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>K6-${runId}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${transactions.length}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <InitgPty>
        <Id>
          <OrgId>
            <Othr><Id>${companyId}</Id><SchmeNm><Prtry>COMPANYID</Prtry></SchmeNm></Othr>
            <Othr><Id>${userId}</Id><SchmeNm><Prtry>USERID</Prtry></SchmeNm></Othr>
            <Othr><Id>${channel}</Id><SchmeNm><Prtry>CHANNEL</Prtry></SchmeNm></Othr>
          </OrgId>
        </Id>
      </InitgPty>
      <SplmtryData>
        <PlcAndNm>FileMetadata</PlcAndNm>
        <Envlp>
          <FileType>CSV</FileType>
          <TemplateVersion>${paymentProfile.paymentType === "INT" ? "Investec_csv1" : "Investec_csv2"}</TemplateVersion>
          <TemplateType>Investec</TemplateType>
          <FileName>${xmlEscape(fileDisplayName)}</FileName>
          <FileDesc>Automated batch payment test</FileDesc>
          <OrigFileName>batch_test_${runId}.csv</OrigFileName>
          <SingleDebit>${singleDebit}</SingleDebit>
          <Encrypted>false</Encrypted>
          <AutoInitiate>false</AutoInitiate>
          <HashCode>k6-placeholder</HashCode>
          <FileSizeBytes>0</FileSizeBytes>
          <AllowDuplicate>${allowDuplicate}</AllowDuplicate>
          <InsufficientFundsCheck>false</InsufficientFundsCheck>
        </Envlp>
      </SplmtryData>
    </GrpHdr>
    ${txBlocks.join("\n")}
  </CstmrCdtTrfInitn>
</Document>`;

    const hashCode = md5(xml, "base64");
    const fileSizeBytes = String(xml.length);
    const finalXml = xml
        .replace("k6-placeholder", hashCode)
        .replace("<FileSizeBytes>0</FileSizeBytes>", `<FileSizeBytes>${fileSizeBytes}</FileSizeBytes>`);

    return {
        xml: finalXml,
        fileDisplayName,
        channel,
        rail: localInstrument,
        railType,
        paymentType,
        generatedTimestamp,
        paymentDate,
        singleDebit: singleDebit === "true",
        numPayments: transactions.length,
    };
}

function buildInitiateRequestBody(batch, fileId, transactionId) {
    const common = {
        requestId: makeRequestId(),
        channel: batch.channel,
        paymentDate: batch.paymentDate,
        fileId,
        transactionId,
        batchName: sanitizeBatchName(batch.fileDisplayName, "Batch"),
        singleDebit: batch.singleDebit,
    };

    if (batch.paymentType === "MIX") {
        if (!batch.batchRail) throw new Error(`Mixed batch transactionId=${transactionId} has no rail on its get file batches row; cannot build the initiate request.`);
        return { ...common, rail: batch.batchRail };
    }

    if (batch.paymentType === "INT" && batch.railType === "INT") {
        return { ...common, rail: "INT" };
    }

if (
    ["TPT", "ADHOC", "PRLSD", "PRLEX", "IAB"].includes(batch.paymentType) &&
    ["EFT", "RTGS", "PAYSHAP"].includes(batch.railType)
) {
    return { ...common, rail: batch.railType };
}

    throw new Error(`No initiate request body is defined for ${batch.paymentType}/${batch.railType}`);
}

function parseJsonResponse(response) {
    try { return response.json() || {}; } catch { return {}; }
}

function responseType(payload) {
    if (payload === null) return "null";
    if (Array.isArray(payload)) return "array";
    return typeof payload;
}

function extractOtpChallenge(payload) {
    const requiredFields = ["Destination", "TimeToLive", "Method", "OTP", "Retry"];
    const visit = (value, depth) => {
        if (!value || typeof value !== "object" || depth > 3) return null;
        if (requiredFields.every((field) => value[field] !== undefined)) return value;
        for (const key of ["data", "result", "Result", "response", "payload"]) {
            const found = visit(value[key], depth + 1);
            if (found) return found;
        }
        return null;
    };
    return visit(payload, 0);
}

function isOtpChallenge(payload) {
    return Boolean(extractOtpChallenge(payload));
}

function isSasResponse(payload) {
    return Boolean(
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        payload.sasUrl &&
        payload.uploadHeaders &&
        payload.fileId
    );
}

function extractCookieNames(rawSetCookie) {
    const headers = Array.isArray(rawSetCookie) ? rawSetCookie : [rawSetCookie];
    const names = [];
    for (const header of headers) {
        const chunk = String(header || "").split(",");
        for (const part of chunk) {
            const cookiePart = part.split(";")[0].trim();
            const eq = cookiePart.indexOf("=");
            if (eq > 0) names.push(cookiePart.slice(0, eq).trim());
        }
    }
    return names;
}

function parseCookies(rawSetCookie) {
    const headers = Array.isArray(rawSetCookie) ? rawSetCookie : [rawSetCookie];
    const cookies = [];
    for (const header of headers) {
        const chunk = String(header || "").split(",");
        for (const part of chunk) {
            const cookiePart = part.split(";")[0].trim();
            const eq = cookiePart.indexOf("=");
            if (eq > 0) cookies.push({ name: cookiePart.slice(0, eq).trim(), value: cookiePart.slice(eq + 1).trim() });
        }
    }
    return cookies;
}

function flattenCookies(cookies) {
    return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

function extractSsoStagingCookie(response, stageName) {
    const rawSetCookie = response?.headers?.["Set-Cookie"] || response?.headers?.["set-cookie"] || "";
    const cookieNames = extractCookieNames(rawSetCookie);
    const parsed = parseCookies(rawSetCookie);
    const sso = parsed.find((c) => c.name === "SSO_STAGING");
    console.info(`[k6][debug][cookies] stage=${stageName} direction=response setCookieHeaderCount=${(Array.isArray(rawSetCookie) ? rawSetCookie : [rawSetCookie]).filter((h) => h).length} cookieNames=${JSON.stringify(cookieNames)}`);
    if (!sso) throw new Error(`[k6][FAIL][${stageName}] SSO_STAGING missing from Set-Cookie response`);
    const value = String(sso.value).trim();
    return {
        name: "SSO_STAGING",
        value,
        header: flattenCookies(parsed),
        fingerprint: md5(value, "hex").slice(0, 12),
        cookies: parsed,
    };
}

function applySetCookie(jar, response, stageName) {
    if (typeof jar !== "object" || jar === null) throw new Error(`[k6][FAIL][${stageName}] Cookie jar is not an object`);
    const rawSetCookie = response?.headers?.["Set-Cookie"] || response?.headers?.["set-cookie"] || "";
    const parsed = parseCookies(rawSetCookie);
    if (parsed.length === 0) {
        console.info(`[k6][debug][cookies] stage=${stageName} direction=response applied=0 jar=${JSON.stringify(Object.keys(jar))} (no Set-Cookie)`);
        return jar;
    }
    for (const cookie of parsed) {
        if (!cookie.name) continue;
        jar[cookie.name] = cookie.value;
    }
    console.info(`[k6][debug][cookies] stage=${stageName} direction=response applied=${parsed.length} jar=${JSON.stringify(Object.keys(jar))}`);
    return jar;
}

function jarHeader(jar) {
    return Object.entries(jar || {})
        .filter(([name]) => name)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
}

function ssoStagingFingerprint(cookieHeader) {
    const match = /(?:^|;\s*)SSO_STAGING=([^;]*)/.exec(String(cookieHeader || ""));
    return match ? md5(String(match[1]).trim(), "hex").slice(0, 12) : "<missing>";
}

function sasRetryIdempotencyMode() {
    const mode = String(__ENV.SAS_RETRY_IDEMPOTENCY_MODE || "NEW").trim().toUpperCase();
    if (mode !== "SAME" && mode !== "NEW") throw new Error("SAS_RETRY_IDEMPOTENCY_MODE must be SAME or NEW.");
    return mode;
}

function sasOtpWaitSeconds() {
    const raw = (__ENV.K6_SAS_OTP_WAIT_SECONDS || "").trim();
    if (raw === "") return 3;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) throw new Error(`K6_SAS_OTP_WAIT_SECONDS must be a non-negative number, got "${raw}".`);
    return value;
}

function buildSasEndpoint(ctx) {
    return `${ctx.batchBaseUrl}/api/v1/files/batch/sas-url?username=${encodeURIComponent(ctx.singleAuthIniUsername)}&company=${encodeURIComponent(ctx.singleAuthCompany)}`;
}

function submitOtp(authBaseUrl, otpValue, cookieHeader, durationMetric, stageName) {
    if (!cookieHeader) throw new Error(`[k6][FAIL][${stageName}] Cookie header is missing`);
    if (!/\bSSO_STAGING=[^;\s]+(?:;|$)/.test(cookieHeader)) throw new Error(`[k6][FAIL][${stageName}] Cookie header is invalid`);
    console.info(`[k6][debug][cookies] stage=${stageName} direction=request cookieHeaderNames=${JSON.stringify(cookieHeader.split(";").map((c) => c.split("=")[0].trim()))}`);
    const started = Date.now();
    const response = http.post(`${authBaseUrl}/auth/otp`, JSON.stringify({ OTP: otpValue }), {
        headers: { Cookie: cookieHeader, Accept: "application/vnd.investec.uxp.v2.0.0.0+json", "Content-Type": "application/json" },
        timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
        tags: { stage: stageName },
    });
    logRuntimeExchange(stageName, "POST", `${authBaseUrl}/auth/otp`, { Cookie: cookieHeader, Accept: "<fixed>", "Content-Type": "application/json" }, { OTP: "<redacted>" }, response);
    durationMetric.add(Date.now() - started);
    return { response, payload: parseJsonResponse(response) };
}

function authenticate(config) {
    const authBaseUrl = config.authBaseUrl;
    const authStarted = Date.now();
    const authResponse = http.post(`${authBaseUrl}/auth`, JSON.stringify({ Username: config.username, Password: config.password }), {
        headers: { Accept: "application/vnd.investec.uxp.v2.0.0.0+json", "Content-Type": "application/json" },
        timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
        tags: { stage: "authenticate" },
    });
    logRuntimeExchange("authenticate", "POST", `${authBaseUrl}/auth`, { Accept: "<fixed>", "Content-Type": "application/json" }, { Username: "<redacted>", Password: "<redacted>" }, authResponse);
    authenticateDuration.add(Date.now() - authStarted);
    const authPayload = parseJsonResponse(authResponse);
    if (authResponse.status !== 200 || authPayload?.LoggedIn !== true || authPayload?.Authenticated !== true) {
        throw new Error(`[k6][FAIL][authenticate] status=${authResponse.status} LoggedIn=${authPayload?.LoggedIn} Authenticated=${authPayload?.Authenticated}`);
    }
    const cookie = extractSsoStagingCookie(authResponse, "authenticate");
    console.info(`[k6][debug][cookie] stage=authenticate cookiePresent=true fingerprint=${cookie.fingerprint}`);
    console.info("[k6][PASS][authenticate]");
    console.info("[PASS] authenticate");
    return { response: authResponse, payload: authPayload, cookie };
}

function buildSasRequest(fileName, originalName) {
    return { fileName, fileDescription: "", originalName, templateType: "Investec", templateVersion: "Investec_csv2", autoInitiate: false, singleDebit: true, encrypted: false, allowDuplicate: false };
}

function getSasUrl(ctx, sasPayload, sasIdempotencyKey, stageName, cookieHeader, idempotencyDiagnostics, confirmOtp) {
    if (!cookieHeader) throw new Error(`[k6][FAIL][${stageName}] Cookie header is missing`);
    if (!/\bSSO_STAGING=[^;\s]+(?:;|$)/.test(cookieHeader)) throw new Error(`[k6][FAIL][${stageName}] Cookie header is invalid`);
    const body = confirmOtp ? { ...sasPayload, OTP: confirmOtp } : sasPayload;
    console.info(`[k6][debug][cookies] stage=${stageName} direction=request cookieHeaderNames=${JSON.stringify(cookieHeader.split(";").map((c) => c.split("=")[0].trim()))}`);
    console.info(`[k6][debug][sas-otp-body] stage=${stageName} confirmOtpPresent=${Boolean(confirmOtp)}`);
    const started = Date.now();
    const url = buildSasEndpoint(ctx);
    const response = http.post(url, JSON.stringify(body), {
        headers: {
            Cookie: cookieHeader,
            accept: "application/vnd.investec.uxp.v2.0.0.1+json",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json",
            "idempotency-key": sasIdempotencyKey,
        },
        timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
        tags: { stage: stageName },
    });
    logRuntimeExchange(stageName, "POST", url, { Cookie: cookieHeader, accept: "<fixed>", "accept-language": "en-US,en;q=0.9", "cache-control": "no-cache", "content-type": "application/json", "idempotency-key": "<redacted>" }, body, response);
    sasDuration.add(Date.now() - started);
    const payload = parseJsonResponse(response);
    const data = payload && typeof payload === "object" && !Array.isArray(payload) ? payload?.data || payload : {};
    const otpChallenge = isOtpChallenge(payload);
    const challenge = otpChallenge ? extractOtpChallenge(payload) : null;
    const sasResponsePresent = isSasResponse(data);
    const type = responseType(payload);
    const responseTypeLabel = type === "string" ? "json-string" : type;
    const responseStage = stageName === "get_sas_url_retry" ? "retry" : "initial";
    console.info(
        `[k6][debug][sas-response] stage=${responseStage} status=${response.status} responseType=${responseTypeLabel} ` +
        `otpChallenge=${otpChallenge} sasUrlPresent=${Boolean(data.sasUrl)} ` +
        `uploadHeadersPresent=${Boolean(data.uploadHeaders)} fileIdPresent=${Boolean(data.fileId)}`
    );
    if (response.status < 200 || response.status >= 300) {
        console.error(
            `[k6][FAIL][get_sas_url] status=${response.status} durationMs=${Number(response.timings?.duration || 0).toFixed(0)} ` +
            `correctEndpointPath=true cookieHeaderConfigured=${Boolean(cookieHeader)} ` +
            `idempotencyMode=${idempotencyDiagnostics.mode} environment=${selectedEnv} response=${safeSasErrorSnippet(response.body) || "<empty>"}`
        );
        throw new Error(`Get SAS URL failed. status=${response.status}`);
    }
    if (challenge) return { kind: "otp-challenge", challenge, response };
    if (!sasResponsePresent) {
        console.error(`[k6][FAIL][get_sas_url] status=${response.status} contentType=${response.headers?.["Content-Type"] || response.headers?.["content-type"] || "<missing>"} responseType=${responseTypeLabel} responseSnippet=${safeSasErrorSnippet(response.body) || "<empty>"} cookieHeaderConfigured=${Boolean(cookieHeader)} idempotencyMode=${idempotencyDiagnostics.mode} sameIdempotencyKey=${idempotencyDiagnostics.sameIdempotencyKey}`);
        throw new Error(`Get SAS URL response is missing sasUrl, uploadHeaders, or fileId. responseType=${type}`);
    }
    console.info(`[k6][PASS][get_sas_url] stage=${stageName}`);
    return { kind: "sas", ...data, response };
}

function uploadFileToSasUrl(sasUrl, uploadHeaders, csvFileBody, timestamps) {
    if (!sasUrl || !csvFileBody) throw new Error("File Manager upload requires a SAS URL and CSV file body.");
    if (!uploadHeaders || typeof uploadHeaders !== "object" || Object.keys(uploadHeaders).length === 0) {
        throw new Error("File Manager upload requires the uploadHeaders returned by Get SAS URL.");
    }

    if (timestamps) timestamps.fileUploadStartedAt = new Date().toISOString();
    const response = http.put(sasUrl, csvFileBody, {
        headers: { ...uploadHeaders },
        timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
        tags: { stage: "file_manager_upload" },
    });
    if (timestamps && response.status === 201) timestamps.fileUploadCompletedAt = new Date().toISOString();
    logRuntimeExchange("file_manager_upload", "PUT", "<redacted SAS URL>", uploadHeaders, "<CSV file bytes omitted>", response);
    check(response, { "File Manager upload status is 201": (r) => r.status === 201 });
    if (response.status !== 201) throw new Error(`File Manager upload failed. status=${response.status}`);
    return response;
}

function getAdoToken() {
    const missing = ["adoClient_id", "adoClient_secret", "adoScope"].filter((key) => !getAdoConfigValue(key));
    if (missing.length > 0) {
        throw new Error(`[k6][AUTH] Missing ADO token configuration: ${missing.join(", ")}.`);
    }
    const tenantId = __ENV.K6_AAD_TENANT_ID || "6d6a11bc-469a-48df-a548-d3f353ac1be8";
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const payload = {
        grant_type: getAdoConfigValue("adoGrant_type") || "client_credentials",
        client_id: getAdoConfigValue("adoClient_id"),
        client_secret: getAdoConfigValue("adoClient_secret"),
        scope: getAdoConfigValue("adoScope"),
    };

    const res = http.post(url, payload, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
        tags: { stage: "auth_ado" },
    });
    logRuntimeExchange("auth_ado", "POST", url, { "Content-Type": "application/x-www-form-urlencoded" }, payload, res);

    check(res, { "ADO token status is 200": (r) => r.status === 200 });
    const json = res.json() || {};
    if (!json.access_token) {
        throw new Error(`[k6][AUTH] Failed to obtain ADO token. status=${res.status}.`);
    }
    return json.access_token;
}

function getAppToken(baseUrl, singleAuthContext, adoToken) {
    const url = `${baseUrl}/tokens-service/api/v2/tokens?company=${encodeURIComponent(singleAuthContext.singleAuthCompany)}&username=${encodeURIComponent(singleAuthContext.singleAuthIniUsername)}`;
    const res = http.get(url, {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Accept: "application/json",
            Authorization: `Bearer ${adoToken}`,
            GCN: singleAuthContext.singleAuthIniGCN,
        },
        timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
        tags: { stage: "auth_app" },
    });
    logRuntimeExchange("auth_app", "GET", url, { "Content-Type": "application/json; charset=utf-8", Accept: "application/json", Authorization: "<redacted>", GCN: singleAuthContext.singleAuthIniGCN }, "<empty>", res);

    check(res, { "App token status is 200": (r) => r.status === 200 });
    const json = res.json() || {};
    if (!json.jwt) {
        throw new Error(`[k6][AUTH] Failed to obtain SINGLE AUTH BAPI token. status=${res.status}.`);
    }
    return json.jwt;
}

function getBapiAuthHeaders(ctx) {
    if (!ctx.singleAuthBapiToken) {
        throw new Error("[k6][AUTH] SINGLE AUTH BAPI token is missing; downstream requests were not started.");
    }
    return {
        Authorization: `Bearer ${ctx.singleAuthBapiToken}`,
        GCN: ctx.singleAuthIniGCN,
        Accept: "application/json",
    };
}

export function setup() {
    console.info(`[k6][config] env=${selectedEnv}`);
    console.info(`[k6][config] authHost=${endpointHost(environmentConfig.authBaseUrl)} batchHost=${endpointHost(environmentConfig.batchBaseUrl)} paymentsHost=${endpointHost(environmentConfig.paymentsBaseUrl)}`);
    validatePreflight();
    const identityPrefix = isDualAuth ? "dualAuth" : "singleAuth";
    return {
        selectedEnv,
        environmentConfig,
        batchBaseUrl: environmentConfig.batchBaseUrl.replace(/\/+$/, ""),
        baseUrl: environmentConfig.paymentsBaseUrl.replace(/\/+$/, ""),
        singleAuthCompany: environmentConfig[`${identityPrefix}Company`],
        singleAuthIniUsername: environmentConfig[`${identityPrefix}IniUsername`],
        singleAuthIniGCN: environmentConfig[`${identityPrefix}IniGCN`],
        singleAuthIniLoginginId: environmentConfig[`${identityPrefix}IniLoginginId`],
        singleAuthPassword: environmentConfig.password,
        dualAuthCompany: environmentConfig.dualAuthCompany,
        dualAuthIniLoginginId: environmentConfig.dualAuthIniLoginginId,
        dualAuthIniUsername: environmentConfig.dualAuthIniUsername,
        dualAuthIniGCN: environmentConfig.dualAuthIniGCN,
        dualAuthAppLoginginId: environmentConfig.dualAuthAppLoginginId,
        dualAuthAppUsername: environmentConfig.dualAuthAppUsername,
        dualAuthAppGCN: environmentConfig.dualAuthAppGCN,
    };
}

export default function (ctx) {
    return runBulkFlow(ctx);
}

export function runBulkFlow(ctx, afterInitiate) {
    const started = Date.now();
    let flowOk = true;
    let stage = "FILE_UPLOAD";
    const execution = {
        authMode: isDualAuth ? "DUAL_AUTH" : "SINGLE_AUTH",
        vu: __VU,
        iteration: __ITER + 1,
        paymentType: configuredPaymentType,
        railType: configuredRail,
        fileName: "",
        fileId: "",
        parentTransactionIds: [],
        bkRefIds: [],
        paymentCount: configuredNumPayments,
        timings: { uploadMs: null, pendinitMs: null, initiationMs: null, sentMs: null },
        timestamps: { uploadStartedAt: "", uploadEndedAt: "", pendinitStartedAt: "", pendinitEndedAt: "", initiationStartedAt: "", initiationEndedAt: "", sentStartedAt: "", sentEndedAt: "" },
        statuses: { upload: "", pendinit: "", initiation: "", sent: "" },
        timeouts: { upload: null, pendinit: null, initiation: null, sent: null },
        requestDetails: { pendinit: "", ftIds: [] },
        status: "INCOMPLETE",
        failure: null,
        payments: [],
    };

    try {
        console.info(`[${authLabel}] Validate`);
        const auth = authenticate({
            authBaseUrl: ctx.environmentConfig.authBaseUrl,
            username: ctx.singleAuthIniLoginginId,
            password: ctx.singleAuthPassword,
        });
        let currentCookie = auth.cookie;
        const jar = {};
        for (const c of currentCookie.cookies || []) if (c && c.name) jar[c.name] = c.value;
        console.info(`[${authLabel}] OTP Attempt #1`);
        const initialOtp = submitOtp(
            ctx.environmentConfig.authBaseUrl,
            ctx.environmentConfig.initialOtp,
            jarHeader(jar),
            initialOtpDuration,
            "initial_otp"
        );
        if (initialOtp.response.status !== 200 || initialOtp.payload?.Status !== "Ok") {
            throw new Error(`[k6][FAIL][initial_otp] OTP Attempt #1 transport failure status=${initialOtp.response.status} Status=${initialOtp.payload?.Status || "<missing>"}`);
        }
        console.info(`[INFO] Result=${initialOtp.payload?.Result} Message=${String(initialOtp.payload?.Message || "")}`);
        applySetCookie(jar, initialOtp.response, "initial_otp");
        try {
            currentCookie = extractSsoStagingCookie(initialOtp.response, "initial_otp");
            console.info(`[k6][debug][cookie] stage=initial_otp cookiePresent=true fingerprint=${currentCookie.fingerprint}`);
            console.info(`[INFO] OTP #1 Set-Cookie applied fingerprint=${ssoStagingFingerprint(jarHeader(jar))}`);
        } catch {
            console.warn("[k6][WARN][initial_otp] No replacement SSO_STAGING cookie returned; continuing with authentication cookie");
        }
        const sasOtpWait = sasOtpWaitSeconds();
        console.info(`[k6][debug][wait] stage=initial_otp->otp_attempt_2 seconds=${sasOtpWait}`);
        sleep(sasOtpWait);

        console.info(`[${authLabel}] OTP Attempt #2`);
        const secondOtp = submitOtp(
            ctx.environmentConfig.authBaseUrl,
            ctx.environmentConfig.initialOtp,
            jarHeader(jar),
            otpDuration,
            "otp_attempt_2"
        );
        if (secondOtp.response.status !== 200 || secondOtp.payload?.Status !== "Ok") {
            throw new Error(`[k6][FAIL][otp_attempt_2] OTP Attempt #2 transport failure status=${secondOtp.response.status} Status=${secondOtp.payload?.Status || "<missing>"}`);
        }
        console.info(`[INFO] Result=${secondOtp.payload?.Result} Message=${String(secondOtp.payload?.Message || "")}`);
        applySetCookie(jar, secondOtp.response, "otp_attempt_2");
        const preOtp2Fingerprint = currentCookie.fingerprint;
        let otp2CookieFingerprint = null;
        try {
            currentCookie = extractSsoStagingCookie(secondOtp.response, "otp_attempt_2");
            const otp2SsoCookies = currentCookie.cookies.filter((c) => c.name === "SSO_STAGING");
            otp2CookieFingerprint = md5(String(otp2SsoCookies[otp2SsoCookies.length - 1].value).trim(), "hex").slice(0, 12);
            console.info(`[k6][debug][cookie] stage=otp_attempt_2 cookiePresent=true cookieUpdated=${currentCookie.fingerprint !== preOtp2Fingerprint} fingerprint=${currentCookie.fingerprint}`);
            console.info(`[INFO] OTP #2 Set-Cookie applied fingerprint=${otp2CookieFingerprint}`);
        } catch {
            console.warn("[k6][WARN][otp_attempt_2] No replacement SSO_STAGING cookie returned; continuing with OTP Attempt #1 session cookie");
        }
        console.info(`[k6][debug][wait] stage=otp_attempt_2->get_sas_url seconds=${sasOtpWait}`);
        sleep(sasOtpWait);

        const numPayments = configuredNumPayments;
        const data = isMixBatch ? getEnvData(mixEntries[0].paymentType, mixEntries[0].rail) : getEnvData();
        if (isMixBatch) {
            console.info(`[UPLOAD][MIX] building one CSV with ${mixEntries.map((entry) => `${entry.key}:${entry.count}`).join(", ")} (total=${configuredNumPayments})`);
        }
        const intBatch = buildPaymentBatchXml(data, numPayments);

        console.info("[UPLOAD] Loading CSV");
        const isUat = selectedEnv === "UAT";
        const selectedBatchFile = getEnvironmentBatchFile();
        if (!selectedBatchFile) {
            throw new Error(`No CSV batch file is configured for ${selectedEnv}/${configuredPaymentType}/${configuredRail}. XML upload is not supported.`);
        }
        const sasFileName = sanitizeBatchName(
            __ENV.K6_BATCH_FILE_NAME || (isUat ? makeUniqueBatchFileName() : intBatch.fileDisplayName),
            "BulkPaymentV2"
        );
        const originalName = `${sasFileName}.csv`;
        const uploadBody = selectedBatchFile;
        emitBatchFileCapture(originalName, uploadBody);
        intBatch.fileDisplayName = sasFileName;
        execution.fileName = sasFileName;
        emitExecutionSnapshot(execution);
        const sasPayload = buildSasRequest(sasFileName, originalName);
        const initialSasUrl = buildSasEndpoint(ctx);
        const initialSasPayload = JSON.stringify(sasPayload);
        const initialSasUsername = ctx.singleAuthIniUsername;
        const initialSasCompany = ctx.singleAuthCompany;
        const initialSasIdempotencyKey = makeIdempotencyKey();
        const retryIdempotencyMode = sasRetryIdempotencyMode();
        console.info(`[${authLabel}] Get SAS URL`);
        const sasSessionCookie = jarHeader(jar);
        const sasCookieFingerprint = ssoStagingFingerprint(sasSessionCookie);
        console.info(`[k6][debug][cookie] stage=get_sas_url cookiePresent=${Boolean(sasSessionCookie)} fingerprint=${sasCookieFingerprint}`);
        console.info(`[k6][auth-context] authMode=${isDualAuth ? "DUAL_AUTH" : "SINGLE_AUTH"} company=${ctx.singleAuthCompany} username=${ctx.singleAuthIniUsername}${isDualAuth ? " role=INITIATOR" : ""}`);
        console.info(`[k6][debug][sas-idempotency] stage=initial mode=${retryIdempotencyMode} keyGenerated=true`);
        if (otp2CookieFingerprint) {
            if (sasCookieFingerprint !== otp2CookieFingerprint) {
                throw new Error(`[k6][FAIL][get_sas_url] Cookie propagation mismatch: OTP #2 response fingerprint=${otp2CookieFingerprint} Get SAS URL request fingerprint=${sasCookieFingerprint}`);
            }
            console.info(`[INFO] Using latest session cookie from OTP #2 fingerprint=${sasCookieFingerprint} (matches OTP #2 response)`);
        } else {
            console.info(`[INFO] OTP #2 returned no new SSO_STAGING; using latest session cookie fingerprint=${sasCookieFingerprint}`);
        }
        let sasData = getSasUrl(ctx, sasPayload, initialSasIdempotencyKey, "get_sas_url", sasSessionCookie, {
            mode: retryIdempotencyMode,
            sameIdempotencyKey: true,
        });
        applySetCookie(jar, sasData.response, "get_sas_url");
        if (sasData.kind === "otp-challenge") {
            console.info("[k6][OTP_REQUIRED][get_sas_url]");
            console.info(`[k6][debug][wait] stage=get_sas_url->challenge_otp seconds=${sasOtpWait}`);
            sleep(sasOtpWait);
            const retryOtp = submitOtp(
                ctx.environmentConfig.authBaseUrl,
                ctx.environmentConfig.initialOtp,
                jarHeader(jar),
                challengeOtpDuration,
                "challenge_otp"
            );
            if (!(retryOtp.response.status === 200 && retryOtp.payload?.Status === "Ok" && retryOtp.payload?.Result === true)) {
                throw new Error(`[k6][FAIL][challenge_otp] status=${retryOtp.response.status} Result=${retryOtp.payload?.Result} Message=${String(retryOtp.payload?.Message || "")}`);
            }
            const previousFingerprint = currentCookie.fingerprint;
            currentCookie = extractSsoStagingCookie(retryOtp.response, "challenge_otp");
            applySetCookie(jar, retryOtp.response, "challenge_otp");
            console.info("[k6][PASS][challenge_otp]");
            console.info(`[k6][debug][wait] stage=challenge_otp->get_sas_url_retry seconds=${sasOtpWait}`);
            sleep(sasOtpWait);
            const cookieUpdated = currentCookie.fingerprint !== previousFingerprint;
            console.info(`[k6][debug][cookie] stage=challenge_otp cookiePresent=true cookieUpdated=${cookieUpdated} fingerprint=${currentCookie.fingerprint}`);
            const retrySasIdempotencyKey = retryIdempotencyMode === "NEW" ? makeIdempotencyKey() : initialSasIdempotencyKey;
            const sameIdempotencyKey = retrySasIdempotencyKey === initialSasIdempotencyKey;
            const retrySasUrl = buildSasEndpoint(ctx);
            const [initialSasBaseUrl, initialSasQuery = ""] = initialSasUrl.split("?", 2);
            const [retrySasBaseUrl, retrySasQuery = ""] = retrySasUrl.split("?", 2);
            console.info(`[k6][debug][sas-idempotency] stage=retry mode=${retryIdempotencyMode} sameIdempotencyKey=${sameIdempotencyKey} newKeyGenerated=${!sameIdempotencyKey}`);
            console.info(`[k6][debug][sas-compare] sameUrl=${retrySasBaseUrl === initialSasBaseUrl} sameQuery=${retrySasQuery === initialSasQuery} samePayload=${JSON.stringify(sasPayload) === initialSasPayload} sameFilename=${sasPayload.fileName === sasFileName} sameOriginalName=${sasPayload.originalName === originalName} sameUsername=${ctx.singleAuthIniUsername === initialSasUsername} sameCompany=${ctx.singleAuthCompany === initialSasCompany} cookieUpdated=${cookieUpdated} sameIdempotencyKey=${sameIdempotencyKey}`);
            sasData = getSasUrl(ctx, sasPayload, retrySasIdempotencyKey, "get_sas_url_retry", jarHeader(jar), {
                mode: retryIdempotencyMode,
                sameIdempotencyKey,
            });
            applySetCookie(jar, sasData.response, "get_sas_url_retry");
            if (sasData.kind === "otp-challenge") {
                console.info("[k6][OTP_REQUIRED][get_sas_url_retry]");
                console.error("[k6][FAIL][get_sas_url] reason=OTP_CHALLENGE_REPEATED sasUrlPresent=false uploadHeadersPresent=false fileIdPresent=false");
                throw new Error("Get SAS URL failed. reason=OTP_CHALLENGE_REPEATED");
            }
        }

        if (!isSasResponse(sasData)) {
            throw new Error("Get SAS URL did not return sasUrl, uploadHeaders, and fileId; upload was not attempted.");
        }
        console.info("[PASS] SAS URL generated");

        console.info(`[${authLabel}] Upload File`);
        const uploadStart = Date.now();
        execution.timestamps.uploadStartedAt = new Date(uploadStart).toISOString();
        execution.timestamps.executionStartedAt = execution.timestamps.uploadStartedAt;
        const uploadRes = uploadFileToSasUrl(sasData.sasUrl, sasData.uploadHeaders, uploadBody, execution.timestamps);
        uploadDuration.add(Date.now() - uploadStart);
        execution.timings.uploadMs = Date.now() - uploadStart;
        execution.timestamps.uploadEndedAt = new Date().toISOString();
        execution.statuses.upload = `HTTP ${uploadRes.status}`;
        emitExecutionSnapshot(execution);

        if (uploadRes.status !== 201) {
            logHttpFailure("upload", {
                status: uploadRes.status,
                timings: uploadRes.timings,
                url: "<redacted SAS URL>",
                body: uploadRes.body,
                txId: "upload",
            });
            throw new Error(`File Manager upload failed. status=${uploadRes.status}`);
        }
        console.info("[UPLOAD] CSV uploaded successfully");
        console.info("[PASS] File uploaded");

        ctx.jar = http.cookieJar();
        console.info("[AUTH] Getting ADO token");
        ctx.singleAuthAdoAccessToken = getAdoToken();
        console.info("[AUTH] ADO token received");
        console.info(`[AUTH] Generating ${authLabel} BAPI token`);
        ctx.singleAuthBapiToken = getAppToken(ctx.baseUrl, ctx, ctx.singleAuthAdoAccessToken);
        console.info(`[AUTH] ${authLabel} BAPI token received`);
        ctx.authHeaders = getBapiAuthHeaders(ctx);
        console.info(`[AUTH] ${authLabel} user context configured`);
        console.info("[FLOW] Continuing with existing Get File flow");

        stage = "PENDINIT";
        const filePollTimeoutMs = fileValidationTimeoutMs > 0 ? fileValidationTimeoutMs : Infinity;
        const fileTimeoutText = Number.isFinite(filePollTimeoutMs) ? `${filePollTimeoutMs}ms` : "none";
        const pollIntervalMs = pollingIntervalMs;
        let lastWaitLogAt = Date.now();
        let fileValidationRejected = false;
        console.info(`[k6][PENDINIT] waiting for file validation to reach PENDINIT timeout=${fileTimeoutText}`);
        const pollStarted = Date.now();
        execution.timestamps.pendinitStartedAt = new Date(pollStarted).toISOString();
        let fileId = String(sasData.fileId || "");
        let fileStatus = "";
        let lastFileHttpStatus = "";
        let latestFileRecord = null;

        while (Date.now() - pollStarted <= filePollTimeoutMs) {
            const requestUrl = fileId
                ? `${ctx.baseUrl}/payments-manager/api/v1/files/${fileId}`
                : `${ctx.baseUrl}/payments-manager/api/v1/files?page=1&size=20&search=${encodeURIComponent(intBatch.fileDisplayName)}`;
            execution.requestDetails.pendinit = requestUrl;
            const getFileRes = http.get(requestUrl, {
                jar: ctx.jar,
                headers: ctx.authHeaders,
                timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
                tags: { stage: fileId ? "get_file_status" : "get_files" },
            });
            logRuntimeExchange(fileId ? "get_file_status" : "get_files", "GET", requestUrl, ctx.authHeaders, "<empty>", getFileRes);
            lastFileHttpStatus = getFileRes.status;
            check(getFileRes, { [fileId ? "get file status is 200" : "get files status is 200"]: (r) => r.status === 200 });

            if (getFileRes.status !== 200) {
                logHttpFailure(fileId ? "get_file_status" : "get_files", {
                    status: getFileRes.status,
                    timings: getFileRes.timings,
                    url: requestUrl,
                    body: getFileRes.body,
                    txId: fileId || "getFiles",
                });
            }

            if (getFileRes.status === 200) {
                const payload = getFileRes.json() || {};
                const detail = fileId ? payload.data || payload : null;
                const match = fileId
                    ? detail
                    : (Array.isArray(payload.data) ? payload.data : []).find((x) => String(x.fileName || "") === intBatch.fileDisplayName);
                if (match) {
                    fileId = String(match.refId || fileId || "");
                    execution.fileId = fileId;
                    fileStatus = String((match.status && match.status.code) || match.status || "");
                    if (fileStatus === "PENDINIT" && !execution.timestamps.pendingInitiationObservedAt) {
                        execution.timestamps.pendingInitiationObservedAt = new Date().toISOString();
                    }
                    execution.statuses.pendinit = fileStatus || "UNKNOWN";
                    latestFileRecord = match;
                    emitExecutionSnapshot(execution);
                    if (fileStatus === "PENDINIT") {
                        break;
                    }
                    if (/FAIL|REJECT|RJCT|INVALID|ERROR|CANCEL|EXPIRED/i.test(fileStatus)) {
                        fileValidationRejected = true;
                        break;
                    }
                }
            }

            if (Date.now() - lastWaitLogAt >= 30000) {
                lastWaitLogAt = Date.now();
                console.info(
                    `[k6][PENDINIT][WAITING] fileId=${fileId || "<not found yet>"} status=${fileStatus || (lastFileHttpStatus ? `HTTP ${lastFileHttpStatus}` : "n/a")} ` +
                    `elapsedSec=${((Date.now() - pollStarted) / 1000).toFixed(0)} timeout=${fileTimeoutText}`
                );
            }

            const elapsedMs = Date.now() - pollStarted;
            const remainingMs = filePollTimeoutMs - elapsedMs;
            if (remainingMs <= 0) {
                break;
            }
            sleep(Math.max(0.2, Math.min(pollIntervalMs, remainingMs) / 1000));
        }

        execution.timestamps.pendinitEndedAt = new Date().toISOString();
        execution.timings.pendinitMs = Date.now() - pollStarted;
        if (!execution.statuses.pendinit) {
            execution.statuses.pendinit = fileStatus || (lastFileHttpStatus ? `HTTP ${lastFileHttpStatus}` : "FILE_NOT_FOUND");
        }

        if (!fileId) {
            execution.timeouts.pendinit = { timeoutMs: filePollTimeoutMs, elapsedMs: execution.timings.pendinitMs };
            setExecutionFailure(execution, {
                stage,
                expectedStatus: "PENDINIT",
                lastStatus: execution.statuses.pendinit,
                httpStatus: lastFileHttpStatus,
                timeoutMs: filePollTimeoutMs,
                elapsedMs: execution.timings.pendinitMs,
                message: `Uploaded file was not found within ${fileTimeoutText} (--fileValid). Last backend status: ${execution.statuses.pendinit}`,
            });
            console.error(
                `[k6][FAIL][polling] fileName=${intBatch.fileDisplayName} fileId=<missing> lastStatus=${execution.statuses.pendinit} timeout=${fileTimeoutText} elapsedMs=${execution.timings.pendinitMs}`
            );
            throw new Error(`Uploaded file not found in getFiles for ${intBatch.fileDisplayName}`);
        }
        if (fileStatus !== "PENDINIT") {
            if (!fileValidationRejected) {
                execution.timeouts.pendinit = { timeoutMs: filePollTimeoutMs, elapsedMs: execution.timings.pendinitMs };
            }
            setExecutionFailure(execution, {
                stage,
                expectedStatus: "PENDINIT",
                lastStatus: execution.statuses.pendinit,
                httpStatus: lastFileHttpStatus,
                timeoutMs: fileValidationRejected ? "" : filePollTimeoutMs,
                elapsedMs: execution.timings.pendinitMs,
                message: fileValidationRejected
                    ? `File validation ended with status ${execution.statuses.pendinit} instead of PENDINIT.`
                    : `File did not reach PENDINIT within ${fileTimeoutText} (--fileValid). Last backend status: ${execution.statuses.pendinit}`,
            });
            logFileValidationFailure(ctx.baseUrl, ctx.authHeaders, fileId, fileStatus, latestFileRecord, ctx.jar);
            console.error(
                `[k6][FAIL][polling] fileName=${intBatch.fileDisplayName} fileId=${fileId} expectedStatus=PENDINIT actualStatus=${execution.statuses.pendinit} timeout=${fileTimeoutText} elapsedMs=${execution.timings.pendinitMs}`
            );
            throw new Error(`File did not reach PENDINIT. fileId=${fileId} lastStatus=${fileStatus}`);
        }
        pendinitDuration.add(Date.now() - pollStarted);
        uploadToPendinitDuration.add(Date.now() - uploadStart);

        const getBatchesStart = Date.now();
        const getBatchesRes = http.get(
            `${ctx.baseUrl}/payments-manager/api/v1/batch-payments/${fileId}/batches`,
            {
                jar: ctx.jar,
                headers: ctx.authHeaders,
                timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
                tags: { stage: "get_batches" },
            }
        );
        logRuntimeExchange("get_file_batches", "GET", `${ctx.baseUrl}/payments-manager/api/v1/batch-payments/${fileId}/batches`, ctx.authHeaders, "<empty>", getBatchesRes);
        check(getBatchesRes, { "get file batches status is 200": (r) => r.status === 200 });
        if (getBatchesRes.status !== 200) {
            logHttpFailure("get_batches", {
                status: getBatchesRes.status,
                timings: getBatchesRes.timings,
                url: `${ctx.baseUrl}/payments-manager/api/v1/batch-payments/${fileId}/batches`,
                body: getBatchesRes.body,
                txId: fileId,
            });
            throw new Error(`get file batches failed. status=${getBatchesRes.status} body=${getBatchesRes.body}`);
        }

        const batchPayload = getBatchesRes.json() || {};
        const batchRows = Array.isArray(batchPayload.data) ? batchPayload.data : [];
        const returnedRails = [...new Set(batchRows.map((row) => String(row?.rail?.code || "").toUpperCase()).filter(Boolean))];
        if (isMixBatch) {
            const unexpectedRails = returnedRails.filter((rail) => !mixRails.includes(rail));
            const missingRails = mixRails.filter((rail) => !returnedRails.includes(rail));
            for (const row of batchRows) {
                console.info(
                    `[k6][BATCHES][MIX] transactionId=${row?.transactionId || "n/a"} bkRef=${extractBkRefId(row) || "n/a"} ` +
                    `rail=${row?.rail?.code || "n/a"} paymentType=${batchRowPaymentType(row) || "n/a"} payments=${row?.numberOfPayments ?? row?.batchNoOfPayments ?? "n/a"}`
                );
            }
            check(true, {
                "get file batches rails match mix rails": () => returnedRails.length > 0 && unexpectedRails.length === 0 && missingRails.length === 0,
            });
            if (returnedRails.length === 0 || unexpectedRails.length > 0 || missingRails.length > 0) {
                throw new Error(
                    `Get file batches rail validation failed for mixed fileId=${fileId}. expectedRails=[${mixRails.join(",")}] ` +
                    `actualRails=[${returnedRails.join(",") || "<missing>"}] missing=[${missingRails.join(",")}] unexpected=[${unexpectedRails.join(",")}]`
                );
            }
        } else {
            const expectedRail = String(configuredRail || "").toUpperCase();
            check(true, {
                "get file batches rail matches selected rail": () => returnedRails.length > 0 && returnedRails.every((rail) => rail === expectedRail),
            });
            if (returnedRails.length === 0 || returnedRails.some((rail) => rail !== expectedRail)) {
                throw new Error(
                    `Get file batches rail validation failed for fileId=${fileId}. expectedRail=${expectedRail} actualRails=[${returnedRails.join(",") || "<missing>"}]`
                );
            }
        }
        const transactionIds = batchRows
            .map((r) => String(r.transactionId || ""))
            .filter((id) => id.length > 0);

        if (transactionIds.length === 0) {
            console.error(`[k6][FAIL][batches] fileId=${fileId} no transactionIds returned from /batch-payments/${fileId}/batches response=${JSON.stringify(batchPayload).slice(0, 400)}`);
            throw new Error(`No transactionIds returned for fileId=${fileId}`);
        }

        // The get file batches response returns both a transaction ID (used to initiate) and a
        // separate BK-prefixed batch reference (BKREF) used to look up records for that batch.
        const bkRefIds = batchRows.map((r) => extractBkRefId(r)).filter((id) => id.length > 0);
        const batchRowByTransactionId = new Map(batchRows.map((row) => [String(row?.transactionId || ""), row]));
        recordBatchLabels = isMixBatch
            ? Object.fromEntries(batchRows.flatMap((row) => {
                const label = { paymentType: batchRowPaymentType(row), railType: String(row?.rail?.code || "").toUpperCase() };
                return [extractBkRefId(row), String(row?.transactionId || "")].filter(Boolean).map((key) => [key, label]);
            }))
            : {};
        perBatchTracking = null;
        if (isMixBatch) {
            execution.perBatch = startPerBatchTracking(batchRows, expectedFinalChildStatus(intBatch.paymentDate), execution.timestamps.pendinitEndedAt);
        }
        execution.parentTransactionIds = transactionIds;
        execution.bkRefIds = bkRefIds;
        emitExecutionSnapshot(execution);
        if (bkRefIds.length === 0) {
            console.warn(
                `[k6][RECORDS][DIAGNOSTIC] no BK-prefixed reference found on batch rows, falling back to transactionId for BKREF. sampleRow=${safeBodySnippet(JSON.stringify(batchRows[0] || {}))}`
            );
        }

        const initiateRequests = transactionIds.map((txId) => [
            "POST",
            `${ctx.baseUrl}/payments-manager/api/v1/batch-payments/${txId}/initiate?operation=CREATE`,
            JSON.stringify(buildInitiateRequestBody(
                isMixBatch ? { ...intBatch, batchRail: String(batchRowByTransactionId.get(txId)?.rail?.code || "").toUpperCase() } : intBatch,
                fileId,
                txId
            )),
            {
                headers: {
                    ...ctx.authHeaders,
                    channel: intBatch.channel,
                    "Content-Type": "application/json",
                },
                jar: ctx.jar,
                timeout: __ENV.K6_REQUEST_TIMEOUT || "60s",
                tags: { stage: "initiate_parallel" },
            },
        ]);

        stage = "FILE_INITIATION";
        const initiateStarted = Date.now();
        execution.timestamps.initiationStartedAt = new Date(initiateStarted).toISOString();
        const initiateResponses = http.batch(initiateRequests);
        const initiationReturnedAt = new Date().toISOString();
        if (initiateResponses.length > 0 && initiateResponses.every((response) => response.status === 200)) {
            execution.timestamps.initiationFinishedAt = initiationReturnedAt;
        }
        const responseDurations = initiateResponses.map((r) => Number(r?.timings?.duration || 0));
        const slowestDuration = responseDurations.length ? Math.max(...responseDurations) : 0;
        const slowestIndex = responseDurations.indexOf(slowestDuration);
        const slowestTxId = transactionIds[slowestIndex] || "unknown";
        const slowestUrl = initiateRequests[slowestIndex]?.[1] || "n/a";
        const slowestRequestBody = initiateRequests[slowestIndex]?.[2] || "";

        let allInitiated = true;
        const initiationStatuses = [];
        const expectedStatusAfterInitiate = expectedInitiateStatus(intBatch.paymentDate);

        for (let i = 0; i < initiateResponses.length; i++) {
            const response = initiateResponses[i];
            const durationMs = Number(response?.timings?.duration || 0);
            const txId = transactionIds[i] || "unknown";
            const requestUrl = initiateRequests[i]?.[1] || "n/a";
            const requestBody = initiateRequests[i]?.[2] || "";
            logRuntimeExchange("initiate_batch", "POST", requestUrl, initiateRequests[i]?.[3]?.headers || {}, requestBody, response);
            const initiatePayload = (() => {
                try {
                    return JSON.parse(response.body || "{}");
                } catch {
                    return {};
                }
            })();
            const apiStatus = extractStatusCodeFromPayload(initiatePayload);
            if (isDualAuth && response.status === 200 && String(apiStatus || "").toUpperCase() === "PENDAUTH" &&
                !execution.timestamps.pendingApprovalObservedAt) {
                execution.timestamps.pendingApprovalObservedAt = new Date().toISOString();
            }
            const normalizedStatus = canonicalInitiateStatus(apiStatus);
            initiationStatuses.push(normalizedStatus || apiStatus || `HTTP ${response.status}`);
            const batchEntry = perBatchEntry(txId);
            if (batchEntry) {
                // http.batch sends all initiations together and returns once every response is in, so each
                // request's own finish time is derived from its k6 timings relative to the shared send time.
                const timings = response?.timings || {};
                const requestFinishedMs = initiateStarted + Number(timings.blocked || 0) + Number(timings.connecting || 0) +
                    Number(timings.tls_handshaking || 0) + Number(timings.duration || 0);
                batchEntry.initiationStartedAt = new Date(initiateStarted).toISOString();
                batchEntry.initiationFinishedAt = new Date(requestFinishedMs).toISOString();
                batchEntry.initiationApiMs = durationMs;
                batchEntry.initiationStatus = normalizedStatus || apiStatus || `HTTP ${response.status}`;
                batchEntry.batchName = batchEntry.batchName || String(initiatePayload?.data?.batchName || "");
                if (batchEntry.recordCount === null) batchEntry.recordCount = firstCount(initiatePayload?.data?.numberOfPayments, initiatePayload?.data?.batchDetails?.batchNoOfPayments);
                if (isDualAuth && response.status === 200 && String(apiStatus || "").toUpperCase() === "PENDAUTH") {
                    batchEntry.pendingApprovalObservedAt = batchEntry.initiationFinishedAt;
                }
            }
            const expectedCanonicalStatus = canonicalInitiateStatus(expectedStatusAfterInitiate);
            const statusMatchesExpectation = !expectedCanonicalStatus || normalizedStatus === expectedCanonicalStatus;
            const isInProgress = response.status === 200 && isPendingBatchStatus(apiStatus);
            if (response.status !== 200) {
                allInitiated = false;
                logHttpFailure("initiate", {
                    status: response.status,
                    timings: response.timings,
                    url: requestUrl,
                    txId,
                    body: response.body,
                });
            }

            if (isInProgress) {
                console.warn(
                    `[k6][INITIATE][INPROGRESS] txId=${txId} status=${apiStatus || "UNKNOWN"} durationMs=${durationMs.toFixed(0)} url=${requestUrl} request=${safeBodySnippet(requestBody)}`
                );
            }

            if (response.status === 200 && expectedStatusAfterInitiate) {
                if (!statusMatchesExpectation) {
                    allInitiated = false;
                    console.error(
                        `[k6][FAIL][initiate-status] txId=${txId} expectedStatus=${expectedCanonicalStatus || expectedStatusAfterInitiate} actualStatus=${normalizedStatus || "UNKNOWN"} paymentDate=${intBatch.paymentDate} url=${requestUrl} request=${safeBodySnippet(requestBody)} response=${safeBodySnippet(response.body) || "<empty>"}`
                    );
                } else {
                    console.info(
                        `[k6][INITIATE][STATUS] txId=${txId} expectedStatus=${expectedCanonicalStatus || expectedStatusAfterInitiate} actualStatus=${normalizedStatus || "UNKNOWN"} paymentDate=${intBatch.paymentDate}`
                    );
                }
            }

        }

        check(initiateResponses, {
            "all initiations are 200": () => allInitiated,
        });

        const totalInitiationMs = Date.now() - initiateStarted;
        initiationDuration.add(totalInitiationMs);
        execution.timings.initiationMs = totalInitiationMs;
        execution.timings.initiationApiMs = slowestDuration;
        execution.timestamps.initiationEndedAt = new Date().toISOString();
        execution.statuses.initiation = uniqueStatusText(initiationStatuses, allInitiated ? "INITIATED" : "UNKNOWN");
        emitExecutionSnapshot(execution);

        if (!allInitiated) {
            captureActualChildPayments({ ctx, execution, intBatch, fileId, transactionIds, bkRefIds, context: "initiation_failed" });
            setExecutionFailure(execution, {
                stage,
                expectedStatus: expectedInitiateStatus(intBatch.paymentDate) || "200",
                lastStatus: execution.statuses.initiation,
                elapsedMs: execution.timings.initiationMs,
                message: `File initiation failed before the expected status was reached. Last backend status: ${execution.statuses.initiation}`,
            });
            throw new Error(
                `File initiation failed for fileId=${fileId}. ` +
                `parentTransactionId=${slowestTxId} initiationMs=${totalInitiationMs.toFixed(0)} slowestUrl=${slowestUrl} ` +
                `slowestRequest=${safeBodySnippet(slowestRequestBody)}`
            );
        }

        if (afterInitiate) {
            stage = "DUAL_AUTH_APPROVAL";
            const recordsStart = Date.now();
            execution.timestamps.sentStartedAt = new Date(recordsStart).toISOString();
            const dualExpectedStatus = expectedFinalChildStatus(intBatch.paymentDate);
            let result;
            try {
                result = afterInitiate({
                adoToken: ctx.singleAuthAdoAccessToken,
                baseUrl: ctx.baseUrl,
                parentTransactionIds: transactionIds,
                bkRefIds: bkRefIds.length > 0 ? bkRefIds : transactionIds,
                paymentDate: intBatch.paymentDate,
                expectedCount: Number(intBatch.numPayments),
                jar: ctx.jar,
                pendingAuthStartedAt: execution.timestamps.initiationEndedAt,
                recordApproval: ({ startedAt, endedAt, apiMs, status, transactionId }) => {
                    execution.timestamps.approvalStartedAt = execution.timestamps.approvalStartedAt || startedAt;
                    if (status === 200) execution.timestamps.approvalEndedAt = endedAt;
                    execution.timings.approvalApiMs = Math.max(execution.timings.approvalApiMs || 0, apiMs);
                    execution.statuses.approval = `HTTP ${status}`;
                    const batchEntry = perBatchEntry(transactionId);
                    if (batchEntry) {
                        batchEntry.approvalStartedAt = startedAt;
                        batchEntry.approvalFinishedAt = endedAt;
                        batchEntry.approvalApiMs = apiMs;
                        batchEntry.approvalHttpStatus = status;
                    }
                    emitExecutionSnapshot(execution);
                },
                });
            } catch (error) {
                execution.timings.sentMs = Date.now() - recordsStart;
                execution.timestamps.sentEndedAt = new Date().toISOString();
                const validation = captureActualChildPayments({ ctx, execution, intBatch, fileId, transactionIds, bkRefIds, context: "dual_auth_expected_status_not_reached" });
                setExecutionFailure(execution, {
                    stage,
                    expectedStatus: dualExpectedStatus,
                    lastStatus: execution.statuses.sent || execution.statuses.approval || "",
                    elapsedMs: execution.timings.sentMs,
                    message: validation
                        ? `Child payments did not all reach ${dualExpectedStatus} after approval. passed=${validation.buckets.PASSED.length} sent=${validation.sentCount} failed=${validation.buckets.FAILED.length} rejected=${validation.buckets.REJECTED.length} inProgress=${validation.buckets.IN_PROGRESS.length} missing=${validation.shortfall}. ${String(error?.message || error)}`
                        : String(error?.message || error),
                });
                throw error;
            }
            execution.timings.sentMs = Date.now() - recordsStart;
            sentDuration.add(execution.timings.sentMs);
            execution.timestamps.sentEndedAt = new Date().toISOString();
            execution.timings.pendingAuthToFinalMs = result.pendingAuthToFinalMs;
            execution.timestamps.pendingAuthStartedAt = execution.timestamps.initiationEndedAt;
            execution.timestamps.finalStatusObservedAt = result.finalStatusObservedAt;
            execution.statuses.sent = result.expectedStatus;
            execution.requestDetails.ftIds = result.requests;
            const dualValidation = Array.isArray(result.records)
                ? validateBatchRecords(result.records, Number(intBatch.numPayments), dualExpectedStatus)
                : { buckets: { PASSED: result.payments, FAILED: [], REJECTED: [], IN_PROGRESS: [], UNKNOWN: [] }, shortfall: 0, totalValidated: result.payments.length, sentCount: result.payments.filter((payment) => payment.statusCode === "SENT").length };
            execution.payments = paymentsFromValidation(dualValidation);
            execution.status = "PASSED";
            logChildPaymentCounts(fileId, Number(intBatch.numPayments), dualValidation, "dual_auth_final");
            emitRecordsCapture({
                fileId,
                paymentType: intBatch.paymentType,
                railType: intBatch.railType,
                parentTransactionIds: transactionIds,
                bkRefIds,
                meta: result.meta,
                expectedTotal: Number(intBatch.numPayments),
                shortfall: dualValidation.shortfall,
                sentCount: dualValidation.sentCount,
                buckets: dualValidation.buckets,
            });
            return;
        }

        stage = "SENT";
        // /batches only returns the parent transaction ID for the whole batch file (used to
        // initiate); the individual payments inside are never listed there. The per-payment FT
        // IDs only appear once we call /records, so the number of payments we generated for this
        // file (intBatch.numPayments) is the only expected count we can validate against.
        const expectedRecordCount = Number(intBatch.numPayments || 0);

        // BKREF (the BK-prefixed batch reference) is what /records expects, not transactionId;
        // fall back to transactionIds only if no BK reference was found on the batch rows.
        const recordsBkrefs = bkRefIds.length > 0 ? bkRefIds : transactionIds;

        // Fetch FT IDs (refId) for every initiated payment and bucket them by outcome. Records
        // can lag briefly behind initiation, so poll until the expected payment count shows up.
        const recordsPageSize = envNumber(["K6_RECORDS_PAGE_SIZE"], Math.min(100, Math.max(10, expectedRecordCount)));
        const recordsPollTimeoutMs = maxDurationMs;
        const recordsPollIntervalMs = pollingIntervalMs;
        const recordsStart = Date.now();
        const expectedFinalStatus = expectedFinalChildStatus(intBatch.paymentDate);
        execution.timestamps.sentStartedAt = new Date(recordsStart).toISOString();
        const {
            validation,
            attempts: recordsAttempts,
            meta: recordsMeta,
            requests: recordsRequests,
            timedOut: sentTimedOut,
        } = fetchAndValidateBatchRecordsWithRetry(
            ctx.baseUrl,
            ctx.authHeaders,
            recordsBkrefs,
            expectedRecordCount,
            recordsPageSize,
            recordsPollTimeoutMs,
            recordsPollIntervalMs,
            ctx.jar,
            expectedFinalStatus
        );
        sentDuration.add(Date.now() - recordsStart);
        execution.timings.sentMs = Date.now() - recordsStart;
        execution.timestamps.sentEndedAt = new Date().toISOString();


        const finalValidation = validation;
        execution.statuses.sent = validationStatusText(finalValidation);
        execution.requestDetails.ftIds = recordsRequests;
        execution.payments = paymentsFromValidation(finalValidation);
        if (!sentTimedOut && execution.payments.length === expectedRecordCount && expectedRecordCount > 0 &&
            execution.payments.every((payment) => canonicalInitiateStatus(payment.statusCode) === expectedFinalStatus)) {
            execution.timestamps.finalStatusObservedAt = execution.timestamps.sentEndedAt;
            execution.timings.pendingInitiToFinalMs = new Date(execution.timestamps.sentEndedAt).getTime() -
                new Date(execution.timestamps.pendinitEndedAt).getTime();
        }
        emitExecutionSnapshot(execution);

        check(true, {
            "no failed payments after initiation": () => finalValidation.buckets.FAILED.length === 0,
            "no rejected payments after initiation": () => finalValidation.buckets.REJECTED.length === 0,
            "record count matches expected payment count": () => finalValidation.shortfall === 0,
            [`all payment records reached ${expectedFinalStatus}`]: () => finalValidation.buckets.IN_PROGRESS.length === 0,
            [`${expectedFinalStatus} completed within maximum duration`]: () => !sentTimedOut,
        });

        if (finalValidation.shortfall > 0) {
            console.error(
                `[k6][RECORDS][MISSING] fileId=${fileId} attempts=${recordsAttempts} pollTimeoutMs=${recordsPollTimeoutMs} ` +
                `expected=${expectedRecordCount} actual=${finalValidation.totalValidated} shortfall=${finalValidation.shortfall}`
            );
        }

        if (finalValidation.buckets.IN_PROGRESS.length > 0) {
            console.warn(
                `[k6][RECORDS][INPROGRESS] fileId=${fileId} attempts=${recordsAttempts} pollTimeoutMs=${recordsPollTimeoutMs} ` +
                `count=${finalValidation.buckets.IN_PROGRESS.length}`
            );
        }

        if (finalValidation.buckets.IN_PROGRESS.length > 0 || finalValidation.buckets.FAILED.length > 0 || finalValidation.buckets.REJECTED.length > 0) {
            console.warn(
                `[k6][RECORDS][DETAILS] fileId=${fileId} record-level details saved to the run artifact and HTML report`
            );
        }

        logChildPaymentCounts(fileId, expectedRecordCount, finalValidation, "single_auth_final");

        emitRecordsCapture({
            fileId,
            paymentType: intBatch.paymentType,
            railType: intBatch.railType,
            parentTransactionIds: transactionIds,
            bkRefIds,
            meta: recordsMeta,
            expectedTotal: expectedRecordCount,
            shortfall: finalValidation.shortfall,
            sentCount: finalValidation.sentCount,
            buckets: finalValidation.buckets,
        });

        if (finalValidation.shortfall > 0 || finalValidation.buckets.IN_PROGRESS.length > 0 || sentTimedOut) {
            const lastStatuses = finalValidation.buckets.IN_PROGRESS
                .map((record) => record.statusCode)
                .filter(Boolean);
            const lastStatus = uniqueStatusText(lastStatuses, execution.statuses.sent || "RECORDS_MISSING");
            if (sentTimedOut) {
                execution.timeouts.sent = { timeoutMs: recordsPollTimeoutMs, elapsedMs: execution.timings.sentMs };
            }
            setExecutionFailure(execution, {
                stage,
                expectedStatus: expectedFinalStatus,
                lastStatus,
                timeoutMs: recordsPollTimeoutMs,
                elapsedMs: execution.timings.sentMs,
                message: `FT-ID records did not reach ${expectedFinalStatus} before the polling duration expired. Last backend status: ${lastStatus}; expected=${expectedRecordCount} actual=${finalValidation.totalValidated} passed=${finalValidation.buckets.PASSED.length} sent=${finalValidation.sentCount} failed=${finalValidation.buckets.FAILED.length} rejected=${finalValidation.buckets.REJECTED.length} inProgress=${finalValidation.buckets.IN_PROGRESS.length} shortfall=${finalValidation.shortfall}`,
            });
            throw new Error(execution.failure.message);
        }

        if (finalValidation.buckets.FAILED.length > 0 || finalValidation.buckets.REJECTED.length > 0) {
            setExecutionFailure(execution, {
                stage,
                expectedStatus: expectedFinalStatus,
                lastStatus: execution.statuses.sent,
                elapsedMs: execution.timings.sentMs,
                message: `${finalValidation.buckets.FAILED.length + finalValidation.buckets.REJECTED.length} of ${expectedRecordCount} child payment(s) did not reach ${expectedFinalStatus}. passed=${finalValidation.buckets.PASSED.length} sent=${finalValidation.sentCount} failed=${finalValidation.buckets.FAILED.length} rejected=${finalValidation.buckets.REJECTED.length}`,
            });
        } else {
            execution.status = "PASSED";
        }

        console.log(
            `[k6][PASS] file=${intBatch.fileDisplayName} fileId=${fileId} payments=${transactionIds.length} paymentType=${intBatch.paymentType} rail=${intBatch.railType}`
        );
    } catch (error) {
        flowOk = false;
        if (!execution.failure) {
            setExecutionFailure(execution, {
                stage,
                elapsedMs: Date.now() - started,
                message: String(error?.message || error),
            });
        }
        emitExecutionSnapshot(execution);
        console.error(`[k6][FAIL] ${error.message || String(error)}`);
    } finally {
        totalFlowDuration.add(Date.now() - started);
        flowFailureRate.add(!flowOk);
        emitExecutionSnapshot(execution);
    }
}

function redactRuntimeValue(value, key = "") {
    const sensitive = /password|secret|authorization|bearer|cookie|token|jwt|otp|signature|sasurl|sas_url|sso_staging|idempotency|biotoken|access_token|client_secret/i.test(key);
    if (sensitive) return "<redacted>";
    if (Array.isArray(value)) return value.map((item) => redactRuntimeValue(item, key));
    if (value && typeof value === "object") {
        const result = {};
        Object.entries(value).forEach(([childKey, childValue]) => {
            result[childKey] = redactRuntimeValue(childValue, childKey);
        });
        return result;
    }
    return value;
}

function safeRuntimeBody(body, key = "body") {
    if (body === undefined || body === null || body === "") return "<empty>";
    if (typeof body !== "string") return JSON.stringify(redactRuntimeValue(body, key));
    try {
        return JSON.stringify(redactRuntimeValue(JSON.parse(body), key));
    } catch {
        if (/csv|xml|password|token|cookie|otp|secret/i.test(key)) return `<${key} omitted>`;
        return safeSasErrorSnippet(body);
    }
}

function safeRuntimeHeaders(headers) {
    const result = {};
    Object.keys(headers || {}).forEach((key) => {
        result[key] = /authorization|cookie|token|secret|otp|sso_staging|idempotency|biotoken/i.test(key) ? "<redacted>" : headers[key];
    });
    return result;
}

export function logRuntimeExchange(step, method, url, requestHeaders, requestBody, response) {
    const safeUrl = String(url || "").replace(/([?&](?:sig|se|sp|sv|sr|token|key)=[^&]*)/gi, "$1=<redacted>");
    console.info(`[k6][trace][${step}] request=${JSON.stringify({ method, url: safeUrl, headers: safeRuntimeHeaders(requestHeaders), body: safeRuntimeBody(requestBody) })}`);
    console.info(`[k6][trace][${step}] response=${JSON.stringify({ status: response?.status, headers: safeRuntimeHeaders(response?.headers), body: safeRuntimeBody(response?.body, "response") })}`);
}

function runtimeValue(key) {
    return envText([key]) || envFileText([key]);
}

function endpointHost(value) {
    return String(value || "").replace(/^[a-z]+:\/\//i, "").split("/")[0];
}

const selectedEnv = String(__ENV.ENV || "").trim().toUpperCase();
if (selectedEnv !== "SIT" && selectedEnv !== "UAT") {
    throw new Error("Unsupported environment. Use ENV=SIT or ENV=UAT.");
}

const ENVIRONMENTS = {
    SIT: {
        authBaseUrl: runtimeValue("SIT_AUTH_URL"),
        batchBaseUrl: runtimeValue("SIT_CAPI_URL"),
        paymentsBaseUrl: runtimeValue("SIT_BAPI_URL"),
        password: runtimeValue("SIT_LOGIN_PASSWORD"),
        singleAuthCompany: runtimeValue("SIT_SINGLE_AUTH_COMPANY"),
        singleAuthIniLoginginId: runtimeValue("SIT_SINGLE_AUTH_INI_LOGINGIN_ID"),
        singleAuthIniUsername: runtimeValue("SIT_SINGLE_AUTH_INI_USERNAME"),
        singleAuthIniGCN: runtimeValue("SIT_SINGLE_AUTH_INI_GCN"),
        dualAuthCompany: runtimeValue("SIT_DUAL_AUTH_COMPANY"),
        dualAuthIniLoginginId: runtimeValue("SIT_DUAL_AUTH_INI_LOGINGIN_ID"),
        dualAuthIniUsername: runtimeValue("SIT_DUAL_AUTH_INI_USERNAME"),
        dualAuthIniGCN: runtimeValue("SIT_DUAL_AUTH_INI_GCN"),
        dualAuthAppLoginginId: runtimeValue("SIT_DUAL_AUTH_APP_LOGINGIN_ID"),
        dualAuthAppUsername: runtimeValue("SIT_DUAL_AUTH_APP_USERNAME"),
        dualAuthAppGCN: runtimeValue("SIT_DUAL_AUTH_APP_GCN"),
        initialOtp: runtimeValue("SIT_OTP") || envText(["K6_OTP", "OTP"]),
    },
    UAT: {
        authBaseUrl: runtimeValue("UAT_AUTH_URL"),
        batchBaseUrl: runtimeValue("UAT_CAPI_URL"),
        paymentsBaseUrl: runtimeValue("UAT_BAPI_URL"),
        password: runtimeValue("UAT_LOGIN_PASSWORD"),
        singleAuthCompany: runtimeValue("UAT_SINGLE_AUTH_COMPANY"),
        singleAuthIniLoginginId: runtimeValue("UAT_SINGLE_AUTH_INI_LOGINGIN_ID"),
        singleAuthIniUsername: runtimeValue("UAT_SINGLE_AUTH_INI_USERNAME"),
        singleAuthIniGCN: runtimeValue("UAT_SINGLE_AUTH_INI_GCN"),
        dualAuthCompany: runtimeValue("UAT_DUAL_AUTH_COMPANY"),
        dualAuthIniLoginginId: runtimeValue("UAT_DUAL_AUTH_INI_LOGINGIN_ID"),
        dualAuthIniUsername: runtimeValue("UAT_DUAL_AUTH_INI_USERNAME"),
        dualAuthIniGCN: runtimeValue("UAT_DUAL_AUTH_INI_GCN"),
        dualAuthAppLoginginId: runtimeValue("UAT_DUAL_AUTH_APP_LOGINGIN_ID"),
        dualAuthAppUsername: runtimeValue("UAT_DUAL_AUTH_APP_USERNAME"),
        dualAuthAppGCN: runtimeValue("UAT_DUAL_AUTH_APP_GCN"),
        initialOtp: runtimeValue("UAT_OTP") || envText(["K6_OTP", "OTP"]),
    },
};

const environmentConfig = ENVIRONMENTS[selectedEnv];