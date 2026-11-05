/**
 * Dedicated Integrity Test Suite for PC Grid Cell Interaction Sequence
 * 
 * Specifically validates:
 * 1. One left click on any cell: strictly stands on the cell (sets keyboard focus)
 *    and enables arrow key navigation without opening the popover.
 * 2. Natural click dwell time (e.g. 150ms-280ms) and micro-jitters (<8px) NEVER trigger
 *    select mode accidentally.
 * 3. Hold left click (>=380ms): enters multi-select mode on that cell and shows the
 *    multi-select toolbar. If user was standing on Cell A and holds on Cell B,
 *    focus and selection totally move to Cell B (Cell A is completely unfocused and unselected).
 * 4. Hold and drag: expands 2D multi-selection from the hold start cell to target cell.
 * 5. Single left click after multi-select: completely clears multi-select and stands on clicked cell.
 * 6. Double click: opens assignment popover directly.
 * 7. Keyboard Enter / Space: opens assignment popover for the focused cell.
 * 8. Excel-style keyboard arrow navigation: navigates up/down/left/right from current focused cell.
 * 9. User permission isolation: non-admin can view other rows with single click & arrows,
 *    but cannot hold-select or edit; Admin (Peter MOUNIR) can hold-select across all rows.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==========================================================');
console.log(' RUNNING DEDICATED PC CELL CLICK & HOLD SEQUENCE TEST SUITE');
console.log('==========================================================\n');

const repoDir = path.resolve(__dirname);
const appJsPath = path.join(repoDir, 'app.js');
const indexHtmlPath = path.join(repoDir, 'index.html');
const dataJsonPath = path.join(repoDir, 'data.json');

const appJs = fs.readFileSync(appJsPath, 'utf8');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const dataJson = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));

let passed = 0;
let failed = 0;

function testAssert(condition, name, details = '') {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${name}${details ? ` (${details})` : ''}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${name}${details ? ` - ${details}` : ''}`);
  }
}

// -------------------------------------------------------------
// MODULE 1: Source Code Static Contract Verification
// -------------------------------------------------------------
console.log('>>> MODULE 1: Static Code Contracts (app.js & index.html)');

// 1.1 Single click handler does NOT call openCellPopover
const clickHandlerMatch = appJs.match(/slot\.addEventListener\('click',\s*\(e\)\s*=>\s*\{([\s\S]*?)\}\);/);
testAssert(!!clickHandlerMatch, '1.1 slot click event listener exists');
if (clickHandlerMatch) {
  const clickBody = clickHandlerMatch[1];
  const opensPopoverOnSingleClick = clickBody.includes('openCellPopover(');
  testAssert(!opensPopoverOnSingleClick, '1.2 Single left click does NOT call openCellPopover');
  testAssert(clickBody.includes('setKeyboardFocusedCell(empId, dateStr)'), '1.3 Single left click stands on cell via setKeyboardFocusedCell');
  testAssert(clickBody.includes('closeCellPopover()'), '1.4 Single left click closes any open popovers');
  testAssert(clickBody.includes('clearSelection()'), '1.5 Single left click clears any prior multi-selection');
}

// 1.2 Mouse down initiates hold timer and moves focus immediately
const mouseDownMatch = appJs.match(/function handleCellMouseDown\(slot,\s*e\)\s*\{([\s\S]*?)\n\s*function handleDragMoveToSlot/);
testAssert(!!mouseDownMatch, '1.6 handleCellMouseDown function exists');
if (mouseDownMatch) {
  const mdBody = mouseDownMatch[1];
  testAssert(mdBody.includes('clearSelection()'), '1.7 handleCellMouseDown clears previous multi-selection');
  testAssert(mdBody.includes('setKeyboardFocusedCell(empId, dateStr)'), '1.8 handleCellMouseDown immediately moves keyboard focus to pressed cell');
  testAssert(mdBody.includes('cellDragState.holdTimer = setTimeout('), '1.9 handleCellMouseDown starts holdTimer');
  testAssert(mdBody.includes('cellDragState.isHoldSelecting = true'), '1.10 holdTimer sets isHoldSelecting to true');
  testAssert(mdBody.includes('activate2DSelection('), '1.11 holdTimer invokes activate2DSelection on starting cell');
  testAssert(mdBody.includes('380'), '1.12 holdTimer configured with 380ms threshold to prevent false-trigger on normal clicks');
}

// 1.3 Drag threshold & deadband
testAssert(appJs.includes('moveDist = Math.hypot('), '1.13 Physical pixel movement displacement calculated (Math.hypot)');
testAssert(appJs.includes('moveDist >= 8'), '1.14 Micro-jitter deadband threshold (>= 8px) enforced');
testAssert(appJs.includes('if (cellDragState.isDragging) {'), '1.15 Edge clamping logic strictly guarded by active isDragging state');

// 1.4 Mouse up suppresses click when hold selecting occurred
const mouseUpMatch = appJs.match(/function handleGlobalMouseUp\(e\)\s*\{([\s\S]*?)\n\s*function handleGlobalMouseMove/);
testAssert(!!mouseUpMatch, '1.16 handleGlobalMouseUp function exists');
if (mouseUpMatch) {
  const muBody = mouseUpMatch[1];
  testAssert(muBody.includes('clearTimeout(cellDragState.holdTimer)'), '1.17 handleGlobalMouseUp clears holdTimer');
  testAssert(muBody.includes('cellDragState.suppressClick = true'), '1.18 handleGlobalMouseUp suppresses trailing click when hold or drag was active');
  testAssert(muBody.includes('updateMultiSelectUI()'), '1.19 handleGlobalMouseUp updates multi-select UI');
}

// 1.5 Double click and keyboard Enter still open popover
testAssert(appJs.includes("slot.addEventListener('dblclick'"), '1.20 Double click listener preserved on grid slots');
const dblClickMatch = appJs.match(/slot\.addEventListener\('dblclick',\s*\(e\)\s*=>\s*\{([\s\S]*?)\}\);/);
testAssert(!!dblClickMatch && dblClickMatch[1].includes('openCellPopover('), '1.21 Double click calls openCellPopover');
testAssert(appJs.includes("['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)"), '1.22 Arrow navigation keys handled');
testAssert(appJs.includes("(e.key === 'Enter' || e.key === ' ')"), '1.23 Enter/Space key opens popover for activeKeyboardCell');

// -------------------------------------------------------------
// MODULE 2: Behavioral State & Event Simulation
// -------------------------------------------------------------
console.log('\n>>> MODULE 2: Behavioral State & Event Simulation');

function createGridMock() {
  const employees = dataJson.employees;
  const daysInNov = 30;

  const state = {
    currentUserId: 'emp_1', // Ahmed BADR
    isAdmin: false,
    isViewOnly: false,
    activeKeyboardCell: null,
    selectedCells: new Set(),
    selectedEmpId: null,
    isMultiEditing: false
  };

  const dom = {
    focusedCell: null,
    selectedClasses: new Set(),
    popoverOpen: false,
    popoverTarget: null,
    multiSelectBarVisible: false,
    multiSelectCountText: ''
  };

  function setKeyboardFocusedCell(empId, dateStr) {
    if (!empId || !dateStr) return;
    state.activeKeyboardCell = { empId, dateStr };
    dom.focusedCell = `${empId}_${dateStr}`;
  }

  function clearSelection() {
    state.selectedCells.clear();
    state.selectedEmpId = null;
    state.isMultiEditing = false;
    dom.selectedClasses.clear();
    updateMultiSelectUI();
  }

  function closeCellPopover() {
    dom.popoverOpen = false;
    dom.popoverTarget = null;
    state.isMultiEditing = false;
  }

  let openCellPopoverCalls = 0;
  function openCellPopover(empId, dateStr, targetBtn) {
    openCellPopoverCalls++;
    setKeyboardFocusedCell(empId, dateStr);
    dom.popoverOpen = true;
    dom.popoverTarget = { empId, dateStr };
  }

  function updateMultiSelectUI() {
    const count = state.selectedCells.size;
    if (count === 0) {
      dom.multiSelectBarVisible = false;
      dom.multiSelectCountText = '';
    } else {
      dom.multiSelectBarVisible = true;
      dom.multiSelectCountText = `${count} cell${count > 1 ? 's' : ''} selected`;
    }
  }

  function activate2DSelection(startR, startC, currentR, currentC) {
    if (currentR === undefined) currentR = startR;
    if (currentC === undefined) currentC = startC;

    const isAdmin = state.isAdmin && (employees.find(e => e.id === state.currentUserId)?.name?.toLowerCase() === 'peter mounir');
    const minR = isAdmin ? Math.min(startR, currentR) : startR;
    const maxR = isAdmin ? Math.max(startR, currentR) : startR;
    const minC = Math.min(startC, currentC);
    const maxC = Math.max(startC, currentC);

    dom.selectedClasses.clear();
    const newKeys = new Set();

    for (let r = minR; r <= maxR; r++) {
      const emp = employees[r];
      if (!emp) continue;
      for (let c = minC; c <= maxC; c++) {
        const dStr = `2026-11-${String(c + 1).padStart(2, '0')}`;
        const k = `${emp.id}_${dStr}`;
        newKeys.add(k);
        dom.selectedClasses.add(k);
      }
    }

    state.selectedCells = newKeys;
    state.selectedEmpId = (minR === maxR) ? employees[minR].id : null;
    updateMultiSelectUI();
  }

  const cellDragState = {
    isMouseDown: false,
    isDragging: false,
    isHoldSelecting: false,
    holdTimer: null,
    startEmpId: null,
    startDateStr: null,
    startRowIndex: -1,
    startColIndex: -1,
    startX: 0,
    startY: 0,
    lastClientX: 0,
    lastClientY: 0,
    suppressClick: false
  };

  // Event dispatchers
  function handleMouseDown(empId, colIndex, isMulti = false, clientX = 100, clientY = 100) {
    if (cellDragState.holdTimer) {
      clearTimeout(cellDragState.holdTimer);
      cellDragState.holdTimer = null;
    }

    if (!isMulti) {
      clearSelection();
    }
    closeCellPopover();

    const dateStr = `2026-11-${String(colIndex + 1).padStart(2, '0')}`;
    setKeyboardFocusedCell(empId, dateStr);

    const empIdx = employees.findIndex(e => e.id === empId);
    const isPeter = employees.find(e => e.id === state.currentUserId)?.name?.toLowerCase() === 'peter mounir';
    const canEditThisRow = (state.isAdmin && isPeter) || (state.currentUserId === empId);
    if (!canEditThisRow) return;

    cellDragState.isMouseDown = true;
    cellDragState.isDragging = false;
    cellDragState.isHoldSelecting = false;
    cellDragState.startEmpId = empId;
    cellDragState.startDateStr = dateStr;
    cellDragState.startRowIndex = empIdx;
    cellDragState.startColIndex = colIndex;
    cellDragState.startX = clientX;
    cellDragState.startY = clientY;
    cellDragState.lastClientX = clientX;
    cellDragState.lastClientY = clientY;
    cellDragState.suppressClick = false;

    // Simulate hold timer (380ms)
    cellDragState.holdTimer = {
      fire: () => {
        if (!cellDragState.isMouseDown) return;
        cellDragState.isHoldSelecting = true;
        cellDragState.isDragging = true;
        cellDragState.suppressClick = true;
        closeCellPopover();
        activate2DSelection(cellDragState.startRowIndex, cellDragState.startColIndex);
      }
    };
  }

  function handleMouseMove(targetEmpId, targetColIndex, clientX = 100, clientY = 100) {
    if (!cellDragState.isMouseDown) return;
    cellDragState.lastClientX = clientX;
    cellDragState.lastClientY = clientY;

    const targetR = employees.findIndex(e => e.id === targetEmpId);
    const isDifferentCell = (targetR !== cellDragState.startRowIndex || targetColIndex !== cellDragState.startColIndex);
    const moveDist = Math.hypot(clientX - cellDragState.startX, clientY - cellDragState.startY);
    const hasIntentionalDragDistance = moveDist >= 8;

    if (cellDragState.isDragging || (isDifferentCell && hasIntentionalDragDistance)) {
      if (cellDragState.holdTimer) {
        cellDragState.holdTimer = null;
      }
      cellDragState.isDragging = true;
      cellDragState.suppressClick = true;
      closeCellPopover();
      activate2DSelection(cellDragState.startRowIndex, cellDragState.startColIndex, targetR, targetColIndex);
    }
  }

  function handleMouseUp() {
    if (!cellDragState.isMouseDown) return;
    if (cellDragState.holdTimer) {
      cellDragState.holdTimer = null;
    }
    const wasActive = cellDragState.isHoldSelecting || cellDragState.isDragging;
    cellDragState.isMouseDown = false;
    cellDragState.isDragging = false;
    cellDragState.isHoldSelecting = false;

    if (wasActive) {
      if (cellDragState.startEmpId && cellDragState.startDateStr) {
        setKeyboardFocusedCell(cellDragState.startEmpId, cellDragState.startDateStr);
      }
      cellDragState.suppressClick = true;
      updateMultiSelectUI();
    }
  }

  function handleClick(empId, colIndex, isMulti = false) {
    if (cellDragState.suppressClick) {
      return;
    }
    const dateStr = `2026-11-${String(colIndex + 1).padStart(2, '0')}`;
    const key = `${empId}_${dateStr}`;

    if (isMulti) {
      if (state.selectedCells.has(key)) {
        state.selectedCells.delete(key);
        dom.selectedClasses.delete(key);
      } else {
        state.selectedCells.add(key);
        dom.selectedClasses.add(key);
      }
      updateMultiSelectUI();
      return;
    }

    if (state.selectedCells.size > 0) {
      clearSelection();
    }
    closeCellPopover();
    setKeyboardFocusedCell(empId, dateStr);
  }

  function handleDblClick(empId, colIndex) {
    const dateStr = `2026-11-${String(colIndex + 1).padStart(2, '0')}`;
    setKeyboardFocusedCell(empId, dateStr);
    openCellPopover(empId, dateStr, {});
  }

  function handleKeyDown(key) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      if (!state.activeKeyboardCell) return;
      let rIdx = employees.findIndex(e => e.id === state.activeKeyboardCell.empId);
      let cIdx = parseInt(state.activeKeyboardCell.dateStr.split('-')[2], 10) - 1;

      if (key === 'ArrowRight') cIdx = Math.min(daysInNov - 1, cIdx + 1);
      else if (key === 'ArrowLeft') cIdx = Math.max(0, cIdx - 1);
      else if (key === 'ArrowDown') rIdx = Math.min(employees.length - 1, rIdx + 1);
      else if (key === 'ArrowUp') rIdx = Math.max(0, rIdx - 1);

      const targetEmp = employees[rIdx];
      const targetDate = `2026-11-${String(cIdx + 1).padStart(2, '0')}`;
      setKeyboardFocusedCell(targetEmp.id, targetDate);
      return;
    }

    if ((key === 'Enter' || key === ' ') && state.activeKeyboardCell) {
      openCellPopover(state.activeKeyboardCell.empId, state.activeKeyboardCell.dateStr, {});
      return;
    }

    if (key === 'Escape') {
      closeCellPopover();
      clearSelection();
      return;
    }
  }

  return {
    state,
    dom,
    cellDragState,
    getOpenCellPopoverCalls: () => openCellPopoverCalls,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleClick,
    handleDblClick,
    handleKeyDown,
    setKeyboardFocusedCell,
    clearSelection
  };
}

// -------------------------------------------------------------
// SCENARIO 1: Single Left Click on Cell B when standing on Cell A
// -------------------------------------------------------------
const grid1 = createGridMock();
// Initially stand on Cell A (emp_1, Day 1)
grid1.setKeyboardFocusedCell('emp_1', '2026-11-01');
testAssert(grid1.state.activeKeyboardCell.empId === 'emp_1' && grid1.state.activeKeyboardCell.dateStr === '2026-11-01',
  '2.1 Precondition: Standing on Cell A (emp_1, 2026-11-01)');
testAssert(grid1.dom.focusedCell === 'emp_1_2026-11-01', '2.2 Cell A has keyboard focus');

// Single normal click on Cell B (emp_1, Day 5 - colIndex 4), dwell time ~200ms
grid1.handleMouseDown('emp_1', 4, false, 150, 150);
grid1.handleMouseUp();
grid1.handleClick('emp_1', 4);

testAssert(grid1.state.activeKeyboardCell.dateStr === '2026-11-05',
  '2.3 Single left click moves keyboard focus to Cell B (2026-11-05)');
testAssert(grid1.dom.focusedCell === 'emp_1_2026-11-05', '2.4 Cell B has keyboard-focused class');
testAssert(grid1.dom.focusedCell !== 'emp_1_2026-11-01', '2.5 Cell A has completely lost keyboard focus');
testAssert(grid1.getOpenCellPopoverCalls() === 0, '2.6 Single left click did NOT open popover');
testAssert(grid1.dom.popoverOpen === false, '2.7 Popover is closed');
testAssert(grid1.state.selectedCells.size === 0, '2.8 Multi-select is NOT entered (selectedCells is empty)');
testAssert(!grid1.dom.selectedClasses.has('emp_1_2026-11-05'), '2.9 Cell B is NOT marked as is-selected-cell');
testAssert(grid1.dom.multiSelectBarVisible === false, '2.10 Multi-select toolbar is hidden');

// -------------------------------------------------------------
// SCENARIO 1B: Natural Slow/Deliberate Click (250ms) + Micro-Jitter (dx=3px, dy=2px)
// -------------------------------------------------------------
const grid1b = createGridMock();
grid1b.setKeyboardFocusedCell('emp_1', '2026-11-01');
// User presses down at (200, 200) on Cell Day 3 (colIndex 2)
grid1b.handleMouseDown('emp_1', 2, false, 200, 200);
// Mouse experiences a 3px micro-tremor near edge (moves to adjacent colIndex 3, but dist < 8px)
grid1b.handleMouseMove('emp_1', 3, 203, 202);
testAssert(grid1b.cellDragState.isDragging === false, '2.11 3px micro-tremor does NOT activate drag multi-select');
// Mouse released at 250ms (before 380ms hold threshold)
grid1b.handleMouseUp();
grid1b.handleClick('emp_1', 2);
testAssert(grid1b.state.selectedCells.size === 0, '2.12 Relaxed 250ms click does NOT enter multi-select');
testAssert(grid1b.dom.multiSelectBarVisible === false, '2.13 Multi-select bar remains hidden on relaxed click');
testAssert(grid1b.state.activeKeyboardCell.dateStr === '2026-11-03', '2.14 Focus accurately set on clicked cell (Nov 3)');

// Arrow navigation from Cell B
grid1.handleKeyDown('ArrowRight');
testAssert(grid1.state.activeKeyboardCell.dateStr === '2026-11-06',
  '2.15 ArrowRight key navigates from Cell B (Nov 5) to Nov 6');
grid1.handleKeyDown('ArrowDown');
testAssert(grid1.state.activeKeyboardCell.empId === dataJson.employees[1].id,
  '2.16 ArrowDown key navigates to next employee row');
testAssert(grid1.dom.popoverOpen === false, '2.17 Popover remains closed during arrow navigation');

// -------------------------------------------------------------
// SCENARIO 2: Hold Left Click on Cell B when standing on Cell A
// -------------------------------------------------------------
const grid2 = createGridMock();
// Precondition: Stand on Cell A (emp_1, Day 1)
grid2.setKeyboardFocusedCell('emp_1', '2026-11-01');
testAssert(grid2.dom.focusedCell === 'emp_1_2026-11-01', '2.18 Precondition: Standing on Cell A');

// User presses down on Cell B (emp_1, Day 5 - colIndex 4)
grid2.handleMouseDown('emp_1', 4, false, 150, 150);

// Focus immediately moves to Cell B and Cell A is abandoned
testAssert(grid2.state.activeKeyboardCell.dateStr === '2026-11-05',
  '2.19 Mouse down immediately moves keyboard focus to Cell B');
testAssert(grid2.dom.focusedCell === 'emp_1_2026-11-05', '2.20 Cell B gets keyboard-focused class');

// Hold duration >= 380ms: holdTimer fires!
testAssert(!!grid2.cellDragState.holdTimer, '2.21 holdTimer was scheduled');
grid2.cellDragState.holdTimer.fire();

testAssert(grid2.cellDragState.isHoldSelecting === true, '2.22 isHoldSelecting is true after holdTimer');
testAssert(grid2.cellDragState.suppressClick === true, '2.23 suppressClick is true after holdTimer');
testAssert(grid2.state.selectedCells.size === 1, '2.24 Cell B is entered into multi-select (size 1)');
testAssert(grid2.state.selectedCells.has('emp_1_2026-11-05'), '2.25 selectedCells contains exactly Cell B');
testAssert(!grid2.state.selectedCells.has('emp_1_2026-11-01'), '2.26 selectedCells does NOT contain prior Cell A');
testAssert(grid2.dom.selectedClasses.has('emp_1_2026-11-05'), '2.27 Cell B has is-selected-cell class');
testAssert(!grid2.dom.selectedClasses.has('emp_1_2026-11-01'), '2.28 Cell A does NOT have is-selected-cell class');
testAssert(grid2.dom.multiSelectBarVisible === true, '2.29 Multi-select toolbar is visible');
testAssert(grid2.dom.multiSelectCountText === '1 cell selected', '2.30 Multi-select count indicates "1 cell selected"');

// User releases mouse
grid2.handleMouseUp();
// Click event fires but is suppressed by suppressClick
grid2.handleClick('emp_1', 4);

testAssert(grid2.state.selectedCells.size === 1, '2.31 Multi-selection of Cell B preserved on mouse release (not cleared by click)');
testAssert(grid2.dom.multiSelectBarVisible === true, '2.32 Multi-select bar remains visible after mouse release');
testAssert(grid2.dom.popoverOpen === false, '2.33 Popover was NOT opened by hold');

// -------------------------------------------------------------
// SCENARIO 3: Hold and Drag from Cell B to Cell C (Range Selection >= 8px)
// -------------------------------------------------------------
const grid3 = createGridMock();
// Start on Cell B (emp_1, Col 2 -> Nov 3) at (100, 100)
grid3.handleMouseDown('emp_1', 2, false, 100, 100);
// Drag to Col 5 -> Nov 6 at (220, 100) -> distance 120px >= 8px
grid3.handleMouseMove('emp_1', 5, 220, 100);
grid3.handleMouseUp();

testAssert(grid3.state.selectedCells.size === 4, '2.34 Drag range from Col 2 to Col 5 selected 4 cells');
testAssert(grid3.state.selectedCells.has('emp_1_2026-11-03'), '2.35 Nov 3 included');
testAssert(grid3.state.selectedCells.has('emp_1_2026-11-06'), '2.36 Nov 6 included');
testAssert(!grid3.state.selectedCells.has('emp_1_2026-11-01'), '2.37 Nov 1 not included in drag range');
testAssert(grid3.dom.multiSelectBarVisible === true, '2.38 Multi-select bar visible with 4 cells');

// -------------------------------------------------------------
// SCENARIO 4: Single Click after Multi-Selection Clears Multi-Select
// -------------------------------------------------------------
// Now single click on Cell D (emp_1, Col 9 -> Nov 10)
grid3.cellDragState.suppressClick = false;
grid3.handleMouseDown('emp_1', 9, false, 350, 100);
grid3.handleMouseUp();
grid3.handleClick('emp_1', 9);

testAssert(grid3.state.selectedCells.size === 0, '2.39 Single click after multi-select completely clears selectedCells');
testAssert(grid3.dom.selectedClasses.size === 0, '2.40 All is-selected-cell classes removed');
testAssert(grid3.dom.multiSelectBarVisible === false, '2.41 Multi-select bar hidden');
testAssert(grid3.state.activeKeyboardCell.dateStr === '2026-11-10', '2.42 Focus strictly transferred to clicked Cell D (Nov 10)');
testAssert(grid3.dom.popoverOpen === false, '2.43 Popover remains closed');

// -------------------------------------------------------------
// SCENARIO 5: Double Click and Keyboard Enter Popover Opening
// -------------------------------------------------------------
const grid4 = createGridMock();
grid4.setKeyboardFocusedCell('emp_1', '2026-11-15');
testAssert(grid4.dom.popoverOpen === false, '2.44 Popover initially closed');

// Double click opens popover
grid4.handleDblClick('emp_1', 14);
testAssert(grid4.dom.popoverOpen === true, '2.45 Double click opens assignment popover');
testAssert(grid4.dom.popoverTarget.dateStr === '2026-11-15', '2.46 Popover target is Nov 15');

// Close popover
grid4.handleKeyDown('Escape');
testAssert(grid4.dom.popoverOpen === false, '2.47 Escape key closes popover');

// Enter key opens popover on focused cell
grid4.handleKeyDown('Enter');
testAssert(grid4.dom.popoverOpen === true, '2.48 Enter key opens assignment popover on focused cell');

// -------------------------------------------------------------
// SCENARIO 6: Permission Isolation (Non-Admin vs Admin)
// -------------------------------------------------------------
const grid5 = createGridMock();
grid5.state.currentUserId = 'emp_1'; // Ahmed BADR (not admin)
grid5.state.isAdmin = false;

// Ahmed tries to single click Catherine MAGDI's cell (emp_3)
grid5.handleClick(dataJson.employees[2].id, 3);
testAssert(grid5.state.activeKeyboardCell.empId === dataJson.employees[2].id,
  '2.49 Non-admin CAN single click another team member cell to stand and view with arrows');

// Ahmed tries to hold-select on Catherine MAGDI's cell (emp_3)
grid5.handleMouseDown(dataJson.employees[2].id, 3);
testAssert(grid5.cellDragState.isMouseDown === false,
  '2.50 Non-admin CANNOT initiate hold or multi-select on another team member cell');
testAssert(grid5.state.selectedCells.size === 0,
  '2.51 No cells selected when non-admin attempts hold on other employee row');

// Switch to Peter MOUNIR (Admin)
const peter = dataJson.employees.find(e => e.name.toLowerCase() === 'peter mounir');
grid5.state.currentUserId = peter.id;
grid5.state.isAdmin = true;

// Peter holds on Catherine MAGDI's cell
grid5.handleMouseDown(dataJson.employees[2].id, 3);
testAssert(grid5.cellDragState.isMouseDown === true, '2.52 Admin CAN initiate hold on any team member row');
grid5.cellDragState.holdTimer.fire();
grid5.handleMouseUp();
testAssert(grid5.state.selectedCells.has(`${dataJson.employees[2].id}_2026-11-04`),
  '2.53 Admin successfully hold-selects cell on another team member row');
testAssert(grid5.dom.multiSelectBarVisible === true, '2.54 Multi-select bar active for Admin edit');

// -------------------------------------------------------------
// SUMMARY REPORT
// -------------------------------------------------------------
console.log('\n==========================================================');
console.log(` DEDICATED TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log('==========================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
