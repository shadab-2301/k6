
import { FrameLocator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

export default class ApolloModal {

    static iframe: FrameLocator;

    constructor() {
        ApolloModal.iframe = page.frameLocator(iframeId);
    }

    //Locator for modal heading
    static getModalHeading() {
        return ApolloModal.iframe.locator("//*[@class='modal-title']");
    }

    //Locator for main message that is displayed to the user
    static getModalMainMessage() {
        return ApolloModal.iframe.locator("//div[@class='modal-body']//p");
    }

    //Locator for modal decline action such as "Yes"
    static getModalActionConfirmationButton(button: string) {
        return ApolloModal.iframe.locator("//div[contains(@class,'modal-footer')]//*[self::button or self::span][contains(text(), '" + button + "')]");
    }
    //Locator for modal decline action such as "Yes"
    static getModalActionButton(button: string) {
        return ApolloModal.iframe.locator("//div[contains(@class,'modal-footer')]//*[self::button or self::span][contains(text(), '" + button + "')]");
    }

    //Locator for modal decline action such as "No"
    static getModalActionDeclineButton(button: string) {
        return ApolloModal.iframe.locator("//div[contains(@class,'modal-footer')]//*[self::button or self::span][contains(text(), '" + button + "')]");
    }
}

