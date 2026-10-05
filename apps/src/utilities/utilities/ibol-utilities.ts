import { Locator } from "playwright";
import { expect, page } from "playwright-with-cucumber-checks";
import APIInterceptor from "../../../helper/api-interceptor";

export class IBOL {
  static getLoader(iframe: any) {
    return iframe.locator('.loader-wrapper .spinner-border.m-auto').or(iframe.locator('//ui-full-page-loader').first());
  }

  static parseBoolean(value: string | undefined): boolean {
    return value?.toLowerCase() === 'true';
  }

  static async uploadDocument(uploadfile: string = "apps/test/resources/testupload.pdf") {
    await page.frameLocator("iframe#sideloadCenter").locator("input[type='file']").setInputFiles([uploadfile]);

    const uploadedfile = await page.frameLocator("iframe#sideloadCenter").locator("//investec-online-global-file-upload//p").first();
    const downloadstatus = await page.frameLocator("iframe#sideloadCenter").locator(".text-muted").nth(1);
  }

  static async selectTabByPartialText(iframe: any, tabName: string, timeout: number = 10000) {
    const tabLocator = iframe.locator('role=tab');
    await tabLocator.first().waitFor({ state: 'visible', timeout: timeout });
    const count = await tabLocator.count();
    for (let i = 0; i < count; i++) {
      const text = await tabLocator.nth(i).innerText();


      try {
        if (text.toLowerCase().includes(tabName.toLowerCase())) {
          await tabLocator.nth(i).click();
          return;
        }
      } catch (e) {
      }


    }
    throw new Error(`Tab with partial name '${tabName}' not found.`);
  }

  /**
    * 
    * @param optionsListLocator 
    * @param maxlistselection 
    */
  static async selectRandomOptionFromDropdown(optionsListLocator: Locator, maxlistselection: number = 10) {

    await optionsListLocator.first().waitFor({ state: 'visible', timeout: 5000 });
    let optionsCount = await optionsListLocator.count();

    if (optionsCount === 0) {
      throw new Error('No options found in the dropdown');
    }

    if (optionsCount > maxlistselection) {
      optionsCount = maxlistselection;
    }

    const randomIndex = Math.floor(Math.random() * optionsCount);
    const targetoption = optionsListLocator.nth(randomIndex);
    await this.click(targetoption);
  }

  static async click(locatorToClick: Locator, name = "None", timeout = 10000) {

    let btn = await locatorToClick.first();

    try {
      await btn.waitFor({ state: 'visible', timeout: timeout });
      await expect(btn).toBeVisible({ timeout });
      await expect(btn).toBeEnabled({ timeout });
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ timeout: timeout });
      return;
    } catch (error) {
      throw new Error(`Locator with name "${name}" and selector ${locatorToClick} is not visible or clickable.`);

    }




  }

  static async checkBoxCheck(locatorToClick: Locator, name = "None", timeout = 5000) {
    if (name == "None") {
      name = await locatorToClick.getAttribute("name") ?? await locatorToClick.innerText() ?? "None"
    }

    let maxRetries = 3;

    while (maxRetries > 0) {
      try {
        await page.waitForTimeout(1000);
        await locatorToClick.waitFor({ state: 'visible', timeout: timeout });
        await locatorToClick.check();
        return;
      } catch (error) {
        maxRetries--;
        if (maxRetries === 0) {
          throw new Error(`Checkbox with name "${name}" and selector ${locatorToClick} is not visible or clickable.`);
        }
        await page.waitForTimeout(1000); // Wait for 1 second before retrying
      }
    }

    // try {
    //   await page.waitForTimeout(1000);
    //   await locatorToClick.waitFor({ state: 'visible', timeout: timeout });
    //   await locatorToClick.check();
    // } catch (error) {
    //   throw new Error(`Checkbox with name "${name}" and selector ${locatorToClick} is not visible or clickable.`);
    // }
  }

  static async enterText(locatorToEdit: Locator, value: string, timeout = 5000) {
    try {
      await locatorToEdit.waitFor({ state: 'visible', timeout: timeout });
      await locatorToEdit.fill(value);
    } catch (error) {
      throw new Error(`Locator ${locatorToEdit}  is not visible or editable.`);
    }
  }

  static async waitForLoadingSpinnerToDisappear(iframe: any) {
    const maxWaitTime = 60000;
    try {
      const spinner = IBOL.getLoader(iframe);

      const isVisible = await spinner.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        await spinner.waitFor({ state: 'hidden', timeout: maxWaitTime });
      }
    } catch (error) {
      throw new Error(`❌ Loading spinner did not disappear within the expected time (${maxWaitTime}ms)`);
    }
  }

  // //dt[contains(text(),'${fieldName}')]/following-sibling::dd[1]
  static async getField(iframe: any, fieldName: string) {
    try {

      let locatorTest = iframe.locator(`//dt[contains(text(),'${fieldName}')]/following-sibling::dd[1]`).first();

      if (await locatorTest.count() > 0) {
        return locatorTest;

      }

      //       return iframe.locator(`//dt[contains(text(),'${fieldName}')]/following-sibling::dd[1]`).first();

      return iframe.locator(`//dt[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'${fieldName.toLowerCase()}')]/following-sibling::dd[1]`).first();
    } catch (error) {
      console.error(`Error finding field with name "${fieldName}":`, error);

      throw new Error(`Field with name "${fieldName}" not found.`);
    }
  }

  static async getButtonLocatorByName(iframe: any, buttonName: string) {
    return iframe.getByRole("button", { name: buttonName });
  }

  static async getFieldValue(iframe: any, fieldName: string) {
    try {

      
      let field = await this.getField(iframe, fieldName);

      let fieldValue = (await this.getField(iframe, fieldName)).textContent();
      const text = await fieldValue;
      fieldValue = text?.trim() ?? '';
      //dt[contains(text(),' Payment ID ')]/following-sibling::dd[1]//span


      return fieldValue;
    } catch (error) {
      return '';
    }

  }

  static async getFieldValues(iframe: any, fieldName: string): Promise<string[]> {
    const dd = await this.getField(iframe, fieldName);
    const spans = dd.locator('span');
    const count = await spans.count();
    if (count === 0) {
      const text = (await dd.textContent())?.trim();
      return text ? [text] : [];
    }
    return (await spans.allTextContents()).map(s => s.trim()).filter(Boolean);
  }

  static async isFiledNotEmptyNotDash(fieldName: string) {
    let flag = true;
    if (fieldName == null || fieldName.trim() == "" || fieldName.trim() == "-") {
      flag = false;
    }
    return flag;
  }

  static async isFiledNotEmptyAndDash(fieldName: string) {
    let flag = true;
    if (fieldName == null || fieldName.trim() == "") {
      flag = false;
    }
    return flag;
  }

  static async isFiledNotEmpty(fieldName: string) {
    let flag = true;
    if (fieldName == null || fieldName.trim() == "") {
      flag = false;
    }
    return flag;
  }

  static normalizeText(str: string): string {
    // return str.replace("-", "").trim().toLowerCase().replace(/\s+/g, " ");
    return str.replace(/[^a-zA-Z0-9 ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  static formatAmount(rawAmount: string): string {
    const numericStr = rawAmount.replace(/^R\s*/, '').replace(/,/g, '').replace(/\s/g, '');
    const num = parseFloat(numericStr);
    return !isNaN(num)
      ? `R ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : rawAmount;
  }

  /**
   * 
   * @param buttonToClick 
   * @param endpoint 
   * @param expectedStatus 
   * @returns { data: responseJson.data, meta: responseJson.meta, responseJson };
   */
  static async clickAndInterceptResponse(
    buttonToClick: Locator,
    endpoint: string,
    expectedStatus: number = 200
  ): Promise<any> {
    const responseBody = await IBOL.handndleAction(buttonToClick, "", endpoint, expectedStatus, "click")

    return {
      data: responseBody?.data,
      meta: responseBody?.meta,
      responseJson: responseBody,
    };

  }

  static async selectAndIntercept(
    selector: Locator, selectOption: string,
    endpoint: string,
    expectedStatus: number = 200
  ): Promise<any> {

    const responseBody = await IBOL.handndleAction(selector, selectOption, endpoint, expectedStatus, "select")

    return {
      data: responseBody?.data,
      meta: responseBody?.meta,
      responseJson: responseBody,
    };
  }

  static async handndleAction(selector: Locator, selectOption: string = "", endpoint: string = "api", expectedStatus: number = 200, actionType: string = 'click') {

    try {
      await selector.scrollIntoViewIfNeeded();
      await expect(selector).toBeVisible({ timeout: 10000 });
      await expect(selector).toBeEnabled({ timeout: 10000 });

      const perform = (actionType != 'click') ? await selector.selectOption({ value: `${selectOption}` }) : await selector.click();

      const [interceptedResponse] = await Promise.all([
        page.waitForResponse(
          response =>
            response.url().includes(endpoint) &&
            response.request().method() !== 'OPTIONS',
          { timeout: 90000 }
        ),
        perform
      ]);

      const actualStatus = interceptedResponse.status();

      let responseBody: any;

      try {
        responseBody = await interceptedResponse.json();
      } catch {
        responseBody = await interceptedResponse.text();
      }

      if (actualStatus !== expectedStatus) {
        const prettyBody =
          typeof responseBody === 'string'
            ? responseBody
            : JSON.stringify(responseBody, null, 2);

        throw new Error(
          [
            `Intercepted response status mismatch.`,
            `Endpoint: ${endpoint}`,
            `Expected status: ${expectedStatus}`,
            `Actual status: ${actualStatus}`,
            `Response URL: ${interceptedResponse.url()}`,
            `Response body:`,
            prettyBody,
          ].join('\n')
        );
      }

      return responseBody;

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`clickAndInterceptResponse failed for endpoint "${endpoint}": ${message}`);
    }
  }


  static async clickAndMockAPI(buttonToClick: Locator, endpoint: string, mockResponse: any) {
    let capturedResponse: any = null;
    let isFulfilled = false;

    await page.route(endpoint, async (route) => {
      isFulfilled = true;
      capturedResponse = mockResponse;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });

    await buttonToClick.waitFor({ state: 'visible', timeout: 10000 });
    await buttonToClick.click();

    await page.waitForTimeout(3000);
    await page.unroute(endpoint).catch(() => { /* ignore */ });

    if (!isFulfilled) {
      throw new Error(
        `clickAndMockAPI: mock for endpoint pattern "${endpoint}" was never triggered - the route never matched a request.\n`
      );
    }


    return { capturedResponse, isFulfilled };

  }



  static async fill(inputFiled: Locator, value: string) {
    try {

      await inputFiled.waitFor({ state: 'visible', timeout: 5000 });
      let inputValue = await inputFiled.inputValue({ timeout: 5000 });

      let isInputEnterd = false;

      while (!isInputEnterd) {
        await inputFiled.fill(value, { force: true });
        await page.waitForTimeout(1000);
        inputValue = await inputFiled.inputValue({ timeout: 5000 });
        isInputEnterd = inputValue !== "";
      }
    } catch (error) {
      throw new Error(`Locator ${inputFiled}  is not visible or editable.`);

    }
  }

  static async fillAndInterceptResponse(inputFiled: Locator, value: string, endpoint: string, expectedStatus: number = 200) {

    const responseMatcher = page.waitForResponse(
      response =>
        response.url().includes(endpoint) &&
        response.status() === expectedStatus,
      { timeout: 60000 }
    );
    await IBOL.fill(inputFiled, value);
    try {
      const interceptedResponse = await responseMatcher;
      const responseJson = await interceptedResponse.json();
      return responseJson.data;
    } catch (error) {
      throw new Error(`Filling input field with value "${value}" failed.\nExpected response from endpoint "${endpoint}" with status ${expectedStatus} was not received within the timeout period.\n`);
    }

  }


  static async getInputValue(inputField: Locator): Promise<string> {
    try {
      await inputField.waitFor({ state: 'attached', timeout: 5000 });
      return await inputField.inputValue({ timeout: 5000 });
    } catch (error) {
      throw new Error(`Locator ${inputField} is not attached or value could not be read.`);
    }
  }

  static async getTextContent(element: Locator, timeout: number = 5000): Promise<string> {
    await element.waitFor({ state: 'visible', timeout });
    return await element.textContent() ?? '-';
  }

  static async clickButtonAndVerifyNavigationUrl(buttonToClick: Locator, urlToVerify: string) {
    const urlPattern = new RegExp(urlToVerify.replace(/\//g, '\\/'));
    const navigationPromise = page.waitForURL(urlPattern, { timeout: 15000, waitUntil: 'load' });
    await buttonToClick.click();
    await navigationPromise;
    expect(page.url()).toContain(urlToVerify);
  }

  static async clickAndInterceptResponseAndVerifyNavigation(buttonToClick: Locator, endpoint: string, urlToVerify: string, expectedStatus: number = 200): Promise<any> {
    const urlPattern = new RegExp(urlToVerify.replace(/\//g, '\\/'));
    const responseMatcher = page.waitForResponse(
      response => response.url().includes(endpoint) && response.status() === expectedStatus
    );
    const navigationPromise = page.waitForURL(urlPattern, { timeout: 15000, waitUntil: 'load' });
    await buttonToClick.click();
    const [interceptedResponse] = await Promise.all([responseMatcher, navigationPromise]);
    expect(page.url()).toContain(urlToVerify);
    const responseJson = await interceptedResponse.json();
    return responseJson.data;
  }

  static async expectToBe(
    expected: any,
    actualFn: () => any | Promise<any>,
    assertion: (actual: any, expected: any) => void = (actual, expected) => expect(actual).toBe(expected),
    timeout = 5000
  ) {
    await expect(async () => {
      const actual = await actualFn();
      assertion(actual, expected);
    }).toPass({ timeout });
  }

  static containsSpecialChars(text: string): boolean {
    const specialCharRegex = /[^a-zA-Z0-9\s\-_]/;
    return specialCharRegex.test(text);
  }

  static getCharatersPart(text: string): string {
    const firstDigitIndex = text.search(/\d/);
    const charactersPart = firstDigitIndex === -1 ? text : text.slice(0, firstDigitIndex);
    return charactersPart.replace(/[\s\-_]+$/, '').trim();
  }

  static genNumbersPart(text: string): string {
    return (text.match(/\d+/g) ?? []).join('');
  }

  static getCharactersPart(text: string): string {
    return IBOL.getCharatersPart(text);
  }

  static getNumbersPart(text: string): string {
    return IBOL.genNumbersPart(text);
  }
}

