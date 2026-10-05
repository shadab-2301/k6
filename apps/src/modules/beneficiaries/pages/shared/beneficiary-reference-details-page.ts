import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import Action from "../../../../../helper/actions";
import { IBeneficiaryReferences } from "../../types/beneficiary-reference-interface";
import { iframeId } from "../../../../../config/global-configs";


export default class BeneficiaryReferenceDetails {
  iframe: FrameLocator;

  readonly txtBeneficiaryReference: Locator;
  readonly txtStatementReference: Locator;
  readonly txtSystemId: Locator;

  capturedReferenceDetails;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.txtBeneficiaryReference = this.iframe.locator('//input[@formcontrolname="BeneficiaryReference"]');
    this.txtStatementReference = this.iframe.locator('//input[@formcontrolname="MyReference"]');
    this.txtSystemId = this.iframe.locator('//input[@formcontrolname="MySystemId"]');
  }

  async captureBeneficairyReferences() {
    await this.txtBeneficiaryReference.fill(Action.generateAlphaNumericString(14))
    await this.txtStatementReference.fill(Action.generateAlphaNumericString(14))
    await this.txtBeneficiaryReference.fill(Action.generateNumericString(8));
    this.capturedReferenceDetails = await this.getCapturedReferenceDetails();
  }

  async getCapturedReferenceDetails() {
    const beneficiaryReferenceDetails: IBeneficiaryReferences = {
      beneficiaryReference: await this.txtBeneficiaryReference.inputValue(),
      statementReference: await this.txtStatementReference.inputValue(),
      systemID: await this.txtSystemId.inputValue()
    }
    return beneficiaryReferenceDetails;
  }

}