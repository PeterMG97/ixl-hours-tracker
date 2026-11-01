/**
 * IXL Team Hours Tracker - Application Logic
 * Implements:
 * 1. Fresh start from 2026-11-01 + Baseline/Pre-1/11 Project Hours
 * 2. "Different Team Support" counted as billable/active hours
 * 3. Secret Admin Password "IXL2026"
 * 4. Add Project with initial/baseline hours
 * 5. Modern compact SaaS UI (non-Excel look)
 * 6. Admin lock on all major actions (Projects & Team Management)
 * 7. User identification & row-level editing lock (Admin can edit any row)
 * 8. Strict alphabetical sorting for both projects and employees
 * 9. Admin baseline hour adjustments on any project
 * 10. Bulk Fill with start/end date, project, and Cairo (Fri-Sat) vs Istanbul (Sat-Sun) holidays handling
 */

(function () {
  'use strict';

  // Application State
  const state = {
    sections: [],
    employees: [],
    projects: [],
    statuses: ["Day OFF", "NO PROJECT", "NO STATUS", "Different Team Support"],
    allocations: {}, // "empId_YYYY-MM-DD" -> { project: string, hours: number }
    currentMonth: "2026-11", // Fresh start month
    todayStr: "2026-11-01",
    currentUserId: localStorage.getItem('ixl_current_user_id') || null,
    isAdmin: false,
    adminPin: "IXL2026",
    isViewOnly: false,
    selectedCell: null,
    isConnected: true
  };

  // DOM Elements Cache
  const el = {
    connectionLamp: document.getElementById('connectionLamp'),
    connectionText: document.getElementById('connectionText'),
    modeBadge: document.getElementById('modeBadge'),
    modeIcon: document.getElementById('modeIcon'),
    modeText: document.getElementById('modeText'),
    viewModeBanner: document.getElementById('viewModeBanner'),
    userPermissionBanner: document.getElementById('userPermissionBanner'),
    permBannerName: document.getElementById('permBannerName'),
    
    // User Identity (Requirement 7)
    userPickerBtn: document.getElementById('userPickerBtn'),
    currentUserNameDisplay: document.getElementById('currentUserNameDisplay'),
    userAvatarInitials: document.getElementById('userAvatarInitials'),
    userSelectModal: document.getElementById('userSelectModal'),
    userSelectGrid: document.getElementById('userSelectGrid'),
    searchUserPickerInput: document.getElementById('searchUserPickerInput'),

    // Month Navigation
    monthSelect: document.getElementById('monthSelect'),
    prevMonthBtn: document.getElementById('prevMonthBtn'),
    nextMonthBtn: document.getElementById('nextMonthBtn'),
    jumpTodayBtn: document.getElementById('jumpTodayBtn'),

    // Schedule Table
    scheduleHead: document.getElementById('scheduleHead'),
    scheduleBody: document.getElementById('scheduleBody'),
    statActiveEmployees: document.getElementById('statActiveEmployees'),
    statCurrentMonthHours: document.getElementById('statCurrentMonthHours'),
    statUnfilledDays: document.getElementById('statUnfilledDays'),

    // Cell Popover
    cellPopover: document.getElementById('cellPopover'),
    popoverTitle: document.getElementById('popoverTitle'),
    popoverSubtitle: document.getElementById('popoverSubtitle'),
    closePopoverBtn: document.getElementById('closePopoverBtn'),
    projectSearchInput: document.getElementById('projectSearchInput'),
    popoverProjectList: document.getElementById('popoverProjectList'),
    popoverHoursInput: document.getElementById('popoverHoursInput'),
    applyCellBtn: document.getElementById('applyCellBtn'),
    openBulkFillBtn: document.getElementById('openBulkFillBtn'),

    // Bulk Fill Modal (Enhanced with Cairo/Istanbul holiday handling)
    topbarBulkFillBtn: document.getElementById('topbarBulkFillBtn'),
    bulkFillModal: document.getElementById('bulkFillModal'),
    bulkEmployeeSelect: document.getElementById('bulkEmployeeSelect'),
    bulkEmployeeOfficeHint: document.getElementById('bulkEmployeeOfficeHint'),
    bulkFromDate: document.getElementById('bulkFromDate'),
    bulkToDate: document.getElementById('bulkToDate'),
    bulkProjectSelect: document.getElementById('bulkProjectSelect'),
    bulkHoursInput: document.getElementById('bulkHoursInput'),
    confirmBulkFillBtn: document.getElementById('confirmBulkFillBtn'),
    holidayDayOffDetail: document.getElementById('holidayDayOffDetail'),
    holidayDayOffLabel: document.getElementById('holidayDayOffLabel'),
    holidayIncludeLabel: document.getElementById('holidayIncludeLabel'),
    holidaySkipLabel: document.getElementById('holidaySkipLabel'),

    // Modals
    projectsModal: document.getElementById('projectsModal'),
    teamModal: document.getElementById('teamModal'),
    removeMemberModal: document.getElementById('removeMemberModal'),
    adjustHoursModal: document.getElementById('adjustHoursModal'),
    analyticsModal: document.getElementById('analyticsModal'),
    adminPinModal: document.getElementById('adminPinModal'),

    // Admin Elements
    adminToggleBtn: document.getElementById('adminToggleBtn'),
    adminPinInput: document.getElementById('adminPinInput'),
    submitPinBtn: document.getElementById('submitPinBtn'),
    pinErrorMsg: document.getElementById('pinErrorMsg'),

    // Theme & Toast
    themeSelect: document.getElementById('themeSelect'),
    toast: document.getElementById('toast'),
    copyViewLinkBtn: document.getElementById('copyViewLinkBtn')
  };

  // Timezone-safe date helper functions (avoids UTC offset shifts in GMT+2 / GMT+3)
  function formatLocalDate(dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    // Setting to 12:00 (noon) prevents daylight saving or UTC midnight boundary rollbacks
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  // Detect current system date or anchor to November 1, 2026
  const realDate = new Date();
  if (realDate.getFullYear() === 2026) {
    state.todayStr = formatLocalDate(realDate);
    state.currentMonth = state.todayStr.substring(0, 7);
  } else {
    state.todayStr = "2026-11-01";
    state.currentMonth = "2026-11";
  }

  // Check URL parameters for View-Only mode (Requirement 6)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'view' || window.location.pathname.endsWith('/view')) {
    state.isViewOnly = true;
    document.body.classList.add('view-only');
    el.modeBadge.classList.add('view-only');
    el.modeIcon.textContent = '👁️';
    el.modeText.textContent = 'View-Only Mode';
    el.viewModeBanner.classList.remove('hidden');
    el.adminToggleBtn.classList.add('hidden');
    el.topbarBulkFillBtn.classList.add('hidden');
    document.getElementById('userIdentityCard').style.display = 'none';
  }

  // -------------------------------------------------------------
  // Data Loading & Connection Heartbeat (Requirement 5)
  // -------------------------------------------------------------

  async function loadData() {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (!res.ok) throw new Error('API offline, checking local file...');
      const data = await res.json();
      applyData(data);
      setConnectionStatus(true);
    } catch (err) {
      console.warn('API error, falling back to data.json...', err);
      try {
        const localRes = await fetch('data.json', { cache: 'no-store' });
        const localData = await localRes.json();
        applyData(localData);
        setConnectionStatus(true);
      } catch (e) {
        setConnectionStatus(false);
      }
    }
  }

  function applyData(data) {
    state.sections = data.sections || [];
    state.employees = data.employees || [];
    state.projects = data.projects || [];
    state.statuses = data.statuses || ["Day OFF", "NO PROJECT", "NO STATUS", "Different Team Support"];
    state.allocations = data.allocations || {};
    state.adminPin = data.adminPin || "IXL2026";

    sortAllData();

    state.projects.forEach(p => {
      if (p.initialHours === undefined) p.initialHours = 0;
    });

    updateUserDisplay();
    renderSchedule();
    populateSectionDropdowns();

    if (!state.isViewOnly && !state.currentUserId) {
      setTimeout(() => openUserSelectModal(), 500);
    }
  }

  // Requirement 8: Always sort alphabetically
  function sortAllData() {
    state.projects.sort((a, b) => a.name.localeCompare(b.name));
    state.employees.sort((a, b) => a.name.localeCompare(b.name));
  }

  function setConnectionStatus(connected) {
    state.isConnected = connected;
    if (connected) {
      el.connectionLamp.className = 'beacon-dot beacon-green';
      el.connectionText.textContent = 'Synced';
    } else {
      el.connectionLamp.className = 'beacon-dot beacon-red';
      el.connectionText.textContent = 'Offline';
    }
  }

  setInterval(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/ping', { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);
      setConnectionStatus(res.ok);
    } catch (e) {
      setConnectionStatus(false);
    }
  }, 8000);

  async function syncToServer() {
    if (state.isViewOnly) return;
    sortAllData();
    try {
      const payload = {
        sections: state.sections,
        employees: state.employees,
        projects: state.projects,
        statuses: state.statuses,
        allocations: state.allocations,
        adminPin: state.adminPin,
        lastUpdated: new Date().toISOString()
      };
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setConnectionStatus(true);
      } else {
        setConnectionStatus(false);
        showToast('Sync warning: changes saved locally in browser.', 'warning');
      }
    } catch (e) {
      setConnectionStatus(false);
      showToast('Offline: Changes cached locally.', 'warning');
    }
  }

  // -------------------------------------------------------------
  // Requirement 7: User Identification & Row Permission Enforcement
  // -------------------------------------------------------------

  function updateUserDisplay() {
    if (!state.currentUserId) {
      el.currentUserNameDisplay.textContent = 'Select Your Name';
      el.userAvatarInitials.textContent = '?';
      el.userPermissionBanner.classList.add('hidden');
      return;
    }
    const currentEmp = state.employees.find(e => e.id === state.currentUserId);
    if (currentEmp) {
      el.currentUserNameDisplay.textContent = currentEmp.name;
      el.userAvatarInitials.textContent = getInitials(currentEmp.name);
      el.permBannerName.textContent = currentEmp.name;
      if (!state.isAdmin) {
        el.userPermissionBanner.classList.remove('hidden');
      } else {
        el.userPermissionBanner.classList.add('hidden');
      }
    }
  }

  function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  el.userPickerBtn.addEventListener('click', openUserSelectModal);

  function openUserSelectModal() {
    renderUserSelectGrid('');
    openModal(el.userSelectModal);
  }

  function renderUserSelectGrid(query) {
    const q = query.toLowerCase();
    const activeEmps = state.employees.filter(e => e.active !== false && e.name.toLowerCase().includes(q));
    activeEmps.sort((a,b) => a.name.localeCompare(b.name));

    el.userSelectGrid.innerHTML = activeEmps.map(emp => {
      const sec = state.sections.find(s => s.id === emp.sectionId) || {};
      const isSelected = (emp.id === state.currentUserId);
      return `
        <div class="user-select-card ${isSelected ? 'active-selected' : ''}" data-emp-id="${emp.id}">
          <div class="user-avatar-circle">${getInitials(emp.name)}</div>
          <div class="card-info">
            <strong>${emp.name}</strong>
            <span>${sec.name || 'Member'}</span>
          </div>
        </div>
      `;
    }).join('');

    el.userSelectGrid.querySelectorAll('.user-select-card').forEach(card => {
      card.addEventListener('click', () => {
        const empId = card.getAttribute('data-emp-id');
        state.currentUserId = empId;
        localStorage.setItem('ixl_current_user_id', empId);
        updateUserDisplay();
        closeModal(el.userSelectModal);
        renderSchedule();
        const emp = state.employees.find(e => e.id === empId);
        showToast(`Logged in as ${emp.name}`);
      });
    });
  }

  el.searchUserPickerInput.addEventListener('input', (e) => {
    renderUserSelectGrid(e.target.value);
  });

  // -------------------------------------------------------------
  // Helpers & Calendar Math (Cairo vs Istanbul Holidays)
  // -------------------------------------------------------------

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
        isWeekendCairo: (dow === 5 || dow === 6),     // Cairo: Friday & Saturday
        isWeekendIstanbul: (dow === 0 || dow === 6),  // Istanbul: Saturday & Sunday
        isToday: (dateStr === state.todayStr),
        isPastOrToday: (dateStr <= state.todayStr)
      });
    }
    return days;
  }

  function isWeekendForLocation(dow, location) {
    if (location && location.toLowerCase().includes('istanbul')) {
      // Istanbul: Saturday (6) and Sunday (0)
      return (dow === 0 || dow === 6);
    }
    // Cairo: Friday (5) and Saturday (6)
    return (dow === 5 || dow === 6);
  }

  function getProjectBadgeClass(projectName) {
    if (!projectName) return 'empty';
    if (projectName === 'Day OFF') return 'off';
    if (projectName === 'Different Team Support') return 'support';
    if (projectName.startsWith('Tender')) return 'tender';
    if (projectName.startsWith('Training') || projectName.startsWith('Academy')) return 'training';
    if (projectName === 'NO PROJECT' || projectName === 'NO STATUS') return 'off';
    return 'proj';
  }

  function getCompactLabel(projectName) {
    if (!projectName) return '';
    if (projectName === 'Day OFF') return 'OFF';
    if (projectName === 'Different Team Support') return 'Support';
    if (projectName === 'NO PROJECT') return 'NO PROJ';
    let clean = projectName
      .replace(/^Project - /, '')
      .replace(/^Tender - /, 'T: ')
      .replace(/^Training - /, 'Tr: ')
      .replace(/^Academy - /, 'Acad: ');
    return clean.length > 9 ? clean.substring(0, 8) + '…' : clean;
  }

  // -------------------------------------------------------------
  // Render Schedule Matrix Table (Requirements 5, 7, 8, 9)
  // -------------------------------------------------------------

  function renderSchedule() {
    const days = getDaysInMonth(state.currentMonth);
    el.monthSelect.value = state.currentMonth;

    let headHtml = `
      <tr>
        <th class="col-user" rowspan="2">Team Member</th>
        <th class="col-metric" rowspan="2" title="Total hours allocated for this month">Hours</th>
        ${days.map(d => `
          <th class="col-slot ${d.isToday ? 'is-today' : ''}" title="${d.dateStr}">
            <div class="slot-num">${d.num}</div>
            <div class="slot-name">${d.name}</div>
          </th>
        `).join('')}
      </tr>
      <tr></tr>
    `;
    el.scheduleHead.innerHTML = headHtml;

    let bodyHtml = '';
    let totalMonthHours = 0;
    let totalUnfilledDays = 0;
    let activeEmpCount = 0;

    state.sections.forEach(sec => {
      const secEmployees = state.employees.filter(e => e.sectionId === sec.id && e.active !== false);
      secEmployees.sort((a,b) => a.name.localeCompare(b.name));

      if (secEmployees.length === 0) return;

      bodyHtml += `
        <tr class="group-header-row">
          <td colspan="${days.length + 2}">
            <strong>${sec.name}</strong> • ${secEmployees.length} members
          </td>
        </tr>
      `;

      secEmployees.forEach(emp => {
        activeEmpCount++;
        const empHours = emp.defaultHoursPerDay || 8;
        let empMonthHours = 0;

        const isSelf = (state.currentUserId === emp.id);
        const canEditThisRow = !state.isViewOnly && (state.isAdmin || isSelf);

        let cellsHtml = '';
        days.forEach(d => {
          const key = `${emp.id}_${d.dateStr}`;
          const alloc = state.allocations[key];
          const hasVal = alloc && alloc.project && alloc.project.trim() !== '';
          const projectName = hasVal ? alloc.project.trim() : '';
          const hours = hasVal ? (alloc.hours !== undefined ? alloc.hours : empHours) : 0;

          // Requirement 2: "Different Team Support" IS COUNTED in total hours
          if (hasVal && projectName !== 'Day OFF' && projectName !== 'NO PROJECT' && projectName !== 'NO STATUS') {
            empMonthHours += Number(hours);
          }

          const isWk = isWeekendForLocation(d.dow, sec.location);

          // Requirement 9: Conditional formatting on days NOT filled up to Today
          let isUnfilledPast = false;
          if (!isWk && d.isPastOrToday && !hasVal) {
            isUnfilledPast = true;
            totalUnfilledDays++;
          }

          const badgeClass = getProjectBadgeClass(projectName);
          const shortLabel = getCompactLabel(projectName);

          cellsHtml += `
            <td class="col-slot ${isWk ? 'is-weekend' : ''} ${d.isToday ? 'is-today' : ''} ${isUnfilledPast ? 'slot-unfilled-alert' : ''}" 
                data-emp-id="${emp.id}" 
                data-date="${d.dateStr}">
              <button class="task-chip ${badgeClass}" 
                      data-emp-id="${emp.id}" 
                      data-date="${d.dateStr}"
                      title="${emp.name} | ${d.dateStr}: ${projectName || (isUnfilledPast ? '⚠️ Unfilled workday' : 'Empty')}">
                ${shortLabel}
              </button>
            </td>
          `;
        });

        totalMonthHours += empMonthHours;

        bodyHtml += `
          <tr class="user-row ${isSelf ? 'active-user-row' : ''} ${!canEditThisRow ? 'locked-row' : ''}" data-emp-id="${emp.id}">
            <td class="col-user">
              <div class="user-cell-content">
                <div class="user-mini-avatar">${getInitials(emp.name)}</div>
                <div>
                  <strong style="display:block; font-size:11px;">${emp.name}</strong>
                  <span style="font-size:9px; color:var(--text-muted);">${emp.defaultHoursPerDay || 8}h/day</span>
                </div>
              </div>
            </td>
            <td class="col-metric">${empMonthHours}h</td>
            ${cellsHtml}
          </tr>
        `;
      });
    });

    el.scheduleBody.innerHTML = bodyHtml;

    el.statActiveEmployees.textContent = activeEmpCount;
    el.statCurrentMonthHours.textContent = `${totalMonthHours}h`;
    el.statUnfilledDays.textContent = `${totalUnfilledDays} days`;

    if (!state.isViewOnly) {
      attachCellEvents();
    }
  }

  // -------------------------------------------------------------
  // Cell Click Handlers & Row Permission Enforcement (Requirement 7)
  // -------------------------------------------------------------

  function attachCellEvents() {
    el.scheduleBody.querySelectorAll('.task-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const empId = btn.getAttribute('data-emp-id');
        const dateStr = btn.getAttribute('data-date');

        if (!state.isAdmin && state.currentUserId !== empId) {
          const currentEmp = state.employees.find(x => x.id === state.currentUserId);
          if (!state.currentUserId) {
            showToast('Please identify yourself first from the top bar.', 'warning');
            openUserSelectModal();
          } else {
            showToast(`Editing locked: You are signed in as ${currentEmp ? currentEmp.name : 'another user'}. You can only edit your own row.`, 'warning');
          }
          return;
        }

        openCellPopover(empId, dateStr, btn);
      });
    });
  }

  function openCellPopover(empId, dateStr, targetBtn) {
    state.selectedCell = { empId, dateStr, element: targetBtn };
    const emp = state.employees.find(e => e.id === empId);
    const key = `${empId}_${dateStr}`;
    const alloc = state.allocations[key];

    el.popoverTitle.textContent = emp.name;
    el.popoverSubtitle.textContent = dateStr;
    el.popoverHoursInput.value = alloc && alloc.hours !== undefined ? alloc.hours : (emp.defaultHoursPerDay || 8);
    el.projectSearchInput.value = '';

    renderPopoverProjectList('');

    const rect = targetBtn.getBoundingClientRect();
    const popoverWidth = 320;
    let left = rect.left + window.scrollX;
    if (left + popoverWidth > window.innerWidth - 20) {
      left = window.innerWidth - popoverWidth - 20;
    }
    let top = rect.bottom + window.scrollY + 6;

    el.cellPopover.style.left = `${left}px`;
    el.cellPopover.style.top = `${top}px`;
    el.cellPopover.classList.remove('hidden');

    el.projectSearchInput.focus();
  }

  function renderPopoverProjectList(query) {
    const q = query.toLowerCase();
    const filtered = state.projects.filter(p => 
      p.active !== false && 
      (p.name.toLowerCase().includes(q) || (p.wbs && p.wbs.toLowerCase().includes(q)))
    );

    filtered.sort((a,b) => a.name.localeCompare(b.name));

    el.popoverProjectList.innerHTML = filtered.map(p => `
      <div class="proj-item" data-val="${p.name}">
        <strong>${p.name}</strong>
        ${p.wbs ? `<span class="item-wbs">WBS: ${p.wbs}</span>` : ''}
      </div>
    `).join('');

    el.popoverProjectList.querySelectorAll('.proj-item').forEach(item => {
      item.addEventListener('click', () => {
        saveCellAssignment(item.getAttribute('data-val'));
      });
    });
  }

  el.projectSearchInput.addEventListener('input', (e) => {
    renderPopoverProjectList(e.target.value);
  });

  el.cellPopover.querySelectorAll('.btn-quick-pill').forEach(b => {
    b.addEventListener('click', () => {
      saveCellAssignment(b.getAttribute('data-val'));
    });
  });

  el.applyCellBtn.addEventListener('click', () => {
    const key = `${state.selectedCell.empId}_${state.selectedCell.dateStr}`;
    const alloc = state.allocations[key];
    saveCellAssignment(alloc ? alloc.project : '');
  });

  function saveCellAssignment(projectName) {
    if (!state.selectedCell) return;
    const { empId, dateStr } = state.selectedCell;
    const key = `${empId}_${dateStr}`;
    const hours = Number(el.popoverHoursInput.value) || 8;

    if (!projectName || projectName.trim() === '') {
      delete state.allocations[key];
    } else {
      state.allocations[key] = {
        project: projectName.trim(),
        hours: hours
      };
    }

    closeCellPopover();
    renderSchedule();
    syncToServer();
    showToast('Hours saved');
  }

  function closeCellPopover() {
    el.cellPopover.classList.add('hidden');
    state.selectedCell = null;
  }
  el.closePopoverBtn.addEventListener('click', closeCellPopover);

  document.addEventListener('click', (e) => {
    if (!el.cellPopover.contains(e.target) && !e.target.classList.contains('task-chip')) {
      closeCellPopover();
    }
  });

  // -------------------------------------------------------------
  // Advanced Bulk Fill Modal (Start Date, End Date, Cairo vs Istanbul Holidays)
  // -------------------------------------------------------------

  el.topbarBulkFillBtn.addEventListener('click', () => {
    openBulkFillModal(state.currentUserId, state.todayStr);
  });

  el.openBulkFillBtn.addEventListener('click', () => {
    if (!state.selectedCell) return;
    const { empId, dateStr } = state.selectedCell;
    closeCellPopover();
    openBulkFillModal(empId, dateStr);
  });

  function openBulkFillModal(targetEmpId, defaultDate) {
    // Populate Employee Selector
    const activeEmps = state.employees.filter(e => e.active !== false);
    activeEmps.sort((a,b) => a.name.localeCompare(b.name));

    el.bulkEmployeeSelect.innerHTML = activeEmps.map(e => `
      <option value="${e.id}">${e.name}</option>
    `).join('');

    // Pre-select target employee or current user
    let chosenId = targetEmpId || state.currentUserId || (activeEmps[0] ? activeEmps[0].id : null);
    if (chosenId) el.bulkEmployeeSelect.value = chosenId;

    // Row Lock Permission Check: If not Admin, lock employee select to themselves
    if (!state.isAdmin) {
      if (state.currentUserId) {
        el.bulkEmployeeSelect.value = state.currentUserId;
        el.bulkEmployeeSelect.disabled = true;
      } else {
        showToast('Please identify yourself first.', 'warning');
        openUserSelectModal();
        return;
      }
    } else {
      el.bulkEmployeeSelect.disabled = false;
    }

    // Date range defaults
    const startDt = defaultDate || state.todayStr || "2026-11-01";
    el.bulkFromDate.value = startDt;
    el.bulkToDate.value = startDt;

    // Projects list
    el.bulkProjectSelect.innerHTML = `
      <option value="Day OFF">Day OFF</option>
      <!-- Requirement 2: Different Team Support is counted -->
      <option value="Different Team Support">Different Team Support</option>
      <option value="NO PROJECT">NO PROJECT</option>
      <option value="">-- Clear / Erase Allocations --</option>
      <optgroup label="Projects & Tenders (Alphabetical)">
        ${state.projects.filter(p => p.active !== false).map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
      </optgroup>
    `;

    updateBulkOfficeDetails();
    openModal(el.bulkFillModal);
  }

  function updateBulkOfficeDetails() {
    const empId = el.bulkEmployeeSelect.value;
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;

    const sec = state.sections.find(s => s.id === emp.sectionId) || {};
    const loc = (sec.location || '').toLowerCase();
    const isIstanbul = loc.includes('istanbul');

    el.bulkHoursInput.value = emp.defaultHoursPerDay || 8;

    if (isIstanbul) {
      el.bulkEmployeeOfficeHint.textContent = `Office: Istanbul Team • Holidays: Saturday & Sunday`;
      el.holidayDayOffDetail.innerHTML = `Fills workdays with your project, and automatically sets all holidays as <strong>Day OFF</strong> (Istanbul: <strong>Saturday &amp; Sunday</strong>).`;
    } else {
      el.bulkEmployeeOfficeHint.textContent = `Office: Cairo Team • Holidays: Friday & Saturday`;
      el.holidayDayOffDetail.innerHTML = `Fills workdays with your project, and automatically sets all holidays as <strong>Day OFF</strong> (Cairo: <strong>Friday &amp; Saturday</strong>).`;
    }
  }

  el.bulkEmployeeSelect.addEventListener('change', updateBulkOfficeDetails);

  // Radio button choice styling in bulk fill
  document.querySelectorAll('input[name="bulkHolidayOption"]').forEach(r => {
    r.addEventListener('change', () => {
      const selectedVal = document.querySelector('input[name="bulkHolidayOption"]:checked').value;
      el.holidayDayOffLabel.classList.toggle('selected', selectedVal === 'dayoff');
      el.holidayIncludeLabel.classList.toggle('selected', selectedVal === 'include');
      el.holidaySkipLabel.classList.toggle('selected', selectedVal === 'skip');
    });
  });

  // Execute Bulk Fill (Treating holidays as Day OFF option)
  el.confirmBulkFillBtn.addEventListener('click', () => {
    const empId = el.bulkEmployeeSelect.value;
    const emp = state.employees.find(e => e.id === empId);
    const sec = state.sections.find(s => s.id === emp.sectionId) || {};
    const fromStr = el.bulkFromDate.value;
    const toStr = el.bulkToDate.value;
    const proj = el.bulkProjectSelect.value;
    const hours = Number(el.bulkHoursInput.value) || (emp.defaultHoursPerDay || 8);
    const holidayOption = document.querySelector('input[name="bulkHolidayOption"]:checked').value;

    if (!fromStr || !toStr) {
      alert('Please choose both Start Date and End Date.');
      return;
    }
    if (fromStr > toStr) {
      alert('Start Date cannot be after End Date.');
      return;
    }

    let cur = parseLocalDate(fromStr);
    let currentStr = fromStr;

    let filledWorkdaysCount = 0;
    let holidaysDayOffCount = 0;
    let holidaysSkippedCount = 0;

    // Inclusive loop: exactly fills all days from fromStr up to and including toStr
    while (currentStr <= toStr) {
      const dow = cur.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
      const isHoli = isWeekendForLocation(dow, sec.location);
      const key = `${empId}_${currentStr}`;

      if (isHoli) {
        if (holidayOption === 'dayoff') {
          // Consider holidays as DAY OFF option
          state.allocations[key] = { project: 'Day OFF', hours: 0 };
          holidaysDayOffCount++;
        } else if (holidayOption === 'include') {
          // Work on holidays
          if (!proj || proj.trim() === '') {
            delete state.allocations[key];
          } else {
            state.allocations[key] = { project: proj.trim(), hours: hours };
          }
          filledWorkdaysCount++;
        } else {
          // 'skip'
          holidaysSkippedCount++;
        }
      } else {
        // Normal workday
        if (!proj || proj.trim() === '') {
          delete state.allocations[key];
        } else {
          state.allocations[key] = { project: proj.trim(), hours: hours };
        }
        filledWorkdaysCount++;
      }

      // Advance by 1 day
      cur.setDate(cur.getDate() + 1);
      currentStr = formatLocalDate(cur);
    }

    closeModal(el.bulkFillModal);
    renderSchedule();
    syncToServer();

    if (holidayOption === 'dayoff') {
      showToast(`Filled ${filledWorkdaysCount} workdays with "${proj}" and marked ${holidaysDayOffCount} holidays as "Day OFF" for ${emp.name}.`);
    } else if (holidayOption === 'include') {
      showToast(`Filled all ${filledWorkdaysCount} calendar days with "${proj}" for ${emp.name}.`);
    } else {
      showToast(`Filled ${filledWorkdaysCount} workdays for ${emp.name} (left ${holidaysSkippedCount} holidays untouched).`);
    }
  });

  // -------------------------------------------------------------
  // Requirement 2, 4, 8, 9: Project Management & Baseline Hours
  // -------------------------------------------------------------

  document.getElementById('openProjectsBtn').addEventListener('click', () => {
    renderProjectsModal();
    openModal(el.projectsModal);
  });

  function calculateProjectLoggedHours(projectName) {
    let hrs = 0;
    Object.keys(state.allocations).forEach(k => {
      const item = state.allocations[k];
      if (item && item.project === projectName) {
        hrs += Number(item.hours) || 8;
      }
    });
    return hrs;
  }

  function renderProjectsModal() {
    const tbody = document.getElementById('projectsTableBody');
    const filterText = (document.getElementById('filterProjectTableInput').value || '').toLowerCase();

    state.projects.sort((a,b) => a.name.localeCompare(b.name));

    const filtered = state.projects.filter(p => 
      p.name.toLowerCase().includes(filterText) || (p.wbs && p.wbs.toLowerCase().includes(filterText))
    );

    document.getElementById('projCountBadge').textContent = `${filtered.length} of ${state.projects.length} projects`;

    tbody.innerHTML = filtered.map(p => {
      const baseline = Number(p.initialHours) || 0;
      const logged = calculateProjectLoggedHours(p.name);
      const total = baseline + logged;

      return `
        <tr>
          <td><span class="pill ${getProjectBadgeClass(p.name)}">${p.category || 'Project'}</span></td>
          <td><strong>${p.name}</strong></td>
          <td><code>${p.wbs || '—'}</code></td>
          <td><strong>${baseline}h</strong></td>
          <td>${logged}h</td>
          <td><strong style="color:var(--primary); font-size:12px;">${total}h</strong></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-ghost btn-sm adjust-hours-btn" data-proj-id="${p.id}" ${!state.isAdmin ? 'disabled title="Admin access required"' : ''}>
                ⚡ Adjust Hours
              </button>
              <button class="btn btn-ghost btn-sm delete-proj-btn" data-proj-id="${p.id}" ${!state.isAdmin ? 'disabled title="Admin access required"' : ''}>
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.adjust-hours-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!requireAdmin()) return;
        const pId = btn.getAttribute('data-proj-id');
        openAdjustHoursDialog(pId);
      });
    });

    tbody.querySelectorAll('.delete-proj-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!requireAdmin()) return;
        const pId = btn.getAttribute('data-proj-id');
        const proj = state.projects.find(p => p.id === pId);
        if (confirm(`Are you sure you want to delete "${proj.name}"?`)) {
          state.projects = state.projects.filter(p => p.id !== pId);
          sortAllData();
          renderProjectsModal();
          renderSchedule();
          syncToServer();
          showToast(`Deleted ${proj.name}`);
        }
      });
    });
  }

  document.getElementById('filterProjectTableInput').addEventListener('input', renderProjectsModal);

  document.getElementById('saveNewProjectBtn').addEventListener('click', () => {
    if (!requireAdmin()) return;
    const name = document.getElementById('newProjName').value.trim();
    const wbs = document.getElementById('newProjWbs').value.trim();
    const cat = document.getElementById('newProjCategory').value;
    const initialHours = Number(document.getElementById('newProjInitialHours').value) || 0;

    if (!name) {
      alert('Please enter project name.');
      return;
    }

    const newProj = {
      id: 'proj_' + Date.now(),
      name: name,
      wbs: wbs,
      category: cat,
      initialHours: initialHours,
      active: true
    };

    state.projects.push(newProj);
    sortAllData();

    document.getElementById('newProjName').value = '';
    document.getElementById('newProjWbs').value = '';
    document.getElementById('newProjInitialHours').value = '0';

    renderProjectsModal();
    renderSchedule();
    syncToServer();
    showToast(`Project "${name}" added (${initialHours}h baseline)`);
  });

  function openAdjustHoursDialog(pId) {
    const proj = state.projects.find(p => p.id === pId);
    document.getElementById('adjustProjectName').textContent = proj.name;
    document.getElementById('adjustHoursInput').value = proj.initialHours || 0;
    document.getElementById('adjustProjectId').value = pId;
    openModal(el.adjustHoursModal);
  }

  document.getElementById('saveAdjustedHoursBtn').addEventListener('click', () => {
    if (!requireAdmin()) return;
    const pId = document.getElementById('adjustProjectId').value;
    const newHours = Number(document.getElementById('adjustHoursInput').value) || 0;
    const proj = state.projects.find(p => p.id === pId);
    proj.initialHours = newHours;

    closeModal(el.adjustHoursModal);
    renderProjectsModal();
    renderSchedule();
    syncToServer();
    showToast(`Updated baseline hours for ${proj.name} to ${newHours}h`);
  });

  // -------------------------------------------------------------
  // Requirements 3, 4, 6, 7, 8: Team Members Management
  // -------------------------------------------------------------

  document.getElementById('openTeamBtn').addEventListener('click', () => {
    renderTeamModal();
    openModal(el.teamModal);
  });

  function populateSectionDropdowns() {
    const secSelect = document.getElementById('newMemberSection');
    secSelect.innerHTML = state.sections.map(s => `
      <option value="${s.id}">${s.name}</option>
    `).join('');
  }

  function renderTeamModal() {
    populateSectionDropdowns();
    const tbody = document.getElementById('teamTableBody');
    const filterText = (document.getElementById('filterTeamTableInput').value || '').toLowerCase();
    const showInactive = document.getElementById('showInactiveMembersCheckbox').checked;

    state.employees.sort((a,b) => a.name.localeCompare(b.name));

    const filtered = state.employees.filter(e => {
      if (!showInactive && e.active === false) return false;
      return e.name.toLowerCase().includes(filterText);
    });

    tbody.innerHTML = filtered.map(e => `
      <tr style="${e.active === false ? 'opacity: 0.6; background:#f8fafc;' : ''}">
        <td>
          <span class="pill ${e.active !== false ? 'pill-training' : 'pill-off'}">
            ${e.active !== false ? 'Active' : 'Deactivated'}
          </span>
        </td>
        <td><strong>${e.name}</strong></td>
        <td>
          <select class="form-select form-control-sm move-sec-select" data-emp-id="${e.id}" ${!state.isAdmin ? 'disabled' : ''}>
            ${state.sections.map(s => `
              <option value="${s.id}" ${s.id === e.sectionId ? 'selected' : ''}>${s.name}</option>
            `).join('')}
          </select>
        </td>
        <td>
          <input type="number" class="form-control form-control-sm change-hours-input" style="width: 70px;" 
                 value="${e.defaultHoursPerDay || 8}" min="1" max="24" step="0.5" data-emp-id="${e.id}" 
                 ${!state.isAdmin ? 'disabled' : ''}>
        </td>
        <td>
          ${e.active !== false ? `
            <button class="btn btn-danger btn-sm remove-member-btn" data-emp-id="${e.id}" ${!state.isAdmin ? 'disabled title="Admin access required"' : ''}>
              Remove...
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm reactivate-member-btn" data-emp-id="${e.id}" ${!state.isAdmin ? 'disabled' : ''}>
              Reactivate
            </button>
          `}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.move-sec-select').forEach(sel => {
      sel.addEventListener('change', () => {
        if (!requireAdmin()) return;
        const empId = sel.getAttribute('data-emp-id');
        const emp = state.employees.find(x => x.id === empId);
        emp.sectionId = sel.value;
        renderSchedule();
        syncToServer();
        showToast(`${emp.name} moved to new section`);
      });
    });

    tbody.querySelectorAll('.change-hours-input').forEach(inp => {
      inp.addEventListener('change', () => {
        if (!requireAdmin()) return;
        const empId = inp.getAttribute('data-emp-id');
        const emp = state.employees.find(x => x.id === empId);
        emp.defaultHoursPerDay = Number(inp.value) || 8;
        renderSchedule();
        syncToServer();
        showToast(`Default hours for ${emp.name} set to ${emp.defaultHoursPerDay}h`);
      });
    });

    tbody.querySelectorAll('.remove-member-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!requireAdmin()) return;
        const empId = btn.getAttribute('data-emp-id');
        openRemoveMemberDialog(empId);
      });
    });

    tbody.querySelectorAll('.reactivate-member-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!requireAdmin()) return;
        const empId = btn.getAttribute('data-emp-id');
        const emp = state.employees.find(x => x.id === empId);
        emp.active = true;
        renderTeamModal();
        renderSchedule();
        syncToServer();
        showToast(`${emp.name} reactivated`);
      });
    });
  }

  document.getElementById('filterTeamTableInput').addEventListener('input', renderTeamModal);
  document.getElementById('showInactiveMembersCheckbox').addEventListener('change', renderTeamModal);

  document.getElementById('saveNewMemberBtn').addEventListener('click', () => {
    if (!requireAdmin()) return;
    const name = document.getElementById('newMemberName').value.trim();
    const secId = document.getElementById('newMemberSection').value;
    const hours = Number(document.getElementById('newMemberHours').value) || 8;

    if (!name) {
      alert('Please enter member name.');
      return;
    }

    const newEmp = {
      id: 'emp_' + Date.now(),
      name: name,
      sectionId: secId,
      defaultHoursPerDay: hours,
      active: true
    };

    state.employees.push(newEmp);
    sortAllData();

    document.getElementById('newMemberName').value = '';
    renderTeamModal();
    renderSchedule();
    syncToServer();
    showToast(`Team member "${name}" added`);
  });

  function openRemoveMemberDialog(empId) {
    const emp = state.employees.find(x => x.id === empId);
    document.getElementById('removeMemberTargetName').textContent = emp.name;
    document.getElementById('removeTargetEmpId').value = emp.id;
    document.getElementById('removalTypeDeactivate').checked = true;
    updateRemovalStyles();
    openModal(el.removeMemberModal);
  }

  document.querySelectorAll('input[name="removalType"]').forEach(r => {
    r.addEventListener('change', updateRemovalStyles);
  });

  function updateRemovalStyles() {
    const isPurge = document.getElementById('removalTypePurge').checked;
    document.getElementById('optDeactivateLabel').classList.toggle('selected', !isPurge);
    document.getElementById('optPurgeLabel').classList.toggle('selected', isPurge);
  }

  document.getElementById('confirmRemovalBtn').addEventListener('click', () => {
    if (!requireAdmin()) return;
    const empId = document.getElementById('removeTargetEmpId').value;
    const emp = state.employees.find(x => x.id === empId);
    const isPurge = document.getElementById('removalTypePurge').checked;

    if (isPurge) {
      if (!confirm(`FINAL WARNING: This will permanently purge ${emp.name} and ALL their hours. Proceed?`)) {
        return;
      }
      state.employees = state.employees.filter(x => x.id !== empId);
      Object.keys(state.allocations).forEach(k => {
        if (k.startsWith(`${empId}_`)) delete state.allocations[k];
      });
      showToast(`Purged ${emp.name} and all hours.`);
    } else {
      emp.active = false;
      showToast(`Deactivated ${emp.name}. Recorded hours preserved.`);
    }

    closeModal(el.removeMemberModal);
    renderTeamModal();
    renderSchedule();
    syncToServer();
  });

  // -------------------------------------------------------------
  // Requirement 3 & 6: Secret Admin Password "IXL2026"
  // -------------------------------------------------------------

  el.adminToggleBtn.addEventListener('click', () => {
    if (state.isAdmin) {
      state.isAdmin = false;
      el.adminToggleBtn.textContent = '🔒 Admin Unlock';
      el.adminToggleBtn.className = 'btn btn-admin';
      updateUserDisplay();
      renderSchedule();
      showToast('Admin mode locked');
    } else {
      el.adminPinInput.value = '';
      el.pinErrorMsg.classList.add('hidden');
      openModal(el.adminPinModal);
    }
  });

  el.submitPinBtn.addEventListener('click', () => {
    const pin = el.adminPinInput.value.trim();
    if (pin === "IXL2026") {
      state.isAdmin = true;
      el.adminToggleBtn.textContent = '🔓 Admin Active';
      el.adminToggleBtn.className = 'btn btn-admin unlocked';
      closeModal(el.adminPinModal);
      updateUserDisplay();
      renderSchedule();
      showToast('Admin privileges unlocked!');
    } else {
      el.pinErrorMsg.classList.remove('hidden');
      el.adminPinInput.focus();
    }
  });

  function requireAdmin() {
    if (state.isAdmin) return true;
    el.adminPinInput.value = '';
    el.pinErrorMsg.classList.add('hidden');
    openModal(el.adminPinModal);
    return false;
  }

  // -------------------------------------------------------------
  // Analytics & Monthly Rollup
  // -------------------------------------------------------------

  document.getElementById('openAnalyticsBtn').addEventListener('click', () => {
    renderAnalyticsModal();
    openModal(el.analyticsModal);
  });

  function renderAnalyticsModal() {
    document.getElementById('analyticsMonthLabel').textContent = el.monthSelect.options[el.monthSelect.selectedIndex].text;
    const days = getDaysInMonth(state.currentMonth);
    const dateSet = new Set(days.map(d => d.dateStr));

    const projMap = {};
    let grandTotalHours = 0;

    Object.keys(state.allocations).forEach(k => {
      // Correctly extract date from key formatted as emp_X_YYYY-MM-DD
      const lastUnder = k.lastIndexOf('_');
      const dt = k.substring(lastUnder + 1);

      if (dateSet.has(dt)) {
        const item = state.allocations[k];
        if (item && item.project && item.project !== 'Day OFF' && item.project !== 'NO PROJECT' && item.project !== 'NO STATUS') {
          const pName = item.project;
          if (!projMap[pName]) {
            projMap[pName] = { days: 0, hours: 0 };
          }
          const hrs = Number(item.hours) || 8;
          projMap[pName].days += 1;
          projMap[pName].hours += hrs;
          grandTotalHours += hrs;
        }
      }
    });

    const pTbody = document.getElementById('analyticsProjectBody');
    
    // Include all projects with allocations in this month OR with baseline hours
    const activeProjectNames = new Set(Object.keys(projMap));
    state.projects.forEach(p => {
      if ((Number(p.initialHours) || 0) > 0) {
        activeProjectNames.add(p.name);
      }
    });

    const projectNames = Array.from(activeProjectNames);
    projectNames.sort((a,b) => a.localeCompare(b));

    pTbody.innerHTML = projectNames.map(pName => {
      const pObj = state.projects.find(x => x.name === pName) || {};
      const baseline = Number(pObj.initialHours) || 0;
      const loggedDays = projMap[pName] ? projMap[pName].days : 0;
      const loggedHrs = projMap[pName] ? projMap[pName].hours : 0;
      const totalHrs = baseline + loggedHrs;

      return `
        <tr>
          <td><strong>${pName}</strong></td>
          <td><span class="pill ${getProjectBadgeClass(pName)}">${pObj.category || 'Project'}</span></td>
          <td><code>${pObj.wbs || '—'}</code></td>
          <td>${baseline}h</td>
          <td>${loggedDays}</td>
          <td>${loggedHrs}h</td>
          <td><strong style="color:var(--primary); font-size:12px;">${totalHrs} hrs</strong></td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="7" class="text-center" style="padding:16px; color:var(--text-muted);">No active allocations for this month yet.</td></tr>';
  }

  // -------------------------------------------------------------
  // Month Controls & Navigation
  // -------------------------------------------------------------

  el.monthSelect.addEventListener('change', () => {
    state.currentMonth = el.monthSelect.value;
    renderSchedule();
  });

  el.prevMonthBtn.addEventListener('click', () => {
    const idx = el.monthSelect.selectedIndex;
    if (idx > 0) {
      el.monthSelect.selectedIndex = idx - 1;
      state.currentMonth = el.monthSelect.value;
      renderSchedule();
    }
  });

  el.nextMonthBtn.addEventListener('click', () => {
    const idx = el.monthSelect.selectedIndex;
    if (idx < el.monthSelect.options.length - 1) {
      el.monthSelect.selectedIndex = idx + 1;
      state.currentMonth = el.monthSelect.value;
      renderSchedule();
    }
  });

  el.jumpTodayBtn.addEventListener('click', () => {
    state.currentMonth = state.todayStr.substring(0, 7);
    el.monthSelect.value = state.currentMonth;
    renderSchedule();
    setTimeout(() => {
      const todayEl = document.querySelector('.col-slot.is-today');
      if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 100);
  });

  // -------------------------------------------------------------
  // Requirement 6: Copy View-Only Link
  // -------------------------------------------------------------

  el.copyViewLinkBtn.addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'view');
    navigator.clipboard.writeText(url.toString()).then(() => {
      showToast('View-only link copied!');
    }).catch(() => {
      prompt('Copy view-only link:', url.toString());
    });
  });

  // -------------------------------------------------------------
  // Modal Utilities & Toast
  // -------------------------------------------------------------

  function openModal(modalEl) { modalEl.classList.remove('hidden'); }
  function closeModal(modalEl) { modalEl.classList.add('hidden'); }

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) closeModal(modal);
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCellPopover();
      document.querySelectorAll('.modal').forEach(m => closeModal(m));
    }
  });

  function showToast(msg, type = 'info') {
    el.toast.textContent = msg;
    el.toast.classList.remove('hidden');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      el.toast.classList.add('hidden');
    }, 2800);
  }

  // -------------------------------------------------------------
  // Theme Manager: Light, Dark, Auto (according to daytime)
  // -------------------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem('ixl_theme_mode') || 'auto';
    if (el.themeSelect) {
      el.themeSelect.value = savedTheme;
      el.themeSelect.addEventListener('change', () => {
        const mode = el.themeSelect.value;
        localStorage.setItem('ixl_theme_mode', mode);
        applyTheme(mode);
        const modeName = el.themeSelect.options[el.themeSelect.selectedIndex].text;
        showToast(`Theme set to ${modeName}`);
      });
    }
    applyTheme(savedTheme);

    // Periodically re-check time for Auto mode every 30 seconds
    setInterval(() => {
      const currentMode = localStorage.getItem('ixl_theme_mode') || 'auto';
      if (currentMode === 'auto') {
        applyTheme('auto');
      }
    }, 30000);
  }

  function applyTheme(mode) {
    let effective = mode;
    if (mode === 'auto') {
      const hour = new Date().getHours();
      // Daytime: 06:00 to 18:00 (6 AM to 6 PM) is Light, otherwise Dark
      effective = (hour >= 6 && hour < 18) ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', effective);
  }

  // Boot Application
  initTheme();
  loadData();

})();
