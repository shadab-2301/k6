import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { getAccountNumberByIndex } from "../../../../utilities/utilities/test-data-repo";
import { Banks } from "../../../../../test/data/test-data-const";
import { IBankDetails } from "../../../shared/types/bank-details-interface";
import { iframeId } from "../../../../../config/global-configs";


export default class BeneficiaryBankingDetails {
  iframe: FrameLocator;

  readonly txtBankName: Locator;
  readonly txtBranchCode: Locator;
  readonly txtAccountnumber: Locator;
  capturedBankingDeatils: IBankDetails;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.txtBankName = this.iframe.locator('//input[@placeholder="Select bank name"]');
    this.txtBranchCode = this.iframe.locator('#branchCode');
    this.txtAccountnumber = this.iframe.locator('//input[@formcontrolname="AccountNumber"]');
  }

  async selectBankName(bankName: string) {
    await this.txtBankName.click();
    await this.iframe.locator("//button[@role='option' and .//*[contains(text(),'" + Banks["" + bankName + ""] + "')]]").click()
  }


  async captureBankDetails(bank: string, accountNo: string) {
    await this.selectBankName(bank);
    const account = await getAccountNumberByIndex(Number(accountNo));
    await this.txtAccountnumber.fill(account.toString());
    this.capturedBankingDeatils = await this.getCapturedBankDetails();
  }

  async getCapturedBankDetails() {
    return {
      bankName: await this.txtBankName.inputValue(),
      branchCode: await this.txtBranchCode.inputValue(),
      accountNumber: await this.txtAccountnumber.inputValue()
    } as IBankDetails;
  }

}