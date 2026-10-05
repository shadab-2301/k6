import { faker } from "@faker-js/faker";
import { expect, FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";
import { IBOL } from "../../../utilities/utilities/ibol-utilities";

export default class myApprovalReceiptVerifyPage {


  private iframe: FrameLocator;
  private readonly ddlForeignExchangeRate: Locator;
  private static amountRemaining;
  constructor() {
    this.iframe = page.frameLocator(iframeId);
  }

  async getButton(initiateAction: string) {
    return this.iframe.locator(`//span[contains(text(), '${initiateAction}')]`);
  }

  async getModalButton(initiateAction: string) {
    return this.iframe.locator(`//div[@class='modal-footer']//button[contains(.,'${initiateAction}')]`);
  }

  async getactiveRecord() {
    return this.iframe.locator("(//tr)[2]");
  }

  async clickConfirmDecline(congDecline: string) {
    return (await this.getButton(congDecline)).click();
  }

  async clickOnActiveRecipt() {
    return (await this.getactiveRecord()).click();
  }

  async getReasonForDecline() {
    return this.iframe.locator("#reasonFor")
  }

  async CaptureDelineReason(resonDecline: string) {

    const retutnResonLocator = this.iframe.locator("#returnReason,#reasonFor");
    await retutnResonLocator.waitFor({ state: 'visible', timeout: 10000 });
    await retutnResonLocator.fill(resonDecline);
    await this.iframe.locator(`#reasonConfirm`).nth(0).click();

    const noteForApproverLocator = this.iframe.locator("#noteForApprover");

    if (await noteForApproverLocator.isVisible()) {
      await IBOL.enterText(noteForApproverLocator, "Internally generated decline reason for test automation purposes.");


      const downloadBtnLocator = this.iframe.locator("//input[@id='attachFile']");
      await downloadBtnLocator.waitFor({ state: 'attached', timeout: 10000 });

      await expect(this.iframe.getByText('attachment Attach a file')).toBeVisible();
      await expect(this.iframe.getByText('(Only pdf file up to 10MB is')).toBeVisible();

      await IBOL.uploadDocument("apps/test/resources/testupload.pdf");

    }

  }

}