import { FrameLocator, Locator, page, expect } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../../config/global-configs";
import { IBOL } from "../../../../utilities/utilities/ibol-utilities";
import Table from "../../../shared/pages/data-table-page";
import { BatchFileSummary, BatchPaymentRecord } from "../../interfaces/BatchPayment";

/**
 * Page object for the Batch Payments screen (Payments > Batch).
 *
 * BLUEPRINT NOTE: this is scaffolded to match the conventions used by the
 * other payment page objects (see MultiPaymentPage / DomesticPaymentsPage),
 * but the underlying screen does not exist yet in this suite. Locators below
 * are best-guess placeholders based on naming patterns used elsewhere in the
 * app (e.g. "#debitAccount", "input[type='file']", "Payments total: R"), and
 * should be verified/corrected against the real screen before these tests are
 * run for the first time.
 */
export default class BatchPaymentsPage {

    iframe: FrameLocator;

    // Upload section
    fileInput: Locator;
    uploadStatusText: Locator;
    uploadErrorMessage: Locator;
    removeFileButton: Locator;

    // Parsed batch summary (rendered after a file has finished processing)
    batchReferenceField: Locator;
    debitAccount: Locator;
    totalPaymentsCount: Locator;
    totalAmountText: Locator;

    // Actions
    submitButton: Locator;

    constructor() {
        this.iframe = page.frameLocator(iframeId);

        this.fileInput = this.iframe.locator("input[type='file']");
        this.uploadStatusText = this.iframe.getByText("100% uploaded");
        this.uploadErrorMessage = this.iframe.locator("#batchFileError, .file-upload-error");
        this.removeFileButton = this.iframe.getByRole('button', { name: 'Remove' });

        this.batchReferenceField = this.iframe.locator("#batchReference");
        this.debitAccount = this.iframe.locator("#debitAccount");
        this.totalPaymentsCount = this.iframe.getByText(/\d+\s+payments?/i);
        this.totalAmountText = this.iframe.getByText(/Payments total: R/);

        this.submitButton = this.iframe.getByRole('button', { name: 'Submit' });
    }

    async searchAndSelectDebitAccount(searchText: string) {
        await IBOL.click(this.debitAccount, "Debit Account dropdown");
        const option = this.iframe.getByRole('option', { name: new RegExp(`${searchText}`, 'i') }).nth(0);
        await option.waitFor({ state: 'visible' });
        await IBOL.click(option, `${searchText} option`);
    }

    /**
     * Uploads the given batch payment XML file and waits for it to finish
     * processing (i.e. for the parsed summary/review grid to render).
     */
    async uploadBatchFile(filePath: string) {
        await this.fileInput.setInputFiles([filePath]);
        await this.uploadStatusText.first().waitFor({ state: 'visible', timeout: 30000 });
        await IBOL.waitForLoadingSpinnerToDisappear(this.iframe);
        await Table.verifyTableIsDisplayed();
    }

    async getUploadErrorMessage(): Promise<string> {
        return (await this.uploadErrorMessage.textContent())?.trim() ?? "";
    }

    /**
     * Reads the batch summary (total payments / total amount) rendered by the
     * UI once the uploaded file has been parsed.
     */
    async getParsedBatchSummary(): Promise<{ totalPayments: number; totalAmount: string }> {
        const countText = await this.totalPaymentsCount.first().textContent() ?? "";
        const totalPayments = parseInt(countText.match(/\d+/)?.[0] ?? "0", 10);

        const amountText = await this.totalAmountText.first().textContent() ?? "";
        const totalAmount = IBOL.formatAmount(amountText.replace(/Payments total:\s*/i, ""));

        return { totalPayments, totalAmount };
    }

    /**
     * Reads every row from the batch review grid, mapping each to a
     * BatchPaymentRecord so it can be compared against the file that was
     * uploaded.
     */
    async getReviewGridRecords(): Promise<BatchPaymentRecord[]> {
        const rows = await Table.getTableRows();
        const rowCount = await rows.count();
        const records: BatchPaymentRecord[] = [];

        for (let i = 0; i < rowCount; i++) {
            records.push({
                rowNumber: i,
                beneficiaryName: await Table.getCellValueByHeader("Beneficiary", i),
                beneficiaryReference: await Table.getCellValueByHeader("Reference", i),
                amount: IBOL.formatAmount(await Table.getCellValueByHeader("Amount", i)),
                paymentDate: await Table.getCellValueByHeader("Payment date", i),
                paymentMethod: await Table.getCellValueByHeader("Payment method", i),
            } as BatchPaymentRecord);
        }

        return records;
    }

    /**
     * Asserts the parsed summary and review grid rendered by the UI match the
     * batch file that was uploaded (row count, total amount, and the details
     * of every individual payment - beneficiary, amount, reference, date).
     */
    async verifyBatchMatchesUploadedFile(expected: BatchFileSummary) {
        const summary = await this.getParsedBatchSummary();
        expect(summary.totalPayments).toBe(expected.totalPayments);

        const expectedTotal = IBOL.formatAmount(expected.totalAmount);
        expect(summary.totalAmount).toBe(expectedTotal);

        const actualRecords = await this.getReviewGridRecords();
        expect(actualRecords).toHaveLength(expected.records.length);

        for (const expectedRecord of expected.records) {
            const actualRecord = actualRecords[expectedRecord.rowNumber];
            expect(actualRecord.beneficiaryName).toBe(expectedRecord.beneficiaryName);
            expect(actualRecord.beneficiaryReference).toBe(expectedRecord.beneficiaryReference);
            expect(actualRecord.amount).toBe(IBOL.formatAmount(expectedRecord.amount));
            expect(actualRecord.paymentDate).toBe(expectedRecord.paymentDate);
        }
    }

    /**
     * Submits the batch for approval, intercepting the same approval-ids
     * endpoint used by the other payment types (see DomesticPaymentsPage.clickSubmitButton).
     */
    async submitBatch(buttonToClick: string = "Submit"): Promise<any> {
        const submitBtn = this.iframe.getByRole('button', { name: buttonToClick }).first();
        return IBOL.clickAndInterceptResponse(submitBtn, '/api/v1/authorisation/approval-ids');
    }

    /**
     * After submission, the confirmation/summary grid is expected to display a
     * generated Payment ID (and status) per row - mirrors
     * MultiPaymentPage.verifyGroupPaymentDetailsForRecords. Populates each
     * record in place so later steps can look transactions up by Payment ID.
     */
    async captureSubmittedPaymentIds(records: BatchPaymentRecord[]) {
        await Table.verifyTableIsDisplayed();

        for (let i = 0; i < records.length; i++) {
            records[i].paymentID = await Table.getCellValueByHeader("Payment ID", i);
            records[i].status = await Table.getCellValueByHeader("Status", i);
        }
    }
}
