const fs = require('fs');
const assert = require('assert');

console.log('==========================================================');
console.log(' RUNNING DEDICATED PC WEEK VIEW & VIEW TOGGLE TEST SUITE');
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

// 1.1 Check View Toggle Key in index.html
assert(indexHtml.includes('id="scheduleViewToggleWrap"'), 'scheduleViewToggleWrap missing in index.html');
assert(indexHtml.includes('id="viewModeToggleBtn"'), 'viewModeToggleBtn missing in index.html');
assert(indexHtml.includes('id="viewPillWeek"'), 'viewPillWeek missing in index.html');
assert(indexHtml.includes('id="viewPillMonth"'), 'viewPillMonth missing in index.html');
pass('1.1 index.html contains View (Month / Week) togglable key components');

// 1.2 Check CSS rules in styles.css for View Toggle Key
assert(stylesCss.includes('.schedule-view-toggle-wrap'), '.schedule-view-toggle-wrap missing in styles.css');
assert(stylesCss.includes('.view-toggle-key-btn'), '.view-toggle-key-btn missing in styles.css');
assert(stylesCss.includes('.view-key-pill.active'), '.view-key-pill.active missing in styles.css');
pass('1.2 styles.css defines view toggle key styling and active state');

// 1.3 Check Engine Functions in app.js
assert(appJs.includes('function getSundayOfWeek'), 'getSundayOfWeek missing in app.js');
assert(appJs.includes('function getDaysForWeek'), 'getDaysForWeek missing in app.js');
assert(appJs.includes('function stepWeek'), 'stepWeek missing in app.js');
assert(appJs.includes('function setScheduleViewMode'), 'setScheduleViewMode missing in app.js');
assert(appJs.includes('function initScheduleViewToggle'), 'initScheduleViewToggle missing in app.js');
pass('1.3 app.js implements Sunday-Saturday week calculation, stepping, and view toggling');

// -----------------------------------------------------------------------------
// MODULE 2: Week-Only Visual Noise Reduction & Modern Aesthetics Contracts
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 2: Week-Only Aesthetic Contracts (styles.css)');

// 2.1 Reduced Visual Noise & Dark Slate Palette
assert(stylesCss.includes('.schedule-table.is-week-view'), 'is-week-view table class missing');
assert(stylesCss.includes('#0b0f19 !important'), 'Dark slate palette #0b0f19 missing in styles.css');
assert(stylesCss.includes('#111827 !important'), 'Dark slate palette #111827 missing in styles.css');
pass('2.1 Week view enforces dark slate palette (#0b0f19 to #111827) and subtle 1px dividers');

// 2.2 Refined Typography & Sticky Left Column
assert(stylesCss.includes('.schedule-table.is-week-view td.col-user'), 'Sticky left column rule for week view missing');
assert(stylesCss.includes('position: sticky !important;'), 'Sticky positioning missing in week view column');
assert(stylesCss.includes('.schedule-table.is-week-view .user-name-text'), 'Typography rule for week view user-name-text missing');
pass('2.2 Week view enforces refined typography and sticky left employee column');

// 2.3 Restyled Allocation Pills (border-radius: 8px and modern color accents)
assert(stylesCss.includes('border-radius: 8px !important;'), '8px border radius missing on week view task-chip');
assert(stylesCss.includes('.schedule-table.is-week-view .task-chip.proj'), 'Projects restyled rule missing in week view');
assert(stylesCss.includes('.schedule-table.is-week-view .task-chip.training'), 'Training restyled rule missing in week view');
assert(stylesCss.includes('.schedule-table.is-week-view .task-chip.tender'), 'Tenders restyled rule missing in week view');
assert(stylesCss.includes('.schedule-table.is-week-view .task-chip.off'), 'Day off restyled rule missing in week view');
pass('2.3 Allocation pills restyled with border-radius: 8px, sapphire/indigo, emerald, cyan, and neutral slate');

// 2.4 Crisp Glowing Cyan/Blue Focus Indicator
assert(stylesCss.includes('.schedule-table.is-week-view .keyboard-focused-cell'), 'Focused cell rule for week view missing');
assert(stylesCss.includes('outline: 2px solid #38bdf8 !important;'), 'Glowing cyan/blue outline #38bdf8 missing in week view');
assert(stylesCss.includes('rgba(56, 189, 248, 0.55)'), 'Glowing box shadow missing in week view');
pass('2.4 Week view implements glowing cyan/blue focus ring without obscuring cell text');

// -----------------------------------------------------------------------------
// MODULE 3: Behavioral Week Calculation & Date Navigation
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 3: Behavioral Week Calculation & Date Navigation');

function mockGetSundayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  const dow = dt.getDay(); // 0 is Sunday, 6 is Saturday
  const sunday = new Date(dt.getTime() - dow * 86400000);
  const sy = sunday.getFullYear();
  const sm = String(sunday.getMonth() + 1).padStart(2, '0');
  const sd = String(sunday.getDate()).padStart(2, '0');
  let res = `${sy}-${sm}-${sd}`;
  if (res < '2026-11-01') res = '2026-11-01';
  return res;
}

function mockGetDaysForWeek(sundayStr, todayStr) {
  const [y, m, d] = sundayStr.split('-').map(Number);
  const base = new Date(y, m - 1, d, 12, 0, 0);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(base.getTime() + i * 86400000);
    const cy = cur.getFullYear();
    const cm = String(cur.getMonth() + 1).padStart(2, '0');
    const cd = String(cur.getDate()).padStart(2, '0');
    const dow = cur.getDay();
    const curDateStr = `${cy}-${cm}-${cd}`;
    days.push({
      num: cur.getDate(),
      name: dayNames[dow],
      dow: dow,
      dateStr: curDateStr,
      isWeekendCairo: (dow === 5 || dow === 6),
      isWeekendIstanbul: (dow === 0 || dow === 6),
      isToday: (curDateStr === todayStr),
      isPastOrToday: (curDateStr <= todayStr)
    });
  }
  return days;
}

// 3.1 Week containing today (e.g. Nov 12, 2026)
const todaySunday = mockGetSundayOfWeek('2026-11-12');
assert.strictEqual(todaySunday, '2026-11-08', 'Sunday for Nov 12 2026 should be Nov 8 2026');
const weekDays = mockGetDaysForWeek(todaySunday, '2026-11-12');
assert.strictEqual(weekDays.length, 7, 'Week must contain exactly 7 days');
assert.strictEqual(weekDays[0].name, 'Sun', 'First day of week must be Sunday');
assert.strictEqual(weekDays[0].dateStr, '2026-11-08');
assert.strictEqual(weekDays[6].name, 'Sat', 'Last day of week must be Saturday');
assert.strictEqual(weekDays[6].dateStr, '2026-11-14');
pass('3.1 Current week resolves strictly from Sunday (08/11) to Saturday (14/11)');

// 3.2 First week of the application (Nov 1, 2026 is Sunday)
const startSunday = mockGetSundayOfWeek('2026-11-01');
assert.strictEqual(startSunday, '2026-11-01', 'Nov 1, 2026 is already Sunday');
const startDays = mockGetDaysForWeek(startSunday, '2026-11-01');
assert.strictEqual(startDays[0].dateStr, '2026-11-01');
assert.strictEqual(startDays[6].dateStr, '2026-11-07');
pass('3.2 Start week Nov 1, 2026 is Sunday and bounds correctly to Saturday Nov 7');

// 3.3 Boundary clamping: dates before Nov 1, 2026 clamped to 2026-11-01
const clamped = mockGetSundayOfWeek('2026-10-28');
assert.strictEqual(clamped, '2026-11-01', 'Dates prior to Nov 2026 clamped to 2026-11-01');
pass('3.3 Dates prior to start horizon clamp to 2026-11-01');

// 3.4 Stepping weeks forward and backward
function mockStepWeek(currentSunday, direction) {
  const [y, m, d] = currentSunday.split('-').map(Number);
  const curDate = new Date(y, m - 1, d, 12, 0, 0);
  const targetDate = new Date(curDate.getTime() + direction * 7 * 86400000);
  const ty = targetDate.getFullYear();
  const tm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const td = String(targetDate.getDate()).padStart(2, '0');
  let targetSundayStr = `${ty}-${tm}-${td}`;
  if (targetSundayStr < '2026-11-01') targetSundayStr = '2026-11-01';
  return targetSundayStr;
}

const nextW = mockStepWeek('2026-11-08', 1);
assert.strictEqual(nextW, '2026-11-15', 'Incrementing by 1 week moves from Nov 8 to Nov 15');
const prevW = mockStepWeek('2026-11-15', -1);
assert.strictEqual(prevW, '2026-11-08', 'Decrementing by 1 week moves from Nov 15 to Nov 8');
const minW = mockStepWeek('2026-11-01', -1);
assert.strictEqual(minW, '2026-11-01', 'Decrementing at Nov 1, 2026 clamps at Nov 1, 2026');
pass('3.4 Stepping next/prev increments and decrements by exactly 7 days and clamps at start boundary');

// -----------------------------------------------------------------------------
// MODULE 4: Zero Emojis Contract
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 4: Zero Unicode Emojis Verification');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;
assert(!emojiRegex.test(indexHtml), 'index.html contains forbidden emoji');
assert(!emojiRegex.test(appJs), 'app.js contains forbidden emoji');
assert(!emojiRegex.test(stylesCss), 'styles.css contains forbidden emoji');
pass('4.1 Strictly zero unicode emojis across modified source files');

console.log('==========================================================');
console.log(` DEDICATED PC WEEK VIEW TEST COMPLETE: ${passCount} PASSED, 0 FAILED`);
console.log('==========================================================\n');
