import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import ApolloDashboardPage2 from "../../shared/pages/apollo-dashboard-page-2";
import Table from "../../shared/pages/data-table-page";
import { hyPhenateString } from "../../../../helper/string-manipulation";
import RestHelper from "../../../../helper/rest-helper";
import { IAccountsList } from "../types/i-account-list-interface";
import { iframeId } from "../../../../config/global-configs";


export default class AccountsTablePage {
    iframe: FrameLocator;

    constructor() {
        this.iframe = page.frameLocator(iframeId);
        new Table();
    }

    async getAccountNames() {
        return await this.iframe.locator(`//td[1]`).allInnerTexts();
    }

    async getAccountNumbers() {
        return await this.iframe.locator(`//td[2]`).allInnerTexts()
    }

    async getAccountTypes() {
        return await this.iframe.locator(`//td[3]`).allInnerTexts()
    }

    async getAccountCurrency() {
        return await this.iframe.locator(`//td[4]`).allInnerTexts()
    }

    async getAccountBalance() {
        return await this.iframe.locator(`//td[5]`).allInnerTexts()
    }

    async getAccountAvailableBalance() {
        return await this.iframe.locator(`//td[6]`).allInnerTexts()
    }
}