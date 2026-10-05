import { Locator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";
import { IBOL } from "../../../utilities/utilities/ibol-utilities";

export default class Search {

    static SearchBar = (): Locator => { return page.frameLocator(iframeId).locator("//investec-online-basic-search//input") };

    static async enterSearchTerm(valueToEnter: string) {
        await IBOL.fill(this.SearchBar(), valueToEnter);
    }
}