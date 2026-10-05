import { page, FrameLocator, Locator } from "playwright-with-cucumber-checks";
import FBCCDashboard from "./fbcc-dashboard-page";
import { hyPhenateString } from "../../../../helper/string-manipulation";
import { iframeId } from "../../../../config/global-configs";
import { getEnvironmentTier } from "../../../../helper/environment-handler";


export default class ApolloDashboard {
    static iframe: FrameLocator;

    constructor() {
        ApolloDashboard.iframe = page.frameLocator(iframeId)
    }

    static async selectFBCCTopMenu(navMune: string, menuOption?: string) {
        await page.locator("//div[@role='menuitem' and .//*[contains(text(),'" + navMune + "')]]").click();
        await (page.getByRole('link', { name: menuOption })).click();
    }

    static async getSelectedProfile() {
        const profileLocator = await ApolloDashboard.iframe.locator("//investec-online-profile-switcher//input");
        await profileLocator.waitFor({ state: "visible", timeout: 10000 });
        const selectedProfileLocator = await profileLocator.count();
        // await selectedProfileLocator.waitFor();
        // return await ApolloDashboard.ddlProfileSelector.count();
    }

    static async selectProfile(profile: string) {
        return ApolloDashboard.iframe.locator("//ngb-highlight[contains(text(),'" + profile + "')]").click();
    }

    static async navigateToDomesticBeneficiary(module: string, action?: string) {
        if (getEnvironmentTier() === "STG") {
            FBCCDashboard.selectFBCCTopMenu(module, action)
        } else {
            await ApolloDashboard.clickSideNavMenu(module);
        }
    }

    static async logout() {
        await page.locator("a#loginLogoutButton").click();
    }

    //Get apollo side navigation by passing the left hand menu
    static async clickSideNavMenu(menu: string) {
        await ApolloDashboard.iframe.locator(" //a[contains(text(), '" + menu + "')]").click()
    }

    //Get navigation menu by passing the menu on the feature file
    static async getTopMenu(module: string) {
        return ApolloDashboard.iframe.locator(`//a[@id='nav-item-${hyPhenateString(module)}']`)
    }
}
