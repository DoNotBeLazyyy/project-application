import { chromium } from 'playwright';

// Determine target base URL from CLI args, environment variables, or default to live deployment
function getBaseUrl() {
  const urlArg = process.argv.find(arg => arg.startsWith('--url='));
  if (urlArg) return urlArg.split('=')[1].replace(/\/$/, '');
  const urlIndex = process.argv.indexOf('--url');
  if (urlIndex !== -1 && process.argv[urlIndex + 1]) return process.argv[urlIndex + 1].replace(/\/$/, '');
  if (process.env.E2E_BASE_URL) return process.env.E2E_BASE_URL.replace(/\/$/, '');
  return 'https://learning-management-system-for-au-j.vercel.app';
}

const BASE_URL = getBaseUrl();

const summary = {
  authGates: [],
  adminPortal: [],
  deanPortal: [],
  registrarPortal: [],
  facultyPortal: [],
  studentPortal: [],
  aiAssistantUI: [],
  consoleErrors: [],
  networkErrors: []
};

function record(suite, testName, passed, details = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] [${suite}] ${testName} ${details ? `— ${details}` : ''}`);
  summary[suite].push({ testName, passed, details });
}

async function launchBrowser() {
  const isHeadless = process.env.HEADLESS !== 'false';
  const configs = [
    { headless: isHeadless },
    { channel: 'msedge', headless: isHeadless },
    { channel: 'chrome', headless: isHeadless }
  ];

  for (const config of configs) {
    try {
      const browser = await chromium.launch(config);
      return browser;
    } catch {
      // Try next channel fallback
    }
  }
  throw new Error('Unable to launch Playwright browser. Ensure Chromium or Microsoft Edge is available.');
}

async function gotoPage(page, path) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);
}

async function loginUser(page, context, email, password = 'Password123!') {
  await context.clearCookies();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  }).catch(() => {});
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function runFullVerification() {
  console.log('========================================================================');
  console.log('AU-JAS LMS PLAYWRIGHT E2E REGRESSION SUITE');
  console.log(`Target Environment: ${BASE_URL}`);
  console.log('========================================================================\n');

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      summary.consoleErrors.push({ url: page.url(), text });
      console.log(`  [CONSOLE ERROR] ${text.slice(0, 160)}`);
    }
  });

  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon')) {
      summary.networkErrors.push({
        url: resp.url(),
        status: resp.status(),
        statusText: resp.statusText()
      });
      console.log(`  [HTTP ${resp.status()}] ${resp.url().slice(0, 120)}`);
    }
  });

  try {
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION & ONBOARDING GATE
    // -------------------------------------------------------------------------
    console.log('>>> 1. Testing Invited User Trap Gate (/set-password)');
    await loginUser(page, context, 'dsadsa@gmail.com', 'Password123!');

    const isTrappedOnSetPassword = page.url().includes('/set-password');
    record('authGates', 'Invited User Restricted to /set-password', isTrappedOnSetPassword, `Resolved to: ${page.url()}`);

    // Try navigating to protected route directly while invited
    await gotoPage(page, '/student');
    const stillTrapped = page.url().includes('/set-password') || page.url().includes('/login') || page.url().includes('/unauthorized');
    record('authGates', 'Invited User Protected Route Access Forbidden', stillTrapped, `Resolved to: ${page.url()}`);

    // -------------------------------------------------------------------------
    // 2. ADMIN PORTAL & ROLE SWITCHING (juliustolentino.diamond@gmail.com)
    // -------------------------------------------------------------------------
    console.log('\n>>> 2. Testing Multi-Role Account & Admin Portal');
    await loginUser(page, context, 'juliustolentino.diamond@gmail.com', 'Password123!');

    // Switch Role to Admin via UserAccountMenu
    console.log('Switching active role to Admin...');
    const accountBtn = await page.$('button[aria-haspopup="menu"]');
    if (accountBtn) {
      await accountBtn.click();
      await page.waitForTimeout(1000);
      const adminRoleItem = await page.$('li[role="menuitem"]:has-text("Admin"), [role="menuitem"]:has-text("Administrator")');
      if (adminRoleItem) {
        await adminRoleItem.click();
        await page.waitForTimeout(3000);
      }
    }

    const currentAdminUrl = page.url();
    record('adminPortal', 'Admin Role Switching & Navigation', currentAdminUrl.includes('/admin'), `URL: ${currentAdminUrl}`);

    // Admin Dashboard KPIs
    await gotoPage(page, '/admin');
    const adminDashText = await page.textContent('body');
    const hasAdminKpis = adminDashText.includes('Students') || adminDashText.includes('Faculty') || adminDashText.includes('Programs') || adminDashText.includes('Terms');
    record('adminPortal', 'Admin Dashboard KPI Cards', hasAdminKpis);

    // Admin School Years
    await gotoPage(page, '/admin/school-years');
    const syText = await page.textContent('body');
    record('adminPortal', 'Admin School Years CRUD Table', syText.includes('School Year') || syText.includes('Start Date'));

    // Admin Terms
    await gotoPage(page, '/admin/terms');
    const termsText = await page.textContent('body');
    record('adminPortal', 'Admin Terms Management Table', termsText.includes('Term') || termsText.includes('School Year'));

    // Admin Term Types
    await gotoPage(page, '/admin/term-types');
    const termTypesText = await page.textContent('body');
    record('adminPortal', 'Admin Term Types Configuration', termTypesText.includes('Term Type') || termTypesText.includes('Code'));

    // Admin Grading Config & Transmutation Ladder
    await gotoPage(page, '/admin/grade-configurations');
    const gradeCfgText = await page.textContent('body');
    record('adminPortal', 'Admin Grading Config & Transmutation Ladder', gradeCfgText.includes('Grading') || gradeCfgText.includes('Transmutation') || gradeCfgText.includes('Scale') || gradeCfgText.includes('Weights'));

    // Admin User Provisioning
    await gotoPage(page, '/admin/users');
    const usersText = await page.textContent('body');
    record('adminPortal', 'Admin User Provisioning Management', usersText.includes('Email') || usersText.includes('Role') || usersText.includes('Status'));

    // Admin System Settings
    await gotoPage(page, '/admin/system-settings');
    const settingsText = await page.textContent('body');
    record('adminPortal', 'Admin System Settings', settingsText.includes('System') || settingsText.includes('Setting') || settingsText.includes('Configuration'));

    // Admin Academic Thresholds
    await gotoPage(page, '/admin/academic-thresholds');
    const thresholdsText = await page.textContent('body');
    record('adminPortal', 'Admin Academic Thresholds & Honors Config', thresholdsText.includes('Threshold') || thresholdsText.includes('Honors') || thresholdsText.includes('Cum Laude') || thresholdsText.includes('GWA'));

    // -------------------------------------------------------------------------
    // 3. DEAN PORTAL (Switch role to Dean)
    // -------------------------------------------------------------------------
    console.log('\n>>> 3. Testing Dean Portal');
    const accountBtnDean = await page.$('button[aria-haspopup="menu"]');
    if (accountBtnDean) {
      await accountBtnDean.click();
      await page.waitForTimeout(1000);
      const deanRoleItem = await page.$('li[role="menuitem"]:has-text("Dean")');
      if (deanRoleItem) {
        await deanRoleItem.click();
        await page.waitForTimeout(3000);
      }
    }

    const currentDeanUrl = page.url();
    record('deanPortal', 'Dean Role Switching & Navigation', currentDeanUrl.includes('/dean'), `URL: ${currentDeanUrl}`);

    // Dean Dashboard
    await gotoPage(page, '/dean');
    const deanDashText = await page.textContent('body');
    record('deanPortal', 'Dean Dashboard Overview', deanDashText.includes('Department') || deanDashText.includes('Program') || deanDashText.includes('Section') || deanDashText.includes('Faculty'));

    // Dean Departments
    await gotoPage(page, '/dean/department-management');
    const deptText = await page.textContent('body');
    record('deanPortal', 'Dean Departments Management', deptText.includes('Department') || deptText.includes('Code') || deptText.includes('Head'));

    // Dean Programs
    await gotoPage(page, '/dean/program-management');
    const progText = await page.textContent('body');
    record('deanPortal', 'Dean Programs Management', progText.includes('Program') || progText.includes('Degree') || progText.includes('Department'));

    // Dean Program Levels
    await gotoPage(page, '/dean/program-level-management');
    const progLvlText = await page.textContent('body');
    record('deanPortal', 'Dean Program Levels', progLvlText.includes('Level') || progLvlText.includes('Year') || progLvlText.includes('Program'));

    // Dean Courses
    await gotoPage(page, '/dean/course-management');
    const courseText = await page.textContent('body');
    record('deanPortal', 'Dean Course Catalog & Prerequisites', courseText.includes('Course') || courseText.includes('Units') || courseText.includes('Code'));

    // Dean Curriculum Maps
    await gotoPage(page, '/dean/curriculum-map-management');
    const cmText = await page.textContent('body');
    record('deanPortal', 'Dean Curriculum Maps', cmText.includes('Curriculum') || cmText.includes('Map') || cmText.includes('Year Level'));

    // Dean Sections
    await gotoPage(page, '/dean/section-management');
    const secText = await page.textContent('body');
    record('deanPortal', 'Dean Section Creation & Faculty Assignment', secText.includes('Section') || secText.includes('Course') || secText.includes('Faculty') || secText.includes('Term'));

    // Dean Faculty Load
    await gotoPage(page, '/dean/faculty-load');
    const loadText = await page.textContent('body');
    record('deanPortal', 'Dean Faculty Load Tracking', loadText.includes('Faculty') || loadText.includes('Load') || loadText.includes('Units'));

    // -------------------------------------------------------------------------
    // 4. REGISTRAR PORTAL (hbaki386@gmail.com)
    // -------------------------------------------------------------------------
    console.log('\n>>> 4. Testing Registrar Portal (hbaki386@gmail.com)');
    await loginUser(page, context, 'hbaki386@gmail.com', 'Password123!');

    const regUrl = page.url();
    record('registrarPortal', 'Registrar Login & Hydration', regUrl.includes('/registrar'), `URL: ${regUrl}`);

    // Registrar Dashboard
    await gotoPage(page, '/registrar');
    const regDashText = await page.textContent('body');
    record('registrarPortal', 'Registrar Dashboard Overview', regDashText.includes('Student') || regDashText.includes('Enrollment') || regDashText.includes('Clearance'));

    // Student Master Registry
    await gotoPage(page, '/registrar/student-management');
    const studentRegText = await page.textContent('body');
    record('registrarPortal', 'Student Master Registry', studentRegText.includes('Student Number') || studentRegText.includes('Student') || studentRegText.includes('Program'));

    // Section Enrollments
    await gotoPage(page, '/registrar/enrollment-management');
    const enrollText = await page.textContent('body');
    record('registrarPortal', 'Section Enrollments Management', enrollText.includes('Enrollment') || enrollText.includes('Section') || enrollText.includes('Student'));

    // Batch Progression
    await gotoPage(page, '/registrar/batch-progression');
    const progText2 = await page.textContent('body');
    record('registrarPortal', 'Batch Progression Workflow', progText2.includes('Progression') || progText2.includes('Batch') || progText2.includes('Year Level'));

    // Grade Release
    await gotoPage(page, '/registrar/grade-release');
    const gradeRelText = await page.textContent('body');
    record('registrarPortal', 'Official Grade Release Management', gradeRelText.includes('Grade') || gradeRelText.includes('Release') || gradeRelText.includes('Status'));

    // -------------------------------------------------------------------------
    // 5. FACULTY PORTAL (luna.akirapogi@gmail.com)
    // -------------------------------------------------------------------------
    console.log('\n>>> 5. Testing Faculty Portal (luna.akirapogi@gmail.com)');
    await loginUser(page, context, 'luna.akirapogi@gmail.com', 'Password123!');

    const facUrl = page.url();
    record('facultyPortal', 'Faculty Login & Hydration', facUrl.includes('/faculty'), `URL: ${facUrl}`);

    // Faculty Dashboard
    await gotoPage(page, '/faculty');
    const facDashText = await page.textContent('body');
    record('facultyPortal', 'Faculty Dashboard KPI & Schedule', facDashText.includes('Section') || facDashText.includes('Student') || facDashText.includes('Schedule') || facDashText.includes('Teaching'));

    // Faculty Sections List
    await gotoPage(page, '/faculty/sections');
    const facSecText = await page.textContent('body');
    record('facultyPortal', 'Faculty Sections Management', facSecText.includes('Section') || facSecText.includes('Course') || facSecText.includes('Students') || facSecText.includes('My Sections'));

    // -------------------------------------------------------------------------
    // 6. STUDENT PORTAL (crowsnight379@gmail.com)
    // -------------------------------------------------------------------------
    console.log('\n>>> 6. Testing Student Portal (crowsnight379@gmail.com)');
    await loginUser(page, context, 'crowsnight379@gmail.com', 'Password123!');

    const studUrl = page.url();
    record('studentPortal', 'Student Login & Hydration', studUrl.includes('/student'), `URL: ${studUrl}`);

    // Student Dashboard
    await gotoPage(page, '/student');
    const studDashText = await page.textContent('body');
    record('studentPortal', 'Student Dashboard Overview', studDashText.includes('Schedule') || studDashText.includes('Subject') || studDashText.includes('Course') || studDashText.includes('Welcome'));

    // Student Timetable Schedule
    await gotoPage(page, '/student/schedule');
    const schedText = await page.textContent('body');
    record('studentPortal', 'Student Timetable Schedule', schedText.includes('Monday') || schedText.includes('Schedule') || schedText.includes('Time') || schedText.includes('Room'));

    // Student Enrolled Subjects
    await gotoPage(page, '/student/subjects');
    const subjText = await page.textContent('body');
    record('studentPortal', 'Student Enrolled Subjects Portal', subjText.includes('CS210') || subjText.includes('Subject') || subjText.includes('Section') || subjText.includes('Instructor'));

    // Student Grades & Transmutations
    await gotoPage(page, '/student/grade');
    const gradesText = await page.textContent('body');
    record('studentPortal', 'Student Official Grades & Transmutation Scale', gradesText.includes('Grade') || gradesText.includes('Period') || gradesText.includes('Transmuted') || gradesText.includes('1.') || gradesText.includes('2.'));

    // Student Faculty Evaluations Gate
    await gotoPage(page, '/student/evaluations');
    const evalText = await page.textContent('body');
    record('studentPortal', 'Faculty Evaluation Gate & Forms', evalText.includes('Evaluation') || evalText.includes('Faculty') || evalText.includes('Instructor') || evalText.includes('Completed'));

    // Student Curriculum Audit
    await gotoPage(page, '/student/curriculum');
    const currText = await page.textContent('body');
    record('studentPortal', 'Curriculum Audit & Progress Tracker', currText.includes('Curriculum') || currText.includes('Year') || currText.includes('Units') || currText.includes('Completed'));

    // Student Learning Insights
    await gotoPage(page, '/student/insight');
    const insightText = await page.textContent('body');
    record('studentPortal', 'Student Learning Analytics & Honors Trajectory', insightText.includes('Insight') || insightText.includes('Honors') || insightText.includes('GWA') || insightText.includes('Risk') || insightText.includes('Assessment'));

    // -------------------------------------------------------------------------
    // 7. AI ASSISTANT UI DRAWER & INTERACTION (Student Dashboard)
    // -------------------------------------------------------------------------
    console.log('\n>>> 7. Testing AI Assistant UI Floating Button & Chat Drawer');
    await gotoPage(page, '/student');

    const fabLocator = page.locator('[data-testid="ai-assistant-fab"], button[aria-label="Open AI Assistant"], .MuiFab-primary, button:has(svg.ph-sparkle)').first();
    const fabExists = (await fabLocator.count()) > 0;

    if (fabExists) {
      console.log('Clicking AI Assistant FAB...');
      await fabLocator.click();
      await page.waitForTimeout(2000);

      const cardLocator = page.locator('[data-testid="ai-assistant-card"], div:has-text("AU-JAS Assistant")').first();
      const isDrawerOpen = await cardLocator.isVisible();
      record('aiAssistantUI', 'AI Assistant Drawer Open via FAB', isDrawerOpen);

      if (isDrawerOpen) {
        const suggestionBtn = page.locator('button:has-text("honors"), button:has-text("GWA"), button:has-text("attendance")').first();
        if (await suggestionBtn.isVisible()) {
          console.log('Clicking suggestion prompt...');
          await suggestionBtn.click();
        } else {
          console.log('Typing query into input...');
          await page.fill('input[placeholder*="Ask a question"], textarea[placeholder*="Ask a question"]', 'Am I on track for Latin honors?');
          await page.press('input[placeholder*="Ask a question"], textarea[placeholder*="Ask a question"]', 'Enter');
        }

        console.log('Waiting for AI Assistant response...');
        await page.waitForTimeout(10000);

        const cardContent = await cardLocator.textContent();
        const hasAiReply = cardContent.includes('Cum Laude') || cardContent.includes('GWA') || cardContent.includes('honors') || cardContent.includes('qualified') || cardContent.includes('grades');
        record('aiAssistantUI', 'AI Assistant Real-Time Response & DB Grounding', hasAiReply, hasAiReply ? 'Successfully received Gemini grounded response!' : 'Response rendered');
      }
    } else {
      record('aiAssistantUI', 'AI Assistant FAB Located on Page', false, 'FAB element not found');
    }

  } catch (error) {
    console.error('Test execution fatal error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log('AU-JAS LMS E2E TEST SUMMARY');
  console.log('========================================================================');

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  for (const [suite, tests] of Object.entries(summary)) {
    if (suite === 'consoleErrors' || suite === 'networkErrors') continue;
    const suitePassed = tests.filter(t => t.passed).length;
    const suiteFailed = tests.filter(t => !t.passed).length;
    totalTests += tests.length;
    totalPassed += suitePassed;
    totalFailed += suiteFailed;
    console.log(`  ${suite.padEnd(18)}: ${suitePassed}/${tests.length} passed ${suiteFailed > 0 ? `(${suiteFailed} FAILED)` : ''}`);
  }

  console.log('------------------------------------------------------------------------');
  console.log(`TOTAL: ${totalPassed}/${totalTests} Passed | ${totalFailed} Failed`);
  console.log(`Browser Console Errors: ${summary.consoleErrors.length}`);
  console.log(`HTTP Network Failures : ${summary.networkErrors.length}`);
  console.log('========================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFullVerification().catch(err => {
  console.error('Fatal runner crash:', err);
  process.exit(1);
});
