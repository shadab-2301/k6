import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import { ApolloModuleNavMenu } from "../../../../test/data/page-details-const";
import { iframeId } from "../../../../config/global-configs";

export default class ApolloMenuNagivation {
  iframe: FrameLocator;
  lblModuleHeading: Locator;
  lnkNavItem: Locator;


  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.lblModuleHeading = this.iframe.locator("//h1")
    this.lnkNavItem = this.iframe.locator("//ul[@class='nav disable-hover']//a");
  }

  async getPageHeading() {
    const pageTitle = (await this.iframe.locator("//h5[contains(@class,'text-white')]").textContent()).trim();
    return pageTitle;
  }
  async getPageSubHeading() {
    const pageSubHeading = (await this.iframe.locator("//p[contains(@class,'semi-bold')]").textContent()).trim();
    return pageSubHeading;
  }
  async getLableInstruction() {
    const pageTitle = (await this.iframe.locator("//p[contains(@class,'medium')]").textContent()).trim();
    return pageTitle;
  }




  public async selectMenuOption(menuOption: string) {
    await this.iframe
      .locator('//a[contains(text(),"' + menuOption + '")]')
      .click();
  }

  async clickFormProceedButton() {
    await this.iframe.locator("//button[contains(@class,'btn-primary')]").click();
  }

  async getActiveNavMenuLinks(menu: string) {
    expect(await this.lnkNavItem.nth(0).textContent()).toEqual(ApolloModuleNavMenu.BENEFICIARY[0]);

    expect((await this.lnkNavItem.allTextContents())).toEqual(ApolloModuleNavMenu.BENEFICIARY)
  }

  getActiveTab(tab: string) {
    return this.iframe.locator("//a[@id='nav-link-active-'" + tab + "'']");
  }

}
