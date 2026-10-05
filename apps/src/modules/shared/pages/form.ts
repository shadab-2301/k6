import { expect, FrameLocator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

class FormElement {

    //page locators
    static dropdown_field = (idValue: string) => { return this.getIframe().locator("//input[@id='" + idValue + "'] | //ui-form-dropdown//button[@id='" + idValue + "']| //button[@id='" + idValue + "']") }
    static dropdown = () => { return this.getIframe().locator("//ngb-typeahead-window") }
    static dropdownItem = (itemName: string) => { return this.getIframe().locator("//ngb-typeahead-window//button//ngb-highlight[text()='" + itemName + "'] | //ngb-typeahead-window//button//ngb-highlight//span[contains(text(),'" + itemName + "')] | //button[contains(text(),'" + itemName + "')] |//ui-form-dropdown//button[contains(@class,'dropdown-item')]//div[text()=' " + itemName + " ']") }
    static input_field = (fieldLabelText: string) => { return this.getIframe().locator("//label[text()='" + fieldLabelText + "']/..//input | //input[@placeholder='" + fieldLabelText + "']") }
    static radioBtn = (labelText: string) => { return this.getIframe().locator("//label[text()='" + labelText + "']") }
    static button = (btnText: string) => { return this.getIframe().locator("//button//span[text()='" + btnText + "']") }



    // Static method to get the iframe
    private static getIframe(): FrameLocator {
        return page.frameLocator(iframeId);
    }

    //Methods to interact with input field
    static async enterInputFieldText(inputFieldLabel: string, valueToEnter: string) {
        await this.input_field(inputFieldLabel).fill(valueToEnter);
    }

    static async verifyInputFieldText(inputFieldLabel: string, expectedText: string) {
        const fieldValue = await this.input_field(inputFieldLabel).inputValue();
        expect(fieldValue).toBe(expectedText)
    }

    // Methods to interact with dropdown
    static async openDropdown(dropdownId: string) {
        await this.dropdown_field(dropdownId).click();
    }

    static async fillInDropdown(dropdownId: string, valueToFill: string) {
        await this.dropdown_field(dropdownId).first().fill(valueToFill);
        await page.waitForTimeout(1000);

    }

    static async isDropdownEnabled(dropdownID: string): Promise<boolean> {
        return await this.dropdown_field(dropdownID).isEnabled();
    }
    static async verifyDropdownOpened() {
        await this.dropdown().isVisible();
    }
    static async selectDropdownItem(itemName: string) {
        await this.dropdownItem(itemName).first().click();
    }

    static async getSelectedDropdownValue(fieldId: any) {
        return await this.dropdown_field(fieldId).inputValue();
    }

    static async selectFromDropdown(fieldId: string, valueToSelect: string) {
        await FormElement.openDropdown(fieldId);
        await this.fillInDropdown(fieldId, valueToSelect)
        // await page.keyboard.press('Backspace');
        await this.verifyDropdownOpened();
        await this.selectDropdownItem(valueToSelect)
        const selectedValue = await this.getSelectedDropdownValue(fieldId)
        //expect(selectedValue).toContain(valueToSelect);
    }

    static async ClickRadioBtn_ByLabel(labelText: any) {
        await this.radioBtn(labelText).first().click();
    }

    static async ClickButton(btnName: string) {
        await this.button(btnName).click()
    }
}

export default FormElement;
