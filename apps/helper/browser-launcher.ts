import { config } from "playwright-with-cucumber-checks";
import launchBrowser, { page } from "playwright-with-cucumber-checks/dist/web-driver-manager";
import { Page } from "playwright";
import { resolveEnvironment, resolveUiBaseUrl } from "./environment-handler";

let launched = false;
const defaultTimeout = Number(process.env.DEFAULT_TIMEOUT) || 240000;

function resolveTargetUrl(): string {
    const url = resolveUiBaseUrl();
    if (!url) {
        throw new Error("[BrowserLauncher] No UI base URL resolved. Set ENVIRONMENT_TIER and matching UI URL variables such as UAT_URL/SIT_URL or TST_URL/STG_URL.");
    }
    return url;
}

/**
 * Launches the browser without navigating to any URL.
 * The page will be on about:blank so that page object constructors in Before hooks
 * can safely call page.frameLocator() / page.locator() without throwing, while
 * avoiding stale login-page iframe state during long API steps.
 * Navigation to the actual target URL is deferred to the
 * 'I switch to the browser' step.
 */
export async function launchBrowserOnly(): Promise<void> {
    if (launched) return;

    const envKey = resolveEnvironment();
    (config as any).BASEURL = envKey;
    const realUrl = resolveTargetUrl();

    // playwright-with-cucumber-checks launchBrowser() ALWAYS navigates to
    // process.env.ENVIROMENT_BASE_URL on launch. Temporarily override it to
    // "about:blank" so the browser starts with a live `page` reference
    // (required by page-object constructors in Before hooks) but never contacts
    // the auth server. The first real navigation to the login URL happens only
    // at "I switch to the browser", keeping every scenario completely clean.
    process.env.ENVIROMENT_BASE_URL = "about:blank";
    console.log(`[BrowserLauncher] Launching browser on about:blank (app URL deferred to 'I switch to the browser').`);
    await launchBrowser(defaultTimeout);
    launched = true;

    // Restore the real URL so ensureBrowserLaunched navigates to the right target.
    process.env.ENVIROMENT_BASE_URL = realUrl;
    console.log(`[BrowserLauncher] Browser ready on about:blank. Real URL restored: ${realUrl}`);
}

export async function ensureBrowserLaunched(options?: {
    targetUrl?: string;
    forceNavigate?: boolean;
}): Promise<void> {
    const envKey = resolveEnvironment();
    const resolvedUrl = options?.targetUrl || resolveTargetUrl();

    (config as any).BASEURL = envKey;
    process.env.ENVIROMENT_BASE_URL = resolvedUrl;

    if (!launched) {
        console.log(`[BrowserLauncher] Environment tier: ${envKey}`);
        console.log(`[BrowserLauncher] URL: ${resolvedUrl}`);
        await launchBrowser(defaultTimeout);
        launched = true;
    }

    const currentPage = page as Page;
    if (!currentPage.isClosed()) {
        const shouldNavigate = options?.forceNavigate || !currentPage.url().includes(resolvedUrl);
        if (shouldNavigate) {
            console.log("[BrowserLauncher] Navigating browser to target URL...");
            await currentPage.goto(resolvedUrl, { timeout: defaultTimeout });
        }
        console.log("[BrowserLauncher] Navigation complete. Current URL:", currentPage.url());
    } else {
        throw new Error("[BrowserLauncher] Browser page is closed after launch. Unable to navigate.");
    }

    console.log("[BrowserLauncher] Browser ready for UI interactions.");
}

export function isNavigatedToTarget(): boolean {
    return launched;
}

export function resetBrowserLaunchState(): void {
    launched = false;
}
