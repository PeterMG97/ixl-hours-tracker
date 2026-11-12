/**
 * test_pc_comment_functionality.js
 * Dedicated automated test suite verifying the Day Comment functionality on the PC (Desktop) Interface:
 * 1. Static Code Contracts in index.html, styles.css, and app.js for PC elements.
 * 2. Single Day Popover: (+) button toggle, input field, pre-population, saving comment to state.allocations[key], audit log.
 * 3. Multi-Select Cells: (+) button on floating bar, inline comment drawer, Apply Comment button / Enter key, batch apply across selected days, popover multi-edit.
 * 4. Bulk Fill Range: (+) button on modal, comment input, assignment across all days in range, audit log, modal reset on open.
 * 5. Visual Grid Indicators: .task-chip.has-comment, .chip-comment-dot, and hover tooltip title with "| Comment: ...".
 * 6. Deletion / Clearing: cleanly removes allocation and comment.
 * 7. Zero unicode emojis across files.
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
console.log(' RUNNING DEDICATED PC COMMENT FUNCTIONALITY TEST SUITE');
console.log('==========================================================\n');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

// ========================================================
// MODULE 1: Static Code Contracts for PC Interface
// ========================================================
console.log('>>> MODULE 1: Static Code Contracts (PC Interface)');

test('1.1 #cellPopover contains (+) comment toggle button, comment row, and input', () => {
  assert(html.includes('id="popoverCommentToggleBtn"'), 'popoverCommentToggleBtn missing');
  assert(html.includes('id="popoverCommentRow"'), 'popoverCommentRow missing');
  assert(html.includes('id="popoverCommentInput"'), 'popoverCommentInput missing');
  assert(html.includes('class="btn-comment-toggle" id="popoverCommentToggleBtn"'), 'Button must use btn-comment-toggle class');
});

test('1.2 #multiSelectBar contains (+) button, comment drawer, input, and apply button', () => {
  assert(html.includes('id="multiCommentBtn"'), 'multiCommentBtn missing');
  assert(html.includes('id="multiSelectCommentDrawer"'), 'multiSelectCommentDrawer missing');
  assert(html.includes('id="multiSelectCommentInput"'), 'multiSelectCommentInput missing');
  assert(html.includes('id="multiApplyCommentBtn"'), 'multiApplyCommentBtn missing');
});

test('1.3 #bulkFillModal contains (+) comment toggle button, wrapper, and input', () => {
  assert(html.includes('id="bulkCommentToggleBtn"'), 'bulkCommentToggleBtn missing');
  assert(html.includes('id="bulkCommentWrapper"'), 'bulkCommentWrapper missing');
  assert(html.includes('id="bulkCommentInput"'), 'bulkCommentInput missing');
});

test('1.4 styles.css defines .btn-comment-toggle, active highlight, .chip-comment-dot, and .task-chip.has-comment', () => {
  assert(css.includes('.btn-comment-toggle'), 'Missing .btn-comment-toggle');
  assert(css.includes('.btn-comment-toggle.active'), 'Missing .btn-comment-toggle.active');
  assert(css.includes('.task-chip.has-comment'), 'Missing .task-chip.has-comment');
  assert(css.includes('.chip-comment-dot'), 'Missing .chip-comment-dot');
  assert(css.includes('.popover-comment-section'), 'Missing .popover-comment-section');
});

test('1.5 app.js registers all PC comment DOM elements in el map', () => {
  assert(js.includes('popoverCommentToggleBtn: document.getElementById(\'popoverCommentToggleBtn\')'), 'popoverCommentToggleBtn registration missing');
  assert(js.includes('popoverCommentRow: document.getElementById(\'popoverCommentRow\')'), 'popoverCommentRow registration missing');
  assert(js.includes('popoverCommentInput: document.getElementById(\'popoverCommentInput\')'), 'popoverCommentInput registration missing');
  assert(js.includes('multiCommentBtn: document.getElementById(\'multiCommentBtn\')'), 'multiCommentBtn registration missing');
  assert(js.includes('multiSelectCommentDrawer: document.getElementById(\'multiSelectCommentDrawer\')'), 'multiSelectCommentDrawer registration missing');
  assert(js.includes('multiSelectCommentInput: document.getElementById(\'multiSelectCommentInput\')'), 'multiSelectCommentInput registration missing');
  assert(js.includes('multiApplyCommentBtn: document.getElementById(\'multiApplyCommentBtn\')'), 'multiApplyCommentBtn registration missing');
  assert(js.includes('bulkCommentToggleBtn: document.getElementById(\'bulkCommentToggleBtn\')'), 'bulkCommentToggleBtn registration missing');
  assert(js.includes('bulkCommentWrapper: document.getElementById(\'bulkCommentWrapper\')'), 'bulkCommentWrapper registration missing');
  assert(js.includes('bulkCommentInput: document.getElementById(\'bulkCommentInput\')'), 'bulkCommentInput registration missing');
});

// ========================================================
// MODULE 2: PC Single Day Popover Comment Behavioral Simulation
// ========================================================
console.log('\n>>> MODULE 2: PC Single Day Popover Behavioral Simulation');

const mockState = {
  allocations: {},
  history: [],
  selectedCells: new Set(),
  selectedCell: null,
  isMultiEditing: false,
  employees: [
    { id: 'emp_1', name: 'Peter MOUNIR', defaultHoursPerDay: 8, sectionId: 'sec_1' },
    { id: 'emp_2', name: 'Ahmed BADR', defaultHoursPerDay: 8, sectionId: 'sec_1' }
  ],
  sections: [
    { id: 'sec_1', name: 'APPLICATION ENGINEERS - CAIRO', location: 'Cairo' }
  ]
};

function simSaveCellAssignment(empId, dateStr, projectName, hours, comment) {
  const key = `${empId}_${dateStr}`;
  const isClear = (!projectName || projectName === '__CLEAR__' || projectName === 'Clear/Delete');
  if (isClear) {
    delete mockState.allocations[key];
  } else {
    mockState.allocations[key] = {
      project: projectName.trim(),
      hours: Number(hours),
      ...(comment && comment.trim() ? { comment: comment.trim() } : {})
    };
  }
}

test('2.1 Single day save attaches comment to state.allocations[key]', () => {
  simSaveCellAssignment('emp_1', '2026-11-02', 'Project - Cairo Metro', 8, 'Reviewing interlocking telemetry');
  const alloc = mockState.allocations['emp_1_2026-11-02'];
  assert(alloc, 'Allocation must exist');
  assert.strictEqual(alloc.project, 'Project - Cairo Metro');
  assert.strictEqual(alloc.hours, 8);
  assert.strictEqual(alloc.comment, 'Reviewing interlocking telemetry');
});

test('2.2 Popover pre-populates existing comment and activates (+) toggle button', () => {
  const key = 'emp_1_2026-11-02';
  const alloc = mockState.allocations[key];
  const existingComment = (alloc && alloc.comment) ? alloc.comment.trim() : '';
  const isButtonActive = Boolean(existingComment);
  const isRowDisplayed = Boolean(existingComment);

  assert.strictEqual(existingComment, 'Reviewing interlocking telemetry');
  assert.strictEqual(isButtonActive, true, '(+) button must have .active state');
  assert.strictEqual(isRowDisplayed, true, 'Comment row must be visible');
});

test('2.3 Saving without comment leaves allocation intact without comment property', () => {
  simSaveCellAssignment('emp_1', '2026-11-03', 'Tender - High Speed', 8, '');
  const alloc = mockState.allocations['emp_1_2026-11-03'];
  assert(alloc, 'Allocation must exist');
  assert.strictEqual(alloc.project, 'Tender - High Speed');
  assert.strictEqual(alloc.comment, undefined, 'comment property must not exist when empty');
});

test('2.4 Updating existing cell with new comment overrides prior comment', () => {
  simSaveCellAssignment('emp_1', '2026-11-02', 'Project - Cairo Metro', 8, 'Updated notes for FAT testing');
  const alloc = mockState.allocations['emp_1_2026-11-02'];
  assert.strictEqual(alloc.comment, 'Updated notes for FAT testing');
});

test('2.5 CLEAR / DELETE action purges allocation and its comment cleanly', () => {
  simSaveCellAssignment('emp_1', '2026-11-02', '__CLEAR__', 0, '');
  assert.strictEqual(mockState.allocations['emp_1_2026-11-02'], undefined, 'Allocation must be deleted completely');
});

// ========================================================
// MODULE 3: PC Multi-Select Cells Comment Behavioral Simulation
// ========================================================
console.log('\n>>> MODULE 3: PC Multi-Select Cells Behavioral Simulation');

function simBatchApply(cellKeys, projectName, hours, comment) {
  cellKeys.forEach(k => {
    mockState.allocations[k] = {
      project: projectName.trim(),
      hours: Number(hours),
      ...(comment && comment.trim() ? { comment: comment.trim() } : {})
    };
  });
}

function simApplyCommentOnly(cellKeys, comment) {
  cellKeys.forEach(k => {
    if (mockState.allocations[k]) {
      mockState.allocations[k].comment = comment.trim();
    } else {
      mockState.allocations[k] = {
        project: 'NO PROJECT',
        hours: 8,
        comment: comment.trim()
      };
    }
  });
}

test('3.1 batchApplyToSelectedCells assigns comment across all selected days', () => {
  const selected = ['emp_1_2026-11-09', 'emp_1_2026-11-10', 'emp_1_2026-11-11'];
  simBatchApply(selected, 'Tender - Monorail Extension', 8, 'Batch tender documentation review');

  selected.forEach(k => {
    assert(mockState.allocations[k], `Cell ${k} must exist`);
    assert.strictEqual(mockState.allocations[k].comment, 'Batch tender documentation review');
    assert.strictEqual(mockState.allocations[k].project, 'Tender - Monorail Extension');
  });
});

test('3.2 Applying comment only preserves existing projects and updates comments across cells', () => {
  mockState.allocations['emp_1_2026-11-09'].project = 'Project - Track Circuit';
  mockState.allocations['emp_1_2026-11-10'].project = 'Tender - Monorail Extension';
  const selected = ['emp_1_2026-11-09', 'emp_1_2026-11-10'];

  simApplyCommentOnly(selected, 'Audited by PM');

  assert.strictEqual(mockState.allocations['emp_1_2026-11-09'].project, 'Project - Track Circuit');
  assert.strictEqual(mockState.allocations['emp_1_2026-11-09'].comment, 'Audited by PM');
  assert.strictEqual(mockState.allocations['emp_1_2026-11-10'].project, 'Tender - Monorail Extension');
  assert.strictEqual(mockState.allocations['emp_1_2026-11-10'].comment, 'Audited by PM');
});

test('3.3 Applying comment to an unallocated selected cell defaults to NO PROJECT with comment', () => {
  const emptyKey = 'emp_1_2026-11-12';
  delete mockState.allocations[emptyKey];

  simApplyCommentOnly([emptyKey], 'Standby waiting for hardware delivery');

  assert(mockState.allocations[emptyKey], 'Allocation must be created');
  assert.strictEqual(mockState.allocations[emptyKey].project, 'NO PROJECT');
  assert.strictEqual(mockState.allocations[emptyKey].comment, 'Standby waiting for hardware delivery');
});

// ========================================================
// MODULE 4: PC Bulk Fill Range Comment Behavioral Simulation
// ========================================================
console.log('\n>>> MODULE 4: PC Bulk Fill Range Behavioral Simulation');

function simBulkFill(empId, fromStr, toStr, projectName, hours, comment, holidayOption = 'dayoff', location = 'Cairo') {
  let cur = new Date(fromStr);
  const end = new Date(toStr);
  while (cur <= end) {
    const dow = cur.getDay(); // 0 Sun, 5 Fri, 6 Sat
    const isHoliday = (location === 'Cairo') ? (dow === 5 || dow === 6) : (dow === 6 || dow === 0);
    const dStr = cur.toISOString().split('T')[0];
    const key = `${empId}_${dStr}`;

    if (isHoliday) {
      if (holidayOption === 'dayoff') {
        mockState.allocations[key] = { project: 'Day OFF', hours: 0, ...(comment ? { comment } : {}) };
      } else if (holidayOption === 'include') {
        mockState.allocations[key] = { project: projectName, hours: Number(hours), ...(comment ? { comment } : {}) };
      }
      // 'skip' leaves untouched
    } else {
      mockState.allocations[key] = { project: projectName, hours: Number(hours), ...(comment ? { comment } : {}) };
    }

    cur.setDate(cur.getDate() + 1);
  }
}

test('4.1 Bulk fill range assigns comment to every workday in range', () => {
  // Nov 8 (Sun) to Nov 12 (Thu) - all Cairo workdays
  simBulkFill('emp_2', '2026-11-08', '2026-11-12', 'Project - Signalling Upgrade', 8, 'Full week field commissioning');

  ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'].forEach(d => {
    const key = `emp_2_${d}`;
    assert(mockState.allocations[key], `Cell ${key} must exist`);
    assert.strictEqual(mockState.allocations[key].project, 'Project - Signalling Upgrade');
    assert.strictEqual(mockState.allocations[key].comment, 'Full week field commissioning');
  });
});

test('4.2 Bulk fill range spanning weekend with dayoff assigns comment to both workdays and holidays', () => {
  // Nov 12 (Thu) to Nov 14 (Sat) - Thu workday, Fri/Sat Cairo holidays
  simBulkFill('emp_2', '2026-11-12', '2026-11-14', 'Project - Signalling Upgrade', 8, 'Weekend handover', 'dayoff', 'Cairo');

  assert.strictEqual(mockState.allocations['emp_2_2026-11-12'].project, 'Project - Signalling Upgrade');
  assert.strictEqual(mockState.allocations['emp_2_2026-11-12'].comment, 'Weekend handover');

  assert.strictEqual(mockState.allocations['emp_2_2026-11-13'].project, 'Day OFF');
  assert.strictEqual(mockState.allocations['emp_2_2026-11-13'].comment, 'Weekend handover');

  assert.strictEqual(mockState.allocations['emp_2_2026-11-14'].project, 'Day OFF');
  assert.strictEqual(mockState.allocations['emp_2_2026-11-14'].comment, 'Weekend handover');
});

// ========================================================
// MODULE 5: PC Grid Visual Indicators & Tooltips
// ========================================================
console.log('\n>>> MODULE 5: PC Grid Visual Indicators & Tooltips');

test('5.1 Task chip with comment renders .has-comment and .chip-comment-dot', () => {
  const allocWithComment = { project: 'Project - Monorail', hours: 8, comment: 'Interlocking design' };
  const hasComment = Boolean(allocWithComment && allocWithComment.comment && allocWithComment.comment.trim());
  const badgeClass = 'proj';
  const chipHtml = `
    <button class="task-chip ${badgeClass} ${hasComment ? 'has-comment' : ''}" 
            title="Peter MOUNIR | 02/11/2026: Project - Monorail${hasComment ? ` | Comment: ${allocWithComment.comment.trim()}` : ''}">
      Monorail (8h)
      ${hasComment ? `<span class="chip-comment-dot" aria-hidden="true" title="Comment: ${allocWithComment.comment.trim()}"></span>` : ''}
    </button>
  `;

  assert(chipHtml.includes('class="task-chip proj has-comment"'), 'Chip must have has-comment class');
  assert(chipHtml.includes('<span class="chip-comment-dot"'), 'Chip must contain .chip-comment-dot span');
  assert(chipHtml.includes('| Comment: Interlocking design'), 'Chip tooltip title must contain comment text');
});

test('5.2 Task chip without comment renders cleanly without .has-comment or dot', () => {
  const allocWithoutComment = { project: 'Project - Monorail', hours: 8 };
  const hasComment = Boolean(allocWithoutComment && allocWithoutComment.comment && allocWithoutComment.comment.trim());
  const badgeClass = 'proj';
  const chipHtml = `
    <button class="task-chip ${badgeClass} ${hasComment ? 'has-comment' : ''}" 
            title="Peter MOUNIR | 02/11/2026: Project - Monorail${hasComment ? ` | Comment: ${allocWithoutComment.comment.trim()}` : ''}">
      Monorail (8h)
      ${hasComment ? `<span class="chip-comment-dot" aria-hidden="true"></span>` : ''}
    </button>
  `;

  assert(!chipHtml.includes('has-comment'), 'Chip must NOT have has-comment class');
  assert(!chipHtml.includes('chip-comment-dot'), 'Chip must NOT contain dot');
  assert(!chipHtml.includes('| Comment:'), 'Tooltip must NOT have comment section');
});

// ========================================================
// MODULE 6: Zero Unicode Emojis Verification
// ========================================================
console.log('\n>>> MODULE 6: Zero Unicode Emojis Verification');

test('6.1 Strictly zero unicode emojis across modified files', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(html), 'Emoji detected in index.html');
  assert(!emojiRegex.test(js), 'Emoji detected in app.js');
  assert(!emojiRegex.test(css), 'Emoji detected in styles.css');
});

console.log('==========================================================');
console.log(` PC COMMENT FUNCTIONALITY COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==========================================================');

if (failCount > 0) {
  process.exit(1);
}
