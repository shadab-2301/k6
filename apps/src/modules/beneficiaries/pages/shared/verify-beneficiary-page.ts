import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import Action from "../../../../../helper/actions";
import { iframeId } from "../../../../../config/global-configs";


export default class VerifyBeneficiaryPage {
  iframe: FrameLocator;
  readonly lblHeading: Locator;
  readonly lblSubHeading: Locator;
  readonly lblTotalPendingAddition: Locator;
  readonly tabBeneficiaryAccordion: Locator;
  readonly lblBeneficiaryAccordionTitle: Locator;
  readonly lblBeneficiaryName: Locator;
  readonly lblBeneficiaryReference: Locator;
  readonly lblCategoryType: Locator;
  readonly lblMyReference: Locator;
  readonly lblMySystemId: Locator;
  readonly lblEmailAddress: Locator;
  readonly lblGroup: Locator;
  readonly lblNoteForApprover: Locator;
  readonly verifyColumns: Locator;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.lblHeading = this.iframe.locator("//investec-online-verify-container//h5")
    this.lblSubHeading = this.iframe.locator("//investec-online-verify-container//h5//following-sibling::p")
    this.lblTotalPendingAddition = this.iframe.locator("//investec-online-footer-call-to-action//p")
    this.tabBeneficiaryAccordion = this.iframe.locator("//ngb-accordion[@role='tablist']");
    this.lblBeneficiaryAccordionTitle = this.iframe.locator("//div[@id='openDefault-header']//span")
    this.lblBeneficiaryName = this.iframe.locator("//h6[.='Beneficiary name']//following-sibling::span")
    this.lblBeneficiaryReference = this.iframe.locator("//h6[.='Beneficiary reference']//following-sibling::span")
    this.lblCategoryType = this.iframe.locator("//h6[.='Category type']//following-sibling::span")
    this.lblMyReference = this.iframe.locator("//h6[.='My reference']//following-sibling::span")
    this.lblMySystemId = this.iframe.locator("//h6[.='My system ID']//following-sibling::span")
    this.lblEmailAddress = this.iframe.locator("//h6[.='Email address']//following-sibling::p//span")
    this.lblGroup = this.iframe.locator("//h6[.='Group']//following-sibling::span")
    this.lblNoteForApprover = this.iframe.locator("//h6[.='Note for approver']//following-sibling::p")
    this.verifyColumns = this.iframe.locator("h6");
  }

  async verifyBeneficiaryDetails(action: string) {
    let pendingBeneficiary: any;
    const benDetails = await Action.ReadFileContent("/apps/cxt-web-bb-e2e/test/data/test.json");
    const beneficiaryDetails = JSON.parse(benDetails);
    if (action == "decline") {
      pendingBeneficiary = beneficiaryDetails.decline[beneficiaryDetails.decline.length - 1];
    } else {
      pendingBeneficiary = beneficiaryDetails.approve[beneficiaryDetails.approve.length - 1];

    }
    expect((await this.lblBeneficiaryName.textContent())?.trim()).toEqual(this.verifyField(pendingBeneficiary.beneficiaryName))
    expect((await this.lblCategoryType.textContent())?.trim()).toEqual(this.verifyField(pendingBeneficiary.categoryType))
    expect((await this.lblGroup.textContent())?.trim()).toEqual(this.verifyField(pendingBeneficiary.group))
    expect((await this.lblBeneficiaryReference.textContent())?.trim()).toEqual(this.verifyField(pendingBeneficiary.beneficiaryReference))
    expect((await this.lblMyReference.textContent())?.trim()).toEqual(this.verifyField(pendingBeneficiary.statementReference))
    expect((await this.lblMySystemId.textContent())?.trim()).toEqual(this.verifyField(pendingBeneficiary.systemId || "-"))
    expect((await this.lblEmailAddress.textContent())?.trim()).toEqual(this.verifyField(pendingBeneficiary.emailAddress || "-"))
    expect((await this.lblNoteForApprover.textContent())?.trim()).toEqual(this.verifyField(pendingBeneficiary.noteForApprover || "-"))
  }

  verifyField(field: string) {
    return field || "-"
  }


  public async getTableHeading(position: number) {
    await this.verifyColumns.nth(0).waitFor();
    return (await this.verifyColumns.nth(position).textContent());
  }


}

export const VerifyBeneficiaryDetailsCols = {
  BeneficairyName: "Beneficiary name",
  BankName: "Bank name",
  BranchCode: "Branch code",
  AccountNumber: "Account number",
  BeneficiaryReference: "Beneficiary reference",
  StatementReference: "Statement Reference",
  MySystemId: "My system ID",
  Group: "Group",
  EmailAddress: "Email address",
  ContactNumber: "Contact number",
  Note: "Note for approver"
} as const;
