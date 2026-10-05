import { randomInt } from "crypto";
import { expect, FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import AccountsTablePage from "./account-table-page";
import { iframeId } from "../../../../config/global-configs";
import { IBOL } from "../../../utilities/utilities/ibol-utilities";
import FilterMenu from "../../international-receipts/pages/FilterMenu";
import Table from "../../shared/pages/data-table-page";

export default class AccountsOverviewPage {

  iframe: FrameLocator;
  table: AccountsTablePage;
  rowSelector: Locator;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.table = new AccountsTablePage();
    this.rowSelector = this.iframe.locator(`//tr//td[last()]`);
  }

  async selectTab(tabName: string) {
    await IBOL.selectTabByPartialText(this.iframe, tabName);
  }

  async searchAccount(query: string) {
    await this.iframe.locator('input[placeholder*="Search account"]').fill(query);
  }

  async selectByAccountNumber(accountNumber: string) {
    await this.searchAccount(accountNumber);
    const rowLocator = this.iframe.locator(`//tr[td[contains(text(),"${accountNumber}")]]//td[last()]`);

    expect(async () => await rowLocator.isVisible()).toPass({ timeout: 30000 });

    const AccountInfo = {
      "Account name": await Table.getCellValueByHeader("Account name", 0),
      "Account number": await Table.getCellValueByHeader("Account number", 0),
      "Currency": await Table.getCellValueByHeader("Currency", 0),
      "Balance": await Table.getCellValueByHeader("Balance", 0),
      "Available balance": await Table.getCellValueByHeader("Available balance", 0),
    }


    await rowLocator.click();
    await expect(() => {
      expect(page.url()).toContain('/accounts/details');
    }).toPass({ timeout: 30000 });

  }

  async sortBy(field: string) {
    await this.iframe.locator('button:has-text("Sort by")').click();
    await this.iframe.locator(`text=${field}`).click();
  }

  async downloadAccounts() {
    ///To impliment functionality later
  }

  async filterBy(field: string) {

    await FilterMenu.openFilterMenu()
    await FilterMenu.selectFilterOption(field);
    await FilterMenu.ApplyFilters();

  }

  async newfilterBy(filterOptions: { FilterType: string, Option: string }[]) {

    await FilterMenu.openFilterMenu()

    for (const { FilterType, Option } of filterOptions) {
      await FilterMenu.newFilter(FilterType, Option);
    }
    const btn = await FilterMenu.getApplyButton();
    const { responseJson } = await IBOL.clickAndInterceptResponse(btn, "api");

    return responseJson;
  }

  getTabByName = async (tabName: string) => {
    const tabLocator = this.iframe.getByRole('tab', { name: tabName });
    await tabLocator.first().waitFor({ state: 'visible', timeout: 10000 });
    return tabLocator;
  }

  async isTabIsDisplayed(tabName: string) {
    const tabLocator = this.iframe.getByRole('tab', { name: tabName });

    await tabLocator.first().waitFor({ state: 'visible', timeout: 10000 });

    await expect(async () =>
      await tabLocator.isVisible({ timeout: 5000 })
    ).toPass({ timeout: 10000 });

    return await tabLocator.isVisible();
  }

  async verifyOnlyAccountTypeDisplayed(type: string) {
    const names = await this.table.getAccountNames();
    return names.every(name => name.includes(type));
  }

  async selectRandomCard() {
    await this.rowSelector.first().waitFor({ state: "visible", timeout: 20000 });
    const accounts = await this.rowSelector.all();
    const min = 1;
    const max = accounts.length - 1;
    const randomAccount = Math.floor(Math.random() * (max - min + 1)) + min;
    await page.waitForTimeout(2000);

    const cardInfo = {
      "Card Name": await Table.getCellValueByHeader("Card Name", randomAccount),
      "Card Number": await Table.getCellValueByHeader("Card Number", randomAccount),
      "Card type": await Table.getCellValueByHeader("Card type", randomAccount),
      "Status": await Table.getCellValueByHeader("Status", randomAccount),
      "Monthly limit": await Table.getCellValueByHeader("Monthly limit", randomAccount),
      "Used limit": await Table.getCellValueByHeader("Used limit", randomAccount),
    }

    await this.rowSelector.nth(randomAccount).click();
    try {
      await page.waitForLoadState("networkidle", { timeout: 240000 });
    } catch (error) { }
  }

  async selectRandomAccountFromOverviewCards() {

    await this.rowSelector.first().waitFor({ state: "visible", timeout: 20000 });
    const accounts = await this.rowSelector.all();
    const min = 1;
    const max = accounts.length - 1;
    const randomAccount = Math.floor(Math.random() * (max - min + 1)) + min;
    await page.waitForTimeout(2000);

    const AccountInfo = {
      "Account name": await Table.getCellValueByHeader("Account name", randomAccount),
      "Account number": await Table.getCellValueByHeader("Account number", randomAccount),
      "Currency": await Table.getCellValueByHeader("Currency", randomAccount),
      "Balance": await Table.getCellValueByHeader("Balance", randomAccount),
      "Available balance": await Table.getCellValueByHeader("Available balance", randomAccount),
    }

    await this.rowSelector.nth(randomAccount).click();
    // try {
    //   await page.waitForLoadState("networkidle", { timeout: 240000 });
    // } catch (error) { }
  }


  randomrowIndex = async (rowSelector: Locator) => {
    await rowSelector.first().waitFor({ state: "visible", timeout: 20000 });
    const accounts = await rowSelector.all();
    const min = 0;//1
    const max = accounts.length - 1;
    const randomAccount = randomInt(min, max + 1);
    await page.waitForTimeout(2000);

    return randomAccount;
  }

  async selectRandomManagedCard() {
    const rowIndex = await this.randomrowIndex(this.rowSelector);

    const cardInfo = {
      "Card Name": await Table.getCellValueByHeader("Card Name", rowIndex),
      "Card Number": await Table.getCellValueByHeader("Card Number", rowIndex),
      "Card type": await Table.getCellValueByHeader("Card type", rowIndex),
      "Status": await Table.getCellValueByHeader("Status", rowIndex),
      "Monthly limit": await Table.getCellValueByHeader("Monthly limit", rowIndex),
      "Used limit": await Table.getCellValueByHeader("Used limit", rowIndex),
    }



    await this.rowSelector.nth(rowIndex).click();
    try {
      await page.waitForLoadState("networkidle", { timeout: 240000 });
    } catch (error) { }

    return { rowIndex, cardInfo }
  }

  getRandomCardDetailsManagedCard = async () => {

    await this.rowSelector.first().waitFor({ state: "visible", timeout: 20000 });
    const rowIndex = await this.randomrowIndex(this.rowSelector);

    const cardInfo = {
      "Card Name": await Table.getCellValueByHeader("Card Name", rowIndex),
      "Card Number": await Table.getCellValueByHeader("Card Number", rowIndex),
      "Card type": await Table.getCellValueByHeader("Card type", rowIndex),
      "Status": await Table.getCellValueByHeader("Status", rowIndex),
      "Monthly limit": await Table.getCellValueByHeader("Monthly limit", rowIndex),
      "Used limit": await Table.getCellValueByHeader("Used limit", rowIndex),
    }


    return { rowIndex, cardInfo };
  }


  async selectFirstCard() {
    await this.rowSelector.first().waitFor({ state: "visible", timeout: 20000 });
    await page.waitForTimeout(2000);
    await this.rowSelector.nth(3).click();


  }
}



