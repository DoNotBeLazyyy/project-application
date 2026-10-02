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
  console.log('After login URL:', page.url());

  console.log('Navigating to /admin/school-years...');
  await page.goto('https://project-application-two.vercel.app/admin/school-years', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  console.log('URL at school-years:', page.url());
  await page.screenshot({ path: 'scratch/test-results/04-school-years.png' });

  const scrollInfo = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      windowInnerWidth: window.innerWidth,
      hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
  console.log('Scroll info for school-years:', scrollInfo);

  // Check action bar, search input, and inline buttons
  const elementsInfo = await page.evaluate(() => {
    const searchInput = document.querySelector('input[placeholder*="Search" i], input[type="search"]');
    const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText.trim(),
      title: b.title || b.getAttribute('aria-label') || '',
      visible: b.offsetParent !== null,
      width: b.getBoundingClientRect().width,
      height: b.getBoundingClientRect().height
    })).filter(b => b.visible);

    return {
      hasSearchInput: !!searchInput,
      searchInputBox: searchInput ? searchInput.getBoundingClientRect() : null,
      buttons
    };
  });
  console.log('Elements info:', JSON.stringify(elementsInfo, null, 2));

  await browser.close();
}

run().catch(console.error);
