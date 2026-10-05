import { page, FrameLocator, Locator, expect } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";
import TransfersPage from "../../payments/pages/transfers/tranferspage"
import APIInterceptor from "../../../../helper/api-interceptor";



export default class SingleTransferDetailsPage {

  static async getHeader() {
    return await page.frameLocator(iframeId).locator("//div//h4[contains(.,'Payment ID - ')]");
  }

  static async getField(fieldName: string) {
    return await page.frameLocator(iframeId).locator(`xpath=(//dt[contains(text(),'${fieldName}')]/following-sibling::dd)[1]`);
  }


  static async isFiledNotEmptyNotDash(fieldName: string) {
    await page.waitForTimeout(500);
    let flag = true;

    if (fieldName == null || fieldName.trim() == "" || fieldName.trim() == "-") {
      flag = false;
    }

    return flag;

  }

  static async isFiledNotEmpty(fieldName: string) {
    await page.waitForTimeout(500);
    let flag = true;

    if (fieldName == null || fieldName.trim() == "") {
      flag = false;
    }

    return flag;

  }



  static async getFieldValue(fieldName: string) {
    const field = await page.frameLocator(iframeId).locator(`xpath=(//dt[contains(text(),'${fieldName}')]/following-sibling::dd)[1]`);
    await field.waitFor({ state: 'visible', timeout: 10000 });
    return await field.textContent();
  }

  static async VerifyDetailsTab(paymentdate: string, beneficiaryname: string, beneficiarytype: string, Debitaccountreference: string, Expiry: string, Amount: string) {
    await page.frameLocator(iframeId).getByText("Details").click();

   
    expect(await this.getField("Amount")).toHaveText(Amount);
    expect(await this.getField("Currency")).toHaveText("ZAR");
  }



  static async VerifyRecurringDetailsTab(paymentdate: string, beneficiaryname: string, beneficiarytype: string, Debitaccountreference: string, Expiry: string, Amount: string) {
    await page.frameLocator(iframeId).getByText("Details").click();

    expect(await this.getField("Amount")).toHaveText(Amount);
    expect(await this.getField("Currency")).toHaveText("ZAR");
    expect(await this.getField("Frequency")).toBeTruthy();
    expect(await this.isFiledNotEmpty(await this.getFieldValue(("Frequency")))).toBeTruthy();
    // expect(await this.getField("Number of transfers processed")).toHaveText("of");
    //expect(await this.getField("Number of transfers processed")).toHaveText(Amount);

  }

  static async VerifyUsersTab() {
    await page.frameLocator(iframeId).getByText("Users").click();

    expect(await this.isFiledNotEmptyNotDash(await this.getFieldValue("Submitted by"))).toBeTruthy();
    expect(await this.isFiledNotEmptyNotDash(await this.getFieldValue("Submitted date"))).toBeTruthy();
    expect(await this.isFiledNotEmpty(await this.getFieldValue("Previously authorized by"))).toBeTruthy();


  }


  static async VerifyApprovalsTab() {

    const accountDetailResponse = await APIInterceptor.getInterceptedAPIResponse();

    await page.frameLocator(iframeId).getByText("Approvals", { exact: true }).click();

    expect(await this.isFiledNotEmptyNotDash(await this.getFieldValue("Approval rules"))).toBeTruthy();
    expect(await this.isFiledNotEmptyNotDash(await this.getFieldValue("Submitted by"))).toBeTruthy();
    expect(await this.isFiledNotEmpty(await this.getFieldValue("Approved by"))).toBeTruthy();

  }

  static async isTabDisplayed(tabnme: string) {
    return page.frameLocator(iframeId).locator(`//div[contains(@class,'offcanvas')]//a[contains(.,'${tabnme}')]`).isVisible();
  }

  static async getFiled(tabnme: string) {
    let transfersPage = new TransfersPage();

    return transfersPage.getFiled('Transfer type')
  }

  static async getSeriesRecords() {
    return page.frameLocator(iframeId).locator(`.row.mb-2`);
  }

  static async getApprovalID() {
    return page.frameLocator(iframeId).locator(`#approvalId`);
  }


}