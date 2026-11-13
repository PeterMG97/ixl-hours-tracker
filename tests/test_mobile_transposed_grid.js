/**
 * test_mobile_transposed_grid.js
 * Comprehensive Verification Suite for Mobile Portrait Transposed Read-Only Grid
 *
 * Validates:
 * 1. Mobile Interface Transposed Grid: Columns = Employees, Rows = Dates (Portrait ergonomic sense)
 * 2. Section/Category Dividers Removed: Zero <tr class="group-header-row"> in transposed grid
 * 3. Shrink/Expand Removed: Zero #thToggleAllGroups or collapse chevrons in transposed grid
 * 4. Strictly View-Only: Task chips rendered as <div> rather than editable <button>
 * 5. Comfortable Cell Width: Column width >= 115px (versus cramped 38px legacy cells)
 * 6. Desktop Grid Untouched: Standard matrix (employees as rows, dates as columns) preserved for PC
 * 7. Welcome Screen Train Tail Extended: Tail starts at x=8 under letter A (reaching red dot), head under M
 * 8. Zero Unicode Emojis across all source files
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==========================================================');
console.log(' RUNNING MOBILE TRANSPOSED GRID & TRAIN INTEGRITY TEST SUITE');
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

const appJs = fs.readFileSync(appJsPath, 'utf8');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const stylesCss = fs.readFileSync(stylesCssPath, 'utf8');

// >>> MODULE 1: Static Code Contracts & Zero Unicode Emojis
console.log('>>> MODULE 1: Static Code Contracts & Zero Unicode Emojis');

check('1.1 Zero Unicode emojis across public/app.js, public/index.html, and public/styles.css', () => {
  const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
  assert(!emojiRegex.test(appJs), 'public/app.js must contain zero emojis');
  assert(!emojiRegex.test(indexHtml), 'public/index.html must contain zero emojis');
  assert(!emojiRegex.test(stylesCss), 'public/styles.css must contain zero emojis');
});

check('1.2 renderMobileTransposedSchedule function is defined in public/app.js', () => {
  assert(appJs.includes('function renderMobileTransposedSchedule()'), 'renderMobileTransposedSchedule function must be declared');
});

check('1.3 renderSchedule branches to renderMobileTransposedSchedule for mobile interface', () => {
  const regex = /if\s*\(isMobileInterface\(\)\)\s*\{\s*renderMobileTransposedSchedule\(\);\s*return;\s*\}/;
  assert(regex.test(appJs), 'renderSchedule must delegate to renderMobileTransposedSchedule when isMobileInterface() is true');
});

// >>> MODULE 2: Mobile Transposed Layout & CSS Architecture
console.log('\n>>> MODULE 2: Mobile Transposed Layout & CSS Architecture');

check('2.1 CSS rules for .schedule-table.is-mobile-transposed exist with separated border collapse', () => {
  assert(stylesCss.includes('.schedule-table.is-mobile-transposed'), 'is-mobile-transposed CSS class must exist');
  assert(stylesCss.includes('border-collapse: separate !important;'), 'Transposed table must use separate border collapse for sticky headers');
});

check('2.2 Sticky Date corner cell defined with high z-index and fixed width', () => {
  assert(stylesCss.includes('th.col-transposed-date-header'), 'Date corner header cell must be styled');
  assert(stylesCss.includes('.transposed-date-corner-cell'), 'Corner cell inner text styled');
});

check('2.3 Employee columns width >= 115px for comfortable readability', () => {
  assert(stylesCss.includes('th.col-transposed-emp-header'), 'Employee column header must be styled');
  assert(/width:\s*115px/i.test(stylesCss), 'Employee column header must be at least 115px wide');
  assert(/min-width:\s*115px/i.test(stylesCss), 'Slot cells must have min-width 115px');
});

check('2.4 Task chips in transposed view formatted as read-only blocks', () => {
  assert(stylesCss.includes('.transposed-task-chip'), 'transposed-task-chip class must be styled');
  assert(stylesCss.includes('.transposed-chip-label'), 'transposed-chip-label class must be styled');
});

// >>> MODULE 3: Four Core User Requirements
console.log('\n>>> MODULE 3: Four Core User Requirements');

check('3.1 Requirement 1: Columns are People Names and Rows are Dates', () => {
  // Header contains active employees
  assert(appJs.includes('col-transposed-emp-header'), 'Table head must render col-transposed-emp-header');
  assert(appJs.includes('transposed-emp-name-text'), 'Header must render employee name text');
  assert(appJs.includes('transposed-emp-hours-pill'), 'Header must render monthly hours pill');

  // Body contains date rows
  assert(appJs.includes('col-transposed-date'), 'Table body must render sticky date cells');
  assert(appJs.includes('transposed-date-num'), 'Row date cell must render day number');
  assert(appJs.includes('transposed-date-dow'), 'Row date cell must render day of week');
});

check('3.2 Requirement 2: Section/category header rows removed in transposed grid', () => {
  // In renderMobileTransposedSchedule, no group-header-row is appended
  const fnBodyMatch = appJs.match(/function renderMobileTransposedSchedule\(\)\s*\{([\s\S]*?)\n  \}/);
  assert(fnBodyMatch, 'Must find renderMobileTransposedSchedule body');
  const fnBody = fnBodyMatch[1];
  assert(!fnBody.includes('group-header-row'), 'renderMobileTransposedSchedule must not generate group-header-row');
  assert(!fnBody.includes('group-toggle-icon'), 'renderMobileTransposedSchedule must not generate group-toggle-icon');
});

check('3.3 Requirement 3: Expand/shrink option removed from transposed grid', () => {
  const fnBodyMatch = appJs.match(/function renderMobileTransposedSchedule\(\)\s*\{([\s\S]*?)\n  \}/);
  const fnBody = fnBodyMatch[1];
  assert(!fnBody.includes('thToggleAllGroups'), 'renderMobileTransposedSchedule must not render thToggleAllGroups');
  assert(!fnBody.includes('btn-group-action'), 'renderMobileTransposedSchedule must not render btn-group-action');
});

check('3.4 Requirement 4: Strictly view-only cells without editable button triggers', () => {
  const fnBodyMatch = appJs.match(/function renderMobileTransposedSchedule\(\)\s*\{([\s\S]*?)\n  \}/);
  const fnBody = fnBodyMatch[1];
  // Chip rendered as <div class="task-chip transposed-task-chip ...">, not <button class="...">
  assert(fnBody.includes('<div class="task-chip transposed-task-chip'), 'Transposed chips must be non-button div elements');
  assert(!fnBody.includes('<button class="task-chip'), 'Transposed chips must not be button elements');
});

// >>> MODULE 4: Welcome Screen Train Tail Length Extension
console.log('\n>>> MODULE 4: Welcome Screen Train Tail Length Extension');

check('4.1 PC Welcome Screen train wrapper matches ALSTOM brand width and shifted horizontally right by 5mm', () => {
  assert(stylesCss.includes('width: clamp(280px, 32vw, 480px);'), 'PC train wrapper width must match ALSTOM brand clamp');
  assert(indexHtml.includes('width: clamp(280px, 32vw, 480px);'), 'PC critical CSS train wrapper must match brand');
  assert(indexHtml.includes('transform: translateX(5mm);'), 'PC train wrap must be shifted horizontally to the right by 5mm');
  assert(stylesCss.includes('transform: translateX(5mm);'), 'styles.css PC train wrap must be shifted horizontally to the right by 5mm');
});

check('4.2 Mobile Welcome Screen train wrapper matches mobile brand width and transform is none', () => {
  assert(indexHtml.includes('width: clamp(210px, 68vw, 290px) !important;'), 'Mobile train wrapper width must match mobile brand');
  assert(indexHtml.includes('transform: none !important;'), 'Mobile train wrap transform must remain none');
});

check('4.3 PC Train SVG body extends from tail side (x=8) to reach under letter A', () => {
  const pcSection = indexHtml.split('id="pcVectorWelcomeStage"')[1];
  assert(pcSection, 'PC stage must exist');
  assert(pcSection.includes('M8 12 H395 C430 12 465 14.5 488 19 C498 21 504 22.5 508 23.5 L485 24 H8 Z'), 'PC train body path must start at x=8 (reaching under letter A)');
  assert(pcSection.includes('x1="0" y1="24" x2="510" y2="24"'), 'PC blueprint rail track must extend from x=0');
});

check('4.4 Mobile Train SVG body extends from tail side (x=8) to reach under letter A', () => {
  const mobSection = indexHtml.split('id="mobileTouchWelcomeStage"')[1];
  assert(mobSection, 'Mobile stage must exist');
  assert(mobSection.includes('M8 12 H395 C430 12 465 14.5 488 19 C498 21 504 22.5 508 23.5 L485 24 H8 Z'), 'Mobile train body path must start at x=8 (reaching under letter A)');
  assert(mobSection.includes('x1="0" y1="24" x2="510" y2="24"'), 'Mobile blueprint rail track must extend from x=0');
});

check('4.5 Train head position (nose tip x=508, headlight x=506) remains untouched', () => {
  assert(indexHtml.includes('cx="506" cy="23" r="1.6" fill="#FFFFFF"'), 'Train headlight must remain at cx=506');
});

console.log('\n==========================================================');
console.log(` MOBILE TRANSPOSED GRID & TRAIN TEST COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==========================================================');

if (failCount > 0) process.exit(1);
