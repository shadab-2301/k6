import * as fs from "fs";
import * as path from "path";

const ROOT_DIR = path.resolve(process.cwd());
const BATCH_UPLOAD_DIR = path.join(ROOT_DIR, "BatchPerfuploaded");
const LAST_UPLOADED_FILE_PATH = path.join(BATCH_UPLOAD_DIR, "last-uploaded-batch.json");

/**
 * Runtime Test Data Store
 * 
 * This module stores data that is generated/captured during test execution
 * and makes it available for verification in later steps.
 * 
 * Example flow:
 * 1. API uploads batch file → captures file ID, amount, record count
 * 2. UI navigates to files list
 * 3. UI assertions use the captured data for verification
 */

export interface UploadedFileData {
    fileId: string;              // e.g., "SE26070009838441"
    fileName: string;            // e.g., "Batch Test 2026-07-28 MS4MUHH5"
    totalAmount: string;         // e.g., "R 101.00" or "101.00"
    recordCount: number;         // e.g., 2
    status: string;              // e.g., "VAL_IN_PROG", "PENDINIT"
    createdDate: string;         // e.g., "2026-07-28T14:13:17.6605649+02:00"
    uploaderName?: string;       // e.g., "reXXXXar wXXXXew"
    templateVersion?: string;    // e.g., "V2"
    paymentType?: string;        // e.g., "EFT"
    recordAmounts?: number[];    // e.g., [50, 51] for individual record amounts
    msgId?: string;              // Message ID from generated XML
    batchId?: string;            // Batch ID for initiation
}

class RuntimeTestDataStore {
    private uploadedFileData: UploadedFileData | null = null;
    private sessionData: Map<string, any> = new Map();

    private ensurePersistenceFile(): void {
        if (!fs.existsSync(BATCH_UPLOAD_DIR)) {
            fs.mkdirSync(BATCH_UPLOAD_DIR, { recursive: true });
        }

        if (!fs.existsSync(LAST_UPLOADED_FILE_PATH)) {
            fs.writeFileSync(LAST_UPLOADED_FILE_PATH, JSON.stringify(null, null, 2), "utf-8");
        }
    }

    private persistUploadedFileData(data: UploadedFileData): void {
        this.ensurePersistenceFile();
        fs.writeFileSync(LAST_UPLOADED_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    }

    public getLastPersistedUploadedFileData(): UploadedFileData | null {
        try {
            this.ensurePersistenceFile();
            const raw = fs.readFileSync(LAST_UPLOADED_FILE_PATH, "utf-8");
            if (!raw || raw.trim() === "null") {
                return null;
            }

            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? (parsed as UploadedFileData) : null;
        } catch (error) {
            console.warn(`[RuntimeTestDataStore] Unable to read persisted uploaded file data:`, error);
            return null;
        }
    }

    /**
     * Store uploaded file data captured from API response
     */
    public setUploadedFileData(data: UploadedFileData): void {
        console.log(`[RuntimeTestDataStore] Storing file data:`, data);
        this.uploadedFileData = data;
        this.persistUploadedFileData(data);
        // Also store in session map for easy access
        this.sessionData.set('lastUploadedFile', data);
    }

    /**
     * Get the stored uploaded file data
     */
    public getUploadedFileData(): UploadedFileData | null {
        if (this.uploadedFileData) {
            return this.uploadedFileData;
        }

        const persisted = this.getLastPersistedUploadedFileData();
        if (persisted) {
            this.uploadedFileData = persisted;
            this.sessionData.set('lastUploadedFile', persisted);
            return persisted;
        }

        throw new Error('No uploaded file data available. Did you capture data from API response?');
    }

    /**
     * Clear stored data (useful for cleanup between scenarios)
     */
    public clear(): void {
        console.log(`[RuntimeTestDataStore] Clearing all stored data`);
        this.uploadedFileData = null;
        this.sessionData.clear();

        this.ensurePersistenceFile();
        fs.writeFileSync(LAST_UPLOADED_FILE_PATH, JSON.stringify(null, null, 2), "utf-8");
    }

    /**
     * Store arbitrary session data (for other uses)
     */
    public setSessionData(key: string, value: any): void {
        console.log(`[RuntimeTestDataStore] Setting session data: ${key} =`, value);
        this.sessionData.set(key, value);
    }

    /**
     * Get arbitrary session data
     */
    public getSessionData(key: string): any {
        return this.sessionData.get(key);
    }

    /**
     * Extract file details from API GET files response
     */
    public extractFileDataFromResponse(apiResponse: any): UploadedFileData {
        if (!apiResponse || !apiResponse.data || apiResponse.data.length === 0) {
            throw new Error('Invalid API response: no file data found');
        }

        const fileRecord = apiResponse.data[0]; // First file in the list

        const data: UploadedFileData = {
            fileId: fileRecord.refId,
            fileName: fileRecord.fileName,
            totalAmount: this.formatAmount(fileRecord.amount),
            recordCount: fileRecord.records || 0,
            status: fileRecord.status?.code || fileRecord.status,
            createdDate: fileRecord.createdDate,
            uploaderName: fileRecord.uploaderName,
            templateVersion: fileRecord.templateVersion,
            paymentType: fileRecord.paymentType,
        };

        console.log(`[RuntimeTestDataStore] Extracted file data from API:`, data);
        this.setUploadedFileData(data);
        return data;
    }

    /**
     * Extract file details from batch file XML generation
     * Called after batch file is generated but before upload
     */
    public setFileDataFromGeneration(params: {
        msgId: string;
        recordCount: number;
        totalAmount: number;
        recordAmounts: number[];
        fileName: string;
        paymentType: string;
    }): void {
        const data: UploadedFileData = {
            fileId: '', // Will be populated from API response later
            fileName: params.fileName,
            totalAmount: `R ${params.totalAmount.toFixed(2)}`,
            recordCount: params.recordCount,
            status: 'VAL_IN_PROG',
            createdDate: new Date().toISOString(),
            msgId: params.msgId,
            paymentType: params.paymentType,
            recordAmounts: params.recordAmounts,
        };

        console.log(`[RuntimeTestDataStore] Storing file data from generation:`, data);
        this.uploadedFileData = data;
        this.persistUploadedFileData(data);
    }

    /**
     * Update file ID after API upload (when we get the refId)
     */
    public updateFileId(fileId: string): void {
        if (this.uploadedFileData) {
            this.uploadedFileData.fileId = fileId;
            this.persistUploadedFileData(this.uploadedFileData);
            console.log(`[RuntimeTestDataStore] Updated file ID to: ${fileId}`);
        }
    }

    /**
     * Update file status (e.g., after polling)
     */
    public updateStatus(newStatus: string): void {
        if (this.uploadedFileData) {
            this.uploadedFileData.status = newStatus;
            this.persistUploadedFileData(this.uploadedFileData);
            console.log(`[RuntimeTestDataStore] Updated status to: ${newStatus}`);
        }
    }

    /**
     * Format amount string consistently
     */
    private formatAmount(amount: any): string {
        if (!amount) return '';

        // If already formatted as "R XXX.XX", return as-is
        if (typeof amount === 'string' && amount.includes('R')) {
            return amount;
        }

        // If numeric, format with R prefix
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `R ${numAmount.toFixed(2)}`;
    }

    /**
     * Get formatted string for easy debugging/logging
     */
    public toString(): string {
        if (!this.uploadedFileData) {
            return '[No uploaded file data]';
        }

        const data = this.uploadedFileData;
        return `
File: ${data.fileName}
FileID: ${data.fileId}
Amount: ${data.totalAmount}
Records: ${data.recordCount}
Status: ${data.status}
Created: ${data.createdDate}
Payment Type: ${data.paymentType}
    `.trim();
    }
}

// Export singleton instance
export const runtimeTestDataStore = new RuntimeTestDataStore();
