import { page } from "playwright-with-cucumber-checks"

export const closeRefresh = async () => {
    if (await page.locator("#ctaPlatformAlert").isVisible()) {
        await page.locator("#closePlatformAlert").click();
    }
}