import { FrameLocator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../../config/global-configs";

export default class BeneficiariesDeclined {
   static iframe: FrameLocator;

 private static getIframe(): FrameLocator {
        return page.frameLocator(iframeId);
    }

  static async getBeneficiaryHeader(type: string) {
   await this.getIframe().locator(`//h3[contains(.,"${type}")]`).waitFor({ state: 'attached',timeout:120000 })
   return this.getIframe().locator(`//h3[contains(.,"${type}")]`)
  }

  static async getHeaderText(headername: string) {
    return  (await this.getBeneficiaryHeader(headername)).textContent();
  }

   static async getBeneficiaryID() {
    return this.getValueByHeaderName("Beneficiary ID");
  }

  static async getValueByHeaderName(type: string) {
    const value = await this.getIframe().locator(`//div[h6[contains(text(), '${type}')] and div]`).innerText({timeout:12000});
    return value.replace(type,"").trim();
  }

}