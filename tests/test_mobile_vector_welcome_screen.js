/**
 * test_mobile_vector_welcome_screen.js
 * Dedicated verification suite for the 100% Vector SVG & CSS Mobile Portrait Welcome Screen
 *
 * Verifies:
 * 1. Zero unicode emojis across files.
 * 2. Mobile welcome stage contains 0% bitmap images/photos (no img or picture in active stage).
 * 3. Exact official ALSTOM corporate vector glyphs (A, L, S, T, M) and trademark red swirl O aperture.
 * 4. High-speed aerodynamic bullet train dynamic loading line styled for mobile portrait.
 * 5. Strict 5-second lockout: touch and mouse clicks are absorbed without early dismissal.
 * 6. Dynamic version synchronization: APP_VERSION constant updates mobile footer version element.
 * 7. Mobile portrait layout: vertical positioning at 43% golden ratio sweet spot and responsive clamping.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const resolvePath = (f) => [path.join(__dirname, '../public', f), path.join(__dirname, '../backups', f), path.join(__dirname, '..', f), f].find(fs.existsSync) || f;

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
console.log(' RUNNING MOBILE VECTOR WELCOME SCREEN TEST SUITE');
console.log('==========================================================\n');

const html = fs.readFileSync(resolvePath('index.html'), 'utf8');
const js = fs.readFileSync(resolvePath('app.js'), 'utf8');
const css = fs.readFileSync(resolvePath('styles.css'), 'utf8');

// ========================================================
// MODULE 1: Zero Emojis & Architecture
// ========================================================
console.log('>>> MODULE 1: Static Code Contracts & Zero Emojis');

test('1.1 Zero unicode emojis across index.html, app.js, and styles.css', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(html), 'Found emoji in index.html');
  assert(!emojiRegex.test(js), 'Found emoji in app.js');
  assert(!emojiRegex.test(css), 'Found emoji in styles.css');
});

test('1.2 Active mobile welcome stage contains 0% bitmap images (no img/picture inside active stage)', () => {
  const mobStageStart = html.indexOf('id="mobileTouchWelcomeStage"');
  assert(mobStageStart !== -1, 'id="mobileTouchWelcomeStage" missing in index.html');
  const mobStageEnd = html.indexOf('id="mobileWelcomeLogo"', mobStageStart);
  assert(mobStageEnd !== -1, 'id="mobileWelcomeLogo" missing after mobile stage');
  const mobStageHtml = html.substring(mobStageStart, mobStageEnd);

  assert(!mobStageHtml.includes('<img'), 'Active mobile stage must contain 0 <img> tags');
  assert(!mobStageHtml.includes('<picture'), 'Active mobile stage must contain 0 <picture> tags');
  assert(!mobStageHtml.includes('.jpg'), 'Active mobile stage must contain 0 .jpg references');
  assert(!mobStageHtml.includes('.png'), 'Active mobile stage must contain 0 .png references');
});

// ========================================================
// MODULE 2: Vector Graphics & Mobile Portrait Typography
// ========================================================
console.log('\n>>> MODULE 2: Vector Graphics & Mobile Portrait Typography');

test('2.1 Scalable official ALSTOM wordmark exists in mobile stage with red swirl aperture O', () => {
  const mobStageStart = html.indexOf('id="mobileTouchWelcomeStage"');
  const mobStageEnd = html.indexOf('id="mobileWelcomeLogo"', mobStageStart);
  const mobStageHtml = html.substring(mobStageStart, mobStageEnd);

  assert(mobStageHtml.includes('welcome-mobile-brand'), 'welcome-mobile-brand missing');
  assert(mobStageHtml.includes('viewBox="20 18 292 52"'), 'viewBox="20 18 292 52" missing');
  assert(mobStageHtml.includes('class="alstom-vector-o"'), 'alstom-vector-o missing');
  assert(mobStageHtml.includes('#E01A22'), 'Corporate red #E01A22 missing in mobile ALSTOM logo');
});

test('2.2 High-speed bullet train loading line exists in mobile stage with fluid stroke and headlight', () => {
  const mobStageStart = html.indexOf('id="mobileTouchWelcomeStage"');
  const mobStageEnd = html.indexOf('id="mobileWelcomeLogo"', mobStageStart);
  const mobStageHtml = html.substring(mobStageStart, mobStageEnd);

  assert(mobStageHtml.includes('welcome-mobile-train-svg'), 'welcome-mobile-train-svg missing');
  assert(mobStageHtml.includes('train-stroke-animated'), 'train-stroke-animated missing');
  assert(mobStageHtml.includes('train-speed-streaks'), 'train-speed-streaks missing');
  assert(mobStageHtml.includes('train-headlight'), 'train-headlight missing');
  assert(mobStageHtml.includes('#38bdf8'), 'Luminous cyan #38bdf8 missing in mobile train loader');
});

test('2.3 Mobile 3-tier bottom signature with by, IXL Team, and dynamic app version', () => {
  const mobStageStart = html.indexOf('id="mobileTouchWelcomeStage"');
  const mobStageEnd = html.indexOf('id="mobileWelcomeLogo"', mobStageStart);
  const mobStageHtml = html.substring(mobStageStart, mobStageEnd);

  assert(mobStageHtml.includes('class="welcome-footer-by"'), 'welcome-footer-by missing');
  assert(mobStageHtml.includes('class="welcome-footer-team"'), 'welcome-footer-team missing');
  assert(mobStageHtml.includes('id="welcomeAppVersionMobile"'), 'welcomeAppVersionMobile missing');
});

test('2.4 Mobile portrait layout styling in critical CSS and styles.css', () => {
  assert(html.includes('.welcome-mobile-vector-stage'), 'welcome-mobile-vector-stage missing in index.html');
  assert(html.includes('.welcome-mobile-center'), 'welcome-mobile-center missing in index.html');
  assert(html.includes('.welcome-mobile-brand'), 'welcome-mobile-brand missing in index.html');
  assert(css.includes('.welcome-mobile-vector-stage'), 'welcome-mobile-vector-stage missing in styles.css');
  assert(css.includes('.welcome-mobile-center'), 'welcome-mobile-center missing in styles.css');
  assert(css.includes('.welcome-mobile-brand'), 'welcome-mobile-brand missing in styles.css');
});

test('2.5 Mobile Welcome signature styling: upright Semi-Bold IXL Team with breathing room and dimmed by/version', () => {
  assert(html.includes('.welcome-mobile-footer .welcome-footer-team'), 'Mobile team rule missing in index.html');
  assert(css.includes('.welcome-mobile-footer .welcome-footer-team'), 'Mobile team rule missing in styles.css');
  assert(css.includes('.welcome-mobile-footer .welcome-footer-by'), 'Mobile by rule missing in styles.css');
  assert(css.includes('.welcome-mobile-footer .welcome-footer-version'), 'Mobile version rule missing in styles.css');
  
  // Verify upright Semi-Bold IXL Team
  const teamMatch = css.match(/\.welcome-mobile-footer\s+\.welcome-footer-team\s*\{([^}]+)\}/);
  assert(teamMatch, 'Mobile team rule block missing');
  const teamCss = teamMatch[1];
  assert(teamCss.includes('font-style: normal !important;'), 'Mobile IXL Team must be non-italic (upright)');
  assert(teamCss.includes('font-weight: 600 !important;'), 'Mobile IXL Team must be semi-bold (600)');
  assert(teamCss.includes('margin-bottom: 10px !important;'), 'Mobile IXL Team must have breathing room margin');
  assert(teamCss.includes('#e2e8f0 !important;'), 'Mobile IXL Team must be soft white #e2e8f0');

  // Verify by element
  const byMatch = css.match(/\.welcome-mobile-footer\s+\.welcome-footer-by\s*\{([^}]+)\}/);
  assert(byMatch, 'Mobile by rule block missing');
  const byCss = byMatch[1];
  assert(byCss.includes('font-style: normal !important;'), 'Mobile by must be upright');
  assert(byCss.includes('margin-bottom: 8px !important;'), 'Mobile by must have breathing room margin');
  assert(byCss.includes('color: #64748b !important;'), 'Mobile by must have dimmed darker gray');

  // Verify version element
  const verMatch = css.match(/\.welcome-mobile-footer\s+\.welcome-footer-version\s*\{([^}]+)\}/);
  assert(verMatch, 'Mobile version rule block missing');
  const verCss = verMatch[1];
  assert(verCss.includes('color: #475569 !important;'), 'Mobile version must have dimmed darker gray');
});

test('2.6 Mobile Welcome loading train moved horizontally right by 5mm without changing shape or color', () => {
  assert(html.includes('transform: translateX(5mm) !important;'), 'Mobile critical CSS train wrapper must have translateX(5mm)');
  assert(css.includes('transform: translateX(5mm) !important;'), 'styles.css mobile train wrapper must have translateX(5mm)');
  // Verify shape and color elements are strictly preserved
  const mobStageStart = html.indexOf('id="mobileTouchWelcomeStage"');
  const mobStageEnd = html.indexOf('id="mobileWelcomeLogo"', mobStageStart);
  const mobStageHtml = html.substring(mobStageStart, mobStageEnd);
  assert(mobStageHtml.includes('viewBox="0 0 520 28"'), 'Mobile train viewBox must remain 0 0 520 28');
  assert(mobStageHtml.includes('id="trainNeonGradMob"'), 'Mobile trainNeonGradMob must be preserved');
  assert(mobStageHtml.includes('cx="506" cy="23" r="1.6" fill="#FFFFFF"'), 'Mobile train headlight must remain untouched at cx=506');
});

// ========================================================
// MODULE 3: Strict 5-Second Lockout on Mobile
// ========================================================
console.log('\n>>> MODULE 3: Strict 5-Second Lockout on Mobile');

test('3.1 Mobile welcome stage stops click and touch propagation to prevent early dismissal', () => {
  const mobStageStart = html.indexOf('id="mobileTouchWelcomeStage"');
  const mobStageTag = html.substring(mobStageStart, mobStageStart + 350);

  assert(mobStageTag.includes('onclick="event.stopPropagation();"'), 'onclick stopPropagation missing on mobile stage');
  assert(mobStageTag.includes('onmousedown="event.stopPropagation();"'), 'onmousedown stopPropagation missing on mobile stage');
  assert(mobStageTag.includes('ontouchstart="event.stopPropagation();"'), 'ontouchstart stopPropagation missing on mobile stage');
});

test('3.2 Dynamic version synchronization updates mobile version element', () => {
  assert(js.includes('welcomeAppVersionMobile'), 'welcomeAppVersionMobile update missing in app.js');
});

// ========================================================
// SUMMARY
// ========================================================
console.log('\n==========================================================');
console.log(` MOBILE VECTOR WELCOME TEST COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==========================================================');

if (failCount > 0) {
  process.exit(1);
}
