const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://logintest.secure.investec.com/login-wpaas/form', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for the iframe to load
  const iframe = page.frameLocator('#sideloadCenter');
  
  // Take screenshot of full page
  await page.screenshot({ path: 'apps/test/resources/screenshots/login-page.png', fullPage: true });
  console.log('Screenshot saved to apps/test/resources/screenshots/login-page.png');
  
  // Log the page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Log the URL
  console.log('Current URL:', page.url());
  
  // Wait a bit then close
  await page.waitForTimeout(3000);
  await browser.close();
})();
