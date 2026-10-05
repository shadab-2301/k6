import { page, FrameLocator, Locator, expect } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";
import TransfersPage from "../../payments/pages/transfers/tranferspage"



export default class TranferDetails {

  static MAX_TRANSFERS = 20;

  static getTransferTotal(totalAmount?) {
    const selector = (totalAmount != null)
      ? `//small[contains(.,' Transfer total: R ${totalAmount}')]`
      : `//small[contains(.,' Transfer total: R ')]`;
    return page.frameLocator(iframeId).locator(selector);
  }

  static async getNumberOfTransfers(numberoftransfers?) {
    const selector = (numberoftransfers != null)
      ? `//span[contains(.,'( ${numberoftransfers} / ${this.MAX_TRANSFERS} ) ')]`
      : `//span[contains(.,'/ ${this.MAX_TRANSFERS} ) ')]`;
    return page.frameLocator(iframeId).locator(`//span[contains(.,'( ${numberoftransfers} / ${this.MAX_TRANSFERS} ) ')]`).nth(0);
  }

}