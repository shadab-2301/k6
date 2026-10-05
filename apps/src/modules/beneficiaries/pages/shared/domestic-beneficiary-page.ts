import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import FBCCDashboard from "../../../dashboard/pages/fbcc-dashboard-page";
import Action from "../../../../../helper/actions";
import { DataTable } from "@cucumber/cucumber";
import { Banks } from "../../../../../test/data/test-data-const";
import { iframeId } from "../../../../../config/global-configs";


export default class DomesticBeneficiarys {
    iframe: FrameLocator;
    readonly lnkBeneficiaries: Locator;
    readonly btnAdd: Locator;
    readonly beneficiaryTypesblock: Locator;
    readonly ddlCategoryType: Locator
    readonly txtBeneficiaryName: Locator;
    readonly beneficiaryGroupBlock: Locator;
    readonly ddlGrouop: Locator;
    readonly groupName: Locator;
    readonly clickBankDropDown: Locator;
    readonly bankName: Locator;
    readonly accountnumber: Locator;
    readonly beneficiaryRef: Locator;
    readonly txtBeneficiaryReference: Locator;
    readonly txtStatementReference: Locator;
    readonly txtEmailAddress: Locator;
    readonly txtSystemId: Locator;
    readonly txtContactNumber: Locator;
    readonly noForApprover: Locator;
    readonly txtNoteForApprover: Locator;
    readonly beneficiaryIndividual: Locator;
    readonly beneficiaryLegalEntity: Locator;
    readonly firstName: Locator;
    readonly lastName: Locator;
    readonly genderDrop: Locator;
    readonly selectMaleGender: Locator;
    readonly selectFemaleGender: Locator;
    readonly residentialGroupBlock: Locator;
    readonly clickSouthAfricanDropDown: Locator;
    readonly country: Locator;
    readonly streetAddress: Locator;
    readonly surbub: Locator;
    readonly city: Locator;
    readonly province: Locator;
    readonly btnPayRoll: Locator;
    readonly btnExecutivePayroll: Locator;
    readonly txtEmployeeNames: Locator;
    readonly postalCode: Locator;
    readonly approvedBeneficiaryName: Locator;
    readonly editBeneficaryName: Locator;
    readonly btnContinue: Locator;
    readonly btnSubmitForApproval: Locator;
    readonly selectAllBeneficiaries: Locator;
    readonly clickDropDown: Locator;
    readonly searchBulkBeneficiary: Locator;
    readonly clickBulkBeneficiary: Locator;
    readonly downloadPdf: Locator;
    readonly downloadCSV: Locator;
    readonly beneficiaryToRestore: Locator;
    readonly searchBeneficiary: Locator;
    readonly clickManage: Locator;
    readonly restoreBeneficiary: Locator;
    readonly restoreInternationaltab: Locator;
    readonly iban: Locator;
    readonly restoreInvestecApprovedtab: Locator;
    readonly restoreInvestecApprovaltab: Locator;
    readonly downloadStatus: Locator;
    readonly benToRestore: Locator;
    readonly benToRestoreArrow: Locator;
    readonly btnDeleteBeneficiary: Locator;
    readonly lbldeletesuccess: Locator;
    readonly txtDeclineReason: Locator;
    readonly restorecheckArrow: Locator;
    readonly groupcheckArrow: Locator;
    readonly searchBenToAmend: Locator;
    readonly dropDownOptions: Locator;
    readonly btnConfirmDecline: Locator;
    readonly lblnametostore: Locator;
    readonly btnDeleteTab: Locator;
    readonly internationalTab: Locator;
    readonly benTab: Locator;
    readonly btnCrossClose: Locator;
    readonly txtGroupName: Locator;
    readonly btnSubmitForApprovals: Locator;
    readonly tabIntertational: Locator;
    readonly executivePayrollTab: Locator;
    readonly accontNumber: Locator;
    readonly lblAccountErrorMessage: Locator;
    readonly activeExecutivePayrollTab: Locator
    readonly txtBeneficairySearch: Locator;
    readonly approveBeneficiaryName: Locator;
    readonly randomPayrollBeneficiary: Locator
    readonly internationltabSubmisions: Locator
    readonly investecApprovedtabSubmisions: Locator
    readonly domesticTab: Locator
    readonly investecApprovedTab: Locator
    readonly groupsPayroll: Locator
    readonly groupsExcutivePayroll: Locator
    readonly newButton: Locator
    readonly payrollSubmissions: Locator
    readonly executivePayrollSubmissions: Locator
    readonly myApprovalTab: Locator
    readonly myApprovalBeneficiaries: Locator
    readonly btnRefrsh: Locator
    readonly btnBeneficiariesSIT: Locator
    loginUserDetails;

    capturedBeneficiaryDetails;

    constructor() {

        this.iframe = page.frameLocator(iframeId);
        this.btnBeneficiariesSIT = this.iframe.locator("//a[normalize-space()='Beneficiaries']");
        this.btnRefrsh = this.iframe.locator("//*[@id='ctaPlatformAlert']");
        this.btnRefrsh = this.iframe.locator("//*[@id='ctaPlatformAlert']");
        this.myApprovalBeneficiaries = this.iframe.locator("//a[@id='nav-item-beneficiaries']");
        this.myApprovalTab = this.iframe.locator("//body/investec-online-root[1]/div[1]/investec-online-main[1]/div[1]/investec-online-side-nav[1]/nav[1]/ul[1]/li[6]/a[1]");
        this.payrollSubmissions = this.iframe.locator("//a[@id='nav-link-submissions-payroll']");
        this.executivePayrollSubmissions = this.iframe.locator("//a[@id='nav-link-submissions-executive-payroll']");
        this.newButton = this.iframe.locator("//body/ngb-modal-window[1]/div[1]/div[1]/div[2]/div[1]/investec-online-filter-type[1]/div[2]/div[1]/div[1]/investec-online-filter-val[1]/ui-button[1]/button[1]");
        this.groupsPayroll = this.iframe.locator("//a[@id='nav-link-groups-payroll']");
        this.groupsExcutivePayroll = this.iframe.locator("//a[@id='nav-link-groups-executive-payroll']")
        this.investecApprovedTab = this.iframe.locator("//a[@id='nav-link-beneficiaries-investec-approved']");
        this.domesticTab = this.iframe.locator("//a[@id='nav-link-beneficiaries-domestic']")
        this.investecApprovedtabSubmisions = this.iframe.locator("//a[@id='nav-link-submissions-investec-approved']")
        this.internationltabSubmisions = this.iframe.locator("//a[@id='nav-link-submissions-international']")
        this.approveBeneficiaryName = this.iframe.locator("//input[@placeholder='Search']")
        this.activeExecutivePayrollTab = this.iframe.locator("//a[@id='nav-link-active-executive-payroll']")
        this.activeExecutivePayrollTab = this.iframe.locator("//a[@id='nav-link-active-executive-payroll']")
        this.randomPayrollBeneficiary = this.iframe.locator("//a[@id='nav-link-active-payroll']");
        this.lblAccountErrorMessage = this.iframe.locator("//div[contains(@class,'invalid-feedback')]")
        this.txtEmployeeNames = this.iframe.locator('//input[@placeholder="Enter employee name"]');
        this.accontNumber = this.iframe.locator('//input[@placeholder="Enter account number"]');
        this.executivePayrollTab = this.iframe.locator("//div[4]//div[3]//p[1]//ui-button[1]//button[1]//span[1]");
        this.tabIntertational = this.iframe.locator("//a[@id='nav-link-beneficiaries-international']");
        this.btnSubmitForApprovals = this.iframe.locator("//span[contains(text(),'Submit for approval')]");
        this.txtGroupName = this.iframe.locator("#grpName");
        this.btnCrossClose = this.iframe.locator('//button[@aria-label="Close"]');
        this.benTab = this.iframe.locator("//a[contains(text(),'Beneficiaries')]");
        this.btnDeleteTab = this.iframe.locator("//a[contains(text(),'Deleted')]");
        this.btnExecutivePayroll = this.iframe.locator("//div[4]//div[3]//p[1]//ui-button[1]//button[1]//span[1]");
        this.lblnametostore = this.iframe.locator("//*[@id='openDefault-header']/div/span/h6");
        this.btnConfirmDecline = this.iframe.locator("//button[contains(text(),'Confirm decline')]");
        this.restoreInvestecApprovaltab = this.iframe.locator("//a[@id='nav-link-deleted-InvestecApproved']");
        this.groupName = this.iframe.locator('//input[@placeholder="Select a group"]');
        this.iban = this.iframe.locator('//input[@placeholder="Enter IBAN"]');
        this.searchBeneficiary = this.iframe.locator('//input[@aria-label="Search"]');
        this.downloadPdf = this.iframe.locator("//button[contains(text(),'PDF')]")
        this.downloadCSV = this.iframe.locator("//button[contains(text(),'CSV - Table data')]")
        this.btnPayRoll = this.iframe.locator("//body/investec-online-root[1]/div[1]/investec-online-main[1]/div[1]/div[1]/investec-online-beneficiaries[1]/investec-online-dashboard[1]/div[1]/investec-online-summary[1]/investec-online-beneficiary-count-summary[1]/div[1]/div[3]/div[3]/p[1]/ui-button[1]/button[1]/span[1]")
        this.txtEmployeeNames = this.iframe.locator('//input[@placeholder="Enter employee name"]');
        this.restoreBeneficiary = this.iframe.locator("//div[contains(text(),'Restore beneficiary')]");
        this.btnAdd = this.iframe.locator("//a[contains(text(),'ADD')]");
        this.ddlCategoryType = this.iframe.locator("//label[.='Category type']//following-sibling::input")
        this.lnkBeneficiaries = this.iframe.locator("//a[contains(text(),'Beneficiaries')]");
        this.beneficiaryTypesblock = this.iframe.locator("investec-online-beneficiary-count-summary");
        this.txtBeneficiaryName = this.iframe.locator('//input[@placeholder="Enter beneficiary name"]');
        //this.txtBeneficiaryName = this.iframe.locator('//input[@formcontrolname="BeneficiaryName"]');
        this.beneficiaryGroupBlock = this.iframe.locator('dropdown-menu show ng-star-inserted dropdown-menu-global-search');
        this.ddlGrouop = this.iframe.locator('//input[@placeholder="Select a group"]');
        this.clickBankDropDown = this.iframe.locator('//input[@placeholder="Select bank name"]');
        this.bankName = this.iframe.locator('//input[@placeholder="Select bank name"]');
        this.accountnumber = this.iframe.locator('//input[@formcontrolname="AccountNumber"]');
        this.txtBeneficiaryReference = this.iframe.locator('//input[@formcontrolname="BeneficiaryReference"]');
        this.txtStatementReference = this.iframe.locator('//input[@formcontrolname="MyReference"]');
        this.txtEmailAddress = this.iframe.locator('//input[@placeholder="Enter email address"]');
        this.txtSystemId = this.iframe.locator('//input[@formcontrolname="MySystemId"]');
        this.txtContactNumber = this.iframe.locator('//input[@formcontrolname="ContactNumber"]');
        this.txtNoteForApprover = this.iframe.locator("form textarea[formcontrolname='NoteForApprover']");
        this.beneficiaryIndividual = this.iframe.locator("//label[contains(text(),' Individual ')]");
        this.beneficiaryLegalEntity = this.iframe.locator("//label[contains(text(),' Legal entity ')]");
        this.firstName = this.iframe.locator('//input[@placeholder="Enter first name"]');
        this.lastName = this.iframe.locator('//input[@placeholder="Enter last name"]');
        this.genderDrop = this.iframe.locator("//button[@id='genderId']");
        this.selectMaleGender = this.iframe.locator("//div[contains(text(),'Male')]");
        this.selectFemaleGender = this.iframe.locator("//div[contains(text(),'Femail')]");
        this.residentialGroupBlock = this.iframe.locator("//button[@id='residentId']");
        this.clickSouthAfricanDropDown = this.iframe.locator("//div[contains(text(),' South African ')]");
        this.country = this.iframe.locator('//input[@placeholder="Select country"]');
        this.streetAddress = this.iframe.locator('//input[@placeholder="Street address"]');
        this.surbub = this.iframe.locator('//input[@placeholder="Suburb"]');
        this.city = this.iframe.locator('//input[@placeholder="City"]');
        this.province = this.iframe.locator('//input[@placeholder="Enter province"]');
        this.postalCode = this.iframe.locator('//input[@placeholder="Enter postal code"]');
        this.approvedBeneficiaryName = this.iframe.locator('//input[@placeholder="Enter beneficiary name"]');
        this.editBeneficaryName = this.iframe.locator("//investec-online-header-body-secondary/investec-online-stepper[1]/div[1]/div[2]/investec-online-details-container[1]/investec-online-main-container[1]/section[1]/div[1]/div[1]/investec-online-beneficiary-details-form[1]/div[1]/form[1]/div[2]/div[1]/input[1]");
        this.btnAdd = this.iframe.locator("//a[contains(text(),'Submit for approval')]");
        this.btnContinue = this.iframe.locator("//span[contains(text(),'Continue')]");
        this.btnSubmitForApproval = this.iframe.locator("//span[contains(text(),'Submit for approval')]");
        this.selectAllBeneficiaries = this.iframe.locator('//class[@stroke="#30384A"]');
        this.clickDropDown = this.iframe.locator("//input[@id='dropdown-typeahead']");
        this.searchBulkBeneficiary = this.iframe.locator('//input[@placeholder="Display all"]');
        this.clickBulkBeneficiary = this.iframe.locator("#ngb-typeahead-0-0");
        this.beneficiaryToRestore = this.iframe.locator("//tbody/tr[1]/td[6]/a[1]/ui-icon[1]/*[1]");
        this.clickManage = this.iframe.locator("//span[contains(text(),'Manage')]");
        this.internationalTab = this.iframe.locator("//a[@id='nav-link-beneficiaries-international']");
        this.restoreInternationaltab = this.iframe.locator("//a[@id='nav-link-deleted-International']");
        this.restoreInvestecApprovedtab = this.iframe.locator("#nav-link-beneficiaries-investec-approved");
        this.benToRestore = this.iframe.locator("//label[@class='position-relative'])[1]");
        this.benToRestoreArrow = this.iframe.locator("//tbody/tr[1]/td[7]");
        // this.txtBeneficiaryName = this.iframe.locator("body > investec-online-root:nth-child(1) > div:nth-child(1) > investec-online-main:nth-child(2) > div:nth-child(1) > div:nth-child(1) > investec-online-beneficiaries:nth-child(2) > investec-online-details:nth-child(2) > investec-online-blank-layout:nth-child(1) > investec-online-header-body-secondary:nth-child(1) > div:nth-child(3) > div:nth-child(5) > investec-online-beneficiary-details-card:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > p:nth-child(2)");
        this.btnDeleteBeneficiary = this.iframe.locator("//div[contains(text(),'Delete beneficiary')]");
        this.lbldeletesuccess = this.iframe.locator("//h6[contains(text(),'Success')]")
        this.txtDeclineReason = this.iframe.locator("#reasonFor")
        this.restorecheckArrow = this.iframe.locator("//tbody/tr[1]/td[6]/a[1]/ui-icon[1]/*[1]")
        this.groupcheckArrow = this.iframe.locator("//tbody/tr[1]/td[4]/a[1]/ui-icon[1]/*[1]")
        this.searchBenToAmend = this.iframe.locator("//*[@id='appPlatformBbContainer']/investec-online-main/div/div/investec-online-my-approvals/investec-online-dashboard/investec-online-header-body-primary/div/investec-online-beneficiaries/div[1]/div[2]/investec-online-filter/div/div[1]/ui-button/button/span[1]/span")
        this.dropDownOptions = this.iframe.locator("//button[@role='option']")
        this.beneficiaryRef = this.iframe.locator('//input[@formcontrolname="BeneficiaryReference"]');
        this.noForApprover = this.iframe.locator("form textarea[formcontrolname='NoteForApprover']");
        this.txtBeneficairySearch = this.iframe.locator("[formcontrolname='GlobalName']")

        //this.downloadStatus = this.iframe.locator("//a[contains(text(),'Downloading...')]");
        //.getByText('Downloading...')
        this.downloadStatus = this.iframe.getByText('Downloading...');


    }


    public async clickBeneficiary() {
        await this.lnkBeneficiaries.click();
    }
    public async selectCCMMenu(menuItem: string) {
        await this.iframe.locator('//a[contains(text(),"' + menuItem + '")]').click();
    }

    public async clickAddBeneficiarys(benType: string) {

        await this.beneficiaryTypesblock.waitFor()
        const benTypeCount = await this.beneficiaryTypesblock.locator("h6").count()
        for (let i = 0; i < benTypeCount; i++) {
            var BenType = await this.beneficiaryTypesblock.locator("h6").nth(i).textContent()
            if (BenType == benType) {
                this.beneficiaryTypesblock.locator("button").nth(i).click()

            } 1
        }
    }

    async navigateToDomesticBeneficiary(module: string, action?: string) {
        if (process.env.ENV == "STG") {
            FBCCDashboard.selectFBCCTopMenu(module, action)
        }
        if (process.env.ENV == "TST") {
            await this.btnBeneficiariesSIT.click();
        }
    }

    public async clickAddBeneficiaryType(benType: string) {
        await this.iframe.locator("//h6[contains(.,'" + benType + "')]//parent::div//span").first().click()
    }

    async getSpecificBeneficiary(beneficiaryName: string) {
        return this.iframe.locator("//span[contains(text(),'" + beneficiaryName + "')]//parent::td//preceding-sibling::td")

    }

    public async fnactiveExecutivePayrollTab() {
        await this.activeExecutivePayrollTab.click();
    }


    public async fnrandomPayrollBeneficiary() {
        await this.randomPayrollBeneficiary.click();
    }

    public async clickSideNavMenu(menu: string) {
        await this.iframe.locator(" //a[contains(text(), '" + menu + "')]").click()
    }


    public async enterBeneficiaryName(benfiName: string) {
        await this.txtBeneficiaryName.type(benfiName)
        const capturedName = await this.txtBeneficiaryName.inputValue();
        const key = capturedName.toLocaleLowerCase();
        const keys = await Action.getFirstWordBeforeSpace(key);
        await Action.writeOrAppendJSONFile("/apps/cxt-web-bb-e2e/test/data/test.json", keys, capturedName);
    }

    public async enterInternationalBeneficiaryName(benfiName: string) {

        await this.firstName.type(benfiName)

    }

    public async captureDomesticBeneficiary(data: DataTable) {
        let details = data.hashes()
        for (const entry of details) {
            await this.clickAddBeneficiaryType(entry.beneficiary_type);
            await page.waitForTimeout(3000)
            await this.txtBeneficiaryName.fill(`${Action.getRandomFirstName()} ${Action.generateNumericString(5)}`)
            await this.groupName.click();
            await this.dropDownOptions.nth(1).click();
            await this.getselectBank(entry.bank_name);
            await this.accountnumber.fill(entry.account_number)
            await this.enterReferences(`${Action.generateNumericString(14)}`);
        }

        const beneficiaryDetails = {
            beneficiaryDetails: {
                benName: await this.txtBeneficiaryName.inputValue(),
                accountNumber: await this.accountnumber.inputValue()
            },
        };
        await Action.WriteToJsonFile("/apps/cxt-web-bb-e2e/test/data/test.json", beneficiaryDetails);
    }


    public async enterBeneficiaryNames(name: string) {
        await this.txtBeneficiaryName.clear();
        await this.txtBeneficiaryName.fill(name)
    }

    async getCapturedBeneficiaryDetails() {

        this.capturedBeneficiaryDetails = await this.getBeneficiaryDetails();
    }

    async getCapturedPayrollBeneficiaryDetails() {

        this.capturedBeneficiaryDetails = await this.getPayrollBeneficiaryDetails();
    }

    async getCapturedInternationalBeneficiaryDetails() {

        this.capturedBeneficiaryDetails = await this.getInternationalBeneficiaryDetails();
    }

    async saveDomesticBeneficiaryDetails() {
        await Action.writeOrAppendJSONFile("/apps/cxt-web-bb-e2e/test/data/test.json", "domesticBeneficiaries", this.capturedBeneficiaryDetails);
    }

    async saveInternationalBeneficiaryDetails(beneficiaryType: string) {
        await Action.writeOrAppendJSONFile("/apps/cxt-web-bb-e2e/test/data/test.json", beneficiaryType, this.capturedBeneficiaryDetails);
    }

    async saveBeneficiaryDetails(beneficiaryType: string, object) {
        await Action.writeOrAppendJSONFile("/apps/cxt-web-bb-e2e/test/data/test.json", beneficiaryType, object);
    }

    async getBeneficiaryDetails() {
        const domesticBeneficiaryDetails = {

            benName: await this.txtBeneficiaryName.inputValue(),
            accountNumber: await this.accountnumber.inputValue()

        }
        return domesticBeneficiaryDetails

    }

    async getPayrollBeneficiaryDetails() {
        const domesticBeneficiaryDetails = {

            benName: await this.txtEmployeeNames.inputValue(),
            accountNumber: await this.accontNumber.inputValue()

        }
        return domesticBeneficiaryDetails

    }

    async getInternationalBeneficiaryDetails() {

        const internationalBeneficiaryDetails = {

            benName: await this.firstName.inputValue(),

        }


        return internationalBeneficiaryDetails

    }

    public async enterGroupNames(name: string) {
        await this.txtGroupName.clear();
        await this.txtGroupName.fill(name)
        const beneficiaryDetails = {

            beneficiaryDetails: {

                benName: await this.txtGroupName.inputValue(),

            },

        };

        // await Action.WriteToJsonFile("/apps/cxt-web-bb-e2e/test/data/test.json", beneficiaryDetails);

    }



    public async captureApprovedBeneficiaryDetails(action: string, group: string, email: string) {

        await this.txtBeneficiaryName.click();
        await this.txtBeneficiaryName.fill("d");
        (await Action.getRandomElementFromList(this.dropDownOptions)).click();

        await this.selectBeneficiaryGroup(group);
        await this.txtEmailAddress.type(email);

        const beneficiaryDetails = {
            beneficiaryName: await this.txtBeneficiaryName.inputValue(),
            categoryType: await this.ddlCategoryType.inputValue(),
            group: await this.ddlGrouop.inputValue(),
            beneficiaryReference: await this.txtBeneficiaryReference.inputValue(),
            statementReference: await this.txtStatementReference.inputValue(),
            systemId: await this.txtSystemId.inputValue(),
            emailAddress: await this.txtEmailAddress.inputValue(),
            noteForApprover: await this.txtNoteForApprover.inputValue(),

        }

        await Action.writeOrAppendJSONFile("/apps/cxt-web-bb-e2e/test/data/test.json", action, beneficiaryDetails);

    }

    public async capturePersonalBeneficiary(action: string, group: string, bankName: string, accountNumber: string, email: string, contactNumber: string) {

        await this.txtBeneficiaryName.type(`${action} ${Action.getRandomFirstName()} ${Action.generateNumericString(5)}`);
        await this.groupName.click();
        await this.dropDownOptions.nth(1).click();
        await this.selectBankName(bankName);
        await this.accountnumber.type(accountNumber)
        const beneficiaryDetails = {
            beneficiaryName: await this.txtBeneficiaryName.inputValue(),
            groupName: await this.txtBeneficiaryName.inputValue(),
            bankName: await this.bankName.inputValue(),
            accountNumber: await this.bankName.inputValue()
            // await beneficiaryPage.bankName.click();

        }

        await Action.writeOrAppendJSONFile("/apps/cxt-web-bb-e2e/test/data/test.json", action, beneficiaryDetails);

    }


    // public async capturePersonalBeneficiary() {

    //   await this.txtBeneficiaryNames.type()""
    //   await this.groupName.click();
    //   await this.dropDownOptions.nth(1).click();
    //   await this.selectBankName(bankName);
    //   await this.accountnumber.type(accountNumber)
    //   const beneficiaryDetails = {
    //     beneficiaryName: await this.txtBeneficiaryNames.inputValue(),
    //     groupName: await this.txtBeneficiaryNames.inputValue(),
    //     bankName: await this.bankName.inputValue(),
    //     accountNumber: await this.bankName.inputValue()
    //     // await beneficiaryPage.bankName.click();

    //   }

    //   await Action.writeOrAppendJSONFile("/apps/cxt-web-bb-e2e/test/data/test.json", action, beneficiaryDetails);

    // }









    public async delay(time) {
        return new Promise(function (resolve) {
            setTimeout(resolve, time)
        });
    }

    public async selectBeneficiaryGroup(groupName: string) {
        await this.ddlGrouop.click()
        await (this.iframe.getByRole('option', { name: groupName, exact: true })).click();
    }

    public async enterAccountNumber(accountNumber: string) {
        await this.accountnumber.fill(accountNumber)
    }
    public async enterReferences(References: string) {
        await this.beneficiaryRef.fill(References)
        await this.txtStatementReference.fill(References)

    }
    public async enterSystemId(systemID: string) {
        await this.txtSystemId.clear();
        await this.txtSystemId.fill(systemID)
    }

    public async enterEmailAddress(emails: string) {
        await this.txtEmailAddress.clear();
        await this.txtEmailAddress.fill(emails)
    }
    public async enterContactNumber(contacts: string) {
        await this.txtContactNumber.clear();
        await this.txtContactNumber.fill(contacts)
    }

    public async enterNote(Notes: string) {
        await this.noForApprover.fill(Notes)
    }
    public async getselectBank(bank: string) {
        if (bank == "Investec") {
            await this.bankName.fill("INVESTEC BANK LIMITED");
            await this.delay(3000);
            await page.keyboard.press('Enter');
        }
        else if (bank == "FNB") {
            await this.bankName.fill("FIRST NATIONAL BANK");
            await this.delay(3000);
            await page.keyboard.press('Enter');
        }
        else if (bank == "ABSA") {
            await this.bankName.fill("ABSA BANK");
            await this.delay(3000);
            await page.keyboard.press('Enter');
        }
        else if (bank == "Capitec") {
            await this.bankName.fill("CAPITEC BANK LIMITED");
            await this.delay(3000);
            await page.keyboard.press('Enter');
        }
        else if (bank == "Nedbank") {
            await this.bankName.fill("NEDBANK LIMITED");
            await this.delay(3000);
            await page.keyboard.press('Enter');
        }
        else if (bank == "Standard Bank") {
            await this.bankName.fill("STANDARD BANK");
            await this.delay(3000);
            await page.keyboard.press('Enter');
        }
        else if (bank == "African Bank") {
            await this.bankName.fill("AFRICAN BANK");
            await this.delay(3000);
            await page.keyboard.press('Enter');
        }
        else if (bank == "Discovery Bank") {
            await this.bankName.fill("DISCOVERY BANK");
            await this.delay(3000);
            await page.keyboard.press('Enter');
        }

    }



    async selectBankName(bankName: string) {
        await this.bankName.click();
        await this.iframe.locator("//button[@role='option' and .//*[contains(text(),'" + Banks["" + bankName + ""] + "')]]").click()
    }


    async clickSubmitButton(buttonName: string) {
        await page.waitForTimeout(3000)
        // await this.iframe.getByRole('button', { name: buttonName }).scrollIntoViewIfNeeded();
        await this.iframe.getByRole('button', { name: buttonName }).click();

    }

    public async clickContinueButton() {

        // expect(page.frameLocator('#sideloadCenter').locator("//h6[contains(.,'Reason for payment')]").count()).toEqual(1)
        await page.frameLocator('#sideloadCenter').getByRole('button', { name: 'Continue' }).click()
    }


    public async clickContinueButton2() {
        await expect(async () => {
            await page.frameLocator('#sideloadCenter').getByRole('button', { name: 'Continue' }).click();
            // await page.frameLocator(iframeId).locator("//h6[contains(.,'Reason for payment')]").isVisible();
        }).toPass({ timeout: 15000 });

        await page.frameLocator('#sideloadCenter').getByRole('button', { name: 'Continue' }).click();
        // await page.frameLocator('#sideloadCenter').getByRole('button', { name: 'Continue' }).click()
    }
    public async getBtnConfirmDecline() {
        await this.btnConfirmDecline.waitFor();
        await this.btnConfirmDecline.click()

    }
    public async getbtnSubmitForApprovals() {
        await this.btnSubmitForApprovals.waitFor();
        await this.btnSubmitForApprovals.click()

    }
    public async fnExecutivePayrollTab() {
        await this.executivePayrollTab.waitFor();
        await this.executivePayrollTab.click()

    }





    public async fnTabIntertational() {
        await this.tabIntertational.waitFor();
        await this.tabIntertational.click()

    }







    public async fnReadDataFromCvsFile() {
        type WorldCity = {
            name: string;
            country: string;
            subCountry: string;
            geoNamId: number;
        };

    }



    public async clicksubmitForApprovalButton() {
        await this.delay(3000);

        await this.btnSubmitForApproval.waitFor();
        await this.btnSubmitForApproval.click();
        await page.keyboard.press('Enter');


    }


    public async issuccessDisplayed() {
        const locator = this.iframe.locator("//a[contains(text(),'Success')]");
        await expect(locator).toContainText("Success");
    }
    public async selectBeneficiaryType(benfiType: string) {
        if (benfiType == "Individual") {
            await this.beneficiaryIndividual.click()
        }
        else if (benfiType == "Legal entity") {

            await this.beneficiaryLegalEntity.click()
        }
    }
    public async enterFirstName(firstNam: string) {
        await this.firstName.clear();
        await this.firstName.type(firstNam)
        const capturedName = await this.firstName.inputValue();
        const key = capturedName.toLocaleLowerCase();
        await Action.writeOrAppendJSONFile("/apps/cxt-web-bb-e2e/test/data/test.json", await Action.getFirstWordBeforeSpace(key), capturedName);

    }
    public async enterSecondName(lasttNam: string) {
        await this.lastName.fill(lasttNam)
    }

    public async selectGender(gen: string) {
        await this.genderDrop.click()
        if (gen == "Male") {
            await this.selectMaleGender.click()
        }
        else if (gen == "Female") {

            await this.selectFemaleGender.click()
        }

    }

    public async selectresidentialGroup(resGroup: string) {
        await this.iframe.locator("ui-form-dropdown #residentId").click()
        await this.iframe.getByRole('button', { name: 'South African', exact: true }).click()
    }
    public async selectInternationalBeneficiaryGroup(groupName: string) {
        this.ddlGrouop.click()
        await (this.iframe.getByRole('option', { name: groupName, exact: true })).click();
    }
    public async selectCountry(countryName: string) {
        await this.country.click()
        await this.delay(1000);
        await this.iframe.locator("//input[@placeholder='Select country']").nth(0).fill(countryName)
        await this.iframe.locator("//input[@placeholder='Select country']").nth(0).click();
        // await (this.iframe.getByRole('option', { name: countryName })).focus();
        await (this.iframe.getByRole('option', { name: countryName })).waitFor({ timeout: 10000 });
        await (this.iframe.getByRole('option', { name: countryName })).click();
        // await (this.iframe.getByRole('option', { name: countryName })).focus();
        //await (this.iframe.getByRole('option', { name: countryName })).click();

    }
    public async enterAddressDetails() {
        await this.streetAddress.fill("1 Eagles Groove")
        await this.surbub.fill("Midrand")
        await this.city.fill("Test")
        await this.province.fill("Gauteng")
        await this.postalCode.fill("1234")
    }
    public async enterApprovedBeneficiaryName(benName: string) {

        await this.approvedBeneficiaryName.click();
        await this.approvedBeneficiaryName.fill(benName);
        await this.delay(4000);
        await page.keyboard.press('Enter');
        const beneficiaryDetails = {

            beneficiaryDetails: {
                benName: await this.approvedBeneficiaryName.inputValue()
            },

        };
        await Action.WriteToJsonFile("/apps/cxt-web-bb-e2e/test/data/test.json", beneficiaryDetails);

    }
    public async enterEditBeneficiaryName(benfiNames: string) {
        await this.txtBeneficiaryName.waitFor();
        await this.txtBeneficiaryName.clear();
        await this.editBeneficaryName.fill(benfiNames)
    }

    lblpendingapprovalmessage(messageLabel: string): Locator {
        return this.iframe.locator('//h6[contains(text(),"' + messageLabel + '")]');
    }

    public async getActualAccountNumber(accountNumbers: string) {
        return page.frameLocator(iframeId).locator('//input[@formcontrolname="AccountNumber"]').fill(accountNumbers);
    }
    public async getSelectAllBenefiaries() {
        await this.selectAllBeneficiaries.click();
    }

    public async getclickSubmitForApproval(decOrAprro: string) {
        await this.iframe.locator('//span[contains(text(),"' + decOrAprro + '")]>> nth=1').click();
    }

    public async getselectBulkbeneficiaries(bulkInfo: string) {
        await this.clickDropDown.click();
        await this.searchBulkBeneficiary.fill(bulkInfo)
        await this.delay(2000);
        await this.clickBulkBeneficiary.click();
    }
    public async getFileToDownload(fileType: string) {
        await this.delay(2000);
        if (fileType == "PDF") {
            await this.downloadPdf.waitFor();
            await this.downloadPdf.click();
        }
        if (fileType == "CSV") {
            await this.downloadCSV.waitFor();
            await this.downloadCSV.click();
        }
        await this.delay(3000);
    }

    public async clickTabs(tab: string) {

        const tabs = Action.iframe.locator('//a[contains(text(),"' + tab + '")]').nth(0);

        if (await tabs.isEnabled()) {

            await tabs.click();

        } else {

            return true;

        }

    }

    public async getbeneficiaryToRestore() {
        await this.beneficiaryToRestore.click()
    }


    public async searchForBeneficiaryToRestore(restoreBen: string) {
        await this.searchBeneficiary.waitFor();
        await this.searchBeneficiary.click();
        await this.searchBeneficiary.fill(restoreBen);
        await this.delay(6000);


    }

    public async getClickManage() {
        if (await this.btnCrossClose.isVisible()) {
            await this.btnCrossClose.click();
        }
        await this.clickManage.waitFor();
        await this.clickManage.click();
    }

    public async getrestoreBeneficiary() {
        await this.restoreBeneficiary.waitFor();
        await this.restoreBeneficiary.click();

    }
    public async getrestoreInternationaltab() {
        await this.restoreInternationaltab.waitFor();
        await this.restoreInternationaltab.click();

    }

    public async getIBANNumber(iBAN: string) {
        await this.iban.clear();
        await this.iban.fill(iBAN)
    }
    public async getrestoreInvestecApprovedtab() {
        await this.restoreInvestecApprovaltab.waitFor();
        await this.restoreInvestecApprovaltab.click();
    }

    public async getGroupName(group: string) {
        await this.groupName.click();
        await this.groupName.clear();
        await this.groupName.fill(group);
    }

    public async clickrestoreInvestecApprovedtab() {
        await this.restoreInvestecApprovedtab.waitFor();
        await this.restoreInvestecApprovedtab.click();
    }

    public async getlblDownloadingHeading(val: String) {

        await this.downloadStatus.textContent();

    }
    public async getBeneficiaryToRestore() {
        await this.benToRestore.waitFor();
        await this.benToRestore.click();

    }
    public async getbenToRestoreArrow() {
        await this.benToRestoreArrow.waitFor();
        await this.benToRestoreArrow.click();

    }
    public async getbtnDeleteBeneficiary() {
        await this.btnDeleteBeneficiary.waitFor();
        await this.btnDeleteBeneficiary.click();

    }

    public async getlblDeleteSuccessHeading(val: string) {

        await this.lbldeletesuccess.textContent();

    }
    public async getTxtDeclineReason(reason: string) {
        await this.txtDeclineReason.clear();
        await this.txtDeclineReason.fill(reason)

    }
    public async getRestoreClickArrow() {
        await this.restorecheckArrow.waitFor();
        await this.restorecheckArrow.click();

    }
    public async getgroupcheckArrow() {
        await this.groupcheckArrow.waitFor();
        await this.groupcheckArrow.click();

    }
    public async getbtnDeleteTab() {
        await this.btnDeleteTab.waitFor();
        await this.btnDeleteTab.click();

    }
    public async getinternationalTab() {
        await this.internationalTab.waitFor();
        await this.internationalTab.click();

    }

    public async getbenTab() {
        await this.benTab.waitFor();
        await this.benTab.click();

    }

    public async fnbtnExecutivePayroll() {
        await this.btnExecutivePayroll.click();
    }

    public async fnBtnPayRoll() {
        await this.btnPayRoll.click();
    }


    public async enterEmployeeName(name: string) {
        await this.txtEmployeeNames.clear();
        await this.txtEmployeeNames.fill(name)
        const beneficiaryDetails = {

            beneficiaryDetails: {

                benName: await this.txtEmployeeNames.inputValue(),

            },

        };

        await Action.WriteToJsonFile("/apps/cxt-web-bb-e2e/test/data/test.json", beneficiaryDetails);

    }

    public async enterAddedBeneficiaryName(benName: string) {

        await this.approveBeneficiaryName.click();
        await this.approveBeneficiaryName.fill(benName);
        await this.delay(4000);
        await page.keyboard.press('Enter');
        const beneficiaryDetails = {

            beneficiaryDetails: {
                benName: await this.approveBeneficiaryName.inputValue(),
            },

        };
        await Action.WriteToJsonFile("/apps/cxt-web-bb-e2e/test/data/test.json", beneficiaryDetails);

    }


    public async getButtonSpan(submissionsButtons: string) {
        await this.iframe.locator('//span[contains(text(),"' + submissionsButtons + '")]').click();

    }
}