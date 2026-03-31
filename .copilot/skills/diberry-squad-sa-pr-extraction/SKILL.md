# SA PR Extraction — Clean Commit Workflow

## Purpose
Keep `diberry/storage-abstraction-squashed` (the PR branch) containing ONLY StorageProvider-related changes. Zero noise from `.squad/`, build artifacts, or unrelated templates.

## Confidence: medium
Validated once (session 2026-03-24). Needs second session to confirm.

## SA Path Allowlist

```
# Core SA — StorageProvider interface + providers
packages/squad-sdk/src/storage/

# State facade — SquadState, collections, handles, IO
packages/squad-sdk/src/state/

# SDK modules with SA wiring (add new files as Phase 3 progresses)
packages/squad-sdk/src/agents/index.ts
packages/squad-sdk/src/agents/onboarding.ts
packages/squad-sdk/src/agents/history-shadow.ts
packages/squad-sdk/src/agents/lifecycle.ts
packages/squad-sdk/src/agents/personal.ts
packages/squad-sdk/src/tools/index.ts
packages/squad-sdk/src/config/
packages/squad-sdk/src/index.ts
packages/squad-sdk/package.json

# CLI source files with SA wiring (Phase 2+3 scope)
packages/squad-cli/src/**/*.ts

# Tests
test/state/
test/storage-contract.ts
test/storage-provider.test.ts
```

## Denylist (NEVER include)

```
**/*.tgz
.squad/**
**/templates/skills/**
**/node_modules/**
**/dist/**
**/coverage/**
*.log
```

## Extraction Steps

### Prerequisites
- On any branch with SA work (work branch or PR branch)
- `upstream` remote points to `bradygaster/squad`
- `origin` remote points to `diberry/squad`

### Step 1: Switch to PR branch and reset to upstream
```bash
git checkout diberry/storage-abstraction-squashed
git fetch upstream
git reset --hard upstream/dev
```

### Step 2: Overlay SA paths from work branch
```bash
# Replace WORK_BRANCH with your current work branch
WORK_BRANCH="squad/481-phase3-cli-migration"

git checkout $WORK_BRANCH -- \
  packages/squad-sdk/src/storage/ \
  packages/squad-sdk/src/state/ \
  packages/squad-sdk/src/agents/index.ts \
  packages/squad-sdk/src/agents/onboarding.ts \
  packages/squad-sdk/src/agents/history-shadow.ts \
  packages/squad-sdk/src/agents/lifecycle.ts \
  packages/squad-sdk/src/agents/personal.ts \
  packages/squad-sdk/src/tools/index.ts \
  packages/squad-sdk/src/config/ \
  packages/squad-sdk/src/index.ts \
  packages/squad-sdk/package.json \
  packages/squad-cli/src/ \
  test/state/ \
  test/storage-contract.ts \
  test/storage-provider.test.ts
```

**As Phase 3 adds more CLI files or new SDK paths, add them to this list.**

### Step 3: Remove denylist stragglers
```bash
git reset HEAD -- '*.tgz' '**/templates/skills/**' '.squad/**' 2>/dev/null
git checkout -- '*.tgz' '**/templates/skills/**' '.squad/**' 2>/dev/null
```

### Step 4: Commit
```bash
git add -A
git commit -m "feat: StorageProvider typed interface (PRD #481)

<update summary with current phase status>"
```

### Step 5: Verify (all three should return EMPTY)
```bash
git diff --name-only upstream/dev | grep '\.tgz$'
git diff --name-only upstream/dev | grep 'templates/skills/'
git diff --name-only upstream/dev | grep '\.squad/'
```

### Step 6: Push
```bash
git push origin diberry/storage-abstraction-squashed --force
```

## Daily Rebase (combine with daily-rebase-sync skill)
```bash
git checkout diberry/storage-abstraction-squashed
git fetch upstream
git rebase upstream/dev
# If conflicts: resolve, git rebase --continue
git push origin diberry/storage-abstraction-squashed --force
```

## When to Run
- After completing a wave of Phase 3 work
- After daily rebase if the work branch has new SA changes
- Before requesting PR review

## Recovery
If extraction goes wrong:
```bash
# The work branch always has the full history
git checkout diberry/storage-abstraction-squashed
git reset --hard upstream/dev
# Re-run extraction from Step 2
```

## Metrics (baseline)
- Phase 0-2: 45 files, 6213 insertions, 353 deletions
- Zero noise files in PR
