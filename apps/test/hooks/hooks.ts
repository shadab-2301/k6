import { After, AfterAll, AfterStep, BeforeAll, Status, setDefaultTimeout } from "@cucumber/cucumber";
import { LOG_ERROR, LOG_SUCCESS } from "playwright-with-cucumber-checks";
import launchBrowser, { cleanup, page } from "playwright-with-cucumber-checks/dist/web-driver-manager";
import AzureIntegration from "../../helper/azure-integration";
import Action from "../../helper/actions";
import { testReportingDetails } from "../../../global-variables";
import ApolloDashboard from "../../src/modules/dashboard/pages/apollo-dashboard-page";
import { Page } from "playwright";
import { getCurrentScenarioTestCaseIds } from "../step-definitions/shared/test-plan-reporting";
import { disposeAppApiContext } from "../../src/modules/shared/api/api-context-manager";
import { initAzureDevOpsContext, disposeAzureDevOpsContext } from "../../src/modules/shared/api/azure-devops-context";
import TeamsNotification from "../../src/utilities/utilities/teams-notification";
import { resolveEnvironment, resolveUiBaseUrl } from "../../helper/environment-handler";
require("dotenv").config({ path: ".env.secrets" });
require("dotenv").config({ path: ".env.creds" });
require("dotenv").config({ path: ".env.platform" });

const defaultTimeout = Number(process.env.DEFAULT_TIMEOUT) || 240000;

setDefaultTimeout(defaultTimeout);
let latestScreenShot: string;

// Utility to strip ANSI color codes from error messages
function stripAnsi(str: string): string {
    return str.replace(
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        ''
    );
}

// Derives a human-readable "module" name (e.g. "Accounts", "API - Accounts") from a
// scenario's feature file path, e.g. "apps/test/features/accounts/foo.feature" -> "Accounts".
// Used to group failures by module in the Teams notification.
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
    if (process.env.HYBRID === "true") {
        console.log("[Hooks] Hybrid mode: browser managed by hybrid-hooks.ts, skipping.");
        return;
    }

    // Resolve environment: pipeline ENVIRONMENT_TIER > legacy ENVIROMENT_BASE_URL > config.ini
    const envKey = resolveEnvironment();
    const resolvedUrl = resolveUiBaseUrl();
    // Set config.BASEURL to the tier key (STG/TST/DEV) for API config lookups
    try {
        const { config: pwConfig } = require("playwright-with-cucumber-checks");
        (pwConfig as any).BASEURL = envKey;
    } catch { }
    process.env.ENVIROMENT_BASE_URL = resolvedUrl;

    console.log(`[Hooks] Environment tier: ${envKey} → ${resolvedUrl}`);

    if (process.env.API_ONLY === "true") {
        console.log("[Hooks] API-only mode: skipping browser launch.");
        return;
    }

    await launchBrowser(defaultTimeout);

    // Initialize Azure DevOps API context for test result publishing
    await initAzureDevOpsContext();
});

After(async function (scenario) {
    const scenarioTestCaseIds = getCurrentScenarioTestCaseIds();

    if (scenario.result!.status == Status.FAILED) {
        LOG_ERROR(`Scenario executed: ${scenario.pickle.name}  | Status - Failed`);
        let errorLog = '';
        if (scenario.result && scenario.result.exception) {
            const ex = scenario.result.exception as any;
            if (ex && typeof ex.stack === 'string' && ex.stack.length > 0) {
                errorLog = ex.stack;
            } else if (ex && typeof ex.message === 'string' && ex.message.length > 0) {
                errorLog = ex.message;
            } else {
                errorLog = String(scenario.result.exception);
            }
        }
        // Update ALL test case IDs from this scenario
        testReportingDetails.data.forEach(item => {
            if (scenarioTestCaseIds.includes(item.testCaseId)) {
                item.status = "Failed";
                (item as any).failureLogs = errorLog;
            }
        });
        await Action.WriteToJsonFile("test/data/test-plan-meta.json", testReportingDetails.data);
        TeamsNotification.recordResult(scenario.pickle.name, "Failed", resolveModuleName(scenario.pickle.uri), errorLog);
    }
    if (scenario.result!.status == Status.PASSED) {
        LOG_SUCCESS(`Scenario executed: ${scenario.pickle.name} | Status - Passed`);
        // Update ALL test case IDs from this scenario
        testReportingDetails.data.forEach(item => {
            if (scenarioTestCaseIds.includes(item.testCaseId)) {
                item.status = "Passed";
            }
        });
        await Action.WriteToJsonFile("test/data/test-plan-meta.json", testReportingDetails.data);
        TeamsNotification.recordResult(scenario.pickle.name, "Passed", resolveModuleName(scenario.pickle.uri));
    }

    if (process.env.API_ONLY !== "true") {
        await safeLogout();
    }
});

AfterStep(async function (scenario) {
    if (process.env.API_ONLY === "true") return;

    // Only take screenshots for web tests (not mobile)
    // You may need to adjust this condition based on your project
    const isWeb = !process.env.TEST_PLATFORM || process.env.TEST_PLATFORM === 'web';
    if (!isWeb) return;

    const scenarioTestCaseIds = getCurrentScenarioTestCaseIds();
    let errorLog = '';
    if (scenario.result && scenario.result.status === Status.FAILED && scenario.result.exception) {
        const ex = scenario.result.exception as any;
        errorLog = (ex && (ex.stack || ex.message)) ? (ex.stack || ex.message) : String(scenario.result.exception);
        // Strip ANSI codes before attaching
        await this.attach(stripAnsi(errorLog), 'text/plain');
    }
    // Only take and attach screenshot for failed steps to reduce data
    if (scenario.result?.status === Status.FAILED) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const screenshotPath = `screenshots/screenshot-step-failed.png`;
            latestScreenShot = (await page.screenshot({ path: screenshotPath, fullPage: true })).toString("base64");
            await this.attach(latestScreenShot, 'image/png');
            // Attach screenshot to ALL test cases in this scenario
            testReportingDetails.data.forEach(item => {
                if (scenarioTestCaseIds.includes(item.testCaseId)) {
                    (item as any).failureScreenshot = latestScreenShot;
                }
            });
        } catch (e) {
            // Optionally log screenshot errors
        }
    }
});

AfterAll(async () => {
    try {
        await AzureIntegration.publishTestResults();
    } catch (e) {
        console.error("Publish error", e);
    }

    if (process.env.API_ONLY !== "true") {
        try {
            if (page && !(page as Page).isClosed()) {
                await page.unrouteAll({ behavior: "ignoreErrors" });
            }
        } catch { /* ignore */ }

        try {
            await cleanup();
        } catch (e) {
            console.warn("Cleanup skipped/failed", e);
        }
    }


    try {
        await disposeAzureDevOpsContext();
    } catch { /* ignore */ }

    // Dispose the dedicated application-API context (separate from the Azure DevOps
    // reporting context above), if it was ever created during this run.
    try {
        await disposeAppApiContext();
    } catch { /* ignore */ }

    // Post the suite results summary to Teams (skipped automatically if TEAMS_WEBHOOK_URL
    // isn't set, or if the TEAMS_NOTIFY_ON_FAIL/TEAMS_NOTIFY_ON_PASS toggles suppress it).
    try {
        await TeamsNotification.sendSuiteSummary();
    } catch (e) {
        console.error("Teams notification error", e);
    }
});

async function safeLogout() {
    try {
        if (!page || (page as Page).isClosed()) return;
        await ApolloDashboard.logout();
    } catch (e) {
        console.warn("WARN: logout skipped (page closed or navigation blocked)");
    }
}

export { page };
