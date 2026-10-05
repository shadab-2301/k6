import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import Table from "../../shared/pages/data-table-page";
import { IReceiptsLanding } from "../types/i-ending-receipts-interface";
import { iframeId } from "../../../../config/global-configs";


export default class InitiateReceipt {
  iframe: FrameLocator;
  private static totalPending: number;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
  }


  static setTotalReceipts(receipts: number) {
    InitiateReceipt.totalPending = receipts
  }

  static getTotalPendingReceipts(): number {
    return InitiateReceipt.totalPending;
  }

  async getButton(initiateAction: string) {
    return this.iframe.locator(`//span[contains(text(), '${initiateAction}')]`);
  }

  async initiateReceipt(initiateAction: string) {
    const button = await this.getButton(initiateAction);
    if (button) {
      await button.click();
    } else {
      throw new Error(`Button with action "${initiateAction}" not found.`);
    }
  }



}