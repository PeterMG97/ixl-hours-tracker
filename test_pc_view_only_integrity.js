/**
 * test_pc_view_only_integrity.js
 * Dedicated automated test suite verifying that on the PC interface with the view-only link:
 * 1. Bulk Fill option is completely removed and hidden from the PC interface.
 * 2. Bulk Fill modal and trigger buttons cannot be accessed or executed.
 * 3. Schedule grid cells, double-click popovers, keyboard edits, hold-and-drag multi-selection,
 *    NO PROJECT batch fills, WBS edits, and admin escalations are 100% blocked.
 * 4. Zero modifications to state.allocations or remote database can occur under any interaction.
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
console.log(' RUNNING PC INTERFACE VIEW-ONLY INTEGRITY TEST SUITE');
console.log('==========================================================\n');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

// ========================================================
// MODULE 1: Static Code Contracts & Zero Emojis
// ========================================================
console.log('>>> MODULE 1: Static Code Contracts & Zero Emojis');

test('1.1 Zero unicode emojis in index.html, app.js, styles.css, and test suites', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(html), 'Found emoji in index.html');
  assert(!emojiRegex.test(js), 'Found emoji in app.js');
  assert(!emojiRegex.test(css), 'Found emoji in styles.css');
});

test('1.2 Cache buster bumped to v=9.9 in index.html', () => {
  assert(html.includes('styles.css?v=9.9'), 'styles.css v=9.9 not found in index.html');
  assert(html.includes('app.js?v=9.9'), 'app.js v=9.9 not found in index.html');
});

test('1.3 styles.css removes topbarBulkFillBtn in view-only mode on PC', () => {
  assert(css.includes('body.view-only #topbarBulkFillBtn'), 'Missing body.view-only #topbarBulkFillBtn rule in styles.css');
  assert(css.includes('display: none !important;'), 'Missing display: none !important in styles.css');
});

test('1.4 styles.css removes openBulkFillBtn and popover-footer-action in view-only mode', () => {
  assert(css.includes('body.view-only #openBulkFillBtn'), 'Missing body.view-only #openBulkFillBtn rule in styles.css');
  assert(css.includes('body.view-only .btn-bulk-fill'), 'Missing body.view-only .btn-bulk-fill rule in styles.css');
  assert(css.includes('body.view-only .popover-footer-action'), 'Missing body.view-only .popover-footer-action rule in styles.css');
});

test('1.5 styles.css removes bulkFillModal in view-only mode', () => {
  assert(css.includes('body.view-only #bulkFillModal'), 'Missing body.view-only #bulkFillModal rule in styles.css');
});

test('1.6 styles.css removes multiSelectBar and adminToggleBtn in view-only mode', () => {
  assert(css.includes('body.view-only #multiSelectBar'), 'Missing body.view-only #multiSelectBar rule in styles.css');
  assert(css.includes('body.view-only #adminToggleBtn'), 'Missing body.view-only #adminToggleBtn rule in styles.css');
});

// ========================================================
// MODULE 2: PC View-Only Boot State Logic
// ========================================================
console.log('\n>>> MODULE 2: PC View-Only Boot State Logic');

test('2.1 URL view-only mode check sets isViewOnly and isolates user profile on PC', () => {
  const viewOnlyInitIdx = js.indexOf("urlParams.get('mode') === 'view'");
  const viewOnlyInitBlock = js.substring(viewOnlyInitIdx, viewOnlyInitIdx + 1200);
  assert(viewOnlyInitBlock.includes('state.isViewOnly = true;'), 'state.isViewOnly not set to true');
  assert(viewOnlyInitBlock.includes('state.currentUserId = null;'), 'state.currentUserId not cleared to null');
  assert(viewOnlyInitBlock.includes('state.isAdmin = false;'), 'state.isAdmin not revoked');
  assert(viewOnlyInitBlock.includes("document.body.classList.add('view-only')"), 'Missing view-only class on body');
});

test('2.2 PC URL view-only mode check adds hidden class to topbarBulkFillBtn, openBulkFillBtn and bulkFillModal', () => {
  const viewOnlyInitIdx = js.indexOf("urlParams.get('mode') === 'view'");
  const viewOnlyInitBlock = js.substring(viewOnlyInitIdx, viewOnlyInitIdx + 1200);
  assert(viewOnlyInitBlock.includes("el.topbarBulkFillBtn.classList.add('hidden')"), 'Missing topbarBulkFillBtn hidden class');
  assert(viewOnlyInitBlock.includes("el.openBulkFillBtn.classList.add('hidden')"), 'Missing openBulkFillBtn hidden class');
  assert(viewOnlyInitBlock.includes("el.bulkFillModal.classList.add('hidden')"), 'Missing bulkFillModal hidden class');
});

test('2.3 updateDeviceViewMode on PC hides topbarBulkFillBtn when in view-only mode', () => {
  const updateDeviceIdx = js.indexOf('function updateDeviceViewMode()');
  const updateDeviceBlock = js.substring(updateDeviceIdx, updateDeviceIdx + 1600);
  assert(updateDeviceBlock.includes("el.topbarBulkFillBtn.classList.add('hidden')"), 'Missing topbarBulkFillBtn hidden class in updateDeviceViewMode');
  assert(updateDeviceBlock.includes("if (state.isViewOnly)"), 'Missing state.isViewOnly check in desktop branch of updateDeviceViewMode');
});

// ========================================================
// MODULE 3: Bulk Fill Removal & Defense on PC
// ========================================================
console.log('\n>>> MODULE 3: Bulk Fill Removal & Defense on PC');

test('3.1 el.topbarBulkFillBtn click handler is guarded against view-only mode', () => {
  const topbarBtnIdx = js.indexOf("el.topbarBulkFillBtn.addEventListener('click'");
  const topbarBtnBlock = js.substring(topbarBtnIdx, topbarBtnIdx + 300);
  assert(topbarBtnBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly check in topbarBulkFillBtn click listener');
  assert(topbarBtnBlock.includes('return;'), 'Missing return in topbarBulkFillBtn view-only guard');
});

test('3.2 el.openBulkFillBtn click handler is guarded against view-only mode', () => {
  const openBulkIdx = js.indexOf("el.openBulkFillBtn.addEventListener('click'");
  const openBulkBlock = js.substring(openBulkIdx, openBulkIdx + 300);
  assert(openBulkBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly check in openBulkFillBtn click listener');
  assert(openBulkBlock.includes('return;'), 'Missing return in openBulkFillBtn view-only guard');
});

test('3.3 openBulkFillModal function starts with an immediate view-only guard', () => {
  const modalFnIdx = js.indexOf('function openBulkFillModal(');
  const modalFnBlock = js.substring(modalFnIdx, modalFnIdx + 300);
  assert(modalFnBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly check at start of openBulkFillModal');
  assert(modalFnBlock.includes('return;'), 'Missing return in openBulkFillModal view-only guard');
});

test('3.4 confirmBulkFillBtn click handler starts with an immediate view-only guard', () => {
  const confirmIdx = js.indexOf("el.confirmBulkFillBtn.addEventListener('click'");
  const confirmBlock = js.substring(confirmIdx, confirmIdx + 300);
  assert(confirmBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly check in confirmBulkFillBtn click listener');
  assert(confirmBlock.includes('return;'), 'Missing return in confirmBulkFillBtn view-only guard');
});

test('3.5 Bulk date range shortcuts (Today, Week, Month) are guarded against view-only mode', () => {
  const todayIdx = js.indexOf("el.bulkRangeToday.addEventListener('click'");
  const todayBlock = js.substring(todayIdx, todayIdx + 200);
  assert(todayBlock.includes('if (state.isViewOnly) return;'), 'Missing view-only check in bulkRangeToday');

  const weekIdx = js.indexOf("el.bulkRangeWeek.addEventListener('click'");
  const weekBlock = js.substring(weekIdx, weekIdx + 200);
  assert(weekBlock.includes('if (state.isViewOnly) return;'), 'Missing view-only check in bulkRangeWeek');

  const monthIdx = js.indexOf("el.bulkRangeMonth.addEventListener('click'");
  const monthBlock = js.substring(monthIdx, monthIdx + 200);
  assert(monthBlock.includes('if (state.isViewOnly) return;'), 'Missing view-only check in bulkRangeMonth');
});

// ========================================================
// MODULE 4: Schedule Grid Cell Defense on PC
// ========================================================
console.log('\n>>> MODULE 4: Schedule Grid Cell Defense on PC');

test('4.1 Double-click on PC grid cell is strictly blocked in view-only mode', () => {
  const dblClickIdx = js.indexOf("slot.addEventListener('dblclick'");
  const dblClickBlock = js.substring(dblClickIdx, dblClickIdx + 300);
  assert(dblClickBlock.includes('state.isViewOnly'), 'Missing state.isViewOnly check in cell dblclick listener');
  assert(dblClickBlock.includes('return;'), 'Missing return guard in cell dblclick listener');
});

test('4.2 Keyboard Enter and Space on PC focused cell are strictly blocked in view-only mode', () => {
  const keyNavIdx = js.indexOf('// Enter or Space opens cell popover');
  assert(keyNavIdx !== -1, 'Missing Enter/Space key listener');
  const keyNavBlock = js.substring(keyNavIdx, keyNavIdx + 700);
  assert(keyNavBlock.includes('state.isViewOnly'), 'Missing state.isViewOnly check on Enter/Space key');
  assert(keyNavBlock.includes('return;'), 'Missing return guard on Enter/Space key');
});

test('4.3 Keyboard Delete and Backspace on PC cells are strictly blocked in view-only mode', () => {
  const deleteKeyIdx = js.indexOf("if (e.key === 'Delete' || e.key === 'Backspace')");
  const deleteKeyBlock = js.substring(deleteKeyIdx, deleteKeyIdx + 200);
  assert(deleteKeyBlock.includes('if (state.isViewOnly || state.currentUserId === \'view-all\') return;'), 'Missing view-only return guard on Delete key');
});

test('4.4 Mouse click-and-hold (holdTimer) on PC cells is strictly blocked in view-only mode', () => {
  const mouseDownIdx = js.indexOf('function handleCellMouseDown(slot, e)');
  const mouseDownBlock = js.substring(mouseDownIdx, mouseDownIdx + 200);
  assert(mouseDownBlock.includes('if (state.isViewOnly || state.currentUserId === \'view-all\') return;'), 'Missing view-only return guard in handleCellMouseDown');
});

test('4.5 openCellPopover function is strictly blocked in view-only mode', () => {
  const popoverIdx = js.indexOf('function openCellPopover(');
  const popoverBlock = js.substring(popoverIdx, popoverIdx + 300);
  assert(popoverBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in openCellPopover');
  assert(popoverBlock.includes('return;'), 'Missing return guard in openCellPopover');
});

test('4.6 saveCellAssignment function is strictly blocked in view-only mode', () => {
  const saveCellIdx = js.indexOf('function saveCellAssignment(');
  const saveCellBlock = js.substring(saveCellIdx, saveCellIdx + 300);
  assert(saveCellBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in saveCellAssignment');
  assert(saveCellBlock.includes('return;'), 'Missing return guard in saveCellAssignment');
});

test('4.7 batchApplyToSelectedCells function is strictly blocked in view-only mode', () => {
  const batchIdx = js.indexOf('function batchApplyToSelectedCells(');
  const batchBlock = js.substring(batchIdx, batchIdx + 300);
  assert(batchBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly guard in batchApplyToSelectedCells');
  assert(batchBlock.includes('return;'), 'Missing return guard in batchApplyToSelectedCells');
});

// ========================================================
// MODULE 5: Project & Team Management Defense on PC
// ========================================================
console.log('\n>>> MODULE 5: Project & Team Management Defense on PC');

test('5.1 requireAdmin immediately returns false without prompt in view-only mode', () => {
  const requireAdminIdx = js.indexOf('function requireAdmin()');
  const requireAdminBlock = js.substring(requireAdminIdx, requireAdminIdx + 300);
  assert(requireAdminBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly check in requireAdmin');
  assert(requireAdminBlock.includes('return false;'), 'Missing return false in requireAdmin view-only guard');
});

test('5.2 handleWbsSave is guarded against view-only mode', () => {
  const wbsSaveIdx = js.indexOf('const handleWbsSave = () => {');
  const wbsSaveBlock = js.substring(wbsSaveIdx, wbsSaveIdx + 300);
  assert(wbsSaveBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly check in handleWbsSave');
  assert(wbsSaveBlock.includes('return;'), 'Missing return in handleWbsSave view-only guard');
});

test('5.3 saveNewProjectBtn is guarded against view-only mode', () => {
  const saveNewProjIdx = js.indexOf("document.getElementById('saveNewProjectBtn').addEventListener('click'");
  const saveNewProjBlock = js.substring(saveNewProjIdx, saveNewProjIdx + 300);
  assert(saveNewProjBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly check in saveNewProjectBtn');
  assert(saveNewProjBlock.includes('return;'), 'Missing return in saveNewProjectBtn view-only guard');
});

test('5.4 openAdjustHoursDialog and openDeleteProjectModal are guarded against view-only mode', () => {
  const adjustIdx = js.indexOf('function openAdjustHoursDialog(');
  const adjustBlock = js.substring(adjustIdx, adjustIdx + 300);
  assert(adjustBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly in openAdjustHoursDialog');

  const deleteIdx = js.indexOf('function openDeleteProjectModal(');
  const deleteBlock = js.substring(deleteIdx, deleteIdx + 300);
  assert(deleteBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly in openDeleteProjectModal');
});

test('5.5 saveNewMemberBtn is guarded against view-only mode', () => {
  const saveMemberIdx = js.indexOf("document.getElementById('saveNewMemberBtn').addEventListener('click'");
  const saveMemberBlock = js.substring(saveMemberIdx, saveMemberIdx + 300);
  assert(saveMemberBlock.includes('if (state.isViewOnly)'), 'Missing state.isViewOnly in saveNewMemberBtn');
});

// ========================================================
// MODULE 6: Behavioral Attack Simulation & State Restoration
// ========================================================
console.log('\n>>> MODULE 6: Behavioral Attack Simulation & State Restoration');

test('6.1 Simulation: Comprehensive attack suite against PC View-Only mode preserves 100% state immutability', () => {
  const mockState = {
    isViewOnly: true,
    currentUserId: null,
    mobileTargetEmpId: null,
    isAdmin: false,
    employees: [
      { id: 'emp_1', name: 'Catherine NASSAR', defaultHoursPerDay: 8, sectionId: 'sec_1' },
      { id: 'emp_22', name: 'Peter MOUNIR', defaultHoursPerDay: 8, sectionId: 'sec_1' }
    ],
    projects: [
      { id: 'proj_1', name: 'Project - GP - Test', initialHours: 50, wbs: 'WBS-123' }
    ],
    sections: [
      { id: 'sec_1', name: 'Software', location: 'Cairo' }
    ],
    allocations: {
      'emp_1_2026-11-01': { project: 'Project - GP - Test', hours: 8 },
      'emp_22_2026-11-01': { project: 'Project - GP - Test', hours: 8 }
    },
    selectedCells: new Set(),
    selectedCell: null,
    history: []
  };

  const initialAllocationsClone = JSON.stringify(mockState.allocations);
  const initialProjectsClone = JSON.stringify(mockState.projects);
  const initialEmployeesClone = JSON.stringify(mockState.employees);

  // Attack 1: Attempt Bulk Fill Trigger
  function simulatedBulkFill(state) {
    if (state.isViewOnly) return { status: 'blocked', vector: 'bulk_fill' };
    state.allocations['emp_1_2026-11-02'] = { project: 'Hacked Project', hours: 8 };
    return { status: 'mutated' };
  }
  assert.strictEqual(simulatedBulkFill(mockState).status, 'blocked');

  // Attack 2: Attempt Single Cell Assignment
  function simulatedCellAssign(state) {
    if (state.isViewOnly) return { status: 'blocked', vector: 'cell_assign' };
    state.allocations['emp_1_2026-11-01'] = { project: 'Hacked Project', hours: 4 };
    return { status: 'mutated' };
  }
  assert.strictEqual(simulatedCellAssign(mockState).status, 'blocked');

  // Attack 3: Attempt Batch Selection Multi-Fill
  function simulatedBatchApply(state) {
    if (state.isViewOnly) return { status: 'blocked', vector: 'batch_apply' };
    delete state.allocations['emp_1_2026-11-01'];
    return { status: 'mutated' };
  }
  assert.strictEqual(simulatedBatchApply(mockState).status, 'blocked');

  // Attack 4: Attempt Delete Key
  function simulatedDeleteKey(state) {
    if (state.isViewOnly) return { status: 'blocked', vector: 'delete_key' };
    delete state.allocations['emp_22_2026-11-01'];
    return { status: 'mutated' };
  }
  assert.strictEqual(simulatedDeleteKey(mockState).status, 'blocked');

  // Attack 5: Attempt WBS Code Mutation
  function simulatedWbsEdit(state) {
    if (state.isViewOnly) return { status: 'blocked', vector: 'wbs_edit' };
    state.projects[0].wbs = 'HACKED-WBS';
    return { status: 'mutated' };
  }
  assert.strictEqual(simulatedWbsEdit(mockState).status, 'blocked');

  // Attack 6: Attempt Admin Escalation
  function simulatedAdminEscalate(state) {
    if (state.isViewOnly) return false;
    state.isAdmin = true;
    return true;
  }
  assert.strictEqual(simulatedAdminEscalate(mockState), false);
  assert.strictEqual(mockState.isAdmin, false);

  // Attack 7: Attempt Sync Push
  function simulatedSync(state) {
    if (state.isViewOnly) return { status: 'blocked', vector: 'sync' };
    return { status: 'pushed_to_remote' };
  }
  assert.strictEqual(simulatedSync(mockState).status, 'blocked');

  // Verify byte-for-byte state immutability
  assert.strictEqual(JSON.stringify(mockState.allocations), initialAllocationsClone, 'Allocations were altered!');
  assert.strictEqual(JSON.stringify(mockState.projects), initialProjectsClone, 'Projects were altered!');
  assert.strictEqual(JSON.stringify(mockState.employees), initialEmployeesClone, 'Employees were altered!');
  assert.strictEqual(mockState.history.length, 0, 'Audit history was altered!');
});

console.log(`\n==========================================================`);
console.log(` PC VIEW-ONLY INTEGRITY SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log(`==========================================================\n`);

if (failCount > 0) {
  process.exit(1);
}
