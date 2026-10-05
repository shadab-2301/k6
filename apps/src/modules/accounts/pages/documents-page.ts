import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import ApolloDashboardPage2 from "../../shared/pages/apollo-dashboard-page-2";
import Table from "../../shared/pages/data-table-page";
import { iframeId } from "../../../../config/global-configs";


export default class DocumentsPage {
    iframe: FrameLocator;
    ddlAccountSearch: Locator;
    tableDocumentsDetails: Locator;

    constructor() {
        this.iframe = page.frameLocator(iframeId);
        this.ddlAccountSearch = this.iframe.locator("//investec-online-documents//input[@id='dropdown-typeahead']");
        this.tableDocumentsDetails = this.iframe.locator("investec-online-documents");
        new Table();
    }
}