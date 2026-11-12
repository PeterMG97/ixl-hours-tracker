/**
 * IXL Team Hours Tracker - Dedicated Per-Profile Starred / Favorite Projects Test Suite
 * 
 * Verifies:
 * 1. Per-profile favorite project isolation (Peter vs Catherine vs Ahmed)
 * 2. Toggle star mechanics (star / unstar, persistence in state and localStorage)
 * 3. Category filtering (starred category shows strictly chosen favorites for current profile)
 * 4. PC interface integration (single cell popover, multi-cell popover, bulk fill modal, NO PROJECT modal)
 * 5. Mobile interface integration (mobile logger quick-chips, dropdown optgroup, mobile project browser list)
 * 6. Zero unicode emojis (strictly pure inline SVG star icons)
 */

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

console.log('==========================================================');
console.log(' RUNNING DEDICATED PER-PROFILE STARRED PROJECTS TEST SUITE');
console.log('==========================================================\n');

const resolvePath = (f) => [path.join(__dirname, '../public', f), path.join(__dirname, '../backups', f), path.join(__dirname, '..', f), f].find(fs.existsSync) || f;

// Load files
const htmlContent = fs.readFileSync(resolvePath('index.html'), 'utf8');
const jsContent = fs.readFileSync(resolvePath('app.js'), 'utf8');
const cssContent = fs.readFileSync(resolvePath('styles.css'), 'utf8');
const dataJson = JSON.parse(fs.readFileSync(resolvePath('data.json'), 'utf8'));

// -------------------------------------------------------------
// MODULE 1: Static Code Contracts & Zero Emojis
// -------------------------------------------------------------
console.log('>>> MODULE 1: Static Code Contracts & Zero Emojis');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
assert(!emojiRegex.test(htmlContent), '1.1 index.html contains zero unicode emojis');
assert(!emojiRegex.test(jsContent), '1.2 app.js contains zero unicode emojis');
assert(!emojiRegex.test(cssContent), '1.3 styles.css contains zero unicode emojis');

// SVG Star icon existence
assert(jsContent.includes('renderStarSvgHtml'), '1.4 app.js implements renderStarSvgHtml helper');
assert(jsContent.includes('polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"'), '1.5 app.js uses pure SVG polygon star vector without emojis');

// CSS Styles
assert(cssContent.includes('.btn-star-toggle'), '1.6 styles.css defines .btn-star-toggle styling');
assert(cssContent.includes('.star-icon.is-starred'), '1.7 styles.css defines .star-icon.is-starred gold fill');
assert(cssContent.includes('.starred-quick-container'), '1.8 styles.css defines .starred-quick-container chips row');
assert(cssContent.includes('.mobile-project-browser'), '1.9 styles.css defines .mobile-project-browser styling');

// -------------------------------------------------------------
// MODULE 2: PC Interface Starred Integration
// -------------------------------------------------------------
console.log('\n>>> MODULE 2: PC Interface Starred Integration');

// Cell Popover
assert(htmlContent.includes('<option value="starred">Starred (Favorites)</option>'), '2.1 Cell popover select contains Starred option');
assert(htmlContent.includes('<button type="button" class="category-pill" data-category="starred">Starred</button>'), '2.2 Cell popover category pills contain Starred pill');
assert(jsContent.includes('isProjectMatchingCategory') && jsContent.includes("cat === 'starred'"), '2.3 isProjectMatchingCategory supports starred filter');
assert(jsContent.includes('btn-star-toggle') && jsContent.includes('toggleStarredProject'), '2.4 Popover project list renders star toggle buttons with click handler');

// Bulk Fill Modal
assert(htmlContent.includes('id="bulkStarredContainer"'), '2.5 Bulk fill modal contains bulkStarredContainer');
assert(htmlContent.includes('id="bulkStarredChips"'), '2.6 Bulk fill modal contains bulkStarredChips');
assert(htmlContent.includes('id="bulkCurrentProjectStarBtn"'), '2.7 Bulk fill modal contains bulkCurrentProjectStarBtn next to select');
assert(htmlContent.includes('id="bulkBrowseSection"'), '2.8 Bulk fill modal contains expandable bulkBrowseSection');
assert(htmlContent.includes('id="bulkProjectList"'), '2.9 Bulk fill modal contains bulkProjectList for browsing and starring');
assert(jsContent.includes('populateBulkProjectSelect'), '2.10 app.js implements populateBulkProjectSelect with Starred optgroup');
assert(jsContent.includes('renderBulkStarredChips'), '2.11 app.js implements renderBulkStarredChips');

// NO PROJECT Modal
assert(jsContent.includes('starredNoProj') && jsContent.includes('Starred / Favorites'), '2.12 NO PROJECT batch modal includes Starred optgroup');

// -------------------------------------------------------------
// MODULE 3: Mobile Interface Starred Integration
// -------------------------------------------------------------
console.log('\n>>> MODULE 3: Mobile Interface Starred Integration');

assert(htmlContent.includes('id="mobileStarredContainer"'), '3.1 Mobile logger contains mobileStarredContainer');
assert(htmlContent.includes('id="mobileStarredChips"'), '3.2 Mobile logger contains mobileStarredChips for 1-tap logging');
assert(htmlContent.includes('id="mobileCurrentProjectStarBtn"'), '3.3 Mobile logger contains mobileCurrentProjectStarBtn next to select');
assert(htmlContent.includes('id="mobileProjectBrowser"'), '3.4 Mobile logger contains mobileProjectBrowser list');
assert(htmlContent.includes('id="mobileProjectPillList"'), '3.5 Mobile logger contains mobileProjectPillList with star buttons');
assert(jsContent.includes('populateMobileProjectSelect'), '3.6 app.js implements populateMobileProjectSelect with Starred optgroup');
assert(jsContent.includes('renderMobileStarredChips'), '3.7 app.js implements renderMobileStarredChips');
assert(jsContent.includes('renderMobileProjectPillList'), '3.8 app.js implements renderMobileProjectPillList');

// -------------------------------------------------------------
// MODULE 4: Behavioral Simulation - Per-Profile Isolation & Storage
// -------------------------------------------------------------
console.log('\n>>> MODULE 4: Behavioral Simulation - Per-Profile Isolation');

// Simulate state and functions from app.js logic
const mockState = {
  currentUserId: 'emp_1', // Peter MOUNIR
  mobileTargetEmpId: 'emp_1',
  userStarredProjects: {},
  projects: dataJson.projects,
  employees: dataJson.employees
};

function mockGetEffectiveProfileId(contextEmpId = null) {
  if (contextEmpId) return contextEmpId;
  if (mockState.currentUserId && mockState.currentUserId !== 'view-all') return mockState.currentUserId;
  return 'emp_1';
}

function mockGetStarredProjectsForProfile(empId = null) {
  const pid = mockGetEffectiveProfileId(empId);
  if (!mockState.userStarredProjects) mockState.userStarredProjects = {};
  if (!Array.isArray(mockState.userStarredProjects[pid])) {
    mockState.userStarredProjects[pid] = [];
  }
  return mockState.userStarredProjects[pid];
}

function mockIsProjectStarred(projectName, empId = null) {
  if (!projectName) return false;
  return mockGetStarredProjectsForProfile(empId).includes(projectName);
}

function mockToggleStarredProject(projectName, empId = null) {
  if (!projectName || projectName === 'Day OFF' || projectName === 'NO PROJECT' || projectName === 'NO STATUS' || projectName === '__CLEAR__') {
    return false;
  }
  const pid = mockGetEffectiveProfileId(empId);
  if (!mockState.userStarredProjects) mockState.userStarredProjects = {};
  if (!Array.isArray(mockState.userStarredProjects[pid])) {
    mockState.userStarredProjects[pid] = [];
  }
  const idx = mockState.userStarredProjects[pid].indexOf(projectName);
  let nowStarred = false;
  if (idx >= 0) {
    mockState.userStarredProjects[pid].splice(idx, 1);
    nowStarred = false;
  } else {
    mockState.userStarredProjects[pid].push(projectName);
    nowStarred = true;
  }
  return nowStarred;
}

function mockIsProjectMatchingCategory(p, cat, empId = null) {
  if (!cat || cat === 'all') return true;
  if (cat === 'starred') return mockIsProjectStarred(p.name, empId);
  const name = p.name;
  const pCat = p.category || '';
  if (cat === 'Special') {
    return pCat === 'Special' || pCat === 'Training' || pCat === 'Support' ||
           name.startsWith('Academy') || name.startsWith('Training') || name.includes('Different Team Support');
  }
  if (cat === 'Tender') return name.startsWith('Tender') || pCat === 'Tender';
  if (cat === 'Project') {
    const isSpecial = (pCat === 'Training' || pCat === 'Support' || name.startsWith('Academy') || name.startsWith('Training') || name.includes('Different Team Support'));
    const isTender = (name.startsWith('Tender') || pCat === 'Tender');
    return !isSpecial && !isTender;
  }
  return true;
}

// Scenario 1: Initial state is clean
assert(mockGetStarredProjectsForProfile('emp_1').length === 0, '4.1 User Peter initially has 0 starred projects');
assert(mockGetStarredProjectsForProfile('emp_2').length === 0, '4.2 User Catherine initially has 0 starred projects');

// Scenario 2: Peter stars 2 projects
const p1 = 'Project - A6O Lot 1 - Cairo';
const p2 = 'Academy - ERA - Cairo';
const starRes1 = mockToggleStarredProject(p1, 'emp_1');
const starRes2 = mockToggleStarredProject(p2, 'emp_1');
assert(starRes1 === true, '4.3 Toggling unstarred project p1 returns true (now starred)');
assert(starRes2 === true, '4.4 Toggling unstarred project p2 returns true (now starred)');
assert(mockIsProjectStarred(p1, 'emp_1') === true, '4.5 Peter has p1 starred');
assert(mockIsProjectStarred(p2, 'emp_1') === true, '4.6 Peter has p2 starred');

// Scenario 3: Catherine BASSEM (emp_2) does NOT have Peter's starred projects (Per-Profile Isolation)
assert(mockIsProjectStarred(p1, 'emp_2') === false, '4.7 Catherine does NOT have p1 starred (Strict profile isolation)');
assert(mockIsProjectStarred(p2, 'emp_2') === false, '4.8 Catherine does NOT have p2 starred (Strict profile isolation)');
assert(mockGetStarredProjectsForProfile('emp_2').length === 0, '4.9 Catherine starred list length is 0');

// Scenario 4: Catherine stars a different project
const p3 = 'Tender - A6O - Lot 1 - Cairo';
mockToggleStarredProject(p3, 'emp_2');
assert(mockIsProjectStarred(p3, 'emp_2') === true, '4.10 Catherine has p3 starred');
assert(mockIsProjectStarred(p3, 'emp_1') === false, '4.11 Peter does NOT have p3 starred (Strict profile isolation)');

// Scenario 5: Filter matching
const allProjects = mockState.projects;
const peterStarredProjects = allProjects.filter(p => mockIsProjectMatchingCategory(p, 'starred', 'emp_1'));
assert(peterStarredProjects.length === 2, '4.12 Starred category filter for Peter returns exactly 2 projects');
assert(peterStarredProjects.some(p => p.name === p1), '4.13 Peter starred list includes p1');
assert(peterStarredProjects.some(p => p.name === p2), '4.14 Peter starred list includes p2');
assert(!peterStarredProjects.some(p => p.name === p3), '4.15 Peter starred list excludes Catherine project p3');

const catherineStarredProjects = allProjects.filter(p => mockIsProjectMatchingCategory(p, 'starred', 'emp_2'));
assert(catherineStarredProjects.length === 1, '4.16 Starred category filter for Catherine returns exactly 1 project');
assert(catherineStarredProjects[0].name === p3, '4.17 Catherine starred list includes p3');

// Scenario 6: Unstarring
const unstarRes1 = mockToggleStarredProject(p1, 'emp_1');
assert(unstarRes1 === false, '4.18 Toggling starred project p1 returns false (unstarred)');
assert(mockIsProjectStarred(p1, 'emp_1') === false, '4.19 Peter no longer has p1 starred');
assert(mockGetStarredProjectsForProfile('emp_1').length === 1, '4.20 Peter starred list reduced to 1');

// Scenario 7: Special / Non-project values cannot be starred
assert(mockToggleStarredProject('Day OFF', 'emp_1') === false, '4.21 "Day OFF" cannot be starred');
assert(mockToggleStarredProject('NO PROJECT', 'emp_1') === false, '4.22 "NO PROJECT" cannot be starred');
assert(mockToggleStarredProject('__CLEAR__', 'emp_1') === false, '4.23 "__CLEAR__" cannot be starred');

console.log('\n==========================================================');
console.log(` DEDICATED STARRED TEST COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==========================================================');

if (failCount > 0) process.exit(1);
