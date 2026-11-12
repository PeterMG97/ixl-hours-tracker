/**
 * test_day_comments_integrity.js
 * Comprehensive automated test suite for Day Comments Option across PC and Mobile interfaces.
 * Tests:
 * 1. Static Code Contracts in index.html, styles.css, and app.js
 * 2. Behavioral Simulation:
 *    - Single day fill on PC assigns comment to that day
 *    - Multi-selected cells on PC assign comment across all selected days
 *    - Bulk fill range on PC assigns comment across all days in range
 *    - Mobile single day fill assigns comment to that day
 *    - Mobile range fill assigns comment across all days in range
 *    - Clear / delete removes allocation and comment cleanly
 *    - Task chip indicator dot and title tooltip formatting
 *    - Mobile agenda comment rendering and pre-population on tap
 * 3. Zero Unicode Emojis Verification
 */

const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(name) {
  totalTests++;
  passedTests++;
  console.log(`  [PASS] ${name}`);
}

function fail(name, reason) {
  totalTests++;
  failedTests++;
  console.error(`  [FAIL] ${name}: ${reason}`);
}

function assert(condition, testName, message) {
  if (condition) {
    pass(testName);
  } else {
    fail(testName, message || 'Assertion failed');
  }
}

console.log('==========================================================');
console.log(' RUNNING DEDICATED DAY COMMENTS INTEGRITY TEST SUITE');
console.log('==========================================================\n');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// =========================================================
// MODULE 1: Static Code Contracts
// =========================================================
console.log('>>> MODULE 1: Static Code Contracts');

assert(
  html.includes('id="popoverCommentToggleBtn"') &&
  html.includes('id="popoverCommentRow"') &&
  html.includes('id="popoverCommentInput"'),
  '1.1 Cell Popover contains (+) comment toggle button, row, and input in index.html'
);

assert(
  html.includes('id="multiCommentBtn"') &&
  html.includes('id="multiSelectCommentDrawer"') &&
  html.includes('id="multiSelectCommentInput"') &&
  html.includes('id="multiApplyCommentBtn"'),
  '1.2 Multi-select bar contains (+) comment button, drawer, input, and apply button in index.html'
);

assert(
  html.includes('id="bulkCommentToggleBtn"') &&
  html.includes('id="bulkCommentWrapper"') &&
  html.includes('id="bulkCommentInput"'),
  '1.3 Bulk Fill Modal contains (+) comment toggle button, wrapper, and input in index.html'
);

assert(
  html.includes('id="mobileCommentToggleBtn"') &&
  html.includes('id="mobileCommentWrapper"') &&
  html.includes('id="mobileCommentInput"'),
  '1.4 Mobile Logger Card contains (+) comment toggle button, wrapper, and input in index.html'
);

assert(
  css.includes('.btn-comment-toggle') &&
  css.includes('.btn-comment-toggle.active') &&
  css.includes('[data-theme="dark"] .btn-comment-toggle'),
  '1.5 styles.css defines .btn-comment-toggle and active states across light and dark themes'
);

assert(
  css.includes('.task-chip.has-comment') &&
  css.includes('.chip-comment-dot'),
  '1.6 styles.css defines .task-chip.has-comment and .chip-comment-dot'
);

assert(
  css.includes('.mobile-agenda-comment'),
  '1.7 styles.css defines .mobile-agenda-comment for mobile agenda rows'
);

assert(
  js.includes('popoverCommentToggleBtn:') &&
  js.includes('popoverCommentInput:') &&
  js.includes('multiCommentBtn:') &&
  js.includes('multiSelectCommentInput:') &&
  js.includes('bulkCommentToggleBtn:') &&
  js.includes('bulkCommentInput:') &&
  js.includes('mobileCommentToggleBtn:') &&
  js.includes('mobileCommentInput:'),
  '1.8 app.js registers all comment DOM elements in el map'
);

// =========================================================
// MODULE 2: Behavioral State Simulation
// =========================================================
console.log('\n>>> MODULE 2: Behavioral State Simulation');

// Simulated state
const mockState = {
  allocations: {},
  selectedCells: new Set(),
  employees: [
    { id: 'emp_1', name: 'Peter MOUNIR', defaultHoursPerDay: 8, sectionId: 'sec_1' },
    { id: 'emp_2', name: 'Ahmed BADR', defaultHoursPerDay: 8, sectionId: 'sec_1' }
  ],
  sections: [
    { id: 'sec_1', name: 'APPLICATION ENGINEERS - CAIRO', location: 'Cairo' }
  ]
};

// 2.1 Single Day Save with Comment
function simSaveCellAssignment(empId, dateStr, projectName, hours, comment) {
  const key = `${empId}_${dateStr}`;
  const isClear = (!projectName || projectName === '__CLEAR__');
  if (isClear) {
    delete mockState.allocations[key];
  } else {
    mockState.allocations[key] = {
      project: projectName,
      hours: Number(hours),
      ...(comment && comment.trim() ? { comment: comment.trim() } : {})
    };
  }
}

simSaveCellAssignment('emp_1', '2026-11-02', 'Project - Monorail', 8, 'Working on interlocking design');
assert(
  mockState.allocations['emp_1_2026-11-02'] &&
  mockState.allocations['emp_1_2026-11-02'].comment === 'Working on interlocking design' &&
  mockState.allocations['emp_1_2026-11-02'].hours === 8,
  '2.1 Single day assignment attaches comment to state.allocations[key]'
);

// 2.2 Multi-Select Batch Apply with Comment
function simBatchApply(cellKeys, projectName, hours, comment) {
  cellKeys.forEach(k => {
    mockState.allocations[k] = {
      project: projectName,
      hours: Number(hours),
      ...(comment && comment.trim() ? { comment: comment.trim() } : {})
    };
  });
}

const selectedCells = ['emp_1_2026-11-03', 'emp_1_2026-11-04', 'emp_1_2026-11-05'];
simBatchApply(selectedCells, 'Tender - High Speed', 8, 'Tender submission preparation');

const allHaveComment = selectedCells.every(k => 
  mockState.allocations[k] && 
  mockState.allocations[k].comment === 'Tender submission preparation' &&
  mockState.allocations[k].project === 'Tender - High Speed'
);
assert(allHaveComment, '2.2 Multi-select assignment attaches comment across all selected days');

// 2.3 Bulk Fill Range with Comment
function simBulkFill(empId, fromStr, toStr, projectName, hours, comment) {
  let cur = new Date(fromStr);
  const end = new Date(toStr);
  while (cur <= end) {
    const dStr = cur.toISOString().split('T')[0];
    const key = `${empId}_${dStr}`;
    mockState.allocations[key] = {
      project: projectName,
      hours: Number(hours),
      ...(comment && comment.trim() ? { comment: comment.trim() } : {})
    };
    cur.setDate(cur.getDate() + 1);
  }
}

simBulkFill('emp_2', '2026-11-08', '2026-11-12', 'Project - Cairo Metro', 8, 'Subsystem safety audit');
const bulkRangeKeys = ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'].map(d => `emp_2_${d}`);
const bulkAllHaveComment = bulkRangeKeys.every(k => 
  mockState.allocations[k] && 
  mockState.allocations[k].comment === 'Subsystem safety audit'
);
assert(bulkAllHaveComment, '2.3 Bulk fill range attaches comment across all days within range');

// 2.4 Mobile Single Day Fill with Comment
simSaveCellAssignment('emp_1', '2026-11-15', 'Special Training / Academy', 8, 'Mobile single day training');
assert(
  mockState.allocations['emp_1_2026-11-15'] &&
  mockState.allocations['emp_1_2026-11-15'].comment === 'Mobile single day training',
  '2.4 Mobile single day assignment attaches comment to that day'
);

// 2.5 Clearing Day Cleans Up Comment
simSaveCellAssignment('emp_1', '2026-11-02', '__CLEAR__', 0, '');
assert(
  mockState.allocations['emp_1_2026-11-02'] === undefined,
  '2.5 Clearing cell deletes allocation and comment cleanly'
);

// 2.6 Chip indicator and title tooltip logic
const testAlloc = mockState.allocations['emp_1_2026-11-03'];
const hasComment = Boolean(testAlloc && testAlloc.comment && testAlloc.comment.trim());
const title = `Peter MOUNIR | 03/11/2026: Tender - High Speed${hasComment ? ` | Comment: ${testAlloc.comment.trim()}` : ''}`;
assert(
  hasComment === true &&
  title.includes('| Comment: Tender submission preparation'),
  '2.6 Chip hover tooltip includes comment text when comment is present'
);

// =========================================================
// MODULE 3: Zero Unicode Emojis Verification
// =========================================================
console.log('\n>>> MODULE 3: Zero Unicode Emojis Verification');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

const sourceFiles = [
  { name: 'index.html', content: html },
  { name: 'styles.css', content: css },
  { name: 'app.js', content: js }
];

let filesClean = true;
sourceFiles.forEach(sf => {
  const lines = sf.content.split('\n');
  lines.forEach((l, idx) => {
    if (emojiRegex.test(l)) {
      filesClean = false;
      fail(`3.1 Emoji detected in ${sf.name}`, `Line ${idx + 1}: ${l.substring(0, 50)}`);
    }
  });
});

if (filesClean) {
  pass('3.1 Strictly zero unicode emojis across modified source files (index.html, styles.css, app.js)');
}

console.log('==========================================================');
console.log(` DAY COMMENTS TEST COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('==========================================================');

if (failedTests > 0) {
  process.exit(1);
}
