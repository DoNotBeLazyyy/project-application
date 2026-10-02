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

  // Open existing row in View mode
  console.log('Opening View mode...');
  await page.locator('button[title="Academic year actions"]').first().click();
  await page.waitForTimeout(500);
  await page.locator('li[role="menuitem"]:has-text("View")').click();
  await page.waitForTimeout(2000);

  // Click Edit
  await page.locator('button[title="Edit"]').click();
  await page.waitForTimeout(1000);

  // Navigate to Step 2 then Step 3
  const nextBtn = page.locator('button:has-text("Next")').first();
  await nextBtn.click();
  await page.waitForTimeout(1000);
  await nextBtn.click();
  await page.waitForTimeout(1000);

  // In Step 3:
  // Let's scroll the modal to show the Presets dropdown and Component breakdown
  const scrollContainers = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const scrollable = divs.find(d => d.scrollHeight > d.clientHeight && d.clientHeight > 200);
    if (scrollable) {
      scrollable.scrollTop = 220;
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'scratch/test-results/step3-presets-visible.png' });

  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const scrollable = divs.find(d => d.scrollHeight > d.clientHeight && d.clientHeight > 200);
    if (scrollable) {
      scrollable.scrollTop = 420;
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'scratch/test-results/step3-breakdown-visible.png' });

  // Let's click "Copy Breakdown" to test if "Paste Breakdown" appears
  console.log('Testing Copy Breakdown button in Step 3...');
  const copyBtn = page.locator('button[title*="Copy this component breakdown"]').first();
  if (await copyBtn.count() > 0) {
    await copyBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scratch/test-results/step3-after-copy.png' });
  }

  const buttonsInfo = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).map(b => ({
      title: b.title || b.getAttribute('aria-label') || '',
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height,
      visible: b.offsetParent !== null
    })).filter(b => b.title.includes('breakdown') || b.title.includes('Component') || b.title.includes('standard'));
    return btns;
  });
  console.log('Breakdown buttons after copy:', buttonsInfo);

  await browser.close();
  console.log('Step 3 deep test finished!');
}

run().catch(console.error);
