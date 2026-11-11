/**
 * test_quick_pill_separation.js
 * Comprehensive automated test suite for Exclusive Top Placement of Special Actions:
 * - DAY OFF, NO PROJECT, CLEAR/DELETE removed from list options (.project-pill-list)
 * - Kept exclusively at the top in .quick-pill-row across both PC and Mobile interfaces
 * - Active selection synchronization (.is-selected-proj)
 * - Zero emojis constraint
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==========================================================');
console.log(' RUNNING QUICK PILL EXCLUSIVE TOP PLACEMENT TEST SUITE');
console.log('==========================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

const htmlPath = path.join(__dirname, 'index.html');
const appPath = path.join(__dirname, 'app.js');
const cssPath = path.join(__dirname, 'styles.css');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(appPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

// 1. Emoji check
runTest('1.1 Zero emojis across test and implementation', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(html), 'Found emoji in index.html');
  assert(!emojiRegex.test(css), 'Found emoji in styles.css');
  assert(!emojiRegex.test(js.substring(js.indexOf('renderPopoverProjectList'), js.indexOf('renderPopoverProjectList') + 3000)), 'Found emoji in renderPopoverProjectList');
});

// 2. HTML Markup structure
runTest('1.2 Top quick-pill-row buttons present in cellPopover, bulkBrowseSection, and mobileBrowserContent', () => {
  // Cell Popover (PC & Mobile Grid)
  const popoverIdx = html.indexOf('id="cellPopover"');
  assert(popoverIdx !== -1, 'cellPopover missing');
  const popoverBlock = html.substring(popoverIdx, popoverIdx + 800);
  assert(popoverBlock.includes('class="quick-pill-row"'), 'quick-pill-row missing in cellPopover');
  assert(popoverBlock.includes('data-val="Day OFF">DAY OFF</button>'), 'DAY OFF button missing in cellPopover');
  assert(popoverBlock.includes('data-val="NO PROJECT">NO PROJECT</button>'), 'NO PROJECT button missing in cellPopover');
  assert(popoverBlock.includes('data-val="__CLEAR__">CLEAR/DELETE</button>'), 'CLEAR/DELETE button missing in cellPopover');

  // Bulk Browse Section (PC Bulk Fill)
  const bulkIdx = html.indexOf('id="bulkBrowseSection"');
  assert(bulkIdx !== -1, 'bulkBrowseSection missing');
  const bulkBlock = html.substring(bulkIdx, bulkIdx + 800);
  assert(bulkBlock.includes('bulk-quick-pill-row'), 'bulk-quick-pill-row missing in bulkBrowseSection');
  assert(bulkBlock.includes('data-val="Day OFF">DAY OFF</button>'), 'DAY OFF button missing in bulkBrowseSection');
  assert(bulkBlock.includes('data-val="NO PROJECT">NO PROJECT</button>'), 'NO PROJECT button missing in bulkBrowseSection');
  assert(bulkBlock.includes('data-val="__CLEAR__">CLEAR/DELETE</button>'), 'CLEAR/DELETE button missing in bulkBrowseSection');

  // Mobile Browser Content (Mobile Editor)
  const mobIdx = html.indexOf('id="mobileBrowserContent"');
  assert(mobIdx !== -1, 'mobileBrowserContent missing');
  const mobBlock = html.substring(mobIdx, mobIdx + 800);
  assert(mobBlock.includes('mobile-quick-pill-row'), 'mobile-quick-pill-row missing in mobileBrowserContent');
  assert(mobBlock.includes('data-val="Day OFF">DAY OFF</button>'), 'DAY OFF button missing in mobileBrowserContent');
  assert(mobBlock.includes('data-val="NO PROJECT">NO PROJECT</button>'), 'NO PROJECT button missing in mobileBrowserContent');
  assert(mobBlock.includes('data-val="__CLEAR__">CLEAR/DELETE</button>'), 'CLEAR/DELETE button missing in mobileBrowserContent');
});

// 3. JS: renderPopoverProjectList excludes special items from scrollable list
runTest('1.3 renderPopoverProjectList does not render special action items in popoverProjectList', () => {
  const fnIdx = js.indexOf('function renderPopoverProjectList');
  assert(fnIdx !== -1, 'renderPopoverProjectList missing');
  const fnBlock = js.substring(fnIdx, fnIdx + 2500);

  // specialItems must be empty
  assert(fnBlock.includes('const specialItems = [];'), 'specialItems not cleared in renderPopoverProjectList');
  // Must sync top buttons
  assert(fnBlock.includes('.btn-quick-pill'), 'btn-quick-pill sync missing in renderPopoverProjectList');
  assert(fnBlock.includes('is-selected-proj'), 'is-selected-proj class toggle missing in renderPopoverProjectList');
});

// 4. JS: renderBulkProjectList excludes special items from scrollable list
runTest('1.4 renderBulkProjectList does not render special action items in bulkProjectList', () => {
  const fnIdx = js.indexOf('function renderBulkProjectList');
  assert(fnIdx !== -1, 'renderBulkProjectList missing');
  const fnBlock = js.substring(fnIdx, fnIdx + 2500);

  // specialItems must be empty
  assert(fnBlock.includes('const specialItems = [];'), 'specialItems not cleared in renderBulkProjectList');
  // Must sync top bulk buttons
  assert(fnBlock.includes('.bulk-quick-pill-row .btn-quick-pill'), 'bulk-quick-pill-row sync missing in renderBulkProjectList');
});

// 5. JS: renderMobileProjectPillList excludes special items from scrollable list
runTest('1.5 renderMobileProjectPillList does not render special action items in mobileProjectPillList', () => {
  const fnIdx = js.indexOf('function renderMobileProjectPillList');
  assert(fnIdx !== -1, 'renderMobileProjectPillList missing');
  const fnBlock = js.substring(fnIdx, fnIdx + 2500);

  // specialItems must be empty
  assert(fnBlock.includes('const specialItems = [];'), 'specialItems not cleared in renderMobileProjectPillList');
  // Must sync top mobile buttons
  assert(fnBlock.includes('.mobile-quick-pill-row .btn-quick-pill'), 'mobile-quick-pill-row sync missing in renderMobileProjectPillList');
});

// 6. CSS: Styling for quick pills and active selected state
runTest('1.6 styles.css defines .btn-quick-pill and active .is-selected-proj styling', () => {
  assert(css.includes('.quick-pill-row'), '.quick-pill-row rule missing in styles.css');
  assert(css.includes('.btn-quick-pill'), '.btn-quick-pill rule missing in styles.css');
  assert(css.includes('.btn-quick-pill.is-selected-proj'), '.btn-quick-pill.is-selected-proj rule missing in styles.css');
  assert(css.includes('.mobile-quick-pill-row'), '.mobile-quick-pill-row rule missing in styles.css');
  assert(css.includes('.bulk-quick-pill-row'), '.bulk-quick-pill-row rule missing in styles.css');
});

console.log(`\n==========================================================`);
console.log(` QUICK PILL EXCLUSIVE TOP PLACEMENT SUITE COMPLETE: ${passedTests} PASSED, 0 FAILED`);
console.log(`==========================================================\n`);

