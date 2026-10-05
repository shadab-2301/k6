import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import ApolloDashboardPage2 from "../../shared/pages/apollo-dashboard-page-2";
import Table from "../../shared/pages/data-table-page";
import { hyPhenateString } from "../../../../helper/string-manipulation";
import { IAccountsList } from "../types/i-account-list-interface";
import APIInterceptor from "../../../../helper/api-interceptor";
import { iframeId } from "../../../../config/global-configs";


export default class AccountsOverviewPage {
    iframe: FrameLocator;
    lblAllAccounts: Locator;
    lblTransactionalAccounts: Locator;
    lblCallAccounts: Locator;
    appoDashboard: ApolloDashboardPage2;
    btnFilter: Locator;
    ddlSort: Locator;
    ddlDownload: Locator;


    constructor() {
        this.iframe = page.frameLocator(iframeId);
        this.btnFilter = this.iframe.locator(`(//span[contains(.,'Filter')]//parent::button)[2]`)
        this.ddlSort = this.iframe.locator(`//span[contains(.,'Sort by')]//parent::button`)
        this.ddlDownload = this.iframe.locator(`//span[contains(.,'Download')]//parent::button`)
        this.appoDashboard = new ApolloDashboardPage2();
        new Table();
    }

    async getAccountsTabByType(accountType: string) {
        return this.iframe.locator(`//a[@id='nav-link-overview-${hyPhenateString(accountType)}']`)
    }

    private async navigateToOverview() {
        await this.appoDashboard.getTopMenu('Overview');
    }

    async getTransactionalAccountsCount() {
        await this.navigateToOverview()
        const transactionalAccountsLabel = await this.appoDashboard.getSubNavigationMenu('Transactional');
        return this.appoDashboard.getRecordsCount(transactionalAccountsLabel);
    }

    async getCallAccountsCount() {
        await this.navigateToOverview()
        const callAccountsLabel = await this.appoDashboard.getSubNavigationMenu('Call Accounts');
        return this.appoDashboard.getRecordsCount(callAccountsLabel);
    }

    async getTotalAccounts() {
        await this.navigateToOverview()
        const allAccountsLabel = await this.appoDashboard.getSubNavigationMenu('all');
        return this.appoDashboard.getRecordsCount(allAccountsLabel);
    }

    async isNoRecordsText() {
        return await this.iframe.getByText('No records found').isVisible()
    }

    async verifyTotalAccounts() {

        //Get matching numbers from the labels. E.g. All (10 of 10)
        const totalAccountsTotal = await this.getTotalAccounts();
        const transactionlAccountsTotal = await this.getTransactionalAccountsCount();
        const callAccountsTotal = await this.getCallAccountsCount();

        //Getting the last number in the possible matching numbers
        const totalAccounts = totalAccountsTotal[totalAccountsTotal.length - 1];
        const totalTransactionalAccounts = transactionlAccountsTotal[transactionlAccountsTotal.length - 1]
        const totalCallAccounts = callAccountsTotal[callAccountsTotal.length - 1]

        expect(Number(totalAccounts)).toEqual(Number(totalTransactionalAccounts) + Number(totalCallAccounts))
    }
    async getCurrencyFilter(currency: string) {
        return this.iframe.locator(`//investec-online-filter-val//button//span[contains(.,'${currency}')]`)
    }

    async getAccountRecordByAccountType(accountType: string) {
        return Table.iframe.locator("//td[contains(text(),'" + accountType + "')]//parent::tr//td[2]").allTextContents();
    }

    async getTransactionalAccountNumbers() {
        return Table.iframe.locator("//td[contains(text(),'Investec')]//parent::tr//td[2]").allTextContents();
    }

    async getAccountNumbers() {
        return Table.iframe.locator("//tr//td[2]").allTextContents();
    }

    async getAccountNames() {
        await Table.iframe.locator("//tr//td[1]").first().waitFor();
        return Table.iframe.locator("//tr//td[1]").allTextContents();
    }

    async getAccountTypes() {
        return Table.iframe.locator("//tr//td[3]").allTextContents();
    }

    async getAccountCurrencies() {
        return Table.iframe.locator("//tr//td[4]").allTextContents();
    }

    async getAccountBalance() {
        return Table.iframe.locator("//tr//td[5]").allTextContents();
    }

    async getAccountAvailableBalance() {
        return Table.iframe.locator("//tr//td[6]").allTextContents();
    }

    async VerifyMatchingAccounts() {
        await this.navigateToOverview();
        await page.waitForTimeout(2000)
        const transactionalAccountsNumbersInAll = await this.getAccountRecordByAccountType("Transactional");
        const callAccountsNumbersInAll = await this.getAccountRecordByAccountType("Call");


        await (await this.appoDashboard.getSubNavigationMenu("Transactional")).click();
        await page.waitForTimeout(2000)
        expect(transactionalAccountsNumbersInAll).toEqual(await this.getAccountNumbers());

        await (await this.appoDashboard.getSubNavigationMenu("Call Accounts")).click();
        await page.waitForTimeout(2000)
        expect(callAccountsNumbersInAll).toEqual(await this.getAccountNumbers())
    }



    async getTotalInAllAccounts(locator: Locator, timeout?: number) {
        let waitTime: number;
        if (timeout) {
            waitTime = timeout
        } else {
            waitTime = 3000
        }
        const startTime = Date.now();

        // Wait for a few seconds before checking the value
        await new Promise(resolve => setTimeout(resolve, waitTime));

        // Get the total accounts
        const totalInAllAccounts = locator.all();

        // Return the total or default to 0
        return (await totalInAllAccounts).length > 0 ? (await totalInAllAccounts).length : 0; // Return total or 0 if empty
    }
    async verifyAccountType(accountType: string) {
        await page.waitForTimeout(5000);

        const accounts = await APIInterceptor.getInterceptedAPIResponse() as IAccountsList;
        const areAllAccountsCards = accounts.data.every(account => account.AccountType === accountType);
        expect(areAllAccountsCards).toBeTruthy();
    }

    async getTableCount() {
        const tableData = this.iframe.locator('tbody tr td');
        await tableData.first().waitFor({ state: "attached", timeout: 10000 })
        return tableData.count()
    }



}