---
title: Squad Troubleshooting Guide
description: Comprehensive troubleshooting guide for Squad, covering initialization, casting, agent spawning, nap operations, CI/CD issues, and common quick fixes.
---

This guide covers Squad setup, execution, maintenance, and CI/CD issues. Start with the **Quick Fixes** table for common one-liner solutions, then dive into detailed troubleshooting for your specific problem.

---

## Common Quick Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `squad: command not found` | Squad CLI not installed | Run `npm install -g @bradygaster/squad-cli` or use `npx @bradygaster/squad-cli` |
| `No .squad/ directory found` | Not in a git repo or Squad not initialized | Run `git init` then `npx squad init` |
| `Cannot find agent "{name}"` | Agent doesn't exist | Check `.squad/team.md` roster or run `squad cast` |
| `gh: command not found` | GitHub CLI not installed | Install from [cli.github.com](https://cli.github.com/) then `gh auth login` |
| `Node.js version error` | Node.js version below v20 | Upgrade to v20+ (nvm: `nvm install --lts && nvm use --lts`) |
| `npx github:bradygaster/squad` hangs | SSH key not loaded | Run `eval "$(ssh-agent -s)" && ssh-add` then retry |
| `gh` auth fails | Not logged in or missing scopes | Run `gh auth login` then `gh auth refresh -s project` |
| `Squad agent not in /agent list` | squad.agent.md missing | Re-run `npx github:bradygaster/squad` |
| `Path errors on Windows` | Wrong shell | Use PowerShell or Git Bash (not cmd.exe) |

---

## Squad Init Issues

### Problem: "squad init fails"

**Cause:** git not found, not in a git repository, or `.squad/` already exists.

**Check 1: Is git installed and in PATH?**

```bash
# macOS/Linux
which git

# Windows
Get-Command git
```

**Check 2: Are you in a git repository?**

```bash
# macOS/Linux
ls -la .git

# Windows
Test-Path ".\.git"
```

If no `.git/` directory, initialize one:

```bash
git init
```

**Check 3: Does .squad/ already exist?**

```bash
# macOS/Linux
ls -la .squad/

# Windows
Get-Item -Path ".\.squad" -Force
```

If `.squad/` exists and you want to reinitialize, back it up first:

```bash
# macOS/Linux
mv .squad/ .squad.bak

# Windows
Move-Item -Path ".\.squad" -Destination ".\.squad.bak"
```

**Resolution:** Run `squad init` after ensuring git is set up and `.squad/` doesn't exist.

---

### Problem: "Team not created after init"

**Check:** Does `.squad/team.md` have a `## Members` section?

```bash
# macOS/Linux
grep -n "## Members" .squad/team.md

# Windows
Select-String -Path ".\.squad\team.md" -Pattern "## Members"
```

If missing, re-run `squad init` or manually add a Members section:

```markdown
## Members

- **Avery** (avery): Generalist agent
```

---

### Problem: ".gitattributes not created"

**Check:** Merge drivers present?

```bash
# macOS/Linux
grep -E "merge=union|merge=ours" .gitattributes

# Windows
Select-String -Path ".\.gitattributes" -Pattern "merge=union|merge=ours"
```

**Resolution:** Re-run `squad init` which adds:

```
.squad/decisions.md merge=union
.squad/agents/*/history.md merge=union
```

---

## Casting Issues

### Problem: "Agent names not from the same universe"

**Cause:** Casting registry corrupted or mixing casting sources (e.g., AI-generated names mixed with book characters).

**Check:** Is `.squad/casting/` configured?

```bash
# macOS/Linux
ls -la .squad/casting/

# Windows
Get-ChildItem -Path ".\.squad\casting"
```

**Resolution:** Run `squad cast` to regenerate agent names from a consistent source.

---

### Problem: "New agent gets a random name"

**Cause:** `casting/` directory missing or not migrated from older Squad setup.

**Check:** Is casting configured in squad.config.ts?

```bash
# macOS/Linux
grep -A 5 "casting" squad.config.ts

# Windows
Select-String -Path "squad.config.ts" -Pattern "casting" -A 5
```

**Resolution:** 

1. Run migration: `squad migrate`
2. Re-run casting: `squad cast`

---

### Problem: "CastingEngine failed"

**Cause:** Universe of available names exhausted (> 999 agents registered).

**Check:** How many agents are in the roster?

```bash
# macOS/Linux
grep -c "^- " .squad/team.md

# Windows
@(Select-String -Path ".\.squad\team.md" -Pattern "^- ").Count
```

**Resolution:** This is rare. If you have hundreds of agents, contact Squad maintainers.

---

## Agent Spawning Issues

### Problem: "Agent doesn't respond"

**Cause:** Silent success bug — agent spawned successfully but didn't stream responses (~7-10% of background spawns).

**Check 1: Is the agent in your roster?**

```bash
# macOS/Linux
grep "{agent-name}" .squad/team.md

# Windows
Select-String -Path ".\.squad\team.md" -Pattern "{agent-name}"
```

**Check 2: Check orchestration logs**

```bash
# macOS/Linux
tail -100 .squad/orchestration-log/*.log

# Windows
Get-Content (Get-ChildItem -Path ".\.squad\orchestration-log\*.log" | Sort-Object LastWriteTime -Desc | Select-Object -First 1).FullName -Tail 100
```

**Resolution:** Re-run the command. If consistent, file an issue with logs attached.

---

### Problem: "Agent can't find files"

**Cause:** Wrong TEAM_ROOT or worktree path misconfiguration.

**Check 1: Is TEAM_ROOT set?**

```bash
# macOS/Linux
echo $TEAM_ROOT

# Windows
echo $env:TEAM_ROOT
```

**Check 2: Is the path correct?**

```bash
# macOS/Linux
test -d "$TEAM_ROOT/.squad" && echo "Valid" || echo "Invalid"

# Windows
Test-Path "$env:TEAM_ROOT\.squad"
```

**Check 3: Are you using worktrees?**

```bash
# macOS/Linux
git worktree list

# Windows
git worktree list
```

If worktrees are used, ensure `worktree_path` is set in `.squad/team.md`.

**Resolution:** Set TEAM_ROOT environment variable or update worktree_path config.

---

### Problem: "Model unavailable"

**Cause:** Primary model not available; fallback chain explanation.

**Check:** Which models are configured?

```bash
# macOS/Linux
grep -A 3 "models:" squad.config.ts

# Windows
Select-String -Path "squad.config.ts" -Pattern "models:" -A 3
```

**Resolution:** Squad falls back to: Primary model → GPT-4 → GPT-3.5-Turbo. Ensure at least one is available in your environment.

---

## Nap Troubleshooting

Squad nap is a **context hygiene system** that compresses agent histories, prunes old logs, archives decisions, and merges inbox files. It keeps `.squad/` lean across sessions.

> **Trigger:** `squad nap` CLI command or `team, take a nap` in interactive shell.
>
> **Key point:** Simply closing the CLI does NOT perform napping. You must explicitly trigger it.

---

### 5 Nap Operations

| # | Operation | Trigger Condition | Action |
|---|-----------|-------------------|--------|
| 1 | **History compression** | Agent `history.md` > 15 KB | Keep 5 most recent sections, archive rest to `history-archive.md` |
| 2 | **Log pruning** | Log files > 7 days old | Delete old files from `.squad/orchestration-log/` and `.squad/log/` |
| 3 | **Decision archival** | `decisions.md` > 20 KB | Archive entries > 30 days old to `decisions-archive.md` |
| 4 | **Inbox cleanup** | Files exist in `decisions/inbox/` | Merge into `decisions.md`, delete source files |
| 5 | **Safety journal** | Always | Creates `.nap-journal` at start, deletes at end |

---

### Nap Troubleshooting Flowchart

#### Problem: "Nap says nothing to clean up"

**Check 1: Are files under threshold?**

```bash
# Check history sizes (macOS/Linux)
du -sh .squad/agents/*/history.md

# Windows equivalent
Get-ChildItem -Path ".\.squad\agents\*\history.md" | ForEach-Object { "{0}: {1} bytes" -f $_.FullName, (Get-Item $_).Length }
```

**Threshold:** 15 KB — files under this are skipped.

**Check 2: Are logs too new?**

```bash
# Check log ages (macOS/Linux)
ls -la .squad/orchestration-log/
ls -la .squad/log/

# Windows equivalent
Get-ChildItem -Path ".\.squad\orchestration-log", ".\.squad\log" -Force
```

**Logs < 7 days old are not pruned.**

**Check 3: Is decisions.md small?**

```bash
# Check file size (macOS/Linux)
wc -c .squad/decisions.md

# Windows equivalent
(Get-Item .\.squad\decisions.md).Length
```

**Threshold:** 20 KB — under this, no archival.

**Resolution:** This is normal behavior — nap only acts when thresholds are exceeded. Use `squad nap --deep` (keeps 3 entries instead of 5) for more aggressive cleanup, or wait for more sessions to accumulate data.

---

#### Problem: "Nap appears to run but nothing changes"

**Check 1: Verify `.squad/` directory exists and is writable**

```bash
# macOS/Linux
ls -la .squad/
touch .squad/test-write && rm .squad/test-write

# Windows
Get-Item -Path ".\.squad" -Force
New-Item -Path ".\.squad\test-write.txt" -Force; Remove-Item -Path ".\.squad\test-write.txt"
```

**Check 2: Check if agent directories exist**

```bash
# macOS/Linux
ls .squad/agents/

# Windows
Get-ChildItem -Path ".\.squad\agents"
```

Should show agent directories (e.g., `avery/`, `morgan/`, `quinn/`, etc.).

**Check 3: Check for history files**

```bash
# macOS/Linux
ls .squad/agents/*/history.md

# Windows
Get-ChildItem -Path ".\.squad\agents\*\history.md"
```

If no history files exist, there's nothing to compress.

**Check 4: Run dry-run to see what WOULD happen**

```bash
squad nap --dry-run
```

**Resolution:** If agents have no `history.md` files, the team hasn't accumulated learnings yet. Run some tasks first, then nap.

---

#### Problem: "Previous nap interrupted" warning

**Cause:** A previous nap was interrupted (crash, Ctrl+C, terminal closed during nap).

**Check:**

```bash
# macOS/Linux
ls .squad/.nap-journal

# Windows
Test-Path ".\.squad\.nap-journal"
```

If this file exists, a nap was interrupted.

**Resolution:** Re-run `squad nap` — it will complete the interrupted operations and remove the journal file. The journal is a safety mechanism, not an error.

---

#### Problem: "History file still large after nap"

**Check 1: Is it actually over 15 KB?**

```bash
# macOS/Linux
wc -c .squad/agents/avery/history.md

# Windows
(Get-Item ".\.squad\agents\avery\history.md").Length
```

**Check 2: Was an archive file created?**

```bash
# macOS/Linux
ls .squad/agents/avery/history-archive.md

# Windows
Test-Path ".\.squad\agents\avery\history-archive.md"
```

Should exist after compression.

**Check 3: Does the history have dated sections?**

The compressor looks for markdown sections (`## Date` or `## Session`) to identify entry boundaries. If the history is one undated block, it can't split entries to archive.

**Resolution:** If the file has no dated sections, the compressor can't identify individual entries. Ensure agents write structured history with dated headers.

---

#### Problem: "Decisions not archiving"

**Check 1: File size**

```bash
# macOS/Linux
wc -c .squad/decisions.md

# Windows
(Get-Item ".\.squad\decisions.md").Length
```

Must be > 20 KB for archival to trigger.

**Check 2: Entry dates**

Nap archives entries > 30 days old. If all entries are recent, nothing is archived even if the file is large.

**Check 3: Undated entries**

Undated entries (common for foundational directives like AD-001) are **never archived**. This is by design.

**Resolution:** If the file is > 20 KB but all entries are < 30 days old, wait or manually archive old entries.

---

#### Problem: "Inbox files not merging"

**Check 1: Do inbox files exist?**

```bash
# macOS/Linux
ls .squad/decisions/inbox/

# Windows
Get-ChildItem -Path ".\.squad\decisions\inbox"
```

**Check 2: Are they `.md` files?**

Only markdown files are processed. Other file types are ignored.

**Check 3: Check file permissions**

```bash
# macOS/Linux
ls -la .squad/decisions/inbox/*.md

# Windows
Get-ChildItem -Path ".\.squad\decisions\inbox\*.md" -Force
```

**Resolution:** Ensure inbox files are `.md` format and readable.

---

#### Problem: "Session can't be recovered after nap"

**Important:** Nap does NOT affect sessions. Sessions are a separate system.

**Check session store:**

```bash
# In Copilot CLI
sql database: "session_store" query: "SELECT id, summary, updated_at FROM sessions ORDER BY updated_at DESC LIMIT 5"
```

**Check session files:**

```bash
# macOS/Linux
ls .squad/sessions/

# Windows
Get-ChildItem -Path ".\.squad\sessions"
```

JSON files with format: `{timestamp}_{sessionId}.json`

**Sessions auto-expire after 24 hours.** If the session is older, it may have been cleaned up.

---

## CI/CD Issues

### Problem: "Tests fail in CI but pass locally"

**Common causes:**

1. **Missing build steps** — CI runs tests before build completes
2. **Environment differences** — CI doesn't have required Node.js version, dependencies, or env variables
3. **Git state** — CI checks out detached HEAD; Squad expects a branch
4. **SSH keys** — CI agent can't access private repos

**Check 1: CI Node.js version**

```bash
# In GitHub Actions workflow log, look for:
node --version
# Must be >= v20
```

**Check 2: Dependencies installed?**

```bash
# Workflow should include:
npm ci  # or npm install
```

**Check 3: Is this a private repo?**

If yes, ensure CI has GitHub token with repo scope:

```yaml
# In workflow
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Resolution:** Add build step before tests in your CI workflow. Ensure Node.js v20+ is used.

---

### Problem: "PR checks blocked"

**Cause:** Draft PR status, missing review, or failed CI.

**Check 1: Is the PR draft?**

```bash
gh pr view <pr-number> --json isDraft
```

If `isDraft: true`, convert to ready:

```bash
gh pr ready <pr-number>
```

**Check 2: Does PR require reviews?**

```bash
gh pr view <pr-number> --json reviewDecision
```

If reviews required, request them:

```bash
gh pr review <pr-number> --request-review @{reviewer}
```

**Check 3: CI failures?**

```bash
gh pr checks <pr-number>
```

If failed, fix the issues and push a new commit — CI will rerun.

**Resolution:** Ensure PR is ready, has approvals, and all checks pass.

---

### Problem: "Workflow runs stale code"

**Cause:** CI runs the workflow from the base branch (main/dev), not the PR branch.

**Example:** PR #42 on `feature` branch, but CI runs workflow.yml from `main`.

**Check:**

```bash
# View workflow source branch
git show origin/main:.github/workflows/ci.yml
git show origin/feature:.github/workflows/ci.yml
```

If they differ, CI ran the main version.

**Resolution:** Either:

1. Update the base branch workflow and push to base
2. Or configure workflow to always use the PR branch:

```yaml
# In .github/workflows/ci.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
```

---

## Decisions & History Issues

### Problem: "decisions.md is huge"

**Cause:** Archival not running or threshold too high.

**Check 1: File size**

```bash
# macOS/Linux
wc -c .squad/decisions.md

# Windows
(Get-Item ".\.squad\decisions.md").Length
```

**Check 2: Is nap running regularly?**

```bash
# Check nap schedule (e.g., in your CI or shell workflow)
grep -r "squad nap" .squad/decisions/
```

**Check 3: What's the archival threshold?**

Default: 20 KB. If file is > 20 KB, run `squad nap` manually:

```bash
squad nap
```

Or use aggressive mode:

```bash
squad nap --deep
```

**Resolution:** Set up nap to run after each session (e.g., post-nap ritual in `.squad/team.md`). Or manually run `squad nap --deep` quarterly.

---

### Problem: "Inbox files not merging"

**Cause:** Scribe not running, or permission issues.

**Check 1: Do inbox files exist?**

```bash
# macOS/Linux
ls .squad/decisions/inbox/

# Windows
Get-ChildItem -Path ".\.squad\decisions\inbox"
```

**Check 2: Are they markdown files?**

Only `.md` files are processed. If you have `.txt` or other extensions, rename them.

**Check 3: Check file permissions**

```bash
# macOS/Linux
ls -la .squad/decisions/inbox/*.md

# Windows
Get-ChildItem -Path ".\.squad\decisions\inbox\*.md" -Force
```

**Check 4: Manually run nap to merge**

```bash
squad nap --dry-run  # preview
squad nap            # execute
```

**Resolution:** Ensure files are `.md` format and readable. Run `squad nap` to merge.

---

### Problem: "History lost after branch merge"

**Cause:** Git merge didn't use the `union` merge driver.

**Check:** Is `.gitattributes` correct?

```bash
# macOS/Linux
cat .gitattributes | grep history

# Windows
Get-Content ".\.gitattributes" | Select-String "history"
```

Should show:

```
.squad/agents/*/history.md merge=union
```

**If missing, add it:**

```bash
echo ".squad/agents/*/history.md merge=union" >> .gitattributes
git add .gitattributes
git commit -m "fix: add union merge driver for history files"
```

**For future merges:** The union driver will auto-merge history without conflicts.

**Resolution:** Add merge=union driver to .gitattributes and recommit merge.

---

## Nap Variants Reference

| Command | Keep Entries | When to Use |
|---------|-------------|-------------|
| `squad nap` | 5 recent | Regular maintenance (every 3-5 sessions) |
| `squad nap --deep` | 3 recent | Sprint end, milestone cleanup |
| `squad nap --dry-run` | N/A (preview) | Before first nap, or to diagnose issues |
| `/compact` (in shell) | 5 recent | Same as `squad nap` from REPL |

---

## Key Thresholds

| Metric | Default | Notes |
|--------|---------|-------|
| History compression | 15 KB | Per-agent `history.md` |
| Decision archival | 20 KB | `decisions.md` total size |
| Log max age | 7 days | Orchestration + session logs |
| Decision entry max age | 30 days | Before archival eligible |
| Token estimate | 250/KB | For reporting savings |

---

## Quick Diagnostic Script

```bash
#!/bin/bash
echo "=== Squad Nap Diagnostics ==="
echo ""
echo "History files:"
for f in .squad/agents/*/history.md; do
  size=$(wc -c < "$f" 2>/dev/null || echo "0")
  echo "  $f: ${size} bytes $([ $size -gt 15360 ] && echo '[WILL COMPRESS]' || echo '[under threshold]')"
done
echo ""
echo "Decisions: $(wc -c < .squad/decisions.md 2>/dev/null || echo 0) bytes"
echo "Inbox files: $(ls .squad/decisions/inbox/*.md 2>/dev/null | wc -l)"
echo "Log files > 7d: $(find .squad/log .squad/orchestration-log -mtime +7 2>/dev/null | wc -l)"
echo "Nap journal: $([ -f .squad/.nap-journal ] && echo 'EXISTS (interrupted nap!)' || echo 'clean')"
```

**Windows PowerShell equivalent:**

```powershell
Write-Host "=== Squad Nap Diagnostics ==="
Write-Host ""
Write-Host "History files:"
Get-ChildItem -Path ".\.squad\agents\*\history.md" -ErrorAction SilentlyContinue | ForEach-Object {
  $size = (Get-Item $_).Length
  $status = if ($size -gt 15360) { "[WILL COMPRESS]" } else { "[under threshold]" }
  Write-Host "  $($_.FullName): $size bytes $status"
}
Write-Host ""
$decisionsSize = if (Test-Path ".\.squad\decisions.md") { (Get-Item ".\.squad\decisions.md").Length } else { 0 }
Write-Host "Decisions: $decisionsSize bytes"
$inboxCount = @(Get-ChildItem -Path ".\.squad\decisions\inbox\*.md" -ErrorAction SilentlyContinue).Count
Write-Host "Inbox files: $inboxCount"
$sevenDaysAgo = (Get-Date).AddDays(-7)
$oldLogs = @(Get-ChildItem -Path ".\.squad\log", ".\.squad\orchestration-log" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $sevenDaysAgo }).Count
Write-Host "Log files > 7d: $oldLogs"
$journalExists = if (Test-Path ".\.squad\.nap-journal") { "EXISTS (interrupted nap!)" } else { "clean" }
Write-Host "Nap journal: $journalExists"
```
