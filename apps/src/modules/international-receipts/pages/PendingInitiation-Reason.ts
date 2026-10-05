import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

export default class InternationPIReasonPage {


  private iframe: FrameLocator;
  private readonly ddlForeignExchangeRate: Locator;
  private static amountRemaining;
  private isBobLoaded: boolean = false;
  constructor() {
    this.iframe = page.frameLocator(iframeId);
  }

  async getAmountRemaining() {
    return await InternationPIReasonPage.amountRemaining;
  }

  async getBobDeleteButton() {
    return this.iframe.locator("(//div[@class='mb-2']//ui-icon)[2]");
  }

  async getReasonForReceipt() {
    return this.iframe.locator("#InternationalReceiptsBopCode");
  }

  async getDeleteBobButton() {
    try {
      const buttonLocator = await this.getBobDeleteButton();
      await buttonLocator.waitFor({ state: 'visible', timeout: 3000 });
      return buttonLocator;
    } catch (error) {
      return null;
    }
  }

  async getOption(option: string) {
    return this.iframe.locator(`//button[contains(@role, 'option') and contains(., '${option}')]`);
  }

  async getSubmitButton() {
    return this.iframe.locator("//span[contains(text(),'Submit')]");
  }

  async getAmmountRemaining() {
    return this.iframe.locator("//p[contains(text(),' Amount remaining :')]");
  }

  async getReason() {
    return this.iframe.locator("//h3[contains(.,'Reason')]");
  }

  async getDropDownOptionByText(option: string): Promise<Locator> {
    const locator = await this.getOption(option);
    await locator.scrollIntoViewIfNeeded();
    return locator;
  }

  async deleteCurrentBobCode() {
    const deleteBobButton = await this.getDeleteBobButton();
    this.isBobLoaded = await deleteBobButton?.isVisible();
    let deleteRetry = 2
    while (this.isBobLoaded && deleteRetry > 0) {
      (await this.getDeleteBobButton())?.click();
      this.isBobLoaded = false
      await page.waitForTimeout(2000);
      await deleteRetry--;
    }
  }

  async selectBobCode(bobcode: string) {
    if (!this.isBobLoaded) {
      (await this.getReasonForReceipt()).click()
      await this.iframe.getByRole('option', { name: bobcode }).click();
    }
    this.isBobLoaded = false
    InternationPIReasonPage.amountRemaining = (await this.getAmmountRemaining()).textContent();
  }

}