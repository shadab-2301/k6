import { FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import { faker } from "@faker-js/faker"
import { iframeId } from "../../../../config/global-configs";

export default class InternationRemitterPage {


  private iframe: FrameLocator;
  private readonly ddlForeignExchangeRate: Locator;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
  }

  getResidentialStatus() {
    return this.iframe.locator("#residentialStatus");
  }

  getDropDownOption(): Locator {
    return this.iframe.locator("//button[contains(@role, 'option')]");
  }

  getDropDownOptionByText(option: string): Locator {
    return this.iframe.locator(`//button[contains(@role, 'option') and contains(., '${option}')]`);
  }
  getRemitterType() {
    return this.iframe.locator("#remitterType");
  }

  getEntityName(): Locator {
    return this.iframe.locator("#entityName");
  }

  getRemmiterAddress(): Locator {
    return this.iframe.locator('(//a/u[contains(text(), "Click to view address details")])[1]');
  }

  getRemmiterFirstName(): Locator {
    return this.iframe.locator('#Name');
  }

  getRemmiterLastName(): Locator {
    return this.iframe.locator('#Surname');
  }

  getMyAddress(): Locator {
    return this.iframe.locator('(//a/u[contains(text(), "Click to view address details")])[2]');
  }

  async capatureResidentialStatus(resStatus: string | 'South African Resident') {

    let currentResidentialStatus = await this.getResidentialStatus().inputValue()
    if (currentResidentialStatus.toLowerCase().trim() !== resStatus.toLowerCase().trim()) {
      await this.getResidentialStatus().click();
      await this.getDropDownOptionByText(resStatus).click();
    }
  }

  async populateRemitterAddress() {
    const randomEmail = faker.internet.email();
    await this.iframe.locator('#AddressLine1').fill(faker.location.streetAddress())
    await this.iframe.locator('#AddressLine2').fill(faker.location.street())
    await this.iframe.locator('#remitterSuburb').fill(faker.location.street())
    await this.iframe.locator('#City').fill(faker.location.city())
    await this.iframe.locator('#State').fill(faker.location.state())
    await this.iframe.locator('#PostalCode').fill(faker.location.countryCode('numeric'))
    await this.iframe.locator('#CountryName').click()
    await this.getDropDownOption().nth(0).click()
    await this.iframe.locator("//button[contains(text(),'Save')]").click()
  }


  async captureMyDetails() {
    await this.getMyAddress().click();
    await this.populateMyAddress();
  }


  async populateMyAddress() {
    await this.iframe.locator('#ContactName').fill(faker.location.streetAddress())
    await this.iframe.locator('#ContactSurname').fill(faker.location.streetAddress())
    await this.iframe.locator('#Telephone').fill("0123117878")
    await this.iframe.locator('#Email').fill(faker.internet.email())
    await this.iframe.locator("//button[contains(text(),'Save')]").click()
  }

  async selectRemitterType(remitter: string) {
    let currentRemitterOption = await this.getRemitterType().inputValue()
    if (currentRemitterOption.toLowerCase().trim() !== remitter.toLowerCase().trim()) {
      await this.getRemitterType().click();
      await this.getDropDownOptionByText(remitter).click();
    }
  }

  async captureRemitter(remitter: string) {
    const trimmedRemitter = remitter.toLowerCase().trim();
    switch (trimmedRemitter) {
      case "individual":
        await this.captureIndividualRemitter();
        break;
      case "entity":
        await this.captureEntity();
        break;
      default:
        throw new Error(`Unsupported remitter type: ${remitter}`);
    }
  }

  async captureIndividualRemitter() {
    await this.getRemmiterFirstName().fill("Automation" + faker.person.firstName())
    await this.getRemmiterLastName().fill("Automation" + faker.person.lastName())
  }


  async captureEntity() {
    const entityNameInput = this.getEntityName();
    await entityNameInput.fill("Automation " + faker.company.name());
  }

  async captureRemitterAddress() {
    await this.getRemmiterAddress().click();
    await this.populateRemitterAddress();
  }
}