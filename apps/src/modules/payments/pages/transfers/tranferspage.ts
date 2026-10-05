import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import ApolloDashboardPage2 from "../../../shared/pages/apollo-dashboard-page-2";
import Table from "../../../shared/pages/data-table-page";
import { iframeId } from "../../../../../config/global-configs";
import moment from "moment";
import { InterrnaltranferDetails } from "../../types/InterrnaltranferDetails"
import APIInterceptor from "../../../../../helper/api-interceptor";
import fs from "fs";
import path from "path";
import Action from "../../../../../helper/actions";
import { IBOL } from "../../../../utilities/utilities/ibol-utilities";
import IBOLMainPage from "../../../accounts/pages/ibol-main-page";

export default class TransfersPage {
  iframe: FrameLocator;
  txtNickname: Locator;

  transferSection: Locator;
  tranferDetailSection: Locator;
  quickTransferSection: Locator;

  frequecydropdown = "#frequency";
  transferTypesdropdown = "#actionsDropdown";

  static CURRENTTRANSFER;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.transferSection = page.frameLocator(iframeId).locator(`//div[@class='card-body']`).nth(0);
    this.tranferDetailSection = page.frameLocator(iframeId).locator(`//div[@class='card-body']`).nth(2);
  }

  async getFromAccount() {
    return this.iframe.locator(`#fromAccount,#_fromAccount`).first();
  }

  getTemplateName = async () => {
    return this.iframe.locator("#templateName");
  }

  getTemplateDescription = async () => {
    return this.iframe.locator("#templateDescription");
  }

  async getToAccount(index: number = 0) {
    return this.iframe.locator(`#toAccount,#toAccount${index},#toAccount-${index}`).first();
  }

  async isActiveTabSelected(tabname: string) {
    const activeTab = this.iframe.locator(`//a[@role='tab' and contains(.,'${tabname}')]`).getAttribute('aria-selected');
    return activeTab;
  }

  async clickTab(tabname: string) {
    await this.iframe.locator(`//a[@role='tab' and contains(.,'${tabname}')]`).click()
  }

  async getNextStep() {

    const nextstepactions = this.iframe.locator(`//div[contains(text(), 'Next steps')]/following-sibling::div`)

    if (await nextstepactions.count() == 1) {
      return this.iframe.locator(`//div[contains(text(), 'Next steps')]/following-sibling::div`).nth(0);
    }

    return this.iframe.locator(`//div[contains(text(), 'Next steps')]/following-sibling::div`);
  }

  async getAmount(index: number = 0) {
    return this.iframe.locator(`#amount,#amount-${index}`);
  }

  async getTranferDate() {
    return this.iframe.locator('#transferDate, #paymentDate,#desiredPaymentDate');
  }

  async getFirstTranferDate() {
    return this.iframe.locator('#firstTransferDate');
  }

  async getLastTranferDate() {
    return this.iframe.locator('#lastTransferDate');
  }

  async getFromAccRef() {
    return this.iframe.locator("[id*=fromAccountReference]");
  }
  async getToAccRef(index: number = 0) {
    return this.iframe.locator(`#toAccountReference,#toAccountReference-${index}`);
  }
  async getNoteForApprover() {
    return this.iframe.locator("#noteForApprover");
  }

  async getFrequency() {
    return await page.locator('iframe[title="sideloadCenter"]').contentFrame().getByLabel('Number of transfers');
  }


  assertReadonlyAndPrefilled = async (field: Locator) => {
    await expect(field).toBeDisabled();
    await expect(field).not.toBe(' ');
    await expect(field).not.toBe('-');
  };

  async getFiled(fieldName: string) {
    return this.iframe.locator(`(//dt[contains(text(),'${fieldName}')]/following-sibling::dd)[1]`);
  }

  async getFiledValue(fieldName: string) {
    return (await this.getFiled(fieldName)).textContent();
  }

  async getQuickTranferDetails() {

    const createTransfer = async (): Promise<InterrnaltranferDetails> => {
      let tranferdata: InterrnaltranferDetails = {
        transferid: await this.getFiledValue("Transfer ID"),
        tranferDate: await this.getFiledValue("Transfer date"),
        fromaccount: await this.getFiledValue("From account"),
        toAccount: await this.getFiledValue("To account"),
        transfertype: await this.getFiledValue("Transfer type"),
        amount: await this.getFiledValue("Amount"),
        currency: await this.getFiledValue("Currency"),
        fromaccountreference: await this.getFiledValue("From account reference"),
        toaccountreference: await this.getFiledValue("To account reference"),
        status: await this.getFiledValue("Status"),
      };

      return tranferdata;
    }

    let quicktransferdata = await createTransfer();
    return await quicktransferdata;
  }


  async setFrequecy(numberoftransfers: string) {
    const freq = await this.getFrequency();
    await freq.fill(numberoftransfers)
  }





  async assertField(fieldName: string, expectedValue?: string | number) {
    const value = (await this.getFiledValue(fieldName)) ?? '';
    const normalized = String(value);
    expect(normalized).not.toBe('');
    expect(normalized).not.toBe('-');
    if (typeof expectedValue !== 'undefined') {
      expect(normalized).toEqual(String(expectedValue));
    }
  };

  async getQuickTransferSumbitStatus(alertText: string) {
    return await this.iframe.locator("//investec-online-transfers-singe-transfer-summary//p | //ui-alerts//p").filter({ hasText: alertText });
  }

  async quickTransferSetFromAccount(accountNumber: string = "Any") {
    (await this.getFromAccount()).waitFor({ timeout: 3000 })
    const fromAccount = await this.getFromAccount();
    await this.selectAccountFromList(fromAccount, accountNumber);
    await this.getAvailableBalance();
  }

  async quickTransferSetToAccount(accountNumber: string = "Any", index: number = 0) {
    let balance = 0;
    (await this.getToAccount()).waitFor({ timeout: 3000 })
    const toAccount = (await this.getToAccount());
    await this.selectAccountFromList(toAccount, accountNumber);
    let getbalance = await this.getAvailableBalance();
  }

  async selectAccountFromList(toAccount: Locator, accountNumber: string) {

    let listofaccounts;
    let accounts;

    do {
      await toAccount.click();
      listofaccounts = await this.iframe.locator(`//ngb-typeahead-window/button[@role='option']`);
      accounts = await listofaccounts.allTextContents();
      await page.waitForTimeout(1000)
    } while (accounts.length = 0);

    if (accountNumber.toLocaleLowerCase() !== "any") {
      await listofaccounts.getByText(accountNumber, { exact: false }).click();
    } else {
      await listofaccounts.first().click();
    }

    let getbalance = (await this.getAvailableBalance()).replace("Available balance R", "").trim();
    let balance = parseFloat(getbalance);


  }

  async quickTransferEnterAmount(amount: string) {
    const amountField = (await this.getAmount()).nth(0);
    await amountField.fill(amount);
  }

  async getDate(addDays: number = 0) {
    const today = moment();
    let testdate = today.clone();
    testdate.add(addDays, 'days');
    return testdate.format('DD/MM/YYYY');

  }

  async getNextSundayDate(addDays: number = 0): Promise<string> {
    const nextSunday = moment().day(7);
    const target = nextSunday.clone().add(addDays, 'days');
    console.log(`target date: ${target.format('DD/MM/YYYY')}`);
    return target.format('DD/MM/YYYY');
  }

  async setTransferDate(index: number = 0, sundayDate: string = "") {

    await page.waitForTimeout(3000);
    const dateField = await this.getTranferDate();

    let MAX_RETRIES = 6;
    let isCutOffTime = false;
    let isSundayStartDateApplied = false;
    do {
      const isError = await this.iframe.locator(".text-error.text-wrap.medium.d-block");
      let format = await this.getDate(index);

      if (isSundayStartDateApplied) {
        format = await this.getNextSundayDate(index);
      }

      if (sundayDate !== "" && !isSundayStartDateApplied) {
        format = sundayDate;
        isSundayStartDateApplied = true;
        index
      }

      await IBOL.fill(dateField, format);

      if (MAX_RETRIES <= 0) {
        throw new Error(`❌ Failed to set transfer date after multiple attempts. Last entered date was: ${format}`);
      }

      if (await isError.isVisible({ timeout: 2000 })) {
        let errorText = await IBOL.getTextContent(isError);
        if (await errorText.match(/cut.off|public holiday/i)) {
          isCutOffTime = true;
          index++;
          MAX_RETRIES--;
        } else {
          throw new Error(`❌ Failed to set transfer date with format: \n ${errorText}`);
        }
      } else {
        isCutOffTime = false;
      }
    } while (isCutOffTime);
  }

  async enterFrommAccReference(reference: string = "Test Automation from") {
    await this.setReference(reference, await this.getFromAccRef())
  }

  async enterToAccReference(reference: string = "Test Automation to ref") {
    await this.setReference(reference, await this.getToAccRef())
  }

  private async setReference(reference: string, targetfield: Locator) {
    let retry = 3;
    await targetfield.clear();
    do {
      await targetfield.fill(`${reference}`), { timeout: 3000 };
      retry--;
    } while (await targetfield.inputValue() === "" && retry > 0)
  }

  async enterNoteFoApprover(noteforapprover: string = "Test Automation Note for approver") {
    (await this.getNoteForApprover()).clear();
    (await this.getNoteForApprover()).fill(`${noteforapprover}`);
  }



  async quickTranferSumbitResponse(status: string) {
    await (await this.getQuickTransferSumbitStatus(status))
      .waitFor({ timeout: 5000 })
      .catch(() => ({ error: `Alert with text "${status}" did not appear within the expected time.` }));
    return (await this.getQuickTransferSumbitStatus(status));
  }

  async getLocator(locatorName: string) {
    return this.iframe.locator(locatorName);
  }

  async getTranferTypesDropdown() {
    return this.iframe.locator(`#actionsDropdown`);
  }

  async clickTranferDropDown() {
    (await this.getTranferTypesDropdown()).click();
  }

  async transferNextStep() {
    return this.getNextStep();
  }

  async customSelect(dropdown: string, option: string) {
    await this.iframe.locator(`${dropdown}`).click();
    await this.iframe.locator(`//ngb-highlight[contains(text(),'${option}')]`).click();
  }

  async selectFrequency(frequency: string) {
    (await this.getLocator(this.frequecydropdown)).click();
    await this.iframe.locator(`//investec-online-floating-label-input-dropdown//ngb-highlight[contains(text(),'${frequency}')]`).click();

  }

  async selectTranferType(tranfertype: string) {
    await this.iframe.locator(`//div[@aria-labelledby="actionsDropdown"]/button[contains(text(),'${tranfertype}')]`).click();
    await page.waitForTimeout(2000);
  }

  async getTranferTypes() {
    await this.iframe.locator(`#actionsDropdown`).click();
    //const test=await this.iframe.locator(`//div[@aria-labelledby="actionsDropdown"]/button[contains(text(),'${tranfertype}')]`).textContent({timeout:1000});
    return await this.iframe.locator(`//div[@aria-labelledby="actionsDropdown"]/button`).allTextContents();
  }

  async validateTranferTypes(options) {
    const opt = await this.getTranferTypes();
    let allpresent = true;
    let missingoption = ""
    for (let i = 0; i < options.length; i++) {
      let currentoption: string = await opt[i];
      if (await currentoption.trim() !== options[i].TransferType.trim()) {
        allpresent = false;
        missingoption = await missingoption.concat(` ${currentoption}`);
      }

      if (!allpresent) {
        throw new Error(`Missing tranfer type: ${await missingoption}`);
      }

      return allpresent;
    }
  }





  async getAccountBalance() {
    const getbalance = await this.getAvailableBalance();
    return await (`From account balance ${getbalance}`)

  }

  async clickTranferAddButton() {
    const add = await this.iframe.locator("//div[@class='table-responsive']//button").last();
    await add.waitFor({ timeout: 3000 })
    await add.dblclick()
    await page.waitForTimeout(120000)
  }

  async clickAddButton() {
    const TransferTotal = await this.iframe.locator("//small[contains(.,'Transfer total:')]");
    const add = await this.iframe.locator("//button//span[contains(.,'Add')]");
    await add.scrollIntoViewIfNeeded();

    try {
      await add.click()
    } finally {
      await add.scrollIntoViewIfNeeded();
      await add.click()
    }




  }



  getNextWeekday() {
    const today = moment();
    let nextWeekday = today.clone();

    do {
      nextWeekday.add(1, 'days');
    } while (nextWeekday.day() === 0 || nextWeekday.day() === 6);

    const monthtest = nextWeekday.format('D');
    return [nextWeekday.format('dddd, MMMM D, YYYY'), nextWeekday.format('MMM'), nextWeekday.format('D')];
  }

  async quickFirstTransferDate(index: number = 0) {

    //this.iframe.locator("//button[contains(@class,'calender')]").nth(0).click();
    this.iframe.locator(`svg[role="img"][name="calendar"]`).nth(0).click();
    // const prevMonth = this.iframe.locator("[title='Previous month']")
    // const nextMonth = this.iframe.locator("[title='Next month']")
    const selectMonth = this.iframe.locator("[title='Select month']")
    const selectYear = this.iframe.locator("[title='Select year']")


    const [dayOftheWeek, monthname, dayno] = this.getNextWeekday()
    await selectMonth.selectOption(`${monthname.toString()}`)
    const day = await this.iframe.locator(`//div[contains(@aria-label,'${dayOftheWeek}')]`)
    await day.click();
  }

  async quickLastTranferDate() {
    const submitBtn = this.iframe.locator(`#lastTransferDate`);
    await submitBtn.click();
  }



  async getAlert() {
    return await this.iframe.locator("//ui-alerts");
  }

  async assertAlertContainsText(alertText) {
    const alert = await this.getAlert();
    if (await alert.isVisible({ timeout: 2000 })) {
      await expect(alert).toContainText(alertText);
    }
  }


  async singleTranferSumbitResponse(status: string) {
    const respose = await this.iframe.locator("//div[@role='alert']//p");
    await respose.waitFor({ timeout: 20000 })
    expect(respose).toContainText(status)
  }



  async getRecurringTranferDetails() {

    const tranferdetails = await this.iframe.locator("//dl/dt/following-sibling::dd");
    const TransferID = await Table.getCellValueByHeader("Transfer ID");
    const Fromaccount = await Table.getCellValueByHeader("From account");
    const Toaccount = await Table.getCellValueByHeader("To account");
    const Transfertype = await Table.getCellValueByHeader("Transfer type");
    const NumberOfTransfers = await Table.getCellValueByHeader("Number of transfers");
    const Amount = await Table.getCellValueByHeader("Amount");

    const recurringtransferdata = {
      TransferID: await TransferID,
      Fromaccount: await Fromaccount,
      Toaccount: await Toaccount,
      Transfertype: await Transfertype,
      NumberOfTransfers: await NumberOfTransfers,
      Amount: await Amount,
    }

    return await recurringtransferdata;
  }



  async getAvailableBalance() {
    let avlbalnace = this.iframe.locator('investec-online-floating-label-input-dropdown ~ small').or(this.iframe.locator('investec-online-global-floating-label-search ~ small'));
    
    avlbalnace=await avlbalnace.last();
    let getbalance = await avlbalnace.textContent();
    while (getbalance.includes("Available balance loading...")) {
      await avlbalnace.waitFor({ timeout: 3000 })
      getbalance = await avlbalnace.textContent();
    }

    return getbalance;
  }


  async clickContinue() {
    await page.frameLocator("iframe#sideloadCenter").locator("//span[@class='ids-button__content' and contains(.,'Continue')]").click();
  }

  async clickDoneButton() {
    await page.frameLocator("iframe#sideloadCenter").locator("//span[@class='ids-button__content' and contains(.,'Done')]").click();
  }

  async uploadDocument(uploadfile: string = "apps/test/resources/testupload.pdf") {
    await page.frameLocator("iframe#sideloadCenter").locator("input[type='file']").setInputFiles([uploadfile]);
    const uploadedfile = await page.frameLocator("iframe#sideloadCenter").locator("//investec-online-global-file-upload//p").first();
    const downloadstatus = await page.frameLocator("iframe#sideloadCenter").locator(".text-muted").first();
    await downloadstatus.waitFor({ timeout: 20000 });
    expect(downloadstatus).toContainText("100% uploaded");
  }

  async clickTableHeadeLocatorByName(option: string = "All") {
    await IBOL.click(this.iframe.locator("//ul[contains(@class,'nav nav-tabs')]").getByText(option));

  }

  async clickDeatilsTab(option: string = "All") {
    await IBOL.click(this.iframe.locator("//ul[contains(@class,'nav nav-tabs')]//a").getByText(option));
  }


  async verifyPendingQuickTransferInTable(ftnumber: string | null) {

    let searchInputLocator = await IBOLMainPage.getSearchLocator();
    await IBOLMainPage.search(ftnumber)

    let searchInput = await IBOLMainPage.getSearchInputValue();

    if (searchInput !== ftnumber) {
      const response = await IBOL.fillAndInterceptResponse(searchInputLocator, ftnumber, "/api/v1/", 200);
      searchInput = await IBOL.getInputValue(searchInputLocator);
      if (searchInput !== ftnumber) {
        throw new Error(`FT number input value mismatch: expected '${ftnumber}', got '${searchInput}'`);
      }
    }
    await expect(searchInputLocator).toHaveValue(ftnumber);
  }

  async verifySarsPendingQuickTransferInTable(ftnumber: string | null) {

    let searchInputLocator = await IBOLMainPage.getSearchLocator();
    await IBOLMainPage.search(ftnumber)

    let searchInput = await IBOLMainPage.getSearchInputValue();

    if (searchInput !== ftnumber) {
      const response = await IBOL.fillAndInterceptResponse(searchInputLocator, ftnumber, "/api/v1/", 200);
      searchInput = await IBOL.getInputValue(searchInputLocator);
      if (searchInput !== ftnumber) {
        throw new Error(`FT number input value mismatch: expected '${ftnumber}', got '${searchInput}'`);
      }
    }
    await expect(searchInputLocator).toHaveValue(ftnumber);
 }
  
  
 async verifyPayrollPendingQuickTransferInTable(ftnumber: string | null) {

    let searchInputLocator = await IBOLMainPage.getSearchLocator();
    await IBOLMainPage.search(ftnumber)

    let searchInput = await IBOLMainPage.getSearchInputValue();

    if (searchInput !== ftnumber) {
      const response = await IBOL.fillAndInterceptResponse(searchInputLocator, ftnumber, "/api/v1/", 200);
      searchInput = await IBOL.getInputValue(searchInputLocator);
      if (searchInput !== ftnumber) {
        throw new Error(`FT number input value mismatch: expected '${ftnumber}', got '${searchInput}'`);
      }
    }
    await expect(searchInputLocator).toHaveValue(ftnumber);
 }
  
  async getFtNumber_PaymentID(recurringTransfer: any) {

    let transaction_number = (await recurringTransfer.ftnumber) && (await recurringTransfer.ftnumber) !== "-"
      ? await recurringTransfer.ftnumber
      : (!(await recurringTransfer.transferid) || (await recurringTransfer.transferid) === "-")
        ? ((await recurringTransfer.TransferID)
          ? await recurringTransfer.TransferID
          : await recurringTransfer.paymentID)
        : await recurringTransfer.transferid;

    if (transaction_number == undefined) {
      throw new Error(`FT number is undefined ${transaction_number} in current object ${JSON.stringify(recurringTransfer)}`);
    }

    return transaction_number;
  }

  async getTableSearchResultsCount() {
    return await this.iframe.locator("//p[contains(text(),'Results')]/preceding-sibling::h5");
  }

  async clickOnTransferTile(tileName: string) {
    await this.iframe.locator(`//p[contains(text(),"${tileName}")]`).click();
  }

  async selectTranferStatusSection(section: string) {
    await this.clickOnTransferTile(section);
  }

  async selectTransferStatusSection(section: string) {
    await this.selectTranferStatusSection(section);
  }

  async getTransactionDetailsHeader() {
    return await this.iframe.locator("//h4[contains(.,'ID -')]");
  }

  async getTransactionDetailsHeaderText() {
    const header = this.iframe.locator("//h4[contains(.,'ID -')]");
    await header.waitFor({ state: 'visible', timeout: 5000 });
    return await header.textContent();
  }

  async setNumberOfTransfers(numberOfTranfesr: string) {
    await this.iframe.locator("#numberOfTransfers").press("Enter")
    await this.iframe.locator("#numberOfTransfers").fill(numberOfTranfesr);
    await this.iframe.locator("#numberOfTransfers").click();
  }

  async verifyDetailsTab(recurringTransfer) {
    //  const recurringTransfer = this.parameters.currenttranfer;
    if (!recurringTransfer) {
      throw new Error('quicktransfer parameter is undefined. Ensure the step that sets this.parameters.quicktransfer ran before this step.');
    }
    await this.assertField('Transfer date', recurringTransfer.Transferdate);
    await this.assertField('Transfer type', recurringTransfer.Transfertype);
    await this.assertField('From account', recurringTransfer.Fromaccount);
    await this.assertField('To account', recurringTransfer.Toaccount);
    await this.assertField('Amount', recurringTransfer.Amount);
    await this.assertField('Currency', recurringTransfer.Currency);
    await this.assertField('From account reference', recurringTransfer.Fromaccountreference);
    await this.assertField('To account reference', recurringTransfer.Toaccountreference);
    await this.assertField('Status', recurringTransfer.Status);
  }


  /**
  * Downloads the internal transfer file via Playwright's download event,
  * validates it was saved and non-empty, optionally deletes it, and returns success.
  * @param deleteDownloadedFile - Whether to delete the downloaded file after validation. Defaults to true.
  * @returns Promise<boolean> - True if the file was downloaded and validated successfully.
  */
  static async internalTransferDownload(deleteDownloadedFile: boolean = true) {
    let isFileDownloaded = false;
    await APIInterceptor.InterceptServiceCall(`**/api/v1/internal-transfers/*`);
    const download = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.frameLocator("iframe#sideloadCenter").getByRole('button', { name: 'Download' }).last().click()
    ]);

    const suggested = await download[0].suggestedFilename();

    const dir = path.resolve('apps/test/test-results/downloads');
    fs.mkdirSync(dir, { recursive: true });
    const savePath = path.join(dir, suggested);

    await download[0].saveAs(savePath);
    let interceptedAPIResponseDataresponse = await APIInterceptor.getInterceptedAPIResponse();
    expect(await APIInterceptor.getInterceptedStatus()).toBe(200);

    expect(fs.existsSync(savePath)).toBeTruthy();
    const stats = fs.statSync(savePath);
    expect(stats.size).toBeGreaterThan(0);


    if (deleteDownloadedFile) {
      fs.unlinkSync(savePath);
    }

    isFileDownloaded = true;
    return isFileDownloaded;
  }

  /**
  *@param templateName - Optional Name of the template to be saved.
  *@param templateDescription - Optional Description of the template to be saved.
 */

  static async saveAsTemplate(templateType: string, templateName: string = "Auto Template", templateDescription: string = "Auto Template") {
    const rand4 = Math.floor(1000 + Math.random() * 99000);
    await page.frameLocator(iframeId).locator("#templateName").fill(`${templateType}${templateName}${rand4}`);
    await page.frameLocator(iframeId).locator("#templateDescription").fill(`${templateDescription}${rand4}`);
    await page.frameLocator(iframeId).getByRole('button', { name: 'Save' }).click();

    const templatename = `${templateType}${templateName}${rand4}`;
    const templatedescription = `${templateDescription}${rand4}`;

    return { templatename, templatedescription }
  }


  static async getTranferDetailsHeader() {
    return page.frameLocator(iframeId).getByRole('heading', { level: 4 });
  }

  async verifyAndDownloadTabDetails(tabname: string, recurringTransfer: any) {

    await this.clickTableHeadeLocatorByName(tabname);
    let partialendpont;

    let ftNumber = null;
    if (await recurringTransfer.ftnumber && (await recurringTransfer.ftnumber) !== "-") {
      ftNumber = await recurringTransfer.ftnumber;
    } else if (await recurringTransfer.transferid && (await recurringTransfer.transferid) !== "-") {
      ftNumber = await recurringTransfer.transferid;
    } else if (await recurringTransfer.TransferID && (await recurringTransfer.TransferID) !== "-") {
      ftNumber = await recurringTransfer.TransferID;
    } else if (await recurringTransfer.paymentID && (await recurringTransfer.paymentID) !== "-") {
      ftNumber = await recurringTransfer.paymentID;
    }

    if (tabname === "Details") {
      await this.verifyDetailsTab(recurringTransfer);
      partialendpont = `?isDownload=true&fileType=PDF&includeApproval=true`;
    } else if (tabname === "Audit") {
      partialendpont = `/api/v1/internal-transfers/audit/INT/${ftNumber}?isDownload=true&fileType=PDF`;
    } else if (tabname === "Approvals") {
      partialendpont = `/api/v1/internal-transfers/`;
    }

    const downloadbtn = await page.frameLocator("iframe#sideloadCenter").getByRole('button', { name: 'Download' }).last();

    if (!ftNumber || ftNumber == "-") {
      throw new Error(`FT number is undefined for transfer ${JSON.stringify(recurringTransfer)}`);
    }

    try {
      await Action.downloadFile(downloadbtn, partialendpont)
    } catch (error) {
    }

    return ftNumber;
  }


}


