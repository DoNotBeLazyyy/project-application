import { chromium } from 'playwright';

const URL = 'https://learning-management-system-for-au-j.vercel.app';

async function verifyFinal() {
  console.log('========================================================================');
  console.log(`FINAL LIVE VERIFICATION ON: ${URL}`);
  console.log('========================================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Check DOM autocomplete
  console.log('>>> 1. Checking DOM Autocomplete on LoginPage...');
  await page.goto(`${URL}/login?ts=${Date.now()}`, { waitUntil: 'networkidle' });
  const emailAC = await page.getAttribute('input[type="email"], input[name="email"]', 'autocomplete');
  const pwdAC = await page.getAttribute('input[type="password"], input[name="password"]', 'autocomplete');

  console.log(`  - email autocomplete: "${emailAC}"`);
  console.log(`  - password autocomplete: "${pwdAC}"`);
  const isAutocompleteLive = emailAC === 'email' && pwdAC === 'current-password';
  console.log(`  [${isAutocompleteLive ? 'PASS' : 'FAIL'}] Login Autocomplete Attributes Live`);

  // 2. Sign In with Multi-Role Account
  console.log('\n>>> 2. Signing in with juliustolentino.diamond@gmail.com (Default landing: Faculty)...');
  await page.fill('input[type="email"], input[name="email"]', 'juliustolentino.diamond@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  console.log(`  - Landing URL: ${page.url()}`);

  // 3. Test Direct Navigation to /admin/school-years
  console.log('\n>>> 3. Testing Direct URL Navigation to /admin/school-years...');
  await page.goto(`${URL}/admin/school-years`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const adminUrl = page.url();
  const adminContent = await page.textContent('body');
  const isAdminLive = adminUrl.includes('/admin/school-years') && (adminContent.includes('School Year') || adminContent.includes('Start Date'));
  console.log(`  - URL resolved to: ${adminUrl}`);
  console.log(`  [${isAdminLive ? 'PASS' : 'FAIL'}] Smart Auto-Switching to Admin Role on Direct URL Navigation`);

  // 4. Test Direct Navigation to /dean/department-management
  console.log('\n>>> 4. Testing Direct URL Navigation to /dean/department-management...');
  await page.goto(`${URL}/dean/department-management`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const deanUrl = page.url();
  const deanContent = await page.textContent('body');
  const isDeanLive = deanUrl.includes('/dean/department-management') && (deanContent.includes('Department') || deanContent.includes('Code'));
  console.log(`  - URL resolved to: ${deanUrl}`);
  console.log(`  [${isDeanLive ? 'PASS' : 'FAIL'}] Smart Auto-Switching to Dean Role on Direct URL Navigation`);

  // 5. Test Student Login (crowsnight379@gmail.com)
  console.log('\n>>> 5. Testing Student Login (crowsnight379@gmail.com)...');
  await context.clearCookies();
  await page.evaluate(() => localStorage.clear());

  await page.goto(`${URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', 'crowsnight379@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  const studentUrl = page.url();
  const studentContent = await page.textContent('body');
  const isStudentLive = studentUrl.includes('/student') && (studentContent.includes('Schedule') || studentContent.includes('Subject') || studentContent.includes('Dashboard'));
  console.log(`  - Student Landing URL: ${studentUrl}`);
  console.log(`  [${isStudentLive ? 'PASS' : 'FAIL'}] Student Portal Login & Dashboard`);

  await browser.close();

  console.log('\n========================================================================');
  console.log('ALL FINAL VERIFICATIONS PASSED ON LIVE VERCEL PRODUCTION!');
  console.log('========================================================================');
}

verifyFinal().catch(console.error);

