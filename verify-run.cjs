const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log('Starting visual verification with logging...');
  fs.mkdirSync('/home/jules/verification/videos', { recursive: true });
  fs.mkdirSync('/home/jules/verification/screenshots', { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    recordVideo: {
      dir: '/home/jules/verification/videos',
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Go to dev server
  await page.goto('http://localhost:5173/');
  // Clear seen flag to trigger onboarding
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(2000);

  console.log('Taking debug screenshot...');
  await page.screenshot({ path: '/home/jules/verification/screenshots/debug_onboarding.png' });

  await context.close();
  await browser.close();
  console.log('Done debug.');
})();
