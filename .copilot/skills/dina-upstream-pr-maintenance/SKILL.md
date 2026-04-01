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

### 6. Address Copilot review suggestions
Check for unresolved Copilot review comments:
```bash
gh pr view {number} --repo bradygaster/squad --json reviewThreads --jq '[.reviewThreads[] | select(.isResolved == false) | {path: .comments[0].path, body: .comments[0].body[0:100], author: .comments[0].author.login}]'
```
For each unresolved Copilot suggestion:
- Read the suggestion carefully — Copilot suggestions are code-level improvements (error handling, edge cases, type safety)
- Apply the fix in the source code
- If the suggestion includes a `suggestion` code block, apply it verbatim unless it would make the code worse

**Thread workflow (resolve BEFORE push):**

This order matters — force-push marks threads as "outdated" instead of "resolved". Do it in this order:

1. **Apply all fixes** in the source code (don't commit yet)
2. **Reply in each thread** explaining what was done (e.g., "Fixed — added retry with backoff")
3. **Resolve each thread** via the GraphQL API:
   ```bash
   # Get thread IDs
   gh api graphql -f query='
     query {
       repository(owner: "{owner}", name: "{repo}") {
         pullRequest(number: {number}) {
           reviewThreads(first: 100) {
             nodes {
               id
               isResolved
               comments(first: 1) {
                 nodes { body }
               }
             }
           }
         }
       }
     }
   '

   # Resolve each thread
   gh api graphql -f query='
     mutation {
       resolveReviewThread(input: { threadId: "{thread_node_id}" }) {
         thread { isResolved }
       }
     }
   '
   ```
4. **Squash and force-push** — threads stay "resolved" (not "outdated") because they were resolved before the code changed

**Always reply AND resolve.** Silent fixes are not acceptable — the thread must show the conversation between Copilot's suggestion and the fix applied.

**Do NOT skip Copilot suggestions.** They are part of the readiness criteria. The `squad:pr-reviewed` label cannot be applied while unresolved Copilot comments exist.

### 7. Respond to maintainer feedback
If the upstream maintainer requests changes:
- Address the feedback (mechanical fixes only — no scope expansion)
- Re-squash to 1 commit
- Post a comment summarizing what was changed
- Push

### 8. Report status
After processing all upstream PRs, post a summary:

| PR | CI | Mergeable | Commits | Files Clean | Label | Action Taken |
|---|---|---|---|---|---|---|
| #{number} | ✅/❌ | ✅/❌ | N | ✅/❌ | 🟢/🔴 | {what you did} |

Label column: 🟢 = `squad:pr-reviewed` added/kept, 🔴 = removed or not applied.

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
- **Don't** add `squad:pr-reviewed` when any readiness check fails — remove it instead

## Readiness Gate: squad:pr-reviewed Label

After completing the maintenance loop for each upstream PR, evaluate whether it meets **all** readiness criteria. The `squad:pr-reviewed` label on the upstream PR signals to the maintainer: "this is fully ready for your review."

### Readiness criteria (ALL must be true)

| Check | How to verify |
|-------|---------------|
| CI green | All status checks in `statusCheckRollup` have `conclusion: SUCCESS` |
| Mergeable | `mergeable` is `MERGEABLE` (no conflicts) |
| Single commit | `commits` count is exactly 1 |
| Clean file list | Every file in the diff is directly related to the PR's purpose |
| Team approval | Fork PR had full team + Copilot approval before upstream was opened |
| Copilot suggestions addressed | No unresolved Copilot review threads on the upstream PR |
| No outstanding feedback | No unaddressed review comments from the upstream maintainer |

### Label logic

```bash
# Check readiness
HEALTH=$(gh pr view {number} --repo bradygaster/squad --json mergeable,statusCheckRollup,commits,reviews)

# Parse: all checks green, mergeable, 1 commit, no changes-requested reviews
ALL_GREEN=true  # set false if any check fails

if ALL_GREEN:
    # Ensure label exists on the repo
    gh label create "squad:pr-reviewed" --color "0E8A16" --description "Fully reviewed and ready for maintainer" --repo bradygaster/squad --force 2>/dev/null

    # Add label if not already present
    gh pr edit {number} --repo bradygaster/squad --add-label "squad:pr-reviewed"

else:
    # Remove label if present (PR is no longer ready)
    gh pr edit {number} --repo bradygaster/squad --remove-label "squad:pr-reviewed" 2>/dev/null
```

### When to remove the label

Remove `squad:pr-reviewed` if ANY of these happen after it was added:
- CI starts failing (new upstream changes broke something)
- Merge conflicts appear (upstream dev advanced)
- Multiple commits appear (from fix pushes — needs re-squash)
- Maintainer requests changes (feedback must be addressed first)
- Stray files detected in file audit

The label is a **live signal** — it reflects current state, not a one-time stamp. Every maintenance round re-evaluates it.
