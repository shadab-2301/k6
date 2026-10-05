import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import Action from "../../../../helper/actions";
import Command from "../../../../helper/commands";
import { getTextContent } from "../../../../helper/playwright-actions";
import { iframeId } from "../../../../config/global-configs";
import { IBOL } from "../../../utilities/utilities/ibol-utilities";

export default class InternationReceiptDetailPage {

  private iframe: FrameLocator;
  private readonly ddlForeignExchangeRate: Locator;
  public numOfResults: number;
  SearchBar = (): Locator => { return this.iframe.locator("//input[@placeholder='Search remitter name, reference']") };
  static ResultListCount = (): Locator => { return page.frameLocator(iframeId).locator("//investec-online-result-box//h5") };
  ClearSearchBtn = (): Locator => { return this.iframe.locator("//div[@class='search-close-button']//button") }

  constructor() {
    this.iframe = page.frameLocator(iframeId);
  }

  async filterByCurrency(currencyValue: string) {

    await this.getCurrencyFilterSearch().fill(currencyValue);
    page.keyboard.press('Enter');
    ;
    await this.getElementByText(currencyValue).click();
  }

  getFilterButton() {
    return this.iframe.getByRole('img', { name: 'filter' });
  }

  getCurrencyFilterSearch() {
    return this.iframe.locator(`//div[@class='modal-body']//input`);
  }

  getElementByText(elementName: string) {
    try {
      return this.iframe.locator(`//span[contains(text(),'${elementName}')]`);
    } catch (error) {
      throw new Error(`Element with text ${elementName} not found.`);
    }

  }

    getParagrapByText(elementName: string) {
    try {
      return this.iframe.locator(`//p[contains(text(),'${elementName}')]`);
    } catch (error) {
      throw new Error(`paragraph with text ${elementName} not found.`);
    }

  }

  getTableResults() {
    return this.iframe.locator("//investec-online-receipts-overview/div[3]/p");
  }

  getNumberOfResultsDiplayed() {

    return this.iframe.locator("//investec-online-result-box/div/div/h5");
  }

  getClearAllText() {
    return this.iframe.locator("//investec-online-receipts-overview/div[2]/div/ui-button[2]/button");
  }

  getAmountsOnTable() {
    return this.iframe.locator("//table/tbody/tr/td[7]/span");
  }

  async getValuesFromCell(tableAmounts: Locator) {
    const rowCount = await tableAmounts.count();

    const columnValues: string[] = [];

    for (let i = 0; i < rowCount; i++) {

      const cellValue = await tableAmounts.nth(i).innerText();
      columnValues.push(cellValue);
    }
    return columnValues;
  }

  setNumberOfResultsDisplayed(results: number) {
    this.numOfResults = results;
  }

  getFilterByCurrencyCode() {
    return this.iframe.locator("//investec-online-filter-type[contains(.,'Currency code')]//button/span");
  }

  async enterSearchTerm(searchTerm: string) {
    await Command.slowTypeText(this.SearchBar(), searchTerm);
  }

  static async getTotalResultsDisplayed() {
    const val = await getTextContent(this.ResultListCount())
    return Number(val);
  }

  static async verifyTotalResultsDisplayed() {
    await Action.isElementDisplayed(this.ResultListCount());
  }
  async clearSearchbox() {
    await this.ClearSearchBtn().waitFor({ state: 'visible', timeout: 180000 });
    await this.ClearSearchBtn().click();
    await this.ClearSearchBtn().waitFor({ state: 'hidden', timeout: 180000 });
  }
  getForeignExchangeRate() {
    return this.iframe.locator("//input[@id='foreignExchangeRateAcceptance']");
  }

  getReasonForRejection() {
    return this.iframe.locator("#returnReason");
  }

  getNoteForApprover() {
    return this.iframe.locator("#noteForApprover");
  }

  getDropDownOption(): Locator {
    return this.iframe.locator("//button[contains(@role, 'option')]");
  }

  getContinueButton() {
    return this.iframe.locator("//span[contains(text(),'Continue')]");
  }

  async clickButton(buttonText: string) {
    const btn = await this.iframe.locator(`//span[contains(text(),'${buttonText}')]`);
    await IBOL.click(btn);
  }

  async capatureForeignExchangeRatesAcceptance() {
    await page.waitForLoadState('load');
    let currentExchangeValue = await this.getForeignExchangeRate().getAttribute('placeholder')

    if (currentExchangeValue === "No Rate Confirmation Required") {
      return;
    } else {
      await this.getForeignExchangeRate().click();
    }
    await this.getDropDownOption().nth(0).click();
  }

  async capatureResonForRejection() {

    await this.getReasonForRejection().click({ timeout: 60000 });
    let value = await this.getReasonForRejection().inputValue()
    let totalOptions = await this.getDropDownOption().count()
    let randomIndex = await Math.floor(Math.random() * totalOptions);

    await this.getDropDownOption().nth(randomIndex).waitFor({ timeout: 3000 })
    await this.getDropDownOption().nth(randomIndex).click();
  }

  async capatureNoteForApprover() {
    await this.getNoteForApprover().waitFor({ state: 'visible', timeout: 20000 });
    await this.getNoteForApprover().fill("Investec Test Automation ");
  }

  async clickContinueButton() {
    await this.getContinueButton().click();
  }

}