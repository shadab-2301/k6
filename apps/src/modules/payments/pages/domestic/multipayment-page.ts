import { FrameLocator, Locator, page, expect } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../../config/global-configs";
import { faker } from "@faker-js/faker";
import { IBOL } from "../../../../utilities/utilities/ibol-utilities";
import Table from "../../../shared/pages/data-table-page";
import Action from "../../../../../helper/actions";
import { Payment } from "../../../payments/interfaces/Payment";
import moment from "moment";

export default class MultiPaymentPage {

  iframe: FrameLocator;
  beneficiaryType: Locator;
  employeeType: Locator;
  debitAccount: Locator;
  paymentMethod: Locator;
  paymentDate: Locator;
  sendPOPRadioBtn: Locator;
  addRecordButton: Locator;
  paymentsTotalAmount: Locator;
  multiPaymentHeader: Locator;

  beneficiary = (n: number) => { return this.iframe.locator(`#beneficiary-${n}`) };
  beneficiaryaccount = (n: number) => { return this.iframe.locator(`#payments-${n}`).locator("td").first() };
  amount = (n: number) => { return this.iframe.locator(`#amount-${n}`) };
  beneficiaryReference = (n: number) => { return this.iframe.locator(`#beneficiaryReference-${n}`) };
  debitAccountRef = (n: number) => { return this.iframe.locator(`#debitAccountReference-${n}`) };
  informationIcon = (n: number) => { return this.iframe.getByRole("img", { name: /information/i }).nth(n).or(this.iframe.locator("#offcanvas-table-undefined").nth(n)).first(); };
  warningIcon = (n: number) => { return this.iframe.locator(`#warning-${n}`).or(this.iframe.locator(`#warning-undefined`).nth(n)); };
  debitAccountCard = () => { return this.iframe.locator('.card-body dl') };
  domesticPaymentVerifySubmitButton = () => { return this.iframe.locator("#domesticPaymentVerifySubmitButton,#payrollVerifySubmitButton") };
  doneButton = () => { return this.iframe.locator("#done,#payrollSummaryDoneButton") };




  static multiPartyPaymenRecords: Payment[] = [];
  static DEBIT_ACCOUNT: string;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.beneficiaryType = this.iframe.locator("#beneficiaryType");
    this.employeeType = this.iframe.locator("#employeeType");
    this.debitAccount = this.iframe.locator("#debitAccount");
    this.paymentMethod = this.iframe.locator("#paymentMethod").or(this.iframe.locator("#desiredPaymentMethod"));
    this.paymentDate = this.iframe.locator("#paymentDate").or(this.iframe.locator("#desiredPaymentDate"));
    this.sendPOPRadioBtn = this.iframe.getByLabel('Send proof of payment to all')
    this.addRecordButton = this.iframe.getByRole('button').filter({ hasText: 'Add' }).or(this.iframe.locator("#addRecordButton"));
    this.paymentsTotalAmount = this.iframe.getByText(/Payments total: R/);
    this.multiPaymentHeader = this.iframe.getByRole('heading', { name: 'Domestic payment details' });
  }

  async getTemplateName() {
    return await this.iframe.locator("#templateName");
  }

  async getTemplateDescription() {
    return await this.iframe.locator("#templateDescription");
  }

  async getEmployee(index: number = 0) {
    return this.beneficiary(index);
  }

  async getEmployeeReference(index: number = 0) {
    return this.beneficiaryReference(index);

  }


  async getToAccount(index: number = 0) {
    return this.beneficiary(index);
  }

  async getToAccRef(index: number = 0) {
    return this.beneficiaryReference(index);
  }

  assertReadonlyAndPrefilled = async (field: Locator) => {
    await expect(field).toBeDisabled();
    expect(await IBOL.isFiledNotEmpty(await field.inputValue())).toBe(true);
  };

  async verifyPayrollMultiTemplateMandatoryFields(testTemplateName: string) {
    const templateName = await this.getTemplateName();
    const templateDescription = await this.getTemplateDescription();
    const debitAccount = await this.getDebitAccount();
    const paymentMethod = await this.getPaymentMethod();
    const paymentDate = await this.getPaymentDate();
    const employeeType = await this.getEmployeeType();

    await this.assertReadonlyAndPrefilled(templateName);
    await this.assertReadonlyAndPrefilled(templateDescription);

    expect(await templateName.inputValue()).toBe(testTemplateName);

    expect(await this.getTemplateName()).toBeDisabled();
    expect(await IBOL.isFiledNotEmpty(await templateName.inputValue())).toBe(true);

    expect(await this.getTemplateDescription()).toBeDisabled();
    expect(await IBOL.isFiledNotEmpty(await templateDescription.inputValue())).toBe(true);

    expect(await this.getEmployeeType()).toBeDisabled();
    expect(await IBOL.isFiledNotEmpty(await employeeType.inputValue())).toBe(true);


    expect(await this.getDebitAccount()).toBeDisabled();
    expect(await IBOL.isFiledNotEmpty(await debitAccount.inputValue())).toBe(true);


    const debitAccountValue = await debitAccount.inputValue();

    const isCredidCardDebit = (debitAccountValue.toLowerCase().includes("credit card")) ? true : false;

    if (isCredidCardDebit) {
      expect(await this.getPaymentMethod()).toBeDisabled();
      expect(await this.getPaymentMethod()).toHaveValue("PayShap");
    } else {
      expect(await this.getPaymentMethod()).toBeEditable();
      expect(['EFT', 'RTGS', 'PayShap']).toContain(await paymentMethod.inputValue());

    }

    expect(await this.getPaymentDate()).toBeEditable();
    await this.verifyMutiRecordsDiabledFields();

  }

  async getEmployeeType() {
    return await this.employeeType;
  }

  async getDebitAccount() {
    return await this.debitAccount;
  }

  async getPaymentMethod() {
    return await this.paymentMethod;
  }

  async getPaymentDate() {
    return await this.paymentDate;
  }

  async verifyMutiRecordsDiabledFields() {
    const recordCount = await this.iframe.locator("//tr[contains(@id,'payments-')]").count();

    for (let i = 0; i < recordCount; i++) {
      const employee = await this.getEmployee(i);
      const employeeReference = await this.getEmployeeReference(i);

      await expect(employee).toBeDisabled();
      expect(await IBOL.isFiledNotEmpty(await employee.inputValue())).toBe(true);
      await expect(employeeReference).toBeDisabled();
      expect(await IBOL.isFiledNotEmpty(await employeeReference.inputValue())).toBe(true);

    }

  }


  async verifyMultiPaymentPageElements() {

    await expect(this.beneficiaryType).toHaveValue("Domestic");
    await expect(this.debitAccount).toHaveValue("");
    await expect(this.paymentMethod).toHaveValue("");
    await expect(this.paymentDate).toHaveValue("");
    await expect(this.beneficiary(0)).toHaveAttribute('placeholder', 'Select a beneficiary');
    await expect(this.amount(0)).toHaveAttribute('placeholder', '0.00');
    await expect(this.beneficiaryReference(0)).toHaveAttribute('placeholder', 'Beneficiary reference');
    await expect(this.debitAccountRef(0)).toHaveAttribute('placeholder', 'Debit account reference');
    await expect(this.sendPOPRadioBtn).not.toBeChecked();
    await expect(this.informationIcon(0)).toBeVisible();
    await expect(this.addRecordButton).toBeVisible();
    await expect(this.paymentsTotalAmount).toBeVisible();
    await expect(this.multiPaymentHeader).toBeVisible();
  }

  async setEmployeeType(employeeType: string) {
    await IBOL.click(this.employeeType, "Employee Type dropdown");
    const options = this.iframe.getByRole('option');
    await expect(options).toHaveText(['Payroll', 'Executive payroll']);

    const option = this.iframe.getByRole('option', { name: new RegExp(`^${employeeType}$`, 'i') });
    await option.waitFor({ state: 'visible' });
    await IBOL.click(option, `${employeeType} option`);

  }


  async setBeneficiaryType(type: string) {
    await IBOL.click(this.beneficiaryType, "Beneficiary Type dropdown");
    const options = this.iframe.getByRole('option');
    await expect(options).toHaveText(['Domestic', 'Bank approved']);

    const option = this.iframe.getByRole('option', { name: new RegExp(`^${type}$`, 'i') });
    await option.waitFor({ state: 'visible' });
    await IBOL.click(option, `${type} option`);
  }

  async setDebitAccount(type: string) {
    const responsePromise = page.waitForResponse(response =>
      /\/api\/v1\/domestic-payments\/\d+\/balance.*accountType/.test(response.url()) &&
      response.status() === 200
    );

    await IBOL.click(this.debitAccount, "Debit Account dropdown");
    const option = this.iframe.getByRole('option', { name: new RegExp(`${type}`, 'i') }).nth(0);
    await option.waitFor({ state: 'visible' });
    await IBOL.click(option, `${type} option`);

    const responseMatch = await responsePromise;
    const responseBody = await responseMatch.json();

    if (!responseBody || typeof responseBody.availableBalance === 'undefined') {
      throw new Error(`Available balance not found in the response: ${JSON.stringify(responseBody)}`);
    }

    MultiPaymentPage.DEBIT_ACCOUNT = await this.debitAccount.inputValue();

    const balance = responseBody.availableBalance;
  }

  async setInvestecToInvestecPaymentMethod(method: string, debitAccount: string, creditAccount: string) {
    const paymentMethodDropdown = this.iframe.locator("#paymentMethod ~ button").or(this.iframe.locator("#desiredPaymentMethod ~ button"));

    if (debitAccount.toLocaleLowerCase().includes("investec") && creditAccount.toLocaleLowerCase().includes("investec")) {
      await expect(this.paymentMethod).toBeEnabled();
      let options;
      let isOptionsDisplayed = true;
      let attempts = 0;
      do {
        await IBOL.click(paymentMethodDropdown, "Payment Method dropdown");
        options = this.iframe.locator("#paymentMethod ~ ngb-typeahead-window [role='option'], #desiredPaymentMethod ~ ngb-typeahead-window [role='option']");
        await expect(options.first()).toBeVisible({ timeout: 5000 }).catch(() => { isOptionsDisplayed = false });
        await page.waitForTimeout(1000);
        attempts++
      } while (!isOptionsDisplayed && attempts < 3 && options.count() > 0);

      if (options.count() === 0) {
        throw new Error("❌ No payment method options available");
      }

      await page.waitForTimeout(1000);

      await expect(options).toHaveText(['EFT', 'PayShap']);


      const option = this.iframe.getByRole('option', { name: new RegExp(`^${method}$`, 'i') });
      await option.waitFor({ state: 'visible' });

      const response = await IBOL.click(option);
      /*
      Notes:
      yes, it is intentionally disabled
      It is not used as the different payments can have different cut-offs, so the call was made to just use the verify screen to show when the dates will be auto-forwarded
       
      I'm pretty sure that even though the call is made in Domestic, that it isn't used for anything
       
      */

      //const response = await IBOL.clickAndInterceptResponse(option, "/payment-manager/non-banking-days");
      // const response = await IBOL.clickAndInterceptResponse(option, "/api/v1/payment-manager/payment-methods");


    }
  }

  async setPaymentMethod(method: string, debitAccount: string, beneficiaryType: string = "Domestic") {
    const paymentMethodDropdown = this.iframe.locator("#paymentMethod ~ button").or(this.iframe.locator("#desiredPaymentMethod ~ button"));
    if (debitAccount.toLocaleLowerCase().includes("credit")) {
     
      await expect(this.paymentMethod).toBeDisabled();

      if (method.toLocaleLowerCase().includes("payshap")) {
        await expect(this.paymentMethod).toHaveValue("PayShap");
        return;
      }

      throw new Error(`❌ Payment method should be set to PayShap when debit account is credit.Required payment method value: ${method} not set`);
    }

    if (debitAccount.toLocaleLowerCase().includes("investec")) {
      await expect(this.paymentMethod).toBeEnabled();
      let options;
      let isOptionsDisplayed = true;
      let attempts = 0;
      do {
        await IBOL.click(paymentMethodDropdown, "Payment Method dropdown");
        options = this.iframe.locator("#paymentMethod ~ ngb-typeahead-window [role='option'], #desiredPaymentMethod ~ ngb-typeahead-window [role='option']");
        await expect(options.first()).toBeVisible({ timeout: 5000 }).catch(() => { isOptionsDisplayed = false });
        await page.waitForTimeout(1000);
        attempts++
      } while (!isOptionsDisplayed && attempts < 3 && options.count() > 0);

      if (options.count() === 0) {
        throw new Error("❌ No payment method options available");
      }

      await page.waitForTimeout(1000);
      if (beneficiaryType.toLocaleLowerCase().includes("domestic") || beneficiaryType.toLocaleLowerCase().includes("payroll")) {
        await expect(options).toHaveText(['PayShap', 'EFT', 'RTGS']);
      } else {
        await expect(options).toHaveText(['EFT', 'RTGS']);
      }

      const option = this.iframe.getByRole('option', { name: new RegExp(`^${method}$`, 'i') });
      await option.waitFor({ state: 'visible' });

      const response = await IBOL.click(option);
      /*
      Notes:
      yes, it is intentionally disabled
      It is not used as the different payments can have different cut-offs, so the call was made to just use the verify screen to show when the dates will be auto-forwarded
       
      I'm pretty sure that even though the call is made in Domestic, that it isn't used for anything
       
      */

      //const response = await IBOL.clickAndInterceptResponse(option, "/payment-manager/non-banking-days");
      // const response = await IBOL.clickAndInterceptResponse(option, "/api/v1/payment-manager/payment-methods");


    }
  }


  async setPaymentDate(daysFromToday: number) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysFromToday);
    const targetDateString = targetDate.toISOString().split('T')[0];
    await this.paymentDate.fill(targetDateString);
  }


  async checkSendProofOfPayment() {
    await IBOL.checkBoxCheck(this.sendPOPRadioBtn, "Send proof of payment checkbox");
    await expect(this.sendPOPRadioBtn).toBeChecked();
  }


  async newselectPaymentType(dropdownName: string, option: string): Promise<void> {
    const dropdownButton = this.iframe.getByRole('button', { name: new RegExp(dropdownName, 'i') });
    await IBOL.click(dropdownButton, `Payment Type dropdown`);

    // Wait for dropdown menu to render and stabilize
    await page.waitForTimeout(500);

    const dropDownOption = this.iframe.getByRole('button', { name: new RegExp(option, 'i') }).first();

    // Wait for option button to be visible and stable
    await dropDownOption.waitFor({ state: 'visible', timeout: 10000 });

    // Additional stability check - wait for DOM to settle
    await page.waitForTimeout(300);

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        await dropDownOption.click({ timeout: 5000 });
        break;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          await dropDownOption.click({ force: true });
        } else {
          await page.waitForTimeout(300);
        }
      }
    }
  }

  /**
   * 
   * @param beneficiary 
   * @param numberNumber 
   * 
   */
  async setBeneficiary(beneficiary: string = "", numberNumber: number = 0) {
    let response = await page.waitForResponse(response => /\/payment-manager\/beneficiaries/.test(response.url()) && response.status() === 201, { timeout: 5000 }).catch(() => {
      console.warn("Beneficiaries API response not received within timeout");
    });


    await IBOL.click(this.beneficiary(numberNumber), "Debit Account dropdown");
    await IBOL.enterText(this.beneficiary(numberNumber), beneficiary);
    const option = this.iframe.getByRole('option', { name: new RegExp(`${beneficiary}`, 'i') }).nth(0);
    try {
      await option.waitFor({ state: 'visible' });
      await IBOL.click(option, `${beneficiary} option`);
    } catch (error) {
      throw new Error(`❌ Failed to select beneficiary option: ${beneficiary}. Error: Beneficiary doesn't exist or was deleted`);
    }
  }

  async setDebitAccountReference(reference: string = "", numberNumber: number = 0, beneficiaryName: string = "") {

    const debitAccREf = await this.debitAccountRef(numberNumber);
    await debitAccREf.waitFor({ state: 'visible', timeout: 5000 });
    let currentValue = await debitAccREf.inputValue();
    if (currentValue !== "") {

      if (IBOL.containsSpecialChars(currentValue)) {
        currentValue = await IBOL.normalizeText(currentValue);
        await IBOL.fill(debitAccREf, currentValue);
      }

      return;
    }

    if (reference === "") {
      reference = `Test Automation Debit Account Ref ${numberNumber}`;
    }

    expect(async () => await debitAccREf.isEditable()).toPass({ timeout: 30000 });

    if (beneficiaryName != "") {
      await this.iframe.getByRole('row', { name: beneficiaryName }).getByPlaceholder('Debit account reference').fill(`AutoRef ${Math.floor(Math.random() * 10000)}`);
      return;
    }

    await IBOL.fill(debitAccREf, `AutoRef ${Math.floor(Math.random() * 10000)}`)
  }

  async setBeneficiaryReference(reference: string = "", numberNumber: number = 0) {

    let currentValue = await this.beneficiaryReference(numberNumber).inputValue();
    if (currentValue !== "") {

      if (IBOL.containsSpecialChars(currentValue)) {
        currentValue = await IBOL.normalizeText(currentValue);
        await IBOL.fill(this.beneficiaryReference(numberNumber), currentValue);
      }

      return;
    }

    if (reference === "") {
      reference = `Test Automation Beneficiary Ref ${numberNumber}`;
    }

    await IBOL.enterText(this.beneficiaryReference(numberNumber), reference);
  }

  async setAmount(amount: string, numberNumber: number = 0) {

    const currentValue = await this.amount(numberNumber).inputValue();
    if (currentValue !== "") {
      throw new Error(`❌ Amount field already has a value of ${currentValue}, it should not be pre-populated`);
    }

    await IBOL.enterText(this.amount(numberNumber), amount);
  }

  async getTextFromWorningIcon(recordNumber: number = 0) {
    let warningMessage = "";
    let isClicked = true;

    const warningIconVisible = await this.warningIcon(recordNumber);

    const isWarnigIconVisible = await warningIconVisible.isVisible({ timeout: 1000 }).catch(() => { return false });

    if (!isWarnigIconVisible) {
      return "N/A";
    }


    await warningIconVisible.hover()
    const tooltipId = await warningIconVisible.getAttribute('aria-describedby');

    if (tooltipId) {
      let tooltip = this.iframe.locator(`#${tooltipId}`);
      warningMessage = (await tooltip.innerText()).trim();
      return warningMessage;
    }


    await warningIconVisible.click({ timeout: 1000 }).catch(() => { isClicked = false });

    await warningIconVisible.waitFor({ state: 'hidden', timeout: 3000 })
      .then(() => { isClicked = false })
      .catch(() => { isClicked = true });

    if (!isClicked) {
      return "N/A"
    }



    const warningMessageicon = (n) => { return this.iframe.locator(`#warning-${n}`).or(this.iframe.locator(`#warning-undefined`).nth(n)); };
    expect(warningMessageicon(recordNumber)).toBeVisible({ timeout: 10000 });
    warningMessage = await this.iframe.locator(`ids-popover[for="warning-${recordNumber}"] p`).innerText();
    return warningMessage;

  }


  /**
   *  default values for amount and references are set to allow quick addition of payment records 
   * when the specific value of these fields are not important for the test scenario.
   *  The method can be called with specific values for these fields when needed.
   */
  async addPaymentRecord(paymentMethod: string, amount: string = "100", recordNumber: number = 0, beneficiary: string = "", sendProofOfPayment: boolean = false, debitAccountReference: string = "", beneficiaryReference: string = "", adjustPaymentMethod: string = "") {

    if (recordNumber != 0) {
      await IBOL.click(this.addRecordButton, "Add Record button");
    }

    await this.setBeneficiary(beneficiary, recordNumber);
    await this.setDebitAccountReference(debitAccountReference, recordNumber);
    await this.setBeneficiaryReference(beneficiaryReference, recordNumber);
    await this.setAmount(amount, recordNumber);


    const paymentWarning = await this.getTextFromWorningIcon(recordNumber);


    let userEmails: string[] = [];
    let note: string = "";

    if (sendProofOfPayment) {
      const proofOfPayment = await this.setProofOfPaymentForRecord(recordNumber);
      userEmails = proofOfPayment.userEmails;
      note = proofOfPayment.note;

      const doneBtn = this.iframe.getByRole('button', { name: 'Done' });
      await expect(doneBtn).toBeVisible();
      await IBOL.click(doneBtn, "Close Proof of Payment modal");
    }

    const amountEnterd = IBOL.formatAmount(await this.amount(recordNumber).inputValue());
    // const beneficiaryType = await this.beneficiaryType.inputValue() ?? await this.employeeType.inputValue();

    let beneficiaryType: string;
    try {
      beneficiaryType = await this.beneficiaryType.inputValue({ timeout: 5000 });
    } catch {
      beneficiaryType = await this.employeeType.inputValue({ timeout: 5000 });
    }


    if (beneficiaryType) {
      if (!['domestic', 'bank approved', 'payroll', 'executive payroll'].includes(beneficiaryType.trim().toLowerCase())) {
        throw new Error(`❌ Unexpected beneficiary type value: ${beneficiaryType}`);
      }
    }


    const isPayroll = await beneficiaryType.toLocaleLowerCase().includes("payroll");
    if (isPayroll) {
      beneficiaryType = beneficiaryType;
    } else {
      beneficiaryType = (beneficiaryType === "Domestic") ? "Domestic" : "Investec approved beneficiary";
    }


    let bankName = "-";
    let accountNumber = "-";
    if (beneficiaryType.trim().toLowerCase() === "domestic") {// || beneficiaryType.toLocaleLowerCase().includes("payroll")
      bankName = (await this.beneficiaryaccount(recordNumber).innerText()).split("-")[0].trim();
      accountNumber = (await this.beneficiaryaccount(recordNumber).innerText()).split("-")[1].trim();
    }

    if (beneficiaryType.toLocaleLowerCase().includes("payroll")) {
      bankName = (await this.beneficiaryaccount(recordNumber).innerText()).split("-")[0].trim();
      accountNumber = (await this.beneficiaryaccount(recordNumber).innerText()).split("-")[1].trim();
    }

    const beneficiaryAccount = (isPayroll) ?
      (await this.beneficiaryaccount(recordNumber).innerText()).trim() :
      (beneficiaryType === "Domestic") ? (await this.beneficiaryaccount(recordNumber).innerText()).replace("-", "").trim() : "Investec approved beneficiary";

    const debitAccount = await this.debitAccount.inputValue();


    const paymentRecord: Payment = {
      ...(isPayroll
        ? { employeeName: await this.beneficiary(recordNumber).inputValue() }
        : { beneficiary: await this.beneficiary(recordNumber).inputValue() }),
      // beneficiaryAccount: (beneficiaryType === "Domestic") ? (await this.beneficiaryaccount(recordNumber).innerText()).replace("-", "").trim() : "Investec approved beneficiary",
      beneficiaryAccount: beneficiaryAccount,
      bank: bankName,
      accountNumber: accountNumber,
      debitAccount: debitAccount,
      beneficiaryType: beneficiaryType,
      debitAccRef: await this.debitAccountRef(recordNumber).inputValue(),
      beneficiaryReference: await this.beneficiaryReference(recordNumber).inputValue(),
      amount: amountEnterd,
      paymentDate: await this.paymentDate.inputValue(),
      paymentMethod: (adjustPaymentMethod != "") ? adjustPaymentMethod : paymentMethod,
      proofofpayment: userEmails,
      noteForApprover: (note == "") ? "-" : note,
      paymentWarning: paymentWarning
    }

    MultiPaymentPage.multiPartyPaymenRecords.push(paymentRecord);
  }



  async addGroupPaymentRecord(paymentMethod: string, beneficiaryType: string, amount: string = "100", recordNumber: number = 0, beneficiary: string = "", sendProofOfPayment: boolean = false, debitAccountReference: string = "", beneficiaryReference: string = "", adjustPaymentMethod: string = "") {
    await expect(this.beneficiary(recordNumber)).toBeDisabled();
    await expect(this.beneficiary(recordNumber)).toHaveValue(beneficiary);
    await this.setDebitAccountReference(debitAccountReference, recordNumber, beneficiary);
    await this.setBeneficiaryReference(beneficiaryReference, recordNumber);
    await this.setAmount(amount, recordNumber);

    const paymentWarning = await this.getTextFromWorningIcon(recordNumber);


    let userEmails: string[] = [];
    let note: string = "";

    if (sendProofOfPayment) {
      const proofOfPayment = await this.setProofOfPaymentForRecord(recordNumber);
      userEmails = proofOfPayment.userEmails;
      note = proofOfPayment.note;

      const doneBtn = this.iframe.getByRole('button', { name: 'Done' });
      await expect(doneBtn).toBeVisible();
      await IBOL.click(doneBtn, "Close Proof of Payment modal");
    }

    const amountEnterd = IBOL.formatAmount(await this.amount(recordNumber).inputValue());


    let bankbeneficiaryaccount = await Table.getCellValueByHeader("Beneficiary account", recordNumber);

    //const bankbeneficiaryaccount = (await this.beneficiaryaccount(recordNumber).innerText());



    let bank = IBOL.getCharatersPart(bankbeneficiaryaccount);
    let accountNumber = IBOL.genNumbersPart(bankbeneficiaryaccount);

    if (accountNumber == "") {
      bank = "";
      accountNumber = "";
      bankbeneficiaryaccount = "Investec approved beneficiary";
    }

    const debitAccount = await this.debitAccount.inputValue();

    const paymentRecord: Payment = {
      beneficiary: await this.beneficiary(recordNumber).inputValue(),
      beneficiaryAccount: await bankbeneficiaryaccount,//(beneficiaryType === "Domestic") ? (await this.beneficiaryaccount(recordNumber).innerText()).replace("-", "").trim() : "Investec approved beneficiary",
      bank: bank,
      accountNumber: accountNumber,
      debitAccount: debitAccount,
      beneficiaryType: (beneficiaryType === "Domestic") ? "Domestic" : "Investec approved beneficiary",
      debitAccRef: await this.debitAccountRef(recordNumber).inputValue(),
      beneficiaryReference: await this.beneficiaryReference(recordNumber).inputValue(),
      amount: amountEnterd,
      paymentDate: await this.paymentDate.inputValue(),
      paymentMethod: (adjustPaymentMethod != "") ? adjustPaymentMethod : paymentMethod,
      proofofpayment: userEmails,
      noteForApprover: (note == "") ? "-" : note,
      paymentWarning: paymentWarning
    }


    MultiPaymentPage.multiPartyPaymenRecords.push(paymentRecord);
  }


  async setProofOfPaymentForRecord(numberNumber: number = 0) {
    await IBOL.click(this.informationIcon(numberNumber), `Information icon for record ${numberNumber}`);
    const userEmails = await this.addProofPayment(3);
    const note = await this.setNoteForApproverAndUpload(`Multi Payment Automation Note ${Math.floor(Math.random() * 9000) + 1000}`, numberNumber);

    return { userEmails, note };

  }

  async setNoteForApproverAndUpload(note: string, recordNumber: number = 0) {
    await IBOL.click(this.iframe.getByRole('tab', { name: 'Uploads' }), "UploadsTab");
    await this.addNoteForApprover(note);
    await this.uplaodDocumentForPayment();

    return note;

  }

  async addNoteForApprover(note: string) {
    const noteField = this.iframe.locator(`#noteForApprover`);
    await IBOL.enterText(noteField, note);
  }

  async uplaodDocumentForPayment(uploadfile: string = "apps/test/resources/testupload.pdf") {
    await this.iframe.locator("input[type='file']").setInputFiles([uploadfile]);
    const downloadstatus = await this.iframe.getByText("100% uploaded").first();

    await expect(async () => {
      await downloadstatus.waitFor({ state: 'visible', timeout: 10000 });
    }).toPass({ timeout: 60000 });

    expect(downloadstatus).toContainText("100% uploaded");
  }

  async addProofPayment(numberOfEmails: number = 1) {
    numberOfEmails = 1
    const userEmails: string[] = [];

    expect(this.iframe.getByRole('heading', { name: 'Payment overview' })).toBeVisible();
    await IBOL.click(this.iframe.getByRole('tab', { name: 'Proof of payment' }), "ProofOfPaymentTab");

    const sendProofOfPaymentCheckbox = this.iframe.locator('div[role="tabpanel"] input[type="checkbox"]');
    await IBOL.checkBoxCheck(sendProofOfPaymentCheckbox, "Send proof of payment checkbox");

    if (numberOfEmails > 3) {
      numberOfEmails = 3;
    }

    let counter = 0;

    const addEmailButton = this.iframe.locator(`#add-email`);

    let isAddEmailButtonVisible = await addEmailButton.isVisible({ timeout: 2000 });


    while (counter < numberOfEmails && isAddEmailButtonVisible) {

      if (counter != 0) {
        await IBOL.click(addEmailButton, "Add email button in Proof of payment tab");
      }

      let limitTest = counter + 1;
      if (limitTest == 3) {
        expect(addEmailButton).not.toBeVisible();
      }

      const email = (counter: number) => { return this.iframe.locator(`#email-${counter}`) };
      const userEmail = faker.internet.email();
      await IBOL.enterText(email(counter), userEmail);
      userEmails.push(userEmail);
      counter++;
      isAddEmailButtonVisible = await addEmailButton.isVisible({ timeout: 2000 });
    }
    return userEmails;
  }

  async paymentOverViewModal() {
    expect(this.iframe.getByRole('heading', { name: 'Payment overview' })).toBeVisible();
    await IBOL.click(this.iframe.getByRole('tab', { name: 'Proof of payment' }), "ProofOfPaymentTab");
    await IBOL.click(this.iframe.getByRole('tab', { name: 'Uploads' }), "UploadsTab");
  }



  async getPaymentTotalAmount() {
    const totalText = await this.paymentsTotalAmount.textContent();
    const totalMatch = totalText?.match(/Payments total: R\s*([\d,]+(?:\.\d{2})?)/);
    if (totalMatch && totalMatch[1]) {
      return parseFloat(totalMatch[1].replace(/,/g, ''));
    }
    throw new Error(`❌ Could not extract total amount from text: ${totalText}`);
  }

  async verifyTotalAmount() {

    const toltalpayment = MultiPaymentPage.multiPartyPaymenRecords.reduce((total, record) => {
      const cleanAmount = record.amount.replace(/R/g, '').replace(/,/g, '').trim();
      return total + parseFloat(cleanAmount);
    }, 0);

    const UITotalAmount = await this.getPaymentTotalAmount();

    expect(UITotalAmount).toBe(toltalpayment);
  }

  async clickDetailsContinueButton(template: boolean = false) {
    const btn = this.iframe.locator("#continue");

    await page.waitForTimeout(5000);
    if (template) {
      // await this.clickButtonAndVerifyNavigationUrl(btn, "/payments/details/domestic/templates/stepper/pay/multi-payment/");
      await IBOL.click(btn, 'Continue button');
    } else {
      // await this.clickButtonAndVerifyNavigationUrl(btn, "/domestic/stepper/create/multi-payment/verify");
      await IBOL.click(btn, 'Continue button');
    }

  }


  async clickGroupDetailsContinueButton(template: boolean = false) {
    const btn = this.iframe.locator("#continue");

    await page.waitForTimeout(5000);
    if (template) {
      //await this.clickButtonAndVerifyNavigationUrl(btn, "/payments/details/domestic/templates/stepper/pay/multi-payment/");
    } else {
      //await this.clickButtonAndVerifyNavigationUrl(btn, "/business-banking/bb/payments/details/domestic/stepper/create/group-payment/verify");
      await IBOL.click(btn, "Continue button on group payment details page");
    }

  }

  async clickGroupDetailsSubmitButton(template: boolean = false) {
    const btn = this.iframe.locator("#domesticPaymentVerifySubmitButton");

    await page.waitForTimeout(5000);
    if (template) {
      //await this.clickButtonAndVerifyNavigationUrl(btn, "/payments/details/domestic/templates/stepper/pay/multi-payment/");
    } else {
      //await this.clickButtonAndVerifyNavigationUrl(btn, "/business-banking/bb/payments/details/domestic/stepper/create/group-payment/summary");
      await IBOL.click(btn, "Continue submit on group payment details page");
    }

  }


  async verifyDebitAccountCard(debitAccDetails: string = "Domestic") {


    const debitAccountCard = this.debitAccountCard();

    expect(debitAccountCard).toBeVisible();
    const debitAccountDetails = debitAccDetails.split("-");

    const debitAccount = debitAccountDetails[0].trim();
    const debitAccountNumber = debitAccountDetails[1].trim();

    expect(debitAccountCard).toContainText(debitAccount);
    expect(debitAccountCard).toContainText(debitAccountNumber);
  }


  async verifyGroupPaymentDetailsForRecords() {

    //TOBE Implimentes counts and next steps


    for (let i = 0; i < MultiPaymentPage.multiPartyPaymenRecords.length; i++) {
      let payment = MultiPaymentPage.multiPartyPaymenRecords[i];


      let paymentDate = await Table.getCellValueByHeader("Payment date", i)

      // console.log(paymentDate);

      //let newPaymentDate = paymentDate.replace(payment.paymentDate, "").trim();


      console.log(JSON.stringify(payment, null, 2));


      console.log(`Payment date from record: ${payment.paymentDate}`);
      console.log(`Payment date from table: ${paymentDate}`);
      //console.log(`New payment date after replacement: ${newPaymentDate}`);

      if (payment.originalpaymentdate != payment.paymentDate) {
        const currentPaymentDate = moment(payment.paymentDate, 'DD/MM/YYYY', true);
        const originalPaymentDate = moment(payment.originalpaymentdate, 'YYYY-MM-DD', true);

        const isAfter = currentPaymentDate.isAfter(originalPaymentDate, 'day');
        payment.autoForwaded = isAfter;
      }

      // if (newPaymentDate != "") {
      //   await page.pause();
      //   payment.originalpaymentdate = payment.paymentDate;
      //   paymentDate = newPaymentDate;
      //   payment.paymentDate = newPaymentDate;
      //   payment.autoForwaded = true;
      // }


      expect(payment.paymentDate).toBe(paymentDate);
      expect(payment.beneficiary).toBe(await Table.getCellValueByHeader("Beneficiary name", i));
      const normalizedBeneficiaryAccount = payment.beneficiaryAccount.toLowerCase().replace(/\s/g, '');
      const tableAccount = (await Table.getCellValueByHeader("Beneficiary account", i)).toLowerCase().replace(/\s/g, '');
      expect(normalizedBeneficiaryAccount).toBe(tableAccount);

      if (page.url().includes("verify")) {
        expect(payment.paymentMethod).toBe(await Table.getCellValueByHeader("Payment method", i));
      }

      expect(payment.amount).toBe(await Table.getCellValueByHeader("Amount", i));

      if (page.url().includes("summary")) {
        const FTNumber = await Table.getCellValueByHeader("Payment ID", i);
        expect(FTNumber).toMatch(/^FT\d+$/);
        MultiPaymentPage.multiPartyPaymenRecords[i].paymentID = FTNumber;

        const status = await Table.getCellValueByHeader("Status", i);
        expect(status).not.toBe("");
        MultiPaymentPage.multiPartyPaymenRecords[i].status = status;


      }


      if (page.url().includes("verify")) {
        await this.verifyInformationDetailsForPaymentRecord(payment, i);
      } else if (page.url().includes("summary")) {

        const isDownloadRequired = (i < 3) ? true : false;
        await this.verifyInformationDetailsForPaymentRecordSummary(payment, i, isDownloadRequired);
      }

    }
  };





  async verifyPaymentDetailsForRecords(beneficiaryType: string = "Domestic") {



    for (let i = 0; i < MultiPaymentPage.multiPartyPaymenRecords.length; i++) {
      let payment = MultiPaymentPage.multiPartyPaymenRecords[i];


      let paymentDate = await Table.getCellValueByHeader("Payment date", i)
      let newPaymentDate = paymentDate.replace(payment.paymentDate, "").trim();

      if (newPaymentDate != "") {
        payment.originalpaymentdate = payment.paymentDate;
        paymentDate = newPaymentDate;
        payment.paymentDate = newPaymentDate;
        payment.autoForwaded = true;
      }
      expect(payment.amount).toBe(await Table.getCellValueByHeader("Amount", i));
      expect(payment.paymentDate).toBe(paymentDate);



      const isPayroll = (payment.beneficiaryType.toLocaleLowerCase().trim() === "payroll") ? true : false;

      if (!isPayroll) {

        expect(payment.beneficiary).toBe(await Table.getCellValueByHeader("Beneficiary name", i));
        const normalizedBeneficiaryAccount = payment.beneficiaryAccount.toLowerCase().replace(/\s/g, '');
        const tableAccount = (await Table.getCellValueByHeader("Beneficiary account", i)).toLowerCase().replace(/\s/g, '');


        if (normalizedBeneficiaryAccount != "") {
          expect(normalizedBeneficiaryAccount).toBe(tableAccount);
          if (page.url().includes("verify")) {
            expect(payment.paymentMethod).toBe(await Table.getCellValueByHeader("Payment method", i));

          }
        }
      } else {

        expect(IBOL.normalizeText(payment.beneficiaryAccount)).toBe(IBOL.normalizeText(await Table.getCellValueByHeader("Employee account", i)));
        const normalizedDebitAccount = IBOL.normalizeText(payment.debitAccount).toLowerCase().replace(/\s/g, '');
        const tableAccount = (await Table.getCellValueByHeader("Debit account", i)).toLowerCase().replace(/\s/g, '');


        if (normalizedDebitAccount != "") {
          expect(normalizedDebitAccount).toBe(tableAccount);
          if (page.url().includes("verify")) {

            const uiValue = (await Table.getCellValueByHeader("Payment method", i)).toLowerCase();
            if (await uiValue.includes("edited")) {
              expect(uiValue).toContain(payment.paymentMethod.toLowerCase());

            } else {
              expect(payment.paymentMethod).toBe(await Table.getCellValueByHeader("Payment method", i));
            }

          }
        }


      }





      if (page.url().includes("summary") && !isPayroll) {
        const FTNumber = await Table.getCellValueByHeader("Payment ID", i);
        expect(FTNumber).toMatch(/^FT\d+$/);
        MultiPaymentPage.multiPartyPaymenRecords[i].paymentID = FTNumber;
        const status = await Table.getCellValueByHeader("Status", i);
        expect(status).not.toBe("");
        MultiPaymentPage.multiPartyPaymenRecords[i].status = status;
      }



      if (page.url().includes("verify")) {// && !isPayroll
        await this.verifyInformationDetailsForPaymentRecord(payment, i);
      } else if (page.url().includes("summary")) {
        await this.verifyInformationDetailsForPaymentRecordSummary(payment, i);
      }

    }
  };

  async verifyPaymentsTotalAmount() {
    let totalAmountSummaryScreen = await this.getPaymentTotalAmount();
    const formattedTotal = totalAmountSummaryScreen.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const verifyTotal = this.iframe.getByText('Payments total: R');
    expect(verifyTotal).toContainText(`Payments total: R ${formattedTotal}`);

  }


  async verifyMultiPaymentVerifyPage(beneficiaryType: string = "Domestic") {

    await this.iframe.getByRole('heading', { name: 'Payment details' }).waitFor({ state: 'visible', timeout: 10000 });
    expect(this.iframe.getByRole('heading', { name: 'Payment details' })).toBeVisible();

    const isPayroll = (beneficiaryType.toLocaleLowerCase().trim() === "payroll") ? true : false;
    const headerText = (isPayroll) ? 'payroll' : 'domestic';


    const noOfPayments = this.iframe.getByText(`${MultiPaymentPage.multiPartyPaymenRecords.length} ${headerText} payment(s) to submit`);
    expect(noOfPayments).toBeVisible()

    if (!isPayroll) {

      await this.verifyDebitAccountCard(MultiPaymentPage.DEBIT_ACCOUNT)

      await this.verifyPaymentDetailsForRecords();

      await this.verifyPaymentsTotalAmount();
      return;
    }


    await this.verifyPaymentDetailsForRecords(beneficiaryType);








    // await this.clickButtonAndVerifyNavigationUrl(this.domesticPaymentVerifySubmitButton(), "/domestic/stepper/create/multi-payment/summary");

  }


  async verifyMultiPaymentSummaryPage() {


    await this.iframe.getByRole('heading', { name: 'Payment details' }).waitFor({ state: 'visible', timeout: 10000 });
    expect(this.iframe.getByRole('heading', { name: 'Payment details' })).toBeVisible();

    await this.verifyDebitAccountCard(MultiPaymentPage.DEBIT_ACCOUNT)
    await this.verifyPaymentDetailsForRecords();

  }

  async verifyDomesticGroupSummaryPage() {
    await this.iframe.getByRole('heading', { name: 'Payment details' }).waitFor({ state: 'visible', timeout: 10000 });
    expect(this.iframe.getByRole('heading', { name: 'Payment details' })).toBeVisible();

    await this.verifyDebitAccountCard(MultiPaymentPage.DEBIT_ACCOUNT)
    await this.verifyPaymentDetailsForRecords();

  }

  async verifyInformationDetailsForPaymentRecord(payment: any, recordNumber: number) {

    const isPayroll = payment.beneficiaryType?.trim().toLowerCase().includes('payroll') ?? false;

    const infoIcon = this.informationIcon(recordNumber);
    await expect(infoIcon).toBeVisible({ timeout: 5000 });
    await IBOL.click(infoIcon, `Information icon for record ${recordNumber}`);

    await expect(this.iframe.getByRole('heading', { name: 'Payment details', level: 5 })).toBeVisible({ timeout: 10000 });
    const paymentDateValue = await IBOL.getFieldValue(this.iframe, 'Payment date');



    //  expect(paymentDateValue).toBe(payment.paymentDate);
    console.log(`Payment date from record: ${payment.paymentDate}`);
    console.log(`Payment date from UI: ${paymentDateValue}`);

    console.log(await paymentDateValue);

    //expect(paymentDateValue.includes(payment.paymentDate)).toBe(true);
    const uiPaymentDate = payment.paymentDate;
    expect(uiPaymentDate.includes(paymentDateValue)).toBe(true);



    if (payment.proofofpayment.length > 0) {
      for (let i = 0; i < payment.proofofpayment.length; i++) {
        expect(await IBOL.getField(this.iframe, 'Send proof of payment(s)')).toContainText(payment.proofofpayment[i]);
      }
    }

    expect(await IBOL.getFieldValue(this.iframe, 'Payment method')).toBe(payment.paymentMethod);

    if (isPayroll) {
      expect(await IBOL.getField(this.iframe, 'Employee name')).toHaveText(payment.employeeName);
      expect(await IBOL.getField(this.iframe, 'Employee type')).toHaveText(payment.beneficiaryType);
      const uiBankDetails = await IBOL.getField(this.iframe, 'Employee bank details');
      expect(IBOL.normalizeText(await uiBankDetails.textContent()).toLowerCase()).toContain(IBOL.normalizeText(payment.beneficiaryAccount).toLowerCase());
      expect(await IBOL.getFieldValue(this.iframe, 'Employee reference')).toBe(payment.beneficiaryReference);

    } else {
      expect(await IBOL.getField(this.iframe, 'Beneficiary type')).toHaveText(payment.beneficiaryType);
      expect(await IBOL.getFieldValue(this.iframe, 'Beneficiary name')).toBe(payment.beneficiary);
      expect(await IBOL.getFieldValue(this.iframe, 'Account number')).toBe(payment.accountNumber);
      expect(await IBOL.getFieldValue(this.iframe, 'Bank name')).toBe(payment.bank);
      expect(await IBOL.isFiledNotEmptyAndDash(await IBOL.getFieldValue(this.iframe, 'Branch Code'))).toBe(true);
      expect(await IBOL.getFieldValue(this.iframe, 'Beneficiary reference')).toBe(payment.beneficiaryReference);

    }



    expect(await IBOL.getFieldValue(this.iframe, 'Amount')).toBe(payment.amount);

    //const debitAccountValue = await IBOL.getFieldValue(this.iframe, 'Debit account');
    // expect(await IBOL.getFieldValue(this.iframe, 'Debit account')).toBe(payment.beneficiaryAccount);
    expect(await IBOL.getFieldValue(this.iframe, 'Debit account reference')).toBe(payment.debitAccRef);

    expect(await IBOL.getFieldValue(this.iframe, 'Note for approver')).toBe(payment.noteForApprover);
    //expect(await IBOL.getFieldValue(this.iframe, 'Note for approver document(s)')).toBe(payment.beneficiaryAccount);


    await IBOL.click(this.iframe.getByRole('button', { name: 'Done' }), "Payment Details infomodal");


  }

  async verifyInformationDetailsForPaymentRecordSummary(payment: any, recordNumber: number, isDownloadRequired: boolean = false) {

    const infoIcon = this.informationIcon(recordNumber);
    await expect(infoIcon).toBeVisible({ timeout: 5000 });
    await IBOL.click(infoIcon, `Information icon for record ${recordNumber}`);
    let paymentDateValue = await IBOL.getFieldValue(this.iframe, 'Payment date');

    let checkthis = "";

    while (paymentDateValue == "") {
      await page.waitForTimeout(100);
      await IBOL.click(infoIcon, `Information icon for record ${recordNumber}`);
      paymentDateValue = await IBOL.getFieldValue(this.iframe, 'Payment date');
      checkthis = "used whileloop";
    }

    await expect(this.iframe.getByRole('heading', { name: 'Payment details', level: 5 })).toBeVisible({ timeout: 10000 });

    console.log(JSON.stringify(payment, null, 2));
    console.log(`Payment date from record: ${payment.paymentDate}`);
    console.log(`Payment date from UI: ${paymentDateValue}`);
    expect(paymentDateValue).toBe(payment.paymentDate);

    if (payment.proofofpayment.length > 0) {
      for (let i = 0; i < payment.proofofpayment.length; i++) {
        expect(await IBOL.getField(this.iframe, 'Send proof of payment(s)')).toContainText(payment.proofofpayment[i]);
      }
    }

    await this.iframe.getByRole('tab', { name: 'Details' }).click();

    const isPayroll = payment.beneficiaryType?.trim().toLowerCase().includes('payroll') ?? false;

    let uetrValue: string;
    try {
      uetrValue = await IBOL.getFieldValue(this.iframe, 'UETR');
    } catch (error) {
      uetrValue = await IBOL.getFieldValue(this.iframe, 'Uetr');
    }


    if (!isPayroll) {
      expect(await IBOL.getFieldValue(this.iframe, 'Payment ID')).toBe(payment.paymentID);

      const transactionID = await IBOL.getFieldValue(this.iframe, 'Transaction ID');
      expect(transactionID).toMatch(/^\d{14}$/);
      // = await IBOL.getFieldValue(this.iframe, 'UETR');

      expect(uetrValue).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(await IBOL.getFieldValue(this.iframe, 'Status')).toBe(payment.status);
      expect(await IBOL.getFieldValue(this.iframe, 'Beneficiary reference')).toBe(payment.beneficiaryReference);
      expect(await IBOL.getField(this.iframe, 'Beneficiary type')).toHaveText(payment.beneficiaryType);
      expect(await IBOL.getFieldValue(this.iframe, 'Beneficiary name')).toBe(payment.beneficiary);

    } else {
      payment.paymentID = await IBOL.getFieldValue(this.iframe, 'Payment ID');
      payment.status = await IBOL.getFieldValue(this.iframe, 'Status');
      payment.transactionID = await IBOL.getFieldValue(this.iframe, 'Transaction ID');
      payment.uetr = uetrValue;
      const transactionID = await IBOL.getFieldValue(this.iframe, 'Transaction ID');
      expect(transactionID).toMatch(/^\d{14}$/);
      expect(await IBOL.getFieldValue(this.iframe, 'Status')).toBe(payment.status);

      expect(await IBOL.getFieldValue(this.iframe, 'Employee name')).toBe(payment.employeeName);
      expect(await IBOL.getFieldValue(this.iframe, 'Employee type')).toBe(payment.beneficiaryType);

      const uiBankDetails = await IBOL.getField(this.iframe, 'Employee bank details');
      expect(IBOL.normalizeText(await uiBankDetails.textContent()).toLowerCase()).toContain(IBOL.normalizeText(payment.beneficiaryAccount).toLowerCase());
    }

    const transactionID = await IBOL.getFieldValue(this.iframe, 'Transaction ID');
    expect(transactionID).toMatch(/^\d{14}$/);



    const actualPaymentMethod = await IBOL.getFieldValue(this.iframe, 'Payment method');
    const expectedPaymentMethod = payment.paymentMethod.toLowerCase();

    if (actualPaymentMethod.toLowerCase() !== expectedPaymentMethod) {
      expect(await IBOL.isFiledNotEmptyAndDash(await IBOL.getFieldValue(this.iframe, 'Payment method'))).toBe(true);
    } else {
      expect(actualPaymentMethod.toLowerCase()).toBe(expectedPaymentMethod);
    }





    if (!isPayroll) {

      if (payment.beneficiaryAccount === "Investec approved beneficiary") {//change made for groups
        expect(await IBOL.getFieldValue(this.iframe, 'Account number')).toBe("-");
        expect(await IBOL.getFieldValue(this.iframe, 'Bank name')).toBe("-");
        expect(await IBOL.getFieldValue(this.iframe, 'Branch Code')).toBe("-");
      } else {
        expect(await IBOL.getFieldValue(this.iframe, 'Account number')).toBe(payment.accountNumber);
        expect((await IBOL.getFieldValue(this.iframe, 'Bank name')).toLowerCase()).toBe(payment.bank.toLowerCase());
        expect(await IBOL.isFiledNotEmptyAndDash(await IBOL.getFieldValue(this.iframe, 'Branch Code'))).toBe(true);
      }

    }

    expect(await IBOL.getFieldValue(this.iframe, 'Amount')).toBe(payment.amount);

    //const debitAccountValue = await IBOL.getFieldValue(this.iframe, 'Debit account');
    // expect(await IBOL.getFieldValue(this.iframe, 'Debit account')).toBe(payment.beneficiaryAccount);
    expect(await IBOL.getFieldValue(this.iframe, 'Debit account reference')).toBe(payment.debitAccRef);

    expect(await IBOL.getFieldValue(this.iframe, 'Note for approver')).toBe(payment.noteForApprover);
    //expect(await IBOL.getFieldValue(this.iframe, 'Note for approver document(s)')).toBe(payment.beneficiaryAccount);


    await this.iframe.getByRole('tab', { name: new RegExp('Approval', 'i') }).click();


    const downloadBtn = this.iframe.getByRole('button', { name: 'Download' });
    expect(downloadBtn).toBeVisible();

    if (isDownloadRequired) {
      await this.downloadPaymentDetails(downloadBtn);
    }


    await IBOL.click(this.iframe.locator("#doneCanvasDone,#payrollSummaryOffcanvasDoneButton"), "Payment Details infomodal");
  }

  async downloadPaymentDetails(downloadBtn: Locator) {
    const downloadbtn = await page.frameLocator("iframe#sideloadCenter").getByRole('button', { name: 'Download' }).last();
    const { isFileDownloaded, numberOfFilesdownloaded } = await Action.downloadFile(downloadbtn);
    expect(isFileDownloaded).toBe(true);
    expect(numberOfFilesdownloaded).toBeGreaterThan(0);
  }


  async clickPaymentVerifySubmitButton1() {
    const navigationPromise = page.waitForURL("**/domestic/stepper/create/multi-payment/summary", { timeout: 10000 });
    await this.iframe.locator("#domesticPaymentVerifySubmitButton").click();
    await navigationPromise;
    expect(page.url()).toContain("/business-banking/bb/payments/details/domestic/stepper/create/multi-payment/summary");
  }

  async clickPaymentVerifySubmitButton() {
    // await this.clickButtonAndVerifyNavigationUrl(this.domesticPaymentVerifySubmitButton(), "/domestic/stepper/create/multi-payment/summary");
    await IBOL.click(this.domesticPaymentVerifySubmitButton(), 'Submit button');
  }

  async clickPaymentSummaryDoneButton() {
    // await this.clickButtonAndVerifyNavigationUrl(this.doneButton(), "/bb/payments/dashboard/domestic/all");
    await IBOL.click(this.doneButton(), 'Done button');
  }

  async clickMyApprovalDoneButton() {
    const approve = this.iframe.getByRole('button', { name: ' Continue ' });
    // await this.clickButtonAndVerifyNavigationUrl(this.doneButton(), "my-approvals/details/payments/individual/stepper/pending/approve/verify");
    await IBOL.click(this.doneButton(), 'Done button');
  }


  async clickMyApprovalContinueButton() {
    const continueButton = this.iframe.getByRole('button', { name: 'Continue' });
    // await this.clickButtonAndVerifyNavigationUrl(continueButton, "/my-approvals/details/payments/individual/stepper/pending/approve/verify").catch(() => { });
    await IBOL.click(continueButton, 'Continue button');

    if (await this.iframe.getByRole('heading', { name: 'These payments will be processed on the next available banking day' }).isVisible()) {
      await IBOL.click(this.iframe.locator('#confirmVerify'), "Confirm");
    }

    // await this.clickButtonAndVerifyNavigationUrl(continueButton, "/my-approvals/details/payments/individual/stepper/pending/approve/summary");
    await IBOL.click(continueButton, 'Continue button');


    const summaryDone = this.iframe.locator('#summaryDone');
    // await this.clickButtonAndVerifyNavigationUrl(summaryDone, "/bb/my-approvals/dashboard/payments/individual/pending");
    await IBOL.click(summaryDone, 'Summary Done button');

  }


  async clickButtonAndVerifyNavigationUrl(buttonToClick: Locator, urltoverify: string) {
    let currentURL = urltoverify;

    try {
      // await Promise.all([
      //   page.waitForURL(`**${urltoverify}**`, { timeout: 30000 }),
      //   IBOL.click(buttonToClick, 'Click navigation button'),
      // ]);



      // while (buttonToClick.isVisible()) {
      //   const test = await buttonToClick.innerText();

      //   console.log("click on >>> ", await test)
      //   await page.waitForTimeout(1000);
      //   await IBOL.click(buttonToClick, 'Click navigation button')
      //   console.log("clicked on >>> ", await test)
      // }
      await IBOL.click(buttonToClick, 'Click navigation button')
      await expect.poll(() => page.url(), { timeout: 30000 }).toContain(urltoverify);
      //await page.waitForURL(`**${urltoverify}**`, { timeout: 30000 });

      // await expect(async () => {
      //   await IBOL.click(buttonToClick, 'Click navigation button')
      //   await expect.poll(() => page.url(), { timeout: 30000 }).toContain(urltoverify);
      // })

      if (!currentURL.includes(urltoverify)) {
        throw new Error(`❌ Navigation to ${urltoverify} failed. Current URL: ${currentURL}`);
      }

    } catch (error: any) {
      currentURL = page.url();
      throw new Error(`❌ Navigation to ${urltoverify} failed. Current URL: ${currentURL}. Root cause: ${error?.message || error}`);
    }

  }



}


