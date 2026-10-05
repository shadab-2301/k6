import { page, FrameLocator, Locator } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

export default class Navigation {
    static iframe: FrameLocator;


    constructor() {

        Navigation.iframe = page.frameLocator(iframeId);
    }

    static async getProceedButton() {
        return Navigation.iframe.locator("//*[self::button or self::span][contains(@class, 'primary')]");
    }

    static async getNavigationButton(buttonName: string) {
        // if (await Navigation.iframe.locator("//button[@aria-label='Close']").isVisible()) {
        //     await Navigation.iframe.locator("//button[@aria-label='Close']").click();
        // }
        // const button = Navigation.iframe.locator("//*[self::button or self::span][contains(text(), '" + buttonName + "') and not(contains(text(), 'failed')) or not(contains(text(), 'successful')) or not(contains(text(), 'validation complete'))]");
        const button = Navigation.iframe.locator(`//*[self::button or self::span][contains(text(), '${buttonName}') and not(contains(text(), 'failed')) and not(contains(text(), 'successful')) and not(contains(text(), 'with submission'))]`);
        await button.waitFor({ timeout: 10000 })
        return button;

    }

    static getCancelButton(buttonName: string) {
        return Navigation.iframe.locator("//*[self::button or self::span][contains(text(), 'Cancel')]");
    }

}
