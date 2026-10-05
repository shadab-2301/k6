import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { PAYSHARP_ID_TYPE } from "../../../types/sharp-id-const";
import { IRequestorDetail } from "../../../types/RequestorDetails";
import { IPayerDetail } from "../../../types/RequestDetails";
import { iframeId } from "../../../../../../config/global-configs";

export default class RTPReceiptDetailPage {

    private iframe: FrameLocator;

    //Requestor details
    private readonly ddlKnownAs: Locator;
    private readonly ddlDepositAccount: Locator;

    //Payer details
    private readonly txtPayerName: Locator;
    private readonly ddlPayerId: Locator;
    private readonly txtPayerAccountNumber: Locator;
    private readonly ddlPayerDomain: Locator;

    constructor() {
        this.iframe = page.frameLocator(iframeId);
        this.ddlKnownAs = this.iframe.locator("//investec-online-basic-search-dropdown//input[@id='KnownAs']")
        this.ddlDepositAccount = this.iframe.locator("//investec-online-basic-search-dropdown//input[@id='DepositAccount']")
        this.txtPayerName = this.iframe.locator("#Name")
        this.ddlPayerId = this.iframe.locator("//investec-online-basic-search-dropdown//input[@id='PayerDetailsId']")
        this.txtPayerAccountNumber = this.iframe.locator("#AccountNumber")
        this.ddlPayerDomain = this.iframe.locator("//investec-online-basic-search-dropdown//input[@id='Domain']")
    }

    getDropDownOption(): Locator {
        return this.iframe.locator("//button[contains(@role, 'option')]");
    }

    getDropDownOptionByText(option: string): Locator {
        return this.iframe.locator("//button[contains(@role, 'option')]//ngb-highlight[contains(.,'" + option + "')]");
    }

    getDDLKnownAs() {
        return this.ddlKnownAs;
    }

    getDDLDepositAccount() {
        return this.ddlDepositAccount;
    }

    async capatureRequestorDetails() {

        //Select Known as name
        await this.ddlKnownAs.click({ timeout: 60000 });
        await this.getDropDownOption().nth(0).click();


        //Select deposit account
        await this.ddlDepositAccount.click();
        await this.getDropDownOption().first().click();
    }

    async capturePayerDetails(name: string, idType: string, accountNumber: string, domain: string) {
        await this.txtPayerName.fill(name);
        await this.ddlPayerId.click();
        if (idType == PAYSHARP_ID_TYPE.BANK_ACCOUNT) {
            await this.getDropDownOptionByText(PAYSHARP_ID_TYPE.BANK_ACCOUNT).click();
        } else {
            await this.getDropDownOptionByText(PAYSHARP_ID_TYPE.BANK_ACCOUNT).click();
        }
        await this.ddlPayerDomain.click();
        await this.getDropDownOptionByText(domain).click();
        await this.txtPayerAccountNumber.fill(accountNumber.toString());

    }

    //Get captured user information
    async getCapuredRequestorDetails() {
        const capturedRequestDetails: IRequestorDetail = {
            knowsAs: await this.ddlKnownAs.inputValue(),
            depositAccount: await this.ddlDepositAccount.inputValue(),
        };
        return capturedRequestDetails;
    }

    //Get captured payer information
    async getCapturedPayerDetails() {
        const capturedRequestDetails: IPayerDetail = {
            payerName: (await this.txtPayerName.inputValue()).trim(),
            payerId: (await this.ddlPayerId.inputValue()).trim(),
            accountNumber: (await this.txtPayerAccountNumber.inputValue()).trim(),
            domain: (await this.ddlPayerDomain.inputValue()).trim()
        };
        return capturedRequestDetails;
    }





}

