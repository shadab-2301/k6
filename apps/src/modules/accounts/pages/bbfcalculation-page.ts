import { expect, FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import AccountsTablePage from "./account-table-page";
import { iframeId } from "../../../../config/global-configs";
import { IBOL } from "../../../utilities/utilities/ibol-utilities";
import FilterMenu from "../../international-receipts/pages/FilterMenu";
import Table from "../../shared/pages/data-table-page";
import test from "playwright/test";
import { bbfRecord } from "../types/account-bbf-interface";
import moment from "moment";

export default class BBFCalculationPage {

  iframe: FrameLocator;
  static bbfCalculationResponse;
  static assertRecors: bbfRecord[] = [];

  constructor() {
    this.iframe = page.frameLocator(iframeId);
  }

  getTabByName = async (tabName: string) => {
    const tabLocator = this.iframe.getByRole('tab', { name: tabName });
    await tabLocator.first().waitFor({ state: 'visible', timeout: 10000 });
    return tabLocator;
  }

  getDownloadButtonByRow = async (rowIndex: number) => {
    const downloadBtn = this.iframe.locator(`(//tbody/tr)[${rowIndex}]//a[1]`);
    await downloadBtn.waitFor({ state: 'visible', timeout: 5000 });
    return downloadBtn;
  }

  getDetailsButtonByRow = async (rowIndex: number) => {
    const detailsBtn = this.iframe.locator(`(//tbody/tr)[${rowIndex}]//a[2]`);
    await detailsBtn.waitFor({ state: 'visible', timeout: 5000 });
    return detailsBtn;
  }

  clickTabByName = async (tabName: string) => {
    const tabLocator = await this.getTabByName(tabName);
    await tabLocator.first().click();
    const response = await IBOL.clickAndInterceptResponse(tabLocator, "/api/v1/lending/bbf/accounts/");//1300307792340/calculation-summary

    console.log(JSON.stringify(response, null, 2));
    BBFCalculationPage.bbfCalculationResponse = response;
  }


  static VeifyFundingLimit = () => {

    const cap = BBFCalculationPage.bbfCalculationResponse.data?.cap;
    const facilityLimit = BBFCalculationPage.bbfCalculationResponse.data?.facilityLimit;
    const uncappedQualifyingLimit = BBFCalculationPage.bbfCalculationResponse.data?.uncappedQualifyingLimit;

    console.log("Cap as per API response: ", cap);
    console.log("Uncapped Qualifying Limit as per API response: ", uncappedQualifyingLimit);
    console.log("Facility Limit as per API response: ", facilityLimit);

    try {
      if (uncappedQualifyingLimit <= cap) {
        expect(facilityLimit).toBe(uncappedQualifyingLimit);
        console.log("Expected Funding Limit : ", facilityLimit);
        return facilityLimit;
      }

      if (uncappedQualifyingLimit > cap) {
        expect(facilityLimit).toBe(cap);
        console.log("Expected Funding Limit : ", cap);
        return facilityLimit;
      }
    } catch (error) {
      throw new Error("Unexpected application of funding limit calculation logic. Please review the API response and calculation rules.");
    }

  }


  verifyFundingLimit = async () => {
    const entityName = await this.iframe.locator('.card-title').nth(0);

    expect(BBFCalculationPage.bbfCalculationResponse?.legalAgreementName).not.toBeNull();
    expect(BBFCalculationPage.bbfCalculationResponse?.legalAgreementName).not.toBe('');
    expect(BBFCalculationPage.bbfCalculationResponse?.legalAgreementName).not.toBe('-')


    expect(entityName).toContainText(BBFCalculationPage.bbfCalculationResponse.data?.legalAgreementName);

    let fundingLimit = await this.iframe.locator('.pb-2').nth(1);
    const fundingLimitText = (await fundingLimit.innerText())
      .replace("Funding limit:", "")
      .replace("R", "")
      .replace(/,/g, "")
      .trim();
    expect(fundingLimit).toBeVisible();

    const expectedFundingLimit = BBFCalculationPage.VeifyFundingLimit();
    console.log("Expected Funding Limit after applying calculation logic: ", expectedFundingLimit);
    console.log("Actual Funding Limit displayed on UI: ", fundingLimitText);

    expect(Number(parseFloat(fundingLimitText).toFixed(2))).toBe(Number(parseFloat(BBFCalculationPage.VeifyFundingLimit()).toFixed(2)));

    await this.getRecords();

  }


  getRecords = async () => {

    const assetGroups = BBFCalculationPage.bbfCalculationResponse.data.assetGroups;
    const size = assetGroups.length;

    console.log("Number of records in API response: ", size);
    let rowCount = 0;

    for (let i = 0; i < size; i++) {
      let asset = assetGroups[i];

      let record: bbfRecord = {
        Company: asset.assetGroupName,
        ReportingDate: "-",
        UncappedQualifying: asset.uncappedQualifyingLimit,
        Limit: asset.limit,
        isDownloadable: false
      };

      BBFCalculationPage.assertRecors.push(record);

      if (asset.assets) {
        let assets = asset.assets;
        let assetSize = assets.length;
        console.log(`Number of sub-assets for ${asset.assetGroupName}: `, assetSize);

        for (let j = 0; j < assetSize; j++) {
          let subAsset = assets[j];
          let subRecord: bbfRecord = {
            Company: subAsset.assetName,
            ReportingDate: moment(subAsset.reportingDate).format("DD MMMM YYYY"),
            UncappedQualifying: subAsset.uncappedQualifyingLimit,
            Limit: subAsset.limit,
            isDownloadable: subAsset.isExpandable
          };
          BBFCalculationPage.assertRecors.push(subRecord);
          rowCount++;
        }
      }

    }

    console.log(BBFCalculationPage.assertRecors);
  }


}