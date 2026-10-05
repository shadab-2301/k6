import { FrameLocator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";
import { IBOL } from "../../../utilities/utilities/ibol-utilities";

class Stepper {

    //page locators
    static activeStepper_byNumber = (expectedActiveStepperNumber: number) => { return this.getIframe().locator("//ui-progress-steps-dynamic//span[text()=" + expectedActiveStepperNumber + "]/../../..//div[contains(@class,'active')]") }

    // Static method to get the iframe
    private static getIframe(): FrameLocator {
        return page.frameLocator(iframeId);
    }

    static async VerifyStepIsActive(expectedActiveSeppertNumber: number) {
        await this.activeStepper_byNumber(expectedActiveSeppertNumber).isVisible();
    }

    static async getactivestapper() {
        await IBOL.waitForLoadingSpinnerToDisappear(await this.getIframe());
        const activeStepper = await this.getIframe().locator("//ui-progress-steps-dynamic//div[contains(@class,'active')]").first();
        await activeStepper.waitFor({ state: 'visible', timeout: 5000 });
        return this.getIframe().locator("//ui-progress-steps-dynamic//div[contains(@class,'active')]");
    }

}

export default Stepper;
