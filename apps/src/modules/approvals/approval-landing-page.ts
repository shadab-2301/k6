import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../config/global-configs";

export default class MyApprovalLanding {

    iframe: FrameLocator;
    readonly chkSelectAll: Locator;

    constructor() {
        this.iframe = page.frameLocator(iframeId);
        this.chkSelectAll = this.iframe.locator("//input[@id='isSelectAll']//parent::div") // to clean up
    }

}