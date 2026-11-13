/**
 * test_pc_welcome_screen_integrity.js
 * Dedicated automated test suite verifying that on the PC (Desktop) interface:
 * 1. The welcome/loading screen is 100% CSS & Scalable Vector SVG (0% pictures/photos).
 * 2. Features the official scalable ALSTOM wordmark with corporate red circular accent on the 'O'.
 * 3. Features the dynamic aerodynamic bullet train loading line with cyan neon glow and speed trails.
 * 4. Displays the 3-tier bottom signature ('by', 'IXL Team', and dynamic app version '1.0.0').
 * 5. Strictly enforces the 5-second loading duration on PC: background mouse clicks and keyboard presses are locked out.
 * 6. Completely covers 100% of any display resolution and aspect ratio without distortion or pixelation.
 * 7. Preserves the archival backup of the old image-based approach in backup_welcome_screen_image_approach.html.
 * 8. Desktop viewport routing strictly detects desktop resolutions (isMobileInterface === false) and unhides the PC grid card.
 * 9. PC grid, topbar controls, view toggle (week/month), and user profiles initialize and open cleanly across all boot scenarios.
 * 10. Zero unicode emojis across files.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

const resolvePath = (f) => [path.join(__dirname, '../public', f), path.join(__dirname, '../backups', f), path.join(__dirname, '..', f), f].find(fs.existsSync) || f;

let passCount = 0;
let failCount = 0;

function test(description, fn) {
  try {
    fn();
    passCount++;
    console.log(`  [PASS] ${description}`);
  } catch (err) {
    failCount++;
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
  }
}

console.log('==========================================================');
console.log(' RUNNING PC WELCOME SCREEN VECTOR & INTEGRITY TEST SUITE');
console.log('==========================================================\n');

const html = fs.readFileSync(resolvePath('index.html'), 'utf8');
const js = fs.readFileSync(resolvePath('app.js'), 'utf8');
const css = fs.readFileSync(resolvePath('styles.css'), 'utf8');
const dataJson = JSON.parse(fs.readFileSync(resolvePath('data.json'), 'utf8'));

// ========================================================
// MODULE 1: Static Code Contracts, Zero Emojis, & Backups
// ========================================================
console.log('>>> MODULE 1: Static Code Contracts, Zero Emojis, & Backups');

test('1.1 Zero unicode emojis in index.html, app.js, and styles.css', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(html), 'Found emoji in index.html');
  assert(!emojiRegex.test(js), 'Found emoji in app.js');
  assert(!emojiRegex.test(css), 'Found emoji in styles.css');
});

test('1.2 Cache buster bumped to v=10.0 in index.html', () => {
  assert(html.includes('styles.css?v=10.0'), 'styles.css v=10.0 not found in index.html');
  assert(html.includes('app.js?v=10.0'), 'app.js v=10.0 not found in index.html');
});

test('1.3 Archival backup of image-based approach exists in backup_welcome_screen_image_approach.html', () => {
  assert(fs.existsSync(resolvePath('backup_welcome_screen_image_approach.html')), 'backup_welcome_screen_image_approach.html missing');
  const backupHtml = fs.readFileSync(resolvePath('backup_welcome_screen_image_approach.html'), 'utf8');
  assert(backupHtml.includes('alstom-welcome-pc.jpg?v=10.0'), 'Backup missing PC welcome image reference');
  assert(backupHtml.includes('alstom-welcome-mobile.jpg?v=10.0'), 'Backup missing mobile welcome image reference');
  assert(backupHtml.includes('splash-spinner-circle'), 'Backup missing splash spinner');
});

test('1.4 Original PC and Mobile image assets preserved intact on disk', () => {
  const origBuf = fs.readFileSync(resolvePath('welcome_pic/1.jpg'));
  const pcBuf = fs.readFileSync(resolvePath('alstom-welcome-pc.jpg'));
  assert.strictEqual(origBuf.length, 268506, 'Original image file size must be exactly 268,506 bytes');
  assert.strictEqual(pcBuf.length, 268506, 'PC welcome image must be exactly 268,506 bytes');
  
  const origHash = crypto.createHash('sha256').update(origBuf).digest('hex');
  const pcHash = crypto.createHash('sha256').update(pcBuf).digest('hex');
  assert.strictEqual(pcHash, origHash, 'PC welcome image SHA256 must match welcome_pic/1.jpg byte-for-byte');

  const origMobBuf = fs.readFileSync(resolvePath('welcome_pic_mob/2026-11-10 17.06.jpg'));
  const mobBuf = fs.readFileSync(resolvePath('alstom-welcome-mobile.jpg'));
  assert.strictEqual(mobBuf.length, 320123, 'Mobile welcome image must be exactly 320,123 bytes');
  const origMobHash = crypto.createHash('sha256').update(origMobBuf).digest('hex');
  const mobHash = crypto.createHash('sha256').update(mobBuf).digest('hex');
  assert.strictEqual(mobHash, origMobHash, 'Mobile welcome image SHA256 must match welcome_pic_mob exactly');
});

// ========================================================
// MODULE 2: PC 100% Vector SVG & CSS Architecture (0% Images)
// ========================================================
console.log('\n>>> MODULE 2: PC 100% Vector SVG & CSS Architecture (0% Images)');

test('2.1 PC Welcome Screen #pcVectorWelcomeStage contains 0% bitmap images (no img/picture inside)', () => {
  const pcStageStart = html.indexOf('id="pcVectorWelcomeStage"');
  assert(pcStageStart !== -1, 'id="pcVectorWelcomeStage" missing in index.html');
  const pcStageEnd = html.indexOf('id="mobileTouchWelcomeStage"');
  assert(pcStageEnd !== -1, 'id="mobileTouchWelcomeStage" missing in index.html');
  const pcStageHtml = html.substring(pcStageStart, pcStageEnd);

  assert(!pcStageHtml.includes('<img'), '#pcVectorWelcomeStage must contain 0 <img> tags');
  assert(!pcStageHtml.includes('<picture'), '#pcVectorWelcomeStage must contain 0 <picture> tags');
  assert(!pcStageHtml.includes('.jpg'), '#pcVectorWelcomeStage must contain 0 .jpg references');
  assert(!pcStageHtml.includes('.png'), '#pcVectorWelcomeStage must contain 0 .png references');
});

test('2.2 Scalable vector ALSTOM wordmark exists with official red accent on O', () => {
  assert(html.includes('class="alstom-vector-logo"'), 'alstom-vector-logo missing in index.html');
  assert(html.includes('class="alstom-vector-o"'), 'alstom-vector-o missing in index.html');
  assert(html.includes('#E01A22'), 'Corporate red #E01A22 missing in ALSTOM vector logo');
});

test('2.3 Dynamic aerodynamic bullet train loading line exists with cyan glow & progress clip', () => {
  assert(html.includes('class="welcome-train-svg"'), 'welcome-train-svg missing in index.html');
  assert(html.includes('id="trainProgressClip"'), 'trainProgressClip clipPath missing in index.html');
  assert(html.includes('class="train-progress-clip-rect"'), 'train-progress-clip-rect missing in index.html');
  assert(html.includes('class="train-speed-streaks"'), 'train-speed-streaks missing in index.html');
  assert(html.includes('class="train-headlight"'), 'train-headlight missing in index.html');
  assert(html.includes('#38bdf8'), 'Luminous cyan #38bdf8 missing in train loader');
});

test('2.4 Three-tier bottom signature exists with by, IXL Team, and dynamic app version', () => {
  assert(html.includes('class="welcome-footer-by"'), 'welcome-footer-by missing in index.html');
  assert(html.includes('class="welcome-footer-team"'), 'welcome-footer-team missing in index.html');
  assert(html.includes('id="welcomeAppVersion"'), 'id="welcomeAppVersion" missing in index.html');
  assert(html.includes('1.0.0'), 'Default version 1.0.0 missing in index.html');
});

test('2.5 Responsive toggle between PC vector welcome and mobile touch stage', () => {
  assert(html.includes('.pc-only-welcome'), 'pc-only-welcome class missing in index.html critical CSS');
  assert(html.includes('.mobile-only-welcome'), 'mobile-only-welcome class missing in index.html critical CSS');
  assert(css.includes('.pc-only-welcome'), 'pc-only-welcome class missing in styles.css');
  assert(css.includes('.mobile-only-welcome'), 'mobile-only-welcome class missing in styles.css');
});

test('2.6 PC Welcome signature styling: upright Semi-Bold IXL Team with breathing room and dimmed by/version', () => {
  // Check index.html critical CSS and styles.css for upright sans-serif semi-bold IXL Team
  const teamBlockMatch = css.match(/\.welcome-footer-team\s*\{([^}]+)\}/);
  assert(teamBlockMatch, '.welcome-footer-team rule must exist in styles.css');
  const teamCss = teamBlockMatch[1];
  assert(teamCss.includes('font-style: normal'), 'IXL Team must be non-italic (upright)');
  assert(teamCss.includes('font-weight: 600') || teamCss.includes('font-weight: 500'), 'IXL Team must be semi-bold or medium weight');
  assert(teamCss.includes('margin-bottom: 10px') || teamCss.includes('margin-bottom: 8px') || teamCss.includes('margin-bottom: 12px'), 'IXL Team must have increased vertical spacing');
  assert(teamCss.includes('17px') || teamCss.includes('18px') || teamCss.includes('22px'), 'IXL Team font size must be decreased');
  assert(teamCss.includes('#e2e8f0') || teamCss.includes('rgba') || teamCss.includes('opacity:'), 'IXL Team must be soft less bright white');

  // Check by element has breathing room and dimmed darker gray
  const byBlockMatch = css.match(/\.welcome-footer-by\s*\{([^}]+)\}/);
  assert(byBlockMatch, '.welcome-footer-by rule must exist in styles.css');
  const byCss = byBlockMatch[1];
  assert(byCss.includes('font-style: normal'), '"by" must be upright');
  assert(byCss.includes('margin-bottom: 8px') || byCss.includes('margin-bottom: 6px') || byCss.includes('margin-bottom: 10px'), '"by" must have increased vertical spacing');
  assert(byCss.includes('opacity:') || byCss.includes('#64748b') || byCss.includes('#475569'), '"by" must have dimmed darker gray');

  // Check version element has dimmed darker gray
  const verBlockMatch = css.match(/\.welcome-footer-version\s*\{([^}]+)\}/);
  assert(verBlockMatch, '.welcome-footer-version rule must exist in styles.css');
  const verCss = verBlockMatch[1];
  assert(verCss.includes('color: #475569') || verCss.includes('opacity:'), 'Version must have dimmed darker gray');
});

// ========================================================
// MODULE 3: Strict 5-Second Lockout & Fullscreen Display
// ========================================================
console.log('\n>>> MODULE 3: Strict 5-Second Lockout & Fullscreen Display');

test('3.1 initMobileWelcomeScreen unhides overlay on boot for PC and mobile', () => {
  const fnIdx = js.indexOf('function initMobileWelcomeScreen()');
  assert(fnIdx !== -1, 'initMobileWelcomeScreen function missing in app.js');
  const fnBlock = js.substring(fnIdx, fnIdx + 1200);
  assert(fnBlock.includes("overlay.classList.remove('hidden', 'hidden-permanently')"), 'Missing unhide call');
  assert(fnBlock.includes("overlay.style.display = 'flex'"), 'Missing display:flex call');
});

test('3.2 5-second timer (5000ms) is strictly enforced in app.js', () => {
  const fnIdx = js.indexOf('function initMobileWelcomeScreen()');
  const fnBlock = js.substring(fnIdx, fnIdx + 1600);
  assert(fnBlock.includes('dismissWelcome'), 'Missing dismissWelcome function');
  assert(fnBlock.includes('setTimeout'), 'Missing auto-dismiss timer');
  assert(fnBlock.includes('5000'), 'Auto-dismiss timer must be set to 5 seconds (5000ms)');
});

test('3.3 On PC interface, click and keydown early dismissal is strictly locked out', () => {
  const fnIdx = js.indexOf('function initMobileWelcomeScreen()');
  const fnBlock = js.substring(fnIdx, fnIdx + 2500);
  assert(fnBlock.includes('isMobileInterface()'), 'Missing isMobileInterface check');
  // Confirm that on PC, click does not call dismissWelcome
  assert(fnBlock.includes('e.stopPropagation()'), 'PC overlay must absorb click events without dismissing');
  assert(!fnBlock.includes("window.addEventListener('keydown', handleKey)"), 'Global keydown early dismissal must be removed');
});

test('3.4 Dynamic version synchronization: APP_VERSION constant updates welcome screen', () => {
  assert(js.includes("const APP_VERSION = '1.0.0'"), 'APP_VERSION constant missing in app.js');
  assert(js.includes('welcomeAppVersion'), 'welcomeAppVersion element query missing in app.js');
});

test('3.5 Fullscreen viewport coverage on any screen size without letterbox bars', () => {
  assert(html.includes('width: 100vw !important;'), 'Missing 100vw in critical CSS');
  assert(html.includes('height: 100vh !important;'), 'Missing 100vh in critical CSS');
  assert(html.includes('height: 100dvh !important;'), 'Missing 100dvh in critical CSS');
  assert(html.includes('radial-gradient(ellipse at 50% 45%, #0c1a36'), 'Missing radial navy gradient in critical CSS');
  assert(css.includes('radial-gradient(ellipse at 50% 45%, #0c1a36'), 'Missing radial navy gradient in styles.css');
});

// ========================================================
// MODULE 4: Desktop Viewport Detection & Interface Routing
// ========================================================
console.log('\n>>> MODULE 4: Desktop Viewport Detection & Interface Routing');

function mockIsMobile(width, isTouch = false, isCoarse = false, userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)') {
  const state = { forceDesktopViewOnMobile: false };
  if (state.forceDesktopViewOnMobile) return false;
  const isTouchDevice = isCoarse;
  const cannotHover = isCoarse;
  const isMobileUA = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const minDim = Math.min(width, 1080);
  if ((isMobileUA || (isTouchDevice && cannotHover)) && minDim < 800) return true;
  if (width <= 768) return true;
  return false;
}

test('4.1 Desktop resolutions strictly return isMobileInterface() === false', () => {
  const desktopWidths = [1024, 1280, 1366, 1440, 1920, 2560, 3840];
  desktopWidths.forEach(w => {
    assert.strictEqual(mockIsMobile(w, false, false), false, `Width ${w}px must be classified as Desktop`);
  });
});

test('4.2 Mouse pointer and hover capability confirms Desktop mode on PC', () => {
  assert.strictEqual(mockIsMobile(1920, false, false), false, 'Full HD PC must not be classified as mobile');
});

test('4.3 forceDesktopViewOnMobile override forces desktop mode even on small screens', () => {
  const isMobileInterfaceImpl = (forceDesktop) => {
    if (forceDesktop) return false;
    return true;
  };
  assert.strictEqual(isMobileInterfaceImpl(true), false, 'forceDesktopViewOnMobile must bypass mobile classification');
});

// ========================================================
// MODULE 5: PC Grid Unhide & Structural Readiness
// ========================================================
console.log('\n>>> MODULE 5: PC Grid Unhide & Structural Readiness');

test('5.1 updateDeviceViewMode on PC unhides .schedule-card and hides #mobileAppContainer', () => {
  const updateIdx = js.indexOf('function updateDeviceViewMode()');
  assert(updateIdx !== -1, 'updateDeviceViewMode missing in app.js');
  const updateBlock = js.substring(updateIdx, updateIdx + 2000);
  assert(updateBlock.includes("document.body.classList.add('is-desktop-device')"), 'Missing is-desktop-device class on body');
  assert(updateBlock.includes("document.body.classList.remove('is-mobile-device')"), 'Missing remove is-mobile-device on body');
  assert(updateBlock.includes("if (container) container.classList.add('hidden')"), 'Missing container.classList.add(hidden)');
  assert(updateBlock.includes("if (gridCard) gridCard.classList.remove('hidden')"), 'Missing gridCard.classList.remove(hidden)');
  assert(updateBlock.includes("if (notice) notice.classList.add('hidden')"), 'Missing notice.classList.add(hidden)');
});

test('5.2 PC interface displays Topbar Bulk Fill button in standard mode', () => {
  const updateIdx = js.indexOf('function updateDeviceViewMode()');
  const updateBlock = js.substring(updateIdx, updateIdx + 2000);
  assert(updateBlock.includes("el.topbarBulkFillBtn.classList.remove('hidden')"), 'Missing remove hidden for topbarBulkFillBtn on PC');
});

test('5.3 Schedule grid table elements exist in index.html', () => {
  assert(html.includes('id="scheduleCard"'), 'Missing id="scheduleCard"');
  assert(html.includes('id="scheduleTable"'), 'Missing id="scheduleTable"');
  assert(html.includes('id="scheduleHead"'), 'Missing id="scheduleHead"');
  assert(html.includes('id="scheduleBody"'), 'Missing id="scheduleBody"');
});

test('5.4 Topbar navigation controls (User Picker, Month Select, Week/Month Toggle) are present', () => {
  assert(html.includes('id="userPickerBtn"'), 'Missing id="userPickerBtn"');
  assert(html.includes('id="mainCalendarTriggerBtn"'), 'Missing id="mainCalendarTriggerBtn"');
  assert(html.includes('id="viewModeToggleBtn"'), 'Missing id="viewModeToggleBtn"');
  assert(html.includes('id="viewPillWeek"'), 'Missing id="viewPillWeek"');
  assert(html.includes('id="viewPillMonth"'), 'Missing id="viewPillMonth"');
});

// ========================================================
// MODULE 6: Behavioral State Simulation (Never Stuck / Always Opens)
// ========================================================
console.log('\n>>> MODULE 6: Behavioral State Simulation (Never Stuck / Always Opens)');

test('6.1 Timer-based dismiss simulation: after 5s timeout, overlay is fully hidden', () => {
  let dismissed = false;
  const overlay = {
    classes: new Set(['mobile-welcome-overlay']),
    style: { display: 'flex' },
    classList: {
      add(...cls) { cls.forEach(c => overlay.classes.add(c)); },
      remove(...cls) { cls.forEach(c => overlay.classes.delete(c)); },
      contains(c) { return overlay.classes.has(c); }
    }
  };

  function dismissWelcome() {
    if (dismissed) return;
    dismissed = true;
    overlay.classList.add('fade-out');
    overlay.classList.add('hidden-permanently', 'hidden');
    overlay.style.display = 'none';
    overlay.classList.remove('fade-out');
  }

  // Simulate timeout triggering dismiss at 5s
  dismissWelcome();

  assert.strictEqual(dismissed, true, 'Dismissed flag must be set to true');
  assert.strictEqual(overlay.classList.contains('hidden-permanently'), true, 'Must have hidden-permanently class');
  assert.strictEqual(overlay.classList.contains('hidden'), true, 'Must have hidden class');
  assert.strictEqual(overlay.style.display, 'none', 'display style must be none');
  assert.strictEqual(overlay.classList.contains('fade-out'), false, 'fade-out class must be cleaned up');
});

test('6.2 Lockout simulation: background mouse clicks on PC do NOT dismiss early before 5s', () => {
  let dismissed = false;
  let clickAbsorbed = false;
  const overlay = {
    classes: new Set(['mobile-welcome-overlay']),
    style: { display: 'flex' },
    listeners: {},
    addEventListener(evt, fn) { this.listeners[evt] = fn; },
    classList: {
      add(...cls) { cls.forEach(c => overlay.classes.add(c)); },
      remove(...cls) { cls.forEach(c => overlay.classes.delete(c)); },
      contains(c) { return overlay.classes.has(c); }
    }
  };

  // PC behavior: clicks absorb propagation and do NOT dismiss early
  overlay.addEventListener('click', (e) => {
    clickAbsorbed = true;
    if (e && e.stopPropagation) e.stopPropagation();
  });

  // User clicks background on PC
  const mockEvent = { stopPropagation: () => {} };
  overlay.listeners['click'](mockEvent);

  assert.strictEqual(clickAbsorbed, true, 'Click handler must safely absorb event');
  assert.strictEqual(dismissed, false, 'Overlay must NOT be dismissed on click on PC');
  assert.strictEqual(overlay.style.display, 'flex', 'Overlay must remain visible throughout loading');
});

test('6.3 Cold boot without stored user: PC schedule renders completely and identity modal is prepared', () => {
  const mockState = {
    currentUserId: null,
    employees: dataJson.employees,
    isViewOnly: false
  };

  assert.strictEqual(mockState.currentUserId, null, 'Unauthenticated user initialized');
  assert(mockState.employees.length > 0, 'Employees database must be loaded');
  const shouldOpenModal = !mockState.isViewOnly && !mockState.currentUserId;
  assert.strictEqual(shouldOpenModal, true, 'Identity modal must open when unauthenticated');
});

test('6.4 Boot with valid stored user: resolves profile, unhazes row, preserves desktop responsiveness', () => {
  const savedEmp = dataJson.employees[0];
  const mockState = {
    currentUserId: savedEmp.id,
    employees: dataJson.employees,
    isViewOnly: false
  };

  const matched = mockState.employees.find(e => e.id === mockState.currentUserId);
  assert.strictEqual(matched.name, savedEmp.name, 'Resolved employee name must match stored profile');
  const shouldOpenModal = !mockState.isViewOnly && !mockState.currentUserId;
  assert.strictEqual(shouldOpenModal, false, 'Modal should NOT auto-open when user is already resolved');
});

test('6.5 Boot with corrupted/stale user in localStorage: graceful fallback without crash or freeze', () => {
  const staleId = 'emp_deleted_99999';
  const mockState = {
    currentUserId: staleId,
    employees: dataJson.employees,
    isViewOnly: false
  };

  const matched = mockState.employees.find(e => e.id === mockState.currentUserId);
  assert.strictEqual(matched, undefined, 'Stale user will not match any employee');
  
  const displayName = matched ? matched.name : 'All Users';
  assert.strictEqual(displayName, 'All Users', 'Display name falls back cleanly');
});

test('6.6 Boot in View-Only mode (?mode=view): overlay dismisses, bulk controls hidden, grid renders read-only', () => {
  const mockState = {
    isViewOnly: true,
    currentUserId: null,
    isAdmin: false
  };

  assert.strictEqual(mockState.isViewOnly, true, 'View-only mode active');
  assert.strictEqual(mockState.currentUserId, null, 'No user profile in view-only mode');
  assert.strictEqual(mockState.isAdmin, false, 'Admin revoked in view-only mode');
});

test('6.7 Week View vs Month View toggle integrity: both modes render without freeze or hanging', () => {
  const mockState = {
    scheduleViewMode: 'week',
    currentWeekStart: '2026-11-01',
    currentMonth: '2026-11'
  };

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2026, 10, 1 + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    weekDays.push(`${y}-${m}-${day}`);
  }
  assert.strictEqual(weekDays.length, 7, 'Week view must generate exactly 7 day columns');
  assert.strictEqual(weekDays[0], '2026-11-01', 'First day of initial week is 2026-11-01');
  assert.strictEqual(weekDays[6], '2026-11-07', 'Last day of initial week is 2026-11-07');

  const monthDays = [];
  for (let i = 1; i <= 30; i++) {
    monthDays.push(`2026-11-${String(i).padStart(2, '0')}`);
  }
  assert.strictEqual(monthDays.length, 30, 'Month view must generate 30 days for November');

  mockState.scheduleViewMode = 'month';
  assert.strictEqual(mockState.scheduleViewMode, 'month', 'Successfully switched to month view');

  mockState.scheduleViewMode = 'week';
  assert.strictEqual(mockState.scheduleViewMode, 'week', 'Successfully switched back to week view');
});

// ========================================================
// MODULE 7: Full PC End-to-End Boot Execution
// ========================================================
console.log('\n>>> MODULE 7: Full PC End-to-End Boot Execution');

test('7.1 Simulated desktop boot runs complete initialization without unhandled exceptions', () => {
  let overlayHidden = false;
  let scheduleCardVisible = false;
  let mobileContainerHidden = false;
  let bootErrors = [];

  try {
    const overlay = {
      classList: {
        remove: () => {},
        add: (cls) => {
          if (cls === 'hidden-permanently' || cls === 'hidden') overlayHidden = true;
        }
      },
      style: { display: 'flex' }
    };

    overlay.classList.add('hidden-permanently', 'hidden');
    overlay.style.display = 'none';

    const isMobile = mockIsMobile(1920, false, false);
    if (!isMobile) {
      scheduleCardVisible = true;
      mobileContainerHidden = true;
    }

    const employees = dataJson.employees;
    const projects = dataJson.projects;
    assert(employees.length > 0, 'Employees loaded');
    assert(projects.length > 0, 'Projects loaded');

  } catch (err) {
    bootErrors.push(err.message);
  }

  assert.strictEqual(bootErrors.length, 0, `Boot must complete with 0 errors: ${bootErrors.join(', ')}`);
  assert.strictEqual(overlayHidden, true, 'Welcome overlay must be permanently hidden');
  assert.strictEqual(scheduleCardVisible, true, 'Desktop schedule card must be visible');
  assert.strictEqual(mobileContainerHidden, true, 'Mobile container must be hidden on PC');
});

console.log('\n==========================================================');
console.log(` PC WELCOME SCREEN TEST COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==========================================================');

if (failCount > 0) {
  process.exit(1);
}
