import { After, AfterAll, AfterStep, BeforeAll, Before, Status, setDefaultTimeout } from "@cucumber/cucumber";
import { LOG_ERROR, LOG_SUCCESS, config } from "playwright-with-cucumber-checks";
import { cleanup, page } from "playwright-with-cucumber-checks/dist/web-driver-manager";
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
import { resetBrowserLaunchState, ensureBrowserLaunched, isNavigatedToTarget, launchBrowserOnly } from "../../helper/browser-launcher";
// Load env files FIRST — before any module reads process.env
require("dotenv").config({ path: ".env.secrets" });
require("dotenv").config({ path: ".env.creds" });
require("dotenv").config({ path: ".env.platform" });

// Signal to hooks.ts to skip its own BeforeAll — hybrid-hooks.ts manages the browser
process.env.HYBRID = "true";

const defaultTimeout = Number(process.env.DEFAULT_TIMEOUT) || 240000;
setDefaultTimeout(defaultTimeout);
let latestScreenShot: string;

// Cache environment settings to avoid re-computation
let cachedEnvValue: string = "";
let cachedResolvedUrl: string = "";

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

function scenarioHasSwitchToWebStep(scenario: any): boolean {
    if (!scenario || !scenario.pickle || !scenario.pickle.steps) {
        return false;
    }
    const steps = scenario.pickle.steps as any[];
    return steps.some(step => {
        const text = (step.text || "").toLowerCase();
        return text.includes("switch to the browser");
    });
}

BeforeAll(async () => {
    const envKey = resolveEnvironment();
    const resolvedUrl = resolveUiBaseUrl();
    (config as any).BASEURL = envKey;
    process.env.ENVIROMENT_BASE_URL = resolvedUrl;

    cachedEnvValue = envKey;
    cachedResolvedUrl = resolvedUrl;

    console.log(`[Hybrid Hooks] Environment tier: ${envKey}`);
    console.log(`[Hybrid Hooks] URL: ${resolvedUrl}`);
    console.log("[Hybrid Hooks] Browser launch deferred until: And I switch to the browser (if present in scenario)");

    await initAzureDevOpsContext();

    console.log("[Hybrid Hooks] Ready for API + UI steps.");
});

// Per-scenario Before hook: Smart browser management
// - API-only: NO browser (zero launch)
// - Hybrid: Bootstrap browser (step files need it for page object instantiation)
Before(async function (scenario) {
    try {
        console.log(`[Hybrid Hooks] Scenario started: ${scenario.pickle.name}`);

        const needsBrowser = scenarioHasSwitchToWebStep(scenario);

        if (needsBrowser) {
            // Enforce a fresh browser instance for every hybrid scenario.
            // If a previous run left resources behind, clean them before relaunch.
            try {
                await cleanup();
            } catch {
                // Ignore cleanup failures here; launchBrowserOnly will still attempt a fresh launch.
            }
            resetBrowserLaunchState();

            // Launch the browser so that page object Before hooks (which call
            // page.frameLocator / page.locator) have a live 'page' reference.
            // We intentionally do NOT navigate anywhere — the page stays on about:blank.
            // This prevents the login-page sideload iframe from staling during the
            // 2–4 min API-step phase. The actual navigation to the login URL happens
            // only at the 'I switch to the browser' step, ensuring a fresh iframe load.
            console.log("[Hybrid Hooks] 🌐 Hybrid scenario: launching browser (no navigation — deferred to 'I switch to the browser' step).");
            try {
                await launchBrowserOnly();
                console.log("[Hybrid Hooks] ✓ Browser ready (about:blank). Login URL navigation deferred.");
            } catch (err) {
                console.error("[Hybrid Hooks] ✗ Browser launch failed:", err);
                throw err;
            }
        } else {
            console.log("[Hybrid Hooks] ✓ API-only scenario: no browser will be launched.");
        }
    } catch (err) {
        console.warn("[Hybrid Hooks] Before hook error:", err);
        throw err;
    }
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
        await Action.WriteToJsonFile("test/data/test-plan-meta.json", testReportingDetails.data);
        TeamsNotification.recordResult(scenario.pickle.name, "Failed", resolveModuleName(scenario.pickle.uri), errorLog);
    }
    if (scenario.result!.status == Status.PASSED) {
        LOG_SUCCESS(`Scenario executed: ${scenario.pickle.name} | Status - Passed`);
        testReportingDetails.data.forEach(item => {
            if (scenarioTestCaseIds.includes(item.testCaseId)) {
                item.status = "Passed";
            }
        });
        await Action.WriteToJsonFile("test/data/test-plan-meta.json", testReportingDetails.data);
        TeamsNotification.recordResult(scenario.pickle.name, "Passed", resolveModuleName(scenario.pickle.uri));
    }

    await safeLogout();

    if (isNavigatedToTarget()) {
        try {
            await cleanup();
            console.log("[Hybrid Hooks] Browser closed after scenario.");
        } catch (e) {
            console.warn("[Hybrid Hooks] Browser cleanup after scenario failed:", e);
        } finally {
            resetBrowserLaunchState();
        }
    }
});

AfterStep(async function (scenario) {
    const isWeb = !process.env.TEST_PLATFORM || process.env.TEST_PLATFORM === "web";
    if (!isWeb) return;

    const scenarioTestCaseIds = getCurrentScenarioTestCaseIds();
    if (scenario.result && scenario.result.status === Status.FAILED && scenario.result.exception) {
        const ex = scenario.result.exception as any;
        const errorLog = ex?.stack || ex?.message || String(scenario.result.exception);
        await this.attach(stripAnsi(errorLog), "text/plain");
    }
    if (scenario.result?.status === Status.FAILED) {
        try {
            const screenshotPath = `screenshots/screenshot-step-failed.png`;
            latestScreenShot = (await page.screenshot({ path: screenshotPath, fullPage: true })).toString("base64");
            await this.attach(latestScreenShot, "image/png");
            testReportingDetails.data.forEach(item => {
                if (scenarioTestCaseIds.includes(item.testCaseId)) {
                    (item as any).failureScreenshot = latestScreenShot;
                }
            });
        } catch { /* ignore */ }
    }
});

AfterAll(async () => {
    try { await AzureIntegration.publishTestResults(); } catch { /* ignore */ }

    try {
        if (page && !(page as Page).isClosed()) {
            await page.unrouteAll({ behavior: "ignoreErrors" });
        }
    } catch { /* ignore */ }

    if (isNavigatedToTarget()) {
        try { await cleanup(); } catch { /* ignore */ }
        resetBrowserLaunchState();
    }
    try { await disposeAzureDevOpsContext(); } catch { /* ignore */ }
    try { await disposeAppApiContext(); } catch { /* ignore */ }
    try { await TeamsNotification.sendSuiteSummary(); } catch { /* ignore */ }
});

async function safeLogout() {
    try {
        if (!page || (page as Page).isClosed()) return;
        await ApolloDashboard.logout();
    } catch {
        console.warn("WARN: logout skipped (page closed or navigation blocked)");
    }
}

export { page };
