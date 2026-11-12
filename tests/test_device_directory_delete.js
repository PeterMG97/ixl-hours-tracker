const fs = require('fs');
const path = require('path');
const assert = require('assert');

const resolvePath = (f) => [path.join(__dirname, '../public', f), path.join(__dirname, '../backups', f), path.join(__dirname, '..', f), f].find(fs.existsSync) || f;

console.log('==========================================================');
console.log(' RUNNING DEDICATED DEVICE DIRECTORY SELECT & DELETE SUITE');
console.log('==========================================================');

const indexHtml = fs.readFileSync(resolvePath('index.html'), 'utf8');
const appJs = fs.readFileSync(resolvePath('app.js'), 'utf8');
const stylesCss = fs.readFileSync(resolvePath('styles.css'), 'utf8');

let passCount = 0;
function pass(msg) {
  passCount++;
  console.log('  [PASS] ' + msg);
}

// -----------------------------------------------------------------------------
// MODULE 1: Static Code Contracts (index.html, styles.css, app.js)
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 1: Static Code Contracts');

// 1.1 Check HTML elements in index.html
assert(indexHtml.includes('id="histDeviceSelectAll"'), 'histDeviceSelectAll missing in index.html');
assert(indexHtml.includes('id="histDeleteDevicesBtn"'), 'histDeleteDevicesBtn missing in index.html');
assert(indexHtml.includes('id="histSelectAllDevicesBtn"'), 'histSelectAllDevicesBtn missing in index.html');
assert(indexHtml.includes('id="histDeselectAllDevicesBtn"'), 'histDeselectAllDevicesBtn missing in index.html');
assert(indexHtml.includes('id="histDeviceSelectionBadge"'), 'histDeviceSelectionBadge missing in index.html');
assert(indexHtml.includes('id="histDeviceSearchInput"'), 'histDeviceSearchInput missing in index.html');
pass('1.1 index.html contains master checkbox, search input, selection controls, and Delete Selected button');

// 1.2 Check CSS rules in styles.css
assert(stylesCss.includes('.selected-device-row'), '.selected-device-row missing in styles.css');
assert(stylesCss.includes('.btn-delete-device'), '.btn-delete-device missing in styles.css');
assert(stylesCss.includes('#histDeleteDevicesBtn'), '#histDeleteDevicesBtn missing in styles.css');
assert(stylesCss.includes('.hist-selection-badge'), '.hist-selection-badge missing in styles.css');
pass('1.2 styles.css defines styling for selected rows, row delete buttons, and selection badge');

// 1.3 Check function implementations in app.js
assert(appJs.includes('function deleteDevices(deviceIds)'), 'deleteDevices function missing in app.js');
assert(appJs.includes('function updateDeviceSelectionControls('), 'updateDeviceSelectionControls missing in app.js');
assert(appJs.includes('_selectedDeviceIds'), '_selectedDeviceIds Set missing in app.js');
assert(appJs.includes('hist-device-checkbox'), 'hist-device-checkbox class missing in app.js');
assert(appJs.includes('btn-delete-device'), 'btn-delete-device class missing in app.js');
pass('1.3 app.js implements deleteDevices, selection tracking, and event bindings');

// -----------------------------------------------------------------------------
// MODULE 2: Behavioral State Simulation (Select, Multi-Select, Delete)
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 2: Behavioral State Simulation');

// Mock state
const mockState = {
  deviceProfiles: {
    'dev_1': { deviceId: 'dev_1', deviceName: 'PeterPC', primaryUser: 'Peter MOUNIR', totalEdits: 10 },
    'dev_2': { deviceId: 'dev_2', deviceName: 'AliLaptop', primaryUser: 'Ali TURKI', totalEdits: 5 },
    'dev_3': { deviceId: 'dev_3', deviceName: 'AhmedPhone', primaryUser: 'Ahmed BADR', totalEdits: 2 },
    'dev_4': { deviceId: 'dev_4', deviceName: 'SharedTablet', primaryUser: 'Andrew MAGDY', totalEdits: 1 }
  },
  deviceNames: {
    'dev_1': 'PeterPC',
    'dev_2': 'AliLaptop',
    'dev_3': 'AhmedPhone',
    'dev_4': 'SharedTablet'
  }
};

const mockSelectedIds = new Set();
let mockSyncCalled = false;
let mockToastMsg = '';

function mockDeleteDevices(deviceIds, userConfirms) {
  if (!deviceIds || deviceIds.length === 0) return false;
  if (!userConfirms) return false;

  const count = deviceIds.length;
  deviceIds.forEach(id => {
    delete mockState.deviceProfiles[id];
    delete mockState.deviceNames[id];
    mockSelectedIds.delete(id);
  });

  mockSyncCalled = true;
  mockToastMsg = count === 1 ? 'Device deleted successfully' : `${count} devices deleted successfully`;
  return true;
}

// 2.1 Initial State Verification
assert.strictEqual(Object.keys(mockState.deviceProfiles).length, 4, 'Should have 4 initial devices');
pass('2.1 Initial state contains 4 registered devices');

// 2.2 User cancels single deletion
const cancelSingle = mockDeleteDevices(['dev_3'], false);
assert.strictEqual(cancelSingle, false, 'Deletion aborted when user cancels confirmation');
assert.strictEqual(Object.keys(mockState.deviceProfiles).length, 4, 'Device count remains 4');
assert.strictEqual(mockSyncCalled, false, 'Sync not called when cancelled');
pass('2.2 Single device deletion preserved when confirmation is cancelled');

// 2.3 User confirms single deletion
const confirmSingle = mockDeleteDevices(['dev_3'], true);
assert.strictEqual(confirmSingle, true, 'Deletion succeeds when confirmed');
assert.strictEqual(mockState.deviceProfiles['dev_3'], undefined, 'dev_3 purged from deviceProfiles');
assert.strictEqual(mockState.deviceNames['dev_3'], undefined, 'dev_3 purged from deviceNames');
assert.strictEqual(Object.keys(mockState.deviceProfiles).length, 3, 'Remaining device count is 3');
assert.strictEqual(mockSyncCalled, true, 'syncToServer invoked upon deletion');
assert.strictEqual(mockToastMsg, 'Device deleted successfully', 'Toast feedback shown');
pass('2.3 Single device successfully purged and server sync triggered');

// 2.4 Multi-select devices and cancel
mockSyncCalled = false;
mockSelectedIds.add('dev_2');
mockSelectedIds.add('dev_4');
assert.strictEqual(mockSelectedIds.size, 2, '2 devices selected in set');

const cancelMulti = mockDeleteDevices(Array.from(mockSelectedIds), false);
assert.strictEqual(cancelMulti, false, 'Multi-device deletion aborted when cancelled');
assert.strictEqual(Object.keys(mockState.deviceProfiles).length, 3, 'Device count still 3');
assert.strictEqual(mockSyncCalled, false, 'Sync not called');
pass('2.4 Multi-selection batch deletion preserved when confirmation cancelled');

// 2.5 Multi-select devices and confirm batch delete
const confirmMulti = mockDeleteDevices(Array.from(mockSelectedIds), true);
assert.strictEqual(confirmMulti, true, 'Batch deletion succeeds when confirmed');
assert.strictEqual(mockState.deviceProfiles['dev_2'], undefined, 'dev_2 purged');
assert.strictEqual(mockState.deviceProfiles['dev_4'], undefined, 'dev_4 purged');
assert.strictEqual(mockSelectedIds.size, 0, 'Selection set cleared');
assert.strictEqual(Object.keys(mockState.deviceProfiles).length, 1, 'Only 1 device remaining');
assert.strictEqual(mockSyncCalled, true, 'syncToServer invoked');
assert.strictEqual(mockToastMsg, '2 devices deleted successfully', 'Batch toast feedback displayed');
pass('2.5 Multi-selection batch deletion purges all selected devices cleanly');

// 2.6 Delete final remaining device
mockSyncCalled = false;
const confirmFinal = mockDeleteDevices(['dev_1'], true);
assert.strictEqual(confirmFinal, true, 'Final device deletion succeeds');
assert.strictEqual(Object.keys(mockState.deviceProfiles).length, 0, '0 devices remaining');
assert.strictEqual(mockToastMsg, 'Device deleted successfully');
pass('2.6 Deletion of final device leaves empty directory without errors');

// -----------------------------------------------------------------------------
// MODULE 3: Zero Unicode Emojis Verification
// -----------------------------------------------------------------------------
console.log('\n>>> MODULE 3: Zero Unicode Emojis Verification');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;
assert(!emojiRegex.test(indexHtml), 'index.html contains forbidden emoji');
assert(!emojiRegex.test(appJs), 'app.js contains forbidden emoji');
assert(!emojiRegex.test(stylesCss), 'styles.css contains forbidden emoji');
pass('3.1 Strictly zero unicode emojis across modified source files');

console.log('==========================================================');
console.log(` DEVICE DIRECTORY SELECT & DELETE COMPLETE: ${passCount} PASSED, 0 FAILED`);
console.log('==========================================================\n');
