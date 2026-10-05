
//h1[contains(text(),'Success')]
//span[contains(text(),'Go to dashboard')]
//span[contains(text(),'Done')]
//h1[contains(text(),'Pending approval')]
//p[contains(text(),'Receipt Initiated successfully!')]



import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

export default class InternationReceiptSummaryPage {

  private iframe: FrameLocator;
  private readonly ddlForeignExchangeRate: Locator;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
  }

  getSubmitText() {
    return this.iframe.locator("(//h1)[1]");
  }

  getApprovalRules() {
    return this.iframe.locator("//h3[contains(text(),'approval rule(s) applicable')]")
  }

  async getSubmitStatus(): Promise<string> {
    return await this.getSubmitText().textContent();
  }
}

