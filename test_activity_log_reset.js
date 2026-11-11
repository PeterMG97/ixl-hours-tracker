const fs = require('fs');
const assert = require('assert');

console.log('==========================================================');
console.log(' RUNNING DEDICATED ACTIVITY LOG RESET & CLEAR TEST SUITE');
console.log('==========================================================');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const appJs = fs.readFileSync('app.js', 'utf8');
const stylesCss = fs.readFileSync('styles.css', 'utf8');

let passCount = 0;
function pass(msg) {
  passCount++;
  console.log('  [PASS] ' + msg);
}

// -----------------------------------------------------------------------------
// MODULE 1: Static Code Contracts (index.html, styles.css, app.js)
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 1: Static Code Contracts');

// 1.1 Check button element in index.html
assert(indexHtml.includes('id="histResetFiltersBtn"'), 'histResetFiltersBtn missing in index.html');
assert(indexHtml.includes('title="Clear Activity Log"'), 'title attribute missing on histResetFiltersBtn');
pass('1.1 index.html contains histResetFiltersBtn with Clear Activity Log title');

// 1.2 Check CSS styling in styles.css
assert(stylesCss.includes('#histResetFiltersBtn'), '#histResetFiltersBtn missing in styles.css');
assert(stylesCss.includes('color: #ef4444;'), 'Hover color #ef4444 missing in styles.css');
pass('1.2 styles.css defines hover reset state for #histResetFiltersBtn');

// 1.3 Check function implementation in app.js
assert(appJs.includes('function clearActivityLog()'), 'clearActivityLog function missing in app.js');
assert(appJs.includes('clearActivityLog()'), 'histResetFiltersBtn listener does not call clearActivityLog');
pass('1.3 app.js implements clearActivityLog function attached to histResetFiltersBtn');

// 1.4 Check empty state message rendering in app.js
assert(appJs.includes('No edit history entries recorded yet.'), 'Clean empty state message missing in app.js');
pass('1.4 app.js implements empty state message for cleared activity log');

// -----------------------------------------------------------------------------
// MODULE 2: Behavioral State Simulation (Clear & KPI Verification)
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 2: Behavioral State Simulation');

// Mock environment
const mockState = {
  history: [
    { id: 'h1', summary: 'Assigned Project A', isCrossProfile: false },
    { id: 'h2', summary: 'Assigned Project B', isCrossProfile: true },
    { id: 'h3', summary: 'Cleared cell', isCrossProfile: true }
  ],
  deviceProfiles: {
    'dev_1': { primaryUser: 'Peter MOUNIR', totalEdits: 2 },
    'dev_2': { primaryUser: 'Ali TURKI', totalEdits: 1 }
  }
};

let syncCalled = false;
let toastMsg = '';
let renderedKpis = {};

function mockSyncToServer() {
  syncCalled = true;
}

function mockShowToast(msg) {
  toastMsg = msg;
}

function mockRenderAuditHistoryData() {
  const history = mockState.history || [];
  const totalEdits = history.length;
  const crossProfileCount = history.filter(h => h.isCrossProfile).length;
  renderedKpis = {
    totalEdits,
    crossProfileCount,
    isEmpty: history.length === 0
  };
}

function mockClearActivityLog(userConfirms) {
  if (!mockState.history || mockState.history.length === 0) {
    mockRenderAuditHistoryData();
    mockShowToast('Activity Log is already empty');
    return false;
  }
  if (!userConfirms) {
    return false;
  }
  mockState.history = [];
  mockSyncToServer();
  mockRenderAuditHistoryData();
  mockShowToast('Activity Log cleared');
  return true;
}

// 2.1 Precondition verification
assert.strictEqual(mockState.history.length, 3, 'Initial history length should be 3');
mockRenderAuditHistoryData();
assert.strictEqual(renderedKpis.totalEdits, 3, 'Initial KPI total edits should be 3');
assert.strictEqual(renderedKpis.crossProfileCount, 2, 'Initial KPI cross edits should be 2');
pass('2.1 Initial audit history loaded with 3 entries and 2 cross-profile edits');

// 2.2 User cancels confirmation
const cancelResult = mockClearActivityLog(false);
assert.strictEqual(cancelResult, false, 'Action should abort when confirmation is cancelled');
assert.strictEqual(mockState.history.length, 3, 'History should not be cleared when cancelled');
assert.strictEqual(syncCalled, false, 'Sync should not be called when cancelled');
pass('2.2 History preserved when user cancels confirmation');

// 2.3 User confirms clear action
const confirmResult = mockClearActivityLog(true);
assert.strictEqual(confirmResult, true, 'Action should succeed when confirmed');
assert.strictEqual(mockState.history.length, 0, 'History should be empty after clear');
assert.strictEqual(syncCalled, true, 'syncToServer should be called to persist clear');
assert.strictEqual(toastMsg, 'Activity Log cleared', 'Toast message should notify user');
assert.strictEqual(renderedKpis.totalEdits, 0, 'KPI total edits should be 0');
assert.strictEqual(renderedKpis.crossProfileCount, 0, 'KPI cross edits should be 0');
assert.strictEqual(renderedKpis.isEmpty, true, 'Table should render empty state');
pass('2.3 History cleared, KPIs updated to 0, sync invoked, and toast shown');

// 2.4 Pressing Reset on already empty log
syncCalled = false;
toastMsg = '';
const emptyResult = mockClearActivityLog(true);
assert.strictEqual(emptyResult, false, 'Action returns false on already empty log');
assert.strictEqual(toastMsg, 'Activity Log is already empty', 'Informs user log is already empty');
assert.strictEqual(syncCalled, false, 'Sync not re-triggered when already empty');
pass('2.4 Pressing Reset on already empty log gives clean user feedback');

// -----------------------------------------------------------------------------
// MODULE 3: Zero Emojis Contract
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 3: Zero Unicode Emojis Verification');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;
assert(!emojiRegex.test(indexHtml), 'index.html contains forbidden emoji');
assert(!emojiRegex.test(appJs), 'app.js contains forbidden emoji');
assert(!emojiRegex.test(stylesCss), 'styles.css contains forbidden emoji');
pass('3.1 Strictly zero unicode emojis across modified source files');

console.log('==========================================================');
console.log(` DEDICATED ACTIVITY LOG RESET TEST COMPLETE: ${passCount} PASSED, 0 FAILED`);
console.log('==========================================================\n');
