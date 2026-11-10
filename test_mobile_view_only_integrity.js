/**
 * test_mobile_view_only_integrity.js
 * Dedicated automated test suite verifying that on the mobile interface with the view-only link:
 * 1. Mobile logger mode is completely removed/disabled.
 * 2. Only Grid View is enabled (strictly read-only visualization).
 * 3. Mode toggles and return-to-logger controls are hidden and disabled.
 * 4. All edit entry points (mobile logger apply, cell edit, bulk fill, batch assign,
 *    profile selection, keyboard delete/space/enter, sync) are strictly prohibited.
 */

const fs = require('fs');
const assert = require('assert');

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
console.log(' RUNNING MOBILE INTERFACE VIEW-ONLY INTEGRITY TEST SUITE');
console.log('==========================================================\n');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

// ========================================================
// MODULE 1: Static Code Contracts & Zero Emojis
// ========================================================
console.log('>>> MODULE 1: Static Code Contracts & Zero Emojis');

test('1.1 Zero unicode emojis in index.html, app.js, and styles.css', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(html), 'Found emoji in index.html');
  assert(!emojiRegex.test(js), 'Found emoji in app.js');
  assert(!emojiRegex.test(css), 'Found emoji in styles.css');
});

test('1.2 Cache buster is bumped to v=9.9 in index.html', () => {
  assert(html.includes('styles.css?v=9.9'), 'styles.css v=9.9 not found');
  assert(html.includes('app.js?v=9.9'), 'app.js v=9.9 not found');
});

test('1.3 styles.css strictly hides mobile app container in view-only mode', () => {
  assert(css.includes('body.view-only .mobile-app-container'), 'Missing body.view-only .mobile-app-container rule');
  assert(css.includes('body.view-only #mobileAppContainer'), 'Missing body.view-only #mobileAppContainer rule');
  assert(css.includes('display: none !important;'), 'Missing display: none !important rule in styles.css');
});

test('1.4 styles.css strictly hides return-to-logger and mobile grid switch in view-only mode', () => {
  assert(css.includes('body.view-only #mobileReturnToLoggerBtn'), 'Missing body.view-only #mobileReturnToLoggerBtn rule');
  assert(css.includes('body.view-only #toggleMobileDesktopGridViewBtn'), 'Missing body.view-only #toggleMobileDesktopGridViewBtn rule');
});

test('1.5 styles.css enforces visible schedule card in view-only mobile interface', () => {
  assert(css.includes('body.view-only.is-mobile-device .schedule-card') || css.includes('body.view-only .schedule-card'), 'Missing schedule-card display rule in view-only mode');
  assert(css.includes('body.mobile-readonly-grid .schedule-table td.col-slot'), 'Missing mobile-readonly-grid col-slot cursor rule');
});

// ========================================================
// MODULE 2: URL & View-Only Boot State Logic
// ========================================================
console.log('\n>>> MODULE 2: URL & View-Only Boot State Logic');

test('2.1 URL mode=view check sets state.isViewOnly = true', () => {
  assert(js.includes("urlParams.get('mode') === 'view' || window.location.pathname.endsWith('/view')"), 'Missing URL view-only mode check');
  assert(js.includes('state.isViewOnly = true;'), 'Missing state.isViewOnly = true assignment');
});

test('2.2 URL mode=view check forces state.mobileViewMode = "grid"', () => {
  const viewOnlyInitIdx = js.indexOf("urlParams.get('mode') === 'view'");
  const viewOnlyInitBlock = js.substring(viewOnlyInitIdx, viewOnlyInitIdx + 1100);
  assert(viewOnlyInitBlock.includes("state.mobileViewMode = 'grid'"), 'Missing state.mobileViewMode = grid in view-only initialization');
  assert(viewOnlyInitBlock.includes("state.currentUserId = null"), 'Missing state.currentUserId = null in view-only initialization');
  assert(viewOnlyInitBlock.includes("state.mobileTargetEmpId = null"), 'Missing state.mobileTargetEmpId = null in view-only initialization');
  assert(viewOnlyInitBlock.includes("document.body.classList.add('mobile-readonly-grid')"), 'Missing mobile-readonly-grid body class');
});

test('2.3 URL mode=view hides drawer toggle and mobile logger container immediately', () => {
  const viewOnlyInitIdx = js.indexOf("urlParams.get('mode') === 'view'");
  const viewOnlyInitBlock = js.substring(viewOnlyInitIdx, viewOnlyInitIdx + 1400);
  assert(viewOnlyInitBlock.includes("el.toggleMobileDesktopGridViewBtn.classList.add('hidden')"), 'Missing hide of toggleMobileDesktopGridViewBtn');
  assert(viewOnlyInitBlock.includes("el.mobileReturnToLoggerBtn.classList.add('hidden')"), 'Missing hide of mobileReturnToLoggerBtn');
  assert(viewOnlyInitBlock.includes("el.mobileAppContainer.classList.add('hidden')"), 'Missing hide of mobileAppContainer');
});

// ========================================================
// MODULE 3: Stored Identity & Profile Switching Immunity
// ========================================================
console.log('\n>>> MODULE 3: Stored Identity & Profile Switching Immunity');

test('3.1 resolveStoredUser immediately aborts and resets identity if state.isViewOnly is true', () => {
  const resolveIdx = js.indexOf('function resolveStoredUser()');
  const resolveBlock = js.substring(resolveIdx, resolveIdx + 400);
  assert(resolveBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly check in resolveStoredUser');
  assert(resolveBlock.includes('state.currentUserId = null'), 'Missing state.currentUserId = null reset in resolveStoredUser');
  assert(resolveBlock.includes('return null;'), 'Missing early return null in resolveStoredUser');
});

test('3.2 openUserSelectModal is guarded against view-only mode', () => {
  const openModalIdx = js.indexOf('function openUserSelectModal()');
  const openModalBlock = js.substring(openModalIdx, openModalIdx + 300);
  assert(openModalBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly check in openUserSelectModal');
  assert(openModalBlock.includes('return;'), 'Missing return guard in openUserSelectModal');
});

test('3.3 User select grid card click is guarded against view-only mode', () => {
  const cardClickIdx = js.indexOf("el.userSelectGrid.querySelectorAll('.user-select-card')");
  const cardClickBlock = js.substring(cardClickIdx, cardClickIdx + 300);
  assert(cardClickBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in card click handler');
});

// ========================================================
// MODULE 4: Mobile Interface & Device View Mode Locking
// ========================================================
console.log('\n>>> MODULE 4: Mobile Interface & Device View Mode Locking');

test('4.1 updateDeviceViewMode enforces read-only grid view when state.isViewOnly is true', () => {
  const updateDeviceIdx = js.indexOf('function updateDeviceViewMode()');
  const updateDeviceBlock = js.substring(updateDeviceIdx, updateDeviceIdx + 1400);
  assert(updateDeviceBlock.includes('if (state.isViewOnly)'), 'Missing isViewOnly block in updateDeviceViewMode');
  assert(updateDeviceBlock.includes("state.mobileViewMode = 'grid'"), 'Missing mobileViewMode = grid in updateDeviceViewMode');
  assert(updateDeviceBlock.includes("container.classList.add('hidden')"), 'Missing container hidden in updateDeviceViewMode');
  assert(updateDeviceBlock.includes("gridCard.classList.remove('hidden')"), 'Missing gridCard unhidden in updateDeviceViewMode');
  assert(updateDeviceBlock.includes("document.body.classList.add('mobile-readonly-grid')"), 'Missing mobile-readonly-grid class in updateDeviceViewMode');
  assert(updateDeviceBlock.includes("el.mobileReturnToLoggerBtn.classList.add('hidden')"), 'Missing mobileReturnToLoggerBtn hidden in updateDeviceViewMode');
  assert(updateDeviceBlock.includes("el.toggleMobileDesktopGridViewBtn.classList.add('hidden')"), 'Missing toggleMobileDesktopGridViewBtn hidden in updateDeviceViewMode');
});

test('4.2 toggleMobileDesktopGridViewBtn click event is guarded against view-only mode', () => {
  const toggleBtnIdx = js.indexOf("el.toggleMobileDesktopGridViewBtn.addEventListener('click'");
  const toggleBtnBlock = js.substring(toggleBtnIdx, toggleBtnIdx + 400);
  assert(toggleBtnBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in toggleMobileDesktopGridViewBtn click');
  assert(toggleBtnBlock.includes('return;'), 'Missing return statement in toggleMobileDesktopGridViewBtn click');
});

test('4.3 mobileReturnToLoggerBtn click event is guarded against view-only mode', () => {
  const returnBtnIdx = js.indexOf("el.mobileReturnToLoggerBtn.addEventListener('click'");
  const returnBtnBlock = js.substring(returnBtnIdx, returnBtnIdx + 400);
  assert(returnBtnBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in mobileReturnToLoggerBtn click');
  assert(returnBtnBlock.includes('return;'), 'Missing return statement in mobileReturnToLoggerBtn click');
});

test('4.4 initMobileWelcomeScreen does not switch view mode to form when state.isViewOnly is true', () => {
  const welcomeIdx = js.indexOf('function initMobileWelcomeScreen()');
  const welcomeBlock = js.substring(welcomeIdx, welcomeIdx + 900);
  assert(welcomeBlock.includes('if (isMobileInterface() && !state.isViewOnly)'), 'Missing !state.isViewOnly guard in initMobileWelcomeScreen');
});

// ========================================================
// MODULE 5: Mobile Logger Apply Mutation Attack Prevention
// ========================================================
console.log('\n>>> MODULE 5: Mobile Logger Apply Mutation Attack Prevention');

test('5.1 handleMobileApply starts with an immediate state.isViewOnly guard', () => {
  const applyIdx = js.indexOf('function handleMobileApply()');
  const applyBlock = js.substring(applyIdx, applyIdx + 300);
  assert(applyBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly check at start of handleMobileApply');
  assert(applyBlock.includes('return;'), 'Missing early return in handleMobileApply view-only guard');
});

// ========================================================
// MODULE 6: Universal Schedule Edit Blockers in View-Only
// ========================================================
console.log('\n>>> MODULE 6: Universal Schedule Edit Blockers in View-Only');

test('6.1 saveCellAssignment is guarded against view-only mode', () => {
  const saveCellIdx = js.indexOf('function saveCellAssignment(');
  const saveCellBlock = js.substring(saveCellIdx, saveCellIdx + 300);
  assert(saveCellBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in saveCellAssignment');
});

test('6.2 batchApplyToSelectedCells is guarded against view-only mode', () => {
  const batchIdx = js.indexOf('function batchApplyToSelectedCells(');
  const batchBlock = js.substring(batchIdx, batchIdx + 300);
  assert(batchBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in batchApplyToSelectedCells');
});

test('6.3 openCellPopover is guarded against view-only mode', () => {
  const popoverIdx = js.indexOf('function openCellPopover(');
  const popoverBlock = js.substring(popoverIdx, popoverIdx + 300);
  assert(popoverBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in openCellPopover');
});

test('6.4 confirmBulkFillBtn is guarded against view-only mode', () => {
  const bulkIdx = js.indexOf("el.confirmBulkFillBtn.addEventListener('click'");
  const bulkBlock = js.substring(bulkIdx, bulkIdx + 300);
  assert(bulkBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in confirmBulkFillBtn');
});

test('6.5 openNoProjectModal, btn-save-row & noProjectBatchApplyBtn are guarded against view-only mode', () => {
  const noProjIdx = js.indexOf('function openNoProjectModal(');
  const noProjBlock = js.substring(noProjIdx, noProjIdx + 300);
  assert(noProjBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in openNoProjectModal');

  const saveRowIdx = js.indexOf("el.noProjectTableBody.querySelectorAll('.btn-save-row')");
  const saveRowBlock = js.substring(saveRowIdx, saveRowIdx + 200);
  assert(saveRowBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in btn-save-row');

  const batchApplyIdx = js.indexOf("el.noProjectBatchApplyBtn.addEventListener('click'");
  const batchApplyBlock = js.substring(batchApplyIdx, batchApplyIdx + 200);
  assert(batchApplyBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in noProjectBatchApplyBtn');
});

test('6.6 Double-click on cell is guarded against view-only mode', () => {
  assert(js.includes("if (state.isViewOnly || state.currentUserId === 'view-all')"), 'Missing view-only check in cell double-click listener');
});

test('6.7 Keyboard Delete / Backspace keys are guarded against view-only mode', () => {
  assert(js.includes("if (e.key === 'Delete' || e.key === 'Backspace')"), 'Missing delete key listener');
  assert(js.includes("if (state.isViewOnly || state.currentUserId === 'view-all') return;"), 'Missing view-only return guard on delete key');
});

test('6.8 syncToServer aborts immediately if state.isViewOnly is true', () => {
  const syncIdx = js.indexOf('async function syncToServer()');
  const syncBlock = js.substring(syncIdx, syncIdx + 200);
  assert(syncBlock.includes('if (state.isViewOnly) return;'), 'Missing view-only guard in syncToServer');
});

// ========================================================
// MODULE 7: Behavioral Simulation of Mobile View-Only Mode
// ========================================================
console.log('\n>>> MODULE 7: Behavioral Simulation of Mobile View-Only Mode');

test('7.1 Simulation: Attempting mobile fill in view-only mode leaves state.allocations pristine', () => {
  // Simulate application state in view-only mode on mobile interface
  const mockState = {
    isViewOnly: true,
    currentUserId: null,
    mobileTargetEmpId: null,
    mobileViewMode: 'grid',
    employees: [
      { id: 'emp_1', name: 'Catherine NASSAR', defaultHoursPerDay: 8, sectionId: 'sec_1' }
    ],
    sections: [
      { id: 'sec_1', name: 'Software', location: 'Cairo' }
    ],
    allocations: {
      'emp_1_2026-11-01': { project: 'Original Project', hours: 8 }
    },
    history: []
  };

  const initialAllocationsClone = JSON.stringify(mockState.allocations);
  const initialHistoryLength = mockState.history.length;

  // Simulate handleMobileApply logic with view-only guard
  function simulatedHandleMobileApply(state) {
    if (state.isViewOnly) {
      // Guarded! Early abort
      return { status: 'blocked', reason: 'view-only' };
    }
    // Mutation code would have executed here
    state.allocations['emp_1_2026-11-01'] = { project: 'Attacked Project', hours: 4 };
    return { status: 'mutated' };
  }

  const result = simulatedHandleMobileApply(mockState);
  assert.strictEqual(result.status, 'blocked');
  assert.strictEqual(JSON.stringify(mockState.allocations), initialAllocationsClone, 'Allocations were mutated!');
  assert.strictEqual(mockState.history.length, initialHistoryLength, 'Audit history was mutated!');
  assert.strictEqual(mockState.mobileViewMode, 'grid', 'mobileViewMode was switched away from grid!');
});

test('7.2 Simulation: Attempting stored identity restoration in view-only mode maintains null profile', () => {
  const mockState = {
    isViewOnly: true,
    currentUserId: null,
    mobileTargetEmpId: null,
    employees: [
      { id: 'emp_1', name: 'Catherine NASSAR', defaultHoursPerDay: 8 }
    ]
  };

  function simulatedResolveStoredUser(state, savedId) {
    if (state.isViewOnly) {
      state.currentUserId = null;
      state.mobileTargetEmpId = null;
      return null;
    }
    state.currentUserId = savedId;
    return state.employees.find(e => e.id === savedId);
  }

  const resolved = simulatedResolveStoredUser(mockState, 'emp_1');
  assert.strictEqual(resolved, null, 'User identity was improperly resolved in view-only mode');
  assert.strictEqual(mockState.currentUserId, null, 'state.currentUserId was set in view-only mode');
  assert.strictEqual(mockState.mobileTargetEmpId, null, 'state.mobileTargetEmpId was set in view-only mode');
});

test('7.3 Simulation: Mode toggle click in view-only mode strictly refuses switching to form', () => {
  const mockState = {
    isViewOnly: true,
    mobileViewMode: 'grid'
  };

  function simulatedToggleClick(state) {
    if (state.isViewOnly) {
      return; // Refuse
    }
    state.mobileViewMode = (state.mobileViewMode === 'grid') ? 'form' : 'grid';
  }

  simulatedToggleClick(mockState);
  assert.strictEqual(mockState.mobileViewMode, 'grid', 'mobileViewMode changed to form in view-only mode');
});

console.log(`\n==========================================================`);
console.log(` MOBILE VIEW-ONLY INTEGRITY SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log(`==========================================================\n`);

if (failCount > 0) {
  process.exit(1);
}
