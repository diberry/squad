#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Lists all Squads currently registered in Scout's bundled-squads folder.

.EXAMPLE
    ./list-scout-squads.ps1
#>

$scoutBase = Join-Path $env:LOCALAPPDATA "Programs\Microsoft Scout\resources\bundled-squads"
if (-not (Test-Path $scoutBase)) {
    $scoutBase = Join-Path $env:LOCALAPPDATA "Microsoft Scout\bundled-squads"
}

if (-not (Test-Path $scoutBase)) {
    Write-Host "No bundled-squads directory found." -ForegroundColor Yellow
    Write-Host "Expected at: $scoutBase"
    exit 0
}

$squads = Get-ChildItem $scoutBase -Directory

if ($squads.Count -eq 0) {
    Write-Host "No Squads registered in Scout." -ForegroundColor Yellow
    exit 0
}

Write-Host "Registered Squads in Scout:" -ForegroundColor Cyan
Write-Host "Location: $scoutBase"
Write-Host ""

foreach ($dir in $squads) {
    $manifest = Join-Path $dir.FullName "manifest.json"
    if (Test-Path $manifest) {
        $info = Get-Content $manifest -Raw | ConvertFrom-Json
        $status = if ($info.enabled) { "enabled" } else { "disabled" }
        $statusColor = if ($info.enabled) { "Green" } else { "DarkGray" }

        Write-Host "  $($info.displayName)" -ForegroundColor $statusColor -NoNewline
        Write-Host " [$status]" -ForegroundColor $statusColor
        Write-Host "    ID:       $($info.id)"
        Write-Host "    teamRoot: $($info.teamRoot)"

        # Validate teamRoot still exists
        if ($info.teamRoot -and -not (Test-Path $info.teamRoot)) {
            Write-Host "    STATUS:   PATH MISSING" -ForegroundColor Red
        } else {
            Write-Host "    STATUS:   OK" -ForegroundColor Green
        }
        Write-Host ""
    } else {
        Write-Host "  $($dir.Name)" -ForegroundColor Yellow
        Write-Host "    WARNING: No manifest.json found"
        Write-Host ""
    }
}
