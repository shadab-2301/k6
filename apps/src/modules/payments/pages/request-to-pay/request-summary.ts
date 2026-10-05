import { iframeId } from "../../../../../config/global-configs";
import RTPReceiptVerifyPage from "./request-verify-page";
import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";

export default class RTPReceiptSummary {

    iframe: FrameLocator;
    public readonly status: Locator;
    public receiptVerifyPage: RTPReceiptVerifyPage

    constructor() {
        this.iframe = page.frameLocator(iframeId);
        this.status = this.iframe.locator("//h6[contains(@class, 'card-title')]")
        this.receiptVerifyPage = new RTPReceiptVerifyPage();
    }
}

