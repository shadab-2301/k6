import BeneficiaryReferenceDetails from "../shared/beneficiary-reference-details-page";
import BeneficiaryBankingDetails from "../shared/beneficiary-banking-details-page";
import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { getUserDetails } from "../../../shared/services/user-service";
import Action from "../../../../../helper/actions";
import { iframeId } from "../../../../../config/global-configs";


export default class ApprovedBeneficairy {
  iframe: FrameLocator;
  readonly txtBeneficiaryName: Locator;
  readonly txtCategoryType: Locator;
  readonly txtGroupName: Locator;
  readonly optGrops: Locator;
  capturedBeneficiaryDetails = new Array();
  readonly bankDetails: BeneficiaryBankingDetails;
  readonly beneficiaryReference: BeneficiaryReferenceDetails;
  readonly txtNoteForApprover: Locator;


  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.txtBeneficiaryName = this.iframe.locator('//input[@placeholder="Enter beneficiary name"]');
    this.txtGroupName = this.iframe.locator("//label[contains(.,'Group')]//parent::div//div//input");
    this.txtCategoryType = this.iframe.locator("//label[contains(.,'Category')]//following-sibling::input");
    this.optGrops = this.iframe.locator("//button[@role='option']")
    this.txtNoteForApprover = this.iframe.locator("form textarea[formcontrolname='NoteForApprover']");
    this.bankDetails = new BeneficiaryBankingDetails()
    this.beneficiaryReference = new BeneficiaryReferenceDetails()
  }

  async completeApprovedBeneficiaryForm(beneficiaryName: string) {
    await this.txtBeneficiaryName.click();
    await this.txtBeneficiaryName.fill(beneficiaryName)
    await this.optGrops.first().click();
    // await this.txtBeneficiaryName.fill(`${Action.getRandomFullName()}  ${Action.generateNumericString(4)}`)
    // await this.bankDetails.captureBankDetails(bank, accountNo);
    // await this.beneficiaryReference.captureBeneficairyReferences();
    // await this.txtNoteForApprover.fill("Please approve");

    const beneficiaryDetails = {
      details: {
        benName: await this.txtBeneficiaryName.inputValue(),
        profile: ''
      },
    };
    this.capturedBeneficiaryDetails.push(beneficiaryDetails.details)
  }

  async saveApprovedBeneficiary() {
    for (const obj of this.capturedBeneficiaryDetails) {
      await Action.writeOrAppendJSONFile("/test/data/test.json", "approvedBeneficiaries", this.capturedBeneficiaryDetails);
    }
  }


}