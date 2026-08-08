#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Removes a registered Squad from Microsoft Scout's bundled-squads folder.

.PARAMETER SquadId
    The ID of the Squad to unregister.

.EXAMPLE
    ./unregister-squad-from-scout.ps1 -SquadId "dina-local-squad"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SquadId
)

$scoutBase = Join-Path $env:LOCALAPPDATA "Programs\Microsoft Scout\resources\bundled-squads"
if (-not (Test-Path $scoutBase)) {
    $scoutBase = Join-Path $env:LOCALAPPDATA "Microsoft Scout\bundled-squads"
}

$bundledDir = Join-Path $scoutBase $SquadId
if (-not (Test-Path $bundledDir)) {
    Write-Error "No bundled Squad found with id '$SquadId' at: $bundledDir"
    Write-Host ""
    Write-Host "Available Squads:"
    Get-ChildItem $scoutBase -Directory | ForEach-Object { Write-Host "  - $($_.Name)" }
    exit 1
}

$manifest = Join-Path $bundledDir "manifest.json"
if (Test-Path $manifest) {
    $info = Get-Content $manifest -Raw | ConvertFrom-Json
    Write-Host "Removing: $($info.displayName) ($($info.id))"
} else {
    Write-Host "Removing: $SquadId"
}

Remove-Item $bundledDir -Recurse -Force
Write-Host "Removed bundled Squad from: $bundledDir" -ForegroundColor Green
Write-Host "Restart Scout to update the agent dropdown."
