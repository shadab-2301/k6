import BeneficiaryReferenceDetails from "../shared/beneficiary-reference-details-page";
import BeneficiaryBankingDetails from "../shared/beneficiary-banking-details-page";
import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import Action from "../../../../../helper/actions";
import { getUserDetails } from "../../../shared/services/user-service";
import Navigation from "../../../shared/pages/navigation-page";
import { IDomesticBeneficiary } from "../../types/domestic-beneficiary-interface";
import BeneficiaryContact from "../shared/beneficiary-contacts-page";
import { iframeId } from "../../../../../config/global-configs";

export default class DomesticBeneficiary {
  iframe: FrameLocator;
  readonly txtBeneficiaryName: Locator;
  readonly txtGroupName: Locator;
  readonly optGrops: Locator;
  readonly chkSelectAll: Locator;
  capturedBeneficiaryDetails: IDomesticBeneficiary;
  readonly bankDetails: BeneficiaryBankingDetails;
  readonly beneficiaryReference: BeneficiaryReferenceDetails;
  readonly beneficiaryContacts: BeneficiaryContact;
  readonly txtNoteForApprover: Locator;


  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.chkSelectAll = this.iframe.locator("//input[@id='isSelectAll']//parent::div") // to clean up
    this.txtBeneficiaryName = this.iframe.locator('//input[@placeholder="Enter beneficiary name"]');
    this.txtGroupName = this.iframe.locator("//label[contains(.,'Group')]//parent::div//div//input");
    this.optGrops = this.iframe.locator("//label[contains(.,'Group')]//parent::div//div//button[@role='option']")
    this.txtNoteForApprover = this.iframe.locator("form textarea[formcontrolname='NoteForApprover']");
    this.bankDetails = new BeneficiaryBankingDetails()
    this.beneficiaryReference = new BeneficiaryReferenceDetails()
    this.beneficiaryContacts = new BeneficiaryContact()
  }

  async completeDomesticBeneficiaryForm(bank: string, accountNo: string, beneficiaryname: string="") {
    (beneficiaryname !== "") ? await this.txtBeneficiaryName.fill(beneficiaryname) :
      await this.txtBeneficiaryName.fill(`${Action.getRandomFullName()}  ${Action.generateNumericString(4)}`);
    
    await this.bankDetails.captureBankDetails(bank, accountNo);
    await this.beneficiaryReference.captureBeneficairyReferences();
    await this.txtNoteForApprover.fill("Please approve");

    const beneficiaryDetails = {
      details: {
        benName: await this.txtBeneficiaryName.inputValue(),
        accountNumber: await this.bankDetails.txtAccountnumber.inputValue(),
        profile: "" // Need to come back and retrieve profile name
      },
    };
    this.capturedBeneficiaryDetails = await this.getCapturedBeneficiaryDetails()
  }

  async capatureBenToDO(benName: string, bank: string, accountNo: string) {

    await this.txtBeneficiaryName.fill(benName);
    await page.keyboard.press("Tab");
    // await this.txtBeneficiaryName.fill(`${Action.getRandomFullName()}  ${Action.generateNumericString(4)}`)
    // await this.bankDetails.captureBankDetails(bank, accountNo);
    // await this.beneficiaryReference.captureBeneficairyReferences();
    // await this.txtNoteForApprover.fill("Please approve");

    // const beneficiaryDetails = {
    //   details: {
    //     benName: await this.txtBeneficiaryName.inputValue(),
    //     accountNumber: await this.bankDetails.txtAccountnumber.inputValue(),
    //     profile: "" // Need to come back and retrieve profile name
    //   },
    // };
    // this.capturedBeneficiaryDetails = await this.getCapturedBeneficiaryDetails()
  }

  async completeMultipleBeneficiary(bank: string, accountNo: string) {
    await this.txtBeneficiaryName.fill(`${Action.getRandomFullName()}  ${Action.generateNumericString(4)}`)
    await this.bankDetails.captureBankDetails(bank, accountNo);
    await this.beneficiaryReference.captureBeneficairyReferences();
    await this.txtNoteForApprover.fill("Please approve");

    const beneficiaryDetails = {
      details: {
        benName: await this.txtBeneficiaryName.inputValue(),
        accountNumber: await this.bankDetails.txtAccountnumber.inputValue(),
        profile: ''
      },
    };
    await Navigation.getNavigationButton("Done")
    if (bank != undefined || bank != null) {
      await Navigation.getNavigationButton("Add another beneficiary")
    }
    await Action.writeOrAppendJSONFile("/test/data/test.json", "domesticBeneficiaries", this.capturedBeneficiaryDetails);
  }

  async getCapturedBeneficiaryDetails() {
    const beneficiaryDetails: IDomesticBeneficiary = {
      beneficiaryName: await this.txtBeneficiaryName.inputValue(),
      beneficiaryGroup: await this.txtGroupName.inputValue(),
      bankDetails: await this.bankDetails.getCapturedBankDetails(),
      beneficiaryReferences: this.beneficiaryReference.capturedReferenceDetails,
      beneficiaryContacts: this.beneficiaryContacts.capturedContactDetails,
      noreForApprover: await this.txtNoteForApprover.inputValue()
    }
    return beneficiaryDetails;
  }

  async saveBeneficiaryDetails() {
    // this.capturedBeneficiaryDetails.push(this.beneficiaryDetails.details)
    await Action.writeOrAppendJSONFile("/test/data/test.json", "domesticBeneficiaries", this.capturedBeneficiaryDetails);
  }

}