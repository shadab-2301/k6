import { After, AfterAll, BeforeAll, Status, setDefaultTimeout } from "@cucumber/cucumber";
import { LOG_ERROR, LOG_SUCCESS } from "playwright-with-cucumber-checks";
import { cleanup } from "playwright-with-cucumber-checks/dist/web-driver-manager";

import { testReportingDetails } from "../../../global-variables";
import { getCurrentScenarioTestCaseIds } from "../step-definitions/shared/test-plan-reporting";
import { disposeAppApiContext } from "../../src/modules/shared/api/api-context-manager";
import { initAzureDevOpsContext, disposeAzureDevOpsContext } from "../../src/modules/shared/api/azure-devops-context";
import TeamsNotification from "../../src/utilities/utilities/teams-notification";
import { resolveEnvironment } from "../../helper/environment-handler";
require("dotenv").config({ path: ".env.secrets" });
require("dotenv").config({ path: ".env.creds" });
require("dotenv").config({ path: ".env.platform" });

// Set API_ONLY before any BeforeAll hooks run (hooks.ts checks this)
process.env.API_ONLY = "true";

const defaultTimeout = Number(process.env.DEFAULT_TIMEOUT) || 240000;
setDefaultTimeout(defaultTimeout);

function stripAnsi(str: string): string {
    return str.replace(
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        ""
    );
}

function resolveModuleName(uri: string | undefined): string {
    if (!uri) return "Unknown";
    const normalized = uri.replace(/\\/g, "/");
    const marker = "features/";
    const idx = normalized.indexOf(marker);
    if (idx === -1) return "Unknown";
    const parts = normalized.slice(idx + marker.length).split("/").filter(Boolean);
    if (parts.length === 0) return "Unknown";
    const toTitleCase = (s: string) => s.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    if (parts[0].toLowerCase() === "api" && parts.length > 1) {
        return `API - ${toTitleCase(parts[1])}`;
    }
    return toTitleCase(parts[0]);
}

BeforeAll(async () => {
    // Resolve environment: pipeline ENVIRONMENT_TIER > legacy ENVIROMENT_BASE_URL > config.ini
    const envKey = resolveEnvironment();
    console.log(`[API Hooks] API-only mode: environment = ${envKey}. No browser launched.`);

    // Initialize Azure DevOps API context for test result publishing
    await initAzureDevOpsContext();
    console.log("[API Hooks] Azure DevOps API context created for test result publishing.");
});

After(async function (scenario) {
    const scenarioTestCaseIds = getCurrentScenarioTestCaseIds();

    if (scenario.result!.status == Status.FAILED) {
        LOG_ERROR(`Scenario executed: ${scenario.pickle.name}  | Status - Failed`);
        let errorLog = "";
        if (scenario.result && scenario.result.exception) {
            const ex = scenario.result.exception as any;
            errorLog = ex?.stack || ex?.message || String(scenario.result.exception);
        }
        testReportingDetails.data.forEach(item => {
            if (scenarioTestCaseIds.includes(item.testCaseId)) {
                item.status = "Failed";
                (item as any).failureLogs = errorLog;
            }
        });
        TeamsNotification.recordResult(scenario.pickle.name, "Failed", resolveModuleName(scenario.pickle.uri), errorLog);
    }
    if (scenario.result!.status == Status.PASSED) {
        LOG_SUCCESS(`Scenario executed: ${scenario.pickle.name} | Status - Passed`);
        testReportingDetails.data.forEach(item => {
            if (scenarioTestCaseIds.includes(item.testCaseId)) {
                item.status = "Passed";
            }
        });
        TeamsNotification.recordResult(scenario.pickle.name, "Passed", resolveModuleName(scenario.pickle.uri));
    }
});

AfterAll(async () => {
    try {
        await cleanup();
    } catch { /* ignore */ }

    try {
        await disposeAzureDevOpsContext();
    } catch { /* ignore */ }

    try {
        await disposeAppApiContext();
    } catch { /* ignore */ }

    try {
        await TeamsNotification.sendSuiteSummary();
    } catch (e) {
        console.error("Teams notification error", e);
    }
});
