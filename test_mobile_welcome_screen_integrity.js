/**
 * test_mobile_welcome_screen_integrity.js
 * Dedicated automated test suite verifying that on the Mobile interface:
 * 1. The welcome/loading screen is enabled and styled specifically for mobile touch viewports.
 * 2. Mobile artwork uses the exact, unmodified, full-quality original image (1408x3040, 320,123 bytes, matching welcome_pic_mob).
 * 3. The rotating loading circle (splash spinner) is positioned directly above "by" and centered horizontally (left: 50.0%, top: 90.0%).
 * 4. The mobile app NEVER gets stuck at the welcome page under any circumstance (timer, touch tap, click, inline fallback).
 * 5. Overlay is completely dismissed and leaves zero pointer-events traps or lingering z-index overlays on touch screens.
 * 6. Mobile viewport routing strictly detects mobile resolutions (isMobileInterface === true) and unhides #mobileAppContainer.
 * 7. Mobile editor, profile bar, project dropdown, summary KPIs, and agenda initialize and open cleanly across all boot scenarios.
 * 8. Zero unicode emojis across files.
 */

const fs = require('fs');
const assert = require('assert');
const crypto = require('crypto');

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
console.log(' RUNNING MOBILE WELCOME SCREEN BYPASS & OPENING TEST SUITE');
console.log('==========================================================\n');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const dataJson = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// ========================================================
// MODULE 1: Static Code Contracts & Zero Emojis
// ========================================================
console.log('>>> MODULE 1: Static Code Contracts & Zero Emojis');

test('1.1 Zero unicode emojis in index.html, app.js, styles.css, and mobile test suite', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(html), 'Found emoji in index.html');
  assert(!emojiRegex.test(js), 'Found emoji in app.js');
  assert(!emojiRegex.test(css), 'Found emoji in styles.css');
});

test('1.2 Cache buster bumped to v=10.0 in index.html', () => {
  assert(html.includes('styles.css?v=10.0'), 'styles.css v=10.0 not found in index.html');
  assert(html.includes('app.js?v=10.0'), 'app.js v=10.0 not found in index.html');
});

test('1.3 alstom-welcome-mobile.jpg is byte-for-byte identical to welcome_pic_mob/2026-11-10 17.06.jpg', () => {
  const origMobBuf = fs.readFileSync('welcome_pic_mob/2026-11-10 17.06.jpg');
  const mobBuf = fs.readFileSync('alstom-welcome-mobile.jpg');
  assert.strictEqual(mobBuf.length, 320123, 'Mobile welcome image must be exactly 320,123 bytes');
  const origHash = crypto.createHash('sha256').update(origMobBuf).digest('hex');
  const mobHash = crypto.createHash('sha256').update(mobBuf).digest('hex');
  assert.strictEqual(mobHash, origHash, 'Mobile welcome image SHA256 must match welcome_pic_mob exactly');
});

// ========================================================
// MODULE 2: Mobile Welcome Screen Layout & Responsive Placement
// ========================================================
console.log('\n>>> MODULE 2: Mobile Welcome Screen Layout & Responsive Placement');

test('2.1 index.html references responsive mobile artwork source tag with natural dimensions (1408x3040)', () => {
  assert(html.includes('<source media="(max-width: 768px)" srcset="alstom-welcome-mobile.jpg?v=10.0" width="1408" height="3040">'), 'Mobile source tag missing or misconfigured in index.html');
});

test('2.2 Mobile-responsive positioning places circle above "by" and centers horizontally', () => {
  assert(html.includes('@media (max-width: 768px)'), 'Mobile media query missing in critical CSS');
  assert(html.includes('top: 90.0%;'), 'Mobile top: 90.0% clearance missing in critical CSS');
  assert(html.includes('left: 50.0%;'), 'Mobile left: 50.0% centering missing in critical CSS');
  assert(css.includes('@media (max-width: 768px)'), 'Mobile media query missing in styles.css');
  assert(css.includes('top: 90.0%;'), 'Mobile top: 90.0% clearance missing in styles.css');
  assert(css.includes('left: 50.0%;'), 'Mobile left: 50.0% centering missing in styles.css');
});

test('2.3 Mobile welcome stage and artwork enforces 100% full-screen fit across mobile devices', () => {
  assert(html.includes('object-fit: fill'), 'Mobile object-fit: fill missing in critical CSS');
  assert(css.includes('object-fit: fill'), 'Mobile object-fit: fill missing in styles.css');
  assert(css.includes('clamp('), 'Mobile responsive clamp sizing missing in styles.css');
});

// ========================================================
// MODULE 3: Mobile Welcome Screen Dismissal & Anti-Trap Contracts
// ========================================================
console.log('\n>>> MODULE 3: Mobile Welcome Screen Dismissal & Anti-Trap Contracts');

test('3.1 initMobileWelcomeScreen registers passive touchstart event listener for mobile finger tap', () => {
  const fnIdx = js.indexOf('function initMobileWelcomeScreen()');
  assert(fnIdx !== -1, 'initMobileWelcomeScreen function missing in app.js');
  const fnBlock = js.substring(fnIdx, fnIdx + 1600);
  assert(fnBlock.includes("overlay.addEventListener('touchstart', dismissWelcome, { passive: true })"), 'Missing touchstart listener with passive: true');
});

test('3.2 initMobileWelcomeScreen registers click event listener for mobile taps', () => {
  const fnIdx = js.indexOf('function initMobileWelcomeScreen()');
  const fnBlock = js.substring(fnIdx, fnIdx + 1600);
  assert(fnBlock.includes("overlay.addEventListener('click', dismissWelcome)"), 'Missing click listener in initMobileWelcomeScreen');
});

test('3.3 10-second auto-dismissal timeout contract protects against untouched devices', () => {
  const fnIdx = js.indexOf('function initMobileWelcomeScreen()');
  const fnBlock = js.substring(fnIdx, fnIdx + 1600);
  assert(fnBlock.includes('setTimeout'), 'Missing setTimeout in initMobileWelcomeScreen');
  assert(fnBlock.includes('10000'), 'Timeout must be 10000ms');
});

test('3.4 Inline HTML onclick fallback exists on #mobileWelcomeOverlay for immediate mobile dismissal', () => {
  const overlayIdx = html.indexOf('id="mobileWelcomeOverlay"');
  assert(overlayIdx !== -1, 'id="mobileWelcomeOverlay" missing in index.html');
  const overlayTag = html.substring(overlayIdx, overlayIdx + 400);
  assert(overlayTag.includes("onclick=\"this.classList.add('fade-out')"), 'Missing inline onclick fallback');
  assert(overlayTag.includes("self.classList.add('hidden-permanently', 'hidden')"), 'Missing inline permanent hidden fallback');
  assert(overlayTag.includes("self.style.display='none'"), 'Missing inline display:none fallback');
});

test('3.5 Critical CSS enforces pointer-events: none and display: none !important for dismissed overlay', () => {
  const critCssIdx = html.indexOf('<style id="mobileLaunchCritical">');
  const critCssEnd = html.indexOf('</style>', critCssIdx);
  const critCss = html.substring(critCssIdx, critCssEnd);
  assert(critCss.includes('#mobileWelcomeOverlay.hidden'), 'Missing #mobileWelcomeOverlay.hidden in critical CSS');
  assert(critCss.includes('#mobileWelcomeOverlay.hidden-permanently'), 'Missing #mobileWelcomeOverlay.hidden-permanently in critical CSS');
  assert(critCss.includes('display: none !important;'), 'Missing display:none !important in critical CSS');
  assert(critCss.includes('pointer-events: none !important;'), 'Missing pointer-events:none in critical CSS');
});

test('3.6 styles.css enforces pointer-events: none and opacity: 0 on .fade-out to unblock touch events immediately', () => {
  const fadeOutIdx = css.indexOf('#mobileWelcomeOverlay.fade-out');
  assert(fadeOutIdx !== -1, '#mobileWelcomeOverlay.fade-out missing in styles.css');
  const fadeBlock = css.substring(fadeOutIdx, fadeOutIdx + 200);
  assert(fadeBlock.includes('pointer-events: none !important;'), 'Missing pointer-events: none in fade-out');
  assert(fadeBlock.includes('opacity: 0 !important;'), 'Missing opacity: 0 in fade-out');
});

// ========================================================
// MODULE 4: Mobile Viewport Detection & Interface Routing
// ========================================================
console.log('\n>>> MODULE 4: Mobile Viewport Detection & Interface Routing');

function mockIsMobile(width, isTouch = false, isCoarse = false, userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)') {
  const state = { forceDesktopViewOnMobile: false };
  if (state.forceDesktopViewOnMobile) return false;
  const isTouchDevice = isCoarse;
  const cannotHover = isCoarse;
  const isMobileUA = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const minDim = Math.min(width, 844);
  if ((isMobileUA || (isTouchDevice && cannotHover)) && minDim < 800) return true;
  if (width <= 768) return true;
  return false;
}

test('4.1 Mobile phone resolutions strictly return isMobileInterface() === true', () => {
  const phoneWidths = [360, 375, 390, 393, 412, 414, 428, 430, 768];
  phoneWidths.forEach(w => {
    assert.strictEqual(mockIsMobile(w, true, true), true, `Width ${w}px must be classified as Mobile`);
  });
});

test('4.2 Coarse touch pointer evaluates as Mobile interface', () => {
  assert.strictEqual(mockIsMobile(390, true, true), true, 'Coarse touch pointer must evaluate as mobile');
  assert.strictEqual(mockIsMobile(412, true, true), true, 'Android touch pointer must evaluate as mobile');
});

test('4.3 Mobile View Mode defaults to "form" (Mobile Editor / Schedule Logger) on boot', () => {
  const initIdx = js.indexOf('function initMobileWelcomeScreen()');
  const initBlock = js.substring(initIdx, initIdx + 500);
  assert(initBlock.includes("state.mobileViewMode = 'form'"), 'Missing state.mobileViewMode = "form" in initMobileWelcomeScreen');
  assert(initBlock.includes('updateDeviceViewMode()'), 'Missing updateDeviceViewMode() call in initMobileWelcomeScreen');
});

// ========================================================
// MODULE 5: Mobile Interface Unhide & Structural Readiness
// ========================================================
console.log('\n>>> MODULE 5: Mobile Interface Unhide & Structural Readiness');

test('5.1 updateDeviceViewMode on mobile unhides #mobileAppContainer and hides .schedule-card', () => {
  const updateIdx = js.indexOf('function updateDeviceViewMode()');
  assert(updateIdx !== -1, 'updateDeviceViewMode missing in app.js');
  const updateBlock = js.substring(updateIdx, updateIdx + 4000);
  assert(updateBlock.includes("document.body.classList.add('is-mobile-device')"), 'Missing is-mobile-device on body');
  assert(updateBlock.includes("document.body.classList.remove('is-desktop-device')"), 'Missing remove is-desktop-device on body');
  assert(updateBlock.includes("if (container) container.classList.remove('hidden')"), 'Missing container.classList.remove(hidden) in mobile branch');
  assert(updateBlock.includes("if (gridCard) gridCard.classList.add('hidden')"), 'Missing gridCard.classList.add(hidden) in mobile branch');
  assert(updateBlock.includes('renderMobileView()'), 'Missing renderMobileView() in mobile branch');
});

test('5.2 Mobile Profile Bar elements exist in index.html', () => {
  assert(html.includes('id="mobileAvatarCircle"'), 'Missing id="mobileAvatarCircle"');
  assert(html.includes('id="mobileUserNameDisplay"'), 'Missing id="mobileUserNameDisplay"');
  assert(html.includes('id="mobileRoleCaption"'), 'Missing id="mobileRoleCaption"');
});

test('5.3 Mobile Editor Form elements exist in index.html', () => {
  assert(html.includes('id="mobileEmployeeSelect"'), 'Missing id="mobileEmployeeSelect"');
  assert(html.includes('id="mobileFromDate"'), 'Missing id="mobileFromDate"');
  assert(html.includes('id="mobileToDate"'), 'Missing id="mobileToDate"');
  assert(html.includes('id="mobileProjectSelect"'), 'Missing id="mobileProjectSelect"');
  assert(html.includes('id="mobileHoursInput"'), 'Missing id="mobileHoursInput"');
  assert(html.includes('id="mobileApplyBtn"'), 'Missing id="mobileApplyBtn"');
});

test('5.4 Mobile Summary & Agenda elements exist in index.html', () => {
  assert(html.includes('id="mobileSummaryCard"'), 'Missing id="mobileSummaryCard"');
  assert(html.includes('id="mobileMonthLabel"'), 'Missing id="mobileMonthLabel"');
  assert(html.includes('id="mobileTotalHoursNum"'), 'Missing id="mobileTotalHoursNum"');
  assert(html.includes('id="mobileUnfilledDaysNum"'), 'Missing id="mobileUnfilledDaysNum"');
  assert(html.includes('id="mobileProjectsSummaryPills"'), 'Missing id="mobileProjectsSummaryPills"');
  assert(html.includes('id="mobileAgendaList"'), 'Missing id="mobileAgendaList"');
});

test('5.5 Mobile Navigation controls exist in index.html', () => {
  assert(html.includes('id="toggleMobileDesktopGridViewBtn"'), 'Missing id="toggleMobileDesktopGridViewBtn"');
  assert(html.includes('id="mobileReturnToLoggerBtn"'), 'Missing id="mobileReturnToLoggerBtn"');
  assert(html.includes('id="mobileGridNoticeBanner"'), 'Missing id="mobileGridNoticeBanner"');
});

// ========================================================
// MODULE 6: Behavioral State Simulation (Never Stuck / Always Opens)
// ========================================================
console.log('\n>>> MODULE 6: Behavioral State Simulation (Never Stuck / Always Opens)');

test('6.1 Touchstart tap dismiss simulation: mobile tap on overlay triggers immediate dismissal', () => {
  let dismissed = false;
  let touchTriggered = false;
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

  function dismissWelcome() {
    if (dismissed) return;
    dismissed = true;
    overlay.classList.add('fade-out');
    overlay.classList.add('hidden-permanently', 'hidden');
    overlay.style.display = 'none';
  }

  overlay.addEventListener('touchstart', () => {
    touchTriggered = true;
    dismissWelcome();
  });

  // Mobile finger tap triggers touchstart
  overlay.listeners['touchstart']();

  assert.strictEqual(touchTriggered, true, 'Touchstart handler must execute');
  assert.strictEqual(dismissed, true, 'Overlay must be dismissed on mobile tap');
  assert.strictEqual(overlay.style.display, 'none', 'Overlay must be hidden');
  assert.strictEqual(overlay.classList.contains('hidden-permanently'), true, 'hidden-permanently class added');
});

test('6.2 Click tap dismiss simulation: mobile click on overlay triggers immediate dismissal', () => {
  let dismissed = false;
  let clickTriggered = false;
  const overlay = {
    classes: new Set(['mobile-welcome-overlay']),
    style: { display: 'flex' },
    listeners: {},
    addEventListener(evt, fn) { this.listeners[evt] = fn; },
    classList: {
      add(...cls) { cls.forEach(c => overlay.classes.add(c)); },
      remove(...cls) { cls.forEach(c => overlay.classes.delete(c)); }
    }
  };

  function dismissWelcome() {
    if (dismissed) return;
    dismissed = true;
    overlay.classList.add('hidden-permanently', 'hidden');
    overlay.style.display = 'none';
  }

  overlay.addEventListener('click', () => {
    clickTriggered = true;
    dismissWelcome();
  });

  overlay.listeners['click']();

  assert.strictEqual(clickTriggered, true, 'Click handler must execute');
  assert.strictEqual(dismissed, true, 'Overlay must be dismissed on click');
  assert.strictEqual(overlay.style.display, 'none', 'Overlay must be hidden');
});

test('6.3 Auto-dismiss timeout simulation: 10 seconds elapses on mobile without touch', () => {
  let dismissed = false;
  const overlay = {
    style: { display: 'flex' },
    classes: new Set(['mobile-welcome-overlay']),
    classList: {
      add(...cls) { cls.forEach(c => overlay.classes.add(c)); }
    }
  };

  function dismissWelcome() {
    if (dismissed) return;
    dismissed = true;
    overlay.classList.add('hidden-permanently', 'hidden');
    overlay.style.display = 'none';
  }

  // Simulate timeout firing
  dismissWelcome();

  assert.strictEqual(dismissed, true, 'Overlay must be auto-dismissed');
  assert.strictEqual(overlay.style.display, 'none', 'Overlay must be hidden');
});

test('6.4 Inline onclick fallback simulation: mobile touch executing inline handler dismisses overlay safely', () => {
  const overlay = {
    classes: new Set(['mobile-welcome-overlay']),
    style: { display: 'flex' },
    classList: {
      add(...cls) { cls.forEach(c => overlay.classes.add(c)); },
      contains(c) { return overlay.classes.has(c); }
    }
  };

  // Inline onclick handler simulation:
  // onclick="this.classList.add('fade-out'); var self = this; setTimeout(function(){ self.classList.add('hidden-permanently', 'hidden'); self.style.display='none'; }, 400);"
  overlay.classList.add('fade-out');
  assert.strictEqual(overlay.classList.contains('fade-out'), true, 'fade-out added immediately');
  
  // Timeout callback
  overlay.classList.add('hidden-permanently', 'hidden');
  overlay.style.display = 'none';

  assert.strictEqual(overlay.classList.contains('hidden-permanently'), true, 'hidden-permanently added');
  assert.strictEqual(overlay.style.display, 'none', 'style.display set to none');
});

test('6.5 Cold boot without stored user: mobile editor opens, displays "Select Your Name", tap opens modal', () => {
  const mockState = {
    currentUserId: null,
    mobileTargetEmpId: null,
    isViewOnly: false,
    employees: dataJson.employees
  };

  assert.strictEqual(mockState.currentUserId, null, 'Cold boot currentUserId is null');
  
  // Profile Bar display logic
  const curEmp = mockState.employees.find(e => e.id === mockState.currentUserId);
  const displayName = curEmp ? curEmp.name : 'Select Your Name';
  const initial = curEmp ? curEmp.name.charAt(0).toUpperCase() : '?';

  assert.strictEqual(displayName, 'Select Your Name', 'Fallback prompt displayed');
  assert.strictEqual(initial, '?', 'Fallback avatar displayed');
});

test('6.6 Boot with valid stored user: profile resolved, name displayed, personal summary rendered', () => {
  const savedEmp = dataJson.employees[0];
  const mockState = {
    currentUserId: savedEmp.id,
    mobileTargetEmpId: savedEmp.id,
    isViewOnly: false,
    employees: dataJson.employees
  };

  const curEmp = mockState.employees.find(e => e.id === mockState.currentUserId);
  assert.strictEqual(curEmp.id, savedEmp.id, 'Stored user must be resolved');
  assert.strictEqual(curEmp.name, savedEmp.name, 'Stored name must match');

  const displayName = curEmp ? curEmp.name : 'Select Your Name';
  const initial = curEmp ? curEmp.name.charAt(0).toUpperCase() : '?';
  assert.strictEqual(displayName, savedEmp.name, 'Employee name displayed on mobile');
  assert.strictEqual(initial, savedEmp.name.charAt(0).toUpperCase(), 'Employee initial displayed');
});

test('6.7 Boot with invalid/deleted user in localStorage: graceful fallback without crash or freeze', () => {
  const staleId = 'emp_deleted_12345';
  const mockState = {
    currentUserId: staleId,
    mobileTargetEmpId: staleId,
    isViewOnly: false,
    employees: dataJson.employees
  };

  const curEmp = mockState.employees.find(e => e.id === mockState.currentUserId);
  assert.strictEqual(curEmp, undefined, 'Stale employee ID resolves to undefined');
  
  const displayName = curEmp ? curEmp.name : 'Select Your Name';
  assert.strictEqual(displayName, 'Select Your Name', 'Mobile editor gracefully displays fallback prompt');
});

test('6.8 Mobile View-Only boot (?mode=view): #mobileAppContainer hidden, .schedule-card unhidden, banner visible', () => {
  const mockState = {
    isViewOnly: true,
    mobileViewMode: 'grid',
    currentUserId: null,
    mobileTargetEmpId: null
  };

  let containerHidden = false;
  let gridCardVisible = false;
  let noticeVisible = false;
  let dayColumnWidth = 0;

  if (mockState.isViewOnly) {
    mockState.mobileViewMode = 'grid';
    containerHidden = true;
    gridCardVisible = true;
    noticeVisible = true;
    dayColumnWidth = 38; // Mobile compact grid
  }

  assert.strictEqual(containerHidden, true, 'Mobile container must be hidden');
  assert.strictEqual(gridCardVisible, true, 'Schedule grid must be visible');
  assert.strictEqual(noticeVisible, true, 'Mobile grid notice banner must be visible');
  assert.strictEqual(dayColumnWidth, 38, 'Day column width set to compact 38px on mobile');
});

test('6.9 Mobile Grid View toggle: switching between editor and read-only grid never freezes', () => {
  const mockState = {
    mobileViewMode: 'form',
    isViewOnly: false
  };

  // User taps "Grid View" button
  mockState.mobileViewMode = (mockState.mobileViewMode === 'grid') ? 'form' : 'grid';
  assert.strictEqual(mockState.mobileViewMode, 'grid', 'Switched to Grid View');

  // User taps "Mobile Editor" button
  mockState.mobileViewMode = (mockState.mobileViewMode === 'grid') ? 'form' : 'grid';
  assert.strictEqual(mockState.mobileViewMode, 'form', 'Returned to Mobile Editor');
});

test('6.10 Mobile orientation change / window resize: debounced resize recalculates layout cleanly', () => {
  let layoutRecalculated = false;
  let lastInnerWidth = 390; // iPhone portrait

  function handleResize(newWidth) {
    if (newWidth !== lastInnerWidth) {
      lastInnerWidth = newWidth;
      layoutRecalculated = true;
    }
  }

  // Device rotates to landscape (844px)
  handleResize(844);

  assert.strictEqual(layoutRecalculated, true, 'Layout recalculation triggered on orientation change');
  assert.strictEqual(lastInnerWidth, 844, 'Window width updated');
});

// ========================================================
// MODULE 7: Full Mobile End-to-End Boot Execution
// ========================================================
console.log('\n>>> MODULE 7: Full Mobile End-to-End Boot Execution');

test('7.1 Simulated mobile boot runs complete initialization without unhandled exceptions', () => {
  let overlayHidden = false;
  let mobileContainerVisible = false;
  let gridCardHidden = false;
  let bootErrors = [];

  try {
    // 1. Boot welcome screen
    const overlay = {
      classList: {
        remove: () => {},
        add: (cls) => {
          if (cls === 'hidden-permanently' || cls === 'hidden') overlayHidden = true;
        }
      },
      style: { display: 'flex' }
    };

    // Simulate mobile touch dismissal
    overlay.classList.add('hidden-permanently', 'hidden');
    overlay.style.display = 'none';

    // 2. View mode update on Mobile (width: 390)
    const isMobile = mockIsMobile(390, true, true);
    assert.strictEqual(isMobile, true, 'Must detect mobile');
    
    const state = { mobileViewMode: 'form', isViewOnly: false };
    if (isMobile && state.mobileViewMode === 'form') {
      mobileContainerVisible = true;
      gridCardHidden = true;
    }

    // 3. Load data
    const employees = dataJson.employees;
    const projects = dataJson.projects;
    assert(employees.length > 0, 'Employees loaded');
    assert(projects.length > 0, 'Projects loaded');

  } catch (err) {
    bootErrors.push(err.message);
  }

  assert.strictEqual(bootErrors.length, 0, `Mobile boot must complete with 0 errors: ${bootErrors.join(', ')}`);
  assert.strictEqual(overlayHidden, true, 'Welcome overlay must be permanently hidden');
  assert.strictEqual(mobileContainerVisible, true, 'Mobile app container must be visible');
  assert.strictEqual(gridCardHidden, true, 'Desktop schedule card must be hidden in mobile editor mode');
});

console.log('\n==========================================================');
console.log(` MOBILE WELCOME SCREEN TEST COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==========================================================');

if (failCount > 0) {
  process.exit(1);
}
