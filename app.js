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

  // Device Persistence Helpers (LocalStorage + 1-Year Cookie fallback)
  function getStoredItem(key) {
    try {
      const val = localStorage.getItem(key);
      if (val !== null && val !== undefined && val !== '') return val;
    } catch (e) {}
    try {
      const match = document.cookie.match(new RegExp('(?:^|; )' + key + '=([^;]*)'));
      if (match) return decodeURIComponent(match[1]);
    } catch (e) {}
    return null;
  }

  function setStoredItem(key, val) {
    try {
      localStorage.setItem(key, val);
    } catch (e) {}
    try {
      // 1-year persistent cookie, SameSite=Lax, path=/
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `${key}=${encodeURIComponent(val)}; max-age=${maxAge}; path=/; SameSite=Lax`;
    } catch (e) {}
  }

  function removeStoredItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
    try {
      document.cookie = `${key}=; max-age=0; path=/; SameSite=Lax`;
    } catch (e) {}
  }

  function persistUserIdentity(empId, empName) {
    if (empId) {
      setStoredItem('ixl_current_user_id', empId);
    } else {
      removeStoredItem('ixl_current_user_id');
    }
    if (empName) {
      setStoredItem('ixl_current_user_name', empName);
    } else {
      removeStoredItem('ixl_current_user_name');
    }
  }

  function resolveStoredUser() {
    const savedId = getStoredItem('ixl_current_user_id');
    const savedName = getStoredItem('ixl_current_user_name');

    let matchedEmp = null;
    if (savedId) {
      matchedEmp = state.employees.find(e => e.id === savedId);
    }
    if (!matchedEmp && savedName) {
      const sName = savedName.trim().toLowerCase();
      matchedEmp = state.employees.find(e => e.name && e.name.trim().toLowerCase() === sName);
    }

    if (matchedEmp) {
      state.currentUserId = matchedEmp.id;
      persistUserIdentity(matchedEmp.id, matchedEmp.name);
    } else if (savedId) {
      state.currentUserId = savedId;
    }
    return matchedEmp;
  }

  // Application State
  const state = {
    sections: [],
    employees: [],
    projects: [],
    statuses: ["Day OFF", "NO PROJECT", "NO STATUS"],
    allocations: {}, // "empId_YYYY-MM-DD" -> { project: string, hours: number }
    currentMonth: "2026-11", // Fresh start month
    todayStr: "2026-11-01",
    currentUserId: getStoredItem('ixl_current_user_id') || null,
    isAdmin: getStoredItem('ixl_is_admin') === 'true',
    adminPin: "IXL2026",
    isViewOnly: false,
    selectedCell: null,
    pendingAdminCell: null,
    selectedCells: new Set(),
    selectedEmpId: null,
    isMultiEditing: false,
    popoverCategory: 'all',
    currentContribEmpId: null,
    contribFilter: 'all',
    isConnected: true,
    collapsedSections: (() => {
      try {
        const raw = getStoredItem('ixl_collapsed_sections');
        return new Set(raw ? JSON.parse(raw) : []);
      } catch (e) {
        return new Set();
      }
    })()
  };

  // DOM Elements Cache
  const el = {
    connectionLamp: document.getElementById('connectionLamp'),
    connectionText: document.getElementById('connectionText'),
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
    tableScrollArea: document.querySelector('.table-scroll-area'),
    scheduleTable: document.getElementById('scheduleTable'),
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
    popoverCategorySelect: document.getElementById('popoverCategorySelect'),
    popoverCategoryPills: document.getElementById('popoverCategoryPills'),
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
    deleteProjectModal: document.getElementById('deleteProjectModal'),
    teamModal: document.getElementById('teamModal'),
    removeMemberModal: document.getElementById('removeMemberModal'),
    adjustHoursModal: document.getElementById('adjustHoursModal'),
    analyticsModal: document.getElementById('analyticsModal'),
    adminPinModal: document.getElementById('adminPinModal'),

    // Admin Elements
    adminToggleBtn: document.getElementById('adminToggleBtn'),
    topbarAdminBtn: document.getElementById('topbarAdminBtn'),
    topbarAdminIcon: document.getElementById('topbarAdminIcon'),
    topbarAdminText: document.getElementById('topbarAdminText'),
    adminPinInput: document.getElementById('adminPinInput'),
    submitPinBtn: document.getElementById('submitPinBtn'),
    forgotPinBtn: document.getElementById('forgotPinBtn'),
    forgotPinRecoveryBox: document.getElementById('forgotPinRecoveryBox'),
    forgotPinDeniedMsg: document.getElementById('forgotPinDeniedMsg'),
    pinErrorMsg: document.getElementById('pinErrorMsg'),

    // Change Admin Password Modal
    openChangePasswordBtn: document.getElementById('openChangePasswordBtn'),
    changePasswordModal: document.getElementById('changePasswordModal'),
    currentAdminPinInput: document.getElementById('currentAdminPinInput'),
    newAdminPinInput1: document.getElementById('newAdminPinInput1'),
    newAdminPinInput2: document.getElementById('newAdminPinInput2'),
    changePinErrorMsg: document.getElementById('changePinErrorMsg'),
    saveChangePinBtn: document.getElementById('saveChangePinBtn'),
    cancelChangePinBtn: document.getElementById('cancelChangePinBtn'),

    // Employee Monthly Contributions Modal
    employeeContributionsModal: document.getElementById('employeeContributionsModal'),
    contribAvatar: document.getElementById('contribAvatar'),
    contribEmpNameDisplay: document.getElementById('contribEmpNameDisplay'),
    contribSectionDisplay: document.getElementById('contribSectionDisplay'),
    contribMonthDisplay: document.getElementById('contribMonthDisplay'),
    contribTotalHours: document.getElementById('contribTotalHours'),
    contribAvgDaily: document.getElementById('contribAvgDaily'),
    contribLoggedDays: document.getElementById('contribLoggedDays'),
    contribCoveragePercent: document.getElementById('contribCoveragePercent'),
    contribDailyDefault: document.getElementById('contribDailyDefault'),
    contribLocationType: document.getElementById('contribLocationType'),
    contribOffDays: document.getElementById('contribOffDays'),
    contribOffBreakdown: document.getElementById('contribOffBreakdown'),
    contribProjectChips: document.getElementById('contribProjectChips'),
    contribDaysTableBody: document.getElementById('contribDaysTableBody'),
    contribFilterAll: document.getElementById('contribFilterAll'),
    contribFilterRecorded: document.getElementById('contribFilterRecorded'),

    // Multi-Cell Selection Elements
    multiSelectBar: document.getElementById('multiSelectBar'),
    multiSelectCount: document.getElementById('multiSelectCount'),
    multiSelectEmpName: document.getElementById('multiSelectEmpName'),
    multiEditAssignBtn: document.getElementById('multiEditAssignBtn'),
    multiQuickOffBtn: document.getElementById('multiQuickOffBtn'),
    multiQuickNoProjBtn: document.getElementById('multiQuickNoProjBtn'),
    multiQuickClearBtn: document.getElementById('multiQuickClearBtn'),
    multiSelectCancelBtn: document.getElementById('multiSelectCancelBtn'),

    // NO PROJECT Days Manager
    openNoProjectDaysBtn: document.getElementById('openNoProjectDaysBtn'),
    noProjectCountBadge: document.getElementById('noProjectCountBadge'),
    noProjectModal: document.getElementById('noProjectModal'),
    noProjectEmpNameDisplay: document.getElementById('noProjectEmpNameDisplay'),
    noProjectMonthDisplay: document.getElementById('noProjectMonthDisplay'),
    noProjectEmpSelect: document.getElementById('noProjectEmpSelect'),
    noProjectBatchBox: document.getElementById('noProjectBatchBox'),
    noProjectBatchSelect: document.getElementById('noProjectBatchSelect'),
    noProjectBatchApplyBtn: document.getElementById('noProjectBatchApplyBtn'),
    noProjectTableWrap: document.getElementById('noProjectTableWrap'),
    noProjectTableBody: document.getElementById('noProjectTableBody'),
    noProjectEmptyState: document.getElementById('noProjectEmptyState'),

    // Settings & Tools Drawer
    toggleSettingsSidebarBtn: document.getElementById('toggleSettingsSidebarBtn'),
    closeSettingsSidebarBtn: document.getElementById('closeSettingsSidebarBtn'),
    collapseSettingsBtn: document.getElementById('collapseSettingsBtn'),
    settingsSidebar: document.getElementById('settingsSidebar'),
    settingsSidebarOverlay: document.getElementById('settingsSidebarOverlay'),
    adminToggleLabel: document.getElementById('adminToggleLabel'),
    adminToggleSub: document.getElementById('adminToggleSub'),
    adminIcon: document.getElementById('adminIcon'),

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

  // User-facing date formatting: DD/MM/YYYY
  function formatDateDMY(dateInput) {
    if (!dateInput) return '';
    if (typeof dateInput === 'string') {
      const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, y, m, d] = match;
        return `${d}/${m}/${y}`;
      }
    }
    const dt = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    if (isNaN(dt.getTime())) return String(dateInput);
    const d = String(dt.getDate()).padStart(2, '0');
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const y = dt.getFullYear();
    return `${d}/${m}/${y}`;
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
    el.viewModeBanner.classList.remove('hidden');
    if (el.userPermissionBanner) el.userPermissionBanner.classList.add('hidden');
    el.adminToggleBtn.classList.add('hidden');
    el.topbarBulkFillBtn.classList.add('hidden');
    if (el.openChangePasswordBtn) el.openChangePasswordBtn.classList.add('hidden');
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
    state.statuses = data.statuses || ["Day OFF", "NO PROJECT", "NO STATUS"];
    state.allocations = data.allocations || {};
    state.adminPin = data.adminPin || "IXL2026";

    state.projects.forEach(p => {
      if (p.name.startsWith('GP - ')) {
        p.name = 'Project - ' + p.name.substring(5);
        p.name = p.name.replace(' - LOT1 - ', ' - Lot1 - ').replace(' - LOT2 - ', ' - Lot2 - ');
        p.category = 'Project';
      }
      if (p.initialHours === undefined) p.initialHours = 0;
    });

    Object.keys(state.allocations).forEach(k => {
      const a = state.allocations[k];
      if (a && a.project && a.project.startsWith('GP - ')) {
        a.project = 'Project - ' + a.project.substring(5);
        a.project = a.project.replace(' - LOT1 - ', ' - Lot1 - ').replace(' - LOT2 - ', ' - Lot2 - ');
      }
    });

    sortAllData();

    resolveStoredUser();

    // Admin rights option is ONLY available if using the name (Peter MOUNIR)
    if (!isCurrentUserPeter()) {
      state.isAdmin = false;
      removeStoredItem('ixl_is_admin');
    }

    updateAdminUI();
    updateUserDisplay();
    renderSchedule();
    populateSectionDropdowns();

    if (!state.isViewOnly && !state.currentUserId) {
      setTimeout(() => openUserSelectModal(), 500);
    } else if (state.currentUserId && state.currentUserId !== 'view-all') {
      scrollToActiveUserRow();
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
  // Requirement: Admin rights option is ONLY available to Peter MOUNIR
  // -------------------------------------------------------------

  function isCurrentUserPeter() {
    if (!state.currentUserId) return false;
    const emp = state.employees.find(e => e.id === state.currentUserId);
    if (!emp || !emp.name) return false;
    return emp.name.trim().toLowerCase() === 'peter mounir';
  }

  // -------------------------------------------------------------
  // Requirement 7: User Identification & Row Permission Enforcement
  // -------------------------------------------------------------

  function updateUserDisplay() {
    if (state.isViewOnly) {
      if (el.userPermissionBanner) {
        el.userPermissionBanner.classList.remove('admin-active-banner');
        el.userPermissionBanner.classList.add('hidden');
      }
      return;
    }

    if (!state.currentUserId) {
      el.currentUserNameDisplay.textContent = 'Select Your Name';
      el.userAvatarInitials.textContent = '?';
      if (state.isAdmin && isCurrentUserPeter()) {
        el.userPermissionBanner.classList.remove('hidden');
        el.userPermissionBanner.classList.add('admin-active-banner');
        el.userPermissionBanner.innerHTML = `<span><strong>Admin Mode Active:</strong> You have full permission to edit and allocate hours for <em>any employee</em> on any day.</span>`;
      } else {
        el.userPermissionBanner.classList.remove('admin-active-banner');
        el.userPermissionBanner.classList.add('hidden');
      }
      return;
    }

    if (state.currentUserId === 'view-all') {
      el.currentUserNameDisplay.textContent = 'View All';
      el.userAvatarInitials.textContent = 'ALL';
      el.userPermissionBanner.classList.remove('admin-active-banner');
      el.userPermissionBanner.classList.remove('hidden');
      el.userPermissionBanner.innerHTML = `<span><strong>View All (Read Only):</strong> Viewing all employee schedules. Editing is disabled. Choose your name above to start editing.</span>`;
      return;
    }

    const currentEmp = state.employees.find(e => e.id === state.currentUserId);
    if (currentEmp) {
      el.currentUserNameDisplay.textContent = currentEmp.name;
      el.userAvatarInitials.textContent = getInitials(currentEmp.name);
      if (el.permBannerName) el.permBannerName.textContent = currentEmp.name;
      
      if (state.isAdmin && isCurrentUserPeter()) {
        el.userPermissionBanner.classList.remove('hidden');
        el.userPermissionBanner.classList.add('admin-active-banner');
        el.userPermissionBanner.innerHTML = `<span><strong>Admin Mode Active:</strong> You are signed in as <strong>${currentEmp.name}</strong> with full admin permission to edit all cells for all employees.</span>`;
      } else {
        el.userPermissionBanner.classList.remove('admin-active-banner');
        el.userPermissionBanner.classList.remove('hidden');
        if (isCurrentUserPeter()) {
          el.userPermissionBanner.innerHTML = `<span>You are editing as <strong id="permBannerName">${currentEmp.name}</strong>. You can only edit days in your own schedule row. (Click 'Admin Unlock' above to edit all employees).</span>`;
        } else {
          el.userPermissionBanner.innerHTML = `<span>You are editing as <strong id="permBannerName">${currentEmp.name}</strong>. You can only edit days in your own schedule row.</span>`;
        }
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
    const q = (query || '').toLowerCase().trim();
    const isViewAllSelected = (state.currentUserId === 'view-all');

    let viewAllCardHtml = '';
    if (!q || 'view all'.includes(q) || 'all'.includes(q) || 'read only'.includes(q)) {
      viewAllCardHtml = `
        <div class="user-select-card view-all-card ${isViewAllSelected ? 'active-selected' : ''}" data-emp-id="view-all">
          <div class="user-avatar-circle view-all-avatar">ALL</div>
          <div class="card-info">
            <strong style="display:flex; align-items:center; gap:6px;">
              View All (Read Only)
              <span class="view-all-pill">View All</span>
            </strong>
            <span>All employees &bull; Editing disabled</span>
          </div>
        </div>
      `;
    }

    const activeEmps = state.employees.filter(e => e.active !== false && e.name.toLowerCase().includes(q));
    activeEmps.sort((a,b) => a.name.localeCompare(b.name));

    const empsHtml = activeEmps.map(emp => {
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

    el.userSelectGrid.innerHTML = viewAllCardHtml + empsHtml;

    el.userSelectGrid.querySelectorAll('.user-select-card').forEach(card => {
      card.addEventListener('click', () => {
        const empId = card.getAttribute('data-emp-id');
        if (empId === 'view-all') {
          state.currentUserId = 'view-all';
          persistUserIdentity('view-all', 'View All');
          state.isAdmin = false;
          removeStoredItem('ixl_is_admin');
          updateAdminUI();
          updateUserDisplay();
          closeModal(el.userSelectModal);
          renderSchedule();
          showToast('Viewing all employees (Read Only)');
          return;
        }

        const emp = state.employees.find(e => e.id === empId);
        state.currentUserId = empId;
        persistUserIdentity(empId, emp ? emp.name : '');

        // Revoke admin if chosen user is not Peter MOUNIR
        if (!isCurrentUserPeter()) {
          state.isAdmin = false;
          removeStoredItem('ixl_is_admin');
        }

        updateAdminUI();
        updateUserDisplay();
        closeModal(el.userSelectModal);
        renderSchedule();
        if (emp) showToast(`Logged in as ${emp.name}`);
        scrollToActiveUserRow();
      });
    });
  }

  function scrollToActiveUserRow() {
    if (!state.currentUserId || state.currentUserId === 'view-all') return;
    setTimeout(() => {
      const currentEmp = state.employees.find(e => e.id === state.currentUserId);
      if (currentEmp && currentEmp.sectionId && state.collapsedSections.has(currentEmp.sectionId)) {
        state.collapsedSections.delete(currentEmp.sectionId);
        renderSchedule();
      }
      setTimeout(() => {
        const myRow = document.querySelector('.user-row.active-user-row');
        if (myRow) {
          myRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 80);
    }, 150);
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

  function formatYearMonth(yearMonth, short = false) {
    if (!yearMonth) return '';
    const parts = yearMonth.split('-');
    if (parts.length < 2) return yearMonth;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const shortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const name = short ? shortNames[m - 1] : fullNames[m - 1];
    return `${name || m} ${y}`;
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
      .replace(/^GP - /, 'GP: ')
      .replace(/^Tender - /, 'T: ')
      .replace(/^Training - /, 'Tr: ')
      .replace(/^Academy - /, 'Acad: ');
    
    // Dynamic text truncation based on current day column width (Excel behavior)
    const colWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--day-col-width')) || 48;
    const maxChars = Math.max(8, Math.floor(colWidth / 6.5));
    return clean.length > maxChars ? clean.substring(0, maxChars - 1) + '…' : clean;
  }

  // -------------------------------------------------------------
  // Render Schedule Matrix Table (Requirements 5, 7, 8, 9)
  // -------------------------------------------------------------

  function renderSchedule() {
    const days = getDaysInMonth(state.currentMonth);
    el.monthSelect.value = state.currentMonth;
    const isAllCollapsed = state.sections.length > 0 && state.collapsedSections.size >= state.sections.length;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [y, m] = state.currentMonth.split('-').map(Number);
    const mName = monthNames[m - 1] || 'Month';

    let headHtml = `
      <tr>
        <th class="col-user" rowspan="2">
          <div class="user-col-header-bar">
            <span>Team Member</span>
            <div class="th-group-actions" title="Toggle expand/collapse all sections">
              <button type="button" class="btn-group-action" id="thToggleAllGroups" title="${isAllCollapsed ? 'Expand all sections' : 'Collapse all sections'}">${isAllCollapsed ? '▸' : '▾'} All</button>
            </div>
          </div>
          <div class="col-resizer resizer-user" title="Drag to resize Employee column (Excel style)"></div>
        </th>
        <th class="col-metric" rowspan="2" title="Total hours allocated for this month">Hours</th>
        ${days.map(d => `
          <th class="col-slot ${d.isToday ? 'is-today' : ''}" title="${formatDateDMY(d.dateStr)}">
            <div class="slot-num">${d.num}</div>
            <div class="slot-name">${d.name}</div>
            <div class="col-resizer resizer-day" title="Drag to resize Day columns (Excel style)"></div>
          </th>
        `).join('')}
      </tr>
      <tr></tr>
    `;
    el.scheduleHead.innerHTML = headHtml;
    attachColumnResizers();

    let bodyHtml = '';
    let activeEmpCount = 0;
    let userMonthHours = 0;
    let userUnfilledDays = 0;
    let userFound = false;

    const isViewAll = (state.currentUserId === 'view-all');
    const isFocusedMode = !!state.currentUserId && !isViewAll && !(state.isAdmin && isCurrentUserPeter());

    const tableEl = el.scheduleTable || document.getElementById('scheduleTable');
    if (isFocusedMode) {
      document.body.classList.add('has-focused-user');
      if (tableEl) tableEl.classList.add('has-focused-user');
    } else {
      document.body.classList.remove('has-focused-user');
      if (tableEl) tableEl.classList.remove('has-focused-user');
    }

    state.sections.forEach(sec => {
      const secEmployees = state.employees.filter(e => e.sectionId === sec.id && e.active !== false);
      secEmployees.sort((a,b) => a.name.localeCompare(b.name));

      if (secEmployees.length === 0) return;

      const isCollapsed = state.collapsedSections.has(sec.id);
      let secRowsHtml = '';

      secEmployees.forEach(emp => {
        activeEmpCount++;
        const empHours = emp.defaultHoursPerDay || 8;
        let empMonthHours = 0;
        let empUnfilledDays = 0;

        const isSelf = (state.currentUserId === emp.id);
        const canEditThisRow = !state.isViewOnly && !isViewAll && ((state.isAdmin && isCurrentUserPeter()) || isSelf);
        const isUnfocused = isFocusedMode && !isSelf;

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

          // Count unfilled workdays for this employee in the currently viewed month
          if (!isWk && !hasVal) {
            empUnfilledDays++;
          }

          // Visual highlight on past/today workdays that are still missing an allocation
          let isUnfilledPast = false;
          if (!isWk && d.isPastOrToday && !hasVal) {
            isUnfilledPast = true;
          }

          const badgeClass = getProjectBadgeClass(projectName);
          const shortLabel = getCompactLabel(projectName);

          const isSelected = state.selectedCells.has(key);

          cellsHtml += `
            <td class="col-slot ${isWk ? 'is-weekend' : ''} ${d.isToday ? 'is-today' : ''} ${isUnfilledPast ? 'slot-unfilled-alert' : ''} ${isSelected ? 'is-selected-cell' : ''}" 
                data-emp-id="${emp.id}" 
                data-date="${d.dateStr}">
              <button class="task-chip ${badgeClass}" 
                      data-emp-id="${emp.id}" 
                      data-date="${d.dateStr}"
                      title="${emp.name} | ${formatDateDMY(d.dateStr)}: ${projectName || (isUnfilledPast ? 'Unfilled workday' : 'Empty')}">
                ${shortLabel}
              </button>
            </td>
          `;
        });

        if (isSelf) {
          userFound = true;
          userMonthHours = empMonthHours;
          userUnfilledDays = empUnfilledDays;
        }

        // Count ALL NO PROJECT days across all dates for this employee
        let empNoProjCount = 0;
        const empPrefix = `${emp.id}_`;
        for (const [k, alloc] of Object.entries(state.allocations)) {
          if (k.startsWith(empPrefix) && alloc && alloc.project === 'NO PROJECT') {
            empNoProjCount++;
          }
        }

        secRowsHtml += `
          <tr class="user-row ${isCollapsed ? 'is-collapsed-row' : ''} ${isSelf ? 'active-user-row' : ''} ${isUnfocused ? 'unfocused-row' : ''} ${!canEditThisRow ? 'locked-row' : ''}" 
              data-emp-id="${emp.id}" 
              data-section-id="${sec.id}">
            <td class="col-user" data-emp-id="${emp.id}" title="Double-click to view monthly contributions for ${emp.name}">
              <div class="user-cell-content" data-emp-id="${emp.id}">
                <div class="user-mini-avatar">${getInitials(emp.name)}</div>
                <div>
                  <div class="user-name-line">
                    <strong style="font-size:11px;" class="user-name-text">${emp.name}</strong>
                    ${isSelf ? '<span class="my-row-badge">My Row</span>' : ''}
                    <span class="emp-unfilled-pill ${empUnfilledDays === 0 ? 'is-all-filled' : ''}" 
                          title="${empUnfilledDays} unfilled workday${empUnfilledDays === 1 ? '' : 's'} in ${mName} (excluding ${sec.location} holidays)">
                      ${empUnfilledDays} unfilled
                    </span>
                  </div>
                  ${empNoProjCount > 0 ? `
                    <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                      <button class="emp-no-proj-badge" data-emp-id="${emp.id}" title="Click to view & edit all ${empNoProjCount} NO PROJECT days for ${emp.name}">${empNoProjCount} NO PROJ</button>
                    </div>
                  ` : ''}
                </div>
              </div>
            </td>
            <td class="col-metric">${empMonthHours}h</td>
            ${cellsHtml}
          </tr>
        `;
      });

      bodyHtml += `
        <tr class="group-header-row ${isCollapsed ? 'is-collapsed' : ''}" 
            data-section-id="${sec.id}" 
            title="Click to ${isCollapsed ? 'expand' : 'shrink'} ${sec.name}">
          <td colspan="${days.length + 2}">
            <div class="group-header-content">
              <span class="group-toggle-icon">${isCollapsed ? '▶' : '▼'}</span>
              <strong class="group-title">${sec.name}</strong>
              <span class="group-badge">${secEmployees.length} members</span>
            </div>
          </td>
        </tr>
      ` + secRowsHtml;
    });

    el.scheduleBody.innerHTML = bodyHtml;

    if (el.statActiveEmployees) el.statActiveEmployees.textContent = activeEmpCount;
    const teamModalCount = document.getElementById('teamModalActiveMembersCount');
    if (teamModalCount) teamModalCount.textContent = activeEmpCount;
    const settingsActiveCount = document.getElementById('settingsTeamActiveCount');
    if (settingsActiveCount) settingsActiveCount.textContent = activeEmpCount;

    const labelHours = document.getElementById('labelCurrentMonthHours');
    if (labelHours) labelHours.textContent = `${mName} Hours:`;
    const labelUnfilled = document.getElementById('labelUnfilledDays');
    if (labelUnfilled) labelUnfilled.textContent = `${mName} Unfilled:`;

    // Calculate Hours and Unfilled specifically for the identified user in the current month
    const currentEmp = state.employees.find(e => e.id === state.currentUserId);
    if (currentEmp) {
      if (!userFound) {
        // Fallback calculation in case user's section was not rendered or active
        const userSec = state.sections.find(s => s.id === currentEmp.sectionId);
        const userLoc = userSec ? userSec.location : 'Cairo';
        const empHours = currentEmp.defaultHoursPerDay || 8;
        userMonthHours = 0;
        userUnfilledDays = 0;
        days.forEach(d => {
          const key = `${currentEmp.id}_${d.dateStr}`;
          const alloc = state.allocations[key];
          const hasVal = alloc && alloc.project && alloc.project.trim() !== '';
          const projectName = hasVal ? alloc.project.trim() : '';
          const hours = hasVal ? (alloc.hours !== undefined ? alloc.hours : empHours) : 0;

          if (hasVal && projectName !== 'Day OFF' && projectName !== 'NO PROJECT' && projectName !== 'NO STATUS') {
            userMonthHours += Number(hours);
          }

          const isWk = isWeekendForLocation(d.dow, userLoc);
          if (!isWk && !hasVal) {
            userUnfilledDays++;
          }
        });
      }

      el.statCurrentMonthHours.textContent = `${userMonthHours}h`;
      el.statUnfilledDays.textContent = `${userUnfilledDays} days`;
      el.statCurrentMonthHours.title = `${currentEmp.name}: ${userMonthHours}h in ${mName}`;
      el.statUnfilledDays.title = `${currentEmp.name}: ${userUnfilledDays} unfilled workdays in ${mName}`;
    } else {
      el.statCurrentMonthHours.textContent = '—';
      el.statUnfilledDays.textContent = '—';
      el.statCurrentMonthHours.title = 'Select your name to view your hours';
      el.statUnfilledDays.title = 'Select your name to view your unfilled workdays';
    }

    // Attach group header click listeners (toggle expand/shrink)
    el.scheduleBody.querySelectorAll('.group-header-row').forEach(row => {
      row.addEventListener('click', () => {
        const secId = row.getAttribute('data-section-id');
        if (secId) toggleSectionCollapse(secId);
      });
    });

    // Header expand/collapse all toggle button
    const thToggle = document.getElementById('thToggleAllGroups');
    if (thToggle) {
      thToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAllSections();
      });
    }

    if (!state.isViewOnly) {
      attachCellEvents();
    }

    renderSectionDrawerControls();
  }

  // -------------------------------------------------------------
  // Team Section Expand / Shrink Management
  // -------------------------------------------------------------

  function saveCollapsedSections() {
    try {
      localStorage.setItem('ixl_collapsed_sections', JSON.stringify(Array.from(state.collapsedSections)));
    } catch (e) {
      console.error('Failed to save collapsed sections', e);
    }
  }

  function updateToggleAllButton() {
    const thToggle = document.getElementById('thToggleAllGroups');
    if (!thToggle) return;
    const isAllCollapsed = state.sections.length > 0 && state.collapsedSections.size >= state.sections.length;
    thToggle.textContent = `${isAllCollapsed ? '▸' : '▾'} All`;
    thToggle.title = isAllCollapsed ? 'Expand all sections' : 'Collapse all sections';
  }

  function toggleAllSections() {
    const isAllCollapsed = state.sections.length > 0 && state.collapsedSections.size >= state.sections.length;
    if (isAllCollapsed) {
      expandAllSections();
    } else {
      collapseAllSections();
    }
  }

  function toggleSectionCollapse(secId) {
    if (state.collapsedSections.has(secId)) {
      state.collapsedSections.delete(secId);
    } else {
      state.collapsedSections.add(secId);
    }
    saveCollapsedSections();

    const isNowCollapsed = state.collapsedSections.has(secId);

    // Toggle employee rows in DOM immediately
    el.scheduleBody.querySelectorAll(`tr.user-row[data-section-id="${secId}"]`).forEach(r => {
      r.classList.toggle('is-collapsed-row', isNowCollapsed);
    });

    // Update group header row
    const headerRow = el.scheduleBody.querySelector(`tr.group-header-row[data-section-id="${secId}"]`);
    if (headerRow) {
      headerRow.classList.toggle('is-collapsed', isNowCollapsed);
      headerRow.title = `Click to ${isNowCollapsed ? 'expand' : 'shrink'} this section`;
      const icon = headerRow.querySelector('.group-toggle-icon');
      if (icon) icon.textContent = isNowCollapsed ? '▶' : '▼';
    }

    renderSectionDrawerControls();
    updateToggleAllButton();
  }

  function expandAllSections() {
    state.collapsedSections.clear();
    saveCollapsedSections();
    el.scheduleBody.querySelectorAll('tr.user-row').forEach(r => r.classList.remove('is-collapsed-row'));
    el.scheduleBody.querySelectorAll('tr.group-header-row').forEach(hr => {
      hr.classList.remove('is-collapsed');
      const icon = hr.querySelector('.group-toggle-icon');
      if (icon) icon.textContent = '▼';
    });
    renderSectionDrawerControls();
    updateToggleAllButton();
    showToast('All team sections expanded');
  }

  function collapseAllSections() {
    state.sections.forEach(s => state.collapsedSections.add(s.id));
    saveCollapsedSections();
    el.scheduleBody.querySelectorAll('tr.user-row').forEach(r => r.classList.add('is-collapsed-row'));
    el.scheduleBody.querySelectorAll('tr.group-header-row').forEach(hr => {
      hr.classList.add('is-collapsed');
      const icon = hr.querySelector('.group-toggle-icon');
      if (icon) icon.textContent = '▶';
    });
    renderSectionDrawerControls();
    updateToggleAllButton();
    showToast('All team sections shrunk');
  }

  function renderSectionDrawerControls() {
    const container = document.getElementById('sectionTogglesContainer');
    const desc = document.getElementById('sectionsSummaryDesc');
    if (!container) return;

    const total = state.sections.length;
    const collapsedCount = state.collapsedSections.size;
    if (desc) {
      if (collapsedCount === 0) desc.textContent = `All ${total} groups expanded`;
      else if (collapsedCount === total) desc.textContent = `All ${total} groups shrunk`;
      else desc.textContent = `${total - collapsedCount} expanded, ${collapsedCount} shrunk`;
    }

    let html = '';
    state.sections.forEach(sec => {
      const isCol = state.collapsedSections.has(sec.id);
      const count = state.employees.filter(e => e.sectionId === sec.id && e.active !== false).length;
      html += `
        <div class="section-toggle-card">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <strong style="font-size:12px;">${sec.name}</strong>
            <span style="font-size:10px; color:var(--text-muted);">${count} members • ${sec.location}</span>
          </div>
          <button type="button" class="section-toggle-btn ${isCol ? 'is-collapsed' : ''}" data-section-id="${sec.id}">
            ${isCol ? '▶ Shrunk' : '▼ Expanded'}
          </button>
        </div>
      `;
    });
    container.innerHTML = html;

    container.querySelectorAll('.section-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const secId = btn.getAttribute('data-section-id');
        if (secId) toggleSectionCollapse(secId);
      });
    });
  }

  // -------------------------------------------------------------
  // Excel-Style Column Resizing (Drag & Sliders)
  // -------------------------------------------------------------

  function attachColumnResizers() {
    el.scheduleHead.querySelectorAll('.col-resizer').forEach(resizer => {
      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isUserCol = resizer.classList.contains('resizer-user');
        const startX = e.pageX;
        const rootStyle = getComputedStyle(document.documentElement);
        const startWidth = isUserCol 
          ? parseInt(rootStyle.getPropertyValue('--user-col-width')) || 210
          : parseInt(rootStyle.getPropertyValue('--day-col-width')) || 48;

        resizer.classList.add('is-resizing');
        document.body.classList.add('is-resizing-columns');

        function onMouseMove(moveEvent) {
          const deltaX = moveEvent.pageX - startX;
          if (isUserCol) {
            const newWidth = Math.max(160, Math.min(360, startWidth + deltaX));
            document.documentElement.style.setProperty('--user-col-width', `${newWidth}px`);
            localStorage.setItem('ixl_user_col_width', newWidth);
          } else {
            const newWidth = Math.max(40, Math.min(180, startWidth + deltaX));
            setDayColumnWidth(newWidth, false);
          }
        }

        function onMouseUp() {
          resizer.classList.remove('is-resizing');
          document.body.classList.remove('is-resizing-columns');
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);

          if (!isUserCol) {
            renderSchedule();
          }
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      // Double-click to auto-fit to standard
      resizer.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (resizer.classList.contains('resizer-user')) {
          document.documentElement.style.setProperty('--user-col-width', `210px`);
          localStorage.setItem('ixl_user_col_width', 210);
        } else {
          setDayColumnWidth(48);
          renderSchedule();
        }
      });
    });
  }

  function setDayColumnWidth(width, rerenderTable = true) {
    const w = Math.max(40, Math.min(180, Number(width)));
    document.documentElement.style.setProperty('--day-col-width', `${w}px`);
    localStorage.setItem('ixl_day_col_width', w);

    const slider = document.getElementById('colWidthSlider');
    if (slider) slider.value = w;

    const label = document.getElementById('dayWidthLabel');
    if (label) {
      let desc = 'Custom';
      if (w <= 52) desc = 'Compact';
      else if (w <= 85) desc = 'Medium';
      else if (w <= 125) desc = 'Wide';
      else desc = 'Full';
      label.textContent = `${w}px (${desc})`;
    }

    document.querySelectorAll('.density-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.getAttribute('data-width')) === w);
    });

    if (rerenderTable) {
      // Re-evaluate compact label lengths
      document.querySelectorAll('.task-chip').forEach(chip => {
        const title = chip.getAttribute('title') || '';
        const match = title.match(/\|\s*\d{4}-\d{2}-\d{2}:\s*(.*)$/);
        if (match && match[1]) {
          const raw = match[1].trim();
          if (raw && raw !== 'Empty' && !raw.startsWith('Unfilled')) {
            chip.textContent = getCompactLabel(raw);
          }
        }
      });
    }
  }

  function initColumnWidths() {
    const savedUserWidth = localStorage.getItem('ixl_user_col_width');
    if (savedUserWidth) {
      document.documentElement.style.setProperty('--user-col-width', `${savedUserWidth}px`);
    }

    const savedDayWidth = localStorage.getItem('ixl_day_col_width') || 48;
    setDayColumnWidth(savedDayWidth, false);

    // Preset density buttons
    document.querySelectorAll('.density-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = Number(btn.getAttribute('data-width'));
        setDayColumnWidth(w);
      });
    });

    // Slider
    const slider = document.getElementById('colWidthSlider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        setDayColumnWidth(e.target.value);
      });
    }

    // Reset button
    const resetBtn = document.getElementById('resetColWidthBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        document.documentElement.style.setProperty('--user-col-width', `210px`);
        localStorage.setItem('ixl_user_col_width', 210);
        setDayColumnWidth(48);
        renderSchedule();
        showToast('Column widths reset to standard');
      });
    }
  }

  // -------------------------------------------------------------
  // Cell Click Handlers & Row Permission Enforcement (Requirement 7)
  // -------------------------------------------------------------

  function attachCellEvents() {
    el.scheduleBody.querySelectorAll('td.col-user').forEach(userCell => {
      userCell.addEventListener('dblclick', (e) => {
        const empId = userCell.getAttribute('data-emp-id');
        if (empId) {
          openEmployeeContributions(empId);
        }
      });
    });

    el.scheduleBody.querySelectorAll('.emp-no-proj-badge').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const empId = badge.getAttribute('data-emp-id');
        openNoProjectModal(empId);
      });
    });

    el.scheduleBody.querySelectorAll('td.col-slot').forEach(slot => {
      slot.addEventListener('dragstart', (e) => e.preventDefault());

      slot.addEventListener('mousedown', (e) => {
        handleCellMouseDown(slot, e);
      });

      slot.addEventListener('mouseenter', (e) => {
        if (!cellDragState.isMouseDown) return;
        if ((e.buttons & 1) === 0) {
          handleGlobalMouseUp(e);
          return;
        }
        handleDragMoveToSlot(slot);
      });

      slot.addEventListener('click', (e) => {
        if (cellDragState.suppressClick) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (state.isViewOnly || state.currentUserId === 'view-all') {
          showToast('View-only: Editing is disabled. Choose your name above to edit.', 'warning');
          return;
        }
        const empId = slot.getAttribute('data-emp-id');
        const dateStr = slot.getAttribute('data-date');
        if (!empId || !dateStr) return;

        const targetBtn = slot.querySelector('.task-chip') || slot;
        const key = `${empId}_${dateStr}`;
        const isMulti = e.ctrlKey || e.metaKey;

        // Permission check: Admin (Peter MOUNIR only) or Self can edit/select
        const canEditThisRow = (state.isAdmin && isCurrentUserPeter()) || (state.currentUserId === empId);

        if (!canEditThisRow) {
          const targetEmp = state.employees.find(x => x.id === empId);
          const currentEmp = state.employees.find(x => x.id === state.currentUserId);
          if (isMulti) {
            showToast(`You can only select cells in your own schedule row (${currentEmp ? currentEmp.name : 'Signed In'}).`, 'warning');
          } else if (isCurrentUserPeter()) {
            state.pendingAdminCell = { empId, dateStr, element: targetBtn };
            el.adminPinInput.value = '';
            el.pinErrorMsg.classList.add('hidden');
            openModal(el.adminPinModal);
            showToast(`Admin PIN required to edit schedule for ${targetEmp ? targetEmp.name : 'other team members'}.`, 'warning');
          } else {
            showToast(`You can only edit days in your own schedule row (${currentEmp ? currentEmp.name : 'Signed In'}).`, 'warning');
          }
          return;
        }

        if (isMulti) {
          toggleCellSelection(empId, key, slot);
          return;
        }

        // Normal click (not multi-select)
        if (state.selectedCells.size > 0) {
          if (state.selectedCells.has(key)) {
            // Clicked an already selected cell: open multi-edit popover!
            openMultiCellPopover(targetBtn);
            return;
          } else {
            // Clicked a different cell: clear multi-selection and open this cell directly
            clearSelection();
          }
        }

        openCellPopover(empId, dateStr, targetBtn);
      });
    });

    initGlobalCellDragListeners();
  }

  // -------------------------------------------------------------
  // Click-and-Hold + Drag Range Selection Management (2D: Vertical & Horizontal in Admin)
  // -------------------------------------------------------------

  const cellDragState = {
    isMouseDown: false,
    isDragging: false,
    isHoldSelecting: false,
    holdTimer: null,
    startSlot: null,
    startEmpId: null,
    startDateStr: null,
    startRowIndex: -1,
    startColIndex: -1,
    allVisibleRows: [],
    baseSelectedCells: new Set(),
    isMultiMode: false,
    suppressClick: false,
    autoScrollRaf: null,
    lastClientX: 0,
    lastClientY: 0
  };

  let _cellDragGlobalInitialized = false;
  function initGlobalCellDragListeners() {
    if (_cellDragGlobalInitialized) return;
    _cellDragGlobalInitialized = true;
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('blur', () => {
      stopAutoScroll();
      if (cellDragState.isMouseDown) handleGlobalMouseUp();
    });
  }

  function activate2DSelection(currentRowIdx, currentColIdx) {
    if (!cellDragState.allVisibleRows || cellDragState.allVisibleRows.length === 0) return;
    const isAdmin = state.isAdmin && isCurrentUserPeter();

    // In admin mode, row selection spans vertically; in non-admin mode, locked to startRowIndex (horizontal only)
    const minRow = isAdmin 
      ? Math.max(0, Math.min(cellDragState.startRowIndex, currentRowIdx))
      : cellDragState.startRowIndex;
    const maxRow = isAdmin 
      ? Math.min(cellDragState.allVisibleRows.length - 1, Math.max(cellDragState.startRowIndex, currentRowIdx))
      : cellDragState.startRowIndex;

    const minCol = Math.max(0, Math.min(cellDragState.startColIndex, currentColIdx));
    const maxCol = Math.max(cellDragState.startColIndex, currentColIdx);

    // If starting a fresh drag (not multi-mode), clear previous DOM selections outside base
    if (!cellDragState.isMultiMode) {
      document.querySelectorAll('.schedule-table td.is-selected-cell').forEach(td => {
        td.classList.remove('is-selected-cell');
      });
    }

    const newSelectedKeys = new Set(cellDragState.baseSelectedCells);

    for (let r = minRow; r <= maxRow; r++) {
      const row = cellDragState.allVisibleRows[r];
      if (!row) continue;
      const empId = row.getAttribute('data-emp-id');
      if (!empId) continue;

      const slots = Array.from(row.querySelectorAll('td.col-slot'));
      const boundedMaxCol = Math.min(slots.length - 1, maxCol);

      for (let c = minCol; c <= boundedMaxCol; c++) {
        const slot = slots[c];
        if (slot) {
          const dateStr = slot.getAttribute('data-date');
          if (dateStr) {
            newSelectedKeys.add(`${empId}_${dateStr}`);
          }
        }
      }
    }

    // Apply visual selection classes across all visible rows
    cellDragState.allVisibleRows.forEach(row => {
      const empId = row.getAttribute('data-emp-id');
      if (!empId) return;
      row.querySelectorAll('td.col-slot').forEach(slot => {
        const dateStr = slot.getAttribute('data-date');
        const k = `${empId}_${dateStr}`;
        if (newSelectedKeys.has(k)) {
          slot.classList.add('is-selected-cell');
        } else if (!cellDragState.baseSelectedCells.has(k)) {
          slot.classList.remove('is-selected-cell');
        }
      });
    });

    state.selectedCells = newSelectedKeys;
    if (minRow === maxRow) {
      state.selectedEmpId = cellDragState.allVisibleRows[minRow].getAttribute('data-emp-id');
    } else {
      state.selectedEmpId = null;
    }

    updateMultiSelectUI();
  }

  // Alias for backward compatibility
  const activateSelectionForRange = activate2DSelection;

  function handleCellMouseDown(slot, e) {
    if (e.button !== 0) return; // Left mouse button only
    if (state.isViewOnly || state.currentUserId === 'view-all') return;

    const empId = slot.getAttribute('data-emp-id');
    const dateStr = slot.getAttribute('data-date');
    if (!empId || !dateStr) return;

    // Check row permissions
    const canEditThisRow = (state.isAdmin && isCurrentUserPeter()) || (state.currentUserId === empId);
    if (!canEditThisRow) return;

    const allVisibleRows = Array.from(el.scheduleBody.querySelectorAll('tr.user-row:not(.is-collapsed-row)'));
    const row = slot.closest('tr.user-row');
    if (!row) return;

    const startRowIndex = allVisibleRows.indexOf(row);
    if (startRowIndex === -1) return;

    const rowSlots = Array.from(row.querySelectorAll('td.col-slot'));
    const startColIndex = rowSlots.indexOf(slot);
    if (startColIndex === -1) return;

    const isMultiMode = e.ctrlKey || e.metaKey;
    const baseSelected = (isMultiMode) 
      ? new Set(state.selectedCells) 
      : new Set();

    cellDragState.isMouseDown = true;
    cellDragState.isDragging = false;
    cellDragState.isHoldSelecting = false;
    cellDragState.startSlot = slot;
    cellDragState.startEmpId = empId;
    cellDragState.startDateStr = dateStr;
    cellDragState.startRowIndex = startRowIndex;
    cellDragState.startColIndex = startColIndex;
    cellDragState.allVisibleRows = allVisibleRows;
    cellDragState.baseSelectedCells = baseSelected;
    cellDragState.isMultiMode = isMultiMode;
    cellDragState.suppressClick = false;
    cellDragState.lastClientX = e.clientX;
    cellDragState.lastClientY = e.clientY;

    if (cellDragState.holdTimer) {
      clearTimeout(cellDragState.holdTimer);
    }

    // Left click and hold timer (220ms): selecting this cell upon hold
    cellDragState.holdTimer = setTimeout(() => {
      if (!cellDragState.isMouseDown) return;
      cellDragState.isHoldSelecting = true;
      cellDragState.suppressClick = true;
      document.body.classList.add('is-cell-dragging');
      closeCellPopover();

      // Hold established: select this single cell
      activate2DSelection(startRowIndex, startColIndex);
    }, 220);
  }

  function handleDragMoveToSlot(slot) {
    if (!cellDragState.isMouseDown) return;
    const row = slot.closest('tr.user-row');
    if (!row) return;
    const rIdx = cellDragState.allVisibleRows.indexOf(row);
    if (rIdx === -1) return;

    const rowSlots = Array.from(row.querySelectorAll('td.col-slot'));
    const cIdx = rowSlots.indexOf(slot);
    if (cIdx === -1) return;

    handleDragMoveToCoords(rIdx, cIdx);
  }

  function handleDragMoveToCoords(rIdx, cIdx) {
    if (!cellDragState.isMouseDown) return;
    const isAdmin = state.isAdmin && isCurrentUserPeter();
    const effectiveRIdx = isAdmin ? rIdx : cellDragState.startRowIndex;

    // If moved to a different coordinate or hold is already active, activate drag selection
    if (effectiveRIdx !== cellDragState.startRowIndex || cIdx !== cellDragState.startColIndex || cellDragState.isHoldSelecting) {
      if (cellDragState.holdTimer) {
        clearTimeout(cellDragState.holdTimer);
        cellDragState.holdTimer = null;
      }
      cellDragState.isDragging = true;
      cellDragState.suppressClick = true;
      document.body.classList.add('is-cell-dragging');
      closeCellPopover();

      activate2DSelection(effectiveRIdx, cIdx);
    }
  }

  function handleGlobalMouseUp(e) {
    stopAutoScroll();
    if (!cellDragState.isMouseDown) return;
    if (cellDragState.holdTimer) {
      clearTimeout(cellDragState.holdTimer);
      cellDragState.holdTimer = null;
    }

    const wasActive = cellDragState.isHoldSelecting || cellDragState.isDragging;
    cellDragState.isMouseDown = false;
    cellDragState.isDragging = false;
    cellDragState.isHoldSelecting = false;
    document.body.classList.remove('is-cell-dragging');

    if (wasActive) {
      cellDragState.suppressClick = true;
      updateMultiSelectUI();
      setTimeout(() => {
        cellDragState.suppressClick = false;
      }, 80);
    }
  }

  function handleGlobalMouseMove(e) {
    if (!cellDragState.isMouseDown) return;
    if ((e.buttons & 1) === 0) {
      handleGlobalMouseUp(e);
      return;
    }

    cellDragState.lastClientX = e.clientX;
    cellDragState.lastClientY = e.clientY;

    checkAndTriggerAutoScroll();

    const hovered = document.elementFromPoint(e.clientX, e.clientY);
    if (!hovered) return;

    const hoveredSlot = hovered.closest('td.col-slot');
    if (hoveredSlot) {
      handleDragMoveToSlot(hoveredSlot);
      return;
    }

    // Clamping if dragged left into user column or hours column of a row
    const userRow = hovered.closest('tr.user-row');
    if (userRow) {
      const rIdx = cellDragState.allVisibleRows.indexOf(userRow);
      if (rIdx !== -1) {
        if (hovered.closest('td.col-user') || hovered.closest('td.col-metric')) {
          handleDragMoveToCoords(rIdx, 0);
          return;
        }
      }
    }

    // In Admin mode: if dragged up into schedule header or above while table is at top (scrollTop <= 0)
    const isAdmin = state.isAdmin && isCurrentUserPeter();
    const scrollArea = el.tableScrollArea || document.querySelector('.table-scroll-area');
    if (isAdmin && scrollArea && scrollArea.scrollTop <= 0) {
      const thEl = el.scheduleHead ? el.scheduleHead.querySelector('th') : null;
      const headerHeight = thEl ? thEl.offsetHeight : 45;
      const rect = scrollArea.getBoundingClientRect();
      const stickyHeadBottom = rect.top + headerHeight;

      if (e.clientY <= stickyHeadBottom) {
        const row0 = cellDragState.allVisibleRows[0];
        if (row0) {
          const slots = Array.from(row0.querySelectorAll('td.col-slot'));
          if (slots.length > 0) {
            let targetCol = 0;
            if (e.clientX <= slots[0].getBoundingClientRect().left) {
              targetCol = 0;
            } else if (e.clientX >= slots[slots.length - 1].getBoundingClientRect().right) {
              targetCol = slots.length - 1;
            } else {
              for (let c = 0; c < slots.length; c++) {
                const sRect = slots[c].getBoundingClientRect();
                if (e.clientX >= sRect.left && e.clientX <= sRect.right) {
                  targetCol = c;
                  break;
                }
              }
            }
            handleDragMoveToCoords(0, targetCol);
            return;
          }
        }
      }
    }

    // In Admin mode: if dragged down below table while table is at bottom
    if (isAdmin && scrollArea && scrollArea.scrollTop >= (scrollArea.scrollHeight - scrollArea.clientHeight - 1)) {
      const rect = scrollArea.getBoundingClientRect();
      if (e.clientY >= rect.bottom) {
        const lastRowIdx = cellDragState.allVisibleRows.length - 1;
        const lastRow = cellDragState.allVisibleRows[lastRowIdx];
        if (lastRow) {
          const slots = Array.from(lastRow.querySelectorAll('td.col-slot'));
          if (slots.length > 0) {
            let targetCol = 0;
            if (e.clientX <= slots[0].getBoundingClientRect().left) {
              targetCol = 0;
            } else if (e.clientX >= slots[slots.length - 1].getBoundingClientRect().right) {
              targetCol = slots.length - 1;
            } else {
              for (let c = 0; c < slots.length; c++) {
                const sRect = slots[c].getBoundingClientRect();
                if (e.clientX >= sRect.left && e.clientX <= sRect.right) {
                  targetCol = c;
                  break;
                }
              }
            }
            handleDragMoveToCoords(lastRowIdx, targetCol);
            return;
          }
        }
      }
    }
  }

  function checkAndTriggerAutoScroll() {
    if (!cellDragState.isMouseDown) {
      stopAutoScroll();
      return;
    }
    const scrollArea = el.tableScrollArea || document.querySelector('.table-scroll-area');
    if (!scrollArea) return;

    const rect = scrollArea.getBoundingClientRect();
    const metricTh = el.scheduleHead ? el.scheduleHead.querySelector('.col-metric') : null;
    const stickyEdgeRight = metricTh ? metricTh.getBoundingClientRect().right : (rect.left + 270);

    const clientX = cellDragState.lastClientX;
    const rightZoneStart = Math.min(rect.right - 45, window.innerWidth - 45);
    const leftZoneEnd = stickyEdgeRight + 45;

    const canScrollRight = scrollArea.scrollLeft < (scrollArea.scrollWidth - scrollArea.clientWidth - 1);
    const canScrollLeft = scrollArea.scrollLeft > 0;

    const inRightZone = clientX >= rightZoneStart && canScrollRight;
    const inLeftZone = clientX <= leftZoneEnd && canScrollLeft;

    const isAdmin = state.isAdmin && isCurrentUserPeter();
    const clientY = cellDragState.lastClientY;
    const thEl = el.scheduleHead ? el.scheduleHead.querySelector('th') : null;
    const headerHeight = thEl ? thEl.offsetHeight : 45;
    const stickyHeadBottom = rect.top + headerHeight;

    const topZoneEnd = stickyHeadBottom + 35;
    const bottomZoneStart = Math.min(rect.bottom - 45, window.innerHeight - 45);

    const canScrollDown = scrollArea.scrollTop < (scrollArea.scrollHeight - scrollArea.clientHeight - 1);
    const canScrollUp = scrollArea.scrollTop > 0;

    const inBottomZone = isAdmin && clientY >= bottomZoneStart && canScrollDown;
    const inTopZone = isAdmin && clientY <= topZoneEnd && canScrollUp;

    if (inRightZone || inLeftZone || inBottomZone || inTopZone) {
      if (!cellDragState.autoScrollRaf) {
        startAutoScroll();
      }
    } else {
      stopAutoScroll();
    }
  }

  function startAutoScroll() {
    if (cellDragState.autoScrollRaf) return;

    function step() {
      if (!cellDragState.isMouseDown) {
        stopAutoScroll();
        return;
      }

      const scrollArea = el.tableScrollArea || document.querySelector('.table-scroll-area');
      if (!scrollArea || !cellDragState.allVisibleRows || cellDragState.allVisibleRows.length === 0) {
        stopAutoScroll();
        return;
      }

      const rect = scrollArea.getBoundingClientRect();
      const metricTh = el.scheduleHead ? el.scheduleHead.querySelector('.col-metric') : null;
      const stickyEdgeRight = metricTh ? metricTh.getBoundingClientRect().right : (rect.left + 270);

      const clientX = cellDragState.lastClientX;
      const clientY = cellDragState.lastClientY;
      const rightZoneStart = Math.min(rect.right - 45, window.innerWidth - 45);
      const leftZoneEnd = stickyEdgeRight + 45;

      const canScrollRight = scrollArea.scrollLeft < (scrollArea.scrollWidth - scrollArea.clientWidth - 1);
      const canScrollLeft = scrollArea.scrollLeft > 0;

      const isAdmin = state.isAdmin && isCurrentUserPeter();
      const thEl = el.scheduleHead ? el.scheduleHead.querySelector('th') : null;
      const headerHeight = thEl ? thEl.offsetHeight : 45;
      const stickyHeadBottom = rect.top + headerHeight;

      const topZoneEnd = stickyHeadBottom + 35;
      const bottomZoneStart = Math.min(rect.bottom - 45, window.innerHeight - 45);

      const canScrollDown = scrollArea.scrollTop < (scrollArea.scrollHeight - scrollArea.clientHeight - 1);
      const canScrollUp = scrollArea.scrollTop > 0;

      let scrolled = false;

      // Horizontal auto-scroll
      if (clientX >= rightZoneStart && canScrollRight) {
        const deltaX = Math.min(32, Math.max(8, Math.round(8 + (clientX - rightZoneStart) * 0.4)));
        scrollArea.scrollLeft += deltaX;
        scrolled = true;
      } else if (clientX <= leftZoneEnd && canScrollLeft) {
        const deltaX = Math.min(32, Math.max(8, Math.round(8 + (leftZoneEnd - clientX) * 0.4)));
        scrollArea.scrollLeft -= deltaX;
        scrolled = true;
      }

      // Vertical auto-scroll (Admin mode)
      if (isAdmin) {
        if (clientY >= bottomZoneStart && canScrollDown) {
          const deltaY = Math.min(32, Math.max(8, Math.round(8 + (clientY - bottomZoneStart) * 0.4)));
          scrollArea.scrollTop += deltaY;
          scrolled = true;
        } else if (clientY <= topZoneEnd && canScrollUp) {
          const deltaY = Math.min(32, Math.max(8, Math.round(8 + (topZoneEnd - clientY) * 0.4)));
          scrollArea.scrollTop -= deltaY;
          scrolled = true;
        }
      }

      // Automatically advance range selection in the direction of the drag
      if (cellDragState.isMouseDown) {
        if (cellDragState.holdTimer) {
          clearTimeout(cellDragState.holdTimer);
          cellDragState.holdTimer = null;
        }
        cellDragState.isDragging = true;
        cellDragState.suppressClick = true;
        document.body.classList.add('is-cell-dragging');
        closeCellPopover();

        // Determine target row based on vertical pointer position
        let targetRowIdx = cellDragState.startRowIndex;
        if (isAdmin) {
          if (clientY >= bottomZoneStart) {
            // Dragging downwards near/beyond bottom border
            const probeY = Math.min(rect.bottom - 10, window.innerHeight - 10);
            for (let r = cellDragState.allVisibleRows.length - 1; r >= 0; r--) {
              const rRect = cellDragState.allVisibleRows[r].getBoundingClientRect();
              if (rRect.top <= probeY) {
                targetRowIdx = r;
                break;
              }
            }
          } else if (clientY <= topZoneEnd) {
            // Dragging upwards near/beyond top sticky header
            const probeY = stickyHeadBottom + 5;
            for (let r = 0; r < cellDragState.allVisibleRows.length; r++) {
              const rRect = cellDragState.allVisibleRows[r].getBoundingClientRect();
              if (rRect.bottom >= probeY) {
                targetRowIdx = r;
                break;
              }
            }
          } else {
            for (let r = 0; r < cellDragState.allVisibleRows.length; r++) {
              const rRect = cellDragState.allVisibleRows[r].getBoundingClientRect();
              if (clientY >= rRect.top && clientY <= rRect.bottom) {
                targetRowIdx = r;
                break;
              }
            }
          }
        }

        const targetRow = cellDragState.allVisibleRows[targetRowIdx];
        if (targetRow) {
          const slots = Array.from(targetRow.querySelectorAll('td.col-slot'));
          if (slots.length > 0) {
            let targetColIdx = cellDragState.startColIndex;
            if (clientX >= rightZoneStart) {
              // Dragging rightwards: pick the slot visible near the right boundary
              const probeX = Math.min(rect.right - 8, window.innerWidth - 8);
              for (let c = slots.length - 1; c >= 0; c--) {
                const sRect = slots[c].getBoundingClientRect();
                if (sRect.left <= probeX) {
                  targetColIdx = c;
                  break;
                }
              }
            } else if (clientX <= leftZoneEnd) {
              // Dragging leftwards: pick the slot visible emerging from sticky columns
              const probeX = stickyEdgeRight + 8;
              for (let c = 0; c < slots.length; c++) {
                const sRect = slots[c].getBoundingClientRect();
                if (sRect.right >= probeX) {
                  targetColIdx = c;
                  break;
                }
              }
            } else {
              for (let c = 0; c < slots.length; c++) {
                const sRect = slots[c].getBoundingClientRect();
                if (clientX >= sRect.left && clientX <= sRect.right) {
                  targetColIdx = c;
                  break;
                }
              }
            }
            handleDragMoveToCoords(targetRowIdx, targetColIdx);
          }
        }
      }

      if (scrolled) {
        cellDragState.autoScrollRaf = requestAnimationFrame(step);
      } else {
        cellDragState.autoScrollRaf = null;
      }
    }

    cellDragState.autoScrollRaf = requestAnimationFrame(step);
  }

  function stopAutoScroll() {
    if (cellDragState.autoScrollRaf) {
      cancelAnimationFrame(cellDragState.autoScrollRaf);
      cellDragState.autoScrollRaf = null;
    }
  }

  // -------------------------------------------------------------
  // Multi-Cell Selection Management
  // -------------------------------------------------------------

  function getSelectedUniqueEmployees() {
    const empIds = new Set();
    state.selectedCells.forEach(key => {
      const lastUnder = key.lastIndexOf('_');
      if (lastUnder !== -1) {
        empIds.add(key.substring(0, lastUnder));
      }
    });
    return Array.from(empIds).map(id => state.employees.find(e => e.id === id)).filter(Boolean);
  }

  function toggleCellSelection(empId, key, slotEl) {
    const isAdmin = state.isAdmin && isCurrentUserPeter();
    if (!isAdmin && state.selectedCells.size > 0 && state.selectedEmpId !== empId) {
      clearSelection();
    }
    if (!isAdmin) {
      state.selectedEmpId = empId;
    }

    if (state.selectedCells.has(key)) {
      state.selectedCells.delete(key);
      if (slotEl) slotEl.classList.remove('is-selected-cell');
      if (state.selectedCells.size === 0) {
        state.selectedEmpId = null;
      }
    } else {
      state.selectedCells.add(key);
      if (slotEl) slotEl.classList.add('is-selected-cell');
    }

    updateMultiSelectUI();
  }

  function clearSelection() {
    state.selectedCells.clear();
    state.selectedEmpId = null;
    state.isMultiEditing = false;
    document.querySelectorAll('.schedule-table td.is-selected-cell').forEach(td => {
      td.classList.remove('is-selected-cell');
    });
    updateMultiSelectUI();
  }

  function updateMultiSelectUI() {
    if (!el.multiSelectBar) return;
    const count = state.selectedCells.size;
    if (count === 0) {
      el.multiSelectBar.classList.add('hidden');
      return;
    }

    el.multiSelectBar.classList.remove('hidden');
    el.multiSelectCount.textContent = `${count} cell${count > 1 ? 's' : ''} selected`;
    
    const uniqueEmps = getSelectedUniqueEmployees();
    if (uniqueEmps.length === 1) {
      el.multiSelectEmpName.textContent = `(${uniqueEmps[0].name})`;
    } else if (uniqueEmps.length > 1) {
      el.multiSelectEmpName.textContent = `(${uniqueEmps.length} members)`;
    } else {
      el.multiSelectEmpName.textContent = '';
    }
  }

  function openMultiCellPopover(targetBtn) {
    if (state.selectedCells.size === 0) return;
    const uniqueEmps = getSelectedUniqueEmployees();
    if (uniqueEmps.length === 0) return;

    state.isMultiEditing = true;
    const dates = Array.from(new Set(Array.from(state.selectedCells).map(k => {
      const lastUnder = k.lastIndexOf('_');
      return k.substring(lastUnder + 1);
    }))).sort();

    if (uniqueEmps.length === 1) {
      const emp = uniqueEmps[0];
      el.popoverTitle.textContent = `Assign ${dates.length} Days for ${emp.name}`;
      el.popoverSubtitle.textContent = dates.length <= 3 
        ? dates.join(', ') 
        : `${dates.slice(0, 3).join(', ')} +${dates.length - 3} more`;
      el.popoverHoursInput.value = Math.min(12, Math.max(1, emp ? (emp.defaultHoursPerDay || 8) : 8));
    } else {
      el.popoverTitle.textContent = `Assign ${state.selectedCells.size} Cells (${uniqueEmps.length} Members)`;
      el.popoverSubtitle.textContent = dates.length <= 3 
        ? `${dates.join(', ')} across ${uniqueEmps.length} team members` 
        : `${dates.slice(0, 3).join(', ')} +${dates.length - 3} more across ${uniqueEmps.length} team members`;
      el.popoverHoursInput.value = 8;
    }

    el.projectSearchInput.value = '';
    setPopoverCategory('all', false);
    renderPopoverProjectList('');

    const anchorEl = targetBtn || el.multiEditAssignBtn;
    const rect = anchorEl.getBoundingClientRect();
    const popoverWidth = 320;
    let left = rect.left + window.scrollX;
    if (left + popoverWidth > window.innerWidth - 20) {
      left = window.innerWidth - popoverWidth - 20;
    }
    let top = rect.top + window.scrollY - 370;
    if (top < 10) top = rect.bottom + window.scrollY + 6;

    el.cellPopover.style.left = `${left}px`;
    el.cellPopover.style.top = `${top}px`;
    el.cellPopover.classList.remove('hidden');

    el.projectSearchInput.focus();
  }

  // -------------------------------------------------------------
  // Daily Hours Validation: Projects, Tenders, and Special (1 to 12h)
  // -------------------------------------------------------------

  function isWorkActivity(projectName) {
    if (!projectName) return false;
    const trimmed = projectName.trim();
    if (!trimmed || trimmed === 'Day OFF' || trimmed === 'NO STATUS') return false;
    return true;
  }

  function sanitizeDayHours(projectName, rawHours, fallbackHours = 8) {
    if (!projectName || projectName.trim() === '' || projectName.trim() === 'Day OFF') {
      return 0;
    }
    let h = parseFloat(rawHours);
    if (isNaN(h)) h = parseFloat(fallbackHours) || 8;

    if (isWorkActivity(projectName)) {
      if (h < 1) h = 1;
      if (h > 12) h = 12;
    } else {
      if (h < 0) h = 0;
      if (h > 24) h = 24;
    }
    return Math.round(h * 10) / 10;
  }

  function batchApplyToSelectedCells(projectName, hours) {
    if (state.selectedCells.size === 0) return;
    const count = state.selectedCells.size;
    const uniqueEmps = getSelectedUniqueEmployees();

    state.selectedCells.forEach(key => {
      const lastUnder = key.lastIndexOf('_');
      const cellEmpId = key.substring(0, lastUnder);
      const cellEmp = state.employees.find(e => e.id === cellEmpId);
      const fallbackH = cellEmp ? (cellEmp.defaultHoursPerDay || 8) : 8;
      const sanitizedHours = sanitizeDayHours(projectName, hours, fallbackH);

      if (!projectName || projectName.trim() === '') {
        delete state.allocations[key];
      } else {
        state.allocations[key] = {
          project: projectName.trim(),
          hours: sanitizedHours
        };
      }
    });

    clearSelection();
    closeCellPopover();
    renderSchedule();
    syncToServer();

    if (!projectName || projectName.trim() === '') {
      if (uniqueEmps.length === 1) {
        showToast(`Cleared allocations on ${count} cell${count === 1 ? '' : 's'} for ${uniqueEmps[0].name}`);
      } else {
        showToast(`Cleared allocations on ${count} cells across ${uniqueEmps.length} team members`);
      }
    } else {
      if (uniqueEmps.length === 1) {
        showToast(`Updated ${count} cell${count === 1 ? '' : 's'} for ${uniqueEmps[0].name}`);
      } else {
        showToast(`Updated ${count} cells across ${uniqueEmps.length} team members`);
      }
    }
  }

  function openCellPopover(empId, dateStr, targetBtn) {
    state.selectedCell = { empId, dateStr, element: targetBtn };
    const emp = state.employees.find(e => e.id === empId);
    const key = `${empId}_${dateStr}`;
    const alloc = state.allocations[key];

    el.popoverTitle.textContent = emp.name;
    el.popoverSubtitle.textContent = formatDateDMY(dateStr);
    const baseH = alloc && alloc.hours !== undefined ? alloc.hours : (emp ? (emp.defaultHoursPerDay || 8) : 8);
    el.popoverHoursInput.value = Math.min(12, Math.max(1, Number(baseH) || 8));
    el.projectSearchInput.value = '';
    setPopoverCategory('all', false);

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

  function isProjectMatchingCategory(p, cat) {
    if (!cat || cat === 'all') return true;
    const name = p.name;
    const pCat = p.category || '';

    if (cat === 'Special') {
      return pCat === 'Special' || pCat === 'Training' || pCat === 'Support' ||
             name.startsWith('Academy') || name.startsWith('Training') || name.includes('Different Team Support');
    }
    if (cat === 'Tender') {
      return name.startsWith('Tender') || pCat === 'Tender';
    }
    if (cat === 'Project') {
      const isSpecial = (pCat === 'Training' || pCat === 'Support' || name.startsWith('Academy') || name.startsWith('Training') || name.includes('Different Team Support'));
      const isTender = (name.startsWith('Tender') || pCat === 'Tender');
      return !isSpecial && !isTender;
    }
    return true;
  }

  function renderPopoverProjectList(query) {
    const q = (query || '').toLowerCase();
    const cat = state.popoverCategory || 'all';

    const filtered = state.projects.filter(p => {
      if (p.active === false) return false;
      if (!isProjectMatchingCategory(p, cat)) return false;
      if (q && !(p.name.toLowerCase().includes(q) || (p.wbs && p.wbs.toLowerCase().includes(q)))) {
        return false;
      }
      return true;
    });

    filtered.sort((a,b) => a.name.localeCompare(b.name));

    if (filtered.length === 0) {
      el.popoverProjectList.innerHTML = `
        <div style="padding:14px; text-align:center; color:var(--text-muted); font-size:11px;">
          No matching ${cat !== 'all' ? cat : 'project'}s found.
        </div>
      `;
      return;
    }

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

  function setPopoverCategory(cat, rerender = true) {
    state.popoverCategory = cat || 'all';
    if (el.popoverCategorySelect) el.popoverCategorySelect.value = state.popoverCategory;
    if (el.popoverCategoryPills) {
      el.popoverCategoryPills.querySelectorAll('.category-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === state.popoverCategory);
      });
    }
    if (rerender) {
      renderPopoverProjectList(el.projectSearchInput ? el.projectSearchInput.value : '');
    }
  }

  if (el.popoverCategorySelect) {
    el.popoverCategorySelect.addEventListener('change', () => {
      setPopoverCategory(el.popoverCategorySelect.value);
    });
  }

  if (el.popoverCategoryPills) {
    el.popoverCategoryPills.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        setPopoverCategory(btn.getAttribute('data-category'));
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

  if (el.popoverHoursInput) {
    el.popoverHoursInput.addEventListener('change', () => {
      let val = parseFloat(el.popoverHoursInput.value);
      if (isNaN(val) || val < 1) {
        el.popoverHoursInput.value = 1;
      } else if (val > 12) {
        el.popoverHoursInput.value = 12;
      }
    });
  }

  if (el.bulkHoursInput) {
    el.bulkHoursInput.addEventListener('change', () => {
      let val = parseFloat(el.bulkHoursInput.value);
      if (isNaN(val) || val < 1) {
        el.bulkHoursInput.value = 1;
      } else if (val > 12) {
        el.bulkHoursInput.value = 12;
      }
    });
  }

  el.applyCellBtn.addEventListener('click', () => {
    if (state.isMultiEditing) {
      saveCellAssignment('');
      return;
    }
    if (!state.selectedCell) return;
    const key = `${state.selectedCell.empId}_${state.selectedCell.dateStr}`;
    const alloc = state.allocations[key];
    saveCellAssignment(alloc ? alloc.project : '');
  });

  function saveCellAssignment(projectName) {
    if (state.isMultiEditing && state.selectedCells.size > 0) {
      batchApplyToSelectedCells(projectName, el.popoverHoursInput.value);
      return;
    }

    if (!state.selectedCell) return;
    const { empId, dateStr } = state.selectedCell;
    const emp = state.employees.find(e => e.id === empId);
    const key = `${empId}_${dateStr}`;

    if (!projectName || projectName.trim() === '') {
      delete state.allocations[key];
    } else {
      const rawVal = el.popoverHoursInput ? el.popoverHoursInput.value : '';
      const hours = sanitizeDayHours(projectName, rawVal, emp ? emp.defaultHoursPerDay : 8);

      if (isWorkActivity(projectName)) {
        const numVal = parseFloat(rawVal);
        if (!isNaN(numVal) && (numVal < 1 || numVal > 12)) {
          showToast(`Daily hours adjusted to ${hours}h (allowed range: 1 to 12h for projects/tenders/special)`, 'info');
        }
      }

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
    state.isMultiEditing = false;
  }
  el.closePopoverBtn.addEventListener('click', closeCellPopover);

  document.addEventListener('click', (e) => {
    if (
      !el.cellPopover.contains(e.target) && 
      !e.target.closest('.task-chip') && 
      !e.target.closest('td.col-slot') && 
      !e.target.closest('#multiSelectBar')
    ) {
      closeCellPopover();
    }
  });

  if (el.multiEditAssignBtn) {
    el.multiEditAssignBtn.addEventListener('click', () => {
      openMultiCellPopover(el.multiEditAssignBtn);
    });
  }

  if (el.multiQuickOffBtn) {
    el.multiQuickOffBtn.addEventListener('click', () => {
      batchApplyToSelectedCells('Day OFF', 0);
    });
  }

  if (el.multiQuickNoProjBtn) {
    el.multiQuickNoProjBtn.addEventListener('click', () => {
      const emp = state.employees.find(e => e.id === state.selectedEmpId);
      batchApplyToSelectedCells('NO PROJECT', emp ? (emp.defaultHoursPerDay || 8) : 8);
    });
  }

  if (el.multiQuickClearBtn) {
    el.multiQuickClearBtn.addEventListener('click', () => {
      batchApplyToSelectedCells('', 0);
    });
  }

  if (el.multiSelectCancelBtn) {
    el.multiSelectCancelBtn.addEventListener('click', () => {
      clearSelection();
    });
  }

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
      if (state.currentUserId === 'view-all') {
        showToast('View All mode is read-only. Please choose your name first to edit.', 'warning');
        openUserSelectModal();
        return;
      }
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

    const defH = emp.defaultHoursPerDay || 8;
    el.bulkHoursInput.value = Math.min(12, Math.max(1, defH));

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
    const rawBulkH = el.bulkHoursInput.value;
    const hours = sanitizeDayHours(proj, rawBulkH, emp ? emp.defaultHoursPerDay : 8);
    if (isWorkActivity(proj)) {
      const numBulk = parseFloat(rawBulkH);
      if (!isNaN(numBulk) && (numBulk < 1 || numBulk > 12)) {
        showToast(`Bulk hours adjusted to ${hours}h (allowed range: 1 to 12h for projects/tenders/special)`, 'info');
      }
    }
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
  // NO PROJECT Days Management (Request 2 & 15)
  // -------------------------------------------------------------

  function openNoProjectModal(targetEmpId) {
    if (!state.currentUserId && !state.isAdmin) {
      showToast('Please identify yourself first from the top bar.', 'warning');
      openUserSelectModal();
      return;
    }

    const activeEmps = state.employees.filter(e => e.active !== false);
    activeEmps.sort((a,b) => a.name.localeCompare(b.name));

    el.noProjectEmpSelect.innerHTML = activeEmps.map(e => `
      <option value="${e.id}">${e.name}</option>
    `).join('');

    let chosenId = targetEmpId;
    if (!chosenId) {
      chosenId = state.currentUserId || (activeEmps[0] ? activeEmps[0].id : null);
    }
    if (chosenId) {
      el.noProjectEmpSelect.value = chosenId;
    }

    // Permission enforcement: non-admins can only view their own
    if (!state.isAdmin) {
      if (state.currentUserId) {
        el.noProjectEmpSelect.value = state.currentUserId;
        el.noProjectEmpSelect.disabled = true;
      }
    } else {
      el.noProjectEmpSelect.disabled = false;
    }

    // Populate Batch Project Dropdown
    const activeProjects = state.projects.filter(p => p.active !== false);
    activeProjects.sort((a,b) => a.name.localeCompare(b.name));

    el.noProjectBatchSelect.innerHTML = `
      <option value="">-- Choose Project to Apply to All --</option>
      <option value="Day OFF">Day OFF</option>
      <optgroup label="Projects & Tenders (Alphabetical)">
        ${activeProjects.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
      </optgroup>
    `;

    renderNoProjectTable();
    openModal(el.noProjectModal);
  }

  function renderNoProjectTable() {
    const empId = el.noProjectEmpSelect.value;
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;

    const sec = state.sections.find(s => s.id === emp.sectionId) || {};
    const loc = (sec.location || '').toLowerCase();
    const isIstanbul = loc.includes('istanbul');

    el.noProjectEmpNameDisplay.textContent = emp.name;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // Count and list ALL NO PROJECT days across all dates/months for this employee
    const noProjDates = [];
    const empPrefix = `${emp.id}_`;
    for (const [key, alloc] of Object.entries(state.allocations)) {
      if (key.startsWith(empPrefix) && alloc && alloc.project === 'NO PROJECT') {
        const dateStr = key.substring(key.lastIndexOf('_') + 1);
        const dt = parseLocalDate(dateStr);
        const dow = dt.getDay();
        noProjDates.push({
          dateStr: dateStr,
          dow: dow,
          allocHours: alloc.hours !== undefined ? alloc.hours : (emp.defaultHoursPerDay || 8)
        });
      }
    }
    noProjDates.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    el.noProjectMonthDisplay.textContent = `All Records (${noProjDates.length} Days)`;

    if (noProjDates.length === 0) {
      el.noProjectTableWrap.classList.add('hidden');
      el.noProjectBatchBox.classList.add('hidden');
      el.noProjectEmptyState.classList.remove('hidden');
      return;
    }

    el.noProjectTableWrap.classList.remove('hidden');
    el.noProjectBatchBox.classList.remove('hidden');
    el.noProjectEmptyState.classList.add('hidden');

    const activeProjects = state.projects.filter(p => p.active !== false);
    activeProjects.sort((a,b) => a.name.localeCompare(b.name));

    const projectOptionsHtml = `
      <option value="">-- Choose Project --</option>
      <option value="Day OFF">Day OFF</option>
      <optgroup label="Projects & Tenders">
        ${activeProjects.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
      </optgroup>
    `;

    el.noProjectTableBody.innerHTML = noProjDates.map(item => {
      const isWk = isWeekendForLocation(item.dow, sec.location);
      const scheduleTag = isWk 
        ? `<span class="badge" style="background:#f1f5f9; color:#64748b;">${isIstanbul ? 'Istanbul Weekend' : 'Cairo Weekend'}</span>`
        : `<span class="badge" style="background:#eff6ff; color:#1d4ed8;">${isIstanbul ? 'Istanbul Workday' : 'Cairo Workday'}</span>`;

      return `
        <tr data-date="${item.dateStr}">
          <td><strong>${formatDateDMY(item.dateStr)}</strong></td>
          <td>${dayNames[item.dow]}</td>
          <td>${scheduleTag}</td>
          <td>
            <input type="number" class="form-control form-control-sm text-center row-hours-input" min="1" max="12" step="0.5" value="${Math.min(12, Math.max(1, Number(item.allocHours) || 8))}">
          </td>
          <td>
            <select class="form-control form-control-sm row-project-select">
              ${projectOptionsHtml}
            </select>
          </td>
          <td style="text-align: center;">
            <button class="btn btn-primary btn-sm btn-save-row" data-date="${item.dateStr}">Save</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row save listeners
    el.noProjectTableBody.querySelectorAll('.btn-save-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const dateStr = btn.getAttribute('data-date');
        const tr = btn.closest('tr');
        const projSelect = tr.querySelector('.row-project-select');
        const hoursInput = tr.querySelector('.row-hours-input');
        const chosenProj = projSelect.value;
        const chosenHours = sanitizeDayHours(chosenProj, hoursInput.value, emp ? emp.defaultHoursPerDay : 8);

        if (!chosenProj) {
          showToast('Please select a project to assign.', 'warning');
          return;
        }

        const key = `${emp.id}_${dateStr}`;
        state.allocations[key] = {
          project: chosenProj,
          hours: chosenHours
        };

        syncToServer();
        renderSchedule();
        renderNoProjectTable();
        showToast(`Saved ${formatDateDMY(dateStr)} as ${chosenProj}`);
      });
    });
  }

  el.noProjectBatchApplyBtn.addEventListener('click', () => {
    const chosenProj = el.noProjectBatchSelect.value;
    if (!chosenProj) {
      showToast('Please choose a project from the dropdown to apply.', 'warning');
      return;
    }

    const empId = el.noProjectEmpSelect.value;
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;

    const empPrefix = `${emp.id}_`;
    let updatedCount = 0;

    for (const [key, alloc] of Object.entries(state.allocations)) {
      if (key.startsWith(empPrefix) && alloc && alloc.project === 'NO PROJECT') {
        const curHours = sanitizeDayHours(chosenProj, alloc.hours, emp ? emp.defaultHoursPerDay : 8);
        state.allocations[key] = {
          project: chosenProj,
          hours: curHours
        };
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      syncToServer();
      renderSchedule();
      renderNoProjectTable();
      showToast(`All ${updatedCount} NO PROJECT days updated to "${chosenProj}"!`);
    } else {
      showToast('No "NO PROJECT" days found to update.', 'info');
    }
  });

  el.noProjectEmpSelect.addEventListener('change', () => {
    renderNoProjectTable();
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
      if (item && item.project === projectName && item.project !== 'Day OFF' && item.project !== 'NO PROJECT' && item.project !== 'NO STATUS') {
        hrs += Number(item.hours) || 8;
      }
    });
    return hrs;
  }

  function getProjectLoggedBreakdown(projectName) {
    const months = {};
    let totalHours = 0;
    let totalDays = 0;
    Object.keys(state.allocations).forEach(k => {
      const item = state.allocations[k];
      if (item && item.project === projectName && item.project !== 'Day OFF' && item.project !== 'NO PROJECT' && item.project !== 'NO STATUS') {
        const lastUnder = k.lastIndexOf('_');
        const dt = k.substring(lastUnder + 1);
        const ym = dt.substring(0, 7);
        const hrs = Number(item.hours) || 8;
        if (!months[ym]) months[ym] = { hours: 0, days: 0 };
        months[ym].hours += hrs;
        months[ym].days += 1;
        totalHours += hrs;
        totalDays += 1;
      }
    });
    return { months, totalHours, totalDays };
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
      const breakdown = getProjectLoggedBreakdown(p.name);
      const logged = breakdown.totalHours;
      const total = baseline + logged;
      const safeWbs = (p.wbs || '').replace(/"/g, '&quot;');
      const monthKeys = Object.keys(breakdown.months).sort();

      let loggedDisplay = `${logged}h`;
      if (monthKeys.length > 1) {
        loggedDisplay = `
          <div class="month-breakdown-list">
            ${monthKeys.map(ym => `
              <div class="month-breakdown-item">
                <span class="month-name">${formatYearMonth(ym, true)}:</span>
                <span class="month-val"><strong>${breakdown.months[ym].hours}h</strong></span>
              </div>
            `).join('')}
            <div class="month-breakdown-total">
              <span>Total:</span>
              <strong>${logged}h</strong>
            </div>
          </div>
        `;
      } else if (monthKeys.length === 1) {
        loggedDisplay = `<span class="logged-month-pill" title="${formatYearMonth(monthKeys[0], false)}"><strong>${formatYearMonth(monthKeys[0], true)}:</strong> ${logged}h</span>`;
      }

      return `
        <tr>
          <td><span class="pill ${getProjectBadgeClass(p.name)}">${p.category || 'Project'}</span></td>
          <td><strong>${p.name}</strong></td>
          <td>
            <input type="text" class="form-control form-control-sm wbs-code-input" data-proj-id="${p.id}" value="${safeWbs}" placeholder="Enter WBS code..." ${state.isViewOnly ? 'disabled title="Editing disabled in View-Only mode"' : 'title="Click to edit WBS code"'}>
          </td>
          <td><strong>${baseline}h</strong></td>
          <td>${loggedDisplay}</td>
          <td><strong style="color:var(--primary); font-size:12px;">${total}h</strong></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-ghost btn-sm adjust-hours-btn" data-proj-id="${p.id}" ${!state.isAdmin ? 'disabled title="Admin access required"' : ''}>
                Adjust Hours
              </button>
              <button class="btn btn-ghost btn-sm delete-proj-btn" data-proj-id="${p.id}" ${!state.isAdmin ? 'disabled title="Admin access required"' : ''}>
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Requirement: WBS Code editable by everyone without requiring admin rights
    tbody.querySelectorAll('.wbs-code-input').forEach(input => {
      const handleWbsSave = () => {
        const pId = input.getAttribute('data-proj-id');
        const proj = state.projects.find(p => p.id === pId);
        if (!proj) return;
        const newWbs = input.value.trim();
        if ((proj.wbs || '') !== newWbs) {
          proj.wbs = newWbs;
          syncToServer();
          showToast(`Updated WBS for "${proj.name}" to "${newWbs || '—'}"`);
        }
      };

      input.addEventListener('change', handleWbsSave);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          input.blur();
        }
      });
    });

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
        openDeleteProjectModal(pId);
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

  function openDeleteProjectModal(pId) {
    const proj = state.projects.find(p => p.id === pId);
    if (!proj) return;
    document.getElementById('deleteProjectTargetId').value = pId;
    document.getElementById('deleteProjectTargetName').textContent = proj.name;
    openModal(el.deleteProjectModal);
  }

  document.getElementById('confirmDeleteProjectBtn').addEventListener('click', () => {
    if (!requireAdmin()) return;
    const pId = document.getElementById('deleteProjectTargetId').value;
    const proj = state.projects.find(p => p.id === pId);
    if (!proj) {
      closeModal(el.deleteProjectModal);
      return;
    }
    state.projects = state.projects.filter(p => p.id !== pId);
    sortAllData();
    closeModal(el.deleteProjectModal);
    renderProjectsModal();
    renderSchedule();
    syncToServer();
    showToast(`Deleted ${proj.name}`);
  });

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
    const activeCount = state.employees.filter(e => e.active !== false).length;
    const teamModalCount = document.getElementById('teamModalActiveMembersCount');
    if (teamModalCount) teamModalCount.textContent = activeCount;
    const settingsActiveCount = document.getElementById('settingsTeamActiveCount');
    if (settingsActiveCount) settingsActiveCount.textContent = activeCount;

    const tbody = document.getElementById('teamTableBody');
    const filterText = (document.getElementById('filterTeamTableInput').value || '').toLowerCase();
    const showInactive = document.getElementById('showInactiveMembersCheckbox').checked;

    state.employees.sort((a,b) => a.name.localeCompare(b.name));

    const filtered = state.employees.filter(e => {
      if (!showInactive && e.active === false) return false;
      return e.name.toLowerCase().includes(filterText);
    });

    tbody.innerHTML = filtered.map(e => {
      const isSelf = (e.id === state.currentUserId);
      const isInactive = (e.active === false);
      let rowClass = 'team-table-row';
      if (isSelf) rowClass += ' is-current-user-row';
      if (isInactive) rowClass += ' is-inactive-row';

      return `
      <tr class="${rowClass}" data-emp-id="${e.id}" title="Double-click to view monthly contributions for ${e.name}" style="cursor:pointer;">
        <td>
          <span class="pill ${!isInactive ? 'pill-training' : 'pill-off'}">
            ${!isInactive ? 'Active' : 'Deactivated'}
          </span>
        </td>
        <td>
          <strong class="team-emp-name">${e.name}</strong>
          ${isSelf ? '<span class="pill pill-project" style="margin-left:6px; font-size:9px; vertical-align:middle;">You</span>' : ''}
        </td>
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
          ${!isInactive ? `
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
    `}).join('');

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

  function updateAdminUI() {
    const isPeter = isCurrentUserPeter();

    // The admin rights option is ONLY available if using the name (Peter MOUNIR)
    if (!isPeter) {
      if (el.topbarAdminBtn) el.topbarAdminBtn.classList.add('hidden');
      if (el.adminToggleBtn) el.adminToggleBtn.classList.add('hidden');
      if (el.openChangePasswordBtn) el.openChangePasswordBtn.classList.add('hidden');
      return;
    }

    if (el.topbarAdminBtn) el.topbarAdminBtn.classList.remove('hidden');
    if (el.adminToggleBtn) el.adminToggleBtn.classList.remove('hidden');

    if (state.isAdmin) {
      if (el.openChangePasswordBtn) el.openChangePasswordBtn.classList.remove('hidden');
      if (el.adminToggleLabel) el.adminToggleLabel.textContent = 'Admin Active (Click to Lock)';
      if (el.adminToggleSub) el.adminToggleSub.textContent = 'Full management unlocked';
      if (el.adminIcon) el.adminIcon.textContent = '';
      if (el.adminToggleBtn) el.adminToggleBtn.classList.add('unlocked');

      if (el.topbarAdminBtn) el.topbarAdminBtn.classList.add('unlocked');
      if (el.topbarAdminIcon) el.topbarAdminIcon.textContent = '';
      if (el.topbarAdminText) el.topbarAdminText.textContent = 'Admin Active (All Rows Unlocked)';
      if (el.topbarAdminBtn) el.topbarAdminBtn.title = 'Admin Active: You can edit any cell for any employee. Click to lock.';
    } else {
      if (el.openChangePasswordBtn) el.openChangePasswordBtn.classList.add('hidden');
      if (el.adminToggleLabel) el.adminToggleLabel.textContent = 'Admin Unlock';
      if (el.adminToggleSub) el.adminToggleSub.textContent = 'Unlock management actions';
      if (el.adminIcon) el.adminIcon.textContent = '';
      if (el.adminToggleBtn) el.adminToggleBtn.classList.remove('unlocked');

      if (el.topbarAdminBtn) el.topbarAdminBtn.classList.remove('unlocked');
      if (el.topbarAdminIcon) el.topbarAdminIcon.textContent = '';
      if (el.topbarAdminText) el.topbarAdminText.textContent = 'Admin Unlock';
      if (el.topbarAdminBtn) el.topbarAdminBtn.title = 'Admin Mode: Click to enter PIN and edit all employees';
    }
  }

  function toggleAdminMode() {
    if (!isCurrentUserPeter()) {
      showToast('Admin rights are only available to Peter MOUNIR.', 'warning');
      return;
    }
    if (state.isAdmin) {
      state.isAdmin = false;
      removeStoredItem('ixl_is_admin');
      updateAdminUI();
      updateUserDisplay();
      renderSchedule();
      showToast('Admin mode locked');
    } else {
      el.adminPinInput.value = '';
      el.pinErrorMsg.classList.add('hidden');
      if (el.forgotPinRecoveryBox) el.forgotPinRecoveryBox.classList.add('hidden');
      if (el.forgotPinDeniedMsg) el.forgotPinDeniedMsg.classList.add('hidden');
      openModal(el.adminPinModal);
      setTimeout(() => el.adminPinInput.focus(), 100);
    }
  }

  if (el.adminToggleBtn) el.adminToggleBtn.addEventListener('click', toggleAdminMode);
  if (el.topbarAdminBtn) el.topbarAdminBtn.addEventListener('click', toggleAdminMode);

  el.submitPinBtn.addEventListener('click', () => {
    if (!isCurrentUserPeter()) {
      showToast('Admin rights are only available to Peter MOUNIR.', 'warning');
      closeModal(el.adminPinModal);
      return;
    }
    const pin = el.adminPinInput.value.trim();
    const expectedPin = state.adminPin || "IXL2026";
    if (pin === expectedPin) {
      state.isAdmin = true;
      setStoredItem('ixl_is_admin', 'true');
      updateAdminUI();
      closeModal(el.adminPinModal);
      updateUserDisplay();
      renderSchedule();
      showToast('Admin privileges unlocked! You can now edit any cell for any employee.');

      // If clicked a cell that prompted for Admin PIN, open it now!
      if (state.pendingAdminCell) {
        const { empId, dateStr, element } = state.pendingAdminCell;
        state.pendingAdminCell = null;
        setTimeout(() => {
          const freshBtn = el.scheduleBody.querySelector(`button.task-chip[data-emp-id="${empId}"][data-date="${dateStr}"]`) || element;
          if (freshBtn) openCellPopover(empId, dateStr, freshBtn);
        }, 80);
      }
    } else {
      el.pinErrorMsg.classList.remove('hidden');
      el.adminPinInput.focus();
    }
  });

  el.adminPinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      el.submitPinBtn.click();
    }
  });

  function requireAdmin() {
    if (state.isAdmin && isCurrentUserPeter()) return true;
    if (!isCurrentUserPeter()) {
      showToast('Admin rights are only available to Peter MOUNIR.', 'warning');
      return false;
    }
    el.adminPinInput.value = '';
    el.pinErrorMsg.classList.add('hidden');
    if (el.forgotPinRecoveryBox) el.forgotPinRecoveryBox.classList.add('hidden');
    if (el.forgotPinDeniedMsg) el.forgotPinDeniedMsg.classList.add('hidden');
    openModal(el.adminPinModal);
    return false;
  }

  if (el.forgotPinBtn) {
    el.forgotPinBtn.addEventListener('click', async () => {
      // Permission check: strictly Peter MOUNIR
      if (!isCurrentUserPeter()) {
        if (el.forgotPinDeniedMsg) el.forgotPinDeniedMsg.classList.remove('hidden');
        if (el.forgotPinRecoveryBox) el.forgotPinRecoveryBox.classList.add('hidden');
        showToast('Admin password recovery is strictly restricted to Peter MOUNIR.', 'warning');
        return;
      }

      if (el.forgotPinDeniedMsg) el.forgotPinDeniedMsg.classList.add('hidden');
      if (el.forgotPinRecoveryBox) el.forgotPinRecoveryBox.classList.remove('hidden');

      // Trigger background server dispatch to official work Outlook email
      try {
        fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'peter.mounir@alstomgroup.com' })
        }).catch(() => {});
      } catch (err) {}

      showToast('Admin password sent to your official Outlook email (peter.mounir@alstomgroup.com).');
    });
  }

  // -------------------------------------------------------------
  // Change Admin Password (Admin Only: Peter MOUNIR in Admin Mode)
  // Requires: Current password + 2 identical new password entries
  // -------------------------------------------------------------

  function openChangePasswordModal() {
    if (!isCurrentUserPeter() || !state.isAdmin) {
      showToast('Admin mode must be active to change password.', 'warning');
      return;
    }
    if (el.currentAdminPinInput) el.currentAdminPinInput.value = '';
    if (el.newAdminPinInput1) el.newAdminPinInput1.value = '';
    if (el.newAdminPinInput2) el.newAdminPinInput2.value = '';
    if (el.changePinErrorMsg) {
      el.changePinErrorMsg.textContent = '';
      el.changePinErrorMsg.classList.add('hidden');
    }
    openModal(el.changePasswordModal);
    setTimeout(() => {
      if (el.currentAdminPinInput) el.currentAdminPinInput.focus();
    }, 100);
  }

  function handleSaveChangePin() {
    if (!isCurrentUserPeter() || !state.isAdmin) {
      showToast('Admin privileges required.', 'warning');
      closeModal(el.changePasswordModal);
      return;
    }

    const currentVal = el.currentAdminPinInput ? el.currentAdminPinInput.value.trim() : '';
    const new1Val = el.newAdminPinInput1 ? el.newAdminPinInput1.value.trim() : '';
    const new2Val = el.newAdminPinInput2 ? el.newAdminPinInput2.value.trim() : '';
    const activePin = state.adminPin || 'IXL2026';

    const showChangeError = (msg, focusEl) => {
      if (el.changePinErrorMsg) {
        el.changePinErrorMsg.textContent = msg;
        el.changePinErrorMsg.classList.remove('hidden');
      }
      if (focusEl) focusEl.focus();
    };

    if (!currentVal) {
      showChangeError('Please enter your current Admin Password.', el.currentAdminPinInput);
      return;
    }

    if (currentVal !== activePin) {
      showChangeError('Current password is incorrect. Please try again.', el.currentAdminPinInput);
      return;
    }

    if (!new1Val) {
      showChangeError('Please enter your new Admin Password.', el.newAdminPinInput1);
      return;
    }

    if (new1Val.length < 4) {
      showChangeError('New password must be at least 4 characters long.', el.newAdminPinInput1);
      return;
    }

    if (new1Val !== new2Val) {
      showChangeError('New passwords do not match. Please ensure both entries are identical.', el.newAdminPinInput2);
      return;
    }

    if (new1Val === activePin) {
      showChangeError('New password cannot be the same as your current password.', el.newAdminPinInput1);
      return;
    }

    // Success: Update state, persist to database, notify
    state.adminPin = new1Val;
    syncToServer();

    if (el.changePinErrorMsg) el.changePinErrorMsg.classList.add('hidden');
    if (el.currentAdminPinInput) el.currentAdminPinInput.value = '';
    if (el.newAdminPinInput1) el.newAdminPinInput1.value = '';
    if (el.newAdminPinInput2) el.newAdminPinInput2.value = '';

    closeModal(el.changePasswordModal);
    showToast('Admin Password successfully updated and saved!');

    // Dispatch background confirmation to official work Outlook email
    try {
      fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'peter.mounir@alstomgroup.com' })
      }).catch(() => {});
    } catch (err) {}
  }

  if (el.openChangePasswordBtn) {
    el.openChangePasswordBtn.addEventListener('click', openChangePasswordModal);
  }

  if (el.saveChangePinBtn) {
    el.saveChangePinBtn.addEventListener('click', handleSaveChangePin);
  }

  [el.currentAdminPinInput, el.newAdminPinInput1, el.newAdminPinInput2].forEach(inputEl => {
    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSaveChangePin();
        }
      });
    }
  });

  // -------------------------------------------------------------
  // Analytics & Monthly Rollup
  // -------------------------------------------------------------

  function initAnalyticsMonthDropdown() {
    const sel = document.getElementById('analyticsMonthFilterSelect');
    if (!sel) return;
    const currentVal = sel.value || 'all';

    const monthSet = new Set();
    if (el.monthSelect) {
      Array.from(el.monthSelect.options).forEach(opt => {
        if (opt.value) monthSet.add(opt.value);
      });
    }
    Object.keys(state.allocations).forEach(k => {
      const lastUnder = k.lastIndexOf('_');
      const dt = k.substring(lastUnder + 1);
      if (dt && dt.length >= 7) {
        monthSet.add(dt.substring(0, 7));
      }
    });

    const sortedMonths = Array.from(monthSet).sort();
    if (sel.options.length !== sortedMonths.length + 1) {
      sel.innerHTML = '<option value="all">All Months (Monthly Breakdown)</option>';
      sortedMonths.forEach(ym => {
        const opt = document.createElement('option');
        opt.value = ym;
        opt.textContent = formatYearMonth(ym, false);
        sel.appendChild(opt);
      });
    }

    if (currentVal && Array.from(sel.options).some(o => o.value === currentVal)) {
      sel.value = currentVal;
    } else {
      sel.value = 'all';
    }
  }

  document.getElementById('openAnalyticsBtn').addEventListener('click', () => {
    initAnalyticsMonthDropdown();
    renderAnalyticsModal();
    openModal(el.analyticsModal);
  });

  const analyticsMonthFilterEl = document.getElementById('analyticsMonthFilterSelect');
  if (analyticsMonthFilterEl) {
    analyticsMonthFilterEl.addEventListener('change', () => {
      renderAnalyticsModal();
    });
  }

  const filterAnalyticsInputEl = document.getElementById('filterAnalyticsInput');
  if (filterAnalyticsInputEl) {
    filterAnalyticsInputEl.addEventListener('input', () => {
      renderAnalyticsModal();
    });
  }

  function renderAnalyticsModal() {
    initAnalyticsMonthDropdown();
    const sel = document.getElementById('analyticsMonthFilterSelect');
    const selectedMonth = sel ? sel.value : 'all';
    const monthLabelEl = document.getElementById('analyticsMonthLabel');
    if (monthLabelEl) {
      if (selectedMonth === 'all') {
        monthLabelEl.textContent = 'All Months Breakdown';
      } else {
        monthLabelEl.textContent = formatYearMonth(selectedMonth, false);
      }
    }

    const projMap = {};

    Object.keys(state.allocations).forEach(k => {
      const item = state.allocations[k];
      if (item && item.project && item.project !== 'Day OFF' && item.project !== 'NO PROJECT' && item.project !== 'NO STATUS') {
        const lastUnder = k.lastIndexOf('_');
        const dt = k.substring(lastUnder + 1);
        const ym = dt.substring(0, 7);

        // If a specific month is selected, filter strictly to that month
        if (selectedMonth !== 'all' && ym !== selectedMonth) {
          return;
        }

        const pName = item.project;
        if (!projMap[pName]) {
          projMap[pName] = { days: 0, hours: 0, months: {} };
        }
        if (!projMap[pName].months[ym]) {
          projMap[pName].months[ym] = { days: 0, hours: 0 };
        }
        const hrs = Number(item.hours) || 8;
        projMap[pName].days += 1;
        projMap[pName].hours += hrs;
        projMap[pName].months[ym].days += 1;
        projMap[pName].months[ym].hours += hrs;
      }
    });

    // Include all projects with allocations in this scope OR with baseline hours
    const activeProjectNames = new Set(Object.keys(projMap));
    state.projects.forEach(p => {
      if ((Number(p.initialHours) || 0) > 0) {
        activeProjectNames.add(p.name);
      }
    });

    let projectNames = Array.from(activeProjectNames);
    projectNames.sort((a, b) => a.localeCompare(b));

    const totalCount = projectNames.length;
    const filterInput = document.getElementById('filterAnalyticsInput');
    const filterQuery = (filterInput ? filterInput.value : '').trim().toLowerCase();

    if (filterQuery) {
      projectNames = projectNames.filter(pName => {
        const pObj = state.projects.find(x => x.name === pName) || {};
        return pName.toLowerCase().includes(filterQuery) || (pObj.wbs && pObj.wbs.toLowerCase().includes(filterQuery));
      });
    }

    const countBadge = document.getElementById('analyticsCountBadge');
    if (countBadge) {
      countBadge.textContent = `${projectNames.length} of ${totalCount} projects`;
    }

    const pTbody = document.getElementById('analyticsProjectBody');
    if (!pTbody) return;

    pTbody.innerHTML = projectNames.map(pName => {
      const pObj = state.projects.find(x => x.name === pName) || {};
      const baseline = Number(pObj.initialHours) || 0;
      const data = projMap[pName] || { days: 0, hours: 0, months: {} };
      const totalHrs = baseline + data.hours;
      const monthKeys = Object.keys(data.months).sort();

      let loggedDaysHtml = '0';
      let loggedHoursHtml = '0h';

      if (selectedMonth === 'all') {
        if (monthKeys.length === 0) {
          loggedDaysHtml = '<span class="text-muted">0</span>';
          loggedHoursHtml = '<span class="text-muted">0h</span>';
        } else if (monthKeys.length === 1) {
          const ym = monthKeys[0];
          const mLabel = formatYearMonth(ym, true);
          const mData = data.months[ym];
          loggedDaysHtml = `
            <div class="month-breakdown-item">
              <span class="month-name">${mLabel}:</span>
              <span class="month-val">${mData.days}d</span>
            </div>`;
          loggedHoursHtml = `
            <div class="month-breakdown-item">
              <span class="month-name">${mLabel}:</span>
              <span class="month-val"><strong>${mData.hours}h</strong></span>
            </div>`;
        } else {
          loggedDaysHtml = `
            <div class="month-breakdown-list">
              ${monthKeys.map(ym => `
                <div class="month-breakdown-item">
                  <span class="month-name">${formatYearMonth(ym, true)}:</span>
                  <span class="month-val">${data.months[ym].days}d</span>
                </div>
              `).join('')}
              <div class="month-breakdown-total">
                <span>Total:</span>
                <strong>${data.days}d</strong>
              </div>
            </div>`;

          loggedHoursHtml = `
            <div class="month-breakdown-list">
              ${monthKeys.map(ym => `
                <div class="month-breakdown-item">
                  <span class="month-name">${formatYearMonth(ym, true)}:</span>
                  <span class="month-val"><strong>${data.months[ym].hours}h</strong></span>
                </div>
              `).join('')}
              <div class="month-breakdown-total">
                <span>Total Logged:</span>
                <strong>${data.hours}h</strong>
              </div>
            </div>`;
        }
      } else {
        const mData = data.months[selectedMonth] || { days: 0, hours: 0 };
        loggedDaysHtml = mData.days > 0 ? `<strong>${mData.days}</strong>` : '<span class="text-muted">0</span>';
        loggedHoursHtml = mData.hours > 0 ? `<strong>${mData.hours}h</strong>` : '<span class="text-muted">0h</span>';
      }

      return `
        <tr>
          <td><strong>${pName}</strong></td>
          <td><span class="pill ${getProjectBadgeClass(pName)}">${pObj.category || 'Project'}</span></td>
          <td><code>${pObj.wbs || '-'}</code></td>
          <td>${baseline}h</td>
          <td>${loggedDaysHtml}</td>
          <td>${loggedHoursHtml}</td>
          <td><strong style="color:var(--primary); font-size:12px;">${totalHrs} hrs</strong></td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="7" class="text-center" style="padding:16px; color:var(--text-muted);">No active allocations found matching your filter.</td></tr>';
  }

  // -------------------------------------------------------------
  // Employee Monthly Contributions Modal (Triggered by double-click)
  // -------------------------------------------------------------

  function openEmployeeContributions(empId) {
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;
    state.currentContribEmpId = empId;
    state.contribFilter = 'all';

    if (el.contribFilterAll && el.contribFilterRecorded) {
      el.contribFilterAll.classList.add('active-filter', 'btn-primary');
      el.contribFilterAll.classList.remove('btn-secondary');
      el.contribFilterRecorded.classList.remove('active-filter', 'btn-primary');
      el.contribFilterRecorded.classList.add('btn-secondary');
    }

    renderEmployeeContributions();
    openModal(el.employeeContributionsModal);
  }

  function renderEmployeeContributions() {
    const empId = state.currentContribEmpId;
    if (!empId) return;
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;
    const sec = state.sections.find(s => s.id === emp.sectionId) || { name: 'Engineering Team', location: 'Cairo' };

    const days = getDaysInMonth(state.currentMonth);
    const defaultHours = emp.defaultHoursPerDay || (sec.location === 'Istanbul' ? 9 : 8);

    let totalRecordedHours = 0;
    let loggedWorkdaysCount = 0;
    let totalWorkingDays = 0;
    let daysOffCount = 0;
    let noProjectCount = 0;

    const projectHoursMap = {};
    const dayEntries = [];

    days.forEach(d => {
      const isWk = isWeekendForLocation(d.dow, sec.location);
      if (!isWk) {
        totalWorkingDays++;
      }

      const key = `${emp.id}_${d.dateStr}`;
      const alloc = state.allocations[key];
      const hasVal = Boolean(alloc && alloc.project);
      const projectName = hasVal ? alloc.project : '';
      const hours = hasVal ? (alloc.hours !== undefined ? Number(alloc.hours) : defaultHours) : 0;

      let isRecordedWork = false;
      let dayTypeLabel = isWk ? `${sec.location} Weekend` : 'Workday';

      if (projectName === 'Day OFF') {
        daysOffCount++;
      } else if (projectName === 'NO PROJECT' || projectName === 'NO STATUS') {
        noProjectCount++;
      } else if (hasVal && projectName) {
        isRecordedWork = true;
        totalRecordedHours += hours;
        loggedWorkdaysCount++;

        if (!projectHoursMap[projectName]) {
          const pObj = state.projects.find(p => p.name === projectName);
          let category = 'Project';
          if (projectName.startsWith('Tender')) category = 'Tender';
          else if (projectName.startsWith('Training') || projectName.startsWith('Academy') || projectName === 'Different Team Support') category = 'Special';
          else if (pObj && pObj.category) category = pObj.category;

          projectHoursMap[projectName] = { hours: 0, days: 0, category };
        }
        projectHoursMap[projectName].hours += hours;
        projectHoursMap[projectName].days += 1;
      }

      dayEntries.push({
        dateStr: d.dateStr,
        dowName: d.name,
        num: d.num,
        isWeekend: isWk,
        projectName,
        hours,
        hasVal,
        isRecordedWork,
        dayTypeLabel
      });
    });

    if (el.contribAvatar) el.contribAvatar.textContent = getInitials(emp.name);
    if (el.contribEmpNameDisplay) el.contribEmpNameDisplay.textContent = emp.name;
    if (el.contribSectionDisplay) el.contribSectionDisplay.textContent = `${sec.name} (${sec.location})`;
    if (el.contribMonthDisplay) el.contribMonthDisplay.textContent = state.currentMonth;

    if (el.contribTotalHours) el.contribTotalHours.textContent = `${totalRecordedHours}h`;
    const avgHours = loggedWorkdaysCount > 0 ? (totalRecordedHours / loggedWorkdaysCount).toFixed(1) : '0';
    if (el.contribAvgDaily) el.contribAvgDaily.textContent = `${avgHours}h / logged day`;

    if (el.contribLoggedDays) el.contribLoggedDays.textContent = `${loggedWorkdaysCount} / ${totalWorkingDays}`;
    const coveragePercent = totalWorkingDays > 0 ? Math.round((loggedWorkdaysCount / totalWorkingDays) * 100) : 0;
    if (el.contribCoveragePercent) el.contribCoveragePercent.textContent = `${coveragePercent}% of workdays filled`;

    if (el.contribDailyDefault) el.contribDailyDefault.textContent = `${defaultHours}h/day`;
    if (el.contribLocationType) el.contribLocationType.textContent = `${sec.location} Schedule`;

    if (el.contribOffDays) el.contribOffDays.textContent = `${daysOffCount + noProjectCount} days`;
    if (el.contribOffBreakdown) el.contribOffBreakdown.textContent = `${daysOffCount} Off | ${noProjectCount} No Project`;

    // Render Project Breakdown Chips
    if (el.contribProjectChips) {
      const projKeys = Object.keys(projectHoursMap).sort((a, b) => projectHoursMap[b].hours - projectHoursMap[a].hours);
      if (projKeys.length === 0) {
        el.contribProjectChips.innerHTML = `<span class="text-sm text-muted">No recorded project contributions for ${state.currentMonth} yet.</span>`;
      } else {
        el.contribProjectChips.innerHTML = projKeys.map(pName => {
          const item = projectHoursMap[pName];
          const badgeClass = getProjectBadgeClass(pName);
          return `
            <div class="task-chip ${badgeClass}" style="padding:6px 12px; font-size:11px; display:inline-flex; align-items:center; gap:8px;">
              <span style="font-weight:600;">${pName}</span>
              <span style="background:rgba(0,0,0,0.12); padding:2px 6px; border-radius:10px; font-weight:700;">${item.hours}h (${item.days}d)</span>
            </div>
          `;
        }).join('');
      }
    }

    // Render Daily Table Body according to filter
    if (el.contribDaysTableBody) {
      const filteredEntries = state.contribFilter === 'recorded'
        ? dayEntries.filter(e => e.isRecordedWork)
        : dayEntries;

      if (filteredEntries.length === 0) {
        el.contribDaysTableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">
              No records match the current filter.
            </td>
          </tr>
        `;
      } else {
        el.contribDaysTableBody.innerHTML = filteredEntries.map(e => {
          let badgeHtml = '';
          let hoursHtml = '-';
          let rowClass = '';

          if (e.isRecordedWork) {
            const badgeClass = getProjectBadgeClass(e.projectName);
            badgeHtml = `<span class="pill ${badgeClass}">${e.projectName}</span>`;
            hoursHtml = `<strong style="color:var(--primary); font-size:12px;">${e.hours}h</strong>`;
          } else if (e.projectName === 'Day OFF') {
            badgeHtml = `<span class="pill pill-off">Day OFF</span>`;
            hoursHtml = `<span class="text-muted">0h</span>`;
            rowClass = 'row-off';
          } else if (e.projectName === 'NO PROJECT') {
            badgeHtml = `<span class="pill pill-missing">NO PROJECT</span>`;
            hoursHtml = `<span class="text-danger font-bold">Unassigned</span>`;
            rowClass = 'row-no-proj';
          } else {
            badgeHtml = `<span class="text-muted text-xs">—</span>`;
            hoursHtml = `<span class="text-muted text-xs">—</span>`;
          }

          const dayTypeBadge = e.isWeekend
            ? `<span style="font-size:10px; color:var(--text-muted); background:var(--bg-subtle, #f1f5f9); padding:2px 6px; border-radius:4px;">${e.dayTypeLabel}</span>`
            : `<span style="font-size:10px; color:#15803d; background:#dcfce7; padding:2px 6px; border-radius:4px;">Workday</span>`;

          let categoryBadge = '—';
          if (e.projectName) {
            if (e.projectName === 'Day OFF' || e.projectName === 'NO PROJECT') {
              categoryBadge = `<span class="text-xs text-muted">Status</span>`;
            } else if (e.projectName.startsWith('Tender')) {
              categoryBadge = `<span class="pill pill-tender">Tender</span>`;
            } else if (e.projectName.startsWith('Training') || e.projectName.startsWith('Academy') || e.projectName === 'Different Team Support') {
              categoryBadge = `<span class="pill pill-training">Special</span>`;
            } else {
              categoryBadge = `<span class="pill pill-proj">Project</span>`;
            }
          }

          return `
            <tr class="${rowClass}">
              <td><strong>${formatDateDMY(e.dateStr)}</strong></td>
              <td>${e.dowName}</td>
              <td>${badgeHtml}</td>
              <td>${categoryBadge}</td>
              <td style="text-align:right;">${hoursHtml}</td>
              <td>${dayTypeBadge}</td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  if (el.contribFilterAll) {
    el.contribFilterAll.addEventListener('click', () => {
      state.contribFilter = 'all';
      el.contribFilterAll.classList.add('active-filter', 'btn-primary');
      el.contribFilterAll.classList.remove('btn-secondary');
      el.contribFilterRecorded.classList.remove('active-filter', 'btn-primary');
      el.contribFilterRecorded.classList.add('btn-secondary');
      renderEmployeeContributions();
    });
  }
  if (el.contribFilterRecorded) {
    el.contribFilterRecorded.addEventListener('click', () => {
      state.contribFilter = 'recorded';
      el.contribFilterRecorded.classList.add('active-filter', 'btn-primary');
      el.contribFilterRecorded.classList.remove('btn-secondary');
      el.contribFilterAll.classList.remove('active-filter', 'btn-primary');
      el.contribFilterAll.classList.add('btn-secondary');
      renderEmployeeContributions();
    });
  }

  // Delegated double-click listener on schedule body and team table body
  if (el.scheduleBody) {
    el.scheduleBody.addEventListener('dblclick', (e) => {
      const userCell = e.target.closest('td.col-user');
      if (userCell) {
        const empId = userCell.getAttribute('data-emp-id');
        if (empId) {
          openEmployeeContributions(empId);
        }
      }
    });
  }

  const teamTableEl = document.getElementById('teamTableBody');
  if (teamTableEl) {
    teamTableEl.addEventListener('dblclick', (e) => {
      const row = e.target.closest('tr');
      if (row && row.getAttribute('data-emp-id')) {
        openEmployeeContributions(row.getAttribute('data-emp-id'));
      }
    });
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
  // Requirement 6: Mode Switching & View-Only Link
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
  // Settings & Tools Expandable Drawer Navigation
  // -------------------------------------------------------------

  function toggleSettingsDrawer(open) {
    if (!el.settingsSidebar) return;
    const isOpen = el.settingsSidebar.classList.contains('open');
    const shouldOpen = open !== undefined ? open : !isOpen;

    if (shouldOpen) {
      el.settingsSidebar.classList.add('open');
      if (el.settingsSidebarOverlay) el.settingsSidebarOverlay.classList.remove('hidden');
    } else {
      el.settingsSidebar.classList.remove('open');
      if (el.settingsSidebarOverlay) el.settingsSidebarOverlay.classList.add('hidden');
    }
  }

  if (el.toggleSettingsSidebarBtn) {
    el.toggleSettingsSidebarBtn.addEventListener('click', () => toggleSettingsDrawer());
  }

  if (el.closeSettingsSidebarBtn) {
    el.closeSettingsSidebarBtn.addEventListener('click', () => toggleSettingsDrawer(false));
  }

  if (el.collapseSettingsBtn) {
    el.collapseSettingsBtn.addEventListener('click', () => toggleSettingsDrawer(false));
  }

  if (el.settingsSidebarOverlay) {
    el.settingsSidebarOverlay.addEventListener('click', () => toggleSettingsDrawer(false));
  }

  const btnExpAll = document.getElementById('btnExpandAllSections');
  if (btnExpAll) btnExpAll.addEventListener('click', expandAllSections);

  const btnColAll = document.getElementById('btnCollapseAllSections');
  if (btnColAll) btnColAll.addEventListener('click', collapseAllSections);

  const btnToggleAll = document.getElementById('btnToggleAllSections');
  if (btnToggleAll) btnToggleAll.addEventListener('click', toggleAllSections);

  // -------------------------------------------------------------
  // Modal Utilities & Toast
  // -------------------------------------------------------------

  function openModal(modalEl) {
    toggleSettingsDrawer(false);
    modalEl.classList.remove('hidden');
  }

  function closeModal(modalEl) {
    modalEl.classList.add('hidden');
  }

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) closeModal(modal);
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCellPopover();
      clearSelection();
      toggleSettingsDrawer(false);
      document.querySelectorAll('.modal').forEach(m => closeModal(m));
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable
      );
      if (isInput) return;

      const hasOpenModal = document.querySelector('.modal:not(.hidden)');
      if (hasOpenModal) return;

      if (state.isViewOnly || state.currentUserId === 'view-all') return;

      if (state.selectedCells && state.selectedCells.size > 0) {
        const isAdmin = state.isAdmin && isCurrentUserPeter();
        if (!isAdmin) {
          const unauthorized = Array.from(state.selectedCells).some(k => {
            const lastUnder = k.lastIndexOf('_');
            const empId = k.substring(0, lastUnder);
            return empId !== state.currentUserId;
          });
          if (unauthorized) {
            showToast('Permission denied: You can only clear your own allocations', 'warning');
            return;
          }
        }
        e.preventDefault();
        batchApplyToSelectedCells('', 0);
      }
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
    const savedTheme = getStoredItem('ixl_theme_mode') || 'dark';
    if (el.themeSelect) {
      el.themeSelect.value = savedTheme;
      el.themeSelect.addEventListener('change', () => {
        const mode = el.themeSelect.value;
        setStoredItem('ixl_theme_mode', mode);
        applyTheme(mode);
        const modeName = el.themeSelect.options[el.themeSelect.selectedIndex].text;
        showToast(`Theme set to ${modeName}`);
      });
    }
    applyTheme(savedTheme);

    // Periodically re-check time for Auto mode every 30 seconds
    setInterval(() => {
      const currentMode = getStoredItem('ixl_theme_mode') || 'dark';
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
  initColumnWidths();
  loadData();

})();
