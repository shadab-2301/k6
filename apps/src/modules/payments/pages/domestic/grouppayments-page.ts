import { IBOL } from "../../../../utilities/utilities/ibol-utilities";
import { iframeId } from "../../../../../config/global-configs";
import { FrameLocator, Locator, page, expect } from "playwright-with-cucumber-checks";
import { randomInt } from 'crypto';
import MultiPaymentPage from "./multipayment-page";
import Table from "../../../shared/pages/data-table-page";



export default class GroupPaymentPage {
  iframe: FrameLocator;
  groupNameField: Locator;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.groupNameField = this.iframe.locator("#beneficiaryGroupSelect");
  }

  async verifyDefaultBeneficiarycountSelected(numberOfBeneficiaries: number, maximumBeneficiaries): Promise<boolean> {
    const beneficiaryCount = await this.iframe.locator(`//h5`).last();
    const raw = (await beneficiaryCount.textContent()) ?? "";
    const actual = raw.trim().replace(/\s+/g, " ");
    const expected = `${numberOfBeneficiaries} of ${maximumBeneficiaries} beneficiaries selected`;
    expect(actual).toBe(expected);
    return await beneficiaryCount.isVisible();
  }

  async getSetGroupName(expectedGroupName: string): Promise<string> {
    console.log(`Expected group name from feature file:aaa ${expectedGroupName}`);
    await expect(this.groupNameField).toHaveValue(expectedGroupName);
    return await this.groupNameField.inputValue();
  }

  extractDatesFromText(text: string): string[] {
    const matches = text.match(/\d{2}\/\d{2}\/\d{4}/g);
    return matches ?? [];
  }

  async updatePaymentDate() {

    for (let i = 0; i < MultiPaymentPage.multiPartyPaymenRecords.length; i++) {
      const paymentDateText = await Table.getCellValueByHeader("Payment date", i);
      const record = MultiPaymentPage.multiPartyPaymenRecords[i];

      let dates;
      let normalizedPaymentDate = paymentDateText.trim();
      if (paymentDateText.includes("Edited")) {
        dates = this.extractDatesFromText(paymentDateText);
        normalizedPaymentDate = dates[0] ?? paymentDateText.trim();
      }

      if (normalizedPaymentDate === "") {
        throw new Error(`No payment date found in table value: ${paymentDateText}`);
      }

      if (record.paymentDate && record.paymentDate !== normalizedPaymentDate) {
        record.originalpaymentdate = record.paymentDate;
        record.autoForwaded = true;
      }

      record.paymentDate = normalizedPaymentDate;
    }
  }


  
  async setBeneficiaryGroup(groupName: string = "") {

    const beneficryGroupEditField = this.iframe.locator("#beneficiaryGroupSelect");
    const beneficryGroupDropdown = this.iframe.locator("#beneficiaryGroupSelect ~ button");
    const dropdownOptions = this.iframe.locator("[role='option']");

    let groupsData: any;
    if (groupName == "") {
      const { data } = await IBOL.clickAndInterceptResponse(beneficryGroupDropdown, "/groups");
      groupsData = data;
    } else {
      groupsData = await IBOL.fillAndInterceptResponse(beneficryGroupEditField, groupName, "/groups");
    }

    console.log(JSON.stringify(groupsData, null, 2));

    if (groupsData.length === 0) {
      throw new Error("No beneficiary groups found for the user");
    }

    await dropdownOptions.first().waitFor({ state: 'visible' });

    if (groupName !== "") {
      const optionToSelect = dropdownOptions.filter({ hasText: new RegExp(`^${groupName}$`, 'i') });

      if (await optionToSelect.count() === 0) {
        throw new Error(`Beneficiary group with name "${groupName}" not found in the dropdown options`);
      }

      const { data } = await IBOL.clickAndInterceptResponse(optionToSelect, "/members");
      groupsData = data;
      const selectedGroupName = await beneficryGroupEditField.inputValue();
      return { selectedGroupName, groupsData };
    }

    const optionsCount = await dropdownOptions.count();

    if (optionsCount === 0) {
      throw new Error("No beneficiary group options available");
    }

    const randomIndex = Math.floor(Math.random() * optionsCount);
    const randomOption = dropdownOptions.nth(randomIndex);

    const { data } = await IBOL.clickAndInterceptResponse(randomOption, "/members");
    groupsData = data;
    const selectedGroupName = await beneficryGroupEditField.inputValue();
    return { selectedGroupName, groupsData };
  }


  async searchBeneficiaryInGroup(groupBeneficiaries: any) {

    if (!groupBeneficiaries?.length) {
      throw new Error("groupsData is empty or undefined");
    }

    const randomIndex = randomInt(0, groupBeneficiaries.length);

    const beneficiaryToSearch = groupBeneficiaries[randomIndex].beneficiaryName;

    const beneficryGroupSearchField = this.iframe.locator("#basic-search");
    const data = await IBOL.fillAndInterceptResponse(beneficryGroupSearchField, beneficiaryToSearch, "/members");
    return data;
  }

}