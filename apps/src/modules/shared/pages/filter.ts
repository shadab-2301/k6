import { FrameLocator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

class Filter {

  private static getIframe(): FrameLocator {
    return page.frameLocator(iframeId);
  }

  private static async getFilterModalFooter() {
    return await (await this.getFilterModal()).locator(`//div[contains(@class,'modal-footer')]`);
  }

  private static getFilterModal() {
    return this.getIframe().locator(`//ngb-modal-window[contains(@class,'bb-filter-modal')]`);
  }

  private static getFilterBody() {
    return this.getFilterModal().locator(`//div[contains(@class,'modal-body')]`);
  }

  static async getFilterSection(section: string) {
         return this.getFilterBody().locator(`//h6[normalize-space(.)='${section}']`);
  }

  static async clickFilterSectionValue(header: string, buttonname: string) {
     await (await this.getFilterSection(header)).locator(`xpath=following-sibling::div//ui-button//span[normalize-space(.)='${buttonname}']`).click();
  }

  static async clickButton(buttonName: string) {
    return await (await this.getFilterModalFooter()).locator(`//button/span[contains(.,'${buttonName}')]`).click();
  }

  static async setSearchFilterValue(filterValue: string) {
    return (await this.getSearchFielsd()).fill(filterValue);
  }

  static async getSearchFielsd() {
    return this.getFilterBody().locator(`//input[@placeholder='Search']`);
  }

  static async isFilterSectionVisible(section: string) {
    return (await this.getFilterSection(section)).isVisible();
  }

}

export default Filter;
