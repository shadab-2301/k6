import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import ApolloDashboardPage2 from "../../../shared/pages/apollo-dashboard-page-2";
import Table from "../../../shared/pages/data-table-page";
import { iframeId } from "../../../../../config/global-configs";
import moment from "moment";
import { InterrnaltranferDetails } from "../../types/InterrnaltranferDetails"
import { DateUtilities } from "../../../../utilities/utilities/date-utilities";
import TransfersPage from "./tranferspage";
import { IBOL } from "../../../../utilities/utilities/ibol-utilities";
import IBOLMainPage from "../../../accounts/pages/ibol-main-page";

export default class TransferDetailPage {
  iframe: FrameLocator;
  txtNickname: Locator;

  transferSection: Locator;
  tranferDetailSection: Locator;
  quickTransferSection: Locator;

  fromacount;// = "#_fromAccount";
  toaccount;
  accountlist;
  fromaccountref;

  frequecydropdown = "#frequency";
  transferTypesdropdown = "#actionsDropdown";

  static CURRENTTRANSFER;
  static SIGLETRANSFER;
  static RECURRINGTRANSFER;
  //static MULTIPLETRANSFER[];

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.transferSection = page.frameLocator(iframeId).locator(`//div[@class='card-body']`).nth(0);
    this.tranferDetailSection = page.frameLocator(iframeId).locator(`//div[@class='card-body']`).nth(2);
    this.fromacount = '[id="fromAccount"],[id*="_fromAccount"]'
    this.toaccount = "#toAccount";
    this.accountlist = "button[role='option']"
    this.fromaccountref = "fromAccountReference-0";
  }

  async getAmount(index: number = 0) {
    return this.iframe.locator(`#amount,#amount-${index}`);
  }

  async getMultiAmount(index: number = 0) {
    return this.iframe.locator(`#amount-${index}`);
  }

  async getLocator(locatorStrategy: string) {
    try {
      let locator = await this.iframe.locator(locatorStrategy);
      await locator.isVisible({ timeout: 5000 });
      return await locator;
    } catch (error) {
      //console.log(" Error while getting locator ", error);
    }
    return await null;
  }


  async click(locatorStrategy: string) {
    try {
      await (await this.getLocator(locatorStrategy)).click();
    } catch (error) {
      //console.log(" Error while clicking locator ", error);
    }
  }

  async selectFromAccount(accountNumber: string = "Any") {
    const fromAccount = await this.getLocator(this.fromacount);
    await this.selectAccountFromList(fromAccount, accountNumber);
  }

  async selectMultiFromAccount(accountNumber: string = "Any") {
    const fromAccount = await this.getLocator("#_fromAccount");
    await this.selectAccountFromList(fromAccount, accountNumber);
  }

  async clickUploadButton() {
    const toAccount = this.iframe.locator("[name='upload']").last().click();
  }

  async selectToAccount(accountNumber: string = "Any", tranfertype: string = "", index: number = 0) {//#toAccount
    let fromAccount = await this.getLocator(this.toaccount);
    await this.selectAccountFromList(fromAccount, accountNumber);
    await page.waitForTimeout(3000);
  }

  async selectMultiToAccount(accountNumber: string = "Any", index: number = 0) {//#toAccount
    let fromAccount = this.iframe.locator(`#toAccount${index}`).or(this.iframe.locator(`#toAccount-${index}`));
    await this.selectAccountFromList(fromAccount, accountNumber);
    await page.waitForTimeout(3000);
  }

  async verifyFromAccountRefIsUpdated(expectedRef: string) {
    const fromAccRef = (await this.getFromAccRef()).last();
    const actualRef = await fromAccRef.inputValue();
    expect(actualRef).toContain("Transfer");
  }

  async verifyToAccountRefIsUpdated(expectedRef: string) {
    const toAccRef = (await this.getToAccRef()).last();
    const actualRef = await toAccRef.inputValue();
    expect(actualRef).toContain("Transfer");
  }

  async verifyAvailableBalanceIsDisplayed() {

    await expect(async () => {
      const avlbalance = await this.iframe.locator("//small[contains(.,'Available balance')]").last();
      const getbalance = (await avlbalance.textContent()).trim();
      expect(getbalance).toMatch(/Available balance\s*R/)
    }).toPass({ timeout: 30000 });

  }


  async getTranferDate2() {
    return this.iframe.locator('#transferDate');
  }

  async setTransferDate(index: number = 0) {
    const transferPage = new TransfersPage();
    await transferPage.setTransferDate(index);

  }

  async setMultiTransferDate(rowIndex: number = 0) {

    const dateField = this.iframe.locator(`#transferDatePicker-${rowIndex}`).locator('input[type="text"]');
    const errorDateInput = this.iframe.locator(`.input-group:has(#transferDatePicker-${rowIndex}) ~ .text-error`);

    let targetDateIndex = 0;
    let retryCount = 0;
    const dateToSet = async (n) => { return await DateUtilities.getDate(n) };

    do {
      await dateField.fill(`${await dateToSet(targetDateIndex)}`);
      await errorDateInput.waitFor({ state: 'hidden', timeout: 5000 });

      if (await errorDateInput.isVisible() && (await errorDateInput.innerText()).includes("Minimum")) {
        targetDateIndex++;
        retryCount++;
        if (retryCount === 3) {
          throw new Error("Unable to set a valid transfer date after multiple attempts.");
        }
      } else {
        break;
      }
    } while (retryCount <= 3);
  }

  async setMultiTransferAmount(amount: string, index: number = 0) {
    const amountField = await this.getMultiAmount(index);
    await amountField.fill(amount);
  }

  async setAmount(amount: string, index: number = 0) {
    const amountField = await this.getAmount(index);
    await amountField.fill(amount);
  }


  async quickTransferEnterAmount1(amount: string) {
    const amountField = await this.getAmount();
    await amountField.fill(amount);
  }


  //=========HELPERS========================

  async getDate(addDays: number = 0) {
    const today = moment();
    let testdate = today.clone();
    testdate.add(addDays, 'days');
    return testdate.format('YYYY-MM-DD');

  }


  async selectAccountFromList(accountLocator: Locator, accountNumber: string = "Any") {

    let listofaccounts;
    let accounts;

    await accountLocator.click();
    await page.waitForTimeout(2000);

    listofaccounts = await this.iframe.locator(this.accountlist);
    accounts = await listofaccounts.allTextContents();
    await page.waitForTimeout(1000)
    accountNumber = accountNumber.toLowerCase();
    let index = 0;
    if (accountNumber.toLocaleLowerCase() !== "any") {
      index = -1;
      await accounts.forEach((element, i) => {
        element = element.toLocaleLowerCase();
        if (element.includes(accountNumber)) {
          index = i;
          return;
        }
      });
    }

    if (index === -1) {
      throw new Error(`Account number ${accountNumber} not found in the account list.`);
    }

    await listofaccounts.nth(index).click();

  }




  async setTransferDate1(index: number = 0) {
    const dateField = await this.getTranferDate();
    await dateField.fill(`${await this.getDate(index)}`);
  }


  async getFromAccount() {
    return this.iframe.locator(`#fromAccount,#_fromAccount`);
  }

  async setFromAccount(accountNumber: string) {
    (await this.getFromAccount()).waitFor({ timeout: 3000 })
    const fromAccount = await this.getFromAccount();
    await this.selectAccountFromList(fromAccount, accountNumber);
    await this.getAvailableBalance();
  }

  async getToAccount() {
    return this.iframe.locator(`#toAccount`).first();
  }

  async getNextStep() {
    return this.iframe.locator(`//div[contains(text(), 'Next steps')]/following-sibling::div`).nth(0);
  }


  async getTranferDate() {
    return this.iframe.locator('#transferDate').last();
  }

  async getFirstTranferDate() {
    return this.iframe.locator('#firstTransferDate');
  }

  async getLastTranferDate() {
    return this.iframe.locator('#lastTransferDate');
  }

  async getFromAccRef(index: number = 0) {
    return this.iframe.locator(`#fromAccountReference,#fromAccountReference-${index}`);
  }

  async getMultiTransferFromAccRef(index: number = 0) {
    return this.iframe.locator(`#fromAccountReference-${index}`);
  }


  async getMultiTransferToAccRef(index: number = 0) {
    return this.iframe.locator(`#toAccountReference-${index}`);
  }

  async getToAccRef(index: number = 0) {
    return this.iframe.locator(`#toAccountReference,#toAccountReference-${index}`);
  }

  async setMultiTransferFromAccountReference(index: number = 0) {
    (await this.getMultiTransferFromAccRef(index)).waitFor({ timeout: 3000 })
    const fromAccount = await (await this.getMultiTransferFromAccRef(index)).inputValue();

    if (fromAccount == "") {
      await (await this.getMultiTransferFromAccRef(index)).fill(`Test Automation from ref ${index}`);
    }
  }

  async setMultiTransferToAccountReference(index: number = 0) {
    (await this.getMultiTransferToAccRef(index)).waitFor({ timeout: 3000 })
    const toAccount = await (await this.getMultiTransferToAccRef(index)).inputValue();

    if (toAccount == "") {
      await (await this.getMultiTransferToAccRef(index)).fill(`Test Automation to ref ${index}`);
    }
  }


  async getNoteForApprover() {
    return this.iframe.locator("#noteForApprover");
  }

  async getnumberOfTransfers() {
    return this.iframe.locator('#numberOfTransfers');
  }

  async getFrequency() {
    return this.iframe.locator('#frequency');
  }



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

  async getQuickTransferSumbitStatus() {
    return await this.iframe.locator("//investec-online-transfers-singe-transfer-summary//p | //ui-alerts//p");
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



  async quickTransferEnterAmount(amount: string) {
    const amountField = await this.getAmount();
    await amountField.fill(amount);
  }

  async getDate1(addDays: number = 0) {
    const today = moment();
    let testdate = today.clone();
    testdate.add(addDays, 'days');
    return testdate.format('YYYY-MM-DD');



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
    (await this.getQuickTransferSumbitStatus()).waitFor({ timeout: 20000 })
    return await this.getQuickTransferSumbitStatus();
  }

  async getLocator11(locatorName: string) {
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

  async setNumberOfTranfers(tranferno: string) {
    (await this.getLocator(this.frequecydropdown)).click();
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
    //console.log(await opt);
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
    // const TransferTotal = await this.iframe.locator("//small[contains(.,'Transfer total:')]");
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

  async setFirstTransferDate(index: number = 0) {

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

  async setLastTranferDate() {
    const submitBtn = this.iframe.locator(`#lastTransferDate`);
    await submitBtn.click();
  }

  async verifyLastTraferDateIsUpdated() {
    const submitBtn = this.iframe.locator(`#lastTransferDate`);
    await expect(submitBtn).toHaveValue(/^\s*\d{2}\/\d{2}\/\d{4}\s*$/);
  }



  async getAlert() {
    return await this.iframe.locator("//ui-alerts");
  }

  async assertAlertContainsText(alertText) {
    const alert = await this.getAlert();
    if (await alert.isVisible()) {
      await expect(alert).toContainText(alertText);
    }
  }


  async singleTranferSumbitResponse(status: string) {
    await page.waitForTimeout(5000);
    const respose = await this.iframe.locator("//div[@role='alert']//p");
    expect(respose).toContainText(status)
  }



  async getRecurringTranferDetails() {
    ////console.log(" Recurring FT number ", await this.iframe.locator("//span[contains(.,'FT')]").textContent());

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
    let avlbalnace = await this.iframe.locator('//small').last();
    let getbalance = await avlbalnace.textContent();
    while (getbalance.includes("Available balance loading...")) {
      await avlbalnace.waitFor({ timeout: 3000 })
      getbalance = await avlbalnace.textContent();
    }

    //     let isNegative = false;

    //     if (getbalance.includes("-")) {
    //       isNegative = true;
    //     }

    //     //const regex = /^\s*Available balance\s*-?\s*R\s[\d,]+\.\d{2}\s*$/;
    //     const regex = /^\s*.*?:\s*-?\s*R\s[\d,]+\.\d{2}\s*$/;
    //     //const regex = /^\s*.*?:?\s*-?\s*R\s[\d,]+\.\d{2}\s*$/;

    // //console.log("Available balance :: >>> ", getbalance);


    //     expect(getbalance.trim()).toMatch(regex);

    //    // let balance = parseFloat(getbalance.replace(/^\s*Available balance\s*-?\s*R\s*/, "").replace(/,/g, "").trim());
    //    // let balance = parseFloat(getbalance.replace(/^\s*.*?\s*-?\s*R\s*/, "").replace(/,/g, "").trim());
    //         let balance = parseFloat(getbalance.replace(/^\s*.*?:?\s*-?\s*R\s[\d,]+\.\d{2}\s*$/, "").replace(/,/g, "").trim());

    //     if (isNegative) {
    //       balance = balance * -1;
    //     }
    // //console.log("Available balance :: >>> ", balance);
    return getbalance;
  }

  async getButtonLocator(buttonName: string) {
    let button = null;

    button = await this.iframe.getByText(buttonName, { exact: true });
    await page.waitForTimeout(500);
    const isDisplayed = await button.isVisible()
    if (!isDisplayed) {
      button = await this.iframe.locator(`//span[@class='ids-button__content' and contains(.,'${buttonName}')]`);
    }
    return button;
  }

  async verifyButtonIsVisible(buttonName: string) {
    const button = await this.getButtonLocator(buttonName);
    await expect(button).toBeVisible();
  }

  async verifyButtonIsEnabled(buttonName: string) {
    const button = await this.getButtonLocator(buttonName);
    await expect(button).toBeEnabled();
  }


  async verifyButtonIsNotEnabled(buttonName: string) {
    const button = await this.getButtonLocator(buttonName);
    await expect(button).not.toBeEnabled();
  }

  async verifyButtonIsNotVisible(buttonName: string) {
    const button = this.iframe.getByText(buttonName, { exact: true });
    await expect(button).not.toBeVisible();
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
    const downloadstatus = await page.frameLocator("iframe#sideloadCenter").locator("div.me-2 > span.text-muted").first();
    await downloadstatus.waitFor();
    //console.log(await downloadstatus.textContent());
    expect(downloadstatus).toContainText("100% uploaded");
  }

  async isDocumentUploadedButtonDisplayed() {
    const button = await page.frameLocator("iframe#sideloadCenter").locator("input[type='file']");
    return await button.isVisible();
  }

  async clickTableHeadeLocatorByName(option: string = "All") {
    await (await this.getTableHeadeLocatorByName(option)).click();
  }

  async getTableHeadeLocatorByName(option: string = "All") {
    return this.iframe.locator("//ul[contains(@class,'nav nav-tabs')]").getByText(option);
  }

  async verifyPendingQuickTransferInTable(ftnumber: string | null) {
    // await this.iframe.locator("#basic-search").fill(ftnumber);
    // await page.waitForTimeout(3000);

    const searchInputLocator = this.iframe.locator("#basic-search");
    let searchInput = await searchInputLocator.inputValue();
    if (searchInput !== ftnumber) {
      const response = await IBOL.fillAndInterceptResponse(searchInputLocator, ftnumber, "/api/v1/", 200);
      await page.waitForTimeout(3000);

      searchInput = await IBOLMainPage.getSearchInputValue();
      if (searchInput !== ftnumber) {
        throw new Error(`FT number input value mismatch: expected '${ftnumber}', got '${searchInput}'`);
      }
    }
    await expect(searchInputLocator).toHaveValue(ftnumber);


  }

  async getTableSearchResultsCount() {
    return await this.iframe.locator("//p[contains(text(),'Results')]/preceding-sibling::h5");
  }


  async getTransactionDetailsHeader() {
    return await this.iframe.locator("//h4[contains(.,'ID -')]");
  }

  async getFTNumber() {
    return (await (await this.getTransactionDetailsHeader()).textContent()).replace('Payment ID -', '').trim();
  }

  async setNumberOfTransfers(numberOfTranfesr: string) {
    await this.iframe.locator("#numberOfTransfers").press("Enter")
    await this.iframe.locator("#numberOfTransfers").fill(numberOfTranfesr);
    await this.iframe.locator("#numberOfTransfers").click();
  }

  async verifyDetailsTab(recurringTransfer) {
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


}




