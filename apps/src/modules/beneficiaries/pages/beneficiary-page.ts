import { expect, FrameLocator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";
import FormElement from "../../shared/pages/form";

export default class BeneficiaryPage {
    //page locators
    static AddNewBeneficiaryBtn = (beneficiaryName: string) => { return this.getIframe().locator("//h6[text()=' " + beneficiaryName + " ']/..//button//span[text()=' Add ']") }
    static SummarySuccessIcon = () => { return this.getIframe().locator("//ui-icon[.//*[contains(@class, 'success')]]") }
    static SummaryApproversIcon = () => { return this.getIframe().locator("//ui-icon[.//*[contains(@class, 'error  ')]]") }
    static SummaryApproversInitials = () => { return this.getIframe().locator("//investec-online-name-with-initial//p") }
    static ShowAllCurrencies = () => { return this.getIframe().locator("//button[text()=' Show all available ']") }
    static CurrenciesFilter = (countryName: string) => { return this.getIframe().locator("//div[text()=' " + countryName + " ']") }
    static AccountType_rdoBtn = (value: string) => { return this.getIframe().locator("//input[@id='currencySelector'] | //button[@id='currencySelector']") }
    static ResultListRecord_ByFieldVale = (value: string) => { return this.getIframe().locator("//td[contains(text(),'" + value + "')]/..//a//ui-icon") }
    static ResultListSubSection = (sectionName: string) => { return this.getIframe().locator("//li//a[text()='" + sectionName + "']") }
    static SuccessAlert = () => { return this.getIframe().locator("//ui-alerts//div[contains(@class,'alert-success')]") }
    static TopNavigationSubMenu = (menuItemName: string) => { return this.getIframe().locator(`//ul[@class='nav nav-tabs']//a[contains(.,'${menuItemName}')]`) }
    static ToastMessage = () => { return this.getIframe().locator("//div[@class='toast-body']/button[contains(.,'Continue with submission')]") }
    static ToastHeader = () => { return this.getIframe().locator("//div[@class='toast-header']/button") }

    //page action methods
    private static getIframe(): FrameLocator {
        return page.frameLocator(iframeId);
    }

    //page action methods
    static async ClickAdd(beneficiaryType: string) {
        await this.AddNewBeneficiaryBtn(beneficiaryType).click();
    }

    static async CaptureBeneficiaryDetails(beneficiaryName: string, bankName: string, accountNumber: string) {
        await FormElement.enterInputFieldText("Beneficiary name", beneficiaryName)
        await FormElement.selectFromDropdown("bankName", bankName)
        await FormElement.enterInputFieldText("Account number", accountNumber);
    }

    static async VerifyCaptureSuccess() {
        //check that success icon is displayed
        await this.SummarySuccessIcon().isVisible();
    }

    static async VerifyApproversAreDisplayed() {
        await this.SummaryApproversIcon().isVisible();
        await this.SummaryApproversInitials().isVisible();
    }

    static VerifyOverviewScreenDisplayed() {
        //verify url is contains '/bb/beneficiaries'
        const currentUrl = page.url();
        expect(currentUrl).toContain('/bb/beneficiaries')
    }

    static async CapturePayrollBeneficiaryDetails(employeeName: string, bankName: string, accountNumber: string) {
        await FormElement.enterInputFieldText("Employee name", employeeName)
        await FormElement.selectFromDropdown("bankName", bankName)
        await FormElement.enterInputFieldText("Account number", accountNumber);
    }

    static async CaptureInternationalBeneficiaryDetails(beneficiaryName: string, beneficiary_lastname: string, gender: string, residential_status: string) {
        await FormElement.enterInputFieldText("First name", beneficiaryName)
        await FormElement.enterInputFieldText("Last name", beneficiary_lastname)
        //select gender from dropdown
        await FormElement.openDropdown("genderId")
        await FormElement.selectDropdownItem(gender)

        //select residential status 
        await FormElement.openDropdown("residentId")
        await FormElement.selectDropdownItem(residential_status)

        //select country & enter address
        await FormElement.selectFromDropdown("CountryCode", "ZA")
        await FormElement.enterInputFieldText("Street address", "TST-address")
        await FormElement.enterInputFieldText("Suburb", "TST-Suburb")
        await FormElement.enterInputFieldText("City", "TST-City")
        await FormElement.enterInputFieldText("Province / State", "TST-province")
        await FormElement.enterInputFieldText("Postal code", "12345")

    }

    static async CaptureInternationalBeneficiaryBankDetails(country_of_the_bank: string, currency: string, account_number: string, swift_bic_code: string, sort_code: string) {
        //select country
        await FormElement.selectFromDropdown("CountryCode", country_of_the_bank)

        //select currency
        await FormElement.openDropdown("currencySelector")
        await this.ShowAllCurrencies().click();
        await this.CurrenciesFilter(currency).click();

        //capture account details
        let labelText = " Account number ";
        await FormElement.ClickRadioBtn_ByLabel(labelText);
        await FormElement.enterInputFieldText("Account number", account_number);
        await FormElement.selectFromDropdown("SwiftBICCode", swift_bic_code)
        await FormElement.enterInputFieldText("Sort code ", sort_code);
    }

    static async OpenRecordDetails(beneficiary_name: string) {
        const targetRecortd = await this.ResultListRecord_ByFieldVale(beneficiary_name).first();
        await this.ResultListRecord_ByFieldVale(beneficiary_name).first().click()

        try {
            await targetRecortd.waitFor({ state: "hidden", timeout: 20000 })
        } catch (error) {
            throw new Error("{} from endpoint /api/v2/beneficiary/overview")
        }


    }

    static async OpenSubmissionSection(sectionName: string) {
        await this.ResultListSubSection(sectionName).click();
    }

    static async VerifySuccessAlert() {
        await this.SuccessAlert().isVisible();
    }
}