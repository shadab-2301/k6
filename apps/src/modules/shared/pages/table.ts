import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

class TablePage {

    //page locators
    static Table = () => { return this.getIframe().locator("//table") }
    static TableHeadings = () => { return this.getIframe().locator("//table//thead//th") }
    static TableRow = () => { return this.getIframe().locator("//table//tbody//tr") }

    // Static method to get the iframe
    private static getIframe(): FrameLocator {
        return page.frameLocator(iframeId);
    }

    //page action methods

    // Get all column headings
    static async getColumnHeadings(): Promise<string[]> {
        const headerCells = await this.TableHeadings().all();
        const headings = await Promise.all(headerCells.map(cell => cell.innerText()));
        return headings;
    }

    // Get records by row index
    static async getRecordsByRowIndex(rowIndex: number): Promise<string[]> {
        const rowLocator = this.Table().nth(rowIndex);
        const cellLocators = await rowLocator.locator('td').all();
        const cellValues = await Promise.all(cellLocators.map(cell => cell.innerText()));
        return cellValues;
    }

    // Map row values to relevant headings
    static async getRowsMappedToHeadings(): Promise<Record<string, string>[]> {
        const headings = await this.getColumnHeadings();
        const rows = await this.TableRow().all();
        const mappedRows: Record<string, string>[] = [];

        for (const row of rows) {
            const cellValues = await row.locator('td').allTextContents(); // Get all cell values in the row
            const rowObject: Record<string, string> = {};

            headings.forEach((heading, index) => {
                rowObject[heading] = cellValues[index] || ''; // Map heading to corresponding cell value
            });

            mappedRows.push(rowObject);
        }

        return mappedRows;
    }

    // Helper method to find column index by column name
    static async getColumnIndex(headerCells: Locator[], columnName: string): Promise<number> {
        for (let i = 0; i < headerCells.length; i++) {
            const headerText = await headerCells[i].innerText();
            if (headerText.trim() === columnName) {
                return i; // Return the index if the column name matches
            }
        }
        return -1; // Return -1 if not found
    }
}

export default TablePage;
