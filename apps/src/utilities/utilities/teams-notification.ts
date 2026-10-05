import * as https from "https";
import { URL } from "url";

export interface ScenarioResult {
  scenarioName: string;
  status: "Passed" | "Failed";
  moduleName?: string;
  failureReason?: string;
}

const results: ScenarioResult[] = [];

/**
 * Sends an end-of-suite results summary to a Microsoft Teams channel via the
 * "Send webhook alerts to a channel" Workflow (Power Automate).
 *
 * Env vars (all optional):
 *  - TEAMS_WEBHOOK_URL         - the Workflow's HTTP POST URL. Notification is skipped if not set.
 *  - TEAMS_NOTIFY_ON_FAIL      - "true"/"false", default "true"
 *  - TEAMS_NOTIFY_ON_PASS      - "true"/"false", default "false"
 *  - TEST_REPORT_URL           - explicit HTML report link override
 */
export default class TeamsNotification {
  static recordResult(scenarioName: string, status: "Passed" | "Failed", moduleName?: string, failureReason?: string): void {
    results.push({ scenarioName, status, moduleName, failureReason });
  }

  static resetResults(): void {
    results.length = 0;
  }

  static async sendSuiteSummary(options?: { title?: string; force?: boolean }): Promise<void> {
    if (results.length === 0) return;

    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
    if (!webhookUrl) {
      return;
    }

    const notifyOnFail = (process.env.TEAMS_NOTIFY_ON_FAIL ?? "true").toLowerCase() === "true";
    const notifyOnPass = (process.env.TEAMS_NOTIFY_ON_PASS ?? "false").toLowerCase() === "true";

    const failed = results.filter((r) => r.status === "Failed");
    const passed = results.filter((r) => r.status === "Passed");
    const hasFailures = failed.length > 0;

    if (!options?.force) {
      if (hasFailures && !notifyOnFail) return;
      if (!hasFailures && !notifyOnPass) return;
    }

    const card = TeamsNotification.buildAdaptiveCard(passed.length, failed.length, failed, options?.title);

    try {
      await TeamsNotification.postToWebhook(webhookUrl, card);
    } catch (e) {
      console.error("Failed to send Teams notification:", e);
    }
  }

  private static buildAdaptiveCard(passedCount: number, failedCount: number, failed: ScenarioResult[], title?: string) {
    const total = passedCount + failedCount;
    const overallStatus = failedCount > 0 ? "\u274C FAILED" : "\u2705 PASSED";
    const pipelineUrl = TeamsNotification.resolvePipelineUrl();
    const reportUrl = TeamsNotification.resolveReportUrl();

    const body: any[] = [
      {
        type: "TextBlock",
        text: `${title || "API Automation Suite Results"}: ${overallStatus}`,
        weight: "Bolder",
        size: "Medium",
        wrap: true,
      },
      {
        type: "FactSet",
        facts: [
          { title: "Total scenarios:", value: String(total) },
          { title: "Passed:", value: String(passedCount) },
          { title: "Failed:", value: String(failedCount) },
          { title: "Environment:", value: process.env.ENVIROMENT_BASE_URL || "N/A" },
          { title: "Run time:", value: new Date().toISOString() },
        ],
      },
    ];

    if (failed.length > 0) {
      body.push({
        type: "TextBlock",
        text: "Failed scenarios:",
        weight: "Bolder",
        size: "Medium",
        wrap: true,
        spacing: "Medium",
      });

      const maxListed = 20;
      for (const failure of failed.slice(0, maxListed)) {
        body.push({
          type: "TextBlock",
          text: `**[${failure.moduleName || "Unknown"}]** ${failure.scenarioName}`,
          wrap: true,
        });
        body.push({
          type: "TextBlock",
          text: TeamsNotification.extractHighLevelReason(failure.failureReason),
          wrap: true,
          isSubtle: true,
          spacing: "None",
        });
      }

      if (failed.length > maxListed) {
        body.push({
          type: "TextBlock",
          text: `...and ${failed.length - maxListed} more failed scenario(s).`,
          wrap: true,
        });
      }
    }

    if (pipelineUrl) {
      body.push({
        type: "TextBlock",
        text: `[View results on pipeline](${pipelineUrl})`,
        wrap: true,
        spacing: "Medium",
      });
    }

    if (reportUrl) {
      body.push({
        type: "TextBlock",
        text: `[View full HTML report](${reportUrl})`,
        wrap: true,
        spacing: pipelineUrl ? "None" : "Medium",
      });
    }

    const card: any = {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.4",
            body,
          },
        },
      ],
    };

    const actions: any[] = [];
    if (pipelineUrl) {
      actions.push({
        type: "Action.OpenUrl",
        title: "View Results on Pipeline",
        url: pipelineUrl,
      });
    }
    if (reportUrl) {
      actions.push({
        type: "Action.OpenUrl",
        title: "View HTML Report",
        url: reportUrl,
      });
    }
    if (actions.length > 0) {
      card.attachments[0].content.actions = actions;
    }

    return card;
  }

  private static extractHighLevelReason(failureReason?: string): string {
    if (!failureReason) return "No failure reason captured.";
    const firstLine = failureReason.split("\n").map((l) => l.trim()).find((l) => l.length > 0) || failureReason;
    return TeamsNotification.truncate(firstLine, 300);
  }

  private static resolvePipelineUrl(): string | undefined {
    const collectionUri = process.env.SYSTEM_COLLECTIONURI;
    const teamProject = process.env.SYSTEM_TEAMPROJECT;
    const buildId = process.env.BUILD_BUILDID;
    if (collectionUri && teamProject && buildId) {
      return `${collectionUri}${encodeURIComponent(teamProject)}/_build/results?buildId=${buildId}&view=artifacts`;
    }
    return undefined;
  }

  private static resolveReportUrl(): string | undefined {
    if (process.env.TEST_REPORT_URL) return process.env.TEST_REPORT_URL;

    const buildId = process.env.BUILD_BUILDID;
    const storageBaseUrl = process.env.REPORT_STORAGE_ACCOUNT_URL;
    const storageContainer = process.env.REPORT_STORAGE_CONTAINER;
    if (storageBaseUrl && storageContainer && buildId) {
      return `${storageBaseUrl.replace(/\/+$/, "")}/${storageContainer}/${buildId}/cucumber_multireport.html`;
    }

    return undefined;
  }

  private static truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  private static postToWebhook(webhookUrl: string, payload: object): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(webhookUrl);
      const data = JSON.stringify(payload);

      const req = https.request(
        {
          hostname: url.hostname,
          path: `${url.pathname}${url.search}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
          },
        },
        (res) => {
          res.on("data", () => {});
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve();
            } else {
              reject(new Error(`Teams webhook responded with status ${res.statusCode}`));
            }
          });
        }
      );

      req.on("error", reject);
      req.write(data);
      req.end();
    });
  }
}
