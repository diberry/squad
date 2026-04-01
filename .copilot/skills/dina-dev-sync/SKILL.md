---
name: "dina-dev-sync"
description: "Keep local and origin dev branches on diberry/squad in sync with bradygaster/squad dev"
domain: "git-workflow, upstream-sync, fork-management"
confidence: "high"
source: "Dina directive — fork dev must track upstream dev to prevent drift"
---

## Worksurface

- **Local repo:** The local clone of diberry/squad (the fork)
- **Fork remote (origin):** `diberry/squad` on github.com
- **Upstream remote:** `bradygaster/squad` on github.com

All sync flows pull FROM upstream (bradygaster/squad). Never push TO upstream.

## Purpose

The `dev` branch on diberry/squad must stay current with `dev` on bradygaster/squad. Drift causes:
- Merge conflicts when opening upstream PRs
- Stale CI results on fork PRs (testing against old upstream code)
- Missed upstream features that could affect fork work

## Remote Setup

Verify remotes are configured correctly:

```bash
git remote -v
# origin    https://github.com/diberry/squad.git (fetch/push)
# upstream  https://github.com/bradygaster/squad.git (fetch/push)
```

If `upstream` is missing:
```bash
git remote add upstream https://github.com/bradygaster/squad.git
```

## When to Sync

- **Start of every work session** — first thing before any other git operations
- **Before creating a new feature branch** — ensures the branch starts from latest upstream
- **Before rebasing a PR branch** — ensures rebase target is current
- **After upstream merges a PR** — pull in the new changes
- **When Ralph scans for work** — sync dev as part of the scan preamble

## Sync Procedure

### Fast-forward sync (preferred — no local dev commits)

```bash
# 1. Fetch upstream
git fetch upstream dev

# 2. Switch to dev
git checkout dev

# 3. Fast-forward to upstream/dev
git merge --ff-only upstream/dev

# 4. Push to origin (diberry/squad) so GitHub fork dev is current
git push origin dev

# 5. Return to working branch
git checkout -
```

### Force sync (when dev has diverged)

If local dev has commits not on upstream (shouldn't happen, but recovery path):

```bash
# 1. Fetch upstream
git fetch upstream dev

# 2. Reset dev to match upstream exactly
git checkout dev
git reset --hard upstream/dev

# 3. Force push to origin
git push origin dev --force-with-lease

# 4. Return to working branch
git checkout -
```

⚠️ Force sync overwrites any fork-only commits on dev. This is correct — dev should never have fork-only commits. All fork-specific state lives on the `diberry/squad` branch.

## Verification

After sync, confirm:

```bash
# Local dev matches upstream/dev
git log --oneline dev -1
git log --oneline upstream/dev -1
# Both should show the same commit

# Origin dev matches (after push)
gh api repos/diberry/squad/branches/dev --jq '.commit.sha[:8]'
gh api repos/bradygaster/squad/branches/dev --jq '.commit.sha[:8]'
# Both should match
```

## What Lives Where

| Branch | Content | Sync behavior |
|--------|---------|--------------|
| `dev` | Code — mirrors bradygaster/squad dev exactly | Fast-forward from upstream, push to origin |
| `diberry/squad` | Dina's state — skills, decisions, config | Never synced with upstream dev. Independent branch. |
| `squad/*` | Feature branches | Created from dev, rebased against dev |

**Critical:** The `dev` branch is a mirror of upstream. It should NEVER contain fork-specific content (skills, decisions, squad state). That content lives on `diberry/squad`.

## Automation Hooks

### Ralph preamble (every round)

Before scanning PRs or issues, Ralph should:

```bash
git fetch upstream dev
git checkout dev
git merge --ff-only upstream/dev && git push origin dev
git checkout -
```

If `--ff-only` fails, Ralph posts a warning: "dev branch has diverged from upstream — needs force sync" and does NOT proceed with other work until resolved.

### Pre-branch creation

Before `git checkout -b squad/{issue}-{slug}`:

```bash
git fetch upstream dev
git checkout dev
git merge --ff-only upstream/dev && git push origin dev
git checkout -b squad/{issue}-{slug}
```

This ensures every new feature branch starts from the latest upstream code.

## Anti-Patterns

- **Don't** commit directly to dev on the fork — dev is a mirror, not a workspace
- **Don't** merge feature branches into dev on the fork — PRs target dev but only upstream merges into it
- **Don't** let dev drift — sync at least once per session
- **Don't** put skills, decisions, or squad state on dev — those go on `diberry/squad`
- **Don't** use `git pull` on dev — use `fetch` + `merge --ff-only` to catch divergence early
- **Don't** skip pushing to origin after local sync — GitHub fork dev must match local dev
