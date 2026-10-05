import { FrameLocator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

class FooterElement {

    //page locators
    static footerBtn = (btnName: string) => { return this.getIframe().locator("//button//span[contains(text(),'" + btnName + "')]") }


    // Static method to get the iframe
    private static getIframe(): FrameLocator {
        return page.frameLocator(iframeId);
    }

    //Methods to interact with input field
    static async ClickButton(buttonName: string) {
        await this.footerBtn(buttonName).click();
    }
}

export default FooterElement;
