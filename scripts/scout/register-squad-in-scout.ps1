#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Registers a local Squad into Microsoft Scout's bundled-squads folder.

.DESCRIPTION
    Validates the Squad root, generates manifest.json and .squad/config.json,
    copies required artifacts, and registers the Squad so it appears in
    Scout's agent dropdown.

.PARAMETER SquadRoot
    Absolute path to the existing Squad root directory.

.PARAMETER DisplayName
    Friendly name shown in Scout's agent/Squad dropdown.

.PARAMETER SquadId
    Optional stable identifier. Auto-generated from DisplayName if omitted.

.PARAMETER AgentName
    Agent name for the Squad (default: "squad").

.EXAMPLE
    ./register-squad-in-scout.ps1 -SquadRoot "C:\my-squad-projects\project-dina-hq" -DisplayName "Dina Local Squad"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SquadRoot,

    [Parameter(Mandatory = $true)]
    [string]$DisplayName,

    [string]$SquadId = "",
    [string]$AgentName = "squad"
)

$ErrorActionPreference = "Stop"

# --- Validation ---

if (-not (Test-Path $SquadRoot)) {
    Write-Error "Squad root does not exist: $SquadRoot"
    exit 1
}

$teamMd = Join-Path $SquadRoot ".squad\team.md"
if (-not (Test-Path $teamMd)) {
    Write-Error "Missing required file: .squad/team.md at $teamMd"
    exit 1
}

$agentMd = Join-Path $SquadRoot ".github\agents\squad.agent.md"
if (-not (Test-Path $agentMd)) {
    Write-Warning "Optional but recommended: .github/agents/squad.agent.md not found"
}

Write-Host "Validation passed for: $SquadRoot" -ForegroundColor Green

# --- Generate ID ---

if ([string]::IsNullOrEmpty($SquadId)) {
    $SquadId = ($DisplayName -replace '[^a-zA-Z0-9]', '-').ToLower().Trim('-')
}

# --- Determine Scout bundled-squads path ---

$scoutBase = Join-Path $env:LOCALAPPDATA "Programs\Microsoft Scout\resources\bundled-squads"
if (-not (Test-Path $scoutBase)) {
    $scoutBase = Join-Path $env:LOCALAPPDATA "Microsoft Scout\bundled-squads"
    if (-not (Test-Path $scoutBase)) {
        New-Item -ItemType Directory -Path $scoutBase -Force | Out-Null
        Write-Host "Created bundled-squads directory: $scoutBase"
    }
}

$bundledDir = Join-Path $scoutBase $SquadId
if (Test-Path $bundledDir) {
    Write-Warning "Overwriting existing bundled Squad at: $bundledDir"
    Remove-Item $bundledDir -Recurse -Force
}
New-Item -ItemType Directory -Path $bundledDir -Force | Out-Null

# --- Create manifest.json ---

$manifest = @{
    id               = $SquadId
    displayName      = $DisplayName
    agentName        = $AgentName
    teamRoot         = $SquadRoot
    squaduniverseid  = [guid]::NewGuid().ToString()
    squaddisplayname = $DisplayName
    version          = "1.0.0"
    enabled          = $true
} | ConvertTo-Json -Depth 3

$manifestPath = Join-Path $bundledDir "manifest.json"
Set-Content -Path $manifestPath -Value $manifest -Encoding UTF8
Write-Host "Created: $manifestPath"

# --- Copy .squad folder ---

$squadSourceDir = Join-Path $SquadRoot ".squad"
$squadDestDir = Join-Path $bundledDir ".squad"
Copy-Item -Path $squadSourceDir -Destination $squadDestDir -Recurse -Force
Write-Host "Copied .squad/ folder"

# --- Create/update .squad/config.json with teamRoot ---

$configDest = Join-Path $squadDestDir "config.json"
if (Test-Path $configDest) {
    $existing = Get-Content $configDest -Raw | ConvertFrom-Json
    $existing | Add-Member -NotePropertyName "teamRoot" -NotePropertyValue $SquadRoot -Force
    $existing | Add-Member -NotePropertyName "id" -NotePropertyValue $SquadId -Force
    $existing | ConvertTo-Json -Depth 3 | Set-Content -Path $configDest -Encoding UTF8
} else {
    @{
        teamRoot    = $SquadRoot
        id          = $SquadId
        displayName = $DisplayName
    } | ConvertTo-Json -Depth 3 | Set-Content -Path $configDest -Encoding UTF8
}
Write-Host "Created: $configDest"

# --- Copy agent charter ---

if (Test-Path $agentMd) {
    $agentsDir = Join-Path $bundledDir ".github\agents"
    New-Item -ItemType Directory -Path $agentsDir -Force | Out-Null
    Copy-Item -Path $agentMd -Destination $agentsDir -Force
    Write-Host "Copied squad.agent.md"
}

# --- Copy additional Squad artifacts ---

$additionalFiles = @("routing.md", "ceremonies.md", "decisions.md", "casting.md")
foreach ($file in $additionalFiles) {
    $src = Join-Path $SquadRoot ".squad\$file"
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $squadDestDir -Force
        Write-Host "Copied .squad/$file"
    }
}

# Copy agent files if they exist
$agentsSource = Join-Path $SquadRoot ".squad\agents"
if (Test-Path $agentsSource) {
    $agentsDest = Join-Path $squadDestDir "agents"
    Copy-Item -Path $agentsSource -Destination $agentsDest -Recurse -Force
    Write-Host "Copied .squad/agents/"
}

Write-Host ""
Write-Host "=== Registration Complete ===" -ForegroundColor Green
Write-Host "Squad '$DisplayName' registered at: $bundledDir"
Write-Host "Restart Scout to see it in the agent dropdown."
