<#
.SYNOPSIS
  IXL Team Hours Tracker - Native Windows PowerShell Web Server
  Requires zero installation. Runs natively on any Windows PC.
#>

param(
    [int]$Port = 8080
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = Get-Location }

$DataFilePath = Join-Path $ScriptDir "data.json"
if (-not (Test-Path $DataFilePath)) {
    $InitialPath = Join-Path $ScriptDir "initial_data.json"
    if (Test-Path $InitialPath) {
        Copy-Item -Path $InitialPath -Destination $DataFilePath
    }
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "[ERROR] Failed to bind to port $Port : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Trying port 8081..." -ForegroundColor Yellow
    $Port = 8081
    $listener = New-Object System.Net.HttpListener
    $prefix = "http://localhost:$Port/"
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " IXL Team Hours Tracker Web App is RUNNING!" -ForegroundColor Green
Write-Host " URL (Edit Mode):      http://localhost:$Port/" -ForegroundColor Yellow
Write-Host " URL (View-Only Mode): http://localhost:$Port/?mode=view" -ForegroundColor Yellow
Write-Host " Data file:            $DataFilePath" -ForegroundColor Gray
Write-Host " Press Ctrl+C in this terminal window to stop the server." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# Content Types Map
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Add CORS headers
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $path = $request.Url.AbsolutePath
        $method = $request.HttpMethod

        # API Endpoints
        if ($path -eq "/api/ping" -and $method -eq "GET") {
            $json = '{"status":"ok","timestamp":"' + (Get-Date).ToString("o") + '"}'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        if ($path -eq "/api/data" -and $method -eq "GET") {
            if (Test-Path $DataFilePath) {
                $bytes = [System.IO.File]::ReadAllBytes($DataFilePath)
                # Strip UTF-8 BOM if present
                if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
                    $bytes = $bytes[3..($bytes.Length - 1)]
                }
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
            }
            $response.Close()
            continue
        }

        if ($path -eq "/api/save" -and $method -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Close()

            if ($body -and $body.Trim().Length -gt 10) {
                # Create backup
                if (Test-Path $DataFilePath) {
                    $backupPath = Join-Path $ScriptDir "data.backup.json"
                    Copy-Item -Path $DataFilePath -Destination $backupPath -Force
                }
                $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
                [System.IO.File]::WriteAllText($DataFilePath, $body, $utf8NoBom)
                $resJson = '{"status":"ok","message":"Saved successfully"}'
            } else {
                $resJson = '{"status":"error","message":"Empty payload"}'
            }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        if ($path -eq "/api/forgot-password" -and $method -eq "POST") {
            $pin = "IXL2026"
            if (Test-Path $DataFilePath) {
                try {
                    $raw = [System.IO.File]::ReadAllText($DataFilePath, [System.Text.Encoding]::UTF8)
                    if ($raw.Length -gt 0 -and $raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
                    $jsonData = $raw | ConvertFrom-Json
                    if ($jsonData.adminPin) { $pin = $jsonData.adminPin }
                } catch {}
            }

            $sentDirectly = $false
            # Background Direct Dispatch via local Outlook in background without UI
            try {
                $outlook = New-Object -ComObject Outlook.Application -ErrorAction Stop
                $mail = $outlook.CreateItem(0)
                $mail.To = "peter.mounir@alstomgroup.com"
                $mail.CC = "petermounir461@gmail.com"
                $mail.Subject = "IXL Tracker - Admin Password Recovery"
                $mail.Body = "Hello Peter,`r`n`r`nYour Admin Password for IXL Team Hours Tracker is: $pin`r`n`r`nAuthorized Admin: Peter MOUNIR`r`nSystem: IXL Team Hours Tracker`r`nTimestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                $mail.Send()
                $sentDirectly = $true
                Write-Host "[EMAIL] Directly dispatched admin password to peter.mounir@alstomgroup.com via Outlook background process." -ForegroundColor Green
            } catch {
                Write-Host "[EMAIL] Outlook background dispatch notice: $($_.Exception.Message)" -ForegroundColor Yellow
            }

            # Direct Web Dispatch fallback if Outlook COM unavailable
            if (-not $sentDirectly) {
                try {
                    $payload = @{
                        _subject = "IXL Tracker - Admin Password Recovery"
                        name = "IXL Admin Security"
                        email = "petermounir461@gmail.com"
                        message = "Hello Peter,`r`n`r`nYour Admin Password for IXL Team Hours Tracker is: $pin`r`n`r`nAuthorized Admin: Peter MOUNIR`r`nSystem: IXL Team Hours Tracker`r`nTimestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                    } | ConvertTo-Json
                    Invoke-RestMethod -Uri "https://formsubmit.co/ajax/petermounir461@gmail.com" -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop | Out-Null
                    Write-Host "[EMAIL] Directly dispatched admin password to petermounir461@gmail.com via Web API." -ForegroundColor Green
                } catch {
                    Write-Host "[EMAIL] Web API dispatch notice: $($_.Exception.Message)" -ForegroundColor Yellow
                }
            }

            $resJson = '{"status":"ok","message":"Admin password sent directly to petermounir461@gmail.com","email":"petermounir461@gmail.com"}'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # Static File Serving
        $localRel = $path.TrimStart('/')
        if ($localRel -eq "" -or $localRel -eq "view") {
            $localRel = "index.html"
        }

        $localFilePath = Join-Path $ScriptDir $localRel
        if (Test-Path $localFilePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localFilePath).ToLower()
            $cType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $fileBytes = [System.IO.File]::ReadAllBytes($localFilePath)

            $response.ContentType = $cType
            $response.ContentLength64 = $fileBytes.Length
            $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("File Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }

        $response.Close()
    } catch {
        # Listener closed or aborted
    }
}
