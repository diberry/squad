---
title: Configuring Scout for a Local Squad
description: How to register and launch a personal local Squad from Microsoft Scout
---

# Configuring Scout for a Local Squad

This guide documents how to connect Microsoft Scout to an existing personal local Squad. It covers registration, validation, the runtime launch model, MCP configuration, and implementation scripts.

## Overview

Scout can load a local Squad by registering it as a "bundled Squad" in Scout's resources folder. When selected from the agent dropdown, Scout:

1. Loads `manifest.json` from the bundled Squad folder
2. Copies the bundled `.squad` folder into an ephemeral workspace
3. Sets the working directory to that temporary workspace
4. The coordinator (`squad.agent.md`) resolves the real Squad location via `teamRoot` in `.squad/config.json`

> **Important:** Scout does NOT automatically resolve `teamRoot` from `config.json`. The coordinator agent instructions must handle this explicitly.

## Prerequisites

- A local Squad repo with `.squad/team.md` and `.github/agents/squad.agent.md`
- Microsoft Scout installed (check `%LOCALAPPDATA%\Programs\Microsoft Scout`)
- Node.js and npm available

## Configuration Contract

Each personal Squad registration requires:

```json
{
  "personalSquads": [
    {
      "id": "my-local-squad",
      "displayName": "My Local Squad",
      "description": "Personal local Squad for my project workspace.",
      "rootPath": "C:\\my-squad-projects\\project-dina-hq",
      "agentName": "squad",
      "enabled": true,
      "source": "local-user-config"
    }
  ]
}
```

| Field       | Required | Purpose                                                    |
| ----------- | -------- | ---------------------------------------------------------- |
| id          | Yes      | Stable identifier for dropdown selection and launch resolver |
| displayName | Yes      | Friendly label shown in the agent/Squad dropdown           |
| rootPath    | Yes      | Absolute local path to the existing Squad root             |
| agentName   | Yes      | Agent invoked for the local Squad (usually `squad`)        |
| enabled     | Yes      | Controls whether the Squad appears in the dropdown         |
| description | No       | Tooltip text shown in settings                             |
| source      | No       | Tracks origin: user config, import, policy, or discovery   |

## Registration Script

The following PowerShell script registers a local Squad into Scout's bundled-squads folder. It validates the Squad root, generates `manifest.json` and `.squad/config.json`, and copies the required artifacts.

```powershell
#!/usr/bin/env pwsh
# register-squad-in-scout.ps1
# Registers a local Squad into Microsoft Scout's bundled-squads folder.
#
# Usage:
#   ./register-squad-in-scout.ps1 -SquadRoot "C:\my-squad-projects\project-dina-hq" -DisplayName "Dina Local Squad"

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
    Write-Warning "Optional but recommended: .github/agents/squad.agent.md not found at $agentMd"
}

$configJson = Join-Path $SquadRoot ".squad\config.json"
Write-Host "Validation passed for: $SquadRoot"

# --- Generate ID ---

if ([string]::IsNullOrEmpty($SquadId)) {
    $SquadId = ($DisplayName -replace '[^a-zA-Z0-9]', '-').ToLower().Trim('-')
}

# --- Determine Scout bundled-squads path ---

$scoutBase = Join-Path $env:LOCALAPPDATA "Programs\Microsoft Scout\resources\bundled-squads"
if (-not (Test-Path $scoutBase)) {
    # Fallback: try user-level config
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
    id              = $SquadId
    displayName     = $DisplayName
    agentName       = $AgentName
    teamRoot        = $SquadRoot
    squaduniverseid = [guid]::NewGuid().ToString()
    squaddisplayname = $DisplayName
    version         = "1.0.0"
    enabled         = $true
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

$squadConfig = @{
    teamRoot = $SquadRoot
    id       = $SquadId
    displayName = $DisplayName
}

# Merge with existing config if present
$configDest = Join-Path $squadDestDir "config.json"
if (Test-Path $configDest) {
    $existing = Get-Content $configDest -Raw | ConvertFrom-Json
    $existing | Add-Member -NotePropertyName "teamRoot" -NotePropertyValue $SquadRoot -Force
    $existing | Add-Member -NotePropertyName "id" -NotePropertyValue $SquadId -Force
    $squadConfig = $existing
}

$squadConfig | ConvertTo-Json -Depth 3 | Set-Content -Path $configDest -Encoding UTF8
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
Write-Host "=== Registration Complete ==="
Write-Host "Squad '$DisplayName' registered at: $bundledDir"
Write-Host "Restart Scout to see it in the agent dropdown."
```

## Validation Script

Use this script to validate that a folder is a valid Squad root before registration:

```powershell
#!/usr/bin/env pwsh
# validate-squad-root.ps1
# Validates that a directory is a valid Squad root for Scout integration.
#
# Usage:
#   ./validate-squad-root.ps1 -Path "C:\my-squad-projects\project-dina-hq"

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

# Check .squad/team.md (required)
$teamMd = Join-Path $Path ".squad\team.md"
if (-not (Test-Path $teamMd)) {
    $errors += "MISSING: .squad/team.md (required Squad marker)"
} else {
    Write-Host "[OK] .squad/team.md found"
}

# Check .squad/config.json (recommended)
$configJson = Join-Path $Path ".squad\config.json"
if (-not (Test-Path $configJson)) {
    $warnings += "MISSING: .squad/config.json (recommended for teamRoot resolution)"
} else {
    Write-Host "[OK] .squad/config.json found"
    $config = Get-Content $configJson -Raw | ConvertFrom-Json
    if ($config.teamRoot) {
        Write-Host "     teamRoot: $($config.teamRoot)"
    }
}

# Check .github/agents/squad.agent.md (recommended)
$agentMd = Join-Path $Path ".github\agents\squad.agent.md"
if (-not (Test-Path $agentMd)) {
    $warnings += "MISSING: .github/agents/squad.agent.md (coordinator agent)"
} else {
    Write-Host "[OK] .github/agents/squad.agent.md found"
}

# Check for routing.md
$routingMd = Join-Path $Path ".squad\routing.md"
if (Test-Path $routingMd) {
    Write-Host "[OK] .squad/routing.md found"
} else {
    $warnings += "MISSING: .squad/routing.md (agent routing definitions)"
}

# Check for agent files
$agentsDir = Join-Path $Path ".squad\agents"
if (Test-Path $agentsDir) {
    $agentCount = (Get-ChildItem $agentsDir -Filter "*.md" | Measure-Object).Count
    Write-Host "[OK] .squad/agents/ found ($agentCount agent files)"
} else {
    $warnings += "MISSING: .squad/agents/ directory"
}

# Check for MCP config
$mcpConfig = Join-Path $Path ".squad\mcp.json"
$vscodeSettings = Join-Path $Path ".vscode\mcp.json"
if ((Test-Path $mcpConfig) -or (Test-Path $vscodeSettings)) {
    Write-Host "[OK] MCP configuration found"
} else {
    $warnings += "MISSING: MCP configuration (.squad/mcp.json or .vscode/mcp.json)"
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
if ($errors.Count -eq 0) {
    Write-Host ""
    Write-Host "=== VALID SQUAD ROOT ===" -ForegroundColor Green
    Write-Host "This directory can be registered with Scout."
    exit 0
} else {
    Write-Host ""
    Write-Host "=== INVALID ===" -ForegroundColor Red
    Write-Host "Fix the errors above before registering."
    exit 1
}
```

## MCP Configuration

Squad uses an MCP server for state/memory tools. Configure this in your Squad's MCP settings:

```json
{
  "mcpServers": {
    "squad_state": {
      "command": "npx",
      "args": ["-y", "@bradygaster/squad-cli@0.11.0", "state-mcp"],
      "env": {
        "npm_config_registry": "https://packagefeedproxy.microsoft.io/npm/",
        "npm_config_allow_remote": "all"
      },
      "tools": ["*"]
    }
  }
}
```

> **Note:** Microsoft blocks direct NPM access on corp networks. The `env` block above routes through the Microsoft package feed proxy. Alternatively, set this machine-wide:
> ```bash
> npm config set registry "https://packagefeedproxy.microsoft.io/npm/"
> ```

## Coordinator Resolution

The coordinator (`squad.agent.md`) must explicitly resolve `teamRoot` since Scout does not do this natively. The coordinator should:

1. Read `.squad/config.json` from the ephemeral workspace
2. If `teamRoot` exists, load Squad context from that path:
   - `team.md` — team definition and roles
   - `routing.md` — agent routing rules
   - `decisions.md` — decision log
   - Agent charter files from `.squad/agents/`

Example coordinator initialization logic:

```markdown
## Initialization

1. Read `.squad/config.json`
2. If `teamRoot` is defined:
   - Set working context to `teamRoot`
   - Load `{teamRoot}/.squad/team.md`
   - Load `{teamRoot}/.squad/routing.md`
   - Load `{teamRoot}/.squad/decisions.md`
   - Enumerate agents from `{teamRoot}/.squad/agents/*.md`
3. If `teamRoot` is NOT defined:
   - Use the current working directory as the Squad root
   - Load `.squad/team.md` from cwd
```

## Unregistration Script

To remove a registered Squad from Scout:

```powershell
#!/usr/bin/env pwsh
# unregister-squad-from-scout.ps1
#
# Usage:
#   ./unregister-squad-from-scout.ps1 -SquadId "dina-local-squad"

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
    exit 1
}

Remove-Item $bundledDir -Recurse -Force
Write-Host "Removed bundled Squad '$SquadId' from: $bundledDir"
Write-Host "Restart Scout to update the agent dropdown."
```

## Troubleshooting

| Problem | Solution |
| ------- | -------- |
| Squad not appearing in dropdown | Restart Scout after registration. Check that `manifest.json` exists in the bundled-squads folder. |
| "Path does not exist" at launch | The `teamRoot` in `config.json` points to a moved/deleted folder. Update the path and re-register. |
| NPM errors with Squad tools | Add the `env` block to your MCP config (see MCP Configuration above) or set the registry globally. |
| Squad loads but doesn't find team context | Ensure your coordinator reads `teamRoot` from `.squad/config.json` and loads files from that path. |
| Permission denied on Squad folder | Scout needs filesystem access — grant it when prompted, or ensure the folder is in an accessible location. |
| Duplicate display names in dropdown | Use unique `id` values. Display names can repeat but IDs must be unique. |

## Current Limitations

- **Compliance:** Only bundled Squads are officially approved; user-customized Squads are technically possible but not compliance-approved yet.
- **No native `teamRoot` resolution:** Scout copies the bundled `.squad` into a temp workspace. The coordinator must handle path resolution.
- **No auto-discovery:** Registration is manual. No scanning for local Squads.
- **Machine-local only:** Paths are absolute and machine-specific. No cross-machine sync.

## Required Squad Artifacts

For a complete Scout integration, ensure your Squad root contains:

```
your-squad-root/
├── .squad/
│   ├── team.md              # (required) Team definition
│   ├── config.json          # (recommended) Contains teamRoot
│   ├── routing.md           # (recommended) Agent routing rules
│   ├── decisions.md         # (optional) Decision log
│   ├── ceremonies.md        # (optional) Team ceremonies
│   ├── casting.md           # (optional) Role casting
│   ├── mcp.json             # (recommended) MCP server config
│   └── agents/              # (recommended) Agent charter files
│       ├── lead.md
│       ├── frontend.md
│       ├── backend.md
│       └── tester.md
├── .github/
│   └── agents/
│       └── squad.agent.md   # (recommended) Coordinator agent
└── ...
```

## References

- Source: Tamir Dresher's guidance in the Squad Teams channel (July 13–16, Aug 6, 2026)
- Scout bundled-squads path: `%LOCALAPPDATA%\Programs\Microsoft Scout\resources\bundled-squads`
- Squad CLI MCP package: `@bradygaster/squad-cli`
