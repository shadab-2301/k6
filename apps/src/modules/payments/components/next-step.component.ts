import { FrameLocator, Locator } from "playwright-with-cucumber-checks";

/**
 * NextStepComponent: static utility for Next Steps summary card locators
 */
export class NextStepComponent {
  static card(iframe: FrameLocator): Locator {
    return iframe.locator('investec-online-global-summary-next-step-card');
  }
  static nextStepHeader(iframe: FrameLocator): Locator {
    return iframe.locator("//investec-online-global-summary-next-step-card//div[contains(@class,'text-info') and contains(.,'Next steps')]");
  }
  static submitResponse(iframe: FrameLocator): Locator {
    return iframe.locator("//investec-online-global-summary-next-step-card//div[@class='mb-1']");
  }
  static approvalIdButtons(iframe: FrameLocator): Locator {
    return iframe.locator("//investec-online-global-summary-next-step-card//button");
  }
  static approvalIdButtonByText(iframe: FrameLocator, text: string): Locator {
    return this.approvalIdButtons(iframe).filter({ hasText: text });
  }
}
