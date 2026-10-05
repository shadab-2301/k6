import { page, FrameLocator, Locator } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

export default class FBCCDashboard {
    static iframe: FrameLocator;


    constructor() {
        FBCCDashboard.iframe = page.frameLocator(iframeId)
    }

    static async selectFBCCTopMenu(navMune: string, menuOption?: string) {
        await page.locator("//div[@role='menuitem' and .//*[contains(text(),'" + navMune + "')]]").click();
        await page.waitForTimeout(3000)
        await (page.getByRole('link', { name: menuOption })).click();
    }

    // public async selectSideMenu(navMune: string, menuOption: string) {
    //     await page.locator("locator('xpath=//a[normalize-space()=\'My approvals\']')").click();
    //     // await (this.page.getByRole('link', { name: menuOption })).click();
    // }

    //a[normalize-space()='My approvals']
}
