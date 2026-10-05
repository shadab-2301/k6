import { page, FrameLocator, Locator } from "playwright-with-cucumber-checks";
import { IRequestorDetail } from "../../types/RequestorDetails";
import { IOverview, IRTPAuditDetails } from "../../types/IAuditDetails";
import { IPayerDetail } from "../../types/RequestDetails";
import { IPaymentDetails } from "../../types/PaymentDetails";
import { convertDateString, formatDate } from "../../../../../helper/date-utils";
import { iframeId } from "../../../../../config/global-configs";

export default class PayAuditDetailsPage {

    private iframe: FrameLocator;

    //Overivew section
    private readonly lblSubmittedBy: Locator;
    private readonly lblApprovedBy: Locator;

    //Requestor details
    private readonly lblKnownAs: Locator;
    private readonly lblAccountName: Locator;
    private readonly lblRequestorAccountNumber: Locator;

    //Payer details
    private readonly lblPayerName: Locator;
    private readonly lblPayerId: Locator;
    private readonly lblPayerAccountNumber: Locator;
    private readonly lblDomain: Locator;

    //Payment details
    private readonly lblRequestAmount: Locator;
    private readonly lblPaymentAmountOption: Locator;
    private readonly lblMyReference: Locator;
    private readonly lblRequestedDate: Locator;
    private readonly lblExpiryTime: Locator;

    constructor() {
        this.iframe = page.frameLocator(iframeId);

        this.lblSubmittedBy = this.iframe.locator("//dt[contains(text(),'Submitted by')]//parent::div//span")
        this.lblApprovedBy = this.iframe.locator("//dt[contains(text(),'Approved by')]//parent::div//span")

        this.lblKnownAs = this.iframe.locator("//dt[contains(text(),'Known as name')]//parent::div//span")
        this.lblAccountName = this.iframe.locator("//dt[contains(text(),'Account')]//parent::div//span")
        this.lblRequestorAccountNumber = this.iframe.locator("//dt[contains(text(),'Deposit account number')]//parent::div//span")

        this.lblPayerName = this.iframe.locator("//dt[contains(text(),'Name')]//parent::div//span")
        this.lblPayerId = this.iframe.locator("//dt[contains(text(),'ID')]//parent::div//span")
        this.lblDomain = this.iframe.locator("//dt[contains(text(),'Bank')]//parent::div//span")
        this.lblPayerAccountNumber = this.iframe.locator("//dt[contains(text(),'Account')]//parent::div//span")

        this.lblRequestAmount = this.iframe.locator("//dt[contains(text(),'Requested amount')]//parent::div//span")
        this.lblPaymentAmountOption = this.iframe.locator("//dt[contains(text(),'Payment amount option')]//parent::div//span")
        this.lblMyReference = this.iframe.locator("//dt[contains(text(),'My reference')]//parent::div//span")
        this.lblRequestedDate = this.iframe.locator("//dt[contains(text(),'Request date')]//parent::div//span")
        this.lblExpiryTime = this.iframe.locator("//dt[contains(text(),'Expiry time')]//parent::div//span")
    }


    async getCapturedDetails(requestorDetails: IRequestorDetail, payerDetails: IPayerDetail, paymentDetails: IPaymentDetails) {

    }

    async getOverViewDetails() {
        let overview: IOverview = {
            submittedBy: await this.lblSubmittedBy.textContent(),
            approvedBy: await this.lblApprovedBy.textContent()
        }
        return overview;
    }


    async getAuditRequestorDetails() {
        const inputString = await this.lblAccountName.textContent();
        const regex = /\((.*?)\)/;
        const accountNumber = inputString?.match(regex);
        let devisedAccount
        if (accountNumber != null) {
            devisedAccount = accountNumber;
        }

        let requestorDetails: IRequestorDetail = {
            knowsAs: await this.lblKnownAs.textContent(),
            depositAccount: devisedAccount
        }

        return requestorDetails;
    }

    async getAuditPayerDetails() {
        let payerDetails: IPayerDetail = {
            payerName: await this.lblPayerName.textContent(),
            payerId: await this.lblPayerId.first().textContent(),
            accountNumber: await this.lblAccountName.textContent(),
            domain: await this.lblDomain.textContent()
        }
        return payerDetails;
    }

    async getAuditPaymentDetails() {
        let payerDetails: IPaymentDetails = {
            requestedAmount: await this.lblRequestAmount.textContent(),
            amountOption: await this.lblPaymentAmountOption.textContent(),
            myReference: await this.lblMyReference.textContent(),
            requestDate: formatDate(convertDateString(await this.lblRequestedDate.textContent(), "/"), "-"),
            expirtyTime: await this.lblExpiryTime.textContent()
        }
        return payerDetails;
    }

    async getAuditDetails(requestorDetails: IRequestorDetail, payerDetails: IPayerDetail, paymentDetails: IPaymentDetails) {
        let auditDetails: IRTPAuditDetails = {
            overview: await this.getOverViewDetails(),
            requestorDetails: await this.getAuditRequestorDetails(),
            payerDetails: await this.getAuditPayerDetails(),
            paymentDetails: await this.getAuditPaymentDetails()
        }
        return auditDetails;
    }



}

