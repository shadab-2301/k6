import { faker } from "@faker-js/faker";
import { expect, FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";
import { IBOL } from "../../../utilities/utilities/ibol-utilities";
import Table from "../../shared/pages/data-table-page";

export default class MyApprovalIndividualPage {


  private iframe: FrameLocator;
  private readonly ddlForeignExchangeRate: Locator;
  private static amountRemaining;

  private searchInput: Locator;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.searchInput = this.iframe.locator("#basic-search");
  }

  async searchByFTNumber(inputText: string) {
    const apiResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/v1/payment-manager/payments/pending-approval')
    );

    await IBOL.enterText(await this.iframe.locator("#basic-search"), inputText);
    const apiResponse = await apiResponsePromise;
    expect(apiResponse.status()).toBe(200);

    const isResultsEmpty = await Table.isDataAvailableInTable();

    if (isResultsEmpty) {
      return {};
    }

    expect(isResultsEmpty).toBe(false);



    await page.waitForTimeout(2000);
    const rowCount = await (await Table.getTableRows()).count();
    expect(rowCount).toBe(1);

    const responseBody = await apiResponse.json();
    await page.waitForTimeout(2000);

    try {
      const test = responseBody.data[0].transferId;
    } catch (error) {
    }

    return responseBody;
  }

  async getPaymentDetails() {
    const paymentDetails = {
      paymentDate: await Table.getCellValueByHeader("Payment date"),
      beneficiaryName: await Table.getCellValueByHeader("Beneficiary name"),
      beneficiaryType: await Table.getCellValueByHeader("Beneficiary type"),
      debitAccReference: await Table.getCellValueByHeader("Debit account reference"),
      amount: await Table.getCellValueByHeader("Amount"),
      expiry: await Table.getCellValueByHeader("Expiry"),
    };

    //console.log('Payment Details:', paymentDetails);
    return paymentDetails;
  }


  async selectPayment(n: number = 0) {
    await this.iframe.getByRole('row').locator('ui-icon').getByRole('img').nth(0).check();
  }

  async expandPaymentDetails(n: number = 0) {
    const recordSelector = this.iframe.getByRole('button', { name: 'chevron-right' }).nth(n);
    const response = await IBOL.clickAndInterceptResponseAndVerifyNavigation(
      recordSelector,
      '/api/v1/payment-manager/payments/pending-approvals',
      '/my-approvals/details/payments/individual/pending/'
    );

    return response;
  }

  async clickApproveButton() {
    const approveButton = this.iframe.getByRole('button', { name: 'Approve' });
    // await IBOL.clickButtonAndVerifyNavigationUrl(approveButton, '/bb/my-approvals/details/payments/individual/stepper/pending/approve/verify');
    await IBOL.click(approveButton, 'Approve button');
  }

  async clickDeclineButton() {
    const declineButton = this.iframe.getByRole('button', { name: 'Decline' });
    //await IBOL.clickButtonAndVerifyNavigationUrl(declineButton, '/bb/my-approvals/details/payments/individual/stepper/pending/reject/verify');
    await IBOL.click(declineButton, 'Decline button');

  }


  async clickContinueButton() {
    // const continueButton = this.iframe.locator("#confirmVerify").nth(0);
    let isUserNavigetedToNextScreen = true;
    ///bb/my-approvals/details/payments/individual/stepper/pending


    const continueButton = this.iframe.getByRole('button', { name: 'Continue' }).or(this.iframe.locator("#confirmVerify").nth(0));

    await IBOL.clickButtonAndVerifyNavigationUrl(continueButton, '/stepper/pending/approve/summary').catch(() => { isUserNavigetedToNextScreen = false });


    if (!isUserNavigetedToNextScreen) {

      const dateAutoForward = this.iframe.getByRole('heading', { name: 'Date auto forward' });

      if (await dateAutoForward.isVisible()) {

        expect(await this.iframe.getByText('These payments will be processed on the next available banking day')).toBeVisible();
        //const autoforwardConfirmBtn = this.iframe.locator('#confirmVerify').nth(0);
        const autoforwardConfirmBtn = this.iframe.getByRole('button', { name: 'Confirm' });

        await IBOL.clickButtonAndVerifyNavigationUrl(autoforwardConfirmBtn, '/pending/approve/verify')
        expect(await this.iframe.getByText('Auto forward: Review, change or dismiss the new payment date before continuing.')).toBeVisible();
      }
       await page.waitForTimeout(2000);
      await IBOL.clickButtonAndVerifyNavigationUrl(continueButton, '/approve/summary');
    }
  }

  async clickSummaryDoneBtn() {
    const doneBtn = this.iframe.locator('#summaryDone');
    await IBOL.clickButtonAndVerifyNavigationUrl(doneBtn, '/bb/my-approvals/dashboard/payments/individual/pending');
  }

  async approvePayment(paymentId: string) {

    await this.searchByFTNumber(paymentId);
    await this.getPaymentDetails();
    await this.selectPayment();
    const response = await this.expandPaymentDetails();
    //console.log("************");
    //console.log(JSON.stringify(response, null, 2));


    await this.clickApproveButton();

    await this.clickContinueButton();

    await this.clickSummaryDoneBtn()
    await this.verifyPaymentIsRemovedFromPendingApproval(paymentId);

  }

  async verifyPaymentIsRemovedFromPendingApproval(paymentId: string, displayedtext: string = "No results") {
    const response = await this.searchByFTNumber(paymentId);
    expect(response).toBeEmpty
  }


  async declinePayment() {

  }


}