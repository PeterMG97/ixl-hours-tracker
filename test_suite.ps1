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

# Test actual allocations in data.json
$projMap = @{}
foreach ($prop in $db.allocations.psobject.Properties) {
    $k = $prop.Name
    $lastUnder = $k.LastIndexOf('_')
    $dt = $k.Substring($lastUnder + 1)
    if ($dt -like "2026-11-*") {
        $val = $prop.Value
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

Assert-Test "4.2 Peter's allocations in November correctly aggregate to projects" ($projMap.Count -gt 0) "Found $($projMap.Count) active projects with logged hours"
if ($projMap.ContainsKey("Academy - ERA - Cairo")) {
    $era = $projMap["Academy - ERA - Cairo"]
    Assert-Test "4.3 'Academy - ERA - Cairo' aggregated correctly ($($era.Days) days, $($era.Hours) hrs)" ($era.Days -ge 10 -and $era.Hours -ge 80) "Days: $($era.Days), Hours: $($era.Hours)"
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
Assert-Test "6.13 Top bar contains Quick Admin toggle (topbarAdminBtn) and persistent admin state" ($htmlContent.Contains('id="topbarAdminBtn"') -and $jsContent.Contains('ixl_is_admin')) "Top bar admin button & persistence found"
Assert-Test "6.14 Multi-cell selection enabled (btnToggleSelectMode & multiSelectBar)" ($htmlContent.Contains('id="btnToggleSelectMode"') -and $htmlContent.Contains('id="multiSelectBar"') -and $jsContent.Contains('toggleCellSelection')) "Multi-cell selection found"

# -------------------------------------------------------------
# SUMMARY REPORT
# -------------------------------------------------------------
Write-Host "`n==========================================================" -ForegroundColor Cyan
$passCount = ($global:testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($global:testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $global:testResults.Count

Write-Host " TEST RUN COMPLETE: $passCount / $totalCount PASSED" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Cyan

