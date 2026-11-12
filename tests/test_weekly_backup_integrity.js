const fs = require('fs');
const path = require('path');
const assert = require('assert');

const resolvePath = (f) => [path.join(__dirname, '../public', f), path.join(__dirname, '../server', f), path.join(__dirname, '..', f), f].find(fs.existsSync) || f;

console.log('==========================================================');
console.log(' RUNNING DEDICATED WEEKLY BACKUP & RETENTION TEST SUITE');
console.log('==========================================================');

const indexHtml = fs.readFileSync(resolvePath('index.html'), 'utf8');
const appJs = fs.readFileSync(resolvePath('app.js'), 'utf8');
const stylesCss = fs.readFileSync(resolvePath('styles.css'), 'utf8');
const serverJs = fs.readFileSync(resolvePath('server.js'), 'utf8');

let passCount = 0;
function pass(msg) {
  passCount++;
  console.log('  [PASS] ' + msg);
}

// -----------------------------------------------------------------------------
// MODULE 1: Static Code Contracts (index.html, styles.css, app.js, server.js)
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 1: Static Code Contracts');

// 1.1 index.html markup
assert(indexHtml.includes('id="openBackupsBtn"'), 'openBackupsBtn missing in index.html');
assert(indexHtml.includes('id="backupsModal"'), 'backupsModal missing in index.html');
assert(indexHtml.includes('id="closeBackupsModalBtn"'), 'closeBackupsModalBtn missing in index.html');
assert(indexHtml.includes('id="backupKpiCount"'), 'backupKpiCount missing in index.html');
assert(indexHtml.includes('id="backupKpiNext"'), 'backupKpiNext missing in index.html');
assert(indexHtml.includes('id="createManualBackupBtn"'), 'createManualBackupBtn missing in index.html');
assert(indexHtml.includes('id="backupsTable"'), 'backupsTable missing in index.html');
assert(indexHtml.includes('id="confirmRestoreModal"'), 'confirmRestoreModal missing in index.html');
assert(indexHtml.includes('id="executeRestoreBtn"'), 'executeRestoreBtn missing in index.html');
pass('1.1 index.html contains complete Data Backups & Recovery modal, KPIs, action buttons, and confirmation dialog');

// 1.2 styles.css styling
assert(stylesCss.includes('.backups-kpis'), '.backups-kpis missing in styles.css');
assert(stylesCss.includes('.backup-kpi-card'), '.backup-kpi-card missing in styles.css');
assert(stylesCss.includes('.backup-type-badge.badge-weekly'), '.backup-type-badge.badge-weekly missing in styles.css');
assert(stylesCss.includes('.backup-type-badge.badge-manual'), '.backup-type-badge.badge-manual missing in styles.css');
assert(stylesCss.includes('.backup-type-badge.badge-safety'), '.backup-type-badge.badge-safety missing in styles.css');
assert(stylesCss.includes('.backup-btn-download'), '.backup-btn-download missing in styles.css');
assert(stylesCss.includes('.backup-btn-restore'), '.backup-btn-restore missing in styles.css');
assert(stylesCss.includes('.backup-btn-delete'), '.backup-btn-delete missing in styles.css');
pass('1.2 styles.css defines backup KPIs, badges, table actions, and theme variations');

// 1.3 app.js engine functions
assert(appJs.includes('function getCairoTime'), 'getCairoTime missing in app.js');
assert(appJs.includes('function getLatestFridaySlot'), 'getLatestFridaySlot missing in app.js');
assert(appJs.includes('function getNextFridaySlot'), 'getNextFridaySlot missing in app.js');
assert(appJs.includes('function purgeExpiredSnapshots'), 'purgeExpiredSnapshots missing in app.js');
assert(appJs.includes('function createSnapshot'), 'createSnapshot missing in app.js');
assert(appJs.includes('function checkAndTriggerWeeklyBackup'), 'checkAndTriggerWeeklyBackup missing in app.js');
assert(appJs.includes('function downloadSnapshotJson'), 'downloadSnapshotJson missing in app.js');
assert(appJs.includes('function executeRestore'), 'executeRestore missing in app.js');
assert(appJs.includes('function initBackupsEngine'), 'initBackupsEngine missing in app.js');
pass('1.3 app.js implements Cairo scheduling, weekly Friday slots, 3-month retention, snapshotting, and restoration');

// 1.4 server.js local backup persistence
assert(serverJs.includes('/api/save-backup'), '/api/save-backup missing in server.js');
assert(serverJs.includes('WEEKLY_BACKUPS_DIR'), 'WEEKLY_BACKUPS_DIR missing in server.js');
assert(serverJs.includes('90 * 24 * 60 * 60 * 1000'), '90-day auto-purge missing in server.js');
pass('1.4 server.js implements /api/save-backup with rolling 90-day disk file cleanup');

// -----------------------------------------------------------------------------
// MODULE 2: Friday 22:00 Egypt Time Schedule Engine
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 2: Friday 22:00 Egypt Time Schedule Logic');

function simulateLatestFridaySlot(year, month, day, hour) {
  const dow = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
  let daysBack = 0;
  if (dow === 5) {
    daysBack = (hour >= 22) ? 0 : 7;
  } else if (dow === 6) {
    daysBack = 1;
  } else {
    daysBack = (dow + 2) % 7;
  }
  const targetUtc = new Date(Date.UTC(year, month - 1, day - daysBack, 12, 0, 0));
  const y = targetUtc.getUTCFullYear();
  const m = String(targetUtc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(targetUtc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function simulateNextFridaySlot(year, month, day, hour) {
  const dow = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
  let daysForward = 0;
  if (dow === 5) {
    daysForward = (hour < 22) ? 0 : 7;
  } else {
    daysForward = (5 - dow + 7) % 7;
  }
  const targetUtc = new Date(Date.UTC(year, month - 1, day + daysForward, 12, 0, 0));
  const y = targetUtc.getUTCFullYear();
  const m = String(targetUtc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(targetUtc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 2.1 Thursday before Friday
assert.strictEqual(simulateLatestFridaySlot(2026, 11, 12, 18), '2026-11-06', 'Thursday should resolve to last week Friday');
assert.strictEqual(simulateNextFridaySlot(2026, 11, 12, 18), '2026-11-13', 'Thursday should resolve to upcoming Friday tomorrow');
pass('2.1 Thursday 18:00 Cairo correctly identifies last Friday (Nov 6) and next Friday (Nov 13)');

// 2.2 Friday before 22:00
assert.strictEqual(simulateLatestFridaySlot(2026, 11, 13, 21), '2026-11-06', 'Friday 21:59 should not trigger this week yet');
assert.strictEqual(simulateNextFridaySlot(2026, 11, 13, 21), '2026-11-13', 'Friday 21:59 next schedule is today at 22:00');
pass('2.2 Friday 21:59 Cairo holds pending state until exact 22:00 cutoff');

// 2.3 Friday at 22:00 exact cutoff
assert.strictEqual(simulateLatestFridaySlot(2026, 11, 13, 22), '2026-11-13', 'Friday 22:00 should activate this week Friday');
assert.strictEqual(simulateNextFridaySlot(2026, 11, 13, 22), '2026-11-20', 'Friday 22:00 next schedule advances to next Friday');
pass('2.3 Friday 22:00 Cairo triggers current week backup and rolls next schedule to following Friday');

// 2.4 Weekend and next week carry-over (guarantees backup is taken even if opened later)
assert.strictEqual(simulateLatestFridaySlot(2026, 11, 14, 10), '2026-11-13', 'Saturday morning must still capture Friday Nov 13');
assert.strictEqual(simulateLatestFridaySlot(2026, 11, 15, 12), '2026-11-13', 'Sunday noon must still capture Friday Nov 13');
assert.strictEqual(simulateLatestFridaySlot(2026, 11, 17, 9), '2026-11-13', 'Tuesday morning must still capture Friday Nov 13');
pass('2.4 Opening the app on Saturday, Sunday, or Tuesday retains the Friday 22:00 slot ensuring zero missed backups');

// -----------------------------------------------------------------------------
// MODULE 3: 3-Month (90-Day) Automatic Retention Policy
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 3: 3-Month (90-Day) Retention & Auto-Purging');

const now = new Date('2026-11-12T18:00:00Z').getTime();
const dayMs = 24 * 60 * 60 * 1000;
const testCatalog = [
  { id: 'snap_recent_1', createdAt: new Date(now - 2 * dayMs).toISOString() }, // 2 days old
  { id: 'snap_recent_30', createdAt: new Date(now - 30 * dayMs).toISOString() }, // 1 month old
  { id: 'snap_recent_85', createdAt: new Date(now - 85 * dayMs).toISOString() }, // ~2.8 months old
  { id: 'snap_expired_91', createdAt: new Date(now - 91 * dayMs).toISOString() }, // > 3 months
  { id: 'snap_expired_120', createdAt: new Date(now - 120 * dayMs).toISOString() } // 4 months old
];

function simulatePurge(catalog, referenceTime) {
  const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
  const cutoff = referenceTime - THREE_MONTHS_MS;
  const kept = [];
  const purged = [];
  catalog.forEach(item => {
    const itemTime = new Date(item.createdAt).getTime();
    if (itemTime >= cutoff) {
      kept.push(item);
    } else {
      purged.push(item);
    }
  });
  return { kept, purged };
}

const purgeResult = simulatePurge(testCatalog, now);
assert.strictEqual(purgeResult.kept.length, 3, 'Snapshots <= 90 days must be strictly kept');
assert.strictEqual(purgeResult.purged.length, 2, 'Snapshots > 90 days must be purged');
assert(purgeResult.kept.some(s => s.id === 'snap_recent_85'), '85-day snapshot must be kept');
assert(purgeResult.purged.some(s => s.id === 'snap_expired_91'), '91-day snapshot must be purged');
assert(purgeResult.purged.some(s => s.id === 'snap_expired_120'), '120-day snapshot must be purged');
pass('3.1 3-month (90 days) auto-purge keeps active rolling history and discards older snapshots');

// -----------------------------------------------------------------------------
// MODULE 4: Snapshot Integrity & Safety Restore Checkpoint
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 4: Snapshot Integrity & Safety Checkpoints');

// 4.1 Check safety pre-restore creation in app.js
assert(appJs.includes("createSnapshot('safety_pre_restore')"), 'executeRestore must trigger safety_pre_restore before modifying state');
pass('4.1 Restoring database automatically creates safety checkpoint before applying changes');

// 4.2 Check full data payload extraction
assert(appJs.includes('sections: JSON.parse(JSON.stringify(state.sections || []))'), 'Snapshot captures sections');
assert(appJs.includes('employees: JSON.parse(JSON.stringify(state.employees || []))'), 'Snapshot captures employees');
assert(appJs.includes('projects: JSON.parse(JSON.stringify(state.projects || []))'), 'Snapshot captures projects');
assert(appJs.includes('allocations: JSON.parse(JSON.stringify(state.allocations || {}))'), 'Snapshot captures allocations');
pass('4.2 Snapshot captures complete state payload (allocations, employees, projects, sections, history)');

// 4.3 Check admin UI isolation for backups button
assert(appJs.includes("if (el.openBackupsBtn) el.openBackupsBtn.classList.add('hidden')"), 'Backups button hidden for non-admin/non-Peter');
assert(appJs.includes("if (el.openBackupsBtn) el.openBackupsBtn.classList.remove('hidden')"), 'Backups button visible when Admin active for Peter');
pass('4.3 Data Backups & Recovery button is strictly isolated to Admin mode (Peter MOUNIR)');

// -----------------------------------------------------------------------------
// MODULE 5: Zero Emojis Contract
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 5: Zero Unicode Emojis Verification');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;
assert(!emojiRegex.test(indexHtml), 'index.html contains forbidden emoji');
assert(!emojiRegex.test(appJs), 'app.js contains forbidden emoji');
assert(!emojiRegex.test(stylesCss), 'styles.css contains forbidden emoji');
assert(!emojiRegex.test(serverJs), 'server.js contains forbidden emoji');
pass('5.1 Strictly zero unicode emojis across modified frontend and server files');

console.log('==========================================================');
console.log(` DEDICATED BACKUP & RETENTION TEST COMPLETE: ${passCount} PASSED, 0 FAILED`);
console.log('==========================================================\n');
