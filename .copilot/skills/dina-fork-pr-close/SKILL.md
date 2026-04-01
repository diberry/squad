---
name: "dina-fork-pr-close"
description: "Auto-close fork PRs on diberry/squad when the corresponding upstream PR is opened on bradygaster/squad"
domain: "PR workflow, fork management"
confidence: "high"
source: "Dina directive — fork PRs are staging vehicles, not permanent artifacts"
---

## Worksurface

- **Fork (where PRs get closed):** `diberry/squad`
- **Upstream (where PRs get opened):** `bradygaster/squad`

## Purpose

Fork PRs on diberry/squad are staging vehicles for iteration. Once an upstream PR is opened on bradygaster/squad with the same squashed commit, the fork PR has served its purpose and should be closed. Leaving stale fork PRs open creates confusion about what's active.

## When to Run

- Immediately after opening an upstream PR on bradygaster/squad (during the `squad:pr-dina-approved` stage of `dina-pr-lifecycle`)
- On-demand when Dina asks to clean up fork PRs

## Close Procedure

### 1. After opening an upstream PR

When you open a PR on bradygaster/squad, immediately close the corresponding fork PR:

```bash
# Post a comment linking to the upstream PR
gh pr comment {fork-pr-number} --repo diberry/squad --body "Upstream PR opened: https://github.com/bradygaster/squad/pull/{upstream-pr-number}

This fork PR has been promoted to upstream. Closing this staging PR.

## Summary
- Fork PR: #{fork-pr-number}
- Upstream PR: bradygaster/squad#{upstream-pr-number}
- Status: Upstream PR is open and ready for maintainer review"

# Close the fork PR (do NOT merge — just close)
gh pr close {fork-pr-number} --repo diberry/squad --comment "Closed: promoted to upstream PR bradygaster/squad#{upstream-pr-number}"

# Remove all squad:pr-* labels
gh pr edit {fork-pr-number} --repo diberry/squad --remove-label "squad:pr-dina-approved"
```

### 2. Scan for orphaned fork PRs

Periodically check for fork PRs that have corresponding upstream PRs but weren't closed:

```bash
# Find open fork PRs that reference upstream PRs in comments but are still open
gh pr list --repo diberry/squad --state open --json number,title,body --jq '[.[] | select(.body | test("bradygaster/squad/pull"))]'

# For each, check if the upstream PR is still open or already merged
# If merged: close fork PR, remove labels, close linked issue
```

### 3. Bulk cleanup

When Dina asks to clean up:

```bash
# Find fork PRs that reference upstream PRs in their comments
gh pr list --repo diberry/squad --state open --json number,title,comments --jq '.[] | select(.comments | length > 0)'

# Cross-reference against bradygaster/squad PRs
gh pr list --repo bradygaster/squad --state all --author diberry --json number,title,state
```

## What Gets Preserved

When closing a fork PR:
- **Keep the branch** — don't delete it, in case upstream PR needs fixes
- **Keep all comments and reviews** — they're the review history
- **Link to upstream** — always comment with the upstream PR URL before closing

## What Triggers Re-opening

A closed fork PR should only be re-opened if:
- The upstream PR is rejected and needs major rework
- Dina explicitly asks to re-open it
- The upstream PR is closed without merging

## Integration with dina-pr-lifecycle

This skill runs during the `squad:pr-dina-approved` stage:

Open upstream PR → close fork PR → track upstream PR via `dina-upstream-pr-maintenance`

No lifecycle labels are added to bradygaster/squad. The only upstream label is `squad:pr-reviewed` (managed by the readiness gate).

## Anti-Patterns

- **Don't** merge the fork PR — close it. Merging creates unnecessary merge commits on dev.
- **Don't** delete the fork branch after closing — you may need it for upstream fixes.
- **Don't** close without linking to the upstream PR — reviewers lose traceability.
- **Don't** re-open fork PRs for minor upstream fixes — push directly to the upstream PR branch.
