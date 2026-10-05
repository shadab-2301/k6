import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import { IPaymentDetails } from "../../types/PaymentDetails";
import { formatDate, generateFutureDate } from "../../../../../helper/date-utils";
import Action from "../../../../../helper/actions";
import { iframeId } from "../../../../../config/global-configs";
import { DateUtilities } from "../../../../utilities/utilities/date-utilities";

export default class RTPReceptPaymentDetailPage {

    iframe: FrameLocator;
    private readonly txtRequestedAmount: Locator;
    private readonly ddlAmountOption: Locator;
    private readonly txtMinimumAmount: Locator;
    private readonly txtMyReference: Locator;
    private readonly txtRequestDate: Locator;
    private readonly txtExpiryHour: Locator;
    private readonly txtExpiryMinutes: Locator;
    public capturedPaymentDetails: IPaymentDetails;

    constructor() {
        this.iframe = page.frameLocator(iframeId);
        this.txtRequestedAmount = this.iframe.locator("#RequestedAmount")
        this.ddlAmountOption = this.iframe.locator("//label[@for='PaymentAmount']//parent::div//input")
        this.txtMinimumAmount = this.iframe.locator("#MinimumPaymentAmount")
        this.txtMyReference = this.iframe.locator("#MyReference")
        this.txtRequestDate = this.iframe.locator("#RequestDate")
        this.txtExpiryHour = this.iframe.locator("#ExpiryTimeHour")
        this.txtExpiryMinutes = this.iframe.locator("#ExpiryTimeMinute")
    }

    async getPaymentAmountOption() {
        return this.iframe.locator("#MinimumPaymentAmount");
    }

    async captureRequestPaymentDetails(amount: string, reference: string, requestDate: string, minimumAount?: string, amountOption?: string, expiryTime?: string) {
        await this.txtRequestedAmount.fill(amount);

        if (minimumAount != "") {
            await this.ddlAmountOption.click();
            await this.iframe.locator("//button[@role='option' and contains(.,'Flexible')]").click();
            expect(this.txtMinimumAmount).toBeVisible();
            await this.txtMinimumAmount.fill(minimumAount)
        }
        await this.txtMyReference.fill(`${reference} ${Action.generateNumericString(5)}`);

        requestDate = await DateUtilities.getDate(1);
        await this.txtRequestDate.fill(requestDate);
        await this.txtExpiryHour.fill("17");
        await Action.getDropDownOptionByText("17").click();;
        await this.txtExpiryMinutes.fill("50")
        await Action.getDropDownOptionByText("50").click();;
    }

    async getCapuredPaymentDetails() {
        this.capturedPaymentDetails = {
            requestedAmount: (await this.txtRequestedAmount.inputValue()).trim(),
            amountOption: (await this.ddlAmountOption.inputValue())?.trim(),
            myReference: (await this.txtMyReference.inputValue()).trim(),
            requestDate: (await this.txtRequestDate.inputValue()).trim(),
            expirtyTime: (await this.txtExpiryHour.inputValue()).trim() + ":" + (await this.txtExpiryMinutes.inputValue()).trim()
        };

        if (await this.ddlAmountOption.inputValue() == 'Exact requested amount') {
            this.capturedPaymentDetails.minimumAmount = null
        } else {
            this.capturedPaymentDetails.minimumAmount = await this.txtMinimumAmount.inputValue()
        }

        return this.capturedPaymentDetails;
    }

}

