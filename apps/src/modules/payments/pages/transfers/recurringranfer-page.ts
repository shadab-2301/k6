import { DateUtilities } from "../../../../utilities/utilities/date-utilities";
import { IBOL } from "../../../../utilities/utilities/ibol-utilities";
import TransfersPage from "./tranferspage";
import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";


export default class Recurringtransfer extends TransfersPage {

  static RecurringFtNumber = "";

  async quickTransferEnterAmount(amount: string) {
    const amountField = this.iframe.getByPlaceholder('0.00').last();;
    await amountField.fill(amount);
  }

  getInformationButton = async () => {
    //return this.iframe.locator(".ids-button__content svg[name='information']");
    return this.iframe.locator(".ids-button__content svg").last();
  };

  getRandomInformationButton = async () => {
    return this.iframe.locator(".ids-button__content svg[name='information'],#offcanvas-table-undefined");
  };

  getDetailsTab = async () => {
    return this.iframe.locator("#ngb-nav-0");
  };

  getSeriesTab = async () => {
    return this.iframe.locator("#ngb-nav-1");
  };
  getTranferTab = async (tabname) => {
    return this.iframe.locator(`//a[contains(@id,'ngb-nav-') and text()='${tabname}']`);
  };

  closeInfomationSlider = async () => {
    const crossBtn = this.iframe.getByRole('button', { name: 'cross' });
    const closeBtn = this.iframe.locator('#domesticSummaryCanvasClose');

    if (await crossBtn.isVisible()) {
      await crossBtn.click();
    } else if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      throw new Error('Neither close button nor cross button found');
    }

  };

  getDoneButton(): Locator {
    return this.iframe.locator('#domesticSummaryCanvasClose');
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

  async openinfomationslider(index: number = 0) {
    try {
      const infomationbtn = await (await this.getInformationButton()).nth(index);
      await IBOL.click(infomationbtn);
    } catch (error) {
      const infomationbtn = await (await this.getRandomInformationButton()).nth(index);
      await IBOL.click(infomationbtn);
    }
  }

  async selectInfomationSlidderTab(tabname: string) {
    try {
      const transferTab = await this.getTranferTab(tabname);
      await transferTab.waitFor({ state: "visible", timeout: 5000 });
      await transferTab.click();
      await expect(transferTab).toHaveAttribute("aria-selected", "true", { timeout: 5000 });
    } catch (error) {

    }
  }




}



