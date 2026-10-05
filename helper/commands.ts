import { expect } from "@playwright/test";
import { page, FrameLocator, Locator } from "playwright-with-cucumber-checks";
import { iframeId } from "../config/global-configs";

export default class Command {
  private _iframe: FrameLocator;

  get iframe(): FrameLocator {
    if (!this._iframe) {
      this._iframe = page.frameLocator(iframeId);
    }
    return this._iframe;
  }

  public static async enterText(elementLocator: Locator, inputText: string) {
    try {
      await elementLocator.fill(inputText);
    } catch (error) {
      throw new Error(`An issue occured while trying to input text`);
    }
  }

  public static async slowTypeText(elementLocator: Locator, inputText: string) {
    await elementLocator.type(inputText, { delay: 10 });
  }

  public static async clickElement(elementLocator: Locator) {
    await elementLocator.click();
  }

  public async isHeadingCorrect(expectedText: string) {
    expect(await this.iframe.locator("//h4").textContent()).toEqual(expectedText);
  }
}
