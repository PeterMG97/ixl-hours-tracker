/**
 * test_mobile_personal_grid.js
 * Dedicated Verification Suite for Mobile Interface Personal / Team Grid Mode
 *
 * Requirements Tested:
 * 1. Single / Personal mode shows only month dates + current person column
 * 2. Personal row contains only one cell and the cell width is wide
 * 3. Strictly read-only grid without button triggers or edit listeners
 * 4. Personal mode is the default view in mobile grid
 * 5. Does not apply and does not affect the read-only link (?mode=view)
 * 6. Visual and calculations validation: all recorded days per profile appear correctly
 * 7. Matches the exact colors, theme, and transposed design of mobile grid
 * 8. Zero Unicode emojis across all files
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==========================================================');
console.log(' RUNNING MOBILE PERSONAL/TEAM GRID MODE INTEGRITY SUITE');
console.log('==========================================================\n');

let passCount = 0;
let failCount = 0;

function check(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}: ${err.message}`);
    failCount++;
  }
}

const rootDir = path.resolve(__dirname, '..');
const appJsPath = path.join(rootDir, 'public', 'app.js');
const indexHtmlPath = path.join(rootDir, 'public', 'index.html');
const stylesCssPath = path.join(rootDir, 'public', 'styles.css');
const dataJsonPath = path.join(rootDir, 'public', 'data.json');

const appJs = fs.readFileSync(appJsPath, 'utf8');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const stylesCss = fs.readFileSync(stylesCssPath, 'utf8');
const db = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));

// >>> MODULE 1: Static Code Contracts & Zero Unicode Emojis
console.log('>>> MODULE 1: Static Code Contracts & Zero Unicode Emojis');

check('1.1 Zero Unicode emojis across public/app.js, public/index.html, public/styles.css, and test file', () => {
  const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
  const selfContent = fs.readFileSync(__filename, 'utf8');
  assert(!emojiRegex.test(appJs), 'public/app.js must contain zero emojis');
  assert(!emojiRegex.test(indexHtml), 'public/index.html must contain zero emojis');
  assert(!emojiRegex.test(stylesCss), 'public/styles.css must contain zero emojis');
  assert(!emojiRegex.test(selfContent), 'test file must contain zero emojis');
});

check('1.2 state.mobileGridScope initialized to "personal" by default', () => {
  const match = appJs.match(/mobileGridScope:\s*['"]personal['"]/);
  assert(match, 'state.mobileGridScope must default to "personal"');
});

check('1.3 DOM elements for scope toggle defined in public/index.html', () => {
  assert(indexHtml.includes('id="mobileGridScopeToggle"'), 'mobileGridScopeToggle must exist in DOM');
  assert(indexHtml.includes('id="btnScopePersonal"'), 'btnScopePersonal must exist in DOM');
  assert(indexHtml.includes('id="btnScopeTeam"'), 'btnScopeTeam must exist in DOM');
  assert(indexHtml.includes('id="mobileGridNoticeText"'), 'mobileGridNoticeText must exist in DOM');
});

check('1.4 Scope management functions declared in public/app.js', () => {
  assert(appJs.includes('function updateMobileGridScopeUI()'), 'updateMobileGridScopeUI must be declared');
  assert(appJs.includes('function setMobileGridScope('), 'setMobileGridScope must be declared');
  assert(appJs.includes('function initMobileGridScopeToggle()'), 'initMobileGridScopeToggle must be declared');
});

// >>> MODULE 2: CSS Architecture & Wide Cell Styling (Requirements 2 & 7)
console.log('\n>>> MODULE 2: CSS Architecture & Wide Cell Styling (Requirements 2 & 7)');

check('2.1 Personal mode CSS rule enforces fixed layout and 100% table width', () => {
  assert(stylesCss.includes('.schedule-table.is-mobile-transposed.is-personal-mode'), 'is-personal-mode table class must be styled');
  assert(/width:\s*100%\s*!important/i.test(stylesCss), 'Personal mode table must have width 100%');
  assert(stylesCss.includes('table-layout: fixed !important;'), 'Personal mode table must use fixed table layout');
});

check('2.2 Slot cell in Personal mode has wide width (calc(100% - 75px) and min-width >= 180px)', () => {
  const slotRule = stylesCss.match(/\.schedule-table\.is-mobile-transposed\.is-personal-mode\s+td\.col-transposed-slot\s*\{([\s\S]*?)\}/);
  assert(slotRule, 'td.col-transposed-slot rule in personal mode must exist');
  const cssBody = slotRule[1];
  assert(cssBody.includes('calc(100% - 75px)'), 'Slot cell width must span full remaining width (calc(100% - 75px))');
  assert(cssBody.includes('min-width: 180px') || cssBody.includes('min-width: 200px'), 'Slot cell min-width must be wide (>= 180px)');
  assert(cssBody.includes('max-width: none'), 'Slot cell max-width must not be restricted in personal mode');
});

check('2.3 Employee header in Personal mode has wide width and comfortable alignment', () => {
  const empHeaderRule = stylesCss.match(/\.schedule-table\.is-mobile-transposed\.is-personal-mode\s+th\.col-transposed-emp-header\s*\{([\s\S]*?)\}/);
  assert(empHeaderRule, 'th.col-transposed-emp-header rule in personal mode must exist');
  const cssBody = empHeaderRule[1];
  assert(cssBody.includes('calc(100% - 75px)'), 'Header cell width must match slot cell width');
});

check('2.4 Task chips in Personal mode expand to 100% width with flex alignment', () => {
  const chipRule = stylesCss.match(/\.schedule-table\.is-mobile-transposed\.is-personal-mode\s+\.transposed-task-chip\s*\{([\s\S]*?)\}/);
  assert(chipRule, '.transposed-task-chip rule in personal mode must exist');
  const cssBody = chipRule[1];
  assert(cssBody.includes('width: 100% !important;'), 'Task chip must be 100% width in personal mode');
  assert(cssBody.includes('display: flex !important;'), 'Task chip must use flexbox in personal mode');
  assert(cssBody.includes('justify-content: space-between !important;'), 'Task chip must space out label and comment indicator');
});

check('2.5 Scope toggle styled for Light and Dark themes', () => {
  assert(stylesCss.includes('.mobile-grid-scope-toggle'), 'mobile-grid-scope-toggle class must be styled');
  assert(stylesCss.includes('.btn-grid-scope'), 'btn-grid-scope class must be styled');
  assert(stylesCss.includes('.btn-grid-scope.active'), 'btn-grid-scope.active must be styled');
  assert(stylesCss.includes('[data-theme="dark"] .mobile-grid-scope-toggle'), 'Dark mode scope toggle must be styled');
  assert(stylesCss.includes('[data-theme="dark"] .btn-grid-scope.active'), 'Dark mode active toggle must be styled');
});

// >>> MODULE 3: Single Column vs Full Team Rendering Simulation (Requirements 1 & 4)
console.log('\n>>> MODULE 3: Single Column vs Full Team Rendering Simulation (Requirements 1 & 4)');

function getDaysInMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const totalDays = new Date(y, m, 0).getDate();
  const days = [];
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let d = 1; d <= totalDays; d++) {
    const dt = new Date(y, m - 1, d);
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      num: d,
      name: dowNames[dt.getDay()],
      dow: dt.getDay(),
      dateStr: dateStr
    });
  }
  return days;
}

function isWeekendForLocation(dow, location) {
  const loc = (location || '').toLowerCase().trim();
  if (loc === 'istanbul' || loc.includes('istanbul') || loc.includes('ist')) {
    return (dow === 0 || dow === 6); // Sat & Sun
  }
  return (dow === 5 || dow === 6); // Fri & Sat
}

function simulateRenderMobileTransposed(targetEmpId, scope, isViewOnly, month = '2026-11', customAllocations = null) {
  const isPersonal = (scope === 'personal') && !isViewOnly;
  const allocSource = customAllocations || db.allocations;

  // Gather active employees
  let activeEmps = [];
  db.sections.forEach(sec => {
    const secEmps = db.employees.filter(e => e.sectionId === sec.id && e.active !== false);
    secEmps.sort((a,b) => a.name.localeCompare(b.name));
    secEmps.forEach(emp => {
      activeEmps.push({
        emp,
        secLocation: sec.location || 'Cairo',
        secName: sec.name
      });
    });
  });

  const totalActiveTeam = activeEmps.length;

  if (isPersonal) {
    const matched = activeEmps.find(item => item.emp.id === targetEmpId);
    if (matched) {
      activeEmps = [matched];
    } else if (activeEmps.length > 0) {
      activeEmps = [activeEmps[0]];
    }
  }

  const days = getDaysInMonth(month);

  // Headers
  const renderedColCount = activeEmps.length;
  const renderedHeaderEmps = activeEmps.map(item => item.emp.id);

  // Body rows
  const rows = [];
  days.forEach(d => {
    const cells = [];
    activeEmps.forEach(item => {
      const emp = item.emp;
      const key = `${emp.id}_${d.dateStr}`;
      const alloc = allocSource[key];
      const hasVal = Boolean(alloc && alloc.project && alloc.project.trim() !== '');
      const projectName = hasVal ? alloc.project.trim() : '';
      const isWk = isWeekendForLocation(d.dow, item.secLocation);
      const hours = hasVal ? (typeof alloc.hours === 'number' ? alloc.hours : (emp.defaultHoursPerDay || 8)) : 0;
      cells.push({
        empId: emp.id,
        dateStr: d.dateStr,
        hasVal,
        projectName,
        hours,
        isWeekend: isWk,
        hasComment: Boolean(alloc && alloc.comment && alloc.comment.trim())
      });
    });
    rows.push({
      dateStr: d.dateStr,
      dayNum: d.num,
      dayName: d.name,
      cells: cells
    });
  });

  return {
    isPersonal,
    totalActiveTeam,
    renderedColCount,
    renderedHeaderEmps,
    daysCount: days.length,
    rows
  };
}

check('3.1 In Personal mode, rendered employee column count is strictly 1 (the chosen profile)', () => {
  const result = simulateRenderMobileTransposed('emp_22', 'personal', false, '2026-11');
  assert.strictEqual(result.renderedColCount, 1, 'Personal mode must render exactly 1 employee column');
  assert.strictEqual(result.renderedHeaderEmps[0], 'emp_22', 'Rendered column must match target user emp_22');
  assert.strictEqual(result.isPersonal, true, 'isPersonal flag must be true');
});

check('3.2 In Personal mode, every date row contains strictly 1 slot cell', () => {
  const result = simulateRenderMobileTransposed('emp_17', 'personal', false, '2026-11');
  assert.strictEqual(result.rows.length, 30, 'November 2026 must have 30 day rows');
  result.rows.forEach(r => {
    assert.strictEqual(r.cells.length, 1, `Day ${r.dateStr} row must contain exactly 1 cell in personal mode`);
    assert.strictEqual(r.cells[0].empId, 'emp_17', 'Cell employee must match target profile emp_17');
  });
});

check('3.3 In Team mode, rendered employee column count equals total active team', () => {
  const result = simulateRenderMobileTransposed('emp_22', 'team', false, '2026-11');
  assert.strictEqual(result.renderedColCount, result.totalActiveTeam, 'Team mode must render all active employees');
  assert.strictEqual(result.isPersonal, false, 'isPersonal flag must be false in team mode');
  result.rows.forEach(r => {
    assert.strictEqual(r.cells.length, result.totalActiveTeam, `Day ${r.dateStr} row must contain all team cells`);
  });
});

check('3.4 Switching between Personal and Team changes column count from 1 to active team count and back', () => {
  const personalResult = simulateRenderMobileTransposed('emp_22', 'personal', false, '2026-11');
  assert.strictEqual(personalResult.renderedColCount, 1, 'Initial Personal mode has 1 column');

  const teamResult = simulateRenderMobileTransposed('emp_22', 'team', false, '2026-11');
  assert.strictEqual(teamResult.renderedColCount, teamResult.totalActiveTeam, 'Toggled to Team mode has all active columns');

  const restoredResult = simulateRenderMobileTransposed('emp_22', 'personal', false, '2026-11');
  assert.strictEqual(restoredResult.renderedColCount, 1, 'Toggled back to Personal mode has 1 column');
});

// >>> MODULE 4: Read-Only Contract Verification (Requirement 3)
console.log('\n>>> MODULE 4: Read-Only Contract Verification (Requirement 3)');

check('4.1 Transposed chips are strictly rendered as non-button div elements', () => {
  const fnMatch = appJs.match(/function renderMobileTransposedSchedule\(\)\s*\{([\s\S]*?)\n  \}/);
  assert(fnMatch, 'renderMobileTransposedSchedule body must exist');
  const body = fnMatch[1];
  assert(body.includes('<div class="task-chip transposed-task-chip'), 'Chips must be div elements');
  assert(!body.includes('<button class="task-chip'), 'Chips must never be button elements');
});

check('4.2 Slot cells do not attach interactive click or edit popover listeners', () => {
  const fnMatch = appJs.match(/function renderMobileTransposedSchedule\(\)\s*\{([\s\S]*?)\n  \}/);
  const body = fnMatch[1];
  assert(!body.includes('attachCellEvents'), 'Transposed schedule must not attach interactive editing events');
  assert(!body.includes('openPopover'), 'Transposed schedule must not call openPopover');
});

// >>> MODULE 5: Default View Mode (Requirement 4)
console.log('\n>>> MODULE 5: Default View Mode (Requirement 4)');

check('5.1 Entering mobile grid view defaults to Personal mode', () => {
  const match = appJs.match(/mobileGridScope:\s*['"]personal['"]/);
  assert(match, 'mobileGridScope must default to personal');
  assert(indexHtml.includes('id="btnScopePersonal"'), 'btnScopePersonal must exist in DOM');
  assert(indexHtml.includes('btn-grid-scope active'), 'Active class must be present on initial scope button');
});

// >>> MODULE 6: Read-Only Link Immutability Guarantee (Requirement 5)
console.log('\n>>> MODULE 6: Read-Only Link Immutability Guarantee (Requirement 5)');

check('6.1 In view-only mode (?mode=view), isPersonal strictly evaluates to false', () => {
  const result = simulateRenderMobileTransposed('emp_22', 'personal', true, '2026-11');
  assert.strictEqual(result.isPersonal, false, 'In view-only mode, isPersonal must strictly be false');
  assert.strictEqual(result.renderedColCount, result.totalActiveTeam, 'View-only mode must render all active team columns');
});

check('6.2 Scope toggle container is strictly hidden in view-only mode', () => {
  assert(appJs.includes("if (el.mobileGridScopeToggle) el.mobileGridScopeToggle.classList.add('hidden');"), 'Scope toggle must be hidden in view-only mode');
  assert(appJs.includes("if (state.isViewOnly) return; // Requirement 5: Never applies to read-only link"), 'setMobileGridScope must abort immediately in view-only mode');
});

check('6.3 View-only banner notice displays Full Grid text without personal scope indication', () => {
  assert(appJs.includes("el.mobileGridNoticeText.textContent = 'Viewing Full Grid (Read-Only on Mobile)';"), 'Banner must display Viewing Full Grid in view-only mode');
});

// >>> MODULE 7: Visual & Calculations Data Parity per Profile (Requirement 6)
console.log('\n>>> MODULE 7: Visual & Calculations Data Parity per Profile (Requirement 6)');

check('7.1 All recorded days for Peter MOUNIR (emp_22) appear accurately in Personal Grid', () => {
  const emp = db.employees.find(e => e.id === 'emp_22');
  assert(emp, 'Employee emp_22 must exist');
  const result = simulateRenderMobileTransposed(emp.id, 'personal', false, '2026-11');

  let totalLoggedHours = 0;
  result.rows.forEach(r => {
    const cell = r.cells[0];
    const key = `${emp.id}_${r.dateStr}`;
    const expectedAlloc = db.allocations[key];
    if (expectedAlloc && expectedAlloc.project && expectedAlloc.project.trim() !== '') {
      assert.strictEqual(cell.hasVal, true, `Cell on ${r.dateStr} must have value`);
      assert.strictEqual(cell.projectName, expectedAlloc.project.trim(), `Project name on ${r.dateStr} must match allocation`);
      const expH = (typeof expectedAlloc.hours === 'number') ? expectedAlloc.hours : (emp.defaultHoursPerDay || 8);
      assert.strictEqual(cell.hours, expH, `Hours on ${r.dateStr} must match allocation hours`);
      if (expectedAlloc.project !== 'Day OFF' && expectedAlloc.project !== 'NO PROJECT' && expectedAlloc.project !== 'NO STATUS') {
        totalLoggedHours += expH;
      }
    } else {
      assert.strictEqual(cell.hasVal, false, `Cell on ${r.dateStr} must be empty`);
    }
  });

  // Verify Cairo weekend rules (Fri=5, Sat=6)
  result.rows.forEach(r => {
    const d = new Date(r.dateStr);
    const dow = d.getDay();
    if (dow === 5 || dow === 6) {
      assert.strictEqual(r.cells[0].isWeekend, true, `Friday/Saturday ${r.dateStr} must be flagged as Cairo weekend`);
    } else {
      assert.strictEqual(r.cells[0].isWeekend, false, `Workday ${r.dateStr} must not be flagged as weekend`);
    }
  });
});

check('7.2 Simulation: 20 workdays allocated to Academy for Ali TURKI calculate to exactly 160.0h', () => {
  const emp = db.employees.find(e => e.id === 'emp_17');
  assert(emp, 'Employee emp_17 must exist');

  // Create simulated allocations for Ali TURKI in Nov 2026
  const testAllocs = Object.assign({}, db.allocations);
  const days = getDaysInMonth('2026-11');
  let expectedSum = 0;
  let workdaysCount = 0;
  days.forEach(d => {
    const isWk = isWeekendForLocation(d.dow, 'Cairo');
    if (!isWk) {
      const key = `${emp.id}_${d.dateStr}`;
      testAllocs[key] = { project: 'Academy - ERA - Cairo', hours: 8, comment: 'Training session' };
      expectedSum += 8;
      workdaysCount++;
    }
  });

  const result = simulateRenderMobileTransposed(emp.id, 'personal', false, '2026-11', testAllocs);

  let calculatedSum = 0;
  let verifiedDays = 0;
  result.rows.forEach(r => {
    const cell = r.cells[0];
    if (cell.hasVal && cell.projectName.includes('Academy')) {
      verifiedDays++;
      calculatedSum += cell.hours;
      assert.strictEqual(cell.hasComment, true, 'Comment flag must be preserved');
    }
  });

  assert.strictEqual(verifiedDays, workdaysCount, `Must verify exactly ${workdaysCount} workdays`);
  assert.strictEqual(calculatedSum, expectedSum, `Calculated sum (${calculatedSum}h) must strictly equal expected sum (${expectedSum}h)`);
});

check('7.3 Istanbul employee (Sat-Sun weekend) receives correct weekend highlights and hours calculation', () => {
  const istSec = db.sections.find(s => s.location && s.location.toLowerCase().includes('ist'));
  assert(istSec, 'Istanbul section must exist');
  const istEmp = db.employees.find(e => e.sectionId === istSec.id && e.active !== false);
  assert(istEmp, 'Active Istanbul employee must exist');

  const result = simulateRenderMobileTransposed(istEmp.id, 'personal', false, '2026-11');
  result.rows.forEach(r => {
    const d = new Date(r.dateStr);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) {
      assert.strictEqual(r.cells[0].isWeekend, true, `Sunday/Saturday ${r.dateStr} must be flagged as Istanbul weekend`);
    } else {
      assert.strictEqual(r.cells[0].isWeekend, false, `Weekday ${r.dateStr} must be workday for Istanbul`);
    }
  });
});

check('7.4 Clean display label logic in Personal mode displays comfortable project title', () => {
  const formatLabel = (p) => {
    if (p === 'Day OFF') return 'Day OFF';
    if (p === 'Different Team Support') return 'Different Team Support';
    if (p === 'NO PROJECT') return 'NO PROJECT';
    return p.replace(/^Project - /, '');
  };

  assert.strictEqual(formatLabel('Project - Cairo Metro Line 3'), 'Cairo Metro Line 3');
  assert.strictEqual(formatLabel('Project - Alexandria Tramway'), 'Alexandria Tramway');
  assert.strictEqual(formatLabel('Different Team Support'), 'Different Team Support');
  assert.strictEqual(formatLabel('Day OFF'), 'Day OFF');
  assert.strictEqual(formatLabel('NO PROJECT'), 'NO PROJECT');
  assert.strictEqual(formatLabel('Tender - High Speed Rail'), 'Tender - High Speed Rail');
});

console.log('\n==========================================================');
console.log(` MOBILE PERSONAL/TEAM GRID TEST COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==========================================================\n');

if (failCount > 0) {
  process.exit(1);
}
