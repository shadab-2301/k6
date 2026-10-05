import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

export default class AccountDetailPage {
    iframe: FrameLocator;
    lblAccountType: Locator;
    lblAccountName: Locator;
    lblAccountNumber: Locator;
    lblCurrency: Locator;
    lblAccountOpened: Locator;
    lblAccountStatus: Locator;
    lblLimit: Locator;
    lblDebitInterestRate: Locator;
    lblInterestDistribution: Locator;
    lblAccruedDebitInterest: Locator;
    lblCreditInterestRate: Locator;
    lblAccrudeInterestRate: Locator;
    lblAccruedCreditInterest: Locator;
    currentBalance: Locator;
    availableBalance: Locator;


    constructor() {
        this.iframe = page.frameLocator(iframeId);
        this.lblAccountType = this.iframe.locator(`(//dt[text()='Account type']/..//dd//span)[1]`);
        this.lblAccountName = this.iframe.locator(`//dt[.='Account name']//parent::div//dd`);
        this.lblAccountNumber = this.iframe.locator(`//dt[.='Account number']//following-sibling::dd`);
        this.lblCurrency = this.iframe.locator(`(//dt[.='Currency']//parent::div//span)[1]`);
        this.lblAccountOpened = this.iframe.locator(`(//dt[.='Account Opened']//parent::div//span)[1]`);
        this.lblAccountStatus = this.iframe.locator(`(//dt[.='Currency']//parent::div//span)[1]`);
        this.lblAccountStatus = this.iframe.locator(`(//dt[.='Status']//parent::div//span)[1]`);
        this.lblLimit = this.iframe.locator(`(//dt[.='Limit']//parent::div//span)[1]`);
        this.lblDebitInterestRate = this.iframe.locator(`(//dt[.='Debit interest rate']//parent::div//span)[1]`);
        this.lblInterestDistribution = this.iframe.locator(`(//dt[.='Interest distribution']//parent::div//span)[1]`);
        this.lblAccruedDebitInterest = this.iframe.locator(`(//dt[.='Accrued debit interest']//parent::div//span)[1]`);
        this.lblCreditInterestRate = this.iframe.locator(`(//dt[.='Credit interest rate']//parent::div//span)[1]`);
        this.lblAccruedCreditInterest = this.iframe.locator(`(//dt[.='Accrued credit interest']//parent::div//span)[1]`);
        this.currentBalance = this.iframe.locator(`(//dt[.='Current']//parent::div//span)[1]`);
        this.availableBalance = this.iframe.locator(`(//dt[.='Available']//parent::div//span)[1]`);
    }
}