import { Payment } from "./Payment";

/**
 * A single payment row parsed out of an uploaded batch payment XML file.
 * Extends the shared Payment interface so batch rows can reuse the same
 * verification helpers (e.g. DomesticPaymentsPage.verifyPaymentTab) as other
 * payment types once they reflect on the Payments/Transfers dashboard.
 */
export interface BatchPaymentRecord extends Payment {
    rowNumber: number;
}

/**
 * Metadata + parsed rows for a batch payment XML file.
 * Used both to:
 *  - build a valid file for upload (BatchFileHelper.buildValidBatchXmlFile)
 *  - compute the expected totals/rows to assert against the UI after the
 *    file has been uploaded and processed, and again after submission.
 *
 * NOTE: field names below reflect an assumed/placeholder batch file schema
 * (see apps/helper/batch-file-helper.ts). Update both once the real sample
 * XML / schema is provided.
 */
export interface BatchFileSummary {
    fileName: string;
    batchReference?: string;
    debitAccount: string;
    totalPayments: number;
    totalAmount: string;
    records: BatchPaymentRecord[];
}
