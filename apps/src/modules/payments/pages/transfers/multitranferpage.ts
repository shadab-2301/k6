import { DateUtilities } from "../../../../utilities/utilities/date-utilities";
import TransfersPage from "./tranferspage";
import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";

export default class Multitransfer extends TransfersPage {

  static mutliFtNumber = [];
  static MAXIMUMTRANSFERS = 20;
  totalAmount = 0;
  totalTransfers = 0;

  async getNumberOfTransfers() {
    return this.iframe.locator("#add-transfer");
  }

  async getTableNumberOfTransfers() {
    return  await this.iframe.locator(`//tbody/tr[contains(@id,"transfer")]`);
  }

  constructor() {
    super();
  }

  async getMultiTranferTotalAmount() {
    return this.iframe.locator("//small[contains(.,'Transfer total: R')]");
  }

  async quickTransferEnterAmount(amount: string) {
    const amountField = this.iframe.getByPlaceholder('0.00').last();;
    await amountField.fill(amount);
  }

  async quickTransferSetToAccount(accountNumber: string = "Any") {
    let balance = 0;
    await page.waitForTimeout(3000)
    const toAccount = this.iframe.getByPlaceholder('To accounts').last().or(this.iframe.getByPlaceholder('Select to account').last());
    await this.selectAccountFromList(toAccount, accountNumber);
    let getbalance = await this.getAvailableBalance();
    balance = parseFloat(getbalance.replace("Available balance R", "").trim());
  }

  async quickTransferSetDate() {
    const dateField = this.iframe.getByPlaceholder("dd/mm/yyyy").last();
    await dateField.fill(`${await DateUtilities.getDate()}`);
    
  }

  async clickUploadButton() {
    const toAccount = this.iframe.locator("[name='upload']").last().click();
  }

  async uploadDocument(uploadfile: string = "apps/test/resources/testupload.pdf") {
    await page.frameLocator("iframe#sideloadCenter").locator("input[type='file']").setInputFiles([uploadfile]);

    const uploadedfile = await page.frameLocator("iframe#sideloadCenter").locator("//investec-online-global-file-upload//p").first();
    const downloadstatus = await page.frameLocator("iframe#sideloadCenter").locator(".text-muted").nth(1);
  }

  async uploadDocuments() {
    await this.clickUploadButton()
    await this.enterNoteFoApprover();
    await this.uploadDocument();
    await this.clickDoneButton();
  }

  async getMultiSumOfTotalAmounts() {
    const amount = await this.iframe.locator("input[placeholder='0.00']");
    this.totalTransfers = await amount.count();
    this.totalAmount = 0;
    for (let i = 0; i < await this.totalTransfers; i++) {
      this.totalAmount = this.totalAmount + parseFloat(await amount.nth(i).inputValue());
    }
    return { totalamount: this.totalAmount, totaltransfers: this.totalTransfers }; // Return object

  }


}



