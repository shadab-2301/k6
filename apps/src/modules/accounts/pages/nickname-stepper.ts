import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import ApolloDashboardPage2 from "../../shared/pages/apollo-dashboard-page-2";
import Table from "../../shared/pages/data-table-page";
import { iframeId } from "../../../../config/global-configs";


export default class NickNameStepper {
    iframe: FrameLocator;
    txtNickname: Locator;

    constructor() {
        this.iframe = page.frameLocator(iframeId);
        this.txtNickname = this.iframe.locator("//input");
    }
}