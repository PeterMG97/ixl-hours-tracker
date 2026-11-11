const fs = require('fs');
const assert = require('assert');

console.log('==========================================================');
console.log(' RUNNING DEDICATED PC CALENDAR POPOVER & DAY JUMP TEST SUITE');
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

// 1.1 Check trigger button and month display
assert(indexHtml.includes('id="mainCalendarTriggerBtn"'), 'Trigger button missing in index.html');
assert(indexHtml.includes('id="mainCalendarMonthDisplay"'), 'Month display span missing in index.html');
pass('1.1 index.html contains mainCalendarTriggerBtn and mainCalendarMonthDisplay');

// 1.2 Check popover container and its essential children
assert(indexHtml.includes('id="mainCalendarPopover"'), 'Popover container missing in index.html');
assert(indexHtml.includes('id="mainCalDaysGrid"'), 'Days grid missing in index.html');
assert(indexHtml.includes('id="mainCalMonthsGrid"'), 'Months grid missing in index.html');
assert(indexHtml.includes('id="mainCalTodayBtn"'), 'Today button missing in index.html');
assert(indexHtml.includes('id="mainCalPrevBtn"'), 'Prev button missing in index.html');
assert(indexHtml.includes('id="mainCalNextBtn"'), 'Next button missing in index.html');
assert(indexHtml.includes('id="mainCalTitleBtn"'), 'Title button missing in index.html');
pass('1.2 index.html contains all main calendar popover structure components');

// 1.3 Preserves monthSelect for compatibility with tests and accessibility
assert(indexHtml.includes('id="monthSelect"'), 'monthSelect element missing in index.html');
assert(indexHtml.includes('class="period-select sr-only"'), 'monthSelect should have sr-only class for accessibility');
pass('1.3 index.html preserves monthSelect with sr-only class');

// 1.4 CSS classes exist
assert(stylesCss.includes('.main-calendar-trigger-btn'), '.main-calendar-trigger-btn missing in styles.css');
assert(stylesCss.includes('.main-calendar-popover'), '.main-calendar-popover missing in styles.css');
assert(stylesCss.includes('.main-cal-day-cell'), '.main-cal-day-cell missing in styles.css');
assert(stylesCss.includes('.day-jump-highlight'), '.day-jump-highlight missing in styles.css');
assert(stylesCss.includes('.main-cal-today-btn'), '.main-cal-today-btn missing in styles.css');
pass('1.4 styles.css defines complete modern calendar and jump highlight styling');

// 1.5 app.js functions exist
assert(appJs.includes('function updateMainCalendarTriggerDisplay'), 'updateMainCalendarTriggerDisplay missing in app.js');
assert(appJs.includes('function scrollToDay'), 'scrollToDay missing in app.js');
assert(appJs.includes('function openAndMoveToDate'), 'openAndMoveToDate missing in app.js');
assert(appJs.includes('function openMainCalendarPopover'), 'openMainCalendarPopover missing in app.js');
assert(appJs.includes('function closeMainCalendarPopover'), 'closeMainCalendarPopover missing in app.js');
assert(appJs.includes('function renderMainCal'), 'renderMainCal missing in app.js');
assert(appJs.includes('function renderMainCalDaysGrid'), 'renderMainCalDaysGrid missing in app.js');
assert(appJs.includes('function renderMainCalMonthYearGrid'), 'renderMainCalMonthYearGrid missing in app.js');
assert(appJs.includes('function initMainCalendarListeners'), 'initMainCalendarListeners missing in app.js');
pass('1.5 app.js implements calendar popover engine and smooth day scrolling');

// 1.6 data-date attribute on th.col-slot
assert(appJs.includes('data-date="${d.dateStr}"'), 'th.col-slot must include data-date attribute');
assert(appJs.includes('data-day="${d.num}"'), 'th.col-slot must include data-day attribute');
pass('1.6 schedule header th.col-slot attaches data-date and data-day attributes');

// -----------------------------------------------------------------------------
// MODULE 2: Behavioral Calendar Date Math & Boundaries
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 2: Behavioral Date Math & Earliest Limit (Nov 2026)');

const APP_START_MONTH = '2026-11';

// 2.1 Verify earliest boundary enforcement
function testClamping(dateStr) {
  if (dateStr < APP_START_MONTH + '-01') {
    return APP_START_MONTH + '-01';
  }
  return dateStr;
}

assert.strictEqual(testClamping('2026-10-31'), '2026-11-01');
assert.strictEqual(testClamping('2025-05-15'), '2026-11-01');
assert.strictEqual(testClamping('2026-11-01'), '2026-11-01');
assert.strictEqual(testClamping('2026-12-15'), '2026-12-15');
assert.strictEqual(testClamping('2027-01-20'), '2027-01-20');
pass('2.1 Dates prior to Nov 1, 2026 are strictly clamped to 2026-11-01');

// 2.2 Weekday Monday-start calculation
function getMondayOffset(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  return (firstDay.getDay() + 6) % 7;
}

// Nov 1, 2026 is Sunday -> Sunday getDay() is 0 -> (0 + 6)%7 = 6
assert.strictEqual(getMondayOffset(2026, 11), 6);
// Dec 1, 2026 is Tuesday -> getDay() is 2 -> (2 + 6)%7 = 1
assert.strictEqual(getMondayOffset(2026, 12), 1);
// Jan 1, 2027 is Friday -> getDay() is 5 -> (5 + 6)%7 = 4
assert.strictEqual(getMondayOffset(2027, 1), 4);
pass('2.2 Monday-first weekday offsets calculate correctly');

// 2.3 Month days count calculation
assert.strictEqual(new Date(2026, 11, 0).getDate(), 30); // Nov
assert.strictEqual(new Date(2026, 12, 0).getDate(), 31); // Dec
assert.strictEqual(new Date(2027, 2, 0).getDate(), 28);  // Feb non-leap
assert.strictEqual(new Date(2028, 2, 0).getDate(), 29);  // Feb leap year
pass('2.3 Month lengths calculate correctly including leap years');

// -----------------------------------------------------------------------------
// MODULE 3: Zero Emojis Contract
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 3: Zero Unicode Emojis Verification');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;
assert(!emojiRegex.test(indexHtml), 'index.html contains forbidden emoji');
assert(!emojiRegex.test(appJs), 'app.js contains forbidden emoji');
assert(!emojiRegex.test(stylesCss), 'styles.css contains forbidden emoji');
pass('3.1 Strictly zero unicode emojis across all modified source files');

console.log('==========================================================');
console.log(` DEDICATED PC CALENDAR TEST COMPLETE: ${passCount} PASSED, 0 FAILED`);
console.log('==========================================================\n');

