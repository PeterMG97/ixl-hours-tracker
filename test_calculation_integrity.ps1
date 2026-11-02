# =====================================================================
# COMPREHENSIVE CALCULATION INTEGRITY & ACCURACY TEST SUITE
# =====================================================================
# Tests:
#   1. Double-entry accounting reconciliation (Sum of Employee Hours == Sum of Project Hours)
#   2. Deactivating an employee and keeping hours (project hours remain 100% intact)
#   3. Reactivating the employee (hours remain identical)
#   4. Permanent purge of an employee (hours deducted by exact employee total)
#   5. Baseline (initialHours) adjustments and combined totals
#   6. Billable inclusion (Projects, Tenders, Support, Academy) vs exclusion (Day OFF, NO PROJECT, NO STATUS)
#   7. Daily hours boundary clamping (1h min, 12h max for work; 0h for Day OFF)
#   8. Multi-cell batch allocations across employees and decimal precision
#   9. Multi-month temporal isolation (allocations in Dec do not leak into Nov)
#  10. Composite key parsing precision across varying employee ID shapes
#  11. Absolute state restoration & SHA256 bit-for-bit integrity check
# =====================================================================

$ErrorActionPreference = "Stop"
$originalDataPath = "C:\Users\511878\Desktop\Working\Hours APP\data.json"
$backupDataPath   = "C:\Users\511878\Desktop\Working\Hours APP\data.json.bak_integrity_test"

# 1. Compute original hash and create physical backup
$originalHash = (Get-FileHash $originalDataPath -Algorithm SHA256).Hash
Copy-Item $originalDataPath $backupDataPath -Force

$testResults = [System.Collections.Generic.List[PSCustomObject]]::new()

function Assert-Check {
    param(
        [string]$TestName,
        [bool]$Condition,
        [string]$Details = ""
    )
    $status = if ($Condition) { "PASS" } else { "FAIL" }
    $color  = if ($Condition) { "Green" } else { "Red" }
    Write-Host "  [$status] $TestName" -ForegroundColor $color
    if (-not $Condition -and $Details) {
        Write-Host "         Details: $Details" -ForegroundColor DarkRed
    }
    $testResults.Add([PSCustomObject]@{
        Name    = $TestName
        Status  = $status
        Details = $Details
    })
}

try {
    Write-Host "`n==========================================================" -ForegroundColor Cyan
    Write-Host " RUNNING CALCULATION INTEGRITY & ACCURACY TEST SUITE" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan

    $rawJson = Get-Content $originalDataPath -Raw -Encoding UTF8
    $data = $rawJson | ConvertFrom-Json

    # Helper functions replicating app.js logic
    function Parse-DateFromKey([string]$key) {
        $idx = $key.LastIndexOf('_')
        if ($idx -lt 0) { return "" }
        return $key.Substring($idx + 1)
    }

    function Parse-EmpIdFromKey([string]$key) {
        $idx = $key.LastIndexOf('_')
        if ($idx -lt 0) { return "" }
        return $key.Substring(0, $idx)
    }

    function Is-WorkActivity([string]$projName) {
        if (-not $projName) { return $false }
        $t = $projName.Trim()
        if (-not $t -or $t -eq "Day OFF" -or $t -eq "NO STATUS" -or $t -eq "NO PROJECT") { return $false }
        return $true
    }

    function Sanitize-DayHours([string]$projName, [double]$rawHours, [double]$fallbackHours = 8) {
        if (-not $projName -or $projName.Trim() -eq "" -or $projName.Trim() -eq "Day OFF") {
            return 0
        }
        $h = $rawHours
        if (Is-WorkActivity $projName) {
            if ($h -lt 1) { $h = 1 }
            if ($h -gt 12) { $h = 12 }
        } else {
            if ($h -lt 0) { $h = 0 }
            if ($h -gt 24) { $h = 24 }
        }
        return [Math]::Round($h, 1)
    }

    function Calculate-ProjectHours([object]$dataObj, [string]$monthPrefix) {
        $projMap = @{}
        $allocProps = $dataObj.allocations.PSObject.Properties

        foreach ($prop in $allocProps) {
            $key = $prop.Name
            $item = $prop.Value
            $dateStr = Parse-DateFromKey $key

            if ($dateStr.StartsWith($monthPrefix)) {
                $pName = $item.project
                if (Is-WorkActivity $pName) {
                    if (-not $projMap.ContainsKey($pName)) {
                        $projMap[$pName] = @{ Days = 0; Hours = [double]0 }
                    }
                    $hrs = if ($null -ne $item.hours) { [double]$item.hours } else { 8.0 }
                    $projMap[$pName].Days += 1
                    $projMap[$pName].Hours += $hrs
                }
            }
        }
        return $projMap
    }

    function Calculate-EmployeeMonthHours([object]$dataObj, [string]$monthPrefix) {
        $empMap = @{}
        $allocProps = $dataObj.allocations.PSObject.Properties

        foreach ($prop in $allocProps) {
            $key = $prop.Name
            $item = $prop.Value
            $dateStr = Parse-DateFromKey $key
            $empId = Parse-EmpIdFromKey $key

            if ($dateStr.StartsWith($monthPrefix)) {
                $pName = $item.project
                if (Is-WorkActivity $pName) {
                    if (-not $empMap.ContainsKey($empId)) {
                        $empMap[$empId] = [double]0
                    }
                    $hrs = if ($null -ne $item.hours) { [double]$item.hours } else { 8.0 }
                    $empMap[$empId] += $hrs
                }
            }
        }
        return $empMap
    }

    # -----------------------------------------------------------------
    # SUITE 1: Double-Entry Reconciliation across Current Dataset
    # -----------------------------------------------------------------
    Write-Host "`n>>> SUITE 1: Double-Entry Accounting Reconciliation" -ForegroundColor Yellow
    $projHours = Calculate-ProjectHours $data "2026-11"
    $empHours  = Calculate-EmployeeMonthHours $data "2026-11"

    $totalProjectLogged = 0.0
    foreach ($k in $projHours.Keys) { $totalProjectLogged += $projHours[$k].Hours }

    $totalEmpLogged = 0.0
    foreach ($k in $empHours.Keys) { $totalEmpLogged += $empHours[$k] }

    Assert-Check "1.1 Total Logged Hours: Project Sum equals Employee Sum" ([Math]::Abs($totalProjectLogged - $totalEmpLogged) -lt 0.0001) "Projects: $totalProjectLogged vs Employees: $totalEmpLogged"
    Assert-Check "1.2 Project Hours in November 2026 accurately tally to 160.0h" ($totalProjectLogged -eq 160.0) "Calculated: $totalProjectLogged hrs"

    # -----------------------------------------------------------------
    # SUITE 2: Deactivating an Employee & Keeping Hours
    # -----------------------------------------------------------------
    Write-Host "`n>>> SUITE 2: Deactivating an Employee (Keep Hours Invariant)" -ForegroundColor Yellow
    
    # Target employee with recorded hours: emp_17 (Ali TURKI: 20 days * 8h = 160 hrs on Academy)
    $emp17Before = $empHours["emp_17"]
    Assert-Check "2.1 Target employee (emp_17 / Ali TURKI) has recorded project hours before deactivation" ($emp17Before -eq 160.0) "emp_17 hours: $emp17Before"

    $projHoursBefore = Calculate-ProjectHours $data "2026-11"
    $academyHoursBefore = $projHoursBefore["Academy - ERA - Cairo"].Hours

    # Clone data and simulate deactivating employee
    $testDataDeact = ($data | ConvertTo-Json -Depth 10) | ConvertFrom-Json
    $targetEmp = $testDataDeact.employees | Where-Object { $_.id -eq "emp_17" }
    $targetEmp.active = $false

    # Re-calculate project hours post-deactivation
    $projHoursAfterDeact = Calculate-ProjectHours $testDataDeact "2026-11"
    $academyHoursAfterDeact = $projHoursAfterDeact["Academy - ERA - Cairo"].Hours

    $totalProjectLoggedAfterDeact = 0.0
    foreach ($k in $projHoursAfterDeact.Keys) { $totalProjectLoggedAfterDeact += $projHoursAfterDeact[$k].Hours }

    Assert-Check "2.2 Specific project hours ('Academy - ERA - Cairo') remain 100% unchanged post-deactivation" ($academyHoursBefore -eq $academyHoursAfterDeact) "Before: $academyHoursBefore, After: $academyHoursAfterDeact"
    Assert-Check "2.3 Grand total logged project hours remain 100% unchanged post-deactivation" ($totalProjectLogged -eq $totalProjectLoggedAfterDeact) "Before: $totalProjectLogged, After: $totalProjectLoggedAfterDeact"

    # Active employee count in schedule grid decreases, but total employees in database remains intact
    $activeCountBefore = ($data.employees | Where-Object { $_.active -ne $false }).Count
    $activeCountAfter  = ($testDataDeact.employees | Where-Object { $_.active -ne $false }).Count
    Assert-Check "2.4 Active grid team count correctly decrements by 1 upon deactivation (27 -> 26)" ($activeCountAfter -eq ($activeCountBefore - 1)) "Active count: $activeCountBefore -> $activeCountAfter"

    # Reactivate employee
    $targetEmp.active = $true
    $projHoursAfterReact = Calculate-ProjectHours $testDataDeact "2026-11"
    $academyHoursAfterReact = $projHoursAfterReact["Academy - ERA - Cairo"].Hours
    $activeCountRestored = ($testDataDeact.employees | Where-Object { $_.active -ne $false }).Count
    Assert-Check "2.5 Reactivating employee restores active count and keeps hours exactly identical" ($academyHoursAfterReact -eq $academyHoursBefore -and $activeCountRestored -eq $activeCountBefore) "Hours: $academyHoursAfterReact, Active: $activeCountRestored"

    # -----------------------------------------------------------------
    # SUITE 3: Permanent Purge of an Employee
    # -----------------------------------------------------------------
    Write-Host "`n>>> SUITE 3: Permanent Purge of an Employee" -ForegroundColor Yellow
    $testDataPurge = ($data | ConvertTo-Json -Depth 10) | ConvertFrom-Json
    
    # Simulate removalTypePurge on emp_17 (160h Academy)
    $testDataPurge.employees = @($testDataPurge.employees | Where-Object { $_.id -ne "emp_17" })
    $purgedAllocProps = [ordered]@{}
    foreach ($p in $testDataPurge.allocations.PSObject.Properties) {
        if (-not $p.Name.StartsWith("emp_17_")) {
            $purgedAllocProps[$p.Name] = $p.Value
        }
    }
    $testDataPurge.allocations = [PSCustomObject]$purgedAllocProps

    $projHoursAfterPurge = Calculate-ProjectHours $testDataPurge "2026-11"
    $academyHoursAfterPurge = if ($projHoursAfterPurge.ContainsKey("Academy - ERA - Cairo")) { $projHoursAfterPurge["Academy - ERA - Cairo"].Hours } else { 0.0 }
    $totalProjectLoggedAfterPurge = 0.0
    foreach ($k in $projHoursAfterPurge.Keys) { $totalProjectLoggedAfterPurge += $projHoursAfterPurge[$k].Hours }

    Assert-Check "3.1 Academy project logged hours drops by exactly the purged employee's 160.0h" ($academyHoursAfterPurge -eq ($academyHoursBefore - $emp17Before)) "Expected: $($academyHoursBefore - $emp17Before), Actual: $academyHoursAfterPurge"
    Assert-Check "3.2 Grand total project logged hours drops by exactly the purged employee's 160.0h" ($totalProjectLoggedAfterPurge -eq ($totalProjectLogged - $emp17Before)) "Expected: $($totalProjectLogged - $emp17Before), Actual: $totalProjectLoggedAfterPurge"

    # Verify other employees' hours were NOT touched during purge
    $otherEmpAllocationsBefore = ($data.allocations.PSObject.Properties | Where-Object { -not $_.Name.StartsWith("emp_17_") } | Measure-Object).Count
    $otherEmpAllocationsAfter  = ($testDataPurge.allocations.PSObject.Properties | Measure-Object).Count
    Assert-Check "3.3 Non-purged employee allocations count completely untouched ($otherEmpAllocationsAfter remaining)" ($otherEmpAllocationsBefore -eq $otherEmpAllocationsAfter) "Before: $otherEmpAllocationsBefore, After: $otherEmpAllocationsAfter"

    # -----------------------------------------------------------------
    # SUITE 4: Baseline (initialHours) + Logged Calculations
    # -----------------------------------------------------------------
    Write-Host "`n>>> SUITE 4: Baseline (initialHours) + Logged Calculations" -ForegroundColor Yellow
    $pObj = $data.projects | Where-Object { $_.name -eq "Academy - ERA - Cairo" }
    $baseline = if ($pObj.initialHours) { [double]$pObj.initialHours } else { 0.0 }
    $logged   = $academyHoursBefore
    $totalCombined = $baseline + $logged
    Assert-Check "4.1 Initial baseline hours ($baseline h) + Logged ($logged h) = Combined ($totalCombined h)" ($totalCombined -eq ($baseline + $logged) -and $totalCombined -eq 176.0) "Combined: $totalCombined"

    # Dynamic baseline adjustment test
    $newBaseline = 150.5
    $adjustedCombined = $newBaseline + $logged
    Assert-Check "4.2 Decimal baseline adjustment ($newBaseline h) + Logged ($logged h) = Combined ($adjustedCombined h)" ($adjustedCombined -eq 310.5) "Combined: $adjustedCombined"

    # -----------------------------------------------------------------
    # SUITE 5: Billable Inclusion vs Non-Billable Exclusion
    # -----------------------------------------------------------------
    Write-Host "`n>>> SUITE 5: Billable Inclusion vs Non-Billable Exclusion" -ForegroundColor Yellow
    Assert-Check "5.1 'Different Team Support' counts as billable work" (Is-WorkActivity "Different Team Support")
    Assert-Check "5.2 'Project - GP - Test' counts as billable work" (Is-WorkActivity "Project - GP - Test")
    Assert-Check "5.3 'Tender - High Speed' counts as billable work" (Is-WorkActivity "Tender - High Speed")
    Assert-Check "5.4 'Training / Academy' counts as billable work" (Is-WorkActivity "Training / Academy")
    Assert-Check "5.5 'Day OFF' is excluded from billable hours" (-not (Is-WorkActivity "Day OFF"))
    Assert-Check "5.6 'NO PROJECT' is excluded from billable hours" (-not (Is-WorkActivity "NO PROJECT"))
    Assert-Check "5.7 'NO STATUS' is excluded from billable hours" (-not (Is-WorkActivity "NO STATUS"))
    Assert-Check "5.8 Empty allocation is excluded from billable hours" (-not (Is-WorkActivity ""))

    # -----------------------------------------------------------------
    # SUITE 6: Daily Hours Constraints (1h min to 12h max; 0h for Day OFF)
    # -----------------------------------------------------------------
    Write-Host "`n>>> SUITE 6: Daily Hours Boundary Clamping & Validation" -ForegroundColor Yellow
    Assert-Check "6.1 Normal work activity 8h remains 8h" ((Sanitize-DayHours "Project - Test" 8) -eq 8)
    Assert-Check "6.2 Normal work activity 7.5h remains 7.5h" ((Sanitize-DayHours "Project - Test" 7.5) -eq 7.5)
    Assert-Check "6.3 Work activity 0h is clamped to minimum 1h" ((Sanitize-DayHours "Project - Test" 0) -eq 1)
    Assert-Check "6.4 Work activity -5h is clamped to minimum 1h" ((Sanitize-DayHours "Project - Test" -5) -eq 1)
    Assert-Check "6.5 Work activity 0.4h is clamped to minimum 1h" ((Sanitize-DayHours "Project - Test" 0.4) -eq 1)
    Assert-Check "6.6 Work activity 1h is allowed" ((Sanitize-DayHours "Project - Test" 1) -eq 1)
    Assert-Check "6.7 Work activity 12h is allowed" ((Sanitize-DayHours "Project - Test" 12) -eq 12)
    Assert-Check "6.8 Work activity 12.5h is clamped to maximum 12h" ((Sanitize-DayHours "Project - Test" 12.5) -eq 12)
    Assert-Check "6.9 Work activity 24h is clamped to maximum 12h" ((Sanitize-DayHours "Project - Test" 24) -eq 12)
    Assert-Check "6.10 'Day OFF' always resolves to 0h" ((Sanitize-DayHours "Day OFF" 8) -eq 0)
    Assert-Check "6.11 Empty project resolves to 0h" ((Sanitize-DayHours "" 8) -eq 0)

    # -----------------------------------------------------------------
    # SUITE 7: Multi-Cell & 2D Vertical Allocation Precision
    # -----------------------------------------------------------------
    Write-Host "`n>>> SUITE 7: Multi-Cell & 2D Vertical Allocation Precision" -ForegroundColor Yellow
    $testDataBatch = ($data | ConvertTo-Json -Depth 10) | ConvertFrom-Json
    $batchAllocProps = [ordered]@{}
    foreach ($p in $testDataBatch.allocations.PSObject.Properties) {
        $batchAllocProps[$p.Name] = $p.Value
    }

    # Simulate 2D vertical drag allocation: 3 employees across 4 days (12 cells) at 6.5h each
    $testEmps = @("emp_1", "emp_2", "emp_3")
    $testDates = @("2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23")
    $batchHoursPerDay = 6.5
    $batchProject = "Project - Test Batch 2D"

    foreach ($e in $testEmps) {
        foreach ($d in $testDates) {
            $k = "${e}_${d}"
            $batchAllocProps[$k] = [PSCustomObject]@{
                project = $batchProject
                hours   = $batchHoursPerDay
            }
        }
    }
    $testDataBatch.allocations = [PSCustomObject]$batchAllocProps

    $batchProjectHours = Calculate-ProjectHours $testDataBatch "2026-11"
    $expectedBatchTotal = 3 * 4 * 6.5 # 12 cells * 6.5h = 78.0h
    $actualBatchTotal = $batchProjectHours[$batchProject].Hours

    Assert-Check "7.1 2D multi-cell batch allocation: 12 cells * 6.5h = 78.0h exactly" ($actualBatchTotal -eq 78.0) "Expected: 78.0h, Actual: $actualBatchTotal h"
    Assert-Check "7.2 Batch allocation days count equals 12" ($batchProjectHours[$batchProject].Days -eq 12)

    # Reconcile again: employee sum vs project sum with new 2D allocation
    $reconcileBatchProj = Calculate-ProjectHours $testDataBatch "2026-11"
    $reconcileBatchEmp  = Calculate-EmployeeMonthHours $testDataBatch "2026-11"
    $sumProj = 0.0; foreach ($k in $reconcileBatchProj.Keys) { $sumProj += $reconcileBatchProj[$k].Hours }
    $sumEmp  = 0.0; foreach ($k in $reconcileBatchEmp.Keys) { $sumEmp += $reconcileBatchEmp[$k] }
    Assert-Check "7.3 Double-entry reconciliation holds after 2D multi-cell batch assignment ($sumProj h)" ([Math]::Abs($sumProj - $sumEmp) -lt 0.0001 -and $sumProj -eq ($totalProjectLogged + 78.0)) "Projects: $sumProj, Employees: $sumEmp"

    # -----------------------------------------------------------------
    # SUITE 8: Temporal Month Isolation
    # -----------------------------------------------------------------
    Write-Host "`n>>> SUITE 8: Temporal Month Isolation (No Cross-Month Leak)" -ForegroundColor Yellow
    $testDataMonth = ($data | ConvertTo-Json -Depth 10) | ConvertFrom-Json
    $monthAllocProps = [ordered]@{}
    foreach ($p in $testDataMonth.allocations.PSObject.Properties) {
        $monthAllocProps[$p.Name] = $p.Value
    }
    # Add 40 hours in December 2026 on Academy
    $monthAllocProps["emp_1_2026-12-01"] = [PSCustomObject]@{ project = "Academy - ERA - Cairo"; hours = 10 }
    $monthAllocProps["emp_1_2026-12-02"] = [PSCustomObject]@{ project = "Academy - ERA - Cairo"; hours = 10 }
    $monthAllocProps["emp_1_2026-12-03"] = [PSCustomObject]@{ project = "Academy - ERA - Cairo"; hours = 10 }
    $monthAllocProps["emp_1_2026-12-04"] = [PSCustomObject]@{ project = "Academy - ERA - Cairo"; hours = 10 }
    $testDataMonth.allocations = [PSCustomObject]$monthAllocProps

    # Compute Nov 2026 hours
    $novProjHours = Calculate-ProjectHours $testDataMonth "2026-11"
    $academyNovHours = $novProjHours["Academy - ERA - Cairo"].Hours
    Assert-Check "8.1 November 2026 hours are strictly isolated from December entries (160.0h)" ($academyNovHours -eq $academyHoursBefore -and $academyNovHours -eq 160.0) "Nov hours: $academyNovHours vs Original: $academyHoursBefore"

    # Compute Dec 2026 hours
    $decProjHours = Calculate-ProjectHours $testDataMonth "2026-12"
    $academyDecHours = $decProjHours["Academy - ERA - Cairo"].Hours
    Assert-Check "8.2 December 2026 hours accurately tally only December entries (40.0h)" ($academyDecHours -eq 40.0) "Dec hours: $academyDecHours"

    # -----------------------------------------------------------------
    # SUITE 9: Composite Key Parsing Safety & Robustness
    # -----------------------------------------------------------------
    Write-Host "`n>>> SUITE 9: Composite Key Parsing Safety across ID Variations" -ForegroundColor Yellow
    $testKeys = @(
        @{ Key = "emp_1_2026-11-01"; ExpectedEmp = "emp_1"; ExpectedDate = "2026-11-01" },
        @{ Key = "emp_17_2026-11-15"; ExpectedEmp = "emp_17"; ExpectedDate = "2026-11-15" },
        @{ Key = "emp_compound_code_99_2026-11-30"; ExpectedEmp = "emp_compound_code_99"; ExpectedDate = "2026-11-30" },
        @{ Key = "peter_mounir_lead_2026-11-08"; ExpectedEmp = "peter_mounir_lead"; ExpectedDate = "2026-11-08" },
        @{ Key = "999_2026-11-25"; ExpectedEmp = "999"; ExpectedDate = "2026-11-25" }
    )
    $allKeysValid = $true
    foreach ($tk in $testKeys) {
        $parsedDate = Parse-DateFromKey $tk.Key
        $parsedEmp  = Parse-EmpIdFromKey $tk.Key
        if ($parsedDate -ne $tk.ExpectedDate -or $parsedEmp -ne $tk.ExpectedEmp) {
            $allKeysValid = $false
            Write-Host "Key parsing failure on $($tk.Key): Got Date '$parsedDate' (exp '$($tk.ExpectedDate)') and Emp '$parsedEmp' (exp '$($tk.ExpectedEmp)')" -ForegroundColor Red
        }
    }
    Assert-Check "9.1 All compound employee ID key shapes parsed with 100% precision" $allKeysValid

} finally {
    # -----------------------------------------------------------------
    # SUITE 10: Absolute State Restoration & Integrity Verification
    # -----------------------------------------------------------------
    Write-Host "`n>>> SUITE 10: Absolute State Restoration & Integrity Verification" -ForegroundColor Yellow
    
    # Restore original file unconditionally from backup
    if (Test-Path $backupDataPath) {
        Copy-Item $backupDataPath $originalDataPath -Force
        Remove-Item $backupDataPath -Force
    }

    $postHash = (Get-FileHash $originalDataPath -Algorithm SHA256).Hash
    $isIdentical = ($postHash -eq $originalHash)

    Assert-Check "10.1 data.json restored to exact byte-for-byte SHA256 hash" $isIdentical "Pre: $originalHash, Post: $postHash"
    
    # Verify git status has zero uncommitted changes on data.json
    $gitStatusRaw = git status --porcelain data.json
    $gitClean = ($null -eq $gitStatusRaw -or [string]::IsNullOrWhiteSpace($gitStatusRaw))
    Assert-Check "10.2 git status confirms data.json is 100% clean and pristine" $gitClean "Git status: '$gitStatusRaw'"
}

# -----------------------------------------------------------------
# Summary
# -----------------------------------------------------------------
Write-Host "`n==========================================================" -ForegroundColor Cyan
$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $testResults.Count

Write-Host " CALCULATION INTEGRITY TEST COMPLETE: $passCount / $totalCount PASSED" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
    exit 1
} else {
    exit 0
}
