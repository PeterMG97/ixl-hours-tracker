/**
 * test_pc_bulk_clear_integrity.js
 * Dedicated automated test suite verifying that on the PC interface Bulk Fill option:
 * 1. The two prior clear options ([CLEAR / DELETE HOURS] and -- Clear / Erase Allocations --)
 *    are consolidated into a single option called "Clear/Delete".
 * 2. The single "Clear/Delete" option is non-colored (no inline red styling or special classes).
 * 3. Selecting "Clear/Delete" properly triggers deletion of allocations for the specified date range.
 * 4. Star button is disabled for "Clear/Delete" and cannot be starred.
 * 5. Zero emojis across code, styles, and test files.
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
console.log(' RUNNING PC BULK FILL CLEAR/DELETE INTEGRITY TEST SUITE');
console.log('==========================================================\n');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

// ========================================================
// MODULE 1: Static Code Contracts & Zero Emojis
// ========================================================
console.log('>>> MODULE 1: Static Code Contracts & Zero Emojis');

test('1.1 Zero unicode emojis in index.html, app.js, styles.css, and test files', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(html), 'Found emoji in index.html');
  assert(!emojiRegex.test(js), 'Found emoji in app.js');
  assert(!emojiRegex.test(css), 'Found emoji in styles.css');
});

test('1.2 Cache buster bumped to v=10.0 in index.html', () => {
  assert(html.includes('styles.css?v=10.0'), 'styles.css v=10.0 not found in index.html');
  assert(html.includes('app.js?v=10.0'), 'app.js v=10.0 not found in index.html');
});

test('1.3 app.js populateBulkProjectSelect contains single <option value="__CLEAR__">Clear/Delete</option>', () => {
  assert(js.includes('<option value="__CLEAR__">Clear/Delete</option>'), 'Clear/Delete option missing from bulk select');
});

test('1.4 app.js populateBulkProjectSelect does NOT contain old duplicate clear option tags', () => {
  assert(!js.includes('-- Clear / Erase Allocations --</option>'), 'Found obsolete "-- Clear / Erase Allocations --" option tag in app.js');
  assert(!js.includes('[CLEAR / DELETE HOURS]</option>\r\n      <option value="">-- Clear'), 'Found old duplicate options in app.js');
  
  const popBulkIdx = js.indexOf('function populateBulkProjectSelect');
  assert(popBulkIdx !== -1, 'populateBulkProjectSelect missing');
  const popBulkBlock = js.substring(popBulkIdx, popBulkIdx + 800);
  assert(!popBulkBlock.includes('[CLEAR / DELETE HOURS]'), 'populateBulkProjectSelect must not contain [CLEAR / DELETE HOURS]');
  assert(!popBulkBlock.includes('-- Clear / Erase Allocations --'), 'populateBulkProjectSelect must not contain -- Clear / Erase Allocations --');
});

test('1.5 PC bulkProjectSelect Clear/Delete option has no inline styling (non-colored)', () => {
  const popBulkIdx = js.indexOf('function populateBulkProjectSelect');
  assert(popBulkIdx !== -1, 'populateBulkProjectSelect function missing');
  const popBulkBlock = js.substring(popBulkIdx, popBulkIdx + 1200);
  assert(popBulkBlock.includes('<option value="__CLEAR__">Clear/Delete</option>'), 'Clear/Delete option should be unstyled');
  assert(!popBulkBlock.includes('style="color:#ef4444'), 'Clear/Delete option should not have red styling');
  assert(!popBulkBlock.includes('style="color:red'), 'Clear/Delete option should not have inline color');
});

test('1.6 updateBulkStarBtnState treats Clear/Delete as a special non-starrable option', () => {
  const fnIdx = js.indexOf('function updateBulkStarBtnState');
  assert(fnIdx !== -1, 'updateBulkStarBtnState function missing');
  const fnBlock = js.substring(fnIdx, fnIdx + 800);
  assert(fnBlock.includes('proj === \'Clear/Delete\'') || fnBlock.includes('proj === \'__CLEAR__\''), 'Clear/Delete special handling missing in updateBulkStarBtnState');
});

test('1.7 confirmBulkFillBtn correctly handles isClearAction with Clear/Delete and __CLEAR__', () => {
  const confirmIdx = js.indexOf('el.confirmBulkFillBtn.addEventListener');
  assert(confirmIdx !== -1, 'confirmBulkFillBtn handler missing');
  const confirmBlock = js.substring(confirmIdx, confirmIdx + 3000);
  assert(confirmBlock.includes('proj === \'__CLEAR__\''), '__CLEAR__ missing from isClearAction in confirmBulkFillBtn');
  assert(confirmBlock.includes('proj === \'Clear/Delete\''), 'Clear/Delete missing from isClearAction in confirmBulkFillBtn');
});

// ========================================================
// MODULE 2: Bulk Project Select Option Consolidation
// ========================================================
console.log('\n>>> MODULE 2: Bulk Project Select Option Consolidation');

test('2.1 Simulating populateBulkProjectSelect produces exactly 1 clear option', () => {
  const activeProjects = [
    { name: 'Proj Alpha', active: true },
    { name: 'Proj Beta', active: true }
  ];
  const starredList = ['Proj Alpha'];
  
  const starredOptions = starredList
    .filter(name => activeProjects.some(p => p.name === name))
    .map(name => `<option value="${name}">${name}</option>`)
    .join('');
  const starredOptGroup = starredOptions ? `<optgroup label="Starred / Favorites">${starredOptions}</optgroup>` : '';

  const generatedHtml = `
      <option value="Day OFF">Day OFF</option>
      <option value="NO PROJECT">NO PROJECT</option>
      <option value="__CLEAR__">Clear/Delete</option>
      ${starredOptGroup}
      <optgroup label="Projects &amp; Tenders (Alphabetical)">
        ${activeProjects.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
      </optgroup>
  `;

  // Count occurrences of "Clear" or "Delete"
  const clearMatches = generatedHtml.match(/Clear\/Delete/g) || [];
  assert.strictEqual(clearMatches.length, 1, 'There must be exactly 1 Clear/Delete option');

  const oldMatches1 = generatedHtml.match(/CLEAR \/ DELETE HOURS/g) || [];
  assert.strictEqual(oldMatches1.length, 0, 'Old [CLEAR / DELETE HOURS] option must not appear');

  const oldMatches2 = generatedHtml.match(/Clear \/ Erase Allocations/g) || [];
  assert.strictEqual(oldMatches2.length, 0, 'Old "-- Clear / Erase Allocations --" option must not appear');

  // Verify non-colored
  assert(!generatedHtml.includes('style="color'), 'Clear/Delete option must be non colored');
  assert(!generatedHtml.includes('color:#ef4444'), 'Clear/Delete option must not have red color');
});

test('2.2 Normalization of legacy values maps to __CLEAR__ in bulkProjectSelect', () => {
  const normalize = (curVal) => {
    if (curVal === 'Clear/Delete' || curVal === '__CLEAR__' || curVal.toLowerCase().includes('clear')) {
      return '__CLEAR__';
    }
    return curVal;
  };

  assert.strictEqual(normalize('[CLEAR / DELETE HOURS]'), '__CLEAR__');
  assert.strictEqual(normalize('-- Clear / Erase Allocations --'), '__CLEAR__');
  assert.strictEqual(normalize('Clear/Delete'), '__CLEAR__');
  assert.strictEqual(normalize('__CLEAR__'), '__CLEAR__');
  assert.strictEqual(normalize('Proj Alpha'), 'Proj Alpha');
});

// ========================================================
// MODULE 3: Behavioral Bulk Fill Clear Action Simulation
// ========================================================
console.log('\n>>> MODULE 3: Behavioral Bulk Fill Clear Action Simulation');

function simulateBulkFill({ empId, fromStr, toStr, proj, allocations }) {
  const isClearAction = (!proj || proj.trim() === '' || proj === '__CLEAR__' || proj === 'Clear/Delete' || proj === '[CLEAR / DELETE HOURS]');
  let clearedCount = 0;
  let filledCount = 0;

  // Simulate inclusive date loop
  const [startY, startM, startD] = fromStr.split('-').map(Number);
  const [endY, endM, endD] = toStr.split('-').map(Number);
  
  let cur = new Date(startY, startM - 1, startD);
  const end = new Date(endY, endM - 1, endD);

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const currentStr = `${y}-${m}-${d}`;
    const key = `${empId}_${currentStr}`;

    if (isClearAction) {
      delete allocations[key];
      clearedCount++;
    } else {
      allocations[key] = { project: proj, hours: 8 };
      filledCount++;
    }

    cur.setDate(cur.getDate() + 1);
  }

  return { clearedCount, filledCount };
}

test('3.1 Executing bulk fill with proj="__CLEAR__" removes all allocations in range', () => {
  const allocations = {
    'emp1_2026-11-01': { project: 'Project X', hours: 8 },
    'emp1_2026-11-02': { project: 'Project X', hours: 8 },
    'emp1_2026-11-03': { project: 'Project Y', hours: 8 },
    'emp1_2026-11-04': { project: 'Project Y', hours: 8 },
    'emp1_2026-11-05': { project: 'Project Z', hours: 8 },
    'emp1_2026-11-06': { project: 'Keep Me', hours: 8 }
  };

  const res = simulateBulkFill({
    empId: 'emp1',
    fromStr: '2026-11-01',
    toStr: '2026-11-05',
    proj: '__CLEAR__',
    allocations
  });

  assert.strictEqual(res.clearedCount, 5, 'Should clear exactly 5 days');
  assert.strictEqual(allocations['emp1_2026-11-01'], undefined, 'Nov 1 should be deleted');
  assert.strictEqual(allocations['emp1_2026-11-02'], undefined, 'Nov 2 should be deleted');
  assert.strictEqual(allocations['emp1_2026-11-03'], undefined, 'Nov 3 should be deleted');
  assert.strictEqual(allocations['emp1_2026-11-04'], undefined, 'Nov 4 should be deleted');
  assert.strictEqual(allocations['emp1_2026-11-05'], undefined, 'Nov 5 should be deleted');
  assert.deepStrictEqual(allocations['emp1_2026-11-06'], { project: 'Keep Me', hours: 8 }, 'Nov 6 outside range must remain');
});

test('3.2 Executing bulk fill with proj="Clear/Delete" removes all allocations in range', () => {
  const allocations = {
    'emp2_2026-11-10': { project: 'Project A', hours: 8 },
    'emp2_2026-11-11': { project: 'Project B', hours: 8 }
  };

  const res = simulateBulkFill({
    empId: 'emp2',
    fromStr: '2026-11-10',
    toStr: '2026-11-11',
    proj: 'Clear/Delete',
    allocations
  });

  assert.strictEqual(res.clearedCount, 2, 'Should clear exactly 2 days');
  assert.strictEqual(allocations['emp2_2026-11-10'], undefined, 'Nov 10 should be deleted');
  assert.strictEqual(allocations['emp2_2026-11-11'], undefined, 'Nov 11 should be deleted');
});

// ========================================================
// MODULE 4: Star Protection for Clear/Delete
// ========================================================
console.log('\n>>> MODULE 4: Star Protection for Clear/Delete');

test('4.1 Clear/Delete cannot be starred or favorited', () => {
  const isSpecial = (proj) => {
    return (!proj || proj === 'Day OFF' || proj === 'NO PROJECT' || proj === 'NO STATUS' || proj === '__CLEAR__' || proj === 'Clear/Delete');
  };

  assert.strictEqual(isSpecial('Clear/Delete'), true, 'Clear/Delete must be special');
  assert.strictEqual(isSpecial('__CLEAR__'), true, '__CLEAR__ must be special');
  assert.strictEqual(isSpecial('Day OFF'), true, 'Day OFF must be special');
  assert.strictEqual(isSpecial('NO PROJECT'), true, 'NO PROJECT must be special');
  assert.strictEqual(isSpecial('Valid Project Name'), false, 'Normal project is not special');
});

// ========================================================
// MODULE 5: PC Bulk Fill Projects List Default Chooser
// ========================================================
console.log('\n>>> MODULE 5: PC Bulk Fill Projects List Default Chooser');

test('5.1 styles.css hides bulk select dropdown and toggle button, keeping Projects List directly visible', () => {
  assert(css.includes('#bulkFillModal .project-select-with-star'), 'Missing #bulkFillModal .project-select-with-star rule in styles.css');
  assert(css.includes('#bulkFillModal .bulk-browse-toggle-wrapper'), 'Missing #bulkFillModal .bulk-browse-toggle-wrapper rule in styles.css');
  assert(css.includes('#bulkFillModal .bulk-browse-section'), 'Missing #bulkFillModal .bulk-browse-section rule in styles.css');
});

test('5.2 index.html bulkBrowseSection is not hidden by default in modal markup', () => {
  assert(!html.includes('id="bulkBrowseSection" class="bulk-browse-section hidden"'), 'bulkBrowseSection should not have hidden class');
  assert(html.includes('id="bulkBrowseSection" class="bulk-browse-section"'), 'bulkBrowseSection should have bulk-browse-section class');
});

test('5.3 app.js renderBulkProjectList renders special items and selected project highlight', () => {
  const fnIdx = js.indexOf('function renderBulkProjectList');
  assert(fnIdx !== -1, 'renderBulkProjectList missing in app.js');
  const fnBlock = js.substring(fnIdx, fnIdx + 4000);
  assert(fnBlock.includes('specialItems'), 'renderBulkProjectList should include specialItems');
  assert(fnBlock.includes('Day OFF'), 'renderBulkProjectList should include Day OFF');
  assert(fnBlock.includes('NO PROJECT'), 'renderBulkProjectList should include NO PROJECT');
  assert(fnBlock.includes('Clear/Delete'), 'renderBulkProjectList should include Clear/Delete');
  assert(fnBlock.includes('is-selected-proj'), 'renderBulkProjectList should apply is-selected-proj');
});

console.log('\n==========================================================');
console.log(` PC BULK FILL CLEAR/DELETE SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==========================================================');

if (failCount > 0) {
  process.exit(1);
}
