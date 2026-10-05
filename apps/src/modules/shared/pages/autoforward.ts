import { FrameLocator, page } from "playwright-with-cucumber-checks";
import { iframeId } from "../../../../config/global-configs";

class DateAutoForward {

  public static getIframe(): FrameLocator {
    return page.frameLocator(iframeId);
  }


  public static getModalHeader() {
    return this.getIframe().locator(`ngb-offcanvas-panel h4`);
  }

  public static getModalInformation() {
    return this.getIframe().locator(`ngb-offcanvas-panel p`);
  }

  public static getModalSelectAllCheckBox() {
    return this.getIframe().locator(`ngb-offcanvas-panel .ids-checkbox-control__input`);
  }

  public static getModalIndividualCheckBox() {
    return this.getIframe().locator(`ngb-offcanvas-panel .form-check-input.me-3`);
  }
  public static getModalNewTransferDate() {
    return this.getIframe().locator(`ngb-offcanvas-panel .text-muted`).textContent();
  }

  public static clickButton(buttonName: string) {
    this.getIframe().locator(`//ngb-offcanvas-panel//span[contains(.,'${buttonName} ')]`).click();
  }


}

export default DateAutoForward;
