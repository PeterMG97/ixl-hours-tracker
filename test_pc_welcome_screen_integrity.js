/**
 * test_pc_welcome_screen_integrity.js
 * Dedicated automated test suite verifying that:
 * 1. The welcome/loading screen is strictly enabled for the PC interface only (and hidden on mobile).
 * 2. The picture used is the exact, unmodified, full-quality original image (2752x1536, 268,506 bytes, matching welcome_pic/1.jpg).
 * 3. The rotating loading circle (splash spinner) is positioned on the welcome screen.
 * 4. Automated dismissal (with click/key skip) is wired cleanly on PC.
 * 5. Zero emojis across files.
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
console.log(' RUNNING PC WELCOME / LOADING SCREEN INTEGRITY TEST SUITE');
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

// ========================================================
// MODULE 2: PC-Only Welcome Screen Layout & Markup
// ========================================================
console.log('\n>>> MODULE 2: PC-Only Welcome Screen Layout & Markup');

test('2.1 index.html references alstom-welcome-pc.jpg with natural dimensions (2752x1536)', () => {
  assert(html.includes('src="alstom-welcome-pc.jpg?v=10.0"'), 'Missing alstom-welcome-pc.jpg reference in index.html');
  assert(html.includes('width="2752"'), 'Missing width="2752" in index.html');
  assert(html.includes('height="1536"'), 'Missing height="1536" in index.html');
});

test('2.2 Rotating loading circle (splash-spinner) is present on welcome screen', () => {
  assert(html.includes('class="splash-spinner-wrap"'), 'splash-spinner-wrap missing in index.html');
  assert(html.includes('class="splash-spinner-circle"'), 'splash-spinner-circle missing in index.html');
});

test('2.2a Loading circle is centered between "b" and "y" in "by" (left: 50.4%)', () => {
  assert(html.includes('left: 50.4%;'), 'index.html critical CSS missing left: 50.4% for splash-spinner-wrap');
  assert(css.includes('left: 50.4%;'), 'styles.css missing left: 50.4% for splash-spinner-wrap');
});

test('2.3 styles.css and critical CSS strictly isolate welcome screen to PC only (hidden on mobile)', () => {
  // Critical CSS checks
  assert(html.includes('@media (max-width: 768px)'), 'Mobile media query missing in critical CSS');
  assert(html.includes('@media (min-width: 769px)'), 'PC media query missing in critical CSS');
  
  // styles.css checks
  assert(css.includes('@media (max-width: 768px)'), 'Mobile media query missing in styles.css');
  assert(css.includes('@media (min-width: 769px)'), 'PC media query missing in styles.css');
  assert(css.includes('display: none !important;'), 'display: none !important missing in styles.css');
});

// ========================================================
// MODULE 3: JavaScript Lifecycle & Device Mode Locking
// ========================================================
console.log('\n>>> MODULE 3: JavaScript Lifecycle & Device Mode Locking');

test('3.1 initMobileWelcomeScreen immediately hides welcome screen on mobile devices', () => {
  const fnIdx = js.indexOf('function initMobileWelcomeScreen()');
  assert(fnIdx !== -1, 'initMobileWelcomeScreen function missing in app.js');
  const fnBlock = js.substring(fnIdx, fnIdx + 1200);
  assert(fnBlock.includes('if (isMobileInterface())'), 'Missing isMobileInterface check in initMobileWelcomeScreen');
  assert(fnBlock.includes("overlay.classList.add('hidden', 'hidden-permanently')"), 'Missing mobile hide call');
  assert(fnBlock.includes("overlay.style.display = 'none'"), 'Missing mobile display:none call');
});

test('3.2 initMobileWelcomeScreen unhides overlay on PC and supports auto-dismissal and key/click skip', () => {
  const fnIdx = js.indexOf('function initMobileWelcomeScreen()');
  const fnBlock = js.substring(fnIdx, fnIdx + 1600);
  assert(fnBlock.includes("overlay.classList.remove('hidden', 'hidden-permanently')"), 'Missing PC unhide call');
  assert(fnBlock.includes("overlay.style.display = 'flex'"), 'Missing PC display:flex call');
  assert(fnBlock.includes('dismissWelcome'), 'Missing dismissWelcome function');
  assert(fnBlock.includes('setTimeout'), 'Missing auto-dismiss timer');
  assert(fnBlock.includes('keydown'), 'Missing keyboard dismiss listener');
});

console.log('\n==========================================================');
console.log(` PC WELCOME SCREEN INTEGRITY SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==========================================================');

if (failCount > 0) {
  process.exit(1);
}
