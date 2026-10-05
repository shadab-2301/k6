import { page, FrameLocator, Locator, expect } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";
import TransfersPage from "../../../modules/payments/pages/transfers/tranferspage"



export default class InformationSlider {

  static async getheader() {
    return page.frameLocator(iframeId).locator(".offcanvas h4");
  }

  static async getTabs() {
    return page.frameLocator(iframeId).locator(".offcanvas a");
  }

  static async isTabDisplayed(tabnme: string) {
    return  page.frameLocator(iframeId).locator(`//div[contains(@class,'offcanvas')]//a[contains(.,'${tabnme}')]`).isVisible();
  }

  static async getFiled(tabnme: string) {
      let transfersPage = new TransfersPage();

    return transfersPage.getFiled('Transfer type')
  }

  static async getSeriesRecords() {
  return  page.frameLocator(iframeId).locator(`.row.mb-2`);
  }

  static async getApprovalID() {
  return  page.frameLocator(iframeId).locator(`#approvalId`);
  }


}