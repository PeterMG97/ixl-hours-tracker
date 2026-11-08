const fs = require('fs');
const assert = require('assert');

console.log('==========================================================');
console.log(' RUNNING MOBILE PROJECT BROWSER STANDALONE SELECTOR SUITE');
console.log('==========================================================\n');

let passCount = 0;
function test(msg, fn) {
  try {
    fn();
    console.log(`  [PASS] ${msg}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${msg}`);
    console.error(err.message);
    process.exit(1);
  }
}

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');

test('1.1 Zero emojis across all files', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(html), 'Emoji in html');
  assert(!emojiRegex.test(css), 'Emoji in css');
  assert(!emojiRegex.test(js), 'Emoji in js');
});

test('1.2 Cache buster is v=5.9 in index.html', () => {
  assert(html.includes('styles.css?v=5.9'), 'styles.css v=5.9 not found');
  assert(html.includes('app.js?v=5.9'), 'app.js v=5.9 not found');
});

test('1.3 styles.css hides upper red-framed elements in mobile logger card', () => {
  assert(css.includes('.mobile-logger-card .mobile-legacy-proj-label'), 'mobile-legacy-proj-label hidden rule missing');
  assert(css.includes('.mobile-logger-card .starred-quick-container'), 'starred-quick-container hidden rule missing');
  assert(css.includes('.mobile-logger-card .project-select-with-star'), 'project-select-with-star hidden rule missing');
  assert(css.includes('#mobileToggleBrowserBtn'), 'mobileToggleBrowserBtn hidden rule missing');
  assert(css.includes('#mobileBrowserContent'), 'mobileBrowserContent display rule missing');
});

test('1.4 styles.css defines selected project styling with badge and left border', () => {
  assert(css.includes('.proj-item.is-selected-proj'), 'is-selected-proj styling missing');
  assert(css.includes('.proj-selected-badge'), 'proj-selected-badge styling missing');
  assert(css.includes('.special-action-tag'), 'special-action-tag styling missing');
});

test('1.5 app.js renderMobileProjectPillList includes special items (Day OFF, NO PROJECT, [CLEAR / DELETE HOURS])', () => {
  assert(js.includes("name: 'Day OFF'"), 'Day OFF special item missing');
  assert(js.includes("name: 'NO PROJECT'"), 'NO PROJECT special item missing');
  assert(js.includes("name: '[CLEAR / DELETE HOURS]'"), '[CLEAR / DELETE HOURS] special item missing');
  assert(js.includes("val: '__CLEAR__'"), '__CLEAR__ val missing');
});

test('1.6 app.js renderMobileProjectPillList applies is-selected-proj to matching current value', () => {
  assert(js.includes('is-selected-proj'), 'is-selected-proj class assignment missing');
  assert(js.includes('proj-selected-badge'), 'proj-selected-badge render missing');
});

test('1.7 app.js item click updates el.mobileProjectSelect.value and toggles selection classes in-place', () => {
  assert(js.includes('el.mobileProjectSelect.value = pName'), 'mobileProjectSelect value update missing');
  assert(js.includes("pi.classList.toggle('is-selected-proj', isMatch)"), 'in-place is-selected-proj toggle missing');
});

test('1.8 Tapping agenda row updates selected project and re-renders mobile project pill list', () => {
  assert(js.includes('renderMobileProjectPillList(el.mobileProjectSearchInput ? el.mobileProjectSearchInput.value : \'\')'), 'agenda row re-render call missing');
});

console.log(`\n==========================================================`);
console.log(` MOBILE PROJECT BROWSER SUITE COMPLETE: ${passCount} PASSED, 0 FAILED`);
console.log(`==========================================================\n`);
