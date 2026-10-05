
import { page, FrameLocator, Locator, expect } from "playwright-with-cucumber-checks";
import { IBOL } from "../../../../utilities/utilities/ibol-utilities";
import { randomInt } from 'crypto';
import { faker } from "@faker-js/faker";
import { NextStepComponent } from "../../components/next-step.component";
import Table from "../../../shared/pages/data-table-page";
import { Payment } from "../../interfaces/Payment";
import moment from "moment";
import { PAYMENT_METHODS } from "../../constants/payment-mathods";
import Recurringtransfer from "../transfers/recurringranfer-page";
import { RecurringPayment } from "../../interfaces/RecurringPayment";
import MultiPaymentPage from "../domestic/multipayment-page";
import IBOLMainPage from "../../../accounts/pages/ibol-main-page";
import payrollcontants from "./payrollconstants.json";
import { isDotDotDotToken } from "typescript";

export enum PaymentType {
  SINGLE = 'Single payment',
  MULTI = 'Multi payment',
  AD_HOC = 'Ad-hoc payment',
  RECURRING = 'Recurring payment',
  RECURRING_ADHOC = 'Recurring adhoc payment'
}

export default class PayrollPaymentsPage {

  private iframe: FrameLocator;
  private static readonly IFRAME_SELECTOR = "#sideloadCenter";
  private static SET_PAYMENT_METHOD_ERROR = "";
  // Main navigation tabs
  private readonly tabOverview: Locator;
  private readonly tabDomestic: Locator;
  private readonly tabShapIdShapName: Locator;
  private readonly tabPayShapRequestor: Locator;
  private readonly tabPayShapPayer: Locator;
  private readonly tabTransfers: Locator;

  // Payment type dropdown and actions
  private readonly ddPaymentType: Locator;
  private readonly btnImportFile: Locator;
  private readonly btnDrafts: Locator;
  private readonly btnTemplates: Locator;

  // Payment dropdown options
  private readonly optSinglePayment: Locator;
  private readonly optMultiPayment: Locator;
  private readonly optAdHocPayment: Locator;
  private readonly optRecurringPayment: Locator;
  private readonly optRecurringAdhocPayment: Locator;
  private readonly ddFrequency: Locator;

  // Filter tabs
  private readonly tabAll: Locator;
  private readonly tabPendingApproval: Locator;
  private readonly tabRecurring: Locator;
  private readonly tabScheduled: Locator;
  private readonly tabDeclined: Locator;
  private readonly tabFailed: Locator;

  // Search and filter controls
  private readonly txtSearch: Locator;
  private readonly btnFilter: Locator;
  private readonly dtFromDate: Locator;
  private readonly dtToDate: Locator;
  private readonly btnApply: Locator;
  private readonly btnDownload: Locator;
  private readonly txtBeneficiaryAccount: Locator;

  // Results section
  private readonly lblResultsCount: Locator;
  private readonly lblNoResults: Locator;
  private readonly tblResults: Locator;

  // Quick Pay section
  private readonly sectionQuickPay: Locator;
  private readonly rdoDomestic: Locator;
  private readonly rdoBankApproved: Locator;
  private readonly ddBeneficiaryName: Locator;
  private readonly ddDebitAccount: Locator;
  private readonly ddPaymentMethod: Locator;
  private readonly paymentMethodButton: Locator;
  private readonly ddPayment: Locator;
  private readonly txtAmount: Locator;
  private readonly dtPaymentDate: Locator;
  private readonly txtDebitAccountReference: Locator;
  private readonly referenceInput: Locator;
  private readonly beneficiaryReference: Locator;
  private readonly bank: Locator;

  constructor() {
    this.iframe = page.frameLocator(PayrollPaymentsPage.IFRAME_SELECTOR);

    // Main navigation tabs (using role='tab' for the nav tabs)
    this.tabOverview = this.iframe.getByRole('tab', { name: 'Overview' });
    this.tabDomestic = this.iframe.getByRole('tab', { name: 'Domestic' });
    this.tabShapIdShapName = this.iframe.getByRole('tab', { name: 'ShapID / Shap Name' });
    this.tabPayShapRequestor = this.iframe.getByRole('tab', { name: 'PayShap Request (Requestor)' });
    this.tabPayShapPayer = this.iframe.getByRole('tab', { name: 'PayShap Request (Payer)' });
    this.tabTransfers = this.iframe.getByRole('tab', { name: 'Transfers' });

    // Payment type dropdown and actions
    this.ddPaymentType = this.iframe.getByRole('button', { name: 'Payment' });
    this.btnImportFile = this.iframe.getByRole('button', { name: 'Import file' });
    this.btnDrafts = this.iframe.getByRole('button', { name: 'Drafts' });
    this.btnTemplates = this.iframe.getByRole('button', { name: 'Templates' });

    // Payment dropdown options
    this.optSinglePayment = this.iframe.getByText('Single payment');
    this.optMultiPayment = this.iframe.getByText('Multi payment');
    this.optAdHocPayment = this.iframe.getByText('Ad-hoc payment');
    this.optRecurringPayment = this.iframe.getByText('Recurring payment', { exact: true });
    this.optRecurringAdhocPayment = this.iframe.getByText('Recurring adhoc payment');
    this.paymentMethodButton = this.iframe.locator("#paymentMethod ~ button");

    // Filter tabs (secondary tabs)
    this.tabAll = this.iframe.getByRole('tab', { name: 'All' });
    this.tabPendingApproval = this.iframe.getByRole('tab', { name: 'Pending approval' });
    this.tabRecurring = this.iframe.getByRole('tab', { name: 'Recurring' });
    this.tabScheduled = this.iframe.getByRole('tab', { name: 'Scheduled' });
    this.tabDeclined = this.iframe.getByRole('tab', { name: 'Declined' });
    this.tabFailed = this.iframe.getByRole('tab', { name: 'Failed' });

    // Search and filter controls
    this.txtSearch = this.iframe.getByPlaceholder('Search payment ID, Batch ID, debit account');
    this.btnFilter = this.iframe.getByRole('button', { name: 'Filter' });
    this.dtFromDate = this.iframe.locator("input[type='text']").first();
    this.dtToDate = this.iframe.locator("input[type='text']").nth(1);
    this.btnApply = this.iframe.getByRole('button', { name: 'Apply' });
    this.btnDownload = this.iframe.getByRole('button', { name: 'Download' });

    // Results section
    this.lblResultsCount = this.iframe.getByText(/\d+\s+Results to display/);
    this.lblNoResults = this.iframe.getByText('No results found');
    this.tblResults = this.iframe.locator("table");

    // Quick Pay section
    this.sectionQuickPay = this.iframe.locator("text=Quick pay").locator("..");
    this.rdoDomestic = this.iframe.getByLabel('Domestic');
    this.rdoBankApproved = this.iframe.getByLabel('Bank approved');
    this.ddBeneficiaryName = this.iframe.locator('//investec-online-global-floating-label-search//input').or(this.iframe.locator("#beneficiaryName")).first();
    this.ddDebitAccount = this.iframe.locator("#debitAccount,#debit-account");
    this.ddPaymentMethod = this.iframe.locator("#paymentMethod");
    this.ddPayment = this.iframe.locator("#actionsDropdown");
    this.txtAmount = this.iframe.getByPlaceholder('amount').or(this.iframe.locator("input[name='amount']")).or(this.iframe.locator("#amount").nth(0));
    this.dtPaymentDate = this.iframe.locator("input[name='paymentDate']").or(this.iframe.getByPlaceholder('Payment date')).or(this.iframe.locator("#paymentDate"))
    this.txtDebitAccountReference = this.iframe.getByPlaceholder('Debit account reference').or(this.iframe.locator("input[name='debitAccountReference']")).or(this.iframe.locator("#debitAccountReference"));
    this.referenceInput = this.iframe.locator("#debitAccountReference");
    this.beneficiaryReference = this.iframe.locator("#beneficiaryReference");
    this.txtBeneficiaryAccount = this.iframe.locator("//investec-online-global-floating-label-search/following-sibling::span").or(this.iframe.locator("#accountNumber")).first();
    this.ddFrequency = this.iframe.locator("#frequency");
    this.bank = this.iframe.locator("#bankName");
  }


  async getAmountValidationError() {

    const err = await this.iframe.locator("investec-online-floating-label-input-currency > span")
      .or(this.iframe.locator("investec-online-floating-label-input-currency ~ small"))
      .or(this.iframe.locator("investec-online-floating-label-input-datepicker > span"));
    if (err) {
      return err.innerText();
    }
    return "";

  }

  async verifyAvailablePaymentOptionsInDropdown(expectedOptions: string[]) {
    const options = await IBOLMainPage.getDropdownOptions('#actionsDropdown');
    const actualOptions = (await options.allInnerTexts()).map(text => text.trim());
    const normalizedExpectedOptions = expectedOptions.map(text => text.trim());

    const allExpectedOptionsPresent = normalizedExpectedOptions.every(option => actualOptions.includes(option));
    if (!allExpectedOptionsPresent) {
      throw new Error(`Expected options: ${normalizedExpectedOptions.join(', ')}. Actual options: ${actualOptions.join(', ')}`);
    }

    //await IBOLMainPage.clickDropdownOption(dropdownButton, option);

    // await IBOL.click(this.ddPayment, "Payment actions dropdown");

    // const dropdownMenu = this.iframe.locator('.dropdown-menu.show');
    // await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

    // const actualOptions = (await dropdownMenu.locator('.dropdown-item').allTextContents())
    //   .map(option => option.trim())
    //   .filter(Boolean);

    // for (const expectedOption of expectedOptions.map(option => option.trim())) {
    //   if (!actualOptions.includes(expectedOption)) {
    //     throw new Error(`Expected option "${expectedOption}" not found in the dropdown. Actual options: ${actualOptions.join(", ")}`);
    //   }
    // }
  }


  async clickPaymentOptionsInDropdown(expectedOptions: string[]) {
    const options = await IBOLMainPage.getDropdownOptions('#actionsDropdown');
    const actualOptions = (await options.allInnerTexts()).map(text => text.trim());
    const normalizedExpectedOptions = expectedOptions.map(text => text.trim());

    const allExpectedOptionsPresent = normalizedExpectedOptions.every(option => actualOptions.includes(option));
    if (!allExpectedOptionsPresent) {
      throw new Error(`Expected options: ${normalizedExpectedOptions.join(', ')}. Actual options: ${actualOptions.join(', ')}`);
    }

    //await IBOLMainPage.clickDropdownOption(dropdownButton, option);

    // await IBOL.click(this.ddPayment, "Payment actions dropdown");

    // const dropdownMenu = this.iframe.locator('.dropdown-menu.show');
    // await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

    // const actualOptions = (await dropdownMenu.locator('.dropdown-item').allTextContents())
    //   .map(option => option.trim())
    //   .filter(Boolean);

    // for (const expectedOption of expectedOptions.map(option => option.trim())) {
    //   if (!actualOptions.includes(expectedOption)) {
    //     throw new Error(`Expected option "${expectedOption}" not found in the dropdown. Actual options: ${actualOptions.join(", ")}`);
    //   }
    // }
  }

  async getDateValidationError() {
    const errlocator = this.iframe.locator("investec-online-floating-label-input-datepicker > span");

    try {
      await errlocator.waitFor({ state: 'visible', timeout: 5000 });
      return await errlocator.innerText();
    } catch (error) {
      return "";
    }
  }

  async getPayrollPaymentType(payrollType: string) {

    let expectedPayrollType: string;
   

    switch (payrollType.toLowerCase()) {
      case 'executive payroll':
        expectedPayrollType = 'Executive Payroll payment';

        break;
      case 'payroll':
        expectedPayrollType = 'Payroll payment';

        break;
      default:

        expectedPayrollType = payrollType;
    }

    return expectedPayrollType;
  }

  async getPayrollPaymentCode(payrollType: string) {
    let expectedPaymentCode: string;
    console.log(`getPayrollPaymentCode: payrollType=${payrollType}`);
    payrollcontants["executive payroll"]
    switch (payrollType.toLowerCase()) {
      case 'executive payroll':
        expectedPaymentCode = payrollcontants["executive payroll"];
        break;
      case 'payroll':
        expectedPaymentCode = payrollcontants["payroll"];
        break;
      default:
        expectedPaymentCode = "N/A";
    }

    return expectedPaymentCode;
  }



  async setPaymentDate(date: string, isSundayStartDate: boolean = false): Promise<void> {

    if (isSundayStartDate) {
      const dateFromNextSunday = await this.getNextSundayDate();
      date = dateFromNextSunday;
    }

    const dateField = this.dtPaymentDate;
    await IBOL.fill(dateField, date);
  }

  async getNextSundayDate(addDays: number = 0): Promise<string> {
    const nextSunday = moment().day(7);
    const target = nextSunday.clone().add(addDays, 'days');
    console.log(`target date: ${target.format('DD/MM/YYYY')}`);
    return target.format('DD/MM/YYYY');
  }

  async verifyPayrollPaymentTypeAndCode(data: any, payrollType: string, paymentMethod: string, paymentType: string = "") {

    expect(data.product.code).toBe("FT");
    expect(data.product.description).toBe("Fund transfer");

    expect((data.rail).toLowerCase()).toBe(paymentMethod.toLowerCase());

    if (paymentType !== "" && paymentType.toLowerCase().includes('recurring')) {
      expect(data.recurringDetails).not.toBe(null);
    } else {
      expect(data.recurringDetails).toBe(null);
    }


    let expectedPayrollType = await this.getPayrollPaymentType(payrollType);
    let expectedPaymentCode = await this.getPayrollPaymentCode(payrollType);

    console.log(`Expected payroll type: ${expectedPayrollType}`);
    expect(data.paymentType.code).toBe(expectedPaymentCode);
    expect((data.paymentType.description).toLowerCase()).toBe(expectedPayrollType.toLowerCase());
  }

  async selectTab(tabName: string) {

    const seriesTab = this.iframe.getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') });
    return seriesTab;
  }


  async selectSeriesTab(tab: Locator) {
    await tab.click();

    const isNoResults = await Table.isDataAvailableInTable("No results");
  }

  async verifyDetailsTab(tabname: string, payment: RecurringPayment, beneficiaryType: string) {

    const seriesTab = await this.iframe.getByRole('tab', { name: new RegExp(`^${tabname}$`, 'i') });


    if (tabname.toLowerCase() === 'audit') {

      const tab = this.selectTab(tabname);
      if (payment.beneficiaryType.toLowerCase().includes("payroll")) {
        const code = (payment.beneficiaryType.toLowerCase().includes("executive")) ? payrollcontants["executive payroll"] : payrollcontants["payroll"];
        const auditResponse = await IBOL.clickAndInterceptResponse(seriesTab, `/tbba/api/v1/payroll-payments/audit/${code}/`);
        expect(auditResponse.data.length).not.toBe(0);
      }

      return;
    }

    if (tabname.toLowerCase() === 'series') {
      await page.pause();
    }


    if (tabname.toLowerCase() === 'approvals') {

      const tab = this.selectTab(tabname);
      const responseJson = await IBOL.clickAndInterceptResponse(seriesTab, "/tbba/api/v1/authorisation/approval-ids");
      const approvalIds = responseJson.data;

      expect(payment.approvalIds).toEqual(approvalIds);

      const approalIDDropDownLocator = await this.iframe.locator('#approvalId');
      const approalIDDropDownLocatorChev = await this.iframe.getByRole('button', { name: 'chevron-vertical' });
      
      let i = 0;

      do {
        await approalIDDropDownLocatorChev.focus();
        await approalIDDropDownLocatorChev.click();

        const approvalId = approvalIds[i];
        const approvalIDLocator = this.iframe.locator('[role="option"]').filter({ hasText: approvalId });

        const [approvalIDResponse, approvalStructureResponse, _clicked] = await Promise.all([
          page.waitForResponse(resp =>
            resp.url().includes('/tbba/api/v1/authorisation/approval-id/') &&
            resp.request().method() !== 'OPTIONS'
            , { timeout: 90000 }),
          page.waitForResponse(resp =>
            resp.url().includes('/tbba/api/v1/authorisation/approval-structure/') &&
            resp.request().method() !== 'OPTIONS'
            , { timeout: 90000 }),
          approvalIDLocator.click()
        ]);

        const approvalIDResponseJson = await approvalIDResponse.json();
        const approvalStructureResponseJson = await approvalStructureResponse.json();
        const selectedId = await approalIDDropDownLocator.inputValue();


        expect(selectedId).toBe(approvalId);
        await this.verifyApprovalIDDtructure(approvalIDResponseJson.data, approvalStructureResponseJson.data);
        i++;
      } while (i < approvalIds.length);

      return;

    }

    await (await this.selectTab(tabname)).click();

    expect(await IBOL.getFieldValue(this.iframe, "Status")).toBe("Pending approval");
    expect(await IBOL.getFieldValue(this.iframe, "Payment ID")).toBe(payment.paymentID);
    expect(await IBOL.getFieldValue(this.iframe, "Transaction ID")).toBe(payment.transactionID);
    expect(await IBOL.getFieldValue(this.iframe, "Uetr")).toBe(payment.UETR);
    expect(await IBOL.getFieldValue(this.iframe, "Expiry")).toContain("-");


    expect(await IBOL.getFieldValue(this.iframe, "Payment date")).toBe(payment.paymentDate);
    expect(await IBOL.getFieldValue(this.iframe, "Payment method")).toBe(payment.paymentMethod);
    expect(await IBOL.getFieldValue(this.iframe, "Amount")).toBe(payment.amount);
    expect(await IBOL.getFieldValue(this.iframe, "Debit account reference")).toBe(payment.debitAccountReference);
    expect(await IBOL.getFieldValue(this.iframe, "Employee reference")).toBe(payment.beneficiaryReference);
    expect(await IBOL.getFieldValue(this.iframe, "Frequency")).toBe(payment.frequency);
    expect(await IBOL.getFieldValue(this.iframe, "Non-banking processing date")).toBe(payment.nonBankingProcessing);
    expect(await IBOL.getFieldValue(this.iframe, "Number of payments")).toBe(`0 of ${payment.numberOfPayments}`);
    expect(await IBOL.getFieldValue(this.iframe, "First payment date")).toBe(payment.paymentDate);
    expect(await IBOL.getFieldValue(this.iframe, "Last payment date")).toBe(payment.lastPaymentDate);


    expect(await IBOL.getFieldValue(this.iframe, "Employee name")).toBe(payment.employeeName);


    expect((await IBOL.getFieldValue(this.iframe, "Employee type")).toLowerCase()).toBe(payment.beneficiaryType.toLowerCase());

    const avaibalebalance = await IBOL.getFieldValue(this.iframe, "Available balance");
    await expect(await IBOL.isFiledNotEmptyNotDash(avaibalebalance)).toBeTruthy();


    expect(await IBOL.getFieldValue(this.iframe, "Note for approver")).toBe(payment.noteForApprover);
    const actual = await IBOL.getFieldValue(this.iframe, "Send proof of payment(s)");
    const expected = payment.proofofpayment;

    const expectedStr = Array.isArray(expected) ? expected.join(', ') : String(expected);

    expect(String(actual).trim()).toBe(expectedStr.trim());
  }


  async verifyApprovalIDDtructure(approvalIDResponse: any, approvalStructureResponse: any) {

    // console.log(`Approval ID Response: ${JSON.stringify(approvalIDResponse, null, 2)}`);

    // await page.pause();

    // expect(IBOL.getFieldValue(this.iframe, "Product")).toBe(approvalIDResponse[0].product.description);
    // expect(IBOL.getFieldValue(this.iframe, "Sub product")).toBe(approvalIDResponse[0].paymentType.description);
    // expect(IBOL.getFieldValue(this.iframe, "Account")).toBe(approvalIDResponse[0].accountNumber);
    // // expect(IBOL.getFieldValue(this.iframe, "Maximum approval amount")).toBe(String(approvalStructureResponse.maxApprovalAmount));
    // expect(IBOL.getFieldValue(this.iframe, "Order of approval")).toBe(approvalIDResponse.approvalOrder.description);


    // await page.pause();

    for (let i = 0; i < approvalStructureResponse.length; i++) {
      console.log(`Verifying approval structure for authLevel ${approvalStructureResponse[i].authLevel}`);
      expect(this.iframe.locator(`//summary[@class="ids-accordion-item-header"]/div[contains(.,"Level ${approvalStructureResponse[i].authLevel} approvers")]`)).toBe;
    }

  }

  async verifyBankApprovedQuickPayFields(quickPayDetails: any) {
    // Read all needed fields in parallel to reduce cumulative lookup waits.
    const [
      status,
      paymentId,
      transactionId,
      paymentDate,
      paymentMethod,
      amount,
      employeeReference,
      employeeType,
      debitAccountReference,
      employeeName,
    ] = await Promise.all([
      IBOL.getFieldValue(this.iframe, "Status"),
      IBOL.getFieldValue(this.iframe, "Payment ID"),
      IBOL.getFieldValue(this.iframe, "Transaction ID"),
      IBOL.getFieldValue(this.iframe, "Payment date"),
      IBOL.getFieldValue(this.iframe, "Payment method"),
      IBOL.getFieldValue(this.iframe, "Amount"),
      IBOL.getFieldValue(this.iframe, "Employee reference"),
      IBOL.getFieldValue(this.iframe, "Employee type"),
      IBOL.getFieldValue(this.iframe, "Debit account reference"),
      IBOL.getFieldValue(this.iframe, "Employee name"),
    ]);

    expect(await IBOL.isFiledNotEmptyNotDash(status)).toBe(true);
    expect(await IBOL.isFiledNotEmptyNotDash(paymentId)).toBe(true);
    expect(await IBOL.isFiledNotEmptyNotDash(transactionId)).toBe(true);

    expect(paymentDate).toBe(quickPayDetails.paymentDate);
    expect(paymentMethod.toLowerCase()).toBe(quickPayDetails.paymentMethod.toLowerCase());
    expect(amount).toContain(quickPayDetails.amount);
    expect(employeeReference).toBe(quickPayDetails.beneficiaryReference);

    let expectedPayrollType = quickPayDetails.payrollType;
    if (quickPayDetails.payrollType === "PayrollExecutive") {
      expectedPayrollType = "Executive Payroll";
    }
    if (quickPayDetails.payrollType === "PayrollStandard") {
      expectedPayrollType = "Payroll";
    }
    // let expectedPayrollType = this.getPayrollType(quickPayDetails.payrollType);

    expect(employeeType).toBe(expectedPayrollType);

    expect(debitAccountReference).toBe(quickPayDetails.debitAccountReference);
    expect(employeeName).toBe(quickPayDetails.beneficiaryName);

  }

  async searchAndSelectPayrollBeneficiary(payrollType: string = "Payroll"): Promise<string> {
    //await IBOL.click(this.ddBeneficiaryName);


    //  let payrollType= quickPayDetails.payrollType;
    if (payrollType == "Executive Payroll") {
      payrollType = "PayrollExecutive";
    }

    if (payrollType == "Payroll") {
      payrollType = "PayrollStandard";
    }

    const { data } = await IBOL.clickAndInterceptResponse(this.ddBeneficiaryName, '/v1/payment-manager/beneficiaries');


    if (data.length === 0) {
      throw new Error(`❌ No beneficiaries found in the API response`);
    }

    const PayrollBeneficiary = data.filter((beneficiary: any) => beneficiary.productType === payrollType);

    if (PayrollBeneficiary.length === 0) {
      throw new Error(`❌ No beneficiaries found for the specified payroll type: ${payrollType}`);
    }

    const randomIndex = randomInt(0, PayrollBeneficiary.length);
    const searchPayroll = `${PayrollBeneficiary[randomIndex].beneficiaryName}`;
    const fullPayrollDetails = `${PayrollBeneficiary[randomIndex].beneficiaryName} ${PayrollBeneficiary[randomIndex].bankName} - ${PayrollBeneficiary[randomIndex].accountNumber}`;

    await this.ddBeneficiaryName.fill(searchPayroll);
    let dropdownOption = this.iframe.locator('ngb-typeahead-window button[role="option"]').filter({ hasText: fullPayrollDetails }).first();
    await IBOL.click(dropdownOption);

    return payrollType;

  }

  async getPaymentDetails(beneficiaryType: string, paymentType: string = "") {


    // const paymentDetails: Payment = {
    //   beneficiaryType: (beneficiaryType.toLowerCase() == 'bank approved') ? "Investec approved beneficiary" : "Domestic",
    //   beneficiaryName: await this.ddBeneficiaryName.inputValue(),
    //   ...(beneficiaryAccount ? { beneficiaryAccount } : {}),
    //   adHocAccountNumber: adHocAccountNumber,
    //   bank: (bank != "") ? bank : "-",
    //   payrollType: beneficiaryType,
    //   debitAccount: await this.ddDebitAccount.inputValue(),
    //   debtAccountBalance: accountBalanceText,
    //   paymentMethod: await IBOL.getInputValue(this.ddPaymentMethod),
    //   amount: formattedAmount,
    //   paymentDate: await IBOL.getInputValue(this.dtPaymentDate),
    //   debitAccountReference: await IBOL.getInputValue(this.txtDebitAccountReference),
    //   beneficiaryReference: await IBOL.getInputValue(this.beneficiaryReference),
    //   noteForApprover: await note,
    //   proofofpayment: await this.getProfOfPaymentEmailAddresses()
    // }
    const banknamelocator = this.iframe.locator("investec-online-global-floating-label-search ~ span");
    let bankNameText = await IBOL.getTextContent(banknamelocator, 20000);
    bankNameText = bankNameText.replace("Available balance ", "").trim();




    const balancelocator = this.iframe.locator("investec-online-global-floating-label-search ~ small");
    let accountBalanceText = await IBOL.getTextContent(balancelocator, 20000);
    accountBalanceText = accountBalanceText.replace("Available balance ", "").trim();


    let beneficiaryAccount = (await this.txtBeneficiaryAccount.textContent())?.trim();
    let bank = "";
    let adHocAccountNumber = "-";

    // if (paymentType.toLowerCase().includes("ad-hoc") && beneficiaryType.toLowerCase() === "domestic") {
    //   adHocAccountNumber = (await this.txtBeneficiaryAccount.inputValue())?.trim();
    //   bank = await this.bank.inputValue();
    // }
    beneficiaryAccount = (beneficiaryType.trim().toLowerCase() !== 'domestic') ? "Investec approved beneficiary" : beneficiaryAccount;

    //console.log('Beneficiary Account:', beneficiaryAccount);
    //console.log('Account Balance Text:', accountBalanceText);
    //console.log('Beneficiary Type:', beneficiaryType);

    const formattedAmount = IBOL.formatAmount(await this.txtAmount.inputValue());

    const noteLocator = this.getNoteForApproverInput();

    let note = "-";

    const isNoteVisible = await noteLocator.isVisible();
    if (isNoteVisible) {
      note = (await IBOL.getInputValue(this.getNoteForApproverInput())) ? await IBOL.getInputValue(this.getNoteForApproverInput()) : "-";
    }



    const paymentDetails: Payment = {
      beneficiaryType: beneficiaryType,//(beneficiaryType.toLowerCase() == 'bank approved') ? "Investec approved beneficiary" : "Domestic",
      beneficiaryName: await this.ddBeneficiaryName.inputValue(),
      ...(beneficiaryAccount ? { beneficiaryAccount } : {}),
      employeeAccount: bankNameText,
      adHocAccountNumber: adHocAccountNumber,
      bank: (bank != "") ? bank : "-",
      debitAccount: await this.ddDebitAccount.inputValue(),
      debtAccountBalance: accountBalanceText,
      paymentMethod: await IBOL.getInputValue(this.ddPaymentMethod),
      amount: formattedAmount,
      paymentDate: await IBOL.getInputValue(this.dtPaymentDate),
      debitAccountReference: await IBOL.getInputValue(this.txtDebitAccountReference),
      beneficiaryReference: await IBOL.getInputValue(this.beneficiaryReference),
      noteForApprover: note,
      proofofpayment: await this.getProfOfPaymentEmailAddresses()
    }


    console.log('Payment Details:', JSON.stringify(paymentDetails, null, 2));

    ;
    return paymentDetails;

  }

  getNoteForApproverInput = () => {
    return this.iframe.locator("#noteForApprover");
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


  getProofOfPaymentsInput = (n) => {
    return this.iframe.locator(`#email-${n}`);
  }
}




