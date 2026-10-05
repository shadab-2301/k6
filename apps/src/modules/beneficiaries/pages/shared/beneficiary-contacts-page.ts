import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { getAccountNumberByIndex } from "../../../../utilities/utilities/test-data-repo";
import { Banks } from "../../../../../test/data/test-data-const";
import { IBankDetails } from "../../../shared/types/bank-details-interface";
import { IBeneficiaryReferences } from "../../types/beneficiary-reference-interface";
import { IBeneficiaryContacts } from "../../types/beneficiary-contacts-interface";
import { iframeId } from "../../../../../config/global-configs";


export default class BeneficiaryContact {
  iframe: FrameLocator;

  readonly txtEmailAddress: Locator;
  readonly txtContactNumber: Locator;
  capturedContactDetails;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.txtEmailAddress = this.iframe.locator('//input[@placeholder="Select bank name"]');
    this.txtContactNumber = this.iframe.locator('#branchCode');
  }



  async captureContactDetails(emailAddress?: string, contactNumber?: string) {
    if (emailAddress) {
      await this.txtEmailAddress.fill(emailAddress)
    } else {
      await this.txtEmailAddress.fill("moxetibane@investec.com")
    }

    if (contactNumber) {
      await this.txtContactNumber.fill(contactNumber)
    } else {
      await this.txtEmailAddress.fill("0712004000")
    }

    this.capturedContactDetails = this.getCapturedContactDetails;

  }

  async getCapturedContactDetails() {
    return {
      emailAddress: await this.txtEmailAddress.inputValue(),
      contactNumber: await this.txtContactNumber.inputValue(),
    } as IBeneficiaryContacts;
  }

}