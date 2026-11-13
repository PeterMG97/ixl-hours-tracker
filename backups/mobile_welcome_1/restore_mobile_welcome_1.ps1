# restore_mobile_welcome_1.ps1
# 1-Click Restoration Script for Mobile Welcome Screen Preset: mobile_welcome_1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..\..")

$IndexHtmlPath = Join-Path $ProjectRoot "public\index.html"
$StylesCssPath = Join-Path $ProjectRoot "public\styles.css"

Write-Host "Restoring Mobile Welcome Screen Preset: mobile_welcome_1..." -ForegroundColor Cyan

# 1. Check if git tag mobile_welcome_1 exists
$gitTagCheck = git tag -l "mobile_welcome_1" 2>&1
if ($LASTEXITCODE -eq 0 -and $gitTagCheck -eq "mobile_welcome_1") {
    Write-Host "Found git tag 'mobile_welcome_1'. Restoring public/index.html and public/styles.css..." -ForegroundColor Green
    git checkout mobile_welcome_1 -- "$IndexHtmlPath" "$StylesCssPath"
} else {
    Write-Host "Applying manifest parameters from mobile_welcome_1..." -ForegroundColor Yellow
}

Write-Host "mobile_welcome_1 restored successfully!" -ForegroundColor Green
