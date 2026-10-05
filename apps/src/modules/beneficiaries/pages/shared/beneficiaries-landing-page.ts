import { FrameLocator, page } from "playwright-with-cucumber-checks";
import { hyPhenateString } from "../../../../../helper/string-manipulation";
import { iframeId } from "../../../../../config/global-configs";



export default class BeneficiariesLanding {
  static iframe: FrameLocator;


  constructor() {
    BeneficiariesLanding.iframe = page.frameLocator(iframeId);
  }

  static async getApprovalType(type: string) {
    return BeneficiariesLanding.iframe.locator(`//a[@id='nav-item-${type}']`)
  }

  static async getTopMenu(module: string) {
    return BeneficiariesLanding.iframe.locator(`//a[@id='nav-item-${hyPhenateString(module)}']`)
  }

  static async getBeneficiaryType(beneficiaryType: string) {
    return BeneficiariesLanding.iframe.locator(`//a[@id='nav-link-beneficiaries-${hyPhenateString(beneficiaryType)}']`)
  }

  static async getBeneficiaryCard(beneficiaryType: string) {
    return BeneficiariesLanding.iframe.locator(`//h6[text() = ' ${beneficiaryType} ']//parent::div//button`)
  }

}