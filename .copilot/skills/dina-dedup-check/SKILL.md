---
name: "dina-dedup-check"
description: "Mandatory upstream dedup gate before opening PRs on bradygaster/squad"
domain: "upstream-sync, process-gating, PR workflow"
confidence: "medium"
source: "extracted from diberry-squad-fork-first-pipeline"
---

## Worksurface

This check runs on **diberry/squad** (the fork) by querying bradygaster/squad remotely. You never need to check out or push to upstream to perform this check.

## When to Run

> **This is a mandatory gate.** Before ANY work targeting `bradygaster/squad`, run this check. If overlap is found, STOP and report to Dina before proceeding.

- Before opening a PR to bradygaster/squad
- Before starting work on an issue assigned for upstream contribution
- Any code, docs, or fix intended for the upstream repo

## The Check (Step-by-Step)

### 1. Sync with upstream remote

```bash
git fetch upstream
```

### 2. Scan recent merged PRs on upstream

```bash
gh pr list --repo bradygaster/squad --state merged --limit 20 --json number,title,mergedAt
```

Review the titles. Look for keywords from your proposed work.

### 3. Scan open PRs on upstream

```bash
gh pr list --repo bradygaster/squad --state open --limit 20 --json number,title,author
```

Note any PRs from `diberry` — don't duplicate your own open work.

### 4. Scan recent commits on upstream/dev

```bash
git log --oneline upstream/dev -20
```

Read commit titles. Look for similar fixes, refactors, or features.

### 5. Check diberry's own open PRs upstream

```bash
gh pr list --repo bradygaster/squad --state open --author diberry --json number,title
```

### 5b. Check for issues/PRs where diberry is assigned or @mentioned

```bash
# Issues assigned to diberry
gh issue list --repo bradygaster/squad --state open --assignee diberry --json number,title,labels

# Search for issues/PRs mentioning diberry
gh search issues --repo bradygaster/squad "involves:diberry" --state open --json number,title,type
```

Brady may have assigned work or asked for something specific — this is higher-priority than self-directed work.

### 6. Decision Gate

**If ANY overlap is found:**
- Document the overlap
- **STOP** — do NOT proceed
- Report findings to Dina clearly (e.g., "This feature overlaps with Brady's PR #642. Propose closing our work or rebasing on his changes.")
- Let Dina decide: merge upstream changes, close proposed work, or proceed if materially different

**Self-duplication check (our own fork):**
- Check diberry's CLOSED PRs: `gh pr list --repo bradygaster/squad --state closed --author diberry --limit 20 --json number,title`
- Check diberry's fork branches: `git branch -r --list 'origin/squad/*'`
- Check diberry/squad issues: `gh issue list --repo diberry/squad --state open --json number,title --limit 20`
- If similar work exists from a previous session, DO NOT rebuild it. Find and reuse it.

**If NO overlap:** Proceed with the work.

## Patterns

### Using issue context
If working from a GitHub issue, use issue keywords in your PR search to cross-reference.

### Docs and config changes
Easy to duplicate. Scan for README changes, config file updates, dependency upgrades.

### Comparing commits across repos
PR titles can be vague — reading 1-2 suspicious commits is 100% effective:
```bash
git show upstream/dev:{commit-sha} -- path/to/file
```

## Anti-Patterns

- **Don't** skip the check ("we're moving fast") — Flight found 3-4 duplicates already
- **Don't** assume the fork is source of truth — Brady may merge changes directly to upstream/dev
- **Don't** check only PR titles — read both merged PR titles AND commit log
- **Don't** open a PR "to see if it conflicts" — the dedup check is cheap, use it
- **Don't** ignore diberry's own open PRs — easy to self-duplicate
- **Don't** rebuild previous work — check closed PRs, existing branches, and fork issues first
- **Don't** ignore assigned/mentioned issues — Brady's asks are higher priority than self-directed work
