import { expect, FrameLocator, page, Locator } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";
import { IBOL } from "../../../utilities/utilities/ibol-utilities";

export default class ManageCardsPage {
  iframe: FrameLocator;
  rowSelector: Locator;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.rowSelector = this.iframe.locator(`//tr//td[last()]`);
  }

  async selectTab(tabName: string) {
    await IBOL.selectTabByPartialText(this.iframe, tabName);
  }

  async searchCard(query: string) {
    await this.iframe.locator('input[placeholder*="Search"]').fill(query);
  }
  async clickFilter() {
    await this.iframe.locator('button:has-text("Filter")').click();
  }

  async getCardRows() {
    return await this.iframe.locator('table tbody tr');
  }
  async getCardDetails(rowIndex: number) {
    const row = this.iframe.locator('table tbody tr').nth(rowIndex);
    const cardName = await row.locator('td').nth(0).innerText();
    const cardNumber = await row.locator('td').nth(1).innerText();
    const cardType = await row.locator('td').nth(2).innerText();
    const status = await row.locator('td').nth(3).innerText();
    const monthlyLimit = await row.locator('td').nth(4).innerText();
    const usedLimit = await row.locator('td').nth(5).innerText();
    return { cardName, cardNumber, cardType, status, monthlyLimit, usedLimit };
  }
  async clickCardAction(rowIndex: number) {
    await this.iframe.locator('table tbody tr').nth(rowIndex).locator('td:last-child button, td:last-child .menu, td:last-child').click();
  }

  async goToPage(pageNumber: number) {
    await this.iframe.locator(`nav[role="navigation"] button,nav[role="navigation"] a`).getByText(String(pageNumber)).click();
  }

  async createVirtualCard() {
    await this.iframe.locator('button:has-text("Create virtual card")').click();
  }

  async isCreateVirtualCardDisplayed() {
    const createVirtualCardButton = await this.iframe.locator('button:has-text("Create virtual card")');
    await createVirtualCardButton.waitFor({ state: 'visible', timeout: 120000 });
    await expect(createVirtualCardButton).toBeVisible();
    return createVirtualCardButton.isVisible();
  }

  async setDate(requredDate: string) {
    const dateField = await this.iframe.locator('//input[@placeholder="DD/MM/YYYY"]').first();
    await dateField.fill(requredDate);
  }

  async selectCardOption(optionText: string) {
    const btn = await this.getButtonByName(optionText);
    await btn.click();
  }

  async isEmptyTokensMessageDisplayed() {
    const emptyTokensMessageLocator = this.iframe.locator(".lead");
    await emptyTokensMessageLocator.waitFor({ state: "visible", timeout: 10000 });
    return await emptyTokensMessageLocator.isVisible();
  }

  async getEmptyTokensMessage(emptytokens: string) {
    const emptyTokensMessageLocator = this.iframe.locator(".lead");
    try {
      await emptyTokensMessageLocator.waitFor({ state: "visible", timeout: 10000 });
      const actualMessage = await emptyTokensMessageLocator.textContent();
      return actualMessage.trim() === emptytokens;
    } catch (error) {
      return false;
    }

  }

  async getButtonByName(optionText: string) {
    const btn = await this.iframe.getByRole("button", { name: optionText }).first();
    return btn;
  }

  async verifyBusinessLogicErrorMessage(expectedMessage: string) {
    const errorMessageLocator = this.iframe.locator(".ids-empty-state__title");

    // const errorMessageLocator = this.iframe.getByRole("alert");
    await errorMessageLocator.waitFor({ state: "visible", timeout: 10000 });
    const actualMessage = await errorMessageLocator.textContent();
    expect(actualMessage.trim()).toBe(expectedMessage);
  }

  async changePin(actualpin: string) {

    let currentPin = actualpin.toString().padStart(4, '0');
    const newchangePin = String(Math.floor(1000 + Math.random() * 9000));
    await this.iframe.getByRole("textbox", { name: "Enter old pin" }).fill(currentPin);
    await this.iframe.getByRole("textbox", { name: "Enter new pin", exact: true }).fill(newchangePin);
    await this.iframe.getByRole("textbox", { name: "Re-enter new pin", exact: true }).fill(newchangePin);
    await this.iframe.getByRole("button", { name: "Confirm" }).click();
  }

  async getPinChangeSuccessMessage() {
    const getSubmitResponse = await this.iframe.getByRole("alert").textContent();
    return getSubmitResponse;
  }

  async getCurrentCardPin(): Promise<number> {
    let currentPin;
    let pinMatch;

    await this.iframe.locator("#viewPinButton").click();
    await this.iframe.locator("#cardPinInput").waitFor({ state: "visible" });

    do {
      currentPin = await this.iframe.locator("#cardPinInput").inputValue();
      pinMatch = parseInt(currentPin.trim());
      if (isNaN(pinMatch)) {
        await page.waitForTimeout(2000);
      }
    } while (isNaN(pinMatch));

    return pinMatch;
  }

  async viewCardCVV(): Promise<number> {
    let currentPin;
    let pinMatch;

    const showPinButton = this.iframe.getByRole("button", { name: "Show" }).first();
    const ccvInput = this.iframe.locator("#accounts_manage-cards_show-cvv");

    await IBOL.clickAndInterceptResponse(showPinButton, "/tbba/api/v2/card/showcvv");

    await ccvInput.waitFor({ state: "visible" });

    currentPin = await ccvInput.inputValue();
    pinMatch = parseInt(currentPin.trim());
    if (isNaN(pinMatch)) {
      throw new Error("Failed to retrieve the card PIN. The input value is not a valid number.");
    }

    expect(pinMatch).not.toBeNaN();

    return pinMatch;
  }

  async selectRandomRowAndVerifyMenu(expectedMenuItems: string[]) {
    // await page.waitForLoadState('networkidle', { timeout: 60000 });
    const rows = this.iframe.locator('table tbody tr');
    await rows.first().waitFor({ state: 'visible', timeout: 60000 });
    const rowCount = await rows.count();
    if (rowCount === 0) throw new Error('No card rows found');
    const randomIndex = Math.floor(Math.random() * rowCount);
    const row = rows.nth(randomIndex);
    const cardDetails = {
      cardName: await row.locator('td').nth(0).innerText(),
      cardNumber: await row.locator('td').nth(1).innerText(),
      cardType: await row.locator('td').nth(2).innerText(),
      status: await row.locator('td').nth(3).innerText(),
      monthlyLimit: await row.locator('td').nth(4).innerText(),
      usedLimit: await row.locator('td').nth(5).innerText(),
    };
    const menuButton = this.iframe.locator('ui-icon').nth(randomIndex);
    await menuButton.waitFor({ state: 'visible', timeout: 10000 });
    await menuButton.click();

    await page.waitForTimeout(2000);

    const menuContainerSelectors = [
      '[role="menu"]',
      '[role="listbox"]',
      '.menu',
      '.dropdown-menu',
      'ui-menu',
      '[class*="menu"]',
      '[class*="dropdown"]',
      '[class*="popover"]'
    ];

    let menuVisible = false;
    for (const selector of menuContainerSelectors) {
      const menuContainer = this.iframe.locator(selector).first();
      if (await menuContainer.isVisible().catch(() => false)) {
        menuVisible = true;

        break;
      }
    }

    let foundVisible = false;
    const notVisible: string[] = [];
    const visible: string[] = [];

    for (const item of expectedMenuItems) {
      const selectors = [
        `text="${item}"`,
        `text=${item}`,
        `[role="menuitem"]:has-text("${item}")`,
        `button:has-text("${item}")`,
        `a:has-text("${item}")`,
        `li:has-text("${item}")`,
        `*:has-text("${item}")`
      ];

      let itemFound = false;
      for (const selector of selectors) {
        try {
          const menuItem = this.iframe.locator(selector).first();
          const isVisible = await menuItem.isVisible({ timeout: 500 }).catch(() => false);
          if (isVisible) {
            foundVisible = true;
            itemFound = true;
            visible.push(item);
            break;
          }
        } catch (e) {
        }
      }

      if (!itemFound) {
        notVisible.push(item);
      }
    }


    if (!foundVisible) {
      throw new Error(`None of the expected menu items were visible: ${expectedMenuItems.join(', ')}`);
    }
    if (notVisible.length > 0) {
      console.log(`Menu items not visible: ${notVisible.join(', ')}`);
    }

    return { cardDetails, notVisible };
  }

  async selectRandomCardOptionsMenu(expectedMenuItems: string[], rowIndex: number = 0) {
    let foundVisible = false;
    const missingCardOptions: string[] = [];
    const visible: string[] = [];

    for (const item of expectedMenuItems) {
      let itemFound = false;
      let menuItem = this.iframe.locator(`text=${item},[role="menuitem"]:has-text("${item}"),button:has-text("${item}"),a:has-text("${item}"),li:has-text("${item}"),*:has-text("${item}")`).first();

      if (await menuItem.count() == 0) {
        menuItem = this.iframe.locator(`//ul[@class='dropdown-menu show']//button/span[contains(.,'${item}')]`).first();
      }

      if (await menuItem.count() > 0 && await menuItem!.isVisible()) {
        foundVisible = true;
        itemFound = true;
        visible.push(item);
        break;
      }

      if (!itemFound) {
        missingCardOptions.push(item);
      }
    }
    if (!foundVisible) {
      //throw new Error(`None of the expected menu items were visible: ${expectedMenuItems.join(', ')}`);
    }
    if (missingCardOptions.length > 0) {
    }

    return missingCardOptions;
  }

  clickShowCVV = async () => {
    await this.iframe.getByRole("button", { name: "Show" }).first().click();
  };

  clickDoneButton = async () => {
    await this.iframe.getByRole("button", { name: "Done" }).click();
  };

  async getCardCVV() {
    await this.clickShowCVV();
    await this.iframe.locator('#accounts_manage-cards_show-cvv').click();
    await page.waitForTimeout(1000)
    const cvvInput = this.iframe.locator("#accounts_manage-cards_show-cvv");
    let cvvValue = await cvvInput.inputValue();
    let retry = 4;

    do {
      cvvValue = await cvvInput.inputValue();
      await page.waitForTimeout(2000);
      retry--;
    } while ((cvvValue === "" || isNaN(parseInt(cvvValue)) || cvvValue.length !== 3) && retry > 0);

    return cvvValue;
  }

  isCardDetalsHeaderDisplayed = async () => {
    await this.iframe.getByRole("heading", { name: "Card details" }).waitFor({ state: "visible", timeout: 20000 });
    return await this.iframe.getByRole("heading", { name: "Card details" }).isVisible();
  };



  async verifyCardDetails(selectedCardInfo, expectedCardInfoText: string) {

    expect(await this.isCardDetalsHeaderDisplayed()).toBeTruthy();

    await expect(await this.iframe.locator(".alert.alert-info span")).toContainText(expectedCardInfoText);

    const cardInfoArray = selectedCardInfo["Card Number"].split(" ");
    const firstFourDigits = cardInfoArray[0];
    const lastFourDigits = cardInfoArray[cardInfoArray.length - 1];

    expect(selectedCardInfo["Card Name"]).toBe(await this.getCardDetailByName('Card holder'));
    expect(selectedCardInfo["Card type"]).toBe(await this.getCardDetailByName('Card type'));
    expect(selectedCardInfo["Card Number"]).toContain(firstFourDigits);
    expect(selectedCardInfo["Card Number"]).toContain(lastFourDigits);
    await this.viewCardCVV();
  }

  async getCardDetailByName(cardDetail: string) {
    const cardDetailLocator = this.iframe.locator(`//div[@class='row']//strong[contains(text(),'${cardDetail}')]/parent::div/following-sibling::div//p`);
    return await cardDetailLocator.textContent();
  }

  async clickCardMenuOption(rowIndex: number = 0) {

    await IBOL.click(await this.rowSelector.nth(rowIndex), "Card menu option ");

  }

  async veifyCardSettingsUI(apiResponse) {

    const usageOptions =
      Array.isArray(apiResponse) ? apiResponse[0]?.usageOptions :
        Array.isArray(apiResponse.data) ? apiResponse.data[0]?.usageOptions :
          undefined;


    let CardSettingsHeaderVisible = await this.iframe.getByRole('heading', { name: 'Set card usage', level: 3 })

    let isCardSettingsHeaderVisible = await CardSettingsHeaderVisible.isVisible({ timeout: 10000 });

    if (apiResponse.data[0]?.usageOptions?.length === 0) {
      throw new Error(`Card Settings usage options object is empty ${JSON.stringify(apiResponse, null, 2)}`);
    }

    if (isCardSettingsHeaderVisible) {

      await CardSettingsHeaderVisible.scrollIntoViewIfNeeded();
      for (const option of usageOptions) {
        const optionName = option.name;
        const optionValue = option.value;
        const switchCheckbox = await this.iframe.locator(`//tbody//td[contains(.,'${optionName}')]/following-sibling::td//input[@type='checkbox']`);
        let expectedUIValue = (optionValue === "true") ? true : false;

        expect(await switchCheckbox.isChecked()).toBe(!expectedUIValue);
      }
    }

  }

  getButtonLocatorByName = async (buttonName: string) => {
    return IBOL.getButtonLocatorByName(this.iframe, buttonName);
  }

}