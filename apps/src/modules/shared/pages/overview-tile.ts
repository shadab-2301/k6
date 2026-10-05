import { expect, Page } from "@playwright/test";
import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

export default class OverviewTile {

    //page locators
    static TileTitle_ByName = (tileTitle: string) => { return this.getIframe().locator("//div[@class='card card-count-summary h-100']//h5[contains(text(),'" + tileTitle + "')]//ui-tooltips//span") }
    static Tooltip = () => { return this.getIframe().locator("//ngb-tooltip-window") }
    static PrefilteredResultCount = (overviewSectionName: string, prefilteredResultName: string) => { return this.getIframe().locator("//investec-online-summary-type-count//h5[contains(text(),'" + overviewSectionName + "')]/..//a[text()=' " + prefilteredResultName + " ']//ui-tooltips//span") }

    // Static method to get the iframe
    private static getIframe(): FrameLocator {
        return page.frameLocator(iframeId);
    }

    //page action methods
    static async VerifyTileIsDisplayed(tileTitle: string) {
        await this.TileTitle_ByName(tileTitle).isVisible();
    }

    static async HoverOverTitle(tileTitle: string) {
        await this.TileTitle_ByName(tileTitle).hover();
    }

    static async VerifyTooltipIsDisplayed() {
        await this.Tooltip().isVisible();
    }

    static async GetPrefilteredResultCount(overviewSectionName: string, prefilteredResultName: string) {
        let count = await this.PrefilteredResultCount(overviewSectionName, prefilteredResultName).innerText();
        return Number(count)
    }

    static async ClickPrefilteredResultCount(overviewSectionName: string, prefilteredResultName: string) {
        await this.PrefilteredResultCount(overviewSectionName, prefilteredResultName).click();
    }

    static async VerifyUrlContainsText(expectedText: string) {
        await page.waitForTimeout(5000);
        const currentUrl = await page.url()
        const textExists = await currentUrl.includes(expectedText)
        expect(textExists).toBe(true);

    }
}