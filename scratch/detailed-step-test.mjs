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
  
  // Wait for content to render
  await page.waitForSelector('button[title="Academic year actions"]', { timeout: 20000 });
  await page.waitForTimeout(1000);

  // Check 375px page layout
  const pageCheck = await page.evaluate(() => {
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      windowInnerWidth: window.innerWidth,
      hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
  console.log('Main Page 375px layout check:', pageCheck);

  // Open existing row in View mode first
  console.log('Opening View mode...');
  await page.locator('button[title="Academic year actions"]').first().click();
  await page.waitForTimeout(600);
  await page.locator('li[role="menuitem"]:has-text("View")').click();
  await page.waitForTimeout(2000);

  // Measure Header buttons in View mode
  const headerViewBtns = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => {
      const title = b.title || b.getAttribute('aria-label') || b.innerText.trim();
      return ['Preview', 'History', 'Edit', 'Close'].includes(title);
    }).map(b => ({
      title: b.title || b.getAttribute('aria-label') || b.innerText.trim(),
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height,
      top: b.getBoundingClientRect().top
    }));
    return {
      btns,
      uniqueTops: [...new Set(btns.map(b => Math.round(b.top)))],
      scrollWidth: document.body.scrollWidth
    };
  });
  console.log('Modal Header buttons (View mode):', headerViewBtns);

  // Click Edit to enter Edit mode
  console.log('Clicking Edit button...');
  await page.locator('button[title="Edit"]').click();
  await page.waitForTimeout(1000);

  // Measure Header buttons in Edit mode (Preview, Roll Forward +1 Year, History, Close)
  const headerEditBtns = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => {
      const title = b.title || b.getAttribute('aria-label') || b.innerText.trim();
      return ['Preview', 'Roll Forward +1 Year', 'History', 'Close'].includes(title);
    }).map(b => ({
      title: b.title || b.getAttribute('aria-label') || b.innerText.trim(),
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height,
      top: b.getBoundingClientRect().top
    }));
    return {
      btns,
      uniqueTops: [...new Set(btns.map(b => Math.round(b.top)))],
      scrollWidth: document.body.scrollWidth
    };
  });
  console.log('Modal Header buttons (Edit mode):', headerEditBtns);

  // Helper to scroll modal body
  async function scrollModalBy(scrollY) {
    await page.evaluate((y) => {
      const scrollable = Array.from(document.querySelectorAll('div')).find(
        el => el.scrollHeight > el.clientHeight && el.clientHeight > 200
      );
      if (scrollable) {
        scrollable.scrollTop = y;
      }
    }, scrollY);
    await page.waitForTimeout(400);
  }

  // --- STEP 1 ---
  console.log('Step 1: checking layout');
  await page.screenshot({ path: 'scratch/test-results/step1-mobile.png' });

  // --- STEP 2 ---
  console.log('Step 2: navigating');
  const nextBtn = page.locator('button:has-text("Next")').first();
  await nextBtn.click();
  await page.waitForTimeout(1200);

  const step2Elements = await page.evaluate(() => {
    const addBtn = document.querySelector('button[title="Add Term"]');
    const resetBlankBtns = Array.from(document.querySelectorAll('button[title*="Reset Term Dates"]')).map(b => ({
      title: b.title,
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height
    }));
    const removeBtns = Array.from(document.querySelectorAll('button[title="Remove Term"]')).map(b => ({
      title: b.title,
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height
    }));

    return {
      bodyScrollWidth: document.body.scrollWidth,
      addBtn: addBtn ? {
        title: addBtn.title,
        text: addBtn.innerText.trim(),
        width: addBtn.getBoundingClientRect().width,
        height: addBtn.getBoundingClientRect().height
      } : null,
      resetBlankBtns,
      removeBtns
    };
  });
  console.log('Step 2 elements:', step2Elements);
  await page.screenshot({ path: 'scratch/test-results/step2-top-mobile.png' });
  await scrollModalBy(300);
  await page.screenshot({ path: 'scratch/test-results/step2-card-mobile.png' });

  // --- STEP 3 ---
  console.log('Step 3: navigating');
  await nextBtn.click();
  await page.waitForTimeout(1200);

  // In Step 3: check Presets dropdown (<select>) and Component Breakdown toolbar buttons
  const step3Elements = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      visible: s.offsetParent !== null,
      width: s.getBoundingClientRect().width,
      height: s.getBoundingClientRect().height,
      options: Array.from(s.options).map(o => o.text)
    }));

    const copyBtns = Array.from(document.querySelectorAll('button[title*="Copy this component breakdown"]')).map(b => ({
      title: b.title,
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height
    }));

    const pasteBtns = Array.from(document.querySelectorAll('button[title*="Paste copied breakdown"]')).map(b => ({
      title: b.title,
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height
    }));

    const applyAllBtns = Array.from(document.querySelectorAll('button[title*="Apply this breakdown to all"]')).map(b => ({
      title: b.title,
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height
    }));

    const resetPresetBtns = Array.from(document.querySelectorAll('button[title*="Reset to standard 30/30/40"]')).map(b => ({
      title: b.title,
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height
    }));

    const addCompBtns = Array.from(document.querySelectorAll('button[title="Add Component"]')).map(b => ({
      title: b.title,
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height
    }));

    return {
      bodyScrollWidth: document.body.scrollWidth,
      selects,
      copyBtns,
      pasteBtns,
      applyAllBtns,
      resetPresetBtns,
      addCompBtns
    };
  });
  console.log('Step 3 elements:', JSON.stringify(step3Elements, null, 2));

  // Scroll to show Presets dropdown and screenshot
  await scrollModalBy(150);
  await page.screenshot({ path: 'scratch/test-results/step3-presets-mobile.png' });

  // Scroll down to Component Breakdown and screenshot
  await scrollModalBy(450);
  await page.screenshot({ path: 'scratch/test-results/step3-components-mobile.png' });

  // --- STEP 4 (Holidays) ---
  console.log('Step 4: navigating to Holidays...');
  await nextBtn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'scratch/test-results/step4-holidays-mobile.png' });

  // --- STEP 5 (Grade Transmutation / Schema) ---
  console.log('Step 5: navigating to Grade Schema...');
  await nextBtn.click();
  await page.waitForTimeout(1200);

  const step5Elements = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      visible: s.offsetParent !== null,
      width: s.getBoundingClientRect().width,
      height: s.getBoundingClientRect().height,
      options: Array.from(s.options).map(o => o.text)
    }));

    const resetBlankBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.title === 'Reset to Blank' || b.innerText.trim() === 'Reset to Blank'
    );
    const addRowBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.title.includes('Add') || b.innerText.trim().includes('Add')
    );

    return {
      bodyScrollWidth: document.body.scrollWidth,
      selects,
      resetBlankBtn: resetBlankBtn ? {
        title: resetBlankBtn.title,
        text: resetBlankBtn.innerText.trim(),
        width: resetBlankBtn.getBoundingClientRect().width,
        height: resetBlankBtn.getBoundingClientRect().height
      } : null,
      addRowBtn: addRowBtn ? {
        title: addRowBtn.title,
        text: addRowBtn.innerText.trim(),
        width: addRowBtn.getBoundingClientRect().width,
        height: addRowBtn.getBoundingClientRect().height
      } : null
    };
  });
  console.log('Step 5 (Grade Schema) elements:', JSON.stringify(step5Elements, null, 2));
  await page.screenshot({ path: 'scratch/test-results/step5-grade-schema-top.png' });
  await scrollModalBy(250);
  await page.screenshot({ path: 'scratch/test-results/step5-grade-schema-scrolled.png' });

  // --- STEP 6 (Academic Thresholds) ---
  console.log('Step 6: navigating to Academic Thresholds...');
  await nextBtn.click();
  await page.waitForTimeout(1200);

  const step6Elements = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      visible: s.offsetParent !== null,
      width: s.getBoundingClientRect().width,
      height: s.getBoundingClientRect().height,
      options: Array.from(s.options).map(o => o.text)
    }));

    const resetBlankBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.title === 'Reset to Blank' || b.innerText.trim() === 'Reset to Blank'
    );
    const addThresholdBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.title.includes('Threshold') || b.innerText.trim().includes('Threshold')
    );

    return {
      bodyScrollWidth: document.body.scrollWidth,
      selects,
      resetBlankBtn: resetBlankBtn ? {
        title: resetBlankBtn.title,
        text: resetBlankBtn.innerText.trim(),
        width: resetBlankBtn.getBoundingClientRect().width,
        height: resetBlankBtn.getBoundingClientRect().height
      } : null,
      addThresholdBtn: addThresholdBtn ? {
        title: addThresholdBtn.title,
        text: addThresholdBtn.innerText.trim(),
        width: addThresholdBtn.getBoundingClientRect().width,
        height: addThresholdBtn.getBoundingClientRect().height
      } : null
    };
  });
  console.log('Step 6 (Academic Thresholds) elements:', JSON.stringify(step6Elements, null, 2));
  await page.screenshot({ path: 'scratch/test-results/step6-thresholds-top.png' });
  await scrollModalBy(250);
  await page.screenshot({ path: 'scratch/test-results/step6-thresholds-scrolled.png' });

  // Close modal and test Create Academic Year
  console.log('Closing modal...');
  await page.locator('button[title="Close"]').click();
  await page.waitForTimeout(1000);

  console.log('Opening Create mode from Table actions...');
  await page.locator('button[title="Table actions"]').first().click();
  await page.waitForTimeout(600);
  await page.locator('li[role="menuitem"]:has-text("Create")').click();
  await page.waitForTimeout(2000);

  const createModeHeader = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => {
      const title = b.title || b.getAttribute('aria-label') || b.innerText.trim();
      return ['Preview', 'Roll Forward +1 Year', 'History', 'Close'].includes(title);
    }).map(b => ({
      title: b.title || b.getAttribute('aria-label') || b.innerText.trim(),
      text: b.innerText.trim(),
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height,
      top: b.getBoundingClientRect().top
    }));
    return {
      btns,
      uniqueTops: [...new Set(btns.map(b => Math.round(b.top)))],
      scrollWidth: document.body.scrollWidth
    };
  });
  console.log('Create Mode Header buttons:', createModeHeader);
  await page.screenshot({ path: 'scratch/test-results/create-mode-step1.png' });

  await browser.close();
  console.log('All tests completed successfully!');
}

run().catch(console.error);
