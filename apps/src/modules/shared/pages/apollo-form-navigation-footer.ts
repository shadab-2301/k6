import { FrameLocator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

export default class ApolloFormNavigation {
    static iframe: FrameLocator;
    private static topMenu: string;

    constructor() {
        ApolloFormNavigation.iframe = page.frameLocator(iframeId);
    }

    static async getProceedButton() {
        return ApolloFormNavigation.iframe.locator("//*[self::button or self::span][contains(@class, 'primary')]");
    }

    static async getNavigationButton(buttonName: string) {
        return ApolloFormNavigation.iframe.locator("//*[self::button or self::span][contains(text(), '" + buttonName + "')]");
    }

    static getCancelButton(buttonName: string) {
        return ApolloFormNavigation.iframe.locator("//*[self::button or self::span][contains(text(), 'Cancel')]");
    }


}