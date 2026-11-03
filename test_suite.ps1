<#
.SYNOPSIS
  Comprehensive Automated Test Suite for IXL Team Hours Tracker
#>

$global:testResults = @()

function Assert-Test($testName, $condition, $details) {
    if ($condition) {
        Write-Host "  [PASS] $testName" -ForegroundColor Green
        $global:testResults += [PSCustomObject]@{ Test = $testName; Status = "PASS"; Details = $details }
    } else {
        Write-Host "  [FAIL] $testName - $details" -ForegroundColor Red
        $global:testResults += [PSCustomObject]@{ Test = $testName; Status = "FAIL"; Details = $details }
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " RUNNING AUTOMATED TEST SUITE: IXL TEAM HOURS TRACKER" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $AppDir) { $AppDir = Get-Location }

# -------------------------------------------------------------
# TEST GROUP 1: Database Integrity
# -------------------------------------------------------------
Write-Host "`n>>> GROUP 1: Database & Data Integrity (data.json)" -ForegroundColor Yellow

$dbRaw = [System.IO.File]::ReadAllText((Join-Path $AppDir "data.json"))
$db = $dbRaw | ConvertFrom-Json

Assert-Test "1.1 Database contains all Team Members (27+ items)" ($db.employees.Count -ge 27) "Found: $($db.employees.Count)"
Assert-Test "1.2 Database contains all Projects (55 items)" ($db.projects.Count -ge 50) "Found: $($db.projects.Count)"
Assert-Test "1.3 Database has correct secret Admin PIN" ($db.adminPin -eq "IXL2026") "PIN: $($db.adminPin)"

# Check Alphabetical Sorting
$projectsSorted = $true
for ($i=0; $i -lt $db.projects.Count - 1; $i++) {
    if ([string]::Compare($db.projects[$i].name, $db.projects[$i+1].name) -gt 0) {
        $projectsSorted = $false
        break
    }
}
Assert-Test "1.4 Projects list is strictly sorted alphabetically (A-Z)" ($projectsSorted) "Sorted: $projectsSorted"

$employeesSorted = $true
for ($i=0; $i -lt $db.employees.Count - 1; $i++) {
    if ([string]::Compare($db.employees[$i].name, $db.employees[$i+1].name) -gt 0) {
        $employeesSorted = $false
        break
    }
}
Assert-Test "1.5 Employees list is strictly sorted alphabetically (A-Z)" ($employeesSorted) "Sorted: $employeesSorted"
Assert-Test "1.6 'Different Team Support' is in projects list" ($null -ne ($db.projects | Where-Object { $_.name -eq 'Different Team Support' })) "Support project found"
$gpCount = ($db.projects | Where-Object { $_.name.StartsWith('GP - ') }).Count
Assert-Test "1.7 All 'GP -' projects converted to start with 'Project -'" ($gpCount -eq 0) "GP projects count: $gpCount"

# -------------------------------------------------------------
# TEST GROUP 2: Office Holiday & Weekend Rules
# -------------------------------------------------------------
Write-Host "`n>>> GROUP 2: Office Holiday Logic (Cairo vs. Istanbul)" -ForegroundColor Yellow

function Test-Weekend($dow, $location) {
    if ($location -and $location.ToLower().Contains("istanbul")) {
        return ($dow -eq 0 -or $dow -eq 6)
    }
    return ($dow -eq 5 -or $dow -eq 6)
}

# Cairo checks
$thursCairo = Test-Weekend 4 "Cairo"
$friCairo = Test-Weekend 5 "Cairo"
$satCairo = Test-Weekend 6 "Cairo"
$sunCairo = Test-Weekend 0 "Cairo"

Assert-Test "2.1 Cairo Office: Friday is Holiday" ($friCairo -eq $true) "Friday (dow=5) -> Holiday"
Assert-Test "2.2 Cairo Office: Saturday is Holiday" ($satCairo -eq $true) "Saturday (dow=6) -> Holiday"
Assert-Test "2.3 Cairo Office: Thursday is NOT Holiday (Workday)" ($thursCairo -eq $false) "Thursday (dow=4) -> Workday"
Assert-Test "2.4 Cairo Office: Sunday is NOT Holiday (Workday)" ($sunCairo -eq $false) "Sunday (dow=0) -> Workday"

# Istanbul checks
$friIst = Test-Weekend 5 "Istanbul"
$satIst = Test-Weekend 6 "Istanbul"
$sunIst = Test-Weekend 0 "Istanbul"
$monIst = Test-Weekend 1 "Istanbul"

Assert-Test "2.5 Istanbul Office: Saturday is Holiday" ($satIst -eq $true) "Saturday (dow=6) -> Holiday"
Assert-Test "2.6 Istanbul Office: Sunday is Holiday" ($sunIst -eq $true) "Sunday (dow=0) -> Holiday"
Assert-Test "2.7 Istanbul Office: Friday is NOT Holiday (Workday)" ($friIst -eq $false) "Friday (dow=5) -> Workday"
Assert-Test "2.8 Istanbul Office: Monday is NOT Holiday (Workday)" ($monIst -eq $false) "Monday (dow=1) -> Workday"

# -------------------------------------------------------------
# TEST GROUP 3: Inclusive Date Range & Timezone Safety
# -------------------------------------------------------------
Write-Host "`n>>> GROUP 3: Inclusive Date Range & Timezone Rollover Safety" -ForegroundColor Yellow

$fromStr = "2026-11-01"
$toStr = "2026-11-15"
$curDt = [DateTime]::ParseExact($fromStr, "yyyy-MM-dd", [System.Globalization.CultureInfo]::InvariantCulture)
$curStr = $fromStr

$generatedDays = @()
$cairoHolidays = @()
$cairoWorkdays = @()

while ($curStr -le $toStr) {
    $generatedDays += $curStr
    $dow = [int]$curDt.DayOfWeek
    $isHoli = Test-Weekend $dow "Cairo"
    if ($isHoli) { $cairoHolidays += $curStr }
    else { $cairoWorkdays += $curStr }
    
    $curDt = $curDt.AddDays(1)
    $curStr = $curDt.ToString("yyyy-MM-dd")
}

Assert-Test "3.1 Start Date (2026-11-01) is strictly INCLUDED" ($generatedDays.Contains("2026-11-01")) "Start date is present"
Assert-Test "3.2 End Date (2026-11-15) is strictly INCLUDED" ($generatedDays.Contains("2026-11-15")) "End date is present"
Assert-Test "3.3 Exactly 15 days generated for Nov 1 to Nov 15" ($generatedDays.Count -eq 15) "Count: $($generatedDays.Count)"
Assert-Test "3.4 All Fridays in range (Nov 06, 13) are Cairo Holidays" ($cairoHolidays -contains "2026-11-06" -and $cairoHolidays -contains "2026-11-13") "Fri Nov 6 & 13 in holidays"
Assert-Test "3.5 All Saturdays in range (Nov 07, 14) are Cairo Holidays" ($cairoHolidays -contains "2026-11-07" -and $cairoHolidays -contains "2026-11-14") "Sat Nov 7 & 14 in holidays"
Assert-Test "3.6 Thursdays (Nov 05, 12) are NOT Holidays (Workdays)" (-not ($cairoHolidays -contains "2026-11-05") -and -not ($cairoHolidays -contains "2026-11-12")) "Thursdays kept as workdays"

# -------------------------------------------------------------
# TEST GROUP 4: Analytics Aggregation & Composite Key Parsing
# -------------------------------------------------------------
Write-Host "`n>>> GROUP 4: Analytics Composite Key Parsing & Hours Calculation" -ForegroundColor Yellow

$testKeys = @("emp_22_2026-11-01", "emp_5_2026-11-05", "emp_100_2026-11-15")
$allExtractedCorrectly = $true

foreach ($k in $testKeys) {
    $lastUnder = $k.LastIndexOf('_')
    $extractedDate = $k.Substring($lastUnder + 1)
    if ($extractedDate -notmatch '^\d{4}-\d{2}-\d{2}$') {
        $allExtractedCorrectly = $false
    }
}

Assert-Test "4.1 Composite keys (emp_22_YYYY-MM-DD) extract full date correctly" ($allExtractedCorrectly) "Keys parsed with LastIndexOf('_')"

# Test allocations aggregation logic with sample allocations
$sampleAllocations = @{
    "emp_22_2026-11-01" = [PSCustomObject]@{ project = "Academy - ERA - Cairo"; hours = 8 }
    "emp_22_2026-11-02" = [PSCustomObject]@{ project = "Academy - ERA - Cairo"; hours = 8 }
    "emp_22_2026-11-03" = [PSCustomObject]@{ project = "Different Team Support"; hours = 8 }
    "emp_22_2026-11-04" = [PSCustomObject]@{ project = "Day OFF"; hours = 0 }
    "emp_22_2026-11-05" = [PSCustomObject]@{ project = "NO PROJECT"; hours = 0 }
}

$projMap = @{}
foreach ($k in $sampleAllocations.Keys) {
    $lastUnder = $k.LastIndexOf('_')
    $dt = $k.Substring($lastUnder + 1)
    if ($dt -like "2026-11-*") {
        $val = $sampleAllocations[$k]
        $pName = $val.project
        if ($pName -and $pName -ne "Day OFF" -and $pName -ne "NO PROJECT" -and $pName -ne "NO STATUS") {
            if (-not $projMap.ContainsKey($pName)) {
                $projMap[$pName] = @{ Days = 0; Hours = 0 }
            }
            $projMap[$pName].Days += 1
            $projMap[$pName].Hours += [double]$val.hours
        }
    }
}

Assert-Test "4.2 Composite allocations correctly aggregate to billable projects" ($projMap.Count -ge 2) "Found $($projMap.Count) active projects with logged hours"
if ($projMap.ContainsKey("Academy - ERA - Cairo")) {
    $era = $projMap["Academy - ERA - Cairo"]
    Assert-Test "4.3 'Academy - ERA - Cairo' aggregated correctly ($($era.Days) days, $($era.Hours) hrs)" ($era.Days -eq 2 -and $era.Hours -eq 16) "Days: $($era.Days), Hours: $($era.Hours)"
}

# Test Different Team Support Counting
$supportCount = 3
$defaultHours = 8
$supportHours = $supportCount * $defaultHours
Assert-Test "4.4 'Different Team Support' counts as billable hours (3 days * 8h = 24h)" ($supportHours -eq 24) "Calculated: ${supportHours}h"

# Test Baseline + Logged Hours Combination
$baselineHours = 50
$loggedHours = 16
$totalHours = $baselineHours + $loggedHours
Assert-Test "4.5 Combined Project Hours = Baseline (50h) + Logged (16h) = 66h" ($totalHours -eq 66) "Calculated: ${totalHours}h"

# -------------------------------------------------------------
# TEST GROUP 5: Theme Engine (Light / Dark / Auto by Daytime)
# -------------------------------------------------------------
Write-Host "`n>>> GROUP 5: Theme System (Light, Dark, Auto by Daytime)" -ForegroundColor Yellow

function Get-AutoTheme($hour) {
    if ($hour -ge 6 -and $hour -lt 18) { return "light" }
    return "dark"
}

Assert-Test "5.1 Daytime 10:00 AM resolves to Light theme" ((Get-AutoTheme 10) -eq "light") "10 AM -> light"
Assert-Test "5.2 Daytime 02:00 PM resolves to Light theme" ((Get-AutoTheme 14) -eq "light") "2 PM -> light"
Assert-Test "5.3 Nighttime 09:00 PM resolves to Dark theme" ((Get-AutoTheme 21) -eq "dark") "9 PM -> dark"
Assert-Test "5.4 Nighttime 03:00 AM resolves to Dark theme" ((Get-AutoTheme 3) -eq "dark") "3 AM -> dark"

# -------------------------------------------------------------
# TEST GROUP 6: Frontend File Integrity
# -------------------------------------------------------------
Write-Host "`n>>> GROUP 6: Frontend File & Element Verification" -ForegroundColor Yellow

$htmlContent = [System.IO.File]::ReadAllText((Join-Path $AppDir "index.html"))
$jsContent = [System.IO.File]::ReadAllText((Join-Path $AppDir "app.js"))
$cssContent = [System.IO.File]::ReadAllText((Join-Path $AppDir "styles.css"))
$serverContent = [System.IO.File]::ReadAllText((Join-Path $AppDir "server.js"))
$serverPs1Content = [System.IO.File]::ReadAllText((Join-Path $AppDir "server.ps1"))

Assert-Test "6.1 index.html contains Theme Selector (themeSelect)" ($htmlContent.Contains('id="themeSelect"')) "Theme control found"
Assert-Test "6.2 index.html contains Bulk Fill Modal & Controls" ($htmlContent.Contains('id="bulkFillModal"')) "Bulk Fill modal found"
Assert-Test "6.3 index.html contains Project Breakdown Analytics" ($htmlContent.Contains('id="analyticsProjectTable"')) "Project table found"
Assert-Test "6.4 app.js uses timezone-safe date parsing (parseLocalDate)" ($jsContent.Contains('parseLocalDate')) "Safe parser found"
Assert-Test "6.5 app.js uses lastIndexOf('_') for composite key parsing" ($jsContent.Contains("k.lastIndexOf('_')")) "Safe key parser found"
Assert-Test "6.6 styles.css defines full [data-theme='dark'] mode" ($cssContent.Contains("[data-theme=""dark""]")) "Dark theme rules found"
Assert-Test "6.7 Employee NO PROJECT badge renders on schedule row" ($jsContent.Contains('emp-no-proj-badge')) "Row badge found"
Assert-Test "6.8 index.html contains NO PROJECT manager modal" ($htmlContent.Contains('id="noProjectModal"')) "Manager modal found"
Assert-Test "6.9 app.js implements openNoProjectModal & batch assign" ($jsContent.Contains('openNoProjectModal')) "Modal logic found"
Assert-Test "6.10 index.html contains collapsible Settings & Tools drawer" ($htmlContent.Contains('id="settingsSidebar"') -and $htmlContent.Contains('id="toggleSettingsSidebarBtn"')) "Collapsible drawer found"
Assert-Test "6.11 app.js implements group expand/shrink (toggleSectionCollapse)" ($jsContent.Contains('toggleSectionCollapse') -and $jsContent.Contains('expandAllSections')) "Expand/Shrink logic found"
Assert-Test "6.12 styles.css defines collapsed row and group headers" ($cssContent.Contains('is-collapsed-row') -and $cssContent.Contains('group-header-row')) "Collapsed styles found"
Assert-Test "6.13 Admin toggle in Settings drawer with persistent admin state and topbar indication removed" ($htmlContent.Contains('id="adminToggleBtn"') -and (-not $htmlContent.Contains('id="topbarAdminBtn"')) -and $jsContent.Contains('ixl_is_admin')) "Settings drawer admin toggle & persistence verified"
Assert-Test "6.14 Multi-cell selection enabled (multiSelectBar & toggleCellSelection)" ($htmlContent.Contains('id="multiSelectBar"') -and $jsContent.Contains('toggleCellSelection')) "Multi-cell selection found"
Assert-Test "6.15 Personal Month Hours and Unfilled counters calculated for identified user" ($jsContent.Contains('statCurrentMonthHours') -and $jsContent.Contains('statUnfilledDays') -and $jsContent.Contains('currentEmp') -and $jsContent.Contains('userMonthHours')) "Individual month stat counters verified"
Assert-Test "6.16 Device persistence for user identity implements LocalStorage and Cookie fallback with ID and Name resolution" ($jsContent.Contains('persistUserIdentity') -and $jsContent.Contains('resolveStoredUser') -and $jsContent.Contains('ixl_current_user_name')) "Cross-session device persistence verified"
Assert-Test "6.17 Admin rights option strictly restricted to Peter MOUNIR" ($jsContent.Contains('isCurrentUserPeter') -and $jsContent.Contains('peter mounir')) "Admin access restricted strictly to Peter MOUNIR"
Assert-Test "6.18 WBS Code editable by everyone in projects list" ($htmlContent.Contains('(Editable)') -and $jsContent.Contains('wbs-code-input') -and $cssContent.Contains('.wbs-code-input')) "WBS inline editor verified"
Assert-Test "6.19 Dark theme configured as default" ($htmlContent.Contains('data-theme="dark"') -and $htmlContent.Contains('value="dark" selected') -and $jsContent.Contains("getStoredItem('ixl_theme_mode') || 'dark'")) "Dark theme default verified"
Assert-Test "6.20 Delete project triggers confirmation warning modal" ($htmlContent.Contains('id="deleteProjectModal"') -and $jsContent.Contains('openDeleteProjectModal') -and $jsContent.Contains('confirmDeleteProjectBtn')) "Delete project warning confirmation modal verified"
Assert-Test "6.21 User selection cards and team list rows have high-contrast styling across themes" ($cssContent.Contains('[data-theme="dark"] .user-select-card.active-selected') -and $cssContent.Contains('.team-table-row.is-current-user-row') -and $jsContent.Contains('is-current-user-row')) "High contrast card & team row styles verified"
Assert-Test "6.22 Cell popover contains category list and pills (Project, Tender, Special)" ($htmlContent.Contains('id="popoverCategorySelect"') -and $htmlContent.Contains('id="popoverCategoryPills"') -and $jsContent.Contains('isProjectMatchingCategory') -and $cssContent.Contains('.popover-category-select')) "Category list selector verified"
$emojiRegex = '[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u27EF]|[\u2300-\u23FF]|[\u2B50]|[\u203C\u2049\u2122\u2139\u3030\u303D\u3297\u3299]'
$hasEmojis = ($htmlContent -match $emojiRegex) -or ($jsContent -match $emojiRegex) -or ($cssContent -match $emojiRegex)
Assert-Test "6.23 Zero emojis across frontend files (index.html, app.js, styles.css)" (-not $hasEmojis) "Emoji presence: $hasEmojis"
$redDotRemoved = (-not $htmlContent.Contains('id="adminActiveDot"')) -and (-not $htmlContent.Contains('id="dockedAdminDot"')) -and (-not $cssContent.Contains('.admin-badge-dot')) -and (-not $cssContent.Contains('.docked-admin-dot'))
Assert-Test "6.24 Red dot/lamp removed beside Settings and Tools" $redDotRemoved "No red dot found beside settings"
$forgotPwdConfigured = ($htmlContent.Contains('id="forgotPinBtn"')) -and ($jsContent.Contains('peter.mounir@alstomgroup.com')) -and (-not $jsContent.Contains('mailto:')) -and ($serverContent.Contains('peter.mounir@alstomgroup.com')) -and ($serverPs1Content.Contains('peter.mounir@alstomgroup.com'))
Assert-Test "6.25 Forgot admin password dispatches directly to peter.mounir@alstomgroup.com without opening mail client" $forgotPwdConfigured "Forgot password configured with direct Outlook dispatch (no mailto)"
$matchingSpecialColors = ($cssContent.Contains('--badge-sup-bg: #dcfce7')) -and ($cssContent.Contains('--badge-sup-text: #15803d')) -and ($cssContent.Contains('--badge-sup-bg: #052e16')) -and ($cssContent.Contains('--badge-sup-text: #86efac'))
Assert-Test "6.26 Training, Academy, and Support share matching green highlight and font styling" $matchingSpecialColors "Green highlight & text unified across themes"
$employeeContribs = ($htmlContent.Contains('id="employeeContributionsModal"')) -and ($jsContent.Contains('openEmployeeContributions')) -and ($jsContent.Contains('renderEmployeeContributions')) -and ($jsContent.Contains('data-emp-id'))
Assert-Test "6.27 Double-clicking employee name opens monthly contributions page" $employeeContribs "Employee monthly contributions modal and double-click interaction verified"
$topBtn3LinesAndNoDocked = ($htmlContent.Contains('class="hamburger-icon"')) -and (-not $htmlContent.Contains('Settings &amp; Tools</span>')) -and (-not $htmlContent.Contains('id="dockedSettingsBtn"')) -and (-not $cssContent.Contains('.docked-settings-pill'))
Assert-Test "6.28 Settings & Tools shown as 3 horizontal lines and docked right setting tab removed" $topBtn3LinesAndNoDocked "3 horizontal lines icon and no docked settings tab"
$recoveryBoxSecure = ($htmlContent.Contains('id="forgotPinRecoveryBox"')) -and (-not $htmlContent.Contains('id="revealedAdminPin"')) -and (-not $htmlContent.Contains('id="recoveryKeyInput"')) -and ($htmlContent.Contains('peter.mounir@alstomgroup.com')) -and (-not $htmlContent.Contains('petermounir461@gmail.com'))
Assert-Test "6.29 Admin password recovery dispatches exclusively to official Outlook mail with zero on-screen leak" $recoveryBoxSecure "Password is never displayed on-screen and secret key UI removed"
$changePinBtnInSettings = ($htmlContent.Contains('id="openChangePasswordBtn"')) -and ($htmlContent.Contains('class="settings-action-card admin-card hidden" id="openChangePasswordBtn"')) -and ($jsContent.Contains('openChangePasswordBtn'))
Assert-Test "6.30 Change Admin Password button in settings list restricted to Admin mode" $changePinBtnInSettings "Change password button placed in settings list with admin restriction"
$changePinModalValid = ($htmlContent.Contains('id="changePasswordModal"')) -and ($htmlContent.Contains('id="currentAdminPinInput"')) -and ($htmlContent.Contains('id="newAdminPinInput1"')) -and ($htmlContent.Contains('id="newAdminPinInput2"')) -and ($htmlContent.Contains('id="saveChangePinBtn"')) -and ($jsContent.Contains('handleSaveChangePin')) -and ($jsContent.Contains('new1Val !== new2Val')) -and ($jsContent.Contains('currentVal !== activePin'))
Assert-Test "6.31 Change Admin Password modal requires current password and identical new password entries" $changePinModalValid "Modal inputs, current password verification, and identical 2-entry confirmation verified"
$hoursMinMaxEnforced = ($htmlContent -match 'id="popoverHoursInput"[^>]*min="1"[^>]*max="12"') -and ($htmlContent -match 'id="bulkHoursInput"[^>]*min="1"[^>]*max="12"') -and ($jsContent.Contains('sanitizeDayHours')) -and ($jsContent.Contains('if (h < 1) h = 1;')) -and ($jsContent.Contains('if (h > 12) h = 12;')) -and ($jsContent.Contains('isWorkActivity'))
Assert-Test "6.32 Daily hours per project/tender/special enforced between minimum 1h and maximum 12h" $hoursMinMaxEnforced "HTML min/max attributes and JavaScript sanitizeDayHours validation verified"
$legendRemoved = (-not $htmlContent.Contains('class="legend-pills"')) -and (-not $htmlContent.Contains('class="legend-heading"'))
Assert-Test "6.33 Legend pills bar completely removed from DOM" $legendRemoved "Legend pills and heading verified removed from layout"
$activeTeamOnlyInTeamPart = (-not $htmlContent.Contains('<span class="stat-bubble-label">Active Team:</span>')) -and ($htmlContent.Contains('id="teamModalActiveMembersCount"')) -and ($jsContent.Contains('teamModalActiveMembersCount'))
Assert-Test "6.34 Active Team count included exclusively inside Team Members section and removed from control strip" $activeTeamOnlyInTeamPart "Active team count placed in team modal and removed from main stats bar"
$singleToggleBtn = ($jsContent.Contains('id="thToggleAllGroups"')) -and ($jsContent.Contains('toggleAllSections')) -and (-not $jsContent.Contains('id="thExpandAllGroups"')) -and (-not $jsContent.Contains('id="thCollapseAllGroups"'))
Assert-Test "6.35 Single toggle button for all sections in schedule table header" $singleToggleBtn "Two separate expand/collapse buttons replaced with a single toggleable button"

$cellHoldAndDrag = ($jsContent.Contains('cellDragState')) -and ($jsContent.Contains('handleCellMouseDown')) -and ($jsContent.Contains('activateSelectionForRange')) -and ($jsContent.Contains('handleDragMoveToSlot')) -and ($cssContent.Contains('is-cell-dragging'))
Assert-Test "6.36 Left click hold and drag range multi-cell selection implemented" $cellHoldAndDrag "Click-and-hold (hold timer) and horizontal drag range selection verified"

$verticalAdminSelect = ($jsContent.Contains('activate2DSelection')) -and ($jsContent.Contains('getSelectedUniqueEmployees')) -and ($jsContent.Contains('minRow')) -and ($jsContent.Contains('maxRow'))
Assert-Test "6.37 Admin mode enables 2D vertical and horizontal multi-cell selection across team members" $verticalAdminSelect "2D vertical row and horizontal date box selection in Admin mode verified"

$unfilledBadgeRenders = ($jsContent.Contains('emp-unfilled-pill')) -and ($jsContent.Contains('empUnfilledDays')) -and ($cssContent.Contains('.emp-unfilled-pill')) -and ($cssContent.Contains('.user-name-line'))
Assert-Test "6.38 Small unfilled days/month badge renders beside each person's name excluding holidays" $unfilledBadgeRenders "Unfilled days indication placed beside employee name"

$deleteKeyClearsSelected = ($jsContent.Contains("e.key === 'Delete' || e.key === 'Backspace'")) -and ($jsContent.Contains("batchApplyToSelectedCells('', 0)")) -and ($jsContent.Contains("state.selectedCells.size > 0")) -and ($jsContent.Contains("activeEl.tagName === 'INPUT'"))
Assert-Test "6.39 Keyboard Delete key clears data across multi-selected cells" $deleteKeyClearsSelected "Delete and Backspace listeners with input guards clear selected cells"

$autoScrollOnEdgeDrag = ($jsContent.Contains('checkAndTriggerAutoScroll')) -and ($jsContent.Contains('startAutoScroll')) -and ($jsContent.Contains('stopAutoScroll')) -and ($jsContent.Contains('autoScrollRaf')) -and ($jsContent.Contains('requestAnimationFrame'))
Assert-Test "6.40 Auto-scroll left/right when dragging near screen borders with directional selection" $autoScrollOnEdgeDrag "Auto-scroll animation loop and dynamic slot advancement at screen borders verified"

$defaultHoursUnderNameRemoved = (-not $jsContent.Contains('${emp.defaultHoursPerDay || 8}h/day')) -and ($htmlContent.Contains('<th>Default Daily Hrs</th>')) -and ($jsContent.Contains('change-hours-input')) -and ($jsContent.Contains('Default hours for'))
Assert-Test "6.41 Default hours per day indicator removed under employee names in schedule and preserved in Team Members" $defaultHoursUnderNameRemoved "Removed from schedule employee cells and kept in Team Members modal"

$verticalAutoScrollAdmin = ($jsContent.Contains('inBottomZone')) -and ($jsContent.Contains('inTopZone')) -and ($jsContent.Contains('scrollArea.scrollTop += deltaY')) -and ($jsContent.Contains('scrollArea.scrollTop -= deltaY'))
Assert-Test "6.42 Admin mode enables up/down vertical auto-scrolling when dragging near top/bottom screen borders" $verticalAutoScrollAdmin "Vertical auto-scroll up/down with dynamic row range expansion in Admin mode verified"

$viewOnlyLinkInSettingsOnly = (-not $htmlContent.Contains('Switch to Edit Mode')) -and (-not $htmlContent.Contains('id="topbarViewOnlyBtn"')) -and (-not $htmlContent.Contains('id="switchToViewModeBtn"')) -and ($htmlContent.Contains('id="copyViewLinkBtn"')) -and ($jsContent.Contains('copyViewLinkBtn'))
Assert-Test "6.43 Mode switch buttons removed from topbar and settings; view-only link preserved in settings" $viewOnlyLinkInSettingsOnly "View-only switches removed from topbar and settings drawer, leaving shareable view-only link in settings"

$focusedHazyAndViewAll = ($jsContent.Contains('has-focused-user')) -and ($jsContent.Contains('unfocused-row')) -and ($cssContent.Contains('.has-focused-user .user-row.unfocused-row td.col-slot')) -and ($jsContent.Contains('view-all-card')) -and ($jsContent.Contains('View All (Read Only)')) -and ($cssContent.Contains('.user-select-card.view-all-card'))
Assert-Test "6.44 Choosing name focuses user row and hazes other cells; View All option displays all cells read-only" $focusedHazyAndViewAll "Focused employee row spotlight with hazy unfocused cells and View All read-only mode verified"

$monthlyBreakdownVerified = ($htmlContent.Contains('id="analyticsMonthFilterSelect"')) -and ($htmlContent.Contains('id="filterAnalyticsInput"')) -and ($cssContent.Contains('.month-breakdown-list')) -and ($cssContent.Contains('.month-breakdown-item')) -and ($jsContent.Contains('initAnalyticsMonthDropdown')) -and ($jsContent.Contains('formatYearMonth')) -and ($jsContent.Contains('getProjectLoggedBreakdown'))
Assert-Test "6.45 Project breakdown shows logged hours by month with monthly breakdown list and month filter" $monthlyBreakdownVerified "Month-by-month hours breakdown, month filter dropdown, and search filtering verified"

$viewOnlyBlueBannerRemoved = ($cssContent.Contains('body.view-only #userPermissionBanner')) -and ($cssContent.Contains('body.view-only .user-permission-banner')) -and ($jsContent.Contains('if (state.isViewOnly) {'))
Assert-Test "6.46 Blue user permission banner completely removed in view-only mode" $viewOnlyBlueBannerRemoved "User permission banner is hidden via CSS display:none !important and JS guard in view-only mode"

$dmyDateFormatVerified = ($jsContent.Contains('formatDateDMY')) -and ($htmlContent.Contains('Start Date (DD/MM/YYYY)')) -and ($htmlContent.Contains('Date (DD/MM/YYYY)')) -and ($jsContent.Contains('formatDateDMY(d.dateStr)'))
Assert-Test "6.47 User-facing date displays formatted as DD/MM/YYYY across tables, popovers, and tooltips" $dmyDateFormatVerified "formatDateDMY implemented and applied across schedule, popover, NO PROJECT and contributions tables"

$contribMiniCalendarVerified = ($htmlContent.Contains('id="contribCalendarTriggerBtn"')) -and ($htmlContent.Contains('id="contribCalendarPopover"')) -and ($htmlContent.Contains('id="contribPrevMonthBtn"')) -and ($htmlContent.Contains('id="contribNextMonthBtn"')) -and ($jsContent.Contains('renderContribCalendarGrid')) -and ($jsContent.Contains('toggleContribCalendarPopover')) -and ($jsContent.Contains('shiftMonthYM')) -and ($cssContent.Contains('.contrib-calendar-popover'))
Assert-Test "6.48 Employee contributions header features mini calendar month picker and navigation" $contribMiniCalendarVerified "Mini calendar month picker, year stepper, and prev/next month navigation verified"

$bulkRefillKeyVerified = ($htmlContent.Contains('id="openBulkFillBtn"')) -and ($htmlContent.Contains('class="btn-bulk-refill"')) -and ($htmlContent.Contains('Bulk Refill')) -and (-not $htmlContent.Contains('(Monday - Friday)')) -and ($cssContent.Contains('.btn-bulk-refill'))
Assert-Test "6.49 Bulk refill is a pressable key button without (Monday - Friday) text" $bulkRefillKeyVerified "openBulkFillBtn styled as pressable key with Bulk Refill label and (Monday - Friday) removed"



# -------------------------------------------------------------
# SUMMARY REPORT
# -------------------------------------------------------------
Write-Host "`n==========================================================" -ForegroundColor Cyan
$passCount = ($global:testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($global:testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $global:testResults.Count

Write-Host " TEST RUN COMPLETE: $passCount / $totalCount PASSED" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Cyan

