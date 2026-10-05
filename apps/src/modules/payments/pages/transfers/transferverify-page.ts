import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import ApolloDashboardPage2 from "../../../shared/pages/apollo-dashboard-page-2";
import Table from "../../../shared/pages/data-table-page";
import { iframeId } from "../../../../../config/global-configs";
import moment from "moment";
import { InterrnaltranferDetails } from "../../types/InterrnaltranferDetails"
import { SingleTransferApprovalDetails } from "../../types/InterrnaltranferDetails"
import TransferDetailPage from "./transferdetails-page";
import { IBOL } from "../../../../utilities/utilities/ibol-utilities";


export default class TransferVerifyPage {

  getDoneButton(): Locator {
    return this.iframe.locator('#domesticSummaryCanvasClose');
  }

  iframe: FrameLocator;


  constructor() {
    this.iframe = page.frameLocator(iframeId);
  }

  async getField(fieldName: string) {
    return this.iframe.locator(`(//dt[contains(text(),'${fieldName}')]/following-sibling::dd[1])[1]`);
  }

  async getFieldValue(fieldName: string) {
    const field = await this.getField(fieldName);
    await field.waitFor({ state: 'visible', timeout: 5000 });
    return field.textContent();
  }


  async getAmount() {
    return this.iframe.locator(`[id*= amount]`).last();
  }

  async getSingleTranferDetails() {
    await page.waitForTimeout(3000);

    async function createTransfer() {
      let singleTransfer: InterrnaltranferDetails = {
        ftnumber: await Table.getCellValueByHeader("Transfer ID"),
        tranferDate: await Table.getCellValueByHeader("Transfer date"),
        fromaccount: await Table.getCellValueByHeader("From account"),
        toAccount: await Table.getCellValueByHeader("To account"),
        transfertype: await Table.getCellValueByHeader("Transfer type"),
        amount: await Table.getCellValueByHeader("Amount")
      };

      return singleTransfer;
    }

    let singleTransfer = await createTransfer();
    return singleTransfer;
    // this.attach(`Single Transfer Data , ${await singleTransfer}`);
    // this.parameters.currenttranfer = await singleTransfer;
  }


  async getSingleTranferApprovalDetails() {
    await page.waitForTimeout(3000);

    async function createTransfer() {
      let approversingleTransfer: SingleTransferApprovalDetails = {
        paymentId: await Table.getCellValueByHeader("Payment ID"),
        paymentDate: await Table.getCellValueByHeader("Payment date"),
        beneficiaryName: await Table.getCellValueByHeader("Beneficiary name"),
        beneficiaryType: await Table.getCellValueByHeader("Beneficiary type"),
        debitAccountReference: await Table.getCellValueByHeader("Debit account reference"),
        amount: await Table.getCellValueByHeader("Amount"),
      };

      return approversingleTransfer;
    }

    let approversingleTransfer = await createTransfer();
    return approversingleTransfer;
  }

  async getMultiTranferDetails() {
    await page.waitForTimeout(3000);

    let tablerows;
    try {
      tablerows = await (await Table.getTableRows()).count()
    } catch (error) {
     throw new Error("Error getting Mutlti Tranfers table rows: ");
    }
    
    const multitranfers = [];
    for (let i = 0; i < tablerows; i++) {
      let multitrans: InterrnaltranferDetails = {
        transferid: await Table.getCellValueByHeader("Transfer ID", i),
        tranferDate: await Table.getCellValueByHeader("Transfer date", i),
        toAccount: await Table.getCellValueByHeader("To account", i),
        toaccountreference: await Table.getCellValueByHeader("To account reference", i),
        status: await Table.getCellValueByHeader("Status", i),
        amount: await Table.getCellValueByHeader("Amount", i),
      }
      await multitranfers.push(multitrans);
    }

    return multitranfers;;


  }


  async getRecurringTranferDetails() {
    await page.waitForTimeout(3000);

    let recurringtransferdata: InterrnaltranferDetails = {
      transferid: await Table.getCellValueByHeader("Transfer ID"),
      fromaccount: await Table.getCellValueByHeader("From account"),
      toAccount: await Table.getCellValueByHeader("To account"),
      transfertype: await Table.getCellValueByHeader("Transfer type"),
      numberOfTransfers: await Table.getCellValueByHeader("Number of transfers"),
      amount: await Table.getCellValueByHeader("Amount"),

    }

    return recurringtransferdata;

  }




  async openinfomationslider(index: number = 0) {
    try {
      const infomationbtn = await (await this.getInformationButton()).nth(index);
      await IBOL.click(infomationbtn);
    } catch (error) {
      const infomationbtn = await (await this.getRandomInformationButton()).nth(index);
      await IBOL.click(await infomationbtn);
    }
  }

  async selectInfomationSlidderTab(tabname: string) {
    try {
      const transferTab = await this.getTranferTab(tabname);
      await transferTab.waitFor({ state: "visible", timeout: 5000 });
      await transferTab.click();
      expect(await transferTab).toHaveAttribute("aria-selected", "true",{ timeout: 5000 });
    } catch (error) {

    }
  }

  getInformationButton = async function () {
    return this.iframe.locator(".ids-button__content svg").last();
  };

  getTranferTab = async function (tabname) {
    return this.iframe.locator(`//a[contains(@id,'ngb-nav-') and text()='${tabname}']`);
  };

  getRandomInformationButton = async function () {
    return this.iframe.locator(".ids-button__content svg[name='information'],#offcanvas-table-undefined");
  };

  closeInfomationSlider = async function () {
    return this.iframe.getByRole('button', { name: 'cross' }).or(this.iframe.locator('svg[name="cross"]'));
  };

}




