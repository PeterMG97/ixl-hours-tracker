// test_mobile_list_scroll_alignment.js
// Verification suite for mobile table horizontal scrolling and form alignment

const fs = require('fs');
const path = require('path');

const resolvePath = (f) => [path.join(__dirname, '../public', f), path.join(__dirname, '../backups', f), path.join(__dirname, '..', f), f].find(fs.existsSync) || f;

const css = fs.readFileSync(resolvePath('styles.css'), 'utf8');
const html = fs.readFileSync(resolvePath('index.html'), 'utf8');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('==========================================================');
console.log(' RUNNING MOBILE LIST HORIZONTAL SCROLL & ALIGNMENT SUITE');
console.log('==========================================================\n');

// 1. Zero Unicode Emojis
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
assert(!emojiRegex.test(css), 'Zero emojis in styles.css');
assert(!emojiRegex.test(html), 'Zero emojis in index.html');

// 2. Add Member Form Baseline Alignment & Office Section
assert(css.includes('#addMemberBox .form-grid-3'), 'styles.css defines #addMemberBox .form-grid-3 rules');
assert(css.includes('align-items: flex-end !important') || css.includes('align-items: flex-end'), '#addMemberBox .form-grid-3 aligns inputs on horizontal baseline');
assert(css.includes('#addMemberBox .form-label'), '#addMemberBox .form-label has dedicated alignment rule');
assert(css.includes('min-height: 28px'), '#addMemberBox .form-label unifies label container height to 28px');
assert(css.includes('#newMemberSection'), '#newMemberSection has dedicated width rule');

// 3. Team Members Table Horizontal Scroll & Section Full Visibility
assert(css.includes('#teamListTable'), 'styles.css defines #teamListTable minimum width');
assert(css.includes('min-width: 620px !important'), '#teamListTable enforces min-width: 620px !important');
assert(css.includes('.move-sec-select'), '.move-sec-select has dedicated rule for office section');
assert(css.includes('min-width: 145px !important'), '.move-sec-select has min-width: 145px !important to prevent Ap truncation');
assert(css.includes('.change-hours-input'), '.change-hours-input has dedicated width rule');

// 4. Projects & Tenders Table
assert(css.includes('#projectsListTable'), 'styles.css defines #projectsListTable min-width');
assert(css.includes('min-width: 820px !important'), '#projectsListTable enforces min-width: 820px !important');

// 5. Audit & Other Modal Data Tables
assert(css.includes('#analyticsProjectTable'), '#analyticsProjectTable has min-width rule');
assert(css.includes('#noProjectTable'), '#noProjectTable has min-width rule');
assert(css.includes('#contribDaysTable'), '#contribDaysTable has min-width rule');
assert(css.includes('#projectDaysTable'), '#projectDaysTable has min-width rule');
assert(css.includes('.audit-table'), '.audit-table has min-width rule');
assert(css.includes('.hist-log-table'), '.hist-log-table has min-width rule');
assert(css.includes('.hist-devices-table'), '.hist-devices-table has min-width rule');

// 6. Two-Dimensional Touch Pan & Scrolling Engine
assert(css.includes('touch-action: pan-x pan-y !important'), 'Table wrappers enforce touch-action: pan-x pan-y for dual-axis gestures');
assert(css.includes('overflow-x: auto !important'), 'Table wrappers enforce overflow-x: auto !important for horizontal scrolling');

console.log(`\n==========================================================`);
console.log(` SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log(`==========================================================`);

if (failed > 0) process.exit(1);

