import { FrameLocator, Locator, page, } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";
import table from "./table";

export default class Table {

    static iframe: FrameLocator;


    constructor() {
        Table.iframe = page.frameLocator(iframeId);
    }

    static async verifyTableIsDisplayed() {
        await page.frameLocator(iframeId).locator('//table').waitFor({ state: 'visible', timeout: 250000 });
    }

    static async getTableRows() {
        if (!page || (page as any).isClosed && (page as any).isClosed()) {
            throw new Error("Cannot get table rows: page is closed");
        }
        const tableRows = Table.iframe.locator("//table//tbody//tr");
        await tableRows.first().waitFor({ state: 'visible', timeout: 60000 });
        return tableRows;
    }

    static async getTableCheckBoxes() {
        const tableRowsCheckboxes = Table.iframe.locator("//table//tbody//tr").locator("//ui-single-checkbox//*[name()='svg']");
        return tableRowsCheckboxes;
    }

    static async checkTableRowsCheckBoxe(index: number = 0) {
        await (await this.getTableCheckBoxes()).nth(index).check({ timeout: 20000 });

    }

    static async getRightChevrons() {
        return Table.iframe.locator("[name='chevron-right']")
    }

    static async clickRightChevronByIndex(index: number = 0) {
        const chevrons = await this.getRightChevrons();
        await chevrons.nth(index).click({ timeout: 20000 });
    }

    //Locator for modal heading
    static async getTableRecordByReference(reference: string | undefined | null) {
        return Table.iframe.locator("//span[contains(text(),'" + reference + "')]//parent::td//preceding-sibling::td//div[contains(@class,'checkbox')]");
    }




    //Locator for modal heading
    static async getTableRecordField(reference: string | undefined | null) {
        return Table.iframe.locator("//td[contains(text(),'Transactional')]//parent::tr");
    }
    //Locator for modal heading
    static async getAllRecordsCheckbox() {
        return Table.iframe.locator("//th//input[@id='isSelectAll']");
    }

    //Locator for modal heading
    static searchRecord() {
        return Table.iframe.locator("//input[@formcontrolname='GlobalName']").first();
    }

    //Get random table record
    static async getRandomRecordPosition(skipHeadings?: true) {
        const totalRows = await page.frameLocator(iframeId).locator("//tbody//tr").count();

        const randomRecordPosition = Math.floor(Math.random() * totalRows) + 1;

        return randomRecordPosition;
    }

    //Get random table record
    static async getTableRecordByPosition(position?: number) {
        const totalRows = await page.frameLocator(iframeId).locator("//tbody//tr").count();
        const randomRecordPosition = Math.floor(Math.random() * (totalRows - 1)) + 2
        return randomRecordPosition;
    }

    static async selectAllTableRecords() {
        await (await this.getAllcheckbox()).check({ timeout: 20000 });
    }

    static async getAllcheckbox() {
        return await Table.iframe.locator('th [for="isSelectAll"]');
    }
    static emailButtonLocator() {
        return Table.iframe.locator('//button[contains(.,"Email")]');
    }

    static emailModelLocator() {
        return Table.iframe.locator('[data-testid="email-modal"], [role="dialog"], .email-modal');
    }

    static async isEmailButtonEnabled() {
        await (await Table.emailButtonLocator()).waitFor({ state: 'visible', timeout: 10000 });
        return await Table.emailButtonLocator().isEnabled();
    }

    static async clickEmailButton() {
        if (!(await (await Table.emailButtonLocator()).isEnabled())) {
            throw new Error('Email button is not enabled');
        }
        return await (await Table.emailButtonLocator()).click();
    }

    static getEmailModal(): Locator {
        return this.iframe.locator('[data-testid="email-modal"], [role="dialog"], .email-modal');
    }

    static emailInput(): Locator {
        return this.getEmailModal().locator('input[placeholder="yourname@domain.com"]');
    }

    static async ensureEmailModalVisible() {
        await this.getEmailModal().waitFor({ state: 'visible', timeout: 10000 });
    }

    static async ensureEmailInputVisible() {
        await this.emailInput().waitFor({ state: 'visible', timeout: 10000 });
    }

    static async getPlaceholderText() {
        await this.emailInput().waitFor({ state: 'visible', timeout: 10000 });
        return await this.emailInput().getAttribute('placeholder')
    }

    static sendButton(): Locator {
        return this.getEmailModal().locator('button:has-text("Send")');
    }

    static async isDataAvailableInTable(nodatamsg: string = "No results") {
        const tableLocator = this.iframe.getByText(nodatamsg);
        await tableLocator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => { return false });
        return tableLocator.isVisible({ timeout: 10000 });
    }

    static async getAllColumnValues_ByIndex(index: number) {
        // Get all rows from the table
        const rows = await page.frameLocator(iframeId).locator('//table//tbody//tr');

        // Extract values from the specified column
        const columnValues = [];
        const rowCount = await rows.count();

        for (let i = 0; i < rowCount; i++) {
            const cellValue = await rows.nth(i).locator(`td:nth-child(${index + 1})`).innerText();
            columnValues.push(cellValue);
        }

        return columnValues;
    }

    static async getColumnIndexByHeaderText(expectedHeaderText: string) {


        let headers = await page.frameLocator(iframeId).locator(`//thead//th`);
        await headers.first().waitFor({ state: 'visible', timeout: 10000 });

        let headerDescriptions = await headers.allInnerTexts();

        let targetindex;

        if (expectedHeaderText === "Payment ID" || expectedHeaderText === "Transfer ID") {

            await page.waitForTimeout(3000);
            await headers.first().waitFor({ state: 'visible', timeout: 10000 });
            headerDescriptions = await headers.allInnerTexts();

            let isProductIdVisble = true;
            const paymentID = await headers.filter({ hasText: "Payment ID" }).first();//.waitFor({ state: 'visible', timeout: 3000 }).catch(async () => { isProductIdVisble = false });

            await paymentID.waitFor({ state: 'visible', timeout: 3000 }).catch(async () => { isProductIdVisble = false });
            isProductIdVisble = await paymentID.isVisible();

            if (!isProductIdVisble) {
                isProductIdVisble = true;
                const transferID = await headers.filter({ hasText: "Transfer ID" }).first();
                await transferID.waitFor({ state: 'visible', timeout: 3000 }).catch(async () => { isProductIdVisble = false });
                isProductIdVisble = await transferID.isVisible();
            }

            if (!isProductIdVisble) {
                return -1;
            }


            if (headerDescriptions.includes("Payment ID") || headerDescriptions.includes("Transfer ID")) {
                expectedHeaderText = headerDescriptions.includes("Payment ID") ? "Payment ID" : "Transfer ID";
            } else {
                return -1;
            }

        }

        try {
            await headers.filter({ hasText: expectedHeaderText }).first().waitFor({ state: 'visible', timeout: 5000 });
            targetindex = (await headers.allInnerTexts()).findIndex(text => text.trim() === expectedHeaderText);

            return targetindex;
        } catch (error) {
            console.log(`❌ Header not found: ${expectedHeaderText}`);
        }

    }

    static async getColumnIndexByHeaderText1(expectedHeaderText: string) {
        const headers = page.frameLocator(iframeId).locator('//thead//th');
        await headers.first().waitFor({ state: 'visible', timeout: 10000 });

        let headerDescriptions = (await headers.allInnerTexts()).map(h => h.trim());

        if (["Payment ID", "Transfer ID"].includes(expectedHeaderText)) {
            if (headerDescriptions.includes("Payment ID") || headerDescriptions.includes("Transfer ID")) {
                expectedHeaderText = headerDescriptions.includes("Payment ID") ? "Payment ID" : "Transfer ID";
            } else {
                console.warn(`Header not found: ${expectedHeaderText}`);
                return -1;
            }
        }

        await headers.filter({ hasText: expectedHeaderText }).first().waitFor({ state: 'visible', timeout: 5000 });

        const targetIndex = headerDescriptions.findIndex(text => text.toLowerCase() === expectedHeaderText.toLowerCase());
        if (targetIndex === -1) {
            console.warn(`Header not found: ${expectedHeaderText}`);
        }
        return targetIndex;
    }



    // static async getCellValueByHeader(headername: string, rownumber: number = 0) {
    //     let index = await this.getColumnIndexByHeaderText(headername);
    //     if (index === -1) {
    //         return "-"
    //     }
    //     let tableRows = await this.getTableRows();
    //     const value = (await tableRows).nth(rownumber).locator("//td").nth(index)

    //     return await value.textContent({ timeout: 2000 });

    // }

    static async getCellValueByHeader(headername: string, rownumber: number = 0) {
        const index = await this.getColumnIndexByHeaderText(headername);
        if (index === -1) return "-";

        const tableRows = await this.getTableRows();
        const row = tableRows.nth(rownumber);
        await row.waitFor({ state: 'visible', timeout: 5000 });

        const cell = row.locator(`td`).nth(index);
        await cell.waitFor({ state: 'visible', timeout: 5000 });

        const value = await cell.textContent();
        return value ?? "-";
    }

    static async getCellValuesByHeader(headername: string) {
        let index = await this.getColumnIndexByHeaderText(headername);
        let tableRows = await this.getTableRows();

        let rowcount = await tableRows.count();
        let rownum = 0;
        let record = [];
        while (rowcount > 0) {
            const value = (await tableRows).nth(rownum).locator("//td").nth(index)
            record = record.push[await value.textContent()];
            rownum++;
            rowcount--;
        }
        return record;
    }


}

