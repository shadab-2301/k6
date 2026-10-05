/**
 * Standalone script to manually verify the Teams webhook integration end-to-end,
 * without having to run the full Cucumber suite.
 *
 * Usage: npm run teams:test-notification
 *
 * Sends a sample card (1 passed + 2 failed scenarios, with module names, failure
 * reasons, and a sample HTML report link) using the "Test Notification For
 * Integrated Automated Test" title. Bypasses the TEAMS_NOTIFY_ON_FAIL/
 * TEAMS_NOTIFY_ON_PASS toggles so it always sends, as long as TEAMS_WEBHOOK_URL
 * is set in .env.creds.
 */
require("dotenv").config({ path: ".env.creds" });

import TeamsNotification from "../../src/utilities/utilities/teams-notification";

async function main() {
  // Sample HTML report link (normally the public Azure Blob Storage URL the pipeline uploads to).
  if (!process.env.TEST_REPORT_URL) {
    process.env.TEST_REPORT_URL = "https://samplestorageaccount.blob.core.windows.net/reports/123456/cucumber_multireport.html";
  }
  // Sample Azure DevOps pipeline run link (normally set automatically by Azure Pipelines).
  if (!process.env.SYSTEM_COLLECTIONURI) {
    process.env.SYSTEM_COLLECTIONURI = "https://dev.azure.com/investec/";
    process.env.SYSTEM_TEAMPROJECT = "cxt-web-bb";
    process.env.BUILD_BUILDID = "123456";
  }

  TeamsNotification.recordResult(
    "Accounts overview displays all linked accounts",
    "Passed",
    "Accounts"
  );

  TeamsNotification.recordResult(
    "Get accounts list returns expected accounts for current environment",
    "Failed",
    "API - Accounts",
    "AssertionError: expected response status 200 but received 500\n    at accounts-api-steps.ts:42:11"
  );

  TeamsNotification.recordResult(
    "Add domestic beneficiary submits successfully",
    "Failed",
    "Beneficiaries",
    "TimeoutError: locator.click: Timeout 30000ms exceeded waiting for element '#submit-beneficiary' to be visible\n    at add-domestic-beneficiary-steps.ts:87:5"
  );

  await TeamsNotification.sendSuiteSummary({
    title: "Test Notification For Integrated Automated Test",
    force: true,
  });

  console.log("Test Teams notification sent (check TEAMS_WEBHOOK_URL's channel).");
}

main().catch((e) => {
  console.error("Failed to send test Teams notification:", e);
  process.exit(1);
});
