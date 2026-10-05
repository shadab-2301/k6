import { FrameLocator, Locator, expect, page } from "playwright-with-cucumber-checks";
import { PAYSHARP_ID_TYPE } from "../../../types/pay-proxy-conts";
import { IRequestorDetail } from "../../../types/RequestorDetails";
import { IPayerDetail } from "../../../types/RequestDetails";
import { ISharpID } from "../../../pay-sharp/types/ISharpIdDetails";
import { getInterceptedAPIResponse } from "../../../../shared/services/api-calls-service";
import { iframeId } from "../../../../../../config/global-configs";

export default class SharpIDDetailsPage {

    private iframe: FrameLocator;
    private readonly rdbIsDefaultProxyNo: Locator;
    private readonly rdbIsDefaultProxyYes: Locator;
    private readonly txtShapId: Locator;
    private readonly ddlKnownAs: Locator;
    private readonly ddlLinkedAccount: Locator;


    constructor() {
        this.iframe = page.frameLocator(iframeId);
        this.rdbIsDefaultProxyNo = this.iframe.locator("//input[@formcontrolname='isDefaultProxy' and @value='false']")
        this.rdbIsDefaultProxyYes = this.iframe.locator("//input[@formcontrolname='isDefaultProxy' and @value='true']")
        this.txtShapId = this.iframe.locator("#shapId")
        this.ddlKnownAs = this.iframe.locator("#knownAsName")
        this.ddlLinkedAccount = this.iframe.locator("#linkedAccount")
    }

    getDropDownOption(): Locator {
        return this.iframe.locator("//button[contains(@role, 'option')]");
    }

    async selectLinkedAccount() {
        await this.ddlLinkedAccount.click({ timeout: 60000 });
        await this.getDropDownOption().nth(0).click();
    }

    async verifyDefaultProxyOption() {
        const isDefaultProxy = await this.rdbIsDefaultProxyNo.isChecked();
        expect(isDefaultProxy).toBeTruthy();
    }

    async verifyPrepopulatedKnownAs() {
        expect(await this.ddlKnownAs.inputValue()).toEqual((await getInterceptedAPIResponse()).data.knownAsName)
    }

    async verifyPrepopulatedShapID() {
        expect(await this.txtShapId.inputValue()).toEqual((await getInterceptedAPIResponse()).data.shapId)
    }

    async getCapturedSharpIDDetails() {
        const isDefault = await this.rdbIsDefaultProxyNo.isChecked() ? "false" : "true"
        const capturedDetails: ISharpID = {
            isDefaultProxy: isDefault,
            sharpID: await this.txtShapId.inputValue(),
            knownAs: await this.ddlKnownAs.inputValue(),
            selectedAccont: await this.ddlLinkedAccount.inputValue()
        }
        return capturedDetails;
    }
}

