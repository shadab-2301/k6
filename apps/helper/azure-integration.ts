import RestHelper from "./rest-helper";
import { testReportingDetails } from "../../global-variables";
import { IAzureTestPlanIds } from "../src/modules/shared/types/azure-test-plan-ids";
import { getAzureDevOpsContext } from "../src/modules/shared/api/azure-devops-context";

function sanitizeResponseForLog(raw: string): string {
  if (raw.includes('<!DOCTYPE') || raw.includes('<html')) {
    return '[HTML error page received - content suppressed]';
  }
  return raw;
}

var testPlanId: string;

var _testPointId: string;
var _testRunId: string;
var testplanData: any;
let testPointIds: number[] = [];
let testResultsIds: number[] = [];

interface TestRow {
  testPlanId: string;
  testSuiteId: string;
  testCaseId: string;
  status: string;
  failureScreenshot?: string;
  failureLogs?: string;
  testPointId?: number;
  resultId?: number;
}

export default class AzureIntegration {
  private static collectedRows: TestRow[] = [];
  private static currentScenarioCaseIds: string[] = [];
  private static TestChannel = "client-channel-tech"; // client-channel-tech business-banking-za

  private static getTestChannel(): string {
    return (process.env.AZURE_TEST_CHANNEL || this.TestChannel || "client-channel-tech").trim();
  }

  private static buildApiPath(path: string): string {
    return `/investec/${this.getTestChannel()}${path}`;
  }

  private static getApiContext() {
    const context = getAzureDevOpsContext();
    if (!context) {
      throw new Error("Azure DevOps API context is not initialized.");
    }
    return context;
  }

  static seed(planId: string, suiteId: string, caseId: string) {
    const keyMatch = (r: TestRow) =>
      r.testPlanId === planId && r.testSuiteId === suiteId && r.testCaseId === caseId;
    let row = this.collectedRows.find(keyMatch);
    if (!row) {
      row = { testPlanId: planId, testSuiteId: suiteId, testCaseId: caseId, status: "Unspecified" };
      this.collectedRows.push(row);
    }
    if (!this.currentScenarioCaseIds.includes(caseId)) {
      this.currentScenarioCaseIds.push(caseId);
    }
  }

  static seedMany(planId: string, suiteId: string, caseIds: string[]) {
    caseIds.forEach(id => this.seed(planId, suiteId, id));
  }

  static startScenario() {
    this.currentScenarioCaseIds = [];
  }

  static completeScenario(rawStatus: string, failureScreenshot?: string, failureLogs?: string) {
    const s = rawStatus.toLowerCase();
    const mapped =
      s === "passed" ? "Passed" :
        s === "failed" ? "Failed" :
          s === "skipped" ? "NotExecuted" : "Unspecified";
    this.currentScenarioCaseIds.forEach(caseId => {
      const row = this.collectedRows.find(r => r.testCaseId === caseId);
      if (row) {
        row.status = mapped;
        if (failureScreenshot && mapped === "Failed") {
          row.failureScreenshot = failureScreenshot;
        }
        if (failureLogs && mapped === "Failed") {
          row.failureLogs = failureLogs;
        }
      }
    });
  }

  static async attachLogsToResult(resultId: number, logs: string) {
    const cleanLogs = logs.replace(/\x1b\[[0-9;]*m/g, '');
    const logsBase64 = Buffer.from(cleanLogs).toString('base64');

    const payload = {
      stream: logsBase64,
      fileName: "console-logs.txt",
      comment: "Console logs from failed test scenario",
      attachmentType: "GeneralAttachment",
    };

    const requestPath = this.buildApiPath(`/_apis/test/runs/${_testRunId}/results/${resultId}/attachments?api-version=5.0-preview.1`);
    console.log("\n========== ATTACH LOGS REQUEST ==========");
    console.log(`[AttachLogs] URL   : ${requestPath}`);
    console.log(`[AttachLogs] Method: POST`);
    console.log(`[AttachLogs] Payload:`);
    console.log(JSON.stringify({ ...payload, stream: `<<base64, ${logsBase64.length} chars>>` }, null, 2));
    console.log(`[AttachLogs] Raw log content (first 500 chars):`);
    console.log(cleanLogs.substring(0, 500));
    console.log("==========================================\n");

    const response = await this.getApiContext().post(requestPath, { data: payload });

    console.log(`[AttachLogs] Response Status: ${response.status()}`);
    if (!response.ok()) {
      const body = await response.text();
      console.error(`[AttachLogs] Response Body: ${body}`);
    }
  }

  static getRows() { return [...this.collectedRows]; }

  static azureTestPlanDetails: IAzureTestPlanIds = {
    testPlanId: "",
    testSuiteId: "",
    testCaseId: ""
  };

  static async getTestPlandetails() {
    const testPlanDetails = testReportingDetails.data;

    if (testPlanDetails.length !== 0) {
      try {
        testplanData = JSON.parse(JSON.stringify(testPlanDetails));
      } catch (error) {
        console.warn(`\nUnable to retrive the full test plan meta data. Please ensure that you have a valid JSON with test plan id, test suite id, and test case id.`);
      }
    }
  }

  static async getTestPointIds(): Promise<number[]> {
    testPointIds = [];
    if (!Array.isArray(testplanData) || testplanData.length === 0) {
      console.log("[AzureIntegration] No test plan rows found. Skipping test point lookup.");
      return [];
    }

    for (const item of testplanData) {
      testPlanId = item.testPlanId;
      const testPoint = await RestHelper.sendGETRequest(
        this.buildApiPath(`/_apis/test/plans/${item.testPlanId}/suites/${item.testSuiteId}/points?testCaseId=${item.testCaseId}&api-version=5.0`)
      );
      const rawText = await testPoint.text();
      let parsed: any;
      try { parsed = JSON.parse(rawText); } catch { parsed = null; }

      const response = parsed;
      if (!response || !Array.isArray(response.value) || response.value.length === 0) {
        console.warn('WARN: No test points returned for case', item.testCaseId);
        continue;
      }
      const firstPoint = response.value[0];
      if (!firstPoint?.id) {
        console.warn('WARN: First test point missing id for case', item.testCaseId, firstPoint);
        continue;
      }
      _testPointId = String(firstPoint.id);
      item.testPointId = Number(_testPointId);
      if (!testPointIds.includes(Number(_testPointId))) {
        testPointIds.push(Number(_testPointId));
      }
    }

    return testPointIds;
  }

  static async updateTestCateStatus(testRunName?: string): Promise<string> {
    return this.createTestRun(testRunName);
  }

  static async updateTestaseAutomationStatus(testRunName?: string): Promise<string> {
    return this.createTestRun(testRunName);
  }

  static async createTestRun(testRunName?: string): Promise<string> {
    if (testPointIds.length > 0) {
      const restResponse = await this.getApiContext().post(this.buildApiPath(`/_apis/test/runs?api-version=5.0`), {
        data: {
          name: testRunName || "Automated Test Execution",
          plan: { id: testPlanId },
          pointIds: testPointIds,
          owner: process.env.AZURE_USER_ID ? { id: process.env.AZURE_USER_ID } : undefined
        },
      });

      const raw = await restResponse.text();

      if (restResponse.status() === 403 || restResponse.status() === 401) {
        console.error('ERROR: Azure DevOps API returned', restResponse.status());
        console.error('Response body:', sanitizeResponseForLog(raw));
        console.error('Possible causes:');
        console.error('  1. PAT missing "Test Management (Read & Write)" permission');
        console.error('  2. PAT expired or revoked');
        console.error(`  3. User lacks access to project "investec/${this.getTestChannel()}"`);
        console.error('  4. Test plan ID', testPlanId, 'does not exist or is inaccessible');
        return;
      }

      let response: any;
      try {
        response = JSON.parse(raw);
      } catch {
        console.warn('WARN: createTestRun non-JSON response:', sanitizeResponseForLog(raw));
        return;
      }

      _testRunId = response.id;
      return _testRunId;
    }
  }

  static async updateTestResults() {
    if (testReportingDetails.data.length > 0) {
      const testsToUpdate = testReportingDetails.data
        .filter(item => item.testPointId && typeof item.testPointId === 'number' && item.testPointId > 0)
        .map(item => ({
          id: item.testPointId,
          outcome: item.status,
          state: "Completed",
          tester: process.env.AZURE_USER_ID ? { id: process.env.AZURE_USER_ID } : undefined,
          comment: "Execution Successful"
        }));

      const skipped = testReportingDetails.data
        .filter(item => !item.testPointId || typeof item.testPointId !== 'number' || item.testPointId <= 0)
        .map(item => item.testCaseId);

      if (skipped.length > 0) {
        console.warn('Skipping test cases with invalid or missing testPointId:', skipped);
      }

      if (testsToUpdate.length === 0) {
        console.warn('No valid test results to update in Azure DevOps.');
        return;
      }

      try {
        const response = await this.getApiContext().patch(
          this.buildApiPath(`/_apis/test/runs/${_testRunId}/results?api-version=5.1-preview.6`),
          {
            data: testsToUpdate
          }
        );

        if (response.status() !== 200) {
          const raw = await response.text();
          console.error('updateTestResults error:', sanitizeResponseForLog(raw));
        }
      } catch (err) {
        console.error('Exception during updateTestResults:', err);
      }
    }
  }

  static async getResultIds() {
    if (_testRunId) {
      const resultIds = await RestHelper.sendGETRequest(
        this.buildApiPath(`/_apis/test/runs/${_testRunId}/results?api-version=5.1-preview.6`),
      );

      const rawText = await resultIds.text();
      let response: any;
      try { response = JSON.parse(rawText); } catch { response = null; }

      if (!response || !Array.isArray(response.value)) {
        console.warn("WARN: getResultIds returned invalid response body.");
        return;
      }

      const testCaseIdToResponseId = Object.fromEntries(
        response.value.map(item => [item.testCase.id, item.id])
      );

      testReportingDetails.data.forEach(item => {
        if (testCaseIdToResponseId[item.testCaseId]) {
          item.testPointId = testCaseIdToResponseId[item.testCaseId];
        }
      });
      testResultsIds = response.value.map(item => item.id);
    }
  }

  static async attachScreenShot(resultId: number, stream: string) {
    const payload = {
      stream: stream,
      fileName: "screenshot.png",
      comment: "Screenshot captured from failed scenario",
      attachmentType: "GeneralAttachment",
    };

    const requestPath = this.buildApiPath(`/_apis/test/runs/${_testRunId}/results/${resultId}/attachments?api-version=5.0-preview.1`);
    console.log("\n========== ATTACH SCREENSHOT REQUEST ==========");
    console.log(`[AttachScreenshot] URL   : ${requestPath}`);
    console.log(`[AttachScreenshot] Method: POST`);
    console.log(`[AttachScreenshot] Payload:`);
    console.log(JSON.stringify({ ...payload, stream: `<<base64, ${stream.length} chars>>` }, null, 2));
    console.log("================================================\n");

    const response = await this.getApiContext().post(requestPath, { data: payload });

    console.log(`[AttachScreenshot] Response Status: ${response.status()}`);
    if (!response.ok()) {
      const body = await response.text();
      console.error(`[AttachScreenshot] Response Body: ${body}`);
    }
  }

  public static async publishTestResults(filePath?: string) {
    console.log("\n========== PUBLISH TEST RESULTS ==========");
    console.log(`[Publish] Total test rows: ${testReportingDetails.data.length}`);
    testReportingDetails.data.forEach((item, i) => {
      console.log(`[Publish] Row ${i + 1}: testCaseId=${item.testCaseId}, testSuiteId=${item.testSuiteId}, status=${item.status}, testPointId=${item.testPointId || 'N/A'}`);
    });
    console.log("==========================================\n");

    if (!Array.isArray(testReportingDetails.data) || testReportingDetails.data.length === 0) {
      console.log("[Publish] No test reporting rows available. Skipping Azure publish.");
      return;
    }

    await AzureIntegration.getTestPlandetails();
    await AzureIntegration.getTestPointIds();
    await AzureIntegration.createTestRun();
    await AzureIntegration.getResultIds();
    await AzureIntegration.updateTestResults();

    if (testReportingDetails.data && Array.isArray(testReportingDetails.data)) {
      for (const testRow of testReportingDetails.data) {
        if (testRow.testPointId) {
          if ((testRow as any).failureScreenshot) {
            try {
              await AzureIntegration.attachScreenShot(testRow.testPointId, (testRow as any).failureScreenshot);
            } catch (err) {
              console.error(`Failed to attach failed screenshot for testPointId ${testRow.testPointId}:`, err);
            }
          }
          if ((testRow as any).passedScreenshot) {
            try {
              await AzureIntegration.attachScreenShot(testRow.testPointId, (testRow as any).passedScreenshot);
            } catch (err) {
              console.error(`Failed to attach passed screenshot for testPointId ${testRow.testPointId}:`, err);
            }
          }
          if ((testRow as any).failureLogs) {
            try {
              await AzureIntegration.attachLogsToResult(testRow.testPointId, (testRow as any).failureLogs);
            } catch (err) {
              console.error(`Failed to attach logs for testPointId ${testRow.testPointId}:`, err);
            }
          }
        }
      }
    }

    await AzureIntegration.completeTestRun();
  }

  static async completeTestRun() {
    if (_testRunId) {
      const response = await this.getApiContext().patch(
        this.buildApiPath(`/_apis/test/runs/${_testRunId}?api-version=5.0`),
        {
          data: {
            state: "Completed"
          }
        }
      );

      if (response.status() === 403 || response.status() === 401) {
        const raw = await response.text();
        console.error('ERROR: completeTestRun failed');
        console.error('Response body:', sanitizeResponseForLog(raw));
        console.error('Your user needs "Manage test runs" permission in Azure DevOps');
      }
    }
  }
}

export interface testPlanDetails {
  testCases: testPlanIds[]
}

export interface testPlanIds {
  testPlanid: number,
  testSuiteId: number,
  testCaseId: number;
}
