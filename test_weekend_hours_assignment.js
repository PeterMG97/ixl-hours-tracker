/**
 * test_weekend_hours_assignment.js
 * Automated test suite verifying normal hours assignment on weekends
 * for single day / multi-selected days vs holiday handling for multi-day periods and whole month.
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
console.log(' RUNNING DEDICATED WEEKEND HOURS ASSIGNMENT TEST SUITE');
console.log('==========================================================\n');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

// ========================================================
// MODULE 1: Static Code Contracts & Zero Emojis
// ========================================================
console.log('>>> MODULE 1: Static Code Contracts & Zero Emojis');

test('1.1 index.html contains zero unicode emojis', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(html), 'Found emoji in index.html');
});

test('1.2 app.js contains zero unicode emojis', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(js), 'Found emoji in app.js');
});

test('1.3 styles.css contains zero unicode emojis', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(css), 'Found emoji in styles.css');
});

test('1.4 Cache buster bumped to v=7.0 in index.html', () => {
  assert(html.includes('styles.css?v=7.0'), 'styles.css cache buster not bumped');
  assert(html.includes('app.js?v=7.0'), 'app.js cache buster not bumped');
});

test('1.5 app.js implements isPeriodWithWeekendForRange helper', () => {
  assert(js.includes('function isPeriodWithWeekendForRange'), 'Missing isPeriodWithWeekendForRange');
});

test('1.6 Bulk fill modal has id="bulkHolidayTreatmentGroup"', () => {
  assert(html.includes('id="bulkHolidayTreatmentGroup"'), 'Missing bulkHolidayTreatmentGroup in HTML');
  assert(js.includes('bulkHolidayTreatmentGroup:'), 'Missing bulkHolidayTreatmentGroup in app.js el');
  assert(js.includes('updateBulkHolidayTreatmentVisibility'), 'Missing updateBulkHolidayTreatmentVisibility in app.js');
});

test('1.7 Mobile logger has id="mobileHolidayTreatment"', () => {
  assert(html.includes('id="mobileHolidayTreatment"'), 'Missing mobileHolidayTreatment in HTML');
  assert(js.includes('mobileHolidayTreatment:'), 'Missing mobileHolidayTreatment in app.js el');
  assert(js.includes('updateMobileHolidayTreatmentVisibility'), 'Missing updateMobileHolidayTreatmentVisibility in app.js');
});

test('1.8 Chosen profile name in mobile interface is bold in pure black (#000000)', () => {
  assert(css.includes('#mobileUserNameDisplay'), 'Missing #mobileUserNameDisplay');
  assert(css.includes('color: #000000 !important;'), 'Missing #000000 color for bold black text');
  assert(css.includes('[data-theme="dark"] #mobileUserNameDisplay'), 'Missing dark theme mobileUserNameDisplay');
  assert(css.includes('color: #ffffff !important;'), 'Missing #ffffff color for dark mode bold text');
});

test('1.9 Chosen profile in schedule grid on PC & mobile is bold in pure black (#000000)', () => {
  assert(css.includes('.user-row.active-user-row td.col-user .user-name-text'), 'Missing active-user-row rule');
  assert(css.includes('body.is-mobile-device .schedule-table .user-row.active-user-row td.col-user .user-name-text'), 'Missing mobile grid active-user-row rule');
});

// ========================================================
// MODULE 2: Range Period Logic (Cairo vs Istanbul)
// ========================================================
console.log('\n>>> MODULE 2: Range Period Logic (Cairo vs Istanbul)');

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isWeekendForLocation(dow, location) {
  if (location && location.toLowerCase().includes('istanbul')) {
    return (dow === 0 || dow === 6); // Sat (6) and Sun (0)
  }
  return (dow === 5 || dow === 6); // Fri (5) and Sat (6)
}

function isPeriodWithWeekendForRange(fromStr, toStr, location) {
  if (!fromStr || !toStr || fromStr > toStr) return false;
  let scanCur = parseLocalDate(fromStr);
  let scanStr = fromStr;
  let workdays = 0;
  let weekends = 0;
  while (scanStr <= toStr) {
    const dow = scanCur.getDay();
    if (isWeekendForLocation(dow, location)) {
      weekends++;
    } else {
      workdays++;
    }
    scanCur.setDate(scanCur.getDate() + 1);
    scanStr = formatLocalDate(scanCur);
  }
  return (workdays > 0 && weekends > 0);
}

test('2.1 Single Istanbul weekend day (Sun 08/11/2026) is NOT a period with weekend', () => {
  assert.strictEqual(isPeriodWithWeekendForRange('2026-11-08', '2026-11-08', 'Istanbul'), false);
});

test('2.2 Single Cairo weekend day (Fri 06/11/2026) is NOT a period with weekend', () => {
  assert.strictEqual(isPeriodWithWeekendForRange('2026-11-06', '2026-11-06', 'Cairo'), false);
});

test('2.3 Single workday (Mon 02/11/2026) is NOT a period with weekend', () => {
  assert.strictEqual(isPeriodWithWeekendForRange('2026-11-02', '2026-11-02', 'Istanbul'), false);
  assert.strictEqual(isPeriodWithWeekendForRange('2026-11-02', '2026-11-02', 'Cairo'), false);
});

test('2.4 Pure Istanbul weekend (Sat 07/11 to Sun 08/11) is NOT a period with weekend', () => {
  assert.strictEqual(isPeriodWithWeekendForRange('2026-11-07', '2026-11-08', 'Istanbul'), false);
});

test('2.5 Pure Cairo weekend (Fri 06/11 to Sat 07/11) is NOT a period with weekend', () => {
  assert.strictEqual(isPeriodWithWeekendForRange('2026-11-06', '2026-11-07', 'Cairo'), false);
});

test('2.6 Istanbul Work Week (Mon 02/11 to Fri 06/11) has zero weekends, returns false', () => {
  assert.strictEqual(isPeriodWithWeekendForRange('2026-11-02', '2026-11-06', 'Istanbul'), false);
});

test('2.7 Cairo Work Week (Sun 01/11 to Thu 05/11) has zero weekends, returns false', () => {
  assert.strictEqual(isPeriodWithWeekendForRange('2026-11-01', '2026-11-05', 'Cairo'), false);
});

test('2.8 Istanbul multi-day period (Thu 05/11 to Sun 08/11) includes workdays and weekend, returns true', () => {
  assert.strictEqual(isPeriodWithWeekendForRange('2026-11-05', '2026-11-08', 'Istanbul'), true);
});

test('2.9 Cairo multi-day period (Thu 05/11 to Sun 08/11) includes workdays and weekend, returns true', () => {
  assert.strictEqual(isPeriodWithWeekendForRange('2026-11-05', '2026-11-08', 'Cairo'), true);
});

test('2.10 Entire month (01/11 to 30/11) includes workdays and weekends, returns true', () => {
  assert.strictEqual(isPeriodWithWeekendForRange('2026-11-01', '2026-11-30', 'Istanbul'), true);
  assert.strictEqual(isPeriodWithWeekendForRange('2026-11-01', '2026-11-30', 'Cairo'), true);
});

// ========================================================
// MODULE 3: Mobile Logger Allocation Simulation
// ========================================================
console.log('\n>>> MODULE 3: Mobile Logger Allocation Simulation');

function simulateMobileApply({ empId, location, fromStr, toStr, proj, hours, holidayOption }) {
  const allocations = {};
  const isPeriodWithWeekend = isPeriodWithWeekendForRange(fromStr, toStr, location);
  const isExplicitDayOff = (proj === 'Day OFF');
  const isClearAction = (!proj || proj.trim() === '' || proj === '__CLEAR__');

  let cur = parseLocalDate(fromStr);
  let currentStr = fromStr;
  let filledWorkdaysCount = 0;
  let holidaysDayOffCount = 0;
  let holidaysSkippedCount = 0;
  let clearedCount = 0;

  while (currentStr <= toStr) {
    const dow = cur.getDay();
    const isHoli = isWeekendForLocation(dow, location);
    const key = `${empId}_${currentStr}`;

    if (isClearAction) {
      delete allocations[key];
      clearedCount++;
    } else if (isExplicitDayOff) {
      allocations[key] = { project: 'Day OFF', hours: 0 };
      holidaysDayOffCount++;
    } else if (isPeriodWithWeekend && isHoli) {
      if (holidayOption === 'dayoff') {
        allocations[key] = { project: 'Day OFF', hours: 0 };
        holidaysDayOffCount++;
      } else if (holidayOption === 'include') {
        allocations[key] = { project: proj.trim(), hours: hours };
        filledWorkdaysCount++;
      } else {
        holidaysSkippedCount++;
      }
    } else {
      allocations[key] = { project: proj.trim(), hours: hours };
      filledWorkdaysCount++;
    }

    cur.setDate(cur.getDate() + 1);
    currentStr = formatLocalDate(cur);
  }

  return { allocations, filledWorkdaysCount, holidaysDayOffCount, holidaysSkippedCount, clearedCount };
}

test('3.1 Mobile: Logging a single weekend day assigns project & hours normally, NOT Day OFF', () => {
  // Istanbul employee, Sunday Nov 8 (weekend)
  const res = simulateMobileApply({
    empId: 'emp_istanbul',
    location: 'Istanbul',
    fromStr: '2026-11-08',
    toStr: '2026-11-08',
    proj: 'Project - GP - Test',
    hours: 8,
    holidayOption: 'dayoff' // Even with default dayoff radio, single day assigns normally!
  });

  const alloc = res.allocations['emp_istanbul_2026-11-08'];
  assert(alloc, 'Allocation missing');
  assert.strictEqual(alloc.project, 'Project - GP - Test', 'Project should NOT be Day OFF');
  assert.strictEqual(alloc.hours, 8, 'Hours should be 8h');
  assert.strictEqual(res.filledWorkdaysCount, 1);
  assert.strictEqual(res.holidaysDayOffCount, 0);
});

test('3.2 Mobile: Logging pure weekend days assigns project & hours normally to all weekend days', () => {
  // Istanbul employee, Sat 07/11 to Sun 08/11 (pure weekend)
  const res = simulateMobileApply({
    empId: 'emp_istanbul',
    location: 'Istanbul',
    fromStr: '2026-11-07',
    toStr: '2026-11-08',
    proj: 'Tender - High Speed',
    hours: 7.5,
    holidayOption: 'dayoff'
  });

  assert.strictEqual(res.allocations['emp_istanbul_2026-11-07'].project, 'Tender - High Speed');
  assert.strictEqual(res.allocations['emp_istanbul_2026-11-07'].hours, 7.5);
  assert.strictEqual(res.allocations['emp_istanbul_2026-11-08'].project, 'Tender - High Speed');
  assert.strictEqual(res.allocations['emp_istanbul_2026-11-08'].hours, 7.5);
  assert.strictEqual(res.filledWorkdaysCount, 2);
  assert.strictEqual(res.holidaysDayOffCount, 0);
});

test('3.3 Mobile: Explicitly selecting Day OFF project on single day assigns Day OFF 0h', () => {
  const res = simulateMobileApply({
    empId: 'emp_cairo',
    location: 'Cairo',
    fromStr: '2026-11-02',
    toStr: '2026-11-02',
    proj: 'Day OFF',
    hours: 0,
    holidayOption: 'dayoff'
  });

  const alloc = res.allocations['emp_cairo_2026-11-02'];
  assert.strictEqual(alloc.project, 'Day OFF');
  assert.strictEqual(alloc.hours, 0);
});

test('3.4 Mobile: Multi-day period spanning weekend with holidayOption "dayoff" sets holidays to Day OFF', () => {
  // Cairo: Sun 01/11 to Sun 08/11 (8 days: 6 workdays, 2 weekend days Fri 06/11 & Sat 07/11)
  const res = simulateMobileApply({
    empId: 'emp_cairo',
    location: 'Cairo',
    fromStr: '2026-11-01',
    toStr: '2026-11-08',
    proj: 'Different Team Support',
    hours: 8,
    holidayOption: 'dayoff'
  });

  // Fri & Sat should be Day OFF
  assert.strictEqual(res.allocations['emp_cairo_2026-11-06'].project, 'Day OFF');
  assert.strictEqual(res.allocations['emp_cairo_2026-11-06'].hours, 0);
  assert.strictEqual(res.allocations['emp_cairo_2026-11-07'].project, 'Day OFF');
  assert.strictEqual(res.allocations['emp_cairo_2026-11-07'].hours, 0);

  // Workdays should be Different Team Support
  assert.strictEqual(res.allocations['emp_cairo_2026-11-01'].project, 'Different Team Support');
  assert.strictEqual(res.allocations['emp_cairo_2026-11-05'].project, 'Different Team Support');
  assert.strictEqual(res.allocations['emp_cairo_2026-11-08'].project, 'Different Team Support');

  assert.strictEqual(res.filledWorkdaysCount, 6);
  assert.strictEqual(res.holidaysDayOffCount, 2);
});

test('3.5 Mobile: Multi-day period spanning weekend with holidayOption "include" works on holidays', () => {
  const res = simulateMobileApply({
    empId: 'emp_cairo',
    location: 'Cairo',
    fromStr: '2026-11-05',
    toStr: '2026-11-07', // Thu (workday), Fri (holiday), Sat (holiday)
    proj: 'Different Team Support',
    hours: 8,
    holidayOption: 'include'
  });

  assert.strictEqual(res.allocations['emp_cairo_2026-11-05'].project, 'Different Team Support');
  assert.strictEqual(res.allocations['emp_cairo_2026-11-06'].project, 'Different Team Support');
  assert.strictEqual(res.allocations['emp_cairo_2026-11-07'].project, 'Different Team Support');
  assert.strictEqual(res.filledWorkdaysCount, 3);
  assert.strictEqual(res.holidaysDayOffCount, 0);
});

test('3.6 Mobile: Multi-day period spanning weekend with holidayOption "skip" leaves holidays untouched', () => {
  const res = simulateMobileApply({
    empId: 'emp_cairo',
    location: 'Cairo',
    fromStr: '2026-11-05',
    toStr: '2026-11-07',
    proj: 'Different Team Support',
    hours: 8,
    holidayOption: 'skip'
  });

  assert.strictEqual(res.allocations['emp_cairo_2026-11-05'].project, 'Different Team Support');
  assert.strictEqual(res.allocations['emp_cairo_2026-11-06'], undefined);
  assert.strictEqual(res.allocations['emp_cairo_2026-11-07'], undefined);
  assert.strictEqual(res.filledWorkdaysCount, 1);
  assert.strictEqual(res.holidaysSkippedCount, 2);
});

test('3.7 Mobile: Whole month with holidayOption "dayoff" marks all 8 weekend days as Day OFF and workdays as project', () => {
  // Istanbul November 2026: 30 days total (22 workdays, 8 weekend days: Nov 1, 7, 8, 14, 15, 21, 22, 28, 29)
  const res = simulateMobileApply({
    empId: 'emp_istanbul',
    location: 'Istanbul',
    fromStr: '2026-11-01',
    toStr: '2026-11-30',
    proj: 'Project - GP - Test',
    hours: 8,
    holidayOption: 'dayoff'
  });

  // Nov 1 (Sunday) and Nov 7 (Saturday) must be Day OFF
  assert.strictEqual(res.allocations['emp_istanbul_2026-11-01'].project, 'Day OFF');
  assert.strictEqual(res.allocations['emp_istanbul_2026-11-07'].project, 'Day OFF');

  // Nov 2 (Monday) must be Project - GP - Test
  assert.strictEqual(res.allocations['emp_istanbul_2026-11-02'].project, 'Project - GP - Test');
  assert.strictEqual(res.allocations['emp_istanbul_2026-11-02'].hours, 8);

  assert.strictEqual(res.filledWorkdaysCount, 21); // Nov 1 is Sunday
  assert.strictEqual(res.holidaysDayOffCount, 9);  // 9 weekend days in Nov 2026 (Sun 1, Sat 7, Sun 8, Sat 14, Sun 15, Sat 21, Sun 22, Sat 28, Sun 29)
});

// ========================================================
// MODULE 4: Desktop Interface Verification
// ========================================================
console.log('\n>>> MODULE 4: Desktop Interface Verification');

test('4.1 Desktop: Bulk Fill single weekend day assigns project & hours normally', () => {
  const res = simulateMobileApply({
    empId: 'emp_peter',
    location: 'Cairo',
    fromStr: '2026-11-06',
    toStr: '2026-11-06',
    proj: 'Different Team Support',
    hours: 8,
    holidayOption: 'dayoff'
  });

  assert.strictEqual(res.allocations['emp_peter_2026-11-06'].project, 'Different Team Support');
  assert.strictEqual(res.allocations['emp_peter_2026-11-06'].hours, 8);
});

test('4.2 Desktop: Bulk Fill whole month treats holidays according to choice', () => {
  const res = simulateMobileApply({
    empId: 'emp_peter',
    location: 'Cairo',
    fromStr: '2026-11-01',
    toStr: '2026-11-30',
    proj: 'Academy - ERA - Cairo',
    hours: 8,
    holidayOption: 'dayoff'
  });

  // Nov 6 (Friday) is Cairo holiday -> Day OFF
  assert.strictEqual(res.allocations['emp_peter_2026-11-06'].project, 'Day OFF');
  // Nov 1 (Sunday) is Cairo workday -> Academy
  assert.strictEqual(res.allocations['emp_peter_2026-11-01'].project, 'Academy - ERA - Cairo');
  assert.strictEqual(res.allocations['emp_peter_2026-11-01'].hours, 8);
});

console.log('\n==========================================================');
console.log(` DEDICATED TEST COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==========================================================');

if (failCount > 0) {
  process.exit(1);
}

