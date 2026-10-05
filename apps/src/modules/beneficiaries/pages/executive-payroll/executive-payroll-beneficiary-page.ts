import BeneficiaryReferenceDetails from "../shared/beneficiary-reference-details-page";
import BeneficiaryBankingDetails from "../shared/beneficiary-banking-details-page";
import { BENEFICIARY_TYPES } from "../../types/beneficiary-types-consts";
import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import Action from "../../../../../helper/actions";
import { getUserDetails } from "../../../shared/services/user-service";
import { iframeId } from "../../../../../config/global-configs";

export default class ExecutivePayrollBeneficiary {
  iframe: FrameLocator;
  readonly txtEmployeeName: Locator;
  readonly txtGroupName: Locator;
  readonly optGrops: Locator;
  capturedBeneficiaryDetails = new Array();
  readonly bankDetails: BeneficiaryBankingDetails;
  readonly beneficiaryReference: BeneficiaryReferenceDetails;
  readonly txtNoteForApprover: Locator;


  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.txtEmployeeName = this.iframe.locator('//input[@placeholder="Enter employee name"]');
    this.txtGroupName = this.iframe.locator("//label[contains(.,'Group')]//parent::div//div//input");
    this.optGrops = this.iframe.locator("//label[contains(.,'Group')]//parent::div//div//button[@role='option']")
    this.txtNoteForApprover = this.iframe.locator("form textarea[formcontrolname='NoteForApprover']");
    this.bankDetails = new BeneficiaryBankingDetails()
    this.beneficiaryReference = new BeneficiaryReferenceDetails()
  }

  async completePayrollBeneficiaryForm(bank: string, accountNo: string) {
    await this.txtEmployeeName.fill(`${Action.getRandomFullName()}  ${Action.generateNumericString(4)}`)
    await this.bankDetails.captureBankDetails(bank, accountNo);
    await this.beneficiaryReference.captureBeneficairyReferences();
    await this.txtNoteForApprover.fill("Please approve");

    const beneficiaryDetails = {
      details: {
        benName: await this.txtEmployeeName.inputValue(),
        accountNumber: await this.bankDetails.txtAccountnumber.inputValue(),
        profile: (await getUserDetails()).profile
      },
    };
    this.capturedBeneficiaryDetails.push(beneficiaryDetails.details)
  }


}