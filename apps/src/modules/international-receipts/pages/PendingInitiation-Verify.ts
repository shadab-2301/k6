import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

export default class InternationPIVerifyPage {


  private iframe: FrameLocator;
  private readonly ddlForeignExchangeRate: Locator;
  private static amountRemaining;
  constructor() {
    this.iframe = page.frameLocator(iframeId);
  }

  async getAlerts(): Promise<string> {// Promise<Locator[]>
    await page.waitForTimeout(3000)
    const alertLocator = this.iframe.locator("//ui-alerts//p")

    const count = await alertLocator.count();

    const alertLocators: Locator[] = [];
    for (let i = 0; i < count; i++) {
      alertLocators.push(alertLocator.nth(i));
    }

    let errorMessage = "";

    for (const e of alertLocators) {
      const textContent = await e.allTextContents();
      errorMessage += " " + textContent;
    }

    return errorMessage;
  }


}