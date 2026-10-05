import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { IRequestorDetail } from "../../types/RequestorDetails";
import { IPayerDetail } from "../../types/RequestDetails";
import { IPaymentDetails } from "../../types/PaymentDetails";
import { getTextContent } from "../../../../../helper/playwright-actions";
import { iframeId } from "../../../../../config/global-configs";

export default class RTPReceiptVerifyPage {

    iframe: FrameLocator;

    //Requestor details locators
    public readonly lblKnownAs: Locator;
    public readonly lblDepositAccount: Locator;

    //Payer details locators
    public readonly lblPayerName: Locator;
    public readonly lblPayerIDType: Locator;
    public readonly lblAccountNumber: Locator;
    public readonly lblDomain: Locator;

    //Payment request details locators
    public readonly lblAmount: Locator;
    public readonly lblAmountOption: Locator;
    public readonly lblMinimumAmount: Locator;
    public readonly lblMyReference: Locator;
    public readonly lblRequestedDate: Locator;
    public readonly lblExpiryTime: Locator;

    constructor() {
        this.iframe = page.frameLocator(iframeId);

        this.lblKnownAs = this.iframe.locator("//label[@for='KnownAs']//following-sibling::p")
        this.lblDepositAccount = this.iframe.locator("//label[@for='DepositAccount']//following-sibling::p")

        this.lblPayerName = this.iframe.locator("//label[@for='Name']//following-sibling::p")
        this.lblPayerIDType = this.iframe.locator("//label[@for='PayerDetailsId']//following-sibling::p")
        this.lblAccountNumber = this.iframe.locator("//label[@for='AccountNumber']//following-sibling::p")
        this.lblDomain = this.iframe.locator("//label[@for='Domain']//following-sibling::p")

        this.lblAmount = this.iframe.locator("//label[@for='RequestedAmount']//following-sibling::p")
        this.lblAmountOption = this.iframe.locator("//label[@for='PaymentAmount']//following-sibling::p")
        this.lblMinimumAmount = this.iframe.locator("//label[@for='MinimumPaymentAmount']//following-sibling::p")
        this.lblMyReference = this.iframe.locator("//label[@for='MyReference']//following-sibling::p")
        this.lblRequestedDate = this.iframe.locator("//label[@for='RequestDate']//following-sibling::p")
        this.lblExpiryTime = this.iframe.locator("//label[@for='ExpiryTime']//following-sibling::p")
    }

    async getRequestorDetails() {
        const requestorDetails: IRequestorDetail = {
            knowsAs: (await this.lblKnownAs.textContent())?.trim(),
            depositAccount: (await this.lblDepositAccount.textContent())?.trim()
        };
        return requestorDetails;
    }

    async getPayerDetails() {
        const payerDetails: IPayerDetail = {
            payerName: await getTextContent(this.lblPayerName),
            payerId: await getTextContent(this.lblPayerIDType),
            accountNumber: await getTextContent(this.lblAccountNumber),
            domain: await getTextContent(this.lblDomain)
        };
        return payerDetails;
    }

    async getPaymentdetails() {
        let minimum= null
        try {
           await this.lblMinimumAmount.waitFor({timeout:3000})
            if (this.lblMinimumAmount.isVisible()){
                 minimum=await getTextContent(this.lblMinimumAmount)   
            }
        } catch (error) {
            
        }
        const paymentDetails: IPaymentDetails = {
            requestedAmount: await getTextContent(this.lblAmount),
            amountOption: await getTextContent(this.lblAmountOption),
            minimumAmount: await minimum,
            myReference: await getTextContent(this.lblMyReference),
            requestDate: await getTextContent(this.lblRequestedDate),
            expirtyTime: await getTextContent(this.lblExpiryTime)
        };
        return paymentDetails;
    }

}

