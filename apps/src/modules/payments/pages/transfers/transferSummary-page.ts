import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import ApolloDashboardPage2 from "../../../shared/pages/apollo-dashboard-page-2";
import Table from "../../../shared/pages/data-table-page";
import { iframeId } from "../../../../../config/global-configs";
import moment from "moment";
import { InterrnaltranferDetails } from "../../types/InterrnaltranferDetails"
import TransferDetailPage from "./transferdetails-page";


export default class TransferSummaryPage {

  iframe: FrameLocator;
  cards: Locator;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.cards = this.iframe.locator(".card.h-100");
  }

  async quickTranferSumbitResponse(status: string) {
    (await this.getSumbitStatus()).waitFor({ timeout: 20000 })
    return await this.getSumbitStatus();
  }

  async getCardsDetails() {
    const testing = await (await this.getSubmitCard()).textContent();

    expect(testing).toMatch(/^\s*(?:Transfer(s) submitted|Transfer Submitted)\s*$/i);
    expect(await (await this.getNextStepCard())).toContainText("Next Steps");
    expect(await (await this.getNextStepCard())).toContainText("Next Steps");
  }

  async getMultiCardsDetails() {
    const testing = await (await this.getSubmitCard()).textContent();

    expect(testing).toContain("Request(s) selected for Transfer(s)");
    expect(testing).toContain("Successful, 0 Failed");

    expect(await (await this.getNextStepCard())).toContainText("Next steps");
  }

  async getSingleTransferSummaryCardsDetails() {
    const testing = await (await this.getSubmitCard()).textContent();

    expect(testing).toContain("Transfer Submitted");
    expect(testing).toContain("total transfers submitted");
    expect(testing).not.toContain("0 successful");
    expect(testing).toContain("successful, 0 failed");
    expect(await (await this.getNextStepCard())).toContainText("Next steps");
  }

  async getSubmitCard() {
    return await this.cards.nth(0);
  }

  async getNextStepCard() {
    return await this.cards.nth(1);
  }

  async getSumbitStatus() {
    return await this.iframe.locator("//investec-online-transfers-singe-transfer-summary//p | //ui-alerts//p");
  }
}




