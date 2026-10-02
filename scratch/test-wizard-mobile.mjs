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

  console.log('1. Logging in...');
  await page.goto('https://project-application-two.vercel.app/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('input[type="email"]').fill('juliustolentino.diamond@gmail.com');
  await page.locator('input[type="password"]').fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);

  console.log('2. Navigating to /admin/school-years...');
  await page.goto('https://project-application-two.vercel.app/admin/school-years', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Check 375px page layout scrollWidth
  const pageScroll = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    windowInnerWidth: window.innerWidth,
    hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  }));
  console.log('Page layout scroll check on 375px:', pageScroll);

  // 3. Open Academic Year in View mode from card actions
  console.log('3. Opening existing row in View mode...');
  await page.locator('button[title="Academic year actions"], button[aria-label="Academic year actions"]').first().click();
  await page.waitForTimeout(500);
  await page.locator('li[role="menuitem"]:has-text("View")').click();
  await page.waitForTimeout(2000);

  // Click Edit button in modal header
  console.log('Clicking Edit button in modal header...');
  const editBtn = page.locator('button[title="Edit"], button[aria-label="Edit"]');
  if (await editBtn.count() > 0) {
    await editBtn.click();
    await page.waitForTimeout(1000);
  }

  // Navigate to Step 2
  const nextBtn = page.locator('button:has-text("Next"), button[title="Next Step"]').first();
  console.log('Navigating to Step 2...');
  await nextBtn.click();
  await page.waitForTimeout(1500);

  // Navigate to Step 3
  console.log('Navigating to Step 3...');
  await nextBtn.click();
  await page.waitForTimeout(1500);

  // Navigate to Step 4
  console.log('Navigating to Step 4...');
  await nextBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/test-results/12-step4.png' });

  // Step 4 inspection
  const step4Info = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const schemaSelect = selects.find(s => {
      const opts = Array.from(s.options).map(o => o.value);
      return opts.includes('ched') || opts.includes('us_gpa');
    });

    const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
      title: b.title || b.getAttribute('aria-label') || '',
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height,
      top: b.getBoundingClientRect().top
    }));

    const resetBlankBtn = buttons.find(b => b.title === 'Reset to Blank' || b.text === 'Reset to Blank');
    const addRowBtn = buttons.find(b => b.title.includes('Add') || b.text.includes('Add Row') || b.text.includes('Add Grade Row'));

    return {
      bodyScrollWidth: document.body.scrollWidth,
      windowInnerWidth: window.innerWidth,
      hasOverflow: document.body.scrollWidth > window.innerWidth,
      schemaSelect: schemaSelect ? {
        width: schemaSelect.getBoundingClientRect().width,
        height: schemaSelect.getBoundingClientRect().height,
        options: Array.from(schemaSelect.options).map(o => o.text)
      } : null,
      resetBlankBtn,
      addRowBtn
    };
  });
  console.log('Step 4 info:', JSON.stringify(step4Info, null, 2));

  // Navigate to Step 5
  console.log('Navigating to Step 5...');
  await nextBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/test-results/13-step5.png' });

  // Step 5 inspection
  const step5Info = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const thresholdSelect = selects.find(s => {
      const opts = Array.from(s.options).map(o => o.value);
      return opts.includes('honors');
    });

    const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
      title: b.title || b.getAttribute('aria-label') || '',
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height,
      top: b.getBoundingClientRect().top
    }));

    const resetBlankBtn = buttons.find(b => b.title === 'Reset to Blank' || b.text === 'Reset to Blank');
    const addThresholdBtn = buttons.find(b => b.title.includes('Threshold') || b.text.includes('Add Threshold'));

    return {
      bodyScrollWidth: document.body.scrollWidth,
      windowInnerWidth: window.innerWidth,
      hasOverflow: document.body.scrollWidth > window.innerWidth,
      thresholdSelect: thresholdSelect ? {
        width: thresholdSelect.getBoundingClientRect().width,
        height: thresholdSelect.getBoundingClientRect().height,
        options: Array.from(thresholdSelect.options).map(o => o.text)
      } : null,
      resetBlankBtn,
      addThresholdBtn
    };
  });
  console.log('Step 5 info:', JSON.stringify(step5Info, null, 2));

  // Navigate to Step 6
  console.log('Navigating to Step 6...');
  await nextBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/test-results/14-step6.png' });

  const step6Info = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    windowInnerWidth: window.innerWidth,
    hasOverflow: document.body.scrollWidth > window.innerWidth
  }));
  console.log('Step 6 info:', JSON.stringify(step6Info, null, 2));

  await browser.close();
  console.log('Testing completed successfully!');
}

run().catch(console.error);
