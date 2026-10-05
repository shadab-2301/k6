import { expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { readFile } from "fs/promises";
import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { names, surnames } from "./randon-test-data";
import { iframeId } from "../config/global-configs";
import { IBOL } from "../src/utilities/utilities/ibol-utilities";
import PdfReader from "./pdf-reader";

export default class Action {
  private static _iframe: FrameLocator;
  static SortByDropdown = (): string => { return '#bb-sort-dropdown' }
  static SortOptions = (sort_by: string, sort_order: string): string => { return '//investec-online-sort//button[@ngbdropdownitem and text()=" ' + sort_by + ' : ' + sort_order + ' "] | //investec-online-sort//span[text()="' + sort_by + ' "] /../..//button[text()=" : ' + sort_order + ' "] ' }

  static get iframe(): FrameLocator {
    // Always resolve from the live Playwright page to avoid stale frame references
    // when scenarios close and relaunch the browser.
    Action._iframe = page.frameLocator(iframeId);
    return Action._iframe;
  }

  static set iframe(value: FrameLocator) {
    Action._iframe = value;
  }

  constructor() {
    Action._iframe = page.frameLocator(iframeId);
  }


  public async clickSubmitButton(buttonText: string) {
    await Action.iframe.locator('//span[contains(text(),"' + buttonText + '")]')?.click();
  }

  static selectDropDownOption(option: string) {
    // const dropDownItem = await this.iframe.locator("//button[@role='option' and .//*[contains(text(),'" + option + "')]]").textContent();
    // await locator.selectOption(dropDownItem)
    // await dropDownItem.scrollIntoViewIfNeeded();
    return this.iframe.locator("//button[@role='option' and .//*[contains(text(),'" + option + "')]]")
  }


  private static evaluateDownload = async (downloadbutton: Locator, endpointFragment: string = "/api/", idleMs = 90000) => {

    let responsePromise = page.waitForResponse(
      (response) => response.url().includes(endpointFragment),
      { timeout: idleMs }
    );

    const downloadPromise = page.waitForEvent('download', { timeout: idleMs });

    await downloadbutton.waitFor({ timeout: 3000 });
    await downloadbutton.click();

    const [matchedResponse, download] = await Promise.all([responsePromise, downloadPromise]);
    expect(matchedResponse.url()).toContain(endpointFragment);
    expect(matchedResponse.status()).toBe(200);

    const contentType = matchedResponse.headers()['content-type'] || '';
    const body = await matchedResponse.body();

    let responseData: any;
    if (contentType.includes('application/json')) {
      responseData = JSON.parse(body.toString());
    } else if (contentType.includes('application/pdf') || contentType.includes('image/') || contentType.includes('octet-stream')) {
      responseData = body;
    } else {
      try {
        responseData = JSON.parse(body.toString());
      } catch {
        responseData = body.toString();
      }
    }

    return {
      responseData,
      download,
      suggestedFilename: await download.suggestedFilename(),
      response: matchedResponse
    };
  }


  static async clickAndGetApiResponse(downloadbutton: Locator, endpointFragment: string = "/api/", deleteDownloadedFile = true, idleMs = 10000) {

    const { responseData, download, suggestedFilename, response } = await this.evaluateDownload(downloadbutton, endpointFragment);

    return response;
  }

  /**
 * Clicks the given button and handles one or more downloads.
 * Starts waiting for the download event before clicking.
 * Returns { isFileDownloaded, numberOfFilesdownloaded }.
 */
  static async downloadFile(downloadbutton: Locator, endpointFragment: string = "/api/", deleteDownloadedFile = true, idleMs = 10000) {
    let fileContent: string;
    const { responseData, download, suggestedFilename, response } = await this.evaluateDownload(downloadbutton, endpointFragment);

    let isFileDownloaded = false;
    const dir = path.resolve('apps/test/test-results/downloads');
    fs.mkdirSync(dir, { recursive: true });

    const saved: string[] = [];

    while (!isFileDownloaded) {
      try {
        const suggested = await suggestedFilename;
        const savePath = path.join(dir, suggested);
        await download.saveAs(savePath);

        expect(fs.existsSync(savePath)).toBeTruthy();
        const stats = fs.statSync(savePath);
        expect(stats.size).toBeGreaterThan(0);

        saved.push(savePath);
        if (suggested.endsWith('.pdf')) {
          fileContent = await PdfReader.readPdfText(savePath);
        }


        if (deleteDownloadedFile) {
          fs.unlinkSync(savePath);
        }
        isFileDownloaded = true;
      } catch {
        break;
      }
    }

    const numberOfFilesdownloaded = await saved.length;
    isFileDownloaded = saved.length > 0;
    return { isFileDownloaded, numberOfFilesdownloaded, response, fileContent };
  }

  static selectStoryBookDropdown(option: string) {
    return this.iframe.locator(`//button[@class='dropdown-item' and contains(text(),'${option}')]`)
  }

  static selectSortOrder(option: string, sortOrder: string) {
    return this.iframe.locator(`//button[contains(@class, 'dropdown-item') and contains(.,'${option}') and contains(text(), '${sortOrder}')]`)
  }

  static openSortDropdown() {
    return this.iframe.locator(this.SortByDropdown()).click();
  }
  static selectOrderByOption(option: string, sortOrder: string) {
    return this.iframe.getByText(`${option} : ${sortOrder}`).filter({ hasNotText: 'Sort by' }).click();
    //return this.iframe.locator(this.SortOptions(option, sortOrder)).click();
  }

  static async getRandomDropDownOption() {
    const dropDownOptions = await this.iframe.locator("//button[@role='option']").all();
    const randomIndex = Math.floor(Math.random() * dropDownOptions.length);
    for (const iterator of dropDownOptions) {
      if (iterator.getAttribute("disabled") == null) {
        await iterator.click();
      }
    }
  }

  static async getRandomElementFromList(locator: Locator): Promise<Locator | undefined> {
    await page.waitForTimeout(3000)
    let enabledElement;
    for (const element of await locator.all()) {
      const isDisabled = await element.getAttribute('disabled');
      if (isDisabled == null) {
        enabledElement = element;
      }
    }
    return enabledElement;
  }


  static getDropDownOption(option: string) {
    return this.iframe.locator("//button[@role='option' and .//*[contains(text(),'" + option + "')]]")
  }

  static async selectApplication(productName: string) {
    console.log(`[Action] Selecting application: "${productName}"`);

    let isCardSelected = false;

    // Close any modals that might block interaction
    try {
      const closeBtn = page.locator(".centreStageCloseBtn");
      await closeBtn.click({ timeout: 2000 }).catch(() => {
        console.log("[Action] No modal close button found - continuing");
      });
    } catch (e) {
      console.log("[Action] Modal close attempt failed (non-blocking)");
    }

    try {
      // Try multiple selector strategies for finding the product card
      const selectors = [
        // Primary selector: h5 with exact text match (for "Investec Business" heading)
        `//h5[contains(text(),'${productName}')]`,
        // Alternative: Heading within a clickable card/div
        `//div[@cursor='pointer' or @role='button']//h5[contains(text(),'${productName}')]`,
        // Alternative: Any h5 with case-insensitive match
        `//h5[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${productName.toLowerCase()}')]`,
        // Alternative: Card container with heading
        `//div[contains(@class, 'card') or contains(@class, 'product')]//h5[contains(text(), '${productName}')]`,
        // Alternative: Clickable element with text
        `//button//*[contains(text(), '${productName}')]`,
        // Alternative: Div or span with class containing "product" or "card"
        `//div[@class and contains(., '${productName}')]`
      ];

      let productCard;
      for (let i = 0; i < selectors.length; i++) {
        try {
          productCard = Action.iframe.locator(selectors[i]);
          const count = await productCard.count().catch(() => 0);
          if (count > 0) {
            console.log(`[Action] ✓ Found product card using selector ${i + 1}/${selectors.length}`);
            console.log(`[Action]   Selector: ${selectors[i]}`);
            break;
          }
        } catch (e) {
          // Selector syntax error or not found - try next
          if (i === selectors.length - 1) {
            console.log(`[Action] ⚠️ No selectors matched. Trying generic fallback...`);
            productCard = Action.iframe.locator(`//h5[contains(text(),'${productName}')]`);
          }
        }
      }

      // Debug: List all h5 elements visible on the page to understand structure
      try {
        const allH5 = Action.iframe.locator("//h5");
        const count = await allH5.count();
        console.log(`[Action] Available headings on page (total: ${count}):`);
        for (let i = 0; i < count; i++) {
          const text = await allH5.nth(i).textContent().catch(() => "");
          console.log(`[Action]   h5[${i}]: "${text}"`);
        }
      } catch (debugError) {
        console.log(`[Action] Could not list all headings`);
      }

      // EXPLICIT WAIT: Wait for product card to be visible (increase timeout for slow page loads)
      console.log(`[Action] Waiting for product card "${productName}" to be visible... (timeout: 15s)`);
      try {
        await productCard.nth(0).waitFor({ state: 'visible', timeout: 15000 });
        console.log(`[Action] ✓ Product card visible`);
      } catch (e) {
        throw new Error(`Product card "${productName}" not visible after 15s. Check if page loaded correctly.`);
      }

      // Wait for animations to complete
      try {
        console.log(`[Action] Waiting for animations to complete (800ms)...`);
        await new Promise(r => setTimeout(r, 800));
        console.log(`[Action] ✓ Element stabilized`);
      } catch (e) {
        console.log(`[Action] Animation wait failed (non-blocking)`);
      }

      // EXPLICIT WAIT: Retry clicking with backoff
      let clickSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[Action] Click attempt ${attempt}/3 on product card...`);
          await productCard.nth(0).click({ timeout: 3000, force: false });
          clickSuccess = true;
          console.log(`[Action] ✓ Product card clicked successfully`);
          break;
        } catch (e) {
          console.log(`[Action] ⚠️ Click attempt ${attempt} failed:`, e.message);

          if (attempt < 3) {
            // Check if element is still visible
            const stillVisible = await productCard.nth(0).isVisible({ timeout: 1000 }).catch(() => false);
            if (!stillVisible) {
              throw new Error(`Product card no longer visible after attempt ${attempt}`);
            }

            // Exponential backoff
            const delay = attempt * 500;
            console.log(`[Action] Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            throw e;
          }
        }
      }

      if (!clickSuccess) {
        throw new Error(`Failed to click product card after 3 attempts`);
      }

      isCardSelected = true;

      // Check for error page
      console.log(`[Action] Checking for error page...`);
      const errorHeading = Action.iframe.getByRole('heading', { name: "We weren't banking on that happening!" });
      const isErrorVisible = await errorHeading.isVisible({ timeout: 2000 }).catch(() => false);

      if (isErrorVisible) {
        const errorText = await errorHeading.textContent().catch(() => "Unknown error");
        throw new Error(`Application error after selection: ${errorText}`);
      }

      console.log(`[Action] ✓ Application selected successfully`);

    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`[Action] ❌ Failed to select application:`, reason);
      throw new Error(`Failed to select "${productName}". Details: ${reason}`);
    }

    if (!isCardSelected) {
      throw new Error(`Product card selection failed for: ${productName}`);
    }

  }
  public static async clickSubmitButton(buttonText: string) {
    const escapedText = buttonText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const roleLocator = Action.iframe.getByRole("button", { name: new RegExp(`^\\s*${escapedText}\\s*$`, "i") }).first();
    const roleVisible = await roleLocator.isVisible({ timeout: 1500 }).catch(() => false);
    if (roleVisible) {
      await IBOL.click(roleLocator, buttonText);
      return;
    }

    const fallbackLocator = Action.iframe.locator(
      `//button[contains(normalize-space(.),"${buttonText}")] | //span[contains(normalize-space(.),"${buttonText}")]`
    ).first();
    await IBOL.click(fallbackLocator, buttonText);
  }

  static getRandomName(arr: string[]) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    const item = arr[randomIndex];
    return item;
  }

  static async isElementDisplayed(element: Locator) {
    return await element.isVisible({ timeout: 30000 })
  }

  public static generateNumericString(length: number) {
    var alPhanumericString: string = "";
    const characters = "0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      alPhanumericString += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return alPhanumericString;
  }

  public static generateAlphaNumericString(length: number) {
    var alPhanumericString: string = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      alPhanumericString += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return alPhanumericString;
  }

  static getRandomFirstName(): string {
    return this.getRandomName(names);
  }

  static getRandomLastName(): string {
    return this.getRandomName(surnames);
  }

  static getRandomFullName(): string {
    return `${this.getRandomName(names)} ${this.getRandomName(surnames)} ${this.generateNumericString(5)}`;
  }

  // static getSpecificFullName(): string {
  //   return `${names[0]} ${surnames[0]}`;
  // }

  static async getCUrrentUrl() {
    await page.waitForLoadState();
    return page.url();
  }

  static async ReadFileContent(filePath: string) {
    return await readFile(path.join(__dirname, `../${filePath}`), "utf8");
  }

  static async WriteToJsonFile(filePath: string, jsonContent: object) {
    var fileStore = path.join(__dirname, `../${filePath}`);
    fs.writeFile(fileStore, JSON.stringify(jsonContent, null, 2), (err) => {
      if (err) {
        return
      }
    }
    );
  }

  static async writeOrAppendJSONFile(filename: string, key: string, value: any) {
    var fileStore = path.join(__dirname, `../${filename}`);
    if (fs.existsSync(fileStore)) {
      const data = fs.readFileSync(fileStore, 'utf8');
      let jsonData = JSON.parse(data);
      if (jsonData.hasOwnProperty(key)) {
        jsonData[key].push(value);
      } else {
        jsonData[key] = [value];
      }
      fs.writeFileSync(fileStore, JSON.stringify(jsonData, null, 2));
    } else {
      const jsonData = {
        [key]: [value]
      };
      fs.writeFileSync(fileStore, JSON.stringify(jsonData, null, 2));
    }
  }

  // static async generateRandomSaID() {
  //   return fakeSaIdGenerator.generateFakeIdByAge(`${Math.floor(Math.random() * 60 + 18)}`);
  // }


  static async uploadDocument(fileName1: string, fileName2?: string, fileName3?: string) {
    try {
      //   await page.evaluate(() => {
      //     let inputElement = document.querySelectorAll('[type="file"]');
      //     inputElement.forEach((ele) => {
      //       ele.removeAttribute("style");
      //     });
      //   });
      await page.setInputFiles("//input[@type='file']", "screenshots/screenshot.png");
    } catch (error) {
      throw new Error(`An error occured while attempting to upload the file : ${error}`);
    }
  }

  static async WriteToFileNow(file: string, data: any) {
    var fileStore = path.join(__dirname, `../${file}`);

    fs.writeFileSync(fileStore, data)

  }



  static async getFirstWordBeforeSpace(text: string): Promise<string | null> {
    const trimmedText = text.trim();
    const indexOfSpace = trimmedText.indexOf(' ');

    if (indexOfSpace === -1) {
      return trimmedText;
    } else {
      return trimmedText.substr(0, indexOfSpace);
    }
  }

  // static async captureScreenshot(filename: string) {
  //   await page.screenshot({ path: path.join(__dirname, `../${filename}`) "screenshots/screenshot.png", fullPage: true })
  // }

  static async compareObjects(obj1, obj2): Promise<boolean> {
    // Get the keys of the first object
    const keys1 = Object.keys(obj1);

    // Iterate through the keys
    for (const key of keys1) {
      // Check if the key exists in the second object
      if (!(key in obj2)) {
        return false; // Key not found in obj2
      }

      if (obj1[key] !== obj2[key]) {
        return false; // Values are different
      }
    }

    // Optional: If you want to check for keys in obj2 that are not in obj1
    const keys2 = Object.keys(obj2);
    for (const key of keys2) {
      if (!(key in obj1)) {
        return false; // Key not found in obj1
      }
    }

    return true; // All matching keys have the same values
  }


  static getDropDownOptionByText(option: string): Locator {
    return Action.iframe.locator("//button[contains(@role, 'option')]//ngb-highlight[contains(.,'" + option + "')]");
  }


}
