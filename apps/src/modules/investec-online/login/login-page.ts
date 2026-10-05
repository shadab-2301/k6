import { expect, FrameLocator, Locator, page } from "playwright-with-cucumber-checks";
import Action from "../../../../helper/actions";
import Command from "../../../../helper/commands";
import { iframeId } from "../../../../config/global-configs";

export default class LoginPage {
  readonly iframe: FrameLocator;
  readonly txtUsername: Locator;
  readonly txtPassword: Locator;
  readonly txtOTP: Locator;
  readonly inAppLoader: Locator;
  readonly loginButtonloader: Locator;
  readonly profileDropdown: Locator;
  readonly appSelectionCard: Locator;

  constructor() {
    this.iframe = page.frameLocator(iframeId);
    this.txtUsername = this.iframe.locator("#investecId");
    this.txtPassword = this.iframe.locator("#investecPassword");
    this.txtOTP = this.iframe.locator("#otp, #otpInput, input[name='otp'], input[id*='otp']").first();
    this.inAppLoader = this.iframe.locator("#inapp-heading");
    this.loginButtonloader = this.iframe.locator("#loginForm");
    this.profileDropdown = this.iframe.locator("#dropdown-typeahead");
    this.appSelectionCard = this.iframe.locator("h5").filter({ hasText: /Investec Business|Investec Business Online/i }).first();
  }

  getTxtInputBox() {
    return this.iframe.locator("#otpInput");
  }

  public async logOut() {
    try {
      await this.iframe.locator("body").waitFor({ state: 'attached', timeout: 30000 });
    } catch (error) {
      throw new Error("Logout: Login iframe failed to load.");
    }
    await page.locator("#loginLogoutButton").click();
    await this.txtUsername.waitFor({ timeout: 30000 });
  }

  static async clickLogout() {
    if (await page.locator("#loginLogoutButton").isEnabled()) {
      await page.locator("#loginLogoutButton").click();
    }
  }

  public async delay(time) {
    return new Promise(function (resolve) {
      setTimeout(resolve, time)
    });
  }

  private async enterCredentials(username: string, password: string) {
    await Command.enterText(this.txtUsername, username);
    await Command.enterText(this.txtPassword, password);
  }

  public async Login(username: string, password: string, userType?: string) {

    try {
      await this.iframe.locator("body").waitFor({ state: 'attached', timeout: 60000 });
    } catch (error) {
      throw new Error("Login iframe failed to load. The sideload frame did not attach within timeout.");
    }

    await expect(() => {
      this.txtUsername.isVisible({ timeout: 5000 })
    }).toPass({ timeout: 60000 })

    const fallbackMappedUsername = process.env[username] || process.env[`${username}`];
    const finalUsername = fallbackMappedUsername || username;
    const finalPassword = password || process.env.PASSWORD || "";

    await this.enterCredentials(finalUsername, finalPassword);
    await Action.clickSubmitButton("Log in");

    try {
      const authDeadline = Date.now() + 120000;
      let authenticated = false;
      let otpDetected = false;
      let otpSubmitted = false;

      const isAuthenticatedLandingVisible = async (): Promise<boolean> => {
        // Profile dropdown indicates authenticated dashboard.
        const profileReady = await this.profileDropdown.isVisible({ timeout: 2000 }).catch(() => false);
        if (profileReady) {
          console.log("[LoginPage] ✓ Profile dropdown detected - authenticated");
          return true;
        }

        // App selection card indicates authenticated app picker.
        const appPickerReady = await this.appSelectionCard.isVisible({ timeout: 2000 }).catch(() => false);
        if (appPickerReady) {
          console.log("[LoginPage] ✓ App selection card detected - at product selection");
          return true;
        }

        // Left navigation indicates authenticated dashboard/home page.
        const leftNavReady = await page.locator("#leftNavMenuItems").isVisible({ timeout: 1500 }).catch(() => false);
        if (leftNavReady) {
          console.log("[LoginPage] ✓ Left navigation detected - authenticated");
          return true;
        }

        // Payments top nav can also be an authenticated marker.
        const paymentsNavReady = await this.iframe.locator("//a[contains(@id, 'nav-item-payments')] | //button[contains(@id, 'nav-button-payments')]")
          .first()
          .isVisible({ timeout: 1500 })
          .catch(() => false);
        if (paymentsNavReady) {
          console.log("[LoginPage] ✓ Payments navigation detected - authenticated");
          return true;
        }

        return false;
      };

      while (Date.now() < authDeadline) {
        const postLoginReady = await isAuthenticatedLandingVisible();
        if (postLoginReady) {
          authenticated = true;
          break;
        }

        // EXPLICIT WAIT: Check for OTP with longer timeout (network can be slow)
        const otpVisible = await this.txtOTP.isVisible({ timeout: 5000 }).catch(() => false);
        if (otpVisible) {
          otpDetected = true;
          console.log("[LoginPage] 🔐 OTP field detected - waiting for field to be ready...");

          // EXPLICIT WAIT: Wait for element to be enabled and editable before typing
          try {
            await this.txtOTP.waitFor({ state: 'visible', timeout: 3000 });
            // Additional check: wait for element to be enabled
            const isEnabled = await this.txtOTP.isEnabled({ timeout: 2000 }).catch(() => false);
            if (!isEnabled) {
              console.log("[LoginPage] ⚠️ OTP field not enabled yet, waiting...");
              await this.delay(500);
            }
          } catch (e) {
            console.log("[LoginPage] ⚠️ OTP field readiness check failed:", e.message);
          }

          // Fill OTP with explicit wait and retry logic
          let otpFilled = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              console.log(`[LoginPage] OTP fill attempt ${attempt}/3...`);
              await this.txtOTP.fill("123456", { force: false, timeout: 3000 });
              otpFilled = true;
              console.log("[LoginPage] ✓ OTP filled successfully");
              break;
            } catch (e) {
              console.log(`[LoginPage] ⚠️ OTP fill attempt ${attempt} failed:`, e.message);
              if (attempt < 3) {
                // Exponential backoff: 500ms, 1000ms, 1500ms
                await this.delay(attempt * 500);
              }
            }
          }

          if (!otpFilled) {
            console.log("[LoginPage] ❌ Failed to fill OTP after 3 attempts");
            continue; // Skip to next iteration of main loop
          }

          // Click submit button
          try {
            console.log("[LoginPage] Submitting OTP...");
            await Action.clickSubmitButton("Submit");
            otpSubmitted = true;
          } catch (e) {
            console.log("[LoginPage] ⚠️ Submit button click failed:", e.message);
          }

          // Wait for post-login response with explicit timeout
          console.log("[LoginPage] Waiting for post-OTP authentication...");
          const postLoginAfterOtp = await isAuthenticatedLandingVisible();
          if (postLoginAfterOtp) {
            authenticated = true;
            console.log("[LoginPage] ✓ Authenticated after OTP");
            break;
          }

          // Check if OTP is still visible (error or retry needed)
          const otpStillVisible = await this.txtOTP.isVisible({ timeout: 5000 }).catch(() => false);
          if (otpStillVisible) {
            console.log("[LoginPage] ⚠️ OTP still visible - retrying OTP submission...");
            // Don't sleep here, let the next iteration handle it
          } else {
            console.log("[LoginPage] ℹ️ OTP field no longer visible; waiting for authenticated landing...");
            await this.delay(1000); // Wait for page to stabilize
          }
        } else {
          // No OTP visible, wait briefly before checking again
          await this.delay(500);
        }
      }

      if (!authenticated) {
        throw new Error(
          "Login did not reach an authenticated state within timeout (120s). " +
          `otpDetected=${otpDetected}, otpSubmitted=${otpSubmitted}`
        );
      }

    } catch (error) {
      throw new Error(
        `Sign-in did not complete. Username ${username.substring(0, 4)}****. ` +
        `OTP may not have rendered or session did not transition to the dashboard. ` +
        `Details: ${error.message}`
      );
    }

    await this.handleSecurityModal();

  }

  async handleSecurityModal() {
    console.log("[LoginPage] Checking for security questions modal...");

    const securityModal = page.locator('iframe[title="sideloadCenter"]').contentFrame().getByTestId('user-onboarding-security-questions-heading-title');

    let isSecurityModalVisible = false;
    try {
      // EXPLICIT WAIT: Use longer timeout for security modal visibility (network latency)
      isSecurityModalVisible = await securityModal.isVisible({ timeout: 8000 }).catch(() => false);
    } catch (error) {
      console.log("[LoginPage] ⚠️ Security modal visibility check failed:", error.message);
      isSecurityModalVisible = false;
    }

    if (isSecurityModalVisible) {
      console.log("[LoginPage] 🔒 Security questions modal detected - filling responses...");

      const inputIdPrefix = "user-onboarding-security-questions-input-question-";
      for (let i = 0; i < 9; i++) {
        try {
          const inputElement = this.iframe.getByTestId(`${inputIdPrefix}${i}`);

          // EXPLICIT WAIT: Ensure element is ready before filling
          await inputElement.waitFor({ state: 'visible', timeout: 3000 }).catch(() => { });

          // Check if element is enabled/editable
          const isEnabled = await inputElement.isEnabled({ timeout: 2000 }).catch(() => false);
          if (isEnabled) {
            console.log(`[LoginPage] Filling security question ${i + 1}/9...`);
            await inputElement.fill("BTB", { timeout: 2000 });
          } else {
            console.log(`[LoginPage] ⚠️ Security question ${i + 1} not enabled, skipping`);
          }
        } catch (e) {
          console.log(`[LoginPage] ⚠️ Failed to fill security question ${i + 1}:`, e.message);
        }
      }

      // EXPLICIT WAIT: Wait for "Next" button to be ready and click
      try {
        const nextButton = this.iframe.getByTestId('user-onboarding-security-questions-button-next');
        await nextButton.waitFor({ state: 'visible', timeout: 3000 });
        console.log("[LoginPage] Clicking Next button...");
        await nextButton.click({ timeout: 2000 });
      } catch (e) {
        console.log("[LoginPage] ⚠️ Next button click failed:", e.message);
      }

      // EXPLICIT WAIT: Wait for "Go to my dashboard" button to appear and click
      try {
        const dashboardButton = this.iframe.locator("//span[text()='Go to my dashboard']");
        await dashboardButton.waitFor({ state: 'visible', timeout: 5000 });
        console.log("[LoginPage] Clicking 'Go to my dashboard'...");
        await dashboardButton.click({ timeout: 2000 });
      } catch (e) {
        console.log("[LoginPage] ⚠️ Dashboard button click failed:", e.message);
      }

      console.log("[LoginPage] ✓ Security modal handled successfully");
    } else {
      console.log("[LoginPage] ℹ️ No security questions modal detected - proceeding to dashboard");
    }
  }


  async switchProfile(profileName: string) {
    console.log(`[LoginPage] Switching profile to: "${profileName}"`);

    const dropdown = this.iframe.locator("#dropdown-typeahead");

    // EXPLICIT WAIT: Ensure dropdown is attached before interacting
    try {
      await dropdown.waitFor({ state: 'attached', timeout: 10000 });
      console.log("[LoginPage] Profile dropdown attached");
    } catch (e) {
      throw new Error(`Profile dropdown failed to attach: ${e.message}`);
    }

    // EXPLICIT WAIT: Ensure dropdown is visible with longer timeout
    await expect(async () => {
      const isVisible = await dropdown.isVisible({ timeout: 3000 });
      if (!isVisible) throw new Error("Dropdown not visible");
    }).toPass({ timeout: 15000 });
    console.log("[LoginPage] Profile dropdown visible");

    // Get current profile with error handling
    let currentProfile = "";
    try {
      currentProfile = await dropdown.inputValue({ timeout: 3000 });
      console.log(`[LoginPage] Current profile: "${currentProfile}"`);
    } catch (e) {
      console.log("[LoginPage] ⚠️ Could not get current profile value:", e.message);
    }

    // Only switch if different
    if (currentProfile.toLowerCase() !== profileName.toLowerCase()) {
      console.log("[LoginPage] Profile mismatch - switching...");

      try {
        // Click dropdown to open options
        await dropdown.click({ timeout: 2000 });
        await this.delay(300); // Wait for dropdown animation

        // Find and click the option
        const option = this.iframe.getByRole("option", { name: profileName });
        await option.waitFor({ state: 'visible', timeout: 5000 });
        console.log("[LoginPage] Clicking profile option...");
        await option.click({ timeout: 2000 });
        console.log(`[LoginPage] ✓ Profile switched to: "${profileName}"`);
      } catch (e) {
        throw new Error(`Failed to switch profile to ${profileName}: ${e.message}`);
      }
    } else {
      console.log(`[LoginPage] ℹ️ Profile already set to: "${profileName}"`);
    }
  }
}
