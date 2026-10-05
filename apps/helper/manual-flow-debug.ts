/**
 * Simple Manual Flow Debug Script
 * Just launches the browser and enters login credentials
 */

import { chromium } from "playwright";

async function debug() {
    console.log("\n[MANUAL-FLOW] Launching browser...");

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Navigate to login
        console.log("[MANUAL-FLOW] Navigating to login page...");
        await page.goto("https://logintest.secure.investec.com/login-wpaas/form", {
            waitUntil: "domcontentloaded",
            timeout: 30000
        });

        console.log("[MANUAL-FLOW] ✓ Page loaded");

        // Wait a moment for frames to load
        await page.waitForTimeout(2000);

        // List all frames
        console.log("[MANUAL-FLOW] Frames on page:");
        const allFrames = page.frames();
        console.log(`[MANUAL-FLOW]   Total frames: ${allFrames.length}`);
        for (let i = 0; i < allFrames.length; i++) {
            console.log(`[MANUAL-FLOW]   Frame ${i}: ${allFrames[i].url()}`);
        }

        // Try to find the appIframe
        let appFrame: any = null;
        try {
            appFrame = page.frameLocator("#appIframe").last();
            console.log("[MANUAL-FLOW] ✓ Found appIframe");
        } catch (e) {
            console.log("[MANUAL-FLOW] Could not locate appIframe, using main frame");
        }

        const targetFrame = appFrame || page.mainFrame();

        // Try to find login inputs
        console.log("[MANUAL-FLOW] Looking for username field...");

        // Wait for inputs to be available
        try {
            await targetFrame.locator("input").first().waitFor({ timeout: 5000 });
            console.log("[MANUAL-FLOW] ✓ Input fields available");
        } catch (e) {
            console.log("[MANUAL-FLOW] ⚠️ Inputs not found via waitFor");
        }

        // Get credentials
        const username = process.env.BEW_SIngleAuth || "test_user";
        const password = process.env.PASSWORD || "test_password";

        console.log("[MANUAL-FLOW] Attempting to fill username...");
        try {
            await targetFrame.locator("#investecId").fill(username, { timeout: 3000 });
            console.log("[MANUAL-FLOW] ✓ Username entered");
        } catch (e) {
            try {
                // Try first input
                await targetFrame.locator("input").first().fill(username, { timeout: 3000 });
                console.log("[MANUAL-FLOW] ✓ Username entered (via first input)");
            } catch (e2: any) {
                console.log("[MANUAL-FLOW] ⚠️ Could not fill username: " + e2.message);
            }
        }

        console.log("[MANUAL-FLOW] Attempting to fill password...");
        try {
            await targetFrame.locator("#investecPassword").fill(password, { timeout: 3000 });
            console.log("[MANUAL-FLOW] ✓ Password entered");
        } catch (e) {
            try {
                // Try second input
                await targetFrame.locator("input").nth(1).fill(password, { timeout: 3000 });
                console.log("[MANUAL-FLOW] ✓ Password entered (via second input)");
            } catch (e2: any) {
                console.log("[MANUAL-FLOW] ⚠️ Could not fill password: " + e2.message);
            }
        }

        console.log("[MANUAL-FLOW] Looking for login button...");
        try {
            await targetFrame.locator('//span[contains(text(),"Log in")]').click({ timeout: 3000 });
            console.log("[MANUAL-FLOW] ✓ Login button clicked");
        } catch (e) {
            try {
                // Try button directly
                await targetFrame.locator("button").first().click({ timeout: 3000 });
                console.log("[MANUAL-FLOW] ✓ Button clicked (via first button)");
            } catch (e2: any) {
                console.log("[MANUAL-FLOW] ⚠️ Could not click login: " + e2.message);
            }
        }

        // Wait for response
        console.log("[MANUAL-FLOW] Waiting for response (5s)...");
        await page.waitForTimeout(5000);

        console.log("[MANUAL-FLOW] Taking screenshot...");
        await page.screenshot({ path: "screenshots/manual-debug.png", fullPage: true });

        console.log("\n========================================");
        console.log("[MANUAL-FLOW] ✓ Browser is now open");
        console.log("[MANUAL-FLOW] ✓ Credentials entered (if page allowed)");
        console.log("[MANUAL-FLOW] You can now see what came next");
        console.log("[MANUAL-FLOW] Keep terminal running, press Ctrl+C when done");
        console.log("========================================\n");

        // Keep browser open indefinitely
        await new Promise(() => { });

    } catch (error: any) {
        console.error("[MANUAL-FLOW] Error:", error.message || error);
        console.log("[MANUAL-FLOW] Keeping browser open (30s) for inspection...");
        await page.waitForTimeout(30000);
        await browser.close();
    }
}

debug().catch(console.error);
