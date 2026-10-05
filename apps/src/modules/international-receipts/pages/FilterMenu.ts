import { expect, Page } from "@playwright/test";
import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

export default class FilterMenu {

    //page locators
    static FilterMenu = () => { return this.getIframe().locator("svg[name='filter']") };
    static FilterChip = (expectedText: string) => { return this.getIframe().locator("//ui-button/button//span[text()=' " + expectedText + " ']") }
    static FilterChip_Any = () => { return this.getIframe().locator("//ui-button//button[@class='btn btn-primary me-2 btn-default']") }
    static FilterSearchInput = () => { return this.getIframe().locator("//investec-online-filter-search//input") }
    static FilterByName = (filterName: string) => { return this.getIframe().locator("//investec-online-filter-val//span[text()='" + filterName + " ']") }
    static FilterBtn = (btnText: string) => { return this.getIframe().locator("//div[@class='modal-footer']//span[text()=' " + btnText + " '] | //ui-button//span[text()=' " + btnText + " ']") }
    private static iframe: FrameLocator;

    // Static method to get the iframe
    private static getIframe(): FrameLocator {
        return page.frameLocator(iframeId);
    }

    //page action methods
    static async openFilterMenu() {
        await this.FilterMenu().click();
    }

    static async selectCurrency(currencyType: string) {
        await this.FilterByName(currencyType).click();
    }

    static async newFilter(status: string = "Card Type", option: string = "Physical card") {


        let filters = await this.getIframe().locator("//ngb-offcanvas-panel[@aria-labelledby='offcanvas-filter-title']//investec-online-filter-type//input[contains(@id,'filter-input-dropdown-')]");

        const count = await filters.count();

        for (let index = 0; index < count; index++) {
            const filter = filters.nth(index);
            const filterValue = await filter.getAttribute("id");

            const target = `filter-input-dropdown-${status}`;//.replace(/\s/g, '').trim().toLowerCase()
            //.replace(/\s/g, '-')}`)
            if (filterValue.replace(/\s/g, '').trim()?.toLowerCase() === target.replace(/\s/g, '').trim().toLowerCase()) {
                await filter.click();
                try {
                    const target = await this.getIframe().getByRole('checkbox', { name: new RegExp(option, 'i') });
                    await target.check();
                } catch (e) {
                    try {
                        const target = await this.getIframe().getByLabel(option, { exact: true });
                        await target.check();
                    } catch (e) {
                        throw new Error(`Option ${option} not availble for selection or match multiple elements`)
                    }
                }
                break;
            }
        }

    }

    static async applyFilters() {
        const filterMenu = await this.getIframe().locator("[aria-labelledby='offcanvas-filter-title']");
        return filterMenu.getByRole('button', { name: 'Apply' });
    }

    static getApplyButton = async () => {
        const filterMenu = await this.getIframe().locator("[aria-labelledby='offcanvas-filter-title']");
        return filterMenu.getByRole('button', { name: 'Apply' });
    }


    static async selectFilterOption(currencyType: string) {
        const locator = this.getIframe().locator(`//investec-online-filter-val//*[contains(text(),"${currencyType}")]`)
        await locator.first().click({ timeout: 2000 });
    }


    static async VerifyFilterChipIsDisplayed(expectedFilterChipText: any) {
        await this.FilterChip(expectedFilterChipText).isVisible()
    }

    static async ApplyFilters() {
        await this.FilterBtn("Apply").click();
    }

    static async CancelFilters() {
        await this.FilterBtn("Cancel").click();
    }

    static async ClearFilters() {
        await this.FilterBtn("Clear").click();
    }

    static async CountFilterchipsDisplayed() {
        return await this.FilterChip_Any().count()
    }

    static async GetAllFilterchipText() {
        let appliedFilter = [];

        const count = await this.FilterChip_Any().count()

        for (let index = 0; index < count; index++) {
            appliedFilter.push(await this.FilterChip_Any().nth(index).allInnerTexts())
        }

        //return array of applied filters
        return appliedFilter;
    }

    static async ClearAllFilters() {
        await this.FilterBtn("Clear all").first().click();
    }

    static async VerifyNoFilterchipsExist() {
        const isVisible = await this.FilterChip_Any().isVisible()
        expect(isVisible).toBe(false)
    }
}