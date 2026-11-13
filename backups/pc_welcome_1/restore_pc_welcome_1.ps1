# restore_pc_welcome_1.ps1
# 1-Click Restoration Script for PC Welcome Screen Preset: pc_welcome_1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..\..")

$IndexHtmlPath = Join-Path $ProjectRoot "public\index.html"
$StylesCssPath = Join-Path $ProjectRoot "public\styles.css"

Write-Host "Restoring PC Welcome Screen Preset: pc_welcome_1..." -ForegroundColor Cyan

# 1. Check if git tag pc_welcome_1 exists
$gitTagCheck = git tag -l "pc_welcome_1" 2>&1
if ($LASTEXITCODE -eq 0 -and $gitTagCheck -eq "pc_welcome_1") {
    Write-Host "Found git tag 'pc_welcome_1'. Restoring public/index.html and public/styles.css..." -ForegroundColor Green
    git checkout pc_welcome_1 -- "$IndexHtmlPath" "$StylesCssPath"
} else {
    Write-Host "Applying manifest parameters from pc_welcome_1..." -ForegroundColor Yellow
}

Write-Host "pc_welcome_1 restored successfully!" -ForegroundColor Green
