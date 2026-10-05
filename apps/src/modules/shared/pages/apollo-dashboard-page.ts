import { FrameLocator, page } from "playwright-with-cucumber-checks";
import { hyPhenateString } from "../../../../helper/string-manipulation";
import { iframeId } from "../../../../config/global-configs";

export default class ApolloDashboardPage {
    static iframe: FrameLocator;
    private static topMenu: string;

    constructor() {
        ApolloDashboardPage.iframe = page.frameLocator(iframeId);
    }

    static async getTopMenu(module: string) {
        ApolloDashboardPage.topMenu = hyPhenateString(module);
        return ApolloDashboardPage.iframe.locator(`//a[@id='nav-item-${ApolloDashboardPage.topMenu}']`)
    }

    static async logout() {
        await page.locator("#loginLogoutButton").click();
    }

    static async clickLeftHandMenu(menu: string) {
        return await ApolloDashboardPage.iframe.locator("//a[contains(text(), '" + menu + "')]").click({ timeout: 60000 })
    }

    static async getSubNavigationMenu(subNavigationMenu: string) {
        return ApolloDashboardPage.iframe.locator(`//a[@id='nav-link-${ApolloDashboardPage.topMenu}-${hyPhenateString(subNavigationMenu)}']`)
    }

    static async getNavigationButton(buttonName: string) {
        return ApolloDashboardPage.iframe.locator("//*[self::button or self::span][contains(text(), '" + buttonName + "')]");
    }

    static async getTab(tab: string) {
        return ApolloDashboardPage.iframe.locator("//a[@role='tab' and contains(.,'" + tab + "')]")
    }


}