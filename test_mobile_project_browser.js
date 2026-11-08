const fs = require('fs');
const assert = require('assert');

console.log('==========================================================');
console.log(' RUNNING MOBILE PROJECT BROWSER & HOURS STEPPING SUITE');
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

test('1.2 Cache buster is v=6.2 in index.html', () => {
  assert(html.includes('styles.css?v=6.2'), 'styles.css v=6.2 not found');
  assert(html.includes('app.js?v=6.2'), 'app.js v=6.2 not found');
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

test('1.9 Mobile hour chips (8h, 4h, 1h, 12h) removed from index.html', () => {
  assert(!html.includes('class="mobile-hours-chips"'), 'mobile-hours-chips still present in index.html');
  assert(!html.includes('btn-hour-pill'), 'btn-hour-pill buttons still present in index.html');
});

test('1.10 mobileHoursInput configured with min="1" max="12" step="1" (no half hour stepping)', () => {
  assert(/id="mobileHoursInput"[^>]*step="1"/.test(html), 'mobileHoursInput step="1" missing in index.html');
  assert(/id="mobileHoursInput"[^>]*min="1"/.test(html), 'mobileHoursInput min="1" missing in index.html');
  assert(/id="mobileHoursInput"[^>]*max="12"/.test(html), 'mobileHoursInput max="12" missing in index.html');
  assert(!/id="mobileHoursInput"[^>]*step="0\.5"/.test(html), 'mobileHoursInput still has step="0.5" in index.html');
});

test('1.11 popoverHoursInput and bulkHoursInput configured with step="1"', () => {
  assert(/id="popoverHoursInput"[^>]*step="1"/.test(html), 'popoverHoursInput step="1" missing in index.html');
  assert(/id="bulkHoursInput"[^>]*step="1"/.test(html), 'bulkHoursInput step="1" missing in index.html');
});

test('1.12 app.js enforces integer rounding on mobileHoursInput and handleMobileApply', () => {
  assert(js.includes('Math.round(parseFloat(el.mobileHoursInput.value))'), 'mobileHoursInput change rounding missing');
  assert(js.includes('Math.round(parseFloat(rawHours)'), 'handleMobileApply rounding missing');
});

test('1.13 Settings drawer: Month-End Audit renamed to Monthly Audit', () => {
  assert(html.includes('<strong>Monthly Audit</strong>'), 'Missing Monthly Audit in index.html');
  assert(!html.includes('<strong>Month-End Audit</strong>'), 'Month-End Audit still present in index.html');
});

test('1.14 Settings drawer: Desktop grid toggle renamed to Grid Mode', () => {
  assert(html.includes('<strong id="toggleMobileDesktopGridLabel">Grid Mode</strong>'), 'Missing Grid Mode in index.html');
  assert(js.includes("el.toggleMobileDesktopGridLabel.textContent = 'Grid Mode'"), 'Missing Grid Mode in app.js');
  assert(!html.includes('View Full Desktop Grid (Read-Only)'), 'View Full Desktop Grid still present in index.html');
});

test('1.15 Settings drawer: Projects & WBS renamed to Projects and Tenders', () => {
  assert(html.includes('<strong>Projects and Tenders</strong>'), 'Missing Projects and Tenders in index.html');
  assert(!html.includes('<strong>Projects &amp; WBS</strong>'), 'Projects &amp; WBS still present in index.html');
});

test('1.16 Settings drawer: Edit History renamed to History with clock SVG removed', () => {
  assert(html.includes('<strong>History</strong>'), 'Missing History in index.html');
  assert(html.includes('<span class="action-card-icon" id="auditHistoryIcon"></span>'), 'Clock icon still present in auditHistoryIcon');
  assert(!html.includes('<strong>Edit History &amp; Device Audit</strong>'), 'Edit History &amp; Device Audit still present in index.html');
});

test('1.17 Dark mode: all employee names visible in white, and chosen profile in bold white in both interfaces', () => {
  // All employee names in white
  assert(css.includes('[data-theme="dark"] .schedule-table td.col-user .user-name-text'), 'Missing dark theme rule for schedule table employee names');
  assert(css.includes('[data-theme="dark"] body.is-mobile-device .schedule-table td.col-user .user-name-text'), 'Missing dark theme rule for mobile grid employee names');
  assert(css.includes('[data-theme="dark"] body.mobile-readonly-grid .schedule-table td.col-user .user-name-text'), 'Missing dark theme rule for mobile readonly grid employee names');
  // Chosen profile in bold white
  assert(css.includes('[data-theme="dark"] .user-row.active-user-row td.col-user .user-name-text'), 'Missing dark theme active-user-row rule');
  assert(css.includes('[data-theme="dark"] #currentUserNameDisplay'), 'Missing dark theme currentUserNameDisplay');
  assert(css.includes('[data-theme="dark"] #mobileUserNameDisplay'), 'Missing dark theme mobileUserNameDisplay');
  assert(css.includes('font-weight: 800 !important;'), 'Missing font-weight: 800 for bold chosen profile');
});

console.log(`\n==========================================================`);
console.log(` MOBILE PROJECT BROWSER & HOURS STEPPING SUITE COMPLETE: ${passCount} PASSED, 0 FAILED`);
console.log(`==========================================================\n`);
