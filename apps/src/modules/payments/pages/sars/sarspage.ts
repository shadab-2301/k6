import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../../config/global-configs";
import { randomInt } from 'crypto';
import { DateUtilities } from "../../../../utilities/utilities/date-utilities";
import { Currency } from "../../../shared/constants/currency-codes";
import Table from "../../../shared/pages/data-table-page";
import IBOLMainPage from "../../../accounts/pages/ibol-main-page";
import { IBOL } from "../../../../utilities/utilities/ibol-utilities";
import { SarsPaymentDetails } from "../../interfaces/SarsPaymentDetails";
import { AnyAaaaRecord } from "dns";


export default class SarsPage {

  iframe: FrameLocator;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
  }

  getSarsPendingInitiationHeader = () => {
    return this.iframe.getByRole(`heading`, { name: `Requests pending initiation` });
  }

  sarsTopMenuButton = () => {
    return this.iframe.locator("#nav-button-SARS-eFiling");
  }

  async isPendingSarsInitiationHeadersVisible() {
    return await this.getSarsPendingInitiationHeader().isVisible();
  }

  async verifyTotalPendingApprovalPaymentsCount(sarsPendingInitiationRecords: any) {

    //const sarsCount = await this.sarsTopMenuButton();
    let countText = await (await this.sarsTopMenuButton().textContent()).replace("SARS eFiling", "").trim();
    console.log(`SARS pending approval payments count: ${countText} `);

    const actualCount = countText === '' || isNaN(Number(countText)) ? 0 : Number(countText);

    expect(actualCount).toBe(sarsPendingInitiationRecords.meta.totalCount);

    console.log(countText)
    return actualCount;
  }

  async getPendingInitationCard() {
    const pendingInitiationCard = await this.getSarsPendingInitiationHeader();

    await pendingInitiationCard.waitFor({ state: 'visible', timeout: 10000 });


    const listing = await this.iframe.locator('investec-online-pending-initiation-row');

    console.log(`SARS pending initiation card count: ${await listing.count()} `);

    const cardDetails = await listing.nth(0).innerText();

    const cardExpansionButton = await listing.nth(0);//.locator('investec-online-pending-initiation-row [name="arrow-right"]');

    console.log(`SARS pending initiation card count:\n\n ${cardDetails} `);

    await cardExpansionButton.click();


  }


  async verifyTextIsDisplayedCorrectly(title: string, description: string) {
    const titleLocator = await this.iframe.locator(`.ids-empty-state__title`);
    const descriptionLocator = await this.iframe.locator(`.ids-empty-state__supporting-text`);

    expect(await titleLocator.textContent()).toBe(title);
    expect(await descriptionLocator.textContent()).toBe(description);

  }


  async verifyPendingInitiationCardDetails(sarsDetails: any) {

    const listing = await this.iframe.locator('investec-online-pending-initiation-row');
    await listing.first().waitFor({ state: 'visible', timeout: 10000 });

    const maxcardsdisplayed = await listing.count();
    const randomIndex = randomInt(0, maxcardsdisplayed);
    const cardDetails = await listing.nth(randomIndex).innerText();

    const lines = cardDetails.split('\n');
    const [sarsRef, category, sarsAmount, dueDate] = cardDetails.split('\n');
    ///Currency.filter(currencyCode => currencyCode.Code === sarsDetails[randomIndex].paymentCurrency);
    const currency = sarsDetails[randomIndex].paymentCurrency === 'ZAR' ? 'R' : sarsDetails[randomIndex].paymentCurrency;
    const amount = Number(sarsDetails[randomIndex].amount).toFixed(2);

    expect(sarsRef.toLowerCase()).toContain(sarsDetails[randomIndex].sarsReference.toLowerCase());
    expect(category.toLowerCase()).toContain(sarsDetails[randomIndex].category.toLowerCase());

    //expect(sarsAmount).toMatch(new RegExp(`${currency}\\s*${amount.replace('.', '\\.')}`));

    const normalisedSarsAmount = sarsAmount.replace(/,/g, '');

    expect(normalisedSarsAmount).toMatch(
      new RegExp(`${currency}\\s*${amount.replace('.', '\\.')}`)
    );

    expect(dueDate).toContain(await DateUtilities.getFormattedDate(sarsDetails[randomIndex].dueDate, 'DD/MM/YYYY'));

    const cardExpansionButton = await listing.nth(randomIndex);

    return await cardExpansionButton;

  }

  async expandPendingInitiationCard(card: Locator) {
    await card.click();

  }

  async verifySarsVerifyPage() {
    expect(this.iframe.getByRole("heading", { level: 5 })).toHaveText("SARS eFiling payment details");
    const noOfSarsRecors = await (await Table.getTableRows()).count();
    // expect(this.iframe.getByRole("paragraph").nth(0)).toHaveText(`${noOfSarsRecors} SARS payment to submit`);
    // expect(this.iframe.getByRole("paragraph", { new RegExp('SARS payment to submit' / i) }).nth(0)).toHaveText(`7 SARS payment to submit`);
    await expect(this.iframe.locator('p').filter({ hasText: /SARS payment to submit/i }).first()).toHaveText(`${noOfSarsRecors} SARS payment to submit`);
    // await expect(this.iframe.locator('p').filter({ hasText: /SARS payment to submit/i }).first()).toHaveText('7 SARS payment to submit');

  }

  async getSarsPaymentDetails() {
    expect(this.iframe.getByRole("heading", { level: 5 })).toHaveText("SARS eFiling payment details");

    const beneficiaryname = await IBOL.getFieldValue(this.iframe, "Beneficiary name");
    const debitaccount = await IBOL.getFieldValue(this.iframe, "Debit account");
    const originatingdate = await IBOL.getFieldValue(this.iframe, "Originating date");
    const amount = await IBOL.getFieldValue(this.iframe, "Amount");
    const availablebalance = await IBOL.getFieldValue(this.iframe, "Available balance");
    const duedate = await IBOL.getFieldValue(this.iframe, "Due date");
    const sarspaymentreferenctest = await IBOL.getFieldValue(this.iframe, "SARS payment reference");
    const category = await IBOL.getFieldValue(this.iframe, "Category");
    const paymentDate = await IBOL.getInputValue(this.iframe.locator("#paymentDate"));
    const debitAccountReference = await IBOL.getInputValue(this.iframe.locator("#debitAccountReference"));
    const noteForApprover = (await this.getNoteForApproverInput().inputValue()) == "" ? "-" : await this.getNoteForApproverInput().inputValue();
    const proofofpayment = await this.getProfOfPaymentEmailAddresses();
    const noteForApproverdocuments = await this.getNoteForApproverDocumentsInput().allTextContents;


    const sarsPaymentDetails: SarsPaymentDetails = {
      beneficiaryname: beneficiaryname,
      debitaccount: debitaccount,
      originatingdate: originatingdate,
      amount: amount,
      availablebalance: availablebalance,
      duedate: duedate,
      sarspaymentreferenctest: sarspaymentreferenctest,
      category: category,
      paymentDate: paymentDate,
      debitAccountReference: debitAccountReference,
      noteForApprover: noteForApprover,
      noteForApproverdocuments: await this.getNoteForApproverDocumentsInput().allTextContents(),
      proofofpayment: proofofpayment
    }

    return sarsPaymentDetails;


  }


  //move to main
  getNoteForApproverInput = () => {
    return this.iframe.locator("#noteForApprover");
  }

  getNoteForApproverDocumentsInput = () => {
    return this.iframe.locator("investec-online-global-file-upload p");
  }


  getProofOfPaymentsInput = (n) => {
    return this.iframe.locator(`#email-${n}`);
  }
  async getProfOfPaymentEmailAddresses(): Promise<string[]> {
    const emailAddresses: string[] = [];
    let index = 0;
    while (index < 3) {
      const emailInput = this.getProofOfPaymentsInput(index);
      if (await emailInput.isVisible()) {
        const email = await emailInput.inputValue();
        if (email && email.trim() !== '') {
          emailAddresses.push(email.trim());
        }
        index++;
      } else {
        break;
      }
    }
    return emailAddresses;
  }


  async verifySarsInformationSlider(paymentDetails: any) {

    expect(await IBOL.getFieldValue(this.iframe, "Payment ID")).toBe(paymentDetails.paymentID);
    expect(await IBOL.getFieldValue(this.iframe, "Originating date")).toBe(paymentDetails.originatingdate);
    expect(await IBOL.getFieldValue(this.iframe, "Payment ID")).toBe(paymentDetails.paymentID);
    expect(await IBOL.getFieldValue(this.iframe, "Due date")).toBe(paymentDetails.duedate);
    expect(await IBOL.getFieldValue(this.iframe, "Payment date")).toBe(paymentDetails.paymentDate);
    expect(await IBOL.getFieldValue(this.iframe, "Category")).toBe(paymentDetails.category);


    // console.log(await IBOL.getFieldValue(this.iframe, "Amount"))
    // await page.pause();
    // expect(await IBOL.getFieldValue(this.iframe,"Amount")).toHaveText(paymentDetails.amount.toString());
    //RUI expect(await IBOL.normalizeText(await IBOL.getFieldValue(this.iframe, "Debit account"))).toBe(await IBOL.normalizeText(paymentDetails.debitaccount));
    expect(await IBOL.getFieldValue(this.iframe, "Debit account reference")).toBe(paymentDetails.debitAccountReference);
    expect(await IBOL.getFieldValue(this.iframe, "Beneficiary name")).toBe(paymentDetails.beneficiaryname);
    // expect(await IBOL.getFieldValue(this.iframe,"Beneficiary reference")).toBe(paymentDetails.);

    for (const proof of paymentDetails.proofofpayment) {
      expect(await IBOL.getFieldValue(this.iframe, "Send proof of payment(s)")).toContain(proof);

    }

    expect(await IBOL.getFieldValue(this.iframe, "Note for approver")).toBe(paymentDetails.noteForApprover);

    for (const document of paymentDetails.noteForApproverdocuments) {
      expect(await IBOL.getFieldValue(this.iframe, "Note for approver documents")).toContain(document);

    }



  }


  async clickSubmitButton(buttobToClick: string = "Submit"): Promise<any> {
    const submitBtn = this.iframe.getByRole('button', { name: buttobToClick }).first();
    return IBOL.clickAndInterceptResponse(submitBtn, '/api/v1/authorisation/approval-ids');
  }


}