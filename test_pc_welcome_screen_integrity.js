/**
 * test_pc_welcome_screen_integrity.js
 * Dedicated automated test suite verifying that:
 * 1. The welcome/loading screen is enabled for both PC and Mobile interfaces.
 * 2. The picture used is the exact, unmodified, full-quality original image (2752x1536, 268,506 bytes, matching welcome_pic/1.jpg).
 * 3. The rotating loading circle (splash spinner) is positioned directly above "by" and centered between "b" and "y" (left: 50.4%).
 * 4. On mobile, the spinner has responsive sizing and clearance above "by" without touching or interfering.
 * 5. Automated dismissal (with click/touch/key skip) is wired cleanly on both PC and mobile.
 * 6. Zero emojis across files.
 */

const fs = require('fs');
const assert = require('assert');
const crypto = require('crypto');

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
console.log(' RUNNING WELCOME / LOADING SCREEN INTEGRITY TEST SUITE');
console.log('==========================================================\n');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

// ========================================================
// MODULE 1: Static Code Contracts & Zero Emojis
// ========================================================
console.log('>>> MODULE 1: Static Code Contracts & Zero Emojis');

test('1.1 Zero unicode emojis in index.html, app.js, and styles.css', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(html), 'Found emoji in index.html');
  assert(!emojiRegex.test(js), 'Found emoji in app.js');
  assert(!emojiRegex.test(css), 'Found emoji in styles.css');
});

test('1.2 Cache buster bumped to v=10.0 in index.html', () => {
  assert(html.includes('styles.css?v=10.0'), 'styles.css v=10.0 not found in index.html');
  assert(html.includes('app.js?v=10.0'), 'app.js v=10.0 not found in index.html');
});

test('1.3 alstom-welcome-pc.jpg is byte-for-byte identical to welcome_pic/1.jpg with zero resize/modification', () => {
  const origBuf = fs.readFileSync('welcome_pic/1.jpg');
  const pcBuf = fs.readFileSync('alstom-welcome-pc.jpg');
  assert.strictEqual(origBuf.length, 268506, 'Original image file size must be exactly 268,506 bytes');
  assert.strictEqual(pcBuf.length, 268506, 'PC welcome image must be exactly 268,506 bytes');
  
  const origHash = crypto.createHash('sha256').update(origBuf).digest('hex');
  const pcHash = crypto.createHash('sha256').update(pcBuf).digest('hex');
  assert.strictEqual(pcHash, origHash, 'PC welcome image SHA256 must match welcome_pic/1.jpg byte-for-byte');
});

test('1.4 alstom-welcome-mobile.jpg is byte-for-byte identical to welcome_pic_mob/2026-11-10 17.06.jpg', () => {
  const origMobBuf = fs.readFileSync('welcome_pic_mob/2026-11-10 17.06.jpg');
  const mobBuf = fs.readFileSync('alstom-welcome-mobile.jpg');
  assert.strictEqual(mobBuf.length, 320123, 'Mobile welcome image must be exactly 320,123 bytes');
  const origHash = crypto.createHash('sha256').update(origMobBuf).digest('hex');
  const mobHash = crypto.createHash('sha256').update(mobBuf).digest('hex');
  assert.strictEqual(mobHash, origHash, 'Mobile welcome image SHA256 must match welcome_pic_mob exactly');
});

// ========================================================
// MODULE 2: Welcome Screen Layout & Responsive Placement
// ========================================================
console.log('\n>>> MODULE 2: Welcome Screen Layout & Responsive Placement');

test('2.1 index.html references responsive mobile and PC artwork with natural dimensions', () => {
  assert(html.includes('alstom-welcome-mobile.jpg?v=10.0'), 'Missing mobile welcome image reference in index.html');
  assert(html.includes('width="1408"'), 'Missing mobile width="1408" in index.html');
  assert(html.includes('height="3040"'), 'Missing mobile height="3040" in index.html');
  assert(html.includes('alstom-welcome-pc.jpg?v=10.0'), 'Missing PC welcome image reference in index.html');
  assert(html.includes('width="2752"'), 'Missing PC width="2752" in index.html');
  assert(html.includes('height="1536"'), 'Missing PC height="1536" in index.html');
});

test('2.2 Rotating loading circle (splash-spinner) is present on welcome screen', () => {
  assert(html.includes('class="splash-spinner-wrap"'), 'splash-spinner-wrap missing in index.html');
  assert(html.includes('class="splash-spinner-circle"'), 'splash-spinner-circle missing in index.html');
});

test('2.2a Loading circle is horizontally centered between "b" and "y" in "by" (left: 50.4%)', () => {
  assert(html.includes('left: 50.4%;'), 'index.html critical CSS missing left: 50.4% for splash-spinner-wrap');
  assert(css.includes('left: 50.4%;'), 'styles.css missing left: 50.4% for splash-spinner-wrap');
});

test('2.3 Mobile-responsive positioning places circle above "by" without touching or interfering', () => {
  // Mobile media queries configure safe clearance and portrait aspect ratio
  assert(html.includes('@media (max-width: 768px)'), 'Mobile media query missing in critical CSS');
  assert(html.includes('aspect-ratio: 1408 / 3040;'), 'Mobile aspect-ratio 1408 / 3040 missing in critical CSS');
  assert(html.includes('top: 90.0%;'), 'Mobile top: 90.0% clearance missing in critical CSS');
  assert(html.includes('left: 50.0%;'), 'Mobile left: 50.0% centering missing in critical CSS');
  assert(css.includes('@media (max-width: 768px)'), 'Mobile media query missing in styles.css');
  assert(css.includes('aspect-ratio: 1408 / 3040;'), 'Mobile aspect-ratio 1408 / 3040 missing in styles.css');
  assert(css.includes('top: 90.0%;'), 'Mobile top: 90.0% clearance missing in styles.css');
  assert(css.includes('left: 50.0%;'), 'Mobile left: 50.0% centering missing in styles.css');
  assert(css.includes('clamp('), 'Mobile responsive clamp sizing missing in styles.css');
});

// ========================================================
// MODULE 3: JavaScript Lifecycle & Device Support
// ========================================================
console.log('\n>>> MODULE 3: JavaScript Lifecycle & Device Support');

test('3.1 initMobileWelcomeScreen unhides overlay on boot for both mobile and PC', () => {
  const fnIdx = js.indexOf('function initMobileWelcomeScreen()');
  assert(fnIdx !== -1, 'initMobileWelcomeScreen function missing in app.js');
  const fnBlock = js.substring(fnIdx, fnIdx + 1200);
  assert(fnBlock.includes("overlay.classList.remove('hidden', 'hidden-permanently')"), 'Missing unhide call');
  assert(fnBlock.includes("overlay.style.display = 'flex'"), 'Missing display:flex call');
  assert(fnBlock.includes('touchstart'), 'Missing touchstart listener for mobile tap dismiss');
});

test('3.2 initMobileWelcomeScreen supports 10-second auto-dismissal, click/tap skip, and view-only guard', () => {
  const fnIdx = js.indexOf('function initMobileWelcomeScreen()');
  const fnBlock = js.substring(fnIdx, fnIdx + 1600);
  assert(fnBlock.includes('dismissWelcome'), 'Missing dismissWelcome function');
  assert(fnBlock.includes('setTimeout'), 'Missing auto-dismiss timer');
  assert(fnBlock.includes('10000'), 'Auto-dismiss timer must be set to 10 seconds (10000ms)');
  assert(fnBlock.includes('click'), 'Missing click dismiss listener');
  assert(fnBlock.includes('keydown'), 'Missing keyboard dismiss listener');
  assert(fnBlock.includes('if (isMobileInterface() && !state.isViewOnly)'), 'Missing view-only check in initMobileWelcomeScreen');
});

console.log('\n==========================================================');
console.log(` WELCOME SCREEN INTEGRITY SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==========================================================');

if (failCount > 0) {
  process.exit(1);
}
