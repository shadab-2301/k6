import { Page, Locator } from '@playwright/test';

export class TransfersDashboardPage {
  readonly page: Page;
  readonly quickTransferFromAccount: Locator;
  readonly quickTransferToAccount: Locator;
  readonly quickTransferAmount: Locator;
  readonly transferTab: Locator;
  readonly importFileButton: Locator;
  readonly draftsButton: Locator;
  readonly templatesButton: Locator;
  readonly filterButton: Locator;
  readonly searchInput: Locator;
  readonly dateFromInput: Locator;
  readonly dateToInput: Locator;
  readonly applyButton: Locator;
  readonly downloadButton: Locator;
  readonly resultsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.quickTransferFromAccount = page.locator('input[placeholder="From account"]');
    this.quickTransferToAccount = page.locator('input[placeholder="To account"]');
    this.quickTransferAmount = page.locator('input[placeholder="Amount"]');
    this.transferTab = page.getByRole('tab', { name: 'Transfers' });
    this.importFileButton = page.getByRole('button', { name: 'Import file' });
    this.draftsButton = page.getByRole('button', { name: 'Drafts' });
    this.templatesButton = page.getByRole('button', { name: 'Templates' });
    this.filterButton = page.getByRole('button', { name: 'Filter' });
    this.searchInput = page.getByPlaceholder('Search transfer ID, batch ID, to or from');
    this.dateFromInput = page.locator('input[type="date"]').nth(0);
    this.dateToInput = page.locator('input[type="date"]').nth(1);
    this.applyButton = page.getByRole('button', { name: 'Apply' });
    this.downloadButton = page.getByRole('button', { name: 'Download' });
    this.resultsTable = page.locator('table');
  }

  async goto() {
    await this.page.goto('https://loginstg.secure.investec.com/bb-wpaas/business-banking/bb/payments/dashboard/transfers/all');
  }

  async searchTransfer(query: string) {
    await this.searchInput.fill(query);
    await this.applyButton.click();
  }

  async filterByDate(from: string, to: string) {
    await this.dateFromInput.fill(from);
    await this.dateToInput.fill(to);
    await this.applyButton.click();
  }

  async downloadResults() {
    await this.downloadButton.click();
  }

  async getResultsRows() {
    return this.resultsTable.locator('tbody tr');
  }
}
