import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import { IAccountOverview } from "../types/account-overview-interface";
import AccountsTablePage from "./account-table-page";
import { iframeId } from "../../../../config/global-configs";


export default class DocumentsLandingPage {
    iframe: FrameLocator;
    ddlAccountTypeSelector: Locator;
    txtAccountSearch: Locator;
    tableDocumentsDetails: Locator;
    lblNumberOfAccounts: Locator;
    tblAccountDetails: AccountsTablePage;

    constructor() {
        this.iframe = page.frameLocator(iframeId);
        this.ddlAccountTypeSelector = this.iframe.locator("//investec-online-documents//input[@id='dropdown-typeahead']");
        this.tableDocumentsDetails = this.iframe.locator("investec-online-documents");
        this.txtAccountSearch = this.iframe.locator(`//input[@placeholder='Search for an account']`)
        this.lblNumberOfAccounts = this.iframe.locator("//investec-online-result-box//h5");
    }

    async isDropDownExpanded() {
        await page.waitForTimeout(3000)
        const texts = this.iframe.locator("button[role = 'option']").allTextContents();
        return (await texts).length > 1;
    }

    async getAccountDetails(): Promise<IAccountOverview[]> {
        this.tblAccountDetails = new AccountsTablePage();
        let accountNames = await this.tblAccountDetails.getAccountNames();
        let accountNumbers = await this.tblAccountDetails.getAccountNumbers();
        let accountTypeSortOrder = await this.tblAccountDetails.getAccountTypes();

        const accountOverviewList: IAccountOverview[] = accountNames.map((name, index) => ({
            accountName: name,
            accountNumber: accountNumbers[index],
            accountType: accountTypeSortOrder[index]
        }));

        return accountOverviewList;
    }
}