---
name: "dina-bleed-check"
description: "Stowaway file audit and branch segregation rules for clean PRs"
domain: "PR hygiene, git workflow, branch management"
confidence: "high"
source: "extracted from diberry-squad-fork-first-pipeline"
---

## Worksurface

All bleed checks run on **diberry/squad** (the fork). The goal is to ensure feature branches contain ONLY files related to their PR, and that upstream PRs on bradygaster/squad are surgically clean.

## When to Run

- Before squashing for upstream (Step 5 of the fork pipeline)
- After any rebase that touched shared files
- Before opening any upstream PR on bradygaster/squad

## Bleed Audit

Check for stowaway files that don't belong in the PR:

- `.squad/` files (should not be in feature PRs)
- `.copilot/skills/` files (should not be in feature or upstream PRs)
- Navigation entries for a different PR
- Test expectations for a different PR
- Full-file rewrites (should be surgical edits)
- Build artifacts
- Root-level strays

If bleed is detected, fix on the feature branch before proceeding.

## Shared File Strategy

For files shared across PRs (navigation.ts, test files, CI workflows):
- **Never** make full-file changes on feature branches
- **Always** reset to dev first, then make surgical additions:
  ```bash
  git checkout origin/dev -- docs/src/navigation.ts
  # Then manually add ONLY the entries for this PR's content
  ```
- This prevents diffs that rewrite the entire file, causing merge conflicts with every other PR

## Branch Segregation Rule

**Confidence:** high (validated by 3 stowaway incidents on PR #640)

### What goes where

| Content | Target Branch |
|---------|--------------|
| Code changes for the feature/issue | Feature branch on diberry/squad |
| .squad/ state (decisions, logs, history) | diberry/squad branch |
| Skill updates (.copilot/skills/) | diberry/squad branch |
| Fork-sync results | diberry/squad branch |
| Anything not part of a specific PR's scope | diberry/squad branch |

### When on a feature branch

If you need to commit infrastructure work while on a feature branch:

1. `git stash` — save feature work
2. `git checkout diberry/squad && git pull`
3. Commit and push the infrastructure change
4. `git checkout -` — return to feature branch
5. `git stash pop` — restore feature work

### Coordinator responsibility

When dispatching agents for non-feature work while on a feature branch:

> "You are on a feature branch. Infrastructure work (.squad/, .copilot/skills/, decisions) must go to the diberry/squad branch — switch before committing."

## Upstream File Audit

Before opening an upstream PR on bradygaster/squad, audit the file list:

```bash
git diff --name-only upstream/dev..HEAD
```

Every file must be directly related to the PR's purpose:
- No `.squad/` files unless the PR specifically changes squad configuration
- No `.copilot/skills/` files — ever (these are fork-personal)
- No unrelated test fixtures, docs, or config changes

If stray files are found:
```bash
git checkout upstream/dev -- {file}  # Revert the stray file
# Then re-squash
```

## Anti-Patterns

- **Don't** commit `.squad/` files in feature PRs — repo pollution, merge conflicts
- **Don't** commit `.copilot/skills/` in upstream PRs — personal skills bleed into upstream
- **Don't** skip the bleed check — stowaways merge upstream silently
- **Don't** make full-file changes on shared files — causes merge conflicts across PRs
- **Don't** `git add .` or `git add -A` — stage only the specific files you intend
- **Don't** commit infrastructure work to feature branches — creates stowaways that contaminate PRs
- **Don't** run parallel branch checkouts in same repo without worktrees — causes working tree conflicts
