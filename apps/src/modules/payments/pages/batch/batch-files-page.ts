import { FrameLocator, Locator, page, expect } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../../config/global-configs";

export default class BatchFilesPage {
    iframe: FrameLocator;

    heading: Locator;
    uploadButton: Locator;
    searchInput: Locator;
    tableRows: Locator;
    showingCount: Locator;
    allTab: Locator;
    deletedTab: Locator;

    // Detail page locators
    detailHeading: Locator;
    detailStatus: Locator;
    detailRecords: Locator;
    detailAmount: Locator;
    detailUploader: Locator;
    detailFileName: Locator;
    backButton: Locator;

    constructor() {
        this.iframe = page.frameLocator(iframeId);

        // Main page locators with proper XPath - more specific and robust
        // Heading: "Payments" on files page
        this.heading = this.iframe.locator(
            "//h1[contains(normalize-space(.), 'Payments') or contains(normalize-space(.), 'Files')] | //h2[contains(normalize-space(.), 'Payments') or contains(normalize-space(.), 'Files')] | //div[@role='heading' and (contains(normalize-space(.), 'Payments') or contains(normalize-space(.), 'Files'))]"
        );

        // Upload button: "View" or file action button
        this.uploadButton = this.iframe.locator(
            "//button[contains(text(), 'View')] | //button[@aria-label*='View'] | //button[contains(@class, 'view')]"
        );

        // Search input: With label "Search" or search box
        this.searchInput = this.iframe.locator(
            "//input[contains(translate(@placeholder, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'search')] | //input[contains(translate(@aria-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'search')] | //input[contains(translate(@class, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'search')]"
        );

        // Table rows: All tr elements in tbody (files table)
        this.tableRows = this.iframe.locator(
            "//table//tbody//tr | //div[@role='table']//div[@role='row']"
        );

        // Showing count: "Showing X of Y results"
        this.showingCount = this.iframe.locator(
            "//h5[contains(text(), 'Showing')] | //span[contains(text(), 'Showing')] | //p[contains(text(), 'Showing')]"
        );

        // Tab navigation
        this.allTab = this.iframe.locator(
            "//a[text()='All' and contains(@href, 'all') or contains(@class, 'active')] | //button[text()='All']"
        );
        this.deletedTab = this.iframe.locator(
            "//a[text()='Deleted'] | //button[text()='Deleted']"
        );

        // Detail page locators - more specific XPath
        // File ID/Heading on detail page
        this.detailHeading = this.iframe.locator(
            "//h1[contains(., 'SE')] | //h2[contains(., 'SE')] | //h3[contains(., 'SE')] | //h4[contains(., 'SE')] | //span[contains(., 'SE')]"
        );

        // Status: Shows current state of file
        this.detailStatus = this.iframe.locator(
            "//span[contains(translate(@class, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'status')] | //span[contains(translate(@data-testid, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'status')] | //div[contains(translate(@class, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'badge')]//span | //span[contains(translate(@class, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'pending')]"
        );

        // Records count on detail page
        this.detailRecords = this.iframe.locator(
            "//td[contains(., 'Record')] | //span[contains(., 'Record')]/../.. | //tr//td[last()-2] | //div[contains(translate(@data-testid, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'records')]"
        );

        // Amount: Formatted as "R X.XX" on detail page
        this.detailAmount = this.iframe.locator(
            "//span[starts-with(normalize-space(.), 'R ') and contains(normalize-space(.), '.')] | //td[starts-with(normalize-space(.), 'R ') and contains(normalize-space(.), '.')] | //div[contains(translate(@class, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'amount')]"
        );

        // Uploader/Creator name
        this.detailUploader = this.iframe.locator(
            "//td[contains(., 'XXXX')] | //span[contains(., 'XXXX')] | //div[contains(translate(@class, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'uploader') or contains(translate(@class, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'creator')]"
        );

        // File name on detail page
        this.detailFileName = this.iframe.locator(
            "//h3[contains(., 'Batch')] | //span[contains(translate(@data-testid, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'filename')] | //div[contains(translate(@class, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'filename')]//span"
        );

        // Back button
        this.backButton = this.iframe.locator(
            "//button[contains(@aria-label, 'back')] | //a[contains(text(), 'Back')] | //button[contains(text(), '←')]"
        );
    }

    private async getCellText(rowIndex: number, colIndex: number): Promise<string> {
        return (await this.tableRows.nth(rowIndex).locator("td").nth(colIndex).textContent())?.trim() ?? "";
    }

    private async getFirstVisibleText(selectors: string[], timeout = 3000): Promise<string> {
        for (const selector of selectors) {
            const locator = this.iframe.locator(selector).first();
            const isVisible = await locator.isVisible({ timeout }).catch(() => false);
            if (isVisible) {
                return (await locator.textContent())?.trim() ?? "";
            }
        }
        return "";
    }

    private async getDetailValueByLabel(label: string, timeout = 2000): Promise<string> {
        const locator = this.iframe.locator(
            `//dt[contains(normalize-space(.), '${label}')]/following-sibling::dd[1]//span`
        ).first();
        const visible = await locator.isVisible({ timeout }).catch(() => false);
        if (!visible) return "";
        return (await locator.textContent())?.trim() ?? "";
    }

    async waitForPageLoad() {
        // Files page can render with different heading structures; accept any stable page marker.
        const headingVisible = await this.heading.first().isVisible({ timeout: 8000 }).catch(() => false);
        if (headingVisible) {
            return;
        }

        const searchVisible = await this.searchInput.first().isVisible({ timeout: 8000 }).catch(() => false);
        if (searchVisible) {
            return;
        }

        await this.tableRows.first().waitFor({ state: "attached", timeout: 15000 });
    }

    async getShowingCount(): Promise<string> {
        return (await this.showingCount.textContent()) ?? "";
    }

    async getRowCount(): Promise<number> {
        return this.tableRows.count();
    }

    async getFileName(rowIndex: number): Promise<string> {
        return this.getCellText(rowIndex, 1);
    }

    async getUploader(rowIndex: number): Promise<string> {
        return this.getCellText(rowIndex, 2);
    }

    async getStatus(rowIndex: number): Promise<string> {
        return this.getCellText(rowIndex, 3);
    }

    async getNoOfBatches(rowIndex: number): Promise<string> {
        return this.getCellText(rowIndex, 4);
    }

    async getNoOfRecords(rowIndex: number): Promise<string> {
        return this.getCellText(rowIndex, 5);
    }

    async getAmount(rowIndex: number): Promise<string> {
        return this.getCellText(rowIndex, 6);
    }

    async searchForFile(fileName: string) {
        await this.searchInput.fill(fileName);
        await this.searchInput.press("Enter");
        await page.waitForTimeout(2000);
    }

    async findRowByFileName(fileName: string): Promise<number> {
        const rowCount = await this.tableRows.count();
        for (let i = 0; i < rowCount; i++) {
            const name = await this.getFileName(i);
            if (name.includes(fileName)) return i;
        }
        return -1;
    }

    async verifyFileExists(fileName: string): Promise<boolean> {
        const rowIndex = await this.findRowByFileName(fileName);
        return rowIndex >= 0;
    }

    async getFileDetails(fileName: string): Promise<{
        fileName: string;
        uploader: string;
        status: string;
        noOfBatches: string;
        noOfRecords: string;
        amount: string;
    } | null> {
        const rowIndex = await this.findRowByFileName(fileName);
        if (rowIndex < 0) return null;
        return {
            fileName: await this.getFileName(rowIndex),
            uploader: await this.getUploader(rowIndex),
            status: await this.getStatus(rowIndex),
            noOfBatches: await this.getNoOfBatches(rowIndex),
            noOfRecords: await this.getNoOfRecords(rowIndex),
            amount: await this.getAmount(rowIndex),
        };
    }

    async clickOnFile(fileName: string) {
        const rowIndex = await this.findRowByFileName(fileName);
        if (rowIndex < 0) {
            throw new Error(`File "${fileName}" not found in the table`);
        }
        await this.tableRows.nth(rowIndex).click();
        await this.waitForDetailPageLoad();
    }

    async waitForDetailPageLoad() {
        const timeoutMs = 60000;

        // Detail page can load under different layouts; wait for any stable marker.
        const markers = [
            this.detailHeading.first(),
            this.detailFileName.first(),
            this.detailStatus.first(),
            this.backButton.first(),
            this.iframe.locator("//a[contains(@class, 'active') and contains(normalize-space(.), 'Details')]").first(),
            this.iframe.locator("//dt[contains(normalize-space(.), 'File ID')]").first(),
            this.iframe.locator("//dt[contains(normalize-space(.), 'File name')]").first(),
        ];

        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            for (const marker of markers) {
                const visible = await marker.isVisible({ timeout: 1000 }).catch(() => false);
                if (visible) {
                    return;
                }
            }
            await page.waitForTimeout(1000);
        }

        throw new Error("Detail page did not become ready within 30 seconds.");
    }

    async getDetailPageStatus(): Promise<string> {
        const statusByLabel = await this.getDetailValueByLabel("File status", 1500);
        if (statusByLabel) {
            return statusByLabel;
        }

        try {
            const statusEl = this.iframe.locator("[class*='status'], [class*='badge'], [data-testid*='status']").first();
            if (await statusEl.isVisible({ timeout: 3000 })) {
                return (await statusEl.textContent())?.trim() ?? "";
            }
        } catch { }
        // Fallback: look for any text that matches known statuses
        const allText = await this.iframe.locator("body").textContent();
        const statusMatch = allText?.match(/(In progress|Pending approval|Pending initiation|PENDINIT|Processed|Deleted|VAL_IN_PROG)/i);
        return statusMatch ? statusMatch[0] : "UNKNOWN";
    }

    async getDetailPageFileName(): Promise<string> {
        const byLabel = await this.getDetailValueByLabel("File name", 1500);
        if (byLabel) {
            return byLabel;
        }

        return this.getFirstVisibleText([
            "[data-testid*='file-name']",
            "h3",
            "h4",
            "h5"
        ]);
    }

    async getDetailPageAmount(): Promise<string> {
        const byLabel = await this.getDetailValueByLabel("File amount", 1500);
        if (byLabel) {
            return byLabel;
        }

        return this.getFirstVisibleText([
            "[data-testid*='amount']",
            "text=/R\\s[\\d,.]+/"
        ]);
    }

    async getDetailPageRecords(): Promise<string> {
        // The detail page shows records in a table/list format
        // Try to count actual record rows instead of looking for pagination text

        try {
            // Strategy 1: Count table rows (each row = 1 record in detail view)
            const detailTable = this.iframe.locator("table tbody tr");
            const rowCount = await detailTable.count().catch(() => 0);
            if (rowCount > 0) {
                console.log(`[BatchFilesPage] ✓ Found ${rowCount} record rows in detail table`);
                return `${rowCount}`;
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Table row count strategy failed`);
        }

        try {
            // Strategy 2: Look for header text that shows record summary
            const headerText = await this.iframe.locator("h3, h4, h5, .header").first().textContent();
            const match = headerText?.match(/(\d+)\s+records?/i);
            if (match && match[1]) {
                console.log(`[BatchFilesPage] ✓ Found record count in header: ${match[1]}`);
                return match[1];
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Header text strategy failed`);
        }

        try {
            // Strategy 3: Look for data attribute containing record count
            const recordCountElement = this.iframe.locator('[data-testid*="count"], [data-testid*="records"], [class*="record-count"]').first();
            const count = await recordCountElement.textContent();
            if (count && /\d+/.test(count)) {
                console.log(`[BatchFilesPage] ✓ Found record count element: ${count}`);
                return count;
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Data attribute strategy failed`);
        }

        try {
            // Strategy 4: Get all page content and search for record count pattern
            const allText = await this.iframe.locator("body").textContent();
            // Look for patterns like "2 records", "Records: 2", "Showing 2", etc.
            const patterns = [
                /^(\d+)\s+records?$/m,
                /records?:\s*(\d+)/i,
                /showing\s+(\d+)/i,
                /total:?\s*(\d+)/i
            ];

            for (const pattern of patterns) {
                const match = allText?.match(pattern);
                if (match && match[1]) {
                    console.log(`[BatchFilesPage] ✓ Found record count via text search: ${match[1]}`);
                    return match[1];
                }
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Text search strategy failed`);
        }

        // Fallback: Try the original strategy as last resort
        const fallbackText = await this.getFirstVisibleText([
            "[data-testid*='record']",
            "text=/\\d+ of \\d+|Records?[:\\s]\\d+/i"
        ]);

        console.warn(`[BatchFilesPage] All strategies exhausted. Returning fallback text: "${fallbackText}"`);
        return fallbackText;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // NEW: Enhanced Detail Page Getters for Robust Assertions
    // ─────────────────────────────────────────────────────────────────────────────

    async getDetailPageFileId(): Promise<string> {
        /**
         * Try to extract File ID from the detail page.
         * Usually displayed in the page heading or in a metadata section.
         * Format: SE26070009835400 or similar
         */
        try {
            const fileIdByLabel = await this.getDetailValueByLabel("File ID", 2500);
            const match = fileIdByLabel.match(/SE\d+/);
            if (match) {
                console.log(`[BatchFilesPage] File ID from detail label: ${match[0]}`);
                return match[0];
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not extract File ID from detail label`);
        }

        try {
            // Strategy 1: Look for file ID in heading or metadata
            const heading = await this.iframe.locator("h1, h2, h3").first().textContent();
            const match = heading?.match(/SE\d+/);
            if (match) {
                console.log(`[BatchFilesPage] File ID from heading: ${match[0]}`);
                return match[0];
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not extract File ID from heading`);
        }

        // Strategy 2: Look for element with data-testid containing ID
        try {
            const fileIdElement = this.iframe.locator('[data-testid*="file-id"], [data-testid*="id"]').first();
            const id = await fileIdElement.textContent();
            const match = id?.match(/SE\d+/);
            if (match) {
                console.log(`[BatchFilesPage] File ID from data-testid element: ${match[0]}`);
                return match[0];
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not find file ID element`);
        }

        // Strategy 3: Parse the file id from the detail page title/file name.
        try {
            const detailFileName = await this.getDetailPageFileName();
            const match = detailFileName.match(/SE\d+/);
            if (match) {
                console.log(`[BatchFilesPage] File ID from detail file name: ${match[0]}`);
                return match[0];
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not extract File ID from detail file name`);
        }

        // Strategy 4: Fallback scan across page text.
        try {
            const bodyText = await this.iframe.locator("body").textContent();
            const match = bodyText?.match(/SE\d{8,}/);
            if (match) {
                console.log(`[BatchFilesPage] File ID from page text: ${match[0]}`);
                return match[0];
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not extract File ID from page text`);
        }

        return "";
    }

    async getDetailPagePaymentType(): Promise<string> {
        /**
         * Extract payment type (EFT, SARS, etc.) from the detail page
         */
        try {
            const paymentTypeEl = this.iframe.locator("[class*='payment-type'], [class*='type'], [data-testid*='payment']").first();
            if (await paymentTypeEl.isVisible({ timeout: 2000 }).catch(() => false)) {
                const text = await paymentTypeEl.textContent();
                if (text?.includes("EFT") || text?.includes("SARS") || text?.includes("Payroll")) {
                    return text;
                }
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not find payment type`);
        }

        // Fallback: search in page text
        const pageText = await this.iframe.locator("body").textContent();
        if (pageText?.includes("EFT")) return "EFT";
        if (pageText?.includes("SARS")) return "SARS";
        if (pageText?.includes("Payroll")) return "Payroll";

        return "";
    }

    async getDetailPageRecordAmounts(): Promise<string[]> {
        /**
         * Extract individual record amounts from the detail page
         * Returns array like ["R 50.00", "R 51.00"]
         */
        try {
            // Strategy 1: Look for amount cells in detail table
            const amountCells = this.iframe.locator("table tbody td, table tbody span").filter({ hasText: /^R\s[\d,.]+$/ });
            const count = await amountCells.count();

            if (count > 0) {
                const amounts: string[] = [];
                for (let i = 0; i < count; i++) {
                    const amount = await amountCells.nth(i).textContent();
                    if (amount?.match(/^R\s[\d,.]+$/)) {
                        amounts.push(amount.trim());
                    }
                }
                if (amounts.length > 0) {
                    console.log(`[BatchFilesPage] Found record amounts: ${amounts.join(", ")}`);
                    return amounts;
                }
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not extract amounts from table`);
        }

        // Strategy 2: Search in full page text
        try {
            const allText = await this.iframe.locator("body").textContent();
            const amountPattern = /R\s[\d,.]+/g;
            const matches = allText?.match(amountPattern) ?? [];
            if (matches.length > 0) {
                console.log(`[BatchFilesPage] Found amounts in page text: ${matches.join(", ")}`);
                return matches;
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not find amounts in page text`);
        }

        return [];
    }

    async getDetailPageCreatedBy(): Promise<string> {
        /**
         * Extract "Created by" user information
         * Example: "reXXXAr wXXXXXew"
         */
        try {
            // Strategy 1: Look for label "Created by" or similar
            const createdByLabel = this.iframe.locator("text=/Created by|Uploader|Created by:/i").first();
            const parent = createdByLabel.locator("..");
            const userText = await parent.textContent();

            if (userText && userText.length > 0) {
                const match = userText.match(/[A-Za-z\s]+(?=\d{2}\/\d{2}\/\d{4})/);
                if (match) {
                    return match[0].trim();
                }
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not find Created by label`);
        }

        // Strategy 2: Look for data attribute
        try {
            const createdByEl = this.iframe.locator('[data-testid*="created-by"], [data-testid*="uploader"], [class*="created-by"]').first();
            const text = await createdByEl.textContent();
            if (text && text.length > 0) {
                return text.trim();
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not find created-by element`);
        }

        // Strategy 3: Search in page text for user pattern
        try {
            const allText = await this.iframe.locator("body").textContent();
            const userMatch = allText?.match(/[A-Za-z]+\s+[A-Za-z]+/);
            if (userMatch) {
                return userMatch[0];
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not find user in page text`);
        }

        return "";
    }

    async getDetailPageCreatedAt(): Promise<string> {
        /**
         * Extract creation timestamp from detail page
         * Format: "28/07/2026" or "2026-07-28 14:30:45"
         */
        try {
            // Strategy 1: Look for timestamp pattern in the page
            const allText = await this.iframe.locator("body").textContent();

            // Try DD/MM/YYYY format
            let match = allText?.match(/\d{2}\/\d{2}\/\d{4}/);
            if (match) {
                console.log(`[BatchFilesPage] Found timestamp (DD/MM/YYYY): ${match[0]}`);
                return match[0];
            }

            // Try YYYY-MM-DD format
            match = allText?.match(/\d{4}-\d{2}-\d{2}/);
            if (match) {
                console.log(`[BatchFilesPage] Found timestamp (YYYY-MM-DD): ${match[0]}`);
                return match[0];
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not find timestamp`);
        }

        // Strategy 2: Look for timestamp element
        try {
            const timestampEl = this.iframe.locator('[data-testid*="date"], [data-testid*="time"], [class*="timestamp"]').first();
            const text = await timestampEl.textContent();
            if (text && /\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/.test(text)) {
                return text.trim();
            }
        } catch (e) {
            console.log(`[BatchFilesPage] Could not find timestamp element`);
        }

        return "";
    }
}

