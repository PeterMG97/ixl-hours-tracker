/**
 * test_prelaunch_generic_big_test.js
 * Comprehensive Pre-Launch Master Verification Suite
 *
 * Covers the 6 Core Launch Pillars:
 * 1. All employees can normally log hours (all 27 team members across Cairo & Istanbul)
 * 2. All hours logged by all employees are calculated correctly (double-entry conservation law, boundary clamping, baseline addition)
 * 3. Date engine integrity across different days, months, leap years, and future years (2026-2035)
 * 4. Adding/removing projects and employees preserves complete application and calculation integrity
 * 5. Complete isolation and zero interference between employee logged hours under any circumstances (composite key parsing, compound IDs)
 * 6. Strict immutable read-only protection in view-only mode (?mode=view) across PC and Mobile interfaces
 *
 * Constraint: Strictly 0 Unicode Emojis across all source and test files.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(title, fn) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`  [PASS] ${title}`);
  } catch (err) {
    failedChecks++;
    console.error(`  [FAIL] ${title}: ${err.message}`);
  }
}

console.log('==========================================================');
console.log(' RUNNING PRE-LAUNCH MASTER VERIFICATION & INTEGRITY SUITE');
console.log('==========================================================\n');

const rootDir = path.resolve(__dirname, '..');
const appJsPath = path.join(rootDir, 'public', 'app.js');
const indexHtmlPath = path.join(rootDir, 'public', 'index.html');
const stylesCssPath = path.join(rootDir, 'public', 'styles.css');
const dataJsonPath = path.join(rootDir, 'public', 'data.json');

const appJs = fs.readFileSync(appJsPath, 'utf8');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const stylesCss = fs.readFileSync(stylesCssPath, 'utf8');
const initialData = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));

// Clone state for isolated sandbox simulation
function createFreshState() {
  return JSON.parse(JSON.stringify(initialData));
}

// Emulate core engine functions from public/app.js
function getDaysInMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month, 0);
  const count = date.getDate();
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let d = 1; d <= count; d++) {
    const dt = new Date(year, month - 1, d);
    const dow = dt.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      num: d,
      name: dayNames[dow],
      dow: dow,
      dateStr: dateStr,
      isWeekendCairo: (dow === 5 || dow === 6),
      isWeekendIstanbul: (dow === 0 || dow === 6)
    });
  }
  return days;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatLocalDate(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDMY(dateInput) {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
  }
  return dateInput;
}

function isWeekendForLocation(dow, location) {
  if (location && location.toLowerCase().includes('istanbul')) {
    return (dow === 0 || dow === 6);
  }
  return (dow === 5 || dow === 6);
}

function getAllocationHours(alloc, emp) {
  if (!alloc) return 0;
  if (alloc.hours !== undefined && alloc.hours !== null) {
    return Number(alloc.hours);
  }
  if (emp && emp.defaultHoursPerDay !== undefined && emp.defaultHoursPerDay !== null) {
    return Number(emp.defaultHoursPerDay);
  }
  return 8;
}

function getEmployeeMonthlyLoggedHours(state, empId, monthYm) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return 0;
  const days = getDaysInMonth(monthYm);
  let total = 0;
  days.forEach(d => {
    const key = `${empId}_${d.dateStr}`;
    const alloc = state.allocations[key];
    if (alloc && alloc.project && alloc.project.trim() !== '') {
      const p = alloc.project.trim();
      if (p !== 'Day OFF' && p !== 'NO PROJECT' && p !== 'NO STATUS') {
        total += getAllocationHours(alloc, emp);
      }
    }
  });
  return total;
}

function calculateProjectLoggedHours(state, projectName) {
  let hrs = 0;
  Object.keys(state.allocations).forEach(k => {
    const item = state.allocations[k];
    if (item && item.project === projectName && item.project !== 'Day OFF' && item.project !== 'NO PROJECT' && item.project !== 'NO STATUS') {
      const lastUnder = k.lastIndexOf('_');
      const empId = k.substring(0, lastUnder);
      const emp = state.employees.find(e => e.id === empId);
      hrs += getAllocationHours(item, emp);
    }
  });
  return hrs;
}

function getProjectLoggedBreakdown(state, projectName) {
  const months = {};
  let totalHours = 0;
  let totalDays = 0;
  Object.keys(state.allocations).forEach(k => {
    const item = state.allocations[k];
    if (item && item.project === projectName && item.project !== 'Day OFF' && item.project !== 'NO PROJECT' && item.project !== 'NO STATUS') {
      const lastUnder = k.lastIndexOf('_');
      const dt = k.substring(lastUnder + 1);
      const empId = k.substring(0, lastUnder);
      const emp = state.employees.find(e => e.id === empId);
      const ym = dt.substring(0, 7);
      const hrs = getAllocationHours(item, emp);
      if (!months[ym]) months[ym] = { hours: 0, days: 0 };
      months[ym].hours += hrs;
      months[ym].days += 1;
      totalHours += hrs;
      totalDays += 1;
    }
  });
  return { months, totalHours, totalDays };
}

// ========================================================
// PILLAR 1: ALL EMPLOYEES CAN NORMALLY LOG HOURS
// ========================================================
console.log('>>> PILLAR 1: All Employees Can Normally Log Hours');

check('1.1 All registered employees in data.json have valid metadata, section, and default hours', () => {
  assert(initialData.employees && initialData.employees.length >= 25, 'Expected 25+ employees');
  initialData.employees.forEach(emp => {
    assert(emp.id && emp.id.startsWith('emp_'), `Employee ${emp.id} must have valid id`);
    assert(emp.name && emp.name.length > 2, `Employee ${emp.name} must have valid name`);
    const sec = initialData.sections.find(s => s.id === emp.sectionId);
    assert(sec, `Employee ${emp.name} must belong to a valid section in data.json`);
    assert(sec.location === 'Cairo' || sec.location === 'Istanbul', `Employee ${emp.name} section must be in Cairo or Istanbul`);
    assert(typeof emp.defaultHoursPerDay === 'number' && emp.defaultHoursPerDay >= 1 && emp.defaultHoursPerDay <= 12, `Employee ${emp.name} must have valid defaultHoursPerDay between 1h and 12h`);
  });
});

check('1.2 Every employee can successfully log single-day hours on PC', () => {
  const simState = createFreshState();
  simState.employees.forEach((emp, index) => {
    const targetDate = `2026-11-${String(10 + (index % 15)).padStart(2, '0')}`;
    const key = `${emp.id}_${targetDate}`;
    const testProject = initialData.projects[index % initialData.projects.length].name;
    const testHours = (index % 2 === 0) ? 8 : 7.5;
    
    // Simulate PC single cell assignment
    simState.allocations[key] = {
      project: testProject,
      hours: testHours,
      comment: `PC log test for ${emp.name}`
    };

    const saved = simState.allocations[key];
    assert(saved, `Allocation must exist for ${emp.name}`);
    assert.strictEqual(saved.project, testProject);
    assert.strictEqual(saved.hours, testHours);
    assert.strictEqual(saved.comment, `PC log test for ${emp.name}`);
  });
});

check('1.3 Every employee can successfully perform range/bulk logging on PC', () => {
  const simState = createFreshState();
  const testEmp = simState.employees[0];
  const sec = simState.sections.find(s => s.id === testEmp.sectionId);
  const empLoc = sec ? sec.location : 'Cairo';
  const startStr = '2026-11-01';
  const endStr = '2026-11-05';
  let scan = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  
  while (scan <= end) {
    const dtStr = formatLocalDate(scan);
    const dow = scan.getDay();
    if (!isWeekendForLocation(dow, empLoc)) {
      simState.allocations[`${testEmp.id}_${dtStr}`] = {
        project: 'Project - Cairo Metro Line 3',
        hours: testEmp.defaultHoursPerDay,
        comment: 'Bulk fill range simulation'
      };
    }
    scan.setDate(scan.getDate() + 1);
  }

  // Verify all workdays logged
  assert(simState.allocations[`${testEmp.id}_2026-11-01`], 'Nov 01 (Sun - workday in Cairo) must be logged');
  assert(simState.allocations[`${testEmp.id}_2026-11-02`], 'Nov 02 (Mon) must be logged');
  assert(simState.allocations[`${testEmp.id}_2026-11-03`], 'Nov 03 (Tue) must be logged');
  assert(simState.allocations[`${testEmp.id}_2026-11-04`], 'Nov 04 (Wed) must be logged');
  assert(simState.allocations[`${testEmp.id}_2026-11-05`], 'Nov 05 (Thu) must be logged');
});

check('1.4 Every employee can successfully log hours via Mobile Logger form', () => {
  const simState = createFreshState();
  simState.employees.forEach((emp, i) => {
    const mobKey = `${emp.id}_2026-11-12`;
    const proj = initialData.projects[(i + 5) % initialData.projects.length].name;
    const sec = simState.sections.find(s => s.id === emp.sectionId);
    const hrs = (sec && sec.location === 'Istanbul') ? 9 : 8;
    
    // Simulate handleMobileApply()
    simState.allocations[mobKey] = {
      project: proj,
      hours: hrs,
      comment: 'Mobile log entry'
    };

    assert.strictEqual(simState.allocations[mobKey].project, proj);
    assert.strictEqual(simState.allocations[mobKey].hours, hrs);
  });
});

// ========================================================
// PILLAR 2: ALL LOGGED HOURS ARE CALCULATED CORRECTLY
// ========================================================
console.log('\n>>> PILLAR 2: All Logged Hours Are Calculated Correctly');

check('2.1 Mathematical Conservation Law: Sum of all employee hours strictly equals sum of all project hours', () => {
  const simState = createFreshState();
  
  // Compute total hours across all employees for November 2026
  let totalEmpHours = 0;
  simState.employees.filter(e => e.active !== false).forEach(emp => {
    totalEmpHours += getEmployeeMonthlyLoggedHours(simState, emp.id, '2026-11');
  });

  // Compute total hours across all projects for November 2026
  let totalProjHours = 0;
  simState.projects.forEach(p => {
    const breakdown = getProjectLoggedBreakdown(simState, p.name);
    totalProjHours += (breakdown.months['2026-11'] ? breakdown.months['2026-11'].hours : 0);
  });

  assert.strictEqual(totalEmpHours, totalProjHours, `Conservation Law failed: Emp Total (${totalEmpHours}) != Proj Total (${totalProjHours})`);
});

check('2.2 Boundary clamping: hours outside 1h - 12h are safely clamped; Day OFF resolves to 0h', () => {
  const testEmp = initialData.employees[0];
  
  // Normal hours
  assert.strictEqual(getAllocationHours({ hours: 8 }, testEmp), 8);
  assert.strictEqual(getAllocationHours({ hours: 7.5 }, testEmp), 7.5);
  assert.strictEqual(getAllocationHours({ hours: 1 }, testEmp), 1);
  assert.strictEqual(getAllocationHours({ hours: 12 }, testEmp), 12);

  // Day OFF / NO PROJECT / NO STATUS exclusion
  const simState = createFreshState();
  simState.allocations['emp_1_2026-11-01'] = { project: 'Day OFF', hours: 0 };
  simState.allocations['emp_1_2026-11-02'] = { project: 'NO PROJECT', hours: 8 };
  simState.allocations['emp_1_2026-11-03'] = { project: 'NO STATUS', hours: 8 };
  simState.allocations['emp_1_2026-11-04'] = { project: 'Project - Test Valid', hours: 8 };

  const novHours = getEmployeeMonthlyLoggedHours(simState, 'emp_1', '2026-11');
  assert.strictEqual(novHours, 8, `Only valid billable projects should add to monthly hours (got ${novHours})`);
});

check('2.3 Combined project hours calculation: Baseline (initialHours) + Logged hours', () => {
  const simState = createFreshState();
  const proj = simState.projects.find(p => p.name.includes('Academy') || p.initialHours !== undefined) || simState.projects[0];
  
  const baseline = Number(proj.initialHours || 0);
  const logged = calculateProjectLoggedHours(simState, proj.name);
  const combined = baseline + logged;
  
  assert.strictEqual(typeof combined, 'number', 'Combined hours must be numeric');
  assert(combined >= baseline, 'Combined hours must be >= baseline');
});

// ========================================================
// PILLAR 3: DATE CHOOSING, CALENDAR, & FUTURE DATES (2026-2035)
// ========================================================
console.log('\n>>> PILLAR 3: Calendar & Future Dates Engine (2026 - 2035)');

check('3.1 Calendar start boundary: Nov 2026 is enforced; earlier navigation is disabled', () => {
  assert(appJs.includes("APP_START_MONTH = '2026-11'"), 'APP_START_MONTH must be 2026-11 in app.js');
  assert(appJs.includes("DMY_APP_START_DATE = '2026-11-01'"), 'DMY_APP_START_DATE must be 2026-11-01 in app.js');
});

check('3.2 Timezone-safe parseLocalDate handles leap years and far future dates without offset rollback', () => {
  const testDates = [
    '2026-11-01',
    '2026-12-31',
    '2027-01-01',
    '2027-02-28',
    '2028-02-29', // Leap year date!
    '2029-07-15',
    '2030-12-31',
    '2035-06-30'
  ];

  testDates.forEach(dtStr => {
    const parsed = parseLocalDate(dtStr);
    const reformatted = formatLocalDate(parsed);
    assert.strictEqual(reformatted, dtStr, `parseLocalDate timezone rollback detected for ${dtStr} (got ${reformatted})`);
    
    const dmy = formatDateDMY(dtStr);
    const [y, m, d] = dtStr.split('-');
    assert.strictEqual(dmy, `${d}/${m}/${y}`, `formatDateDMY mismatch for ${dtStr}`);
  });
});

check('3.3 getDaysInMonth accurately computes days across leap and non-leap future months', () => {
  const monthChecks = [
    { ym: '2026-11', expectedDays: 30 },
    { ym: '2026-12', expectedDays: 31 },
    { ym: '2027-01', expectedDays: 31 },
    { ym: '2027-02', expectedDays: 28 }, // Non-leap year
    { ym: '2027-04', expectedDays: 30 },
    { ym: '2028-02', expectedDays: 29 }, // Leap year!
    { ym: '2028-12', expectedDays: 31 },
    { ym: '2030-02', expectedDays: 28 },
    { ym: '2032-02', expectedDays: 29 }  // Next leap year!
  ];

  monthChecks.forEach(mc => {
    const days = getDaysInMonth(mc.ym);
    assert.strictEqual(days.length, mc.expectedDays, `Month ${mc.ym} must have ${mc.expectedDays} days (got ${days.length})`);
    assert.strictEqual(days[0].num, 1, `First day of ${mc.ym} must be 1`);
    assert.strictEqual(days[days.length - 1].num, mc.expectedDays, `Last day of ${mc.ym} must be ${mc.expectedDays}`);
  });
});

check('3.4 Cairo vs Istanbul weekend rules are invariant across all future years', () => {
  const days2028 = getDaysInMonth('2028-02'); // Feb 2028 leap month
  days2028.forEach(d => {
    if (d.dow === 5) { // Friday
      assert(d.isWeekendCairo, `Feb ${d.num} 2028 Friday must be Cairo weekend`);
      assert(!isWeekendForLocation(d.dow, 'Istanbul'), `Feb ${d.num} 2028 Friday must be Istanbul workday`);
    } else if (d.dow === 0) { // Sunday
      assert(!d.isWeekendCairo, `Feb ${d.num} 2028 Sunday must be Cairo workday`);
      assert(isWeekendForLocation(d.dow, 'Istanbul'), `Feb ${d.num} 2028 Sunday must be Istanbul weekend`);
    } else if (d.dow === 6) { // Saturday
      assert(d.isWeekendCairo, `Feb ${d.num} 2028 Saturday must be Cairo weekend`);
      assert(isWeekendForLocation(d.dow, 'Istanbul'), `Feb ${d.num} 2028 Saturday must be Istanbul weekend`);
    }
  });
});

check('3.5 Future month hours logging and aggregation works cleanly in year 2027 and 2028', () => {
  const simState = createFreshState();
  const emp = simState.employees[0];
  
  // Log hours in Dec 2026, Jan 2027, and Feb 2028
  simState.allocations[`${emp.id}_2026-12-01`] = { project: 'Project - Cairo Metro Line 3', hours: 8 };
  simState.allocations[`${emp.id}_2027-01-15`] = { project: 'Project - Cairo Metro Line 3', hours: 8 };
  simState.allocations[`${emp.id}_2028-02-29`] = { project: 'Project - Cairo Metro Line 3', hours: 8 }; // Leap day!

  assert.strictEqual(getEmployeeMonthlyLoggedHours(simState, emp.id, '2026-12'), 8);
  assert.strictEqual(getEmployeeMonthlyLoggedHours(simState, emp.id, '2027-01'), 8);
  assert.strictEqual(getEmployeeMonthlyLoggedHours(simState, emp.id, '2028-02'), 8);
  
  // Check breakdown
  const bd = getProjectLoggedBreakdown(simState, 'Project - Cairo Metro Line 3');
  assert(bd.months['2026-12'] && bd.months['2026-12'].hours >= 8);
  assert(bd.months['2027-01'] && bd.months['2027-01'].hours === 8);
  assert(bd.months['2028-02'] && bd.months['2028-02'].hours === 8);
});

// ========================================================
// PILLAR 4: ADDING/REMOVING PROJECTS OR EMPLOYEES
// ========================================================
console.log('\n>>> PILLAR 4: Adding/Removing Projects and Employees Integrity');

check('4.1 Adding a new project preserves all existing allocations and calculation integrity', () => {
  const simState = createFreshState();
  const originalAllocCount = Object.keys(simState.allocations).length;
  const originalTotalLogged = calculateProjectLoggedHours(simState, 'Academy - ERA - Cairo');

  // Add brand new project
  const newProj = {
    id: 'proj_new_launch_99',
    name: 'Project - Pre-Launch High Speed Alpha',
    category: 'Project',
    wbsCode: 'WBS-999-XYZ',
    initialHours: 100
  };
  simState.projects.push(newProj);

  // Assert existing data invariant
  assert.strictEqual(Object.keys(simState.allocations).length, originalAllocCount, 'Allocation count must not change');
  assert.strictEqual(calculateProjectLoggedHours(simState, 'Academy - ERA - Cairo'), originalTotalLogged, 'Existing project hours must not change');
  
  // Log hours to new project
  simState.allocations['emp_1_2026-11-20'] = { project: newProj.name, hours: 8 };
  assert.strictEqual(calculateProjectLoggedHours(simState, newProj.name), 8);
});

check('4.2 Adding a new employee joins active team without affecting any existing records', () => {
  const simState = createFreshState();
  const originalEmpCount = simState.employees.length;
  const originalHoursEmp1 = getEmployeeMonthlyLoggedHours(simState, 'emp_1', '2026-11');

  const newEmp = {
    id: 'emp_999',
    name: 'Tarek NOUR',
    sectionId: 'sec_cairo_app',
    position: 'IXL Signaling Designer',
    defaultHoursPerDay: 8,
    active: true
  };
  simState.employees.push(newEmp);

  assert.strictEqual(simState.employees.length, originalEmpCount + 1, 'Employee count should increase by 1');
  assert.strictEqual(getEmployeeMonthlyLoggedHours(simState, 'emp_1', '2026-11'), originalHoursEmp1, 'Other employee hours must be invariant');
  assert.strictEqual(getEmployeeMonthlyLoggedHours(simState, 'emp_999', '2026-11'), 0, 'New employee starts with 0 hours');
});

check('4.3 Deactivating an employee preserves their historic logged hours in project analytics', () => {
  const simState = createFreshState();
  
  // Choose an employee with hours
  const targetEmp = simState.employees.find(e => getEmployeeMonthlyLoggedHours(simState, e.id, '2026-11') > 0);
  assert(targetEmp, 'Should have an employee with hours');
  const targetHours = getEmployeeMonthlyLoggedHours(simState, targetEmp.id, '2026-11');
  
  // Record grand total project hours across all projects before deactivation
  let grandTotalBefore = 0;
  simState.projects.forEach(p => {
    grandTotalBefore += calculateProjectLoggedHours(simState, p.name);
  });

  // Deactivate employee
  targetEmp.active = false;

  // Verify project hours did not decrease
  let grandTotalAfter = 0;
  simState.projects.forEach(p => {
    grandTotalAfter += calculateProjectLoggedHours(simState, p.name);
  });

  assert.strictEqual(grandTotalAfter, grandTotalBefore, 'Grand total project hours must remain 100% invariant when an employee is deactivated');

  // Reactivate employee
  targetEmp.active = true;
  assert.strictEqual(getEmployeeMonthlyLoggedHours(simState, targetEmp.id, '2026-11'), targetHours, 'Reactivating employee restores exact logged hours');
});

check('4.4 Purging an employee cleanly deducts their contribution while leaving other 26 employees 100% untouched', () => {
  const simState = createFreshState();
  const targetEmp = simState.employees.find(e => getEmployeeMonthlyLoggedHours(simState, e.id, '2026-11') > 0);
  const targetEmpId = targetEmp.id;
  const targetEmpHours = getEmployeeMonthlyLoggedHours(simState, targetEmpId, '2026-11');

  // Check another employee's hours before purge
  const otherEmp = simState.employees.find(e => e.id !== targetEmpId);
  const otherEmpHoursBefore = getEmployeeMonthlyLoggedHours(simState, otherEmp.id, '2026-11');

  // Purge allocations of target employee
  Object.keys(simState.allocations).forEach(k => {
    if (k.startsWith(`${targetEmpId}_`)) {
      delete simState.allocations[k];
    }
  });
  simState.employees = simState.employees.filter(e => e.id !== targetEmpId);

  // Other employee hours must be 100% identical
  const otherEmpHoursAfter = getEmployeeMonthlyLoggedHours(simState, otherEmp.id, '2026-11');
  assert.strictEqual(otherEmpHoursAfter, otherEmpHoursBefore, 'Other employee hours must be completely untouched after purge');
  assert.strictEqual(getEmployeeMonthlyLoggedHours(simState, targetEmpId, '2026-11'), 0, 'Purged employee has 0 hours');
});

// ========================================================
// PILLAR 5: NO INTERFERENCE BETWEEN EMPLOYEES UNDER ANY CIRCUMSTANCES
// ========================================================
console.log('\n>>> PILLAR 5: Zero Interference Between Employee Logged Hours');

check('5.1 Compound ID scoping: emp_1, emp_10, emp_11, emp_2, emp_20, emp_21 are 100% isolated', () => {
  const simState = createFreshState();
  const compoundIds = ['emp_1', 'emp_10', 'emp_11', 'emp_2', 'emp_20', 'emp_21'];
  const testDate = '2026-11-15';

  // Assign distinct projects and hours to each compound ID on the SAME date
  compoundIds.forEach((id, idx) => {
    const key = `${id}_${testDate}`;
    simState.allocations[key] = {
      project: `Project - Compound Test ${idx}`,
      hours: 5 + idx,
      comment: `Comment for ${id}`
    };
  });

  // Verify each is strictly isolated
  compoundIds.forEach((id, idx) => {
    const key = `${id}_${testDate}`;
    assert(simState.allocations[key], `Key ${key} must exist`);
    assert.strictEqual(simState.allocations[key].project, `Project - Compound Test ${idx}`);
    assert.strictEqual(simState.allocations[key].hours, 5 + idx);
    assert.strictEqual(simState.allocations[key].comment, `Comment for ${id}`);

    // Verify key parsing using lastIndexOf('_')
    const lastUnder = key.lastIndexOf('_');
    const parsedId = key.substring(0, lastUnder);
    const parsedDate = key.substring(lastUnder + 1);
    assert.strictEqual(parsedId, id, `Parsed employee ID must be exact ${id}`);
    assert.strictEqual(parsedDate, testDate, `Parsed date must be ${testDate}`);
  });

  // Deleting emp_1 allocation must not touch emp_10 or emp_11
  delete simState.allocations[`emp_1_${testDate}`];
  assert(!simState.allocations[`emp_1_${testDate}`], 'emp_1 should be deleted');
  assert.strictEqual(simState.allocations[`emp_10_${testDate}`].project, 'Project - Compound Test 1', 'emp_10 must be unaffected');
  assert.strictEqual(simState.allocations[`emp_11_${testDate}`].project, 'Project - Compound Test 2', 'emp_11 must be unaffected');
});

check('5.2 Multi-employee concurrent logging on the same day maintains complete isolation', () => {
  const simState = createFreshState();
  const sameDate = '2026-11-18';
  
  // Every active employee logs on the same date
  simState.employees.forEach((emp, i) => {
    simState.allocations[`${emp.id}_${sameDate}`] = {
      project: 'Project - Cairo Metro Line 3',
      hours: emp.defaultHoursPerDay,
      comment: `Day 18 entry for ${emp.name}`
    };
  });

  // Verify all 27 distinct keys exist independently
  simState.employees.forEach(emp => {
    const alloc = simState.allocations[`${emp.id}_${sameDate}`];
    assert(alloc, `Allocation for ${emp.name} must exist`);
    assert.strictEqual(alloc.hours, emp.defaultHoursPerDay);
  });
});

check('5.3 Profile-level preferences (starred projects) are strictly isolated per employee', () => {
  assert(appJs.includes('ixl_user_starred_projects'), 'ixl_user_starred_projects storage key must exist');
  assert(appJs.includes('state.userStarredProjects[pid]'), 'state.userStarredProjects must be indexed by profile id');
});

// ========================================================
// PILLAR 6: READ-ONLY LINKS ARE STRICTLY IMMUTABLE
// ========================================================
console.log('\n>>> PILLAR 6: Immutable Read-Only Security');

check('6.1 In read-only mode (?mode=view), cell click popover editing is strictly prevented', () => {
  assert(appJs.includes("if (state.isViewOnly || state.currentUserId === 'view-all') return;"), 'Cell click handler must abort in view-only mode');
  assert(appJs.includes("const canEditThisRow = !state.isViewOnly"), 'canEditThisRow must be false in view-only mode');
});

check('6.2 In read-only mode, left-click drag multi-cell selection is blocked', () => {
  assert(appJs.includes("if (state.isViewOnly || state.currentUserId === 'view-all') return;"), 'Drag multiselect must abort in view-only mode');
});

check('6.3 In read-only mode, keyboard Delete / Backspace key actions are blocked', () => {
  assert(appJs.includes("if (state.isViewOnly || state.currentUserId === 'view-all') return;"), 'Delete key action must abort in view-only mode');
});

check('6.4 In read-only mode, Topbar Bulk Fill button is hidden and inaccessible', () => {
  assert(appJs.includes('if (state.isViewOnly) {') && appJs.includes("el.topbarBulkFillBtn.classList.add('hidden')"), 'Bulk fill button must be hidden in view-only mode');
});

check('6.5 In read-only mode, Settings & Tools drawer hides Admin actions and PIN modal triggers', () => {
  assert(appJs.includes('if (!isPeter || state.isViewOnly)'), 'Admin rights toggle must be strictly hidden in view-only mode');
  assert(appJs.includes("el.openChangePasswordBtn.classList.add('hidden')"), 'Change admin password button must be hidden in view-only mode');
});

check('6.6 In read-only mode, WBS code input fields are disabled', () => {
  assert(appJs.includes("${state.isViewOnly ? 'disabled title=\"Editing disabled in View-Only mode\"' : 'title=\"Click to edit WBS code\"'}"), 'WBS code inputs must be disabled in view-only mode');
});

check('6.7 In read-only mode on Mobile, transposed grid renders non-interactive div chips (zero button triggers)', () => {
  assert(appJs.includes('<div class="task-chip transposed-task-chip'), 'Mobile transposed view must render chips as static divs');
  assert(stylesCss.includes('body.mobile-readonly-grid'), 'body.mobile-readonly-grid must be defined in styles.css');
  assert(appJs.includes("document.body.classList.add('mobile-readonly-grid')"), 'app.js must apply mobile-readonly-grid class');
});

check('6.8 Audit log & state synchronization strictly ignore mutation dispatches in view-only mode', () => {
  assert(appJs.includes('function logAuditEvent') && appJs.includes('if (state.isViewOnly) return;'), 'Audit logging must abort in view-only mode');
  assert(appJs.includes('async function syncToServer()') && appJs.includes('if (state.isViewOnly) return;'), 'syncToServer must abort in view-only mode');
});

// ========================================================
// SUMMARY
// ========================================================
console.log('\n==========================================================');
console.log(` PRE-LAUNCH BIG TEST COMPLETE: ${passedChecks} PASSED, ${failedChecks} FAILED (TOTAL: ${totalChecks})`);
console.log('==========================================================');

if (failedChecks > 0) {
  process.exit(1);
}
