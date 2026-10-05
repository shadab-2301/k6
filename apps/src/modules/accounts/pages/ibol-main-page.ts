import { expect, FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";
import { IBOL } from "../../../utilities/utilities/ibol-utilities";
import FilterMenu from "../../international-receipts/pages/FilterMenu";
import moment from "moment";


export default class IBOLMainPage {

  private static getIframe(): FrameLocator {
    return page.frameLocator(iframeId);
  }

  static getApplyButton = async () => {
    const filterMenu = await this.getIframe().locator("[aria-labelledby='offcanvas-filter-title']");
    return filterMenu.getByRole('button', { name: 'Apply' }).or(this.getIframe().locator("//button/span[contains(.,'Apply')]"));
  }

  static getTableHeadeLocatorByName= async (option: string = "All")=> {
    return await this.getIframe().locator("//ul[contains(@class,'nav nav-tabs')]").getByText(option);
  }

  static async multiSortBy(category, options) {
    let interceptApi = "api"
    if (category.toLowerCase().trim() == "accounts") {
      interceptApi = "tbba/api/v2/accounts/Overview";
    }
    for (let i = 0; i < options.length; i++) {
      const responseJson = await IBOLMainPage.sortBy(options[i].trim(), interceptApi);
      expect(await responseJson.data.length).toBeGreaterThan(0)
    }
  }


  static async getDropdownOptions(anchorSelector: string) {
    const frame = this.getIframe();
    await frame.locator(anchorSelector).click();
    const options = frame.locator(`${anchorSelector} + .dropdown-menu > button`);
    await options.first().waitFor({ state: 'visible' });

    return options;
  }

  static async getDropDownSelect() {
    return this.getIframe().locator('select[name="select-count"]');
  }

  /**
   * 
   * @param dropdownbth  Locator of the dropdown button to click
   * @param optionText 
   * @returns 
   */
  static clickDropdownOption = async (dropdownbth: Locator, optionText: string) => {
    const options = await this.getDropdownOptions('#actionsDropdown');
    await options.filter({ hasText: 'Single' }).first().click();
  }

  async filterBy(field: string) {

    await FilterMenu.openFilterMenu()
    await FilterMenu.selectFilterOption(field);
    await FilterMenu.ApplyFilters();

  }

  /**
   * 
   * @params filterheader,filteroptions in the form of array of objects 
   * [
   *  {FilterType: "Status", Option: "Active"},
   *  {FilterType: "Card type", Option: "Virtual"}
   * ] 
   * @returns Promise resolving to the response data object from the intercepted API call.
   */
  static async newfilterBy(filterOptions: { FilterType: string, Option: string }[]) {

    await FilterMenu.openFilterMenu()

    for (const { FilterType, Option } of filterOptions) {
      await FilterMenu.newFilter(FilterType, Option);
    }
    const btn = await FilterMenu.getApplyButton();

    const { responseJson } = await IBOL.clickAndInterceptResponse(btn, "/za/tbba/api/");

    return responseJson;


  }

  static async getSearchLocator() {

    const searchById = this.getIframe().locator("#basic-search").first();
    const searchByPlaceholder = this.getIframe().getByPlaceholder(new RegExp("^Search", "i")).first();

    let searchInputLocator = searchById;

    const isIdVisible = await searchById.isVisible().catch(() => false);
    const isPlaceholderVisible = await searchByPlaceholder.isVisible().catch(() => false);

    if (!isIdVisible && isPlaceholderVisible) {
      searchInputLocator = searchByPlaceholder;
    }

    return searchInputLocator;
  }

  /**
 Performs a search using the provided term.
 @param searchTerm Search value entered into the basic search field.
 @returns Promise resolving to the response data object from the intercepted API call.
 */
  static async search(searchTerm: string, interceptedapi: string = "api") {
    const searchInput = await this.getSearchLocator();
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill("", { force: true });
    return IBOL.fillAndInterceptResponse(searchInput, searchTerm, interceptedapi);
  }


  static async getSearchInputValue() {
    const searchInput = await this.getSearchLocator();
    return await searchInput.inputValue();
  }

  /**
   * Performs a sort using the provided term.
   * @param sortTerm Sort value selected from the sort dropdown.
   * @returns Promise resolving to the response data object from the intercepted API call.
   */
  static async sortBy(sortTerm: string,category: string="accounts") {
    let endpoint: string = "api";

    if (category.toLowerCase().trim() == "accounts") {
      endpoint = "tbba/api/v2/accounts/Overview";
    }


    const sortDropdown = this.getIframe().locator("#bb-sort-dropdown");

    if (!await sortDropdown.isVisible({ timeout: 5000 })) {
      throw new Error(`Sort dropdown is not visible on the page. ${page.url()}`);
    }

    if (!await sortDropdown.isEnabled({ timeout: 5000 })) {
      throw new Error(`Sort dropdown is disabled}`);
    }

    await IBOL.click(sortDropdown);

    const dropdownOptionsList = this.getIframe().locator("#bb-sort-dropdown ~ .dropdown-menu .dropdown-item");

    for (let i = 0; i < await dropdownOptionsList.count(); i++) {
      const currentOption = dropdownOptionsList.nth(i);
      const optionText = await currentOption.innerText();

      if (optionText.toLocaleLowerCase().replace(/\s+/g, '').trim() === sortTerm.toLocaleLowerCase().replace(/\s+/g, '').trim()) {
        const responseJson = await IBOL.clickAndInterceptResponse(currentOption, endpoint);

        await expect(async () => {
          const finalSortValue = await (await sortDropdown.allInnerTexts())[0].replace("Sort by:\n", " ").trim();
          expect(finalSortValue.toLocaleLowerCase().replace(/\s+/g, '').trim()).toBe(sortTerm.toLocaleLowerCase().replace(/\s+/g, '').trim())
        }).toPass({ timeout: 10000 });

        return responseJson;
      };

    }

    throw new Error(`Sort option "${sortTerm}" not found in the dropdown. Available options: ${await dropdownOptionsList.allInnerTexts()}`);

  }


  static async sortByHeader(sortTerm: string) {

    const tableHeaderName = sortTerm.trim().toLowerCase().replace(/\s+/g, '-');
    const sortHeader = this.getIframe().locator(`#sort-${tableHeaderName}`);
    await IBOL.clickAndInterceptResponse(sortHeader, "api");
    await page.waitForTimeout(1000);
  }

  static async setDateRange(startMonth: string, endMonth: string) {

    await this.setStartDate(startMonth);
    await this.setEndDate(endMonth);
    await (await this.getApplyButton()).click();
  }

  static async setStartDate(startMonth: string) {
    const startDateInput = this.getIframe().locator('#fromDate');

    await startDateInput.waitFor({ state: 'visible' });
    const currentValue = await startDateInput.inputValue();
    const currentDate = moment(currentValue, 'DD/MM/YYYY', true);
    const monthsToOffset = parseInt(startMonth, 10);
    await this.validateValues(currentDate, monthsToOffset);
    const targetStartDate = currentDate.subtract(monthsToOffset, 'months').format('DD/MM/YYYY');

    await startDateInput.fill(targetStartDate);
  }

  static async setEndDate(endMonth: string) {
    const endDateInput = this.getIframe().locator("#toDate");

    await endDateInput.waitFor({ state: 'visible' });

    const currentValue = await endDateInput.inputValue();

    const currentDate = moment(currentValue, 'DD/MM/YYYY', true);
    const monthsToOffset = parseInt(endMonth, 10);

    await this.validateValues(currentDate, monthsToOffset);

    const targetEndDate = currentDate.add(monthsToOffset, 'months').format('DD/MM/YYYY');

    await endDateInput.fill(targetEndDate);
  }

  static async validateValues(currentDate, offset) {
    if (!currentDate.isValid()) {
      throw new Error(`Invalid end date value: "${currentDate}"`);
    }

    if (Number.isNaN(offset)) {
      throw new Error(`Invalid endMonth value: "${offset}"`);
    }
  }

}