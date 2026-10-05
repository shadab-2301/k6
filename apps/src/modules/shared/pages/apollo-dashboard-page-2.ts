import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { hyPhenateString } from "../../../../helper/string-manipulation";
import Action from "../../../../helper/actions";
import { iframeId } from "../../../../config/global-configs";
import APIInterceptor from "../../../../helper/api-interceptor";
import { expect } from "@playwright/test";

export default class ApolloDashboardPage2 {
    async selectCompany(entityName: string) {
        await this.iframe.locator("//investec-online-basic-search-dropdown//div//button//ngb-highlight[text()='" + entityName + "']").click();
        await page.waitForTimeout(3000)

    }
    async openCompanySelectionDropdown() {
        await this.iframe.locator("//investec-online-basic-search-dropdown").click()
        await page.waitForTimeout(3000);
    }

    getLeftHandMenu(menu: string) {
        return page.locator('#leftNavMenuItems ul li').filter({ hasText: menu });
    }

    iframe: FrameLocator;
    topMenu: string;
    selectedProfile: string;

    constructor() {
        this.iframe = page.frameLocator(iframeId);
    }

    async getSelectedProfile() {
        const profileSelector = this.iframe.locator("//investec-online-profile-switcher//input");
        await profileSelector.waitFor();
        this.selectedProfile = await profileSelector.inputValue();
        const profileName = {
            selectedProfile: this.selectedProfile
        }
        await Action.writeOrAppendJSONFile("/test/data/test.json", 'profiles', profileName);
        return this.selectedProfile;
    }

    async getTopMenu(module: string) {
        this.topMenu = hyPhenateString(module);
        const dashboardMenu = module.replace(/\s+/g, '-');
        return this.iframe.locator(`//a[@id='nav-item-${this.topMenu}'] | //button[@slot='button' and text()='${module}']`).or(this.iframe.locator(`#nav-button-${dashboardMenu}`));
    }

    async clickTopMenu(menu: string) {
        let isCliked = false;
        let retryLimit = 3;
        while (!isCliked && retryLimit > 0) {
            try {
                this.getTopMenu(menu);
                (await this.getTopMenu(menu)).waitFor({ state: 'attached', timeout: 10000 })
                await (await this.getTopMenu(menu)).focus({ timeout: 5000 })
                await (await this.getTopMenu(menu)).click();
                expect((await this.getTopMenu(menu))).toBeFocused();
                return;
            } catch (error) {
                retryLimit--;
                await page.reload();
            }
        }

        throw new Error(`Failed to click top menu: ${menu} after multiple attempts`);

    }
    async getAccountNickName() {
        return this.iframe.locator("//a[@id='nav-item-list']");
    }

    async logout() {
        await page.locator("#loginLogoutButton").click();
    }

    async clickLeftHandMenu(menu: string) {
        console.log(`[ApolloDashboardPage2] Clicking left menu: "${menu}"...`);

        // Wait for dashboard stability - profile dropdown indicates authenticated state
        try {
            const profileDropdown = this.iframe.locator("#dropdown-typeahead");
            await profileDropdown.waitFor({ state: 'visible', timeout: 8000 }).catch(() => { });
            console.log(`[ApolloDashboardPage2] ✓ Dashboard authenticated`);
        } catch (e) { }

        // Wait for left nav menu items to stabilize
        await page.waitForTimeout(1000);

        // Multiple selector strategies
        const selectors = [
            `//div[@id='leftNavMenuItems']//li//span[contains(text(),'${menu}')]`,  // Case-flexible
            `//div[@id='leftNavMenuItems']//li//span[text()='${menu}']`,
            `//div[@id='leftNavMenuItems']//li//a[contains(text(),'${menu}')]`,
            `//li[contains(@class, 'nav-item')]//span[contains(text(),'${menu}')]`,
            `//li[contains(@class, 'nav-item')]//a[contains(text(),'${menu}')]`,
            `//a[contains(@class, 'navbar') and contains(text(),'${menu}')]`,
            `//*[@id='leftNavMenuItems']//*[contains(text(),'${menu}')]`,  // Any element with text
            `//span[contains(., '${menu}')]`  // Any span containing text
        ];

        let leftHandMenu = null;
        for (let i = 0; i < selectors.length; i++) {
            try {
                const locator = page.locator(selectors[i]);
                const count = await locator.count().catch(() => 0);
                if (count > 0) {
                    console.log(`[ApolloDashboardPage2] ✓ Found "${menu}" using selector ${i + 1}/${selectors.length}`);
                    leftHandMenu = locator.first();
                    break;
                }
            } catch (e) { }
        }

        if (!leftHandMenu) {
            // Debug: List all available menu items
            try {
                const allMenuItems = page.locator("div#leftNavMenuItems //*[self::span or self::a]");
                const count = await allMenuItems.count();
                console.log(`[ApolloDashboardPage2] Available menu items (${count} found):`);
                for (let i = 0; i < Math.min(count, 10); i++) {
                    const text = await allMenuItems.nth(i).textContent().catch(() => "");
                    console.log(`  [${i}] "${text}"`);
                }
            } catch (debugError) {
                console.log(`[ApolloDashboardPage2] Could not list menu items`);
            }
            throw new Error(`Menu item "${menu}" not found using 8 selector strategies`);
        }

        // Wait for visibility - NO PAGE RELOAD
        console.log(`[ApolloDashboardPage2] Waiting for visibility (10s)...`);
        try {
            await leftHandMenu.waitFor({ state: 'visible', timeout: 10000 });
            console.log(`[ApolloDashboardPage2] ✓ Visible`);
        } catch (error) {
            throw new Error(`Menu item "${menu}" not visible after 10s: ${error.message}`);
        }

        // Click with proper timeout
        console.log(`[ApolloDashboardPage2] Clicking...`);
        await leftHandMenu.click({ timeout: 3000 });
        console.log(`[ApolloDashboardPage2] ✓ Clicked successfully`);
    }

    async getSubNavigationMenu(subNavigationMenu: string) {
        subNavigationMenu.replace(/\((.*?)\)/g, '$1')
        return this.iframe.locator(`//a[@id='nav-link-${this.topMenu}-${hyPhenateString(subNavigationMenu)}'] |//a[@id='nav-link-transfers-${hyPhenateString(subNavigationMenu)}']`)
    }

    async getSubNavigationLink(subNavigationMenu: string) {
        subNavigationMenu.replace(/\((.*?)\)/g, '$1')
        return this.iframe.locator(`//a[contains(text(),'${subNavigationMenu}')]`)
    }


    async getMyApprovalSubNavigationMenu(subNavigationMenu: string) {
        subNavigationMenu.replace(/\((.*?)\)/g, '$1')
        return this.iframe.locator(`//a[contains(@id,'nav-link-${this.topMenu}-${hyPhenateString(subNavigationMenu)}')]`)
    }

    async getNavigationButton(buttonName: string) {
        return this.iframe.locator("//*[self::button or self::span][contains(text(), '" + buttonName + "')]");
    }

    async getTab(tab: string) {
        return this.iframe.locator("//a[@role='tab' and contains(., '" + tab + "')]")
    }

    async clickTab(tab: string) {
        return this.clickTopMenu(tab)
    }

    async getTabText(tab: string) {
        return (await this.getTab(tab)).textContent();
    }

    async getModulePageTitle() {
        return this.iframe.locator("//investec-online-header-body-primary//h1").textContent();
    }

    async getRecordsCount(locator: Locator) {
        const regex = /\d+/g;
        const numberOfRecords = (await locator.textContent()).match(regex);
        return numberOfRecords;
    }

    async clickBreadCrumb(breadcrumb: string) {
        const selectTab = this.iframe.locator(`//li[contains(@class, 'breadcrumb')]//a[contains(text(),'${breadcrumb}')]`).nth(0);
        await selectTab.waitFor({ state: 'attached', timeout: 10000 })
        await selectTab.click();
    }

    async registerAPI(key: string) {
        switch (key) {
            case "New receipt":
                await APIInterceptor.InterceptServiceCall("**/international-receipts*")
                break;
            default:
                break;
        }
    }


}