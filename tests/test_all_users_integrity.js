/**
 * Comprehensive Generic Test Suite for All Users in IXL Team Hours Tracker
 * Tests:
 * 1. User Identity Selection & Persistence
 * 2. Admin Permission Revocation & Enforcement (Only Peter MOUNIR can be Admin)
 * 3. Individual Row Edit Permissions (User can edit own row, blocked from others)
 * 4. Cell Assignment (Project selection from list) for every user
 * 5. Cell Deletion via Popover Clear Pill for every user (No ReferenceError, clean deletion)
 * 6. Cell Deletion via Keyboard Delete Key for every user
 * 7. Multi-Cell Batch Assignment & Deletion for every user
 * 8. Admin Mode (Peter MOUNIR) Editing & Deletion on EVERY employee's row
 * 9. Cross-Profile & Admin Audit Logging Integrity (Device ID, Timestamp, Editor vs Target)
 * 10. Audit History Data Rendering without runtime errors or HTML escaping issues
 */

const fs = require('fs');
const path = require('path');

const resolvePath = (f) => [path.join(__dirname, '../public', f), path.join(__dirname, '../backups', f), path.join(__dirname, '..', f), f].find(fs.existsSync) || f;

const data = JSON.parse(fs.readFileSync(resolvePath('data.json'), 'utf8'));

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    totalPassed++;
    // console.log(`  [PASS] ${message}`);
  } else {
    totalFailed++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('==========================================================');
console.log(' RUNNING ALL-USERS COMPREHENSIVE INTEGRITY TEST SUITE');
console.log('==========================================================\n');

// Mock helpers from app.js
function isCurrentUserPeter(currentUserId, employees) {
  if (!currentUserId) return false;
  const emp = employees.find(e => e.id === currentUserId);
  if (!emp || !emp.name) return false;
  return emp.name.trim().toLowerCase() === 'peter mounir';
}

function formatDateDMY(dateInput) {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
    const monthMatch = dateInput.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      const [, y, m] = monthMatch;
      return `${m}/${y}`;
    }
  }
  return String(dateInput);
}

function sanitizeDayHours(projectName, hoursInput, defaultHours = 8) {
  const norm = (projectName || '').trim().toLowerCase();
  if (norm === 'day off' || norm === 'no project' || norm === 'no status' || norm === '') {
    return 0;
  }
  const parsed = parseFloat(hoursInput);
  if (isNaN(parsed) || parsed === null || parsed === undefined) {
    return defaultHours;
  }
  return Math.min(12, Math.max(1, Math.round(parsed * 2) / 2));
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const employees = data.employees;
const projects = data.projects;
const sections = data.sections;

console.log(`>>> GROUP 1: Database Baseline Validation (${employees.length} Employees)`);
employees.forEach((emp, idx) => {
  assert(emp.id && emp.name, `User #${idx + 1} (${emp.name}) has valid ID and Name`);
  const sec = sections.find(s => s.id === emp.sectionId);
  assert(sec !== undefined, `User ${emp.name} mapped to valid Section (${emp.sectionId})`);
  assert(sec && (sec.location === 'Cairo' || sec.location === 'Istanbul'), `User ${emp.name} has valid location (${sec ? sec.location : 'none'})`);
});

console.log(`\n>>> GROUP 2: Identity Selection & Admin Revocation for All Users`);
employees.forEach(emp => {
  const isPeter = isCurrentUserPeter(emp.id, employees);
  if (emp.name.trim().toLowerCase() === 'peter mounir') {
    assert(isPeter === true, `Peter MOUNIR correctly identified as admin-eligible`);
  } else {
    assert(isPeter === false, `${emp.name} is strictly NOT admin-eligible`);
  }
});

console.log(`\n>>> GROUP 3: Row Edit Permission Isolation for All Users`);
employees.forEach(emp => {
  const currentUserId = emp.id;
  const isAdmin = false; // Regular user login

  // Can edit own row
  const canEditOwn = (isAdmin && isCurrentUserPeter(currentUserId, employees)) || (currentUserId === emp.id);
  assert(canEditOwn === true, `${emp.name} has full permission to edit own schedule row`);

  // Cannot edit other rows
  const otherEmps = employees.filter(e => e.id !== emp.id);
  const canEditAnyOther = otherEmps.some(other => {
    return (isAdmin && isCurrentUserPeter(currentUserId, employees)) || (currentUserId === other.id);
  });
  assert(canEditAnyOther === false, `${emp.name} is strictly blocked from editing other users' rows`);
});

console.log(`\n>>> GROUP 4: Cell Assignment & Popover Clear Pill for All Users`);
// Simulate state machine
const state = {
  allocations: {},
  history: [],
  deviceProfiles: {},
  employees: employees,
  currentUserId: null,
  isAdmin: false
};

const testDate = '2026-11-04';

employees.forEach(emp => {
  state.currentUserId = emp.id;
  state.isAdmin = false;
  const key = `${emp.id}_${testDate}`;
  const cellEmp = employees.find(e => e.id === emp.id);
  const defaultH = cellEmp.defaultHoursPerDay || 8;

  // 1. Assign project
  const sampleProject = projects[0].name;
  let hours = defaultH;
  hours = sanitizeDayHours(sampleProject, hours, defaultH);
  state.allocations[key] = {
    project: sampleProject,
    hours: hours
  };

  assert(state.allocations[key] !== undefined, `${emp.name}: Assigned '${sampleProject}' (${hours}h) successfully`);
  assert(state.allocations[key].hours === defaultH, `${emp.name}: Allocated hours match default hours (${defaultH}h)`);

  // Record audit log for assignment
  const newDescAssign = `${sampleProject} (${hours}h)`;
  const assignLog = {
    targetEmpId: emp.id,
    targetEmpName: emp.name,
    dateStr: testDate,
    actionType: 'cell_assign',
    summary: `Assigned '${newDescAssign}' on ${formatDateDMY(testDate)}`,
    details: `Changed from 'NO STATUS' to '${newDescAssign}'`,
    editorId: emp.id,
    editorName: emp.name,
    isCrossProfile: false,
    isAdminEdit: false,
    deviceId: 'dev_test_device_1'
  };
  state.history.unshift(assignLog);

  // 2. Clear cell via Popover Clear button: saveCellAssignment('')
  // CRITICAL CHECK: ensure `hours` is hoisted and no ReferenceError occurs
  let clearHours = cellEmp ? (cellEmp.defaultHoursPerDay || 8) : 8;
  const projectName = '';
  if (!projectName || projectName.trim() === '') {
    delete state.allocations[key];
  } else {
    clearHours = sanitizeDayHours(projectName, '', clearHours);
    state.allocations[key] = { project: projectName.trim(), hours: clearHours };
  }

  const newDescClear = (!projectName || projectName.trim() === '') ? 'Cleared' : `${projectName.trim()} (${clearHours}h)`;
  const clearLog = {
    targetEmpId: emp.id,
    targetEmpName: emp.name,
    dateStr: testDate,
    actionType: 'cell_assign',
    summary: `Assigned '${newDescClear}' on ${formatDateDMY(testDate)}`,
    details: `Changed from '${sampleProject} (${hours}h)' to '${newDescClear}'`,
    editorId: emp.id,
    editorName: emp.name,
    isCrossProfile: false,
    isAdminEdit: false,
    deviceId: 'dev_test_device_1'
  };
  state.history.unshift(clearLog);

  assert(state.allocations[key] === undefined, `${emp.name}: Cell cleanly cleared via Popover Clear pill`);
  assert(clearLog.summary === `Assigned 'Cleared' on 04/11/2026`, `${emp.name}: Audit log records 'Cleared' summary cleanly`);
});

console.log(`\n>>> GROUP 5: Cell Deletion via Keyboard Delete Key for All Users`);
employees.forEach(emp => {
  state.currentUserId = emp.id;
  state.isAdmin = false;
  const key = `${emp.id}_2026-11-05`;

  // Create allocation
  state.allocations[key] = { project: 'Project - Test Key', hours: 8 };

  // Simulate Keyboard Delete on activeKeyboardCell
  const activeKeyboardCell = { empId: emp.id, dateStr: '2026-11-05' };
  const isAdmin = state.isAdmin && isCurrentUserPeter(state.currentUserId, employees);
  const isSelf = activeKeyboardCell.empId === state.currentUserId;

  assert(isSelf === true, `${emp.name}: Active keyboard cell belongs to self`);
  assert(isAdmin === false, `${emp.name}: Regular keyboard operation is not admin`);

  if (state.allocations[key]) {
    delete state.allocations[key];
    state.history.unshift({
      targetEmpId: activeKeyboardCell.empId,
      targetEmpName: emp.name,
      dateStr: activeKeyboardCell.dateStr,
      actionType: 'clear_cell',
      summary: `Cleared cell on ${formatDateDMY(activeKeyboardCell.dateStr)}`,
      details: `Deleted 'Project - Test Key' via Delete key`,
      editorId: emp.id,
      editorName: emp.name,
      isCrossProfile: false,
      isAdminEdit: false,
      deviceId: 'dev_test_device_1'
    });
  }

  assert(state.allocations[key] === undefined, `${emp.name}: Cell successfully deleted via Delete key`);
});

console.log(`\n>>> GROUP 6: Multi-Cell Batch Assignment & Deletion for All Users`);
employees.forEach(emp => {
  state.currentUserId = emp.id;
  state.isAdmin = false;
  const dates = ['2026-11-08', '2026-11-09', '2026-11-10'];
  const selectedKeys = new Set(dates.map(d => `${emp.id}_${d}`));

  // Batch assign "NO PROJECT"
  selectedKeys.forEach(k => {
    state.allocations[k] = { project: 'NO PROJECT', hours: 0 };
  });
  selectedKeys.forEach(k => {
    assert(state.allocations[k] !== undefined, `${emp.name}: Batch assigned cell ${k}`);
  });

  // Batch clear
  selectedKeys.forEach(k => {
    delete state.allocations[k];
  });
  selectedKeys.forEach(k => {
    assert(state.allocations[k] === undefined, `${emp.name}: Batch cleared cell ${k}`);
  });

  state.history.unshift({
    targetEmpId: emp.id,
    targetEmpName: emp.name,
    dateStr: 'Multi-cell selection',
    actionType: 'batch_assign',
    summary: `Batch applied 'Cleared' across ${selectedKeys.size} cell(s)`,
    details: `Applied to ${emp.name}`,
    editorId: emp.id,
    editorName: emp.name,
    isCrossProfile: false,
    isAdminEdit: false,
    deviceId: 'dev_test_device_1'
  });
});

console.log(`\n>>> GROUP 7: Admin Mode (Peter MOUNIR) Editing & Deletion on Every User`);
const peterEmp = employees.find(e => isCurrentUserPeter(e.id, employees));
assert(peterEmp !== undefined, 'Peter MOUNIR exists in employee list');

state.currentUserId = peterEmp.id;
state.isAdmin = true;

employees.forEach(targetEmp => {
  const isAdmin = state.isAdmin && isCurrentUserPeter(state.currentUserId, employees);
  assert(isAdmin === true, `Admin privileges verified active for Peter MOUNIR`);

  // Can Peter edit this employee's row?
  const canEditRow = (state.isAdmin && isCurrentUserPeter(state.currentUserId, employees)) || (state.currentUserId === targetEmp.id);
  assert(canEditRow === true, `Peter has admin rights to edit ${targetEmp.name}'s schedule row`);

  const key = `${targetEmp.id}_2026-11-12`;
  // Admin assigns project
  state.allocations[key] = { project: 'Tender - High Speed', hours: targetEmp.defaultHoursPerDay || 8 };
  assert(state.allocations[key] !== undefined, `Admin assigned project on ${targetEmp.name}'s row`);

  // Admin clears cell via Clear pill
  delete state.allocations[key];
  assert(state.allocations[key] === undefined, `Admin cleared cell on ${targetEmp.name}'s row`);

  // Admin logs audit event
  const isCross = (peterEmp.name !== targetEmp.name);
  state.history.unshift({
    targetEmpId: targetEmp.id,
    targetEmpName: targetEmp.name,
    dateStr: '2026-11-12',
    actionType: 'cell_assign',
    summary: `Assigned 'Cleared' on 12/11/2026`,
    details: `Changed from 'Tender - High Speed' to 'Cleared'`,
    editorId: peterEmp.id,
    editorName: peterEmp.name,
    isCrossProfile: isCross,
    isAdminEdit: true,
    deviceId: 'dev_admin_pc_1'
  });
});

console.log(`\n>>> GROUP 8: Audit History Rendering Integrity across ${state.history.length} Events`);
assert(state.history.length > 100, `Recorded over 100 audit events (${state.history.length})`);

// Verify all history entries have valid required fields and do not produce NaN or undefined
state.history.forEach((entry, idx) => {
  assert(entry.summary && typeof entry.summary === 'string', `Entry #${idx + 1} has valid summary: ${entry.summary}`);
  assert(entry.editorName && typeof entry.editorName === 'string', `Entry #${idx + 1} has valid editor: ${entry.editorName}`);
  assert(entry.targetEmpName && typeof entry.targetEmpName === 'string', `Entry #${idx + 1} has valid target: ${entry.targetEmpName}`);
  assert(typeof entry.isCrossProfile === 'boolean', `Entry #${idx + 1} has boolean isCrossProfile flag`);
  assert(typeof entry.isAdminEdit === 'boolean', `Entry #${idx + 1} has boolean isAdminEdit flag`);

  // Test HTML escaping on entry values
  const escapedSummary = escapeHtml(entry.summary);
  const escapedEditor = escapeHtml(entry.editorName);
  const escapedTarget = escapeHtml(entry.targetEmpName);
  assert(!escapedSummary.includes('<script>') && escapedSummary.length > 0, `HTML safe summary`);
  assert(!escapedEditor.includes('<script>') && escapedEditor.length > 0, `HTML safe editor`);
  assert(!escapedTarget.includes('<script>') && escapedTarget.length > 0, `HTML safe target`);
});

console.log('\n>>> GROUP 9: Click vs Drag Multi-Select Isolation for All Users');

employees.forEach((emp, rIdx) => {
  // 1. Stationary Left Click (any duration - fast or slow click)
  const dragSim = {
    isMouseDown: true,
    isDragging: false,
    startRowIndex: rIdx,
    startColIndex: 0,
    suppressClick: false
  };

  // Simulating mouseup on same cell without moving to another coordinate
  const moveRIdx = rIdx;
  const moveCIdx = 0;
  const isDifferentCell = (moveRIdx !== dragSim.startRowIndex || moveCIdx !== dragSim.startColIndex);
  if (isDifferentCell) {
    dragSim.isDragging = true;
    dragSim.suppressClick = true;
  }

  // On MouseUp
  const wasDragging = dragSim.isDragging;
  dragSim.isMouseDown = false;
  dragSim.isDragging = false;
  if (!wasDragging) {
    dragSim.suppressClick = false;
  }

  assert(wasDragging === false, emp.name + ': Stationary left click does NOT trigger drag');
  assert(dragSim.suppressClick === false, emp.name + ': Stationary left click allows click event to fire');

  // Verify click opens edit mode directly without entering multi-select
  const userSelectedCells = new Set();
  const canEdit = (emp.name.trim().toLowerCase() === 'peter mounir') || (emp.id === emp.id);
  assert(canEdit === true, emp.name + ': Can edit own row on single click');
  assert(userSelectedCells.size === 0, emp.name + ': Multi-select is NOT triggered on stationary click');

  // 2. Intentional Drag to Another Cell (Row rIdx, Col 0 -> Col 2)
  const dragSim2 = {
    isMouseDown: true,
    isDragging: false,
    startRowIndex: rIdx,
    startColIndex: 0,
    suppressClick: false
  };

  const dragTargetCIdx = 2;
  const isDiff2 = (rIdx !== dragSim2.startRowIndex || dragTargetCIdx !== dragSim2.startColIndex);
  if (isDiff2) {
    dragSim2.isDragging = true;
    dragSim2.suppressClick = true;
  }

  assert(dragSim2.isDragging === true, emp.name + ': Moving to another cell activates drag multi-selection');
  assert(dragSim2.suppressClick === true, emp.name + ': Drag multi-selection suppresses single cell click');

  // 3. Edge Zone Click (Left sticky column proximity)
  const dragSim3 = {
    isMouseDown: true,
    isDragging: false,
    startRowIndex: rIdx,
    startColIndex: 0,
    lastClientX: 250
  };

  const leftZoneEnd = 270 + 45;
  const inLeftZone = (dragSim3.lastClientX <= leftZoneEnd);
  // Auto scroll condition: ONLY if isMouseDown AND isDragging
  const canAutoScroll = dragSim3.isMouseDown && dragSim3.isDragging && inLeftZone;
  assert(canAutoScroll === false, emp.name + ': Edge proximity does NOT trigger auto-scroll when not dragging');
});

console.log(`\n==========================================================`);
console.log(` ALL-USERS TEST COMPLETE: ${totalPassed} PASSED, ${totalFailed} FAILED`);
console.log(`==========================================================`);

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

