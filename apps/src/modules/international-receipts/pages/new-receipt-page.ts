import { expect, FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import Table from "../../shared/pages/data-table-page";
import { IReceiptsLanding } from "../types/i-ending-receipts-interface";
import TablePage from "../../shared/pages/table";
import { iframeId } from "../../../../config/global-configs";
import { IBOL } from "../../../utilities/utilities/ibol-utilities";

export default class NewReceiptPage {

    iframe: FrameLocator;
    readonly txtEmployeeName: Locator;
    readonly txtGroupName: Locator;
    readonly optGrops: Locator;

    static newReceiptPageHeader = () => { return this.getIframe().locator("//h2[contains(text(),'Receipt details')]") }
    static dateReceived = (randomReceipt) => { return this.getIframe().locator(`(//tr)[${randomReceipt}]//td[1]//span`) }
    static account = (randomReceipt) => { return this.getIframe().locator(`((//tr)[${randomReceipt}]//td[2]//span)[2]`) }
    static remitterName = (randomReceipt) => { return this.getIframe().locator("(//tr)['" + randomReceipt + "']//td[1]//span") }
    static reference = (randomReceipt) => { return this.getIframe().locator("(//tr)['" + randomReceipt + "']//td[4]//span") }
    static expiry = (randomReceipt) => { return this.getIframe().locator("(//tr)['" + randomReceipt + "']//td[5]//span") }
    static amount = (randomReceipt) => { return this.getIframe().locator("(//tr)['" + randomReceipt + "']//td[6]//span") }
    static overviewDetail_ByLabel = (labelText: string) => { return this.getIframe().locator("(//dt[text()='" + labelText + "']/following-sibling::dd//div[@class='clearfix']//span)[1]") }
    static footerBtn = (btnText: string) => { return this.getIframe().locator("//button//span[contains(text(),'" + btnText + "')]") }
    static activeStepper_byNumber = (expectedActiveStepperNumber: number) => { return this.getIframe().locator("//ui-progress-steps-dynamic//span[text()=" + expectedActiveStepperNumber + "]/../../..//div[contains(@class,'active')]") }
    static dropdown_field = (idValue: string) => { return this.getIframe().locator("//input[@id='" + idValue + "']") }
    static dropdown = () => { return this.getIframe().locator("//ngb-typeahead-window") }
    static dropdownItem = (itemName: string) => { return this.getIframe().locator("//ngb-typeahead-window//button//ngb-highlight[text()='" + itemName + "'] | //ngb-typeahead-window//button//ngb-highlight//span[contains(text(),'" + itemName + "')] | //button[contains(text(),'" + itemName + "')]") }
    static ucrField = () => { return this.getIframe().locator("//input[@formcontrolname='UCR']") }
    static successMessage = () => { return this.getIframe().locator("//div[@class='card-body']//p[contains(text(),'Receipt Initiated successfully!')]") }

    // Static method to get the iframe
    private static getIframe(): FrameLocator {
        return page.frameLocator(iframeId);
    }

    static async getRandomReceiptDetailsByRow() {
        const randomReceipt = await Table.getRandomRecordPosition(true);

        console.log("Random receipt row selected:", randomReceipt);

        const actualReceiptDetail: IReceiptsLanding = {
            dateReceived: await this.dateReceived(randomReceipt).first().textContent(),
            account: await this.account(randomReceipt).first().textContent(),
            remitterName: await this.remitterName(randomReceipt).first().textContent(),
            reference: await this.reference(randomReceipt).first().textContent(),
            expiry: await this.expiry(randomReceipt).first().textContent(),
            amount: await this.amount(randomReceipt).first().textContent()
        };
        return {
            recordPosition: randomReceipt,
            receiptDetails: actualReceiptDetail
        };
    }

    static async receiptExpectValuE(targetVlaue: string, receiptFieldName: string) {

        expect(await IBOL.getFieldValue(this.getIframe(), targetVlaue)).not.toBe("-");
        expect(await IBOL.getFieldValue(this.getIframe(), targetVlaue)).not.toBe("");
        expect(await IBOL.getFieldValue(this.getIframe(), targetVlaue)).toEqual(receiptFieldName)

    }

    static async verifyReceiptDetails(receipt: any) {

        await this.receiptExpectValuE('Remitter name', receipt.remitterName);

        let accountValue = await IBOL.getFieldValue(this.getIframe(), 'Amount');
        accountValue = accountValue.replace(/,/g, '');
        expect(accountValue).toContain(receipt.amount.currency + " " + receipt.amount.value)

        const moment = require('moment');
        let receivedDateRaw = await IBOL.getFieldValue(this.getIframe(), 'Date received');
        let receivedDateFormatted = moment(receivedDateRaw, "DD/MM/YYYY h:mm A (\\U\\T\\C + 2)").utc().format("YYYY-MM-DDTHH:mm");

        expect(receivedDateFormatted).toContain(receipt.dateReceived.substring(0, 16));
        await this.receiptExpectValuE('Statement reference', receipt.reference);
        await this.receiptExpectValuE('Receipt ID', receipt.receiptId);
        await this.receiptExpectValuE('GPI UETR', receipt.gpiUetr);
    }


    static async VerifyDataTableRecords(tableRecords, apiData) {
        await tableRecords.forEach((record, index) => {
            expect(record['Account']).toEqual(apiData[index]['account']);
            expect(record['Remitter name']).toEqual(apiData[index]['remitterName']);
            expect(record['Reference']).toEqual(apiData[index]['reference']);
            expect(record['Expiry']).toEqual(apiData[index]['expiry']['TimeLeftValue']);
            expect(record['Amount'].replace(/,/g, '')).toContain((apiData[index]['amount']['currency']) + " " + (apiData[index]['amount']['value']));

        });
    }

    static async SelectTableRecord_ByIndex(index: number) {
        await TablePage.TableRow().nth(index).click();
    }

    static async VerifyReceiptDetailsPageDisplayed() {
        //Verify url points to details page
        await page.waitForTimeout(3000);
        const currentUrl = page.url();
        const expectedUrlSegment = "/international-receipts/details/new-receipt/"
        await expect(currentUrl).toContain(expectedUrlSegment);
        await this.newReceiptPageHeader().isVisible();
    }

    static async VerifyReceiptDetails_PendingInitiation(resultListPageApi: any, detailsPageApiRespose: any) {
        //Store the values displayed on screen
        let status = await this.overviewDetail_ByLabel("Status").first().textContent();
        let receiptID = await this.overviewDetail_ByLabel("Receipt ID").first().textContent();
        let gpi_uetr = await this.overviewDetail_ByLabel("GPI UETR").textContent();
        let receiptType = await this.overviewDetail_ByLabel("Receipt type").first().textContent();

        let remitterType = await this.overviewDetail_ByLabel("Remitter type").first().textContent();
        let accountNumber = await this.overviewDetail_ByLabel("Account number").first().textContent();
        let bankName = await this.overviewDetail_ByLabel("Bank name").first().textContent();
        let swift_bic = await this.overviewDetail_ByLabel("SWIFT BIC").first().textContent();
        let address = await this.overviewDetail_ByLabel("Address").first().textContent();
        let residentialStatus = await this.overviewDetail_ByLabel("Residential status").first().textContent();

        let amount = await this.overviewDetail_ByLabel("Amount").first().textContent();
        let statementReference = await this.overviewDetail_ByLabel("Statement reference").first().textContent();
        let swiftTransactionID = await this.overviewDetail_ByLabel("SWIFT transaction ID ").first().textContent();
        let swiftChargeOption = await this.overviewDetail_ByLabel("SWIFT charge option").first().textContent();
        let originatingCountry = await this.overviewDetail_ByLabel("Originating country").first().textContent();

        let currency = await this.overviewDetail_ByLabel("Currency").first().textContent();
        let name = await this.overviewDetail_ByLabel("Name").first().textContent();
        let number = await this.overviewDetail_ByLabel("Number").first().textContent();

        //Verify details displayed on screen 
        await expect(status).toBe("Pending Initiation");
        await expect(receiptID).toBe(resultListPageApi.receiptId == null || resultListPageApi.receiptId === '' ? "-" : resultListPageApi.receiptId);
        await expect(gpi_uetr).toBe(detailsPageApiRespose.gpiUetr == null || detailsPageApiRespose.gpiUetr === '' ? "-" : detailsPageApiRespose.gpiUetr);
        //await expect(receiptType).toBe("New Receipt");

        // Assuming detailsPageApiRespose is defined and contains the necessary properties

        await NewReceiptPage.assertFieldValue(detailsPageApiRespose.remitterType, remitterType, 'Remitter Type');
        await NewReceiptPage.assertFieldValue(detailsPageApiRespose.remitterAccountNumber, accountNumber, 'Remitter Account Number');
        await NewReceiptPage.assertFieldValue(detailsPageApiRespose.bankName, bankName, 'Bank Name');
        //await NewReceiptPage.assertFieldValue(detailsPageApiRespose.address?.streetAddress1, address, 'Address');
        await NewReceiptPage.assertFieldValue(detailsPageApiRespose.swiftBIC, swift_bic, 'Swift BIC');
        await NewReceiptPage.assertFieldValue(detailsPageApiRespose.remitterResidentialStatus, residentialStatus, 'Remitter Residential Status');

        const amountValue = detailsPageApiRespose.amount ? (detailsPageApiRespose.amount.currency + " " + detailsPageApiRespose.amount.value) : null;
        await NewReceiptPage.assertFieldValue(amountValue, amount.replace(/,/g, ''), 'Amount');

        await NewReceiptPage.assertFieldValue(detailsPageApiRespose.statementReference, statementReference, 'Statement Reference');
        await NewReceiptPage.assertFieldValue(detailsPageApiRespose.swiftTransactionId, swiftTransactionID, 'Swift Transaction ID');
        await NewReceiptPage.assertFieldValue(detailsPageApiRespose.swiftChargeOption, swiftChargeOption, 'Swift Charge Option');
        await NewReceiptPage.assertFieldValue(detailsPageApiRespose.address?.country?.countryName, originatingCountry, 'Originating Country');

        await expect(currency).toContain(detailsPageApiRespose.depositAccount?.currency);
        await NewReceiptPage.assertFieldValue(detailsPageApiRespose.depositAccount?.name, name, 'Deposit Account Name');
        await NewReceiptPage.assertFieldValue(detailsPageApiRespose.depositAccount?.number, number, 'Deposit Account Number');

    }

    static async ClickBottomBtn(btnText: string) {
        await this.footerBtn(btnText).click();
    }

    static async SelectBopCode(bopCode: string) {
        await this.dropdown_field("InternationalReceiptsBopCode").click();
        await this.dropdown().isVisible();
        await this.dropdownItem(bopCode).click();
    }

    static async EnterUniqueConsignmentReference(uniqueConsignmentReference: string) {
        await this.ucrField().fill(uniqueConsignmentReference)
    }

    static async VerifySuccessMessage() {
        await expect(this.successMessage()).toBeVisible();
    }

    static async IsSwiftBicAvailable() {
        const swift_bic = await this.overviewDetail_ByLabel("SWIFT BIC").first().textContent();
        return !!swift_bic; // Convert to boolean and return directly
    }
    static async assertFieldValue(expectedValue: string | null | undefined, actualValue: string, fieldName: string) {
        // Check if the expected value is not null or empty
        if (expectedValue != null && expectedValue !== '') {
            await expect(actualValue).toBe(expectedValue);
        }
    }

}