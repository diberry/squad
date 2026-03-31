---
name: "dina-upstream-pr-maintenance"
description: "Monitor and maintain open upstream PRs on bradygaster/squad — CI, rebase, conflicts, single commit"
domain: "upstream PR management, CI, fork-workflow"
confidence: "high"
source: "Dina directive — upstream PRs must stay green, rebased, and single-commit"
---

## Worksurface

- **Upstream PRs live on:** `bradygaster/squad`
- **Code fixes happen on:** `diberry/squad` (push to the upstream PR branch from the fork)
- **No new feature work happens here.** By the time a PR is on bradygaster/squad, the code is done. The only work is mechanical: CI, rebase, conflicts, commit hygiene.

## Purpose

Open PRs on bradygaster/squad from diberry need ongoing maintenance until the upstream maintainer merges them. This skill defines the maintenance loop.

## Current Open Upstream PRs

Check what's open:
```bash
gh pr list --repo bradygaster/squad --state open --author diberry --json number,title,mergeable,state
```

## Maintenance Loop (every Ralph round)

For each open upstream PR from diberry:

### 1. Check PR health
```bash
gh pr view {number} --repo bradygaster/squad --json state,mergeable,statusCheckRollup,commits,reviews
```

### 2. Fix CI failures
If any status checks are failing:
- Checkout the PR branch locally
- Diagnose the failure (read CI logs)
- Fix the issue — this is mechanical (test fixes, import updates, build config)
- **Do NOT add new features or change behavior** — only fix what CI caught
- Push the fix
- If this creates multiple commits, squash back to 1

```bash
gh pr checks {number} --repo bradygaster/squad
# If failing, get the logs:
gh run view {run-id} --repo bradygaster/squad --log-failed
```

### 3. Fix merge conflicts
If `mergeable` is `CONFLICTING`:
```bash
git fetch upstream dev
git checkout {pr-branch}
git rebase upstream/dev
# Resolve conflicts
git push --force-with-lease
```

### 4. Enforce single commit
If the PR has more than 1 commit (from fix pushes):
```bash
git rebase -i upstream/dev  # squash all into 1
git push --force-with-lease
```

### 5. File audit
Verify no stray files:
```bash
gh pr view {number} --repo bradygaster/squad --json files --jq '.files[].path'
```
Every file must be directly related to the PR. Remove strays:
```bash
git checkout upstream/dev -- {stray-file}
# Re-squash
```

### 6. Respond to maintainer feedback
If the upstream maintainer requests changes:
- Address the feedback (mechanical fixes only — no scope expansion)
- Re-squash to 1 commit
- Post a comment summarizing what was changed
- Push

### 7. Report status
After processing all upstream PRs, post a summary:

| PR | CI | Mergeable | Commits | Action Taken |
|---|---|---|---|---|
| #{number} | ✅/❌ | ✅/❌ | N | {what you did} |

## What This Skill Does NOT Cover

- **Planning** — happens on diberry/squad issues
- **Implementation** — happens on diberry/squad feature branches
- **TDD / test writing** — happens on diberry/squad before the PR is opened upstream
- **Code review** — completed on diberry/squad before upstream PR opens
- **New features** — never added to an upstream PR. If scope changes, close and re-do from fork.

The upstream PR is a **delivery vehicle**, not a workspace.

## Recovery: Major Rework Needed

If the upstream maintainer requests changes that go beyond mechanical fixes:
1. Do NOT expand the upstream PR's scope
2. Close the upstream PR
3. Re-open the fork PR on diberry/squad (or create a new one)
4. Make the changes on the fork with full review cycle
5. Re-enter the pipeline from `squad:pr-needs-preparation`

## Anti-Patterns

- **Don't** add features to upstream PRs — they're delivery vehicles, not workspaces
- **Don't** leave CI red — fix it every round, don't wait for maintainer
- **Don't** let merge conflicts accumulate — rebase every round if upstream advanced
- **Don't** leave multi-commit PRs — always squash back to 1
- **Don't** ignore maintainer feedback — address it promptly, mechanically
- **Don't** expand scope based on maintainer suggestions — close and re-do from fork if scope changes
