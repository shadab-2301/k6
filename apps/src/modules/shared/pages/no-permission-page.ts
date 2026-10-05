import { FrameLocator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

export default class NoPermissionPage {
    static iframe: FrameLocator;

    constructor() {
        NoPermissionPage.iframe = page.frameLocator(iframeId); // Accessing static member
    }

    static async getPageTitle() {
        return await NoPermissionPage.iframe.locator("//h1[not(@class='d-block')]").textContent();
    }

    static async getPageSubTitle() {
        return await NoPermissionPage.iframe.locator("//p").textContent();
    }
}