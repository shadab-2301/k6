import { config } from "playwright-with-cucumber-checks";
import launchBrowser, { cleanup, page } from "playwright-with-cucumber-checks/dist/web-driver-manager";
import { baseUrl } from "../config/env-variables.configs";
import { resolveEnvironment } from "./environment-handler";

/**
 * BrowserManager — utility for checking browser state.
 *
 * In hybrid mode, the browser is launched eagerly in hybrid-hooks.ts BeforeAll.
 * This module provides status-checking helpers and cleanup, but does NOT
 * launch the browser or modify shared state (ENVIROMENT_BASE_URL, config.BASEURL).
 *
 * Usage in step definitions:
 *   import { isBrowserLaunched } from "../../helper/browser-manager";
 *   if (isBrowserLaunched()) { ... }
 *
 * @author Shadab Anwar
 */

let browserLaunched = false;

/**
 * Mark the browser as launched. Called by hybrid-hooks.ts after launchBrowser().
 */
export function markBrowserLaunched(): void {
  browserLaunched = true;
}

/**
 * Returns whether the browser has been launched.
 */
export function isBrowserLaunched(): boolean {
  return browserLaunched;
}

/**
 * Resets the browser state. Called in AfterAll hook.
 */
export function resetBrowserState(): void {
  browserLaunched = false;
}
