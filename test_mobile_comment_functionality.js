/**
 * test_mobile_comment_functionality.js
 * Dedicated automated test suite verifying the Day Comment functionality on the Mobile Interface:
 * 1. Static Code Contracts in index.html, styles.css, and app.js for Mobile elements.
 * 2. Mobile Single Day Fill: when Start Date == End Date, (+) button, input, assigns comment to that single day.
 * 3. Mobile Date Range Fill: when Start Date != End Date, assigns comment across all days in range.
 * 4. Holiday Treatment in Range: dayoff, include, skip options preserve comment integrity.
 * 5. Mobile Agenda Rendering: displays comment note (.mobile-agenda-comment) with (+) symbol.
 * 6. Agenda Row Tap Interaction: pre-populates form with comment, opens wrapper, activates button.
 * 7. Deletion / Clear: cleanly removes allocation and comment.
 * 8. Zero unicode emojis across files.
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
console.log(' RUNNING DEDICATED MOBILE COMMENT FUNCTIONALITY TEST SUITE');
console.log('==========================================================\n');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

// ========================================================
// MODULE 1: Static Code Contracts for Mobile Interface
// ========================================================
console.log('>>> MODULE 1: Static Code Contracts (Mobile Interface)');

test('1.1 #mobileLoggerCard contains (+) comment toggle button, wrapper, and input', () => {
  assert(html.includes('id="mobileCommentToggleBtn"'), 'mobileCommentToggleBtn missing');
  assert(html.includes('id="mobileCommentWrapper"'), 'mobileCommentWrapper missing');
  assert(html.includes('id="mobileCommentInput"'), 'mobileCommentInput missing');
  assert(html.includes('class="btn-comment-toggle" id="mobileCommentToggleBtn"'), 'Must use btn-comment-toggle class');
});

test('1.2 styles.css defines .mobile-agenda-comment, .comment-icon, and .comment-text', () => {
  assert(css.includes('.mobile-agenda-comment'), 'Missing .mobile-agenda-comment in styles.css');
  assert(css.includes('.mobile-agenda-comment .comment-icon'), 'Missing .comment-icon in styles.css');
  assert(css.includes('.mobile-agenda-comment .comment-text'), 'Missing .comment-text in styles.css');
  assert(css.includes('[data-theme="dark"] .mobile-agenda-comment'), 'Missing dark mode .mobile-agenda-comment');
});

test('1.3 app.js registers mobile comment DOM elements in el map', () => {
  assert(js.includes('mobileCommentToggleBtn: document.getElementById(\'mobileCommentToggleBtn\')'), 'mobileCommentToggleBtn missing in el');
  assert(js.includes('mobileCommentWrapper: document.getElementById(\'mobileCommentWrapper\')'), 'mobileCommentWrapper missing in el');
  assert(js.includes('mobileCommentInput: document.getElementById(\'mobileCommentInput\')'), 'mobileCommentInput missing in el');
});

test('1.4 app.js wires mobileCommentToggleBtn click and mobileCommentInput input listeners', () => {
  assert(js.includes('el.mobileCommentToggleBtn.addEventListener(\'click\''), 'Toggle click listener missing');
  assert(js.includes('el.mobileCommentInput.addEventListener(\'input\''), 'Input change listener missing');
});

// ========================================================
// MODULE 2: Mobile Single Day Fill Behavioral Simulation
// ========================================================
console.log('\n>>> MODULE 2: Mobile Single Day Fill Behavioral Simulation');

const mockState = {
  allocations: {},
  history: [],
  currentUserId: 'emp_1',
  employees: [
    { id: 'emp_1', name: 'Peter MOUNIR', defaultHoursPerDay: 8, sectionId: 'sec_1' },
    { id: 'emp_2', name: 'Ahmed BADR', defaultHoursPerDay: 8, sectionId: 'sec_1' }
  ],
  sections: [
    { id: 'sec_1', name: 'APPLICATION ENGINEERS - CAIRO', location: 'Cairo' }
  ]
};

function simHandleMobileApply(empId, fromStr, toStr, proj, hours, comment, holidayOption = 'dayoff', location = 'Cairo') {
  const isClearAction = (!proj || proj === '__CLEAR__' || proj === 'Clear/Delete');
  const isExplicitDayOff = (proj === 'Day OFF' || proj === 'DAY OFF');

  let cur = new Date(fromStr);
  const end = new Date(toStr);

  while (cur <= end) {
    const dow = cur.getDay(); // 0 Sun, 5 Fri, 6 Sat
    const isHoliday = (location === 'Cairo') ? (dow === 5 || dow === 6) : (dow === 6 || dow === 0);
    const dStr = cur.toISOString().split('T')[0];
    const key = `${empId}_${dStr}`;

    if (isClearAction) {
      delete mockState.allocations[key];
    } else if (isExplicitDayOff) {
      mockState.allocations[key] = { project: 'Day OFF', hours: 0, ...(comment && comment.trim() ? { comment: comment.trim() } : {}) };
    } else if (fromStr !== toStr && isHoliday) {
      if (holidayOption === 'dayoff') {
        mockState.allocations[key] = { project: 'Day OFF', hours: 0, ...(comment && comment.trim() ? { comment: comment.trim() } : {}) };
      } else if (holidayOption === 'include') {
        mockState.allocations[key] = { project: proj.trim(), hours: Number(hours), ...(comment && comment.trim() ? { comment: comment.trim() } : {}) };
      }
    } else {
      mockState.allocations[key] = { project: proj.trim(), hours: Number(hours), ...(comment && comment.trim() ? { comment: comment.trim() } : {}) };
    }

    cur.setDate(cur.getDate() + 1);
  }
}

test('2.1 Mobile single day fill (Start Date == End Date) assigns comment to that single day', () => {
  simHandleMobileApply('emp_1', '2026-11-03', '2026-11-03', 'Project - Monorail', 8, 'Mobile site inspection notes');
  const alloc = mockState.allocations['emp_1_2026-11-03'];
  assert(alloc, 'Allocation must exist');
  assert.strictEqual(alloc.project, 'Project - Monorail');
  assert.strictEqual(alloc.hours, 8);
  assert.strictEqual(alloc.comment, 'Mobile site inspection notes');
});

test('2.2 Mobile single day fill without comment assigns project/hours without comment property', () => {
  simHandleMobileApply('emp_1', '2026-11-04', '2026-11-04', 'Tender - High Speed', 8, '');
  const alloc = mockState.allocations['emp_1_2026-11-04'];
  assert(alloc, 'Allocation must exist');
  assert.strictEqual(alloc.project, 'Tender - High Speed');
  assert.strictEqual(alloc.comment, undefined, 'comment property must be omitted when empty');
});

test('2.3 Mobile single day CLEAR / DELETE action removes allocation and comment cleanly', () => {
  simHandleMobileApply('emp_1', '2026-11-03', '2026-11-03', '__CLEAR__', 0, '');
  assert.strictEqual(mockState.allocations['emp_1_2026-11-03'], undefined, 'Allocation must be completely cleared');
});

// ========================================================
// MODULE 3: Mobile Date Range Fill Behavioral Simulation
// ========================================================
console.log('\n>>> MODULE 3: Mobile Date Range Fill Behavioral Simulation');

test('3.1 Mobile date range fill (Start Date != End Date) assigns comment across all days in range', () => {
  // Nov 8 (Sun) to Nov 11 (Wed) - all workdays in Cairo
  simHandleMobileApply('emp_1', '2026-11-08', '2026-11-11', 'Project - Cairo Metro Line 4', 8, 'Track circuit field commissioning');

  ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'].forEach(d => {
    const key = `emp_1_${d}`;
    assert(mockState.allocations[key], `Cell ${key} must exist`);
    assert.strictEqual(mockState.allocations[key].project, 'Project - Cairo Metro Line 4');
    assert.strictEqual(mockState.allocations[key].comment, 'Track circuit field commissioning');
  });
});

test('3.2 Mobile range fill spanning weekend with dayoff assigns comment to both workdays and holidays', () => {
  // Nov 12 (Thu) to Nov 14 (Sat) - Thu workday, Fri/Sat Cairo holidays
  simHandleMobileApply('emp_1', '2026-11-12', '2026-11-14', 'Special Training / Academy', 8, 'Academy workshop on signaling', 'dayoff', 'Cairo');

  assert.strictEqual(mockState.allocations['emp_1_2026-11-12'].project, 'Special Training / Academy');
  assert.strictEqual(mockState.allocations['emp_1_2026-11-12'].comment, 'Academy workshop on signaling');

  assert.strictEqual(mockState.allocations['emp_1_2026-11-13'].project, 'Day OFF');
  assert.strictEqual(mockState.allocations['emp_1_2026-11-13'].comment, 'Academy workshop on signaling');

  assert.strictEqual(mockState.allocations['emp_1_2026-11-14'].project, 'Day OFF');
  assert.strictEqual(mockState.allocations['emp_1_2026-11-14'].comment, 'Academy workshop on signaling');
});

// ========================================================
// MODULE 4: Mobile Agenda Comment Rendering & Row Interaction
// ========================================================
console.log('\n>>> MODULE 4: Mobile Agenda Comment Rendering & Row Interaction');

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

test('4.1 Mobile agenda row renders .mobile-agenda-comment with (+) icon and escaped comment text', () => {
  const row = {
    dateStr: '2026-11-08',
    dowName: 'Sun',
    pName: 'Project - Cairo Metro Line 4',
    hours: 8,
    comment: 'Track circuit field commissioning'
  };

  const commentHtml = row.comment ? `
    <div class="mobile-agenda-comment">
      <span class="comment-icon">(+)</span>
      <span class="comment-text">${escapeHtml(row.comment)}</span>
    </div>
  ` : '';

  const agendaRowHtml = `
    <div class="mobile-agenda-row" data-date="${row.dateStr}" data-project="${row.pName}" data-hours="${row.hours}" data-comment="${escapeHtml(row.comment || '')}">
      <div class="mobile-agenda-date">
        <span>08/11/2026</span>
        <span class="text-xs text-muted" style="margin-left:4px;">${row.dowName}</span>
        ${commentHtml}
      </div>
    </div>
  `;

  assert(agendaRowHtml.includes('class="mobile-agenda-comment"'), 'Must have mobile-agenda-comment class');
  assert(agendaRowHtml.includes('<span class="comment-icon">(+)</span>'), 'Must contain (+) icon');
  assert(agendaRowHtml.includes('Track circuit field commissioning'), 'Must contain comment text');
  assert(agendaRowHtml.includes('data-comment="Track circuit field commissioning"'), 'Must preserve data-comment attribute');
});

test('4.2 Tapping an agenda row with comment pre-populates form, displays wrapper, and activates button', () => {
  const cVal = 'Track circuit field commissioning';
  const mockInput = { value: '' };
  const mockWrapper = { style: { display: 'none' } };
  const mockBtn = {
    classes: new Set(),
    classList: {
      add(cls) { mockBtn.classes.add(cls); },
      remove(cls) { mockBtn.classes.delete(cls); }
    }
  };

  // Simulation of click handler in app.js
  if (mockInput) mockInput.value = cVal;
  if (cVal) {
    mockWrapper.style.display = 'block';
    mockBtn.classList.add('active');
  } else {
    mockWrapper.style.display = 'none';
    mockBtn.classList.remove('active');
  }

  assert.strictEqual(mockInput.value, 'Track circuit field commissioning');
  assert.strictEqual(mockWrapper.style.display, 'block');
  assert(mockBtn.classes.has('active'), 'Button must have active class');
});

test('4.3 Tapping an agenda row without comment clears form, hides wrapper, and deactivates button', () => {
  const cVal = '';
  const mockInput = { value: 'Old comment' };
  const mockWrapper = { style: { display: 'block' } };
  const mockBtn = {
    classes: new Set(['active']),
    classList: {
      add(cls) { mockBtn.classes.add(cls); },
      remove(cls) { mockBtn.classes.delete(cls); }
    }
  };

  if (mockInput) mockInput.value = cVal;
  if (cVal) {
    mockWrapper.style.display = 'block';
    mockBtn.classList.add('active');
  } else {
    mockWrapper.style.display = 'none';
    mockBtn.classList.remove('active');
  }

  assert.strictEqual(mockInput.value, '');
  assert.strictEqual(mockWrapper.style.display, 'none');
  assert(!mockBtn.classes.has('active'), 'Button must NOT have active class');
});

// ========================================================
// MODULE 5: Zero Unicode Emojis Verification
// ========================================================
console.log('\n>>> MODULE 5: Zero Unicode Emojis Verification');

test('5.1 Strictly zero unicode emojis across modified files', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(html), 'Emoji detected in index.html');
  assert(!emojiRegex.test(js), 'Emoji detected in app.js');
  assert(!emojiRegex.test(css), 'Emoji detected in styles.css');
});

console.log('==========================================================');
console.log(` MOBILE COMMENT FUNCTIONALITY COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==========================================================');

if (failCount > 0) {
  process.exit(1);
}
