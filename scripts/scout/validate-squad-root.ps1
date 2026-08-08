#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Validates that a directory is a valid Squad root for Scout integration.

.DESCRIPTION
    Checks for required and recommended Squad files and reports whether
    the directory can be registered with Scout.

.PARAMETER Path
    Absolute path to the directory to validate.

.EXAMPLE
    ./validate-squad-root.ps1 -Path "C:\my-squad-projects\project-dina-hq"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$errors = @()
$warnings = @()

# Check path exists
if (-not (Test-Path $Path)) {
    Write-Error "Path does not exist: $Path"
    exit 1
}

Write-Host "Validating Squad root: $Path"
Write-Host ""

# Check .squad/team.md (required)
$teamMd = Join-Path $Path ".squad\team.md"
if (-not (Test-Path $teamMd)) {
    $errors += "MISSING: .squad/team.md (required Squad marker)"
} else {
    Write-Host "[OK] .squad/team.md" -ForegroundColor Green
}

# Check .squad/config.json (recommended)
$configJson = Join-Path $Path ".squad\config.json"
if (-not (Test-Path $configJson)) {
    $warnings += "MISSING: .squad/config.json (recommended for teamRoot resolution)"
} else {
    Write-Host "[OK] .squad/config.json" -ForegroundColor Green
    try {
        $config = Get-Content $configJson -Raw | ConvertFrom-Json
        if ($config.teamRoot) {
            Write-Host "     teamRoot: $($config.teamRoot)" -ForegroundColor Cyan
        }
    } catch {
        $warnings += "INVALID: .squad/config.json is not valid JSON"
    }
}

# Check .github/agents/squad.agent.md (recommended)
$agentMd = Join-Path $Path ".github\agents\squad.agent.md"
if (-not (Test-Path $agentMd)) {
    $warnings += "MISSING: .github/agents/squad.agent.md (coordinator agent)"
} else {
    Write-Host "[OK] .github/agents/squad.agent.md" -ForegroundColor Green
}

# Check for routing.md
$routingMd = Join-Path $Path ".squad\routing.md"
if (Test-Path $routingMd) {
    Write-Host "[OK] .squad/routing.md" -ForegroundColor Green
} else {
    $warnings += "MISSING: .squad/routing.md (agent routing definitions)"
}

# Check for decisions.md
$decisionsMd = Join-Path $Path ".squad\decisions.md"
if (Test-Path $decisionsMd) {
    Write-Host "[OK] .squad/decisions.md" -ForegroundColor Green
}

# Check for agent files
$agentsDir = Join-Path $Path ".squad\agents"
if (Test-Path $agentsDir) {
    $agentCount = (Get-ChildItem $agentsDir -Filter "*.md" | Measure-Object).Count
    Write-Host "[OK] .squad/agents/ ($agentCount agent files)" -ForegroundColor Green
} else {
    $warnings += "MISSING: .squad/agents/ directory"
}

# Check for MCP config
$mcpLocations = @(
    (Join-Path $Path ".squad\mcp.json"),
    (Join-Path $Path ".vscode\mcp.json"),
    (Join-Path $Path ".github\copilot\mcp.json")
)
$mcpFound = $false
foreach ($mcp in $mcpLocations) {
    if (Test-Path $mcp) {
        Write-Host "[OK] MCP config: $mcp" -ForegroundColor Green
        $mcpFound = $true
        break
    }
}
if (-not $mcpFound) {
    $warnings += "MISSING: MCP configuration (checked .squad/mcp.json, .vscode/mcp.json, .github/copilot/mcp.json)"
}

# Report
Write-Host ""
if ($errors.Count -gt 0) {
    Write-Host "=== ERRORS (must fix) ===" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  ! $_" -ForegroundColor Red }
}
if ($warnings.Count -gt 0) {
    Write-Host "=== WARNINGS (recommended) ===" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "  ? $_" -ForegroundColor Yellow }
}

Write-Host ""
if ($errors.Count -eq 0) {
    Write-Host "=== VALID SQUAD ROOT ===" -ForegroundColor Green
    Write-Host "This directory can be registered with Scout."
    exit 0
} else {
    Write-Host "=== INVALID ===" -ForegroundColor Red
    Write-Host "Fix the errors above before registering."
    exit 1
}
