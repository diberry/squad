# Daily Rebase Sync

> Keep `diberry/storage-abstraction-squashed` as a single commit on top of Brady's latest `dev`.

## When to Use

- Every morning at session start (or when user says "sync", "rebase", "catch up with upstream")
- Before starting any new Phase 3+ work on the storage abstraction branch
- After Brady merges new work to `dev` on `bradygaster/squad`

## Prerequisites

- Remote `upstream` points to `bradygaster/squad`
- Remote `origin` points to `diberry/squad`
- Branch `diberry/storage-abstraction-squashed` exists locally
- **NEVER push to upstream (bradygaster/squad) — only origin (diberry/squad)**

## Steps

```bash
# 1. Switch to the squashed branch
git checkout diberry/storage-abstraction-squashed

# 2. Fetch latest from Brady's dev
git fetch upstream dev

# 3. Rebase — replays the single SA commit on top of latest upstream/dev
git rebase upstream/dev

# 4. If conflicts: resolve, then `git rebase --continue`
#    The single-commit structure means at most 1 round of conflicts

# 5. Force push to YOUR fork only
git push origin diberry/storage-abstraction-squashed --force-with-lease
```

## Verification

After rebase, confirm:
- `git log --oneline -3` shows: 1 SA commit on top of upstream/dev commits
- `git diff upstream/dev --stat` shows only SA files (packages/squad-sdk/src/storage/, state/, test/state/, test/storage-provider.test.ts)
- No `.squad/` state files in the diff (those are branch-local)

## Recovery

If the rebase goes wrong:
```bash
# Find the pre-rebase commit
git reflog | head -10
# Reset to it
git reset --hard HEAD@{N}
```

## Why Single Commit

- **Clean rebase**: 1 commit = at most 1 conflict resolution per rebase
- **Clear diff**: Brady sees exactly what the SA work changes vs his latest dev
- **Daily sync**: upstream moves, our commit replays cleanly on top
- **No history noise**: no merge commits, no multi-commit rebase chains

## Confidence

`medium` — Used successfully in this session. Pattern is standard git workflow.

## Tags

`git`, `rebase`, `workflow`, `daily`, `upstream-sync`
