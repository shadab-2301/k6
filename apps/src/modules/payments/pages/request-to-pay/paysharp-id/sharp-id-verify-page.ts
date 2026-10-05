import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { PAYSHARP_ID_TYPE } from "../../../types/pay-proxy-conts";
import { IRequestorDetail } from "../../../types/RequestorDetails";
import { IPayerDetail } from "../../../types/RequestDetails";
import { ISharpID } from "../../../pay-sharp/types/ISharpIdDetails";
import { iframeId } from "../../../../../../config/global-configs";

export default class SharpIDVerifyPage {

    private iframe: FrameLocator;
    private readonly lblIsDefaultProxy: Locator;
    private readonly lblSharpID: Locator;
    private readonly lblKnownAs: Locator;
    private readonly lblSelectedAccount: Locator;


    constructor() {
        this.iframe = page.frameLocator(iframeId);
        this.lblIsDefaultProxy = this.iframe.locator("//label[contains(.,'Default')]//parent::div//p")
        this.lblSharpID = this.iframe.locator("//label[contains(.,'ShapID')]//parent::div//p")
        this.lblKnownAs = this.iframe.locator("//label[contains(.,'Known as')]//parent::div//p")
        this.lblSelectedAccount = this.iframe.locator("//label[contains(.,'Select account')]//parent::div//p")
    }

    async getCapturedSharpIDDetails() {
        const capturedDetails: ISharpID = {
            isDefaultProxy: (await this.lblIsDefaultProxy.textContent()).trim(),
            sharpID: (await this.lblSharpID.textContent()).trim(),
            knownAs: (await this.lblKnownAs.textContent()).trim(),
            selectedAccont: (await this.lblSelectedAccount.textContent()).trim()
        }
        return capturedDetails;
    }
}

