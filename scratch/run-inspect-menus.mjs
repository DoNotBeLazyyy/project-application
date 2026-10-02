import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto('https://project-application-two.vercel.app/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('input[type="email"]').fill('juliustolentino.diamond@gmail.com');
  await page.locator('input[type="password"]').fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);

  console.log('Navigating to /admin/school-years...');
  await page.goto('https://project-application-two.vercel.app/admin/school-years', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Click Table actions (3 dots next to search input)
  console.log('Clicking Table actions (3 dots)...');
  const tableActionsBtn = page.locator('button[title="Table actions"], button[aria-label="Table actions"]').first();
  await tableActionsBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/test-results/05-table-actions-menu.png' });

  // Get menu items
  const menuItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="menuitem"], li, button')).map(el => ({
      text: el.innerText.trim(),
      role: el.getAttribute('role'),
      visible: el.offsetParent !== null
    })).filter(el => el.visible && el.text);
  });
  console.log('Menu items:', menuItems);

  // Check card actions (3 dots on the Academic Year 2026-2027 card)
  console.log('Clicking Academic year actions on card...');
  // Close existing menu first by clicking outside or escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const cardActionsBtn = page.locator('button[title="Academic year actions"], button[aria-label="Academic year actions"]').first();
  await cardActionsBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/test-results/06-card-actions-menu.png' });

  const cardMenuItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="menuitem"], li, button')).map(el => ({
      text: el.innerText.trim(),
      role: el.getAttribute('role'),
      visible: el.offsetParent !== null
    })).filter(el => el.visible && el.text);
  });
  console.log('Card menu items:', cardMenuItems);

  await browser.close();
}

run().catch(console.error);
