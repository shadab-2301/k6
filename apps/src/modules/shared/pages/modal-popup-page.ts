import { page, FrameLocator, Locator } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";


export default class Modal {
    static iframe: FrameLocator;
    static modalHeader: Locator;
    static modalBody: Locator;

    constructor() {
        Modal.iframe = page.frameLocator(iframeId);
        Modal.modalHeader = Modal.iframe.locator(".modal-header")
        Modal.modalBody = Modal.iframe.locator("//div[@class='modal-body']//div")
    }

    static async getModalConfirmationButton() {
        return Modal.iframe.locator("//div[@class='modal-content']//*[self::button or self::span][contains(text(), 'Confirm decline')]");

    }
}