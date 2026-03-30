---
name: "upstream-dedup-check"
description: "Check for duplicate/overlapping work before targeting bradygaster/squad with PRs"
domain: "fork-workflow, pull-requests, upstream-sync, process-gating"
confidence: "medium"
source: "earned (Flight's audit identified 3-4 duplicate PRs wasting team effort)"
tools:
  - name: "gh"
    description: "GitHub CLI for querying PR status and commit history"
    when: "Fetch recent merged/open PRs and commits from upstream"
  - name: "git"
    description: "Version control for syncing with upstream/dev and log inspection"
    when: "Fetch upstream remote, review recent commits"
---

## Context

This project is a fork of `bradygaster/squad`. The team opens PRs upstream, but without systematizing the dedup check, we risk duplicating work Brady has already merged himself. Flight's 2026-03-28 audit found **3–4 duplicate PRs** (#641 vs #620, #642 vs #634, #636 vs #627), wasting team effort and creating maintainer noise.

This skill is a **mandatory gate**: before ANY agent starts work targeting `bradygaster/squad`, run this check. If overlap is found, STOP and report to the user before proceeding.

**Apply this skill when:**
- Opening a PR to `bradygaster/squad`
- Starting work on an issue assigned for upstream contribution
- Any code, docs, or fix intended for the fork repo

## The Check (Step-by-Step)

### 1. Sync with upstream remote

```bash
git fetch upstream
```

Ensures your local view of `upstream/dev` is current.

### 2. Scan recent merged PRs on upstream

```bash
gh pr list --repo bradygaster/squad --state merged --limit 20 --json number,title,mergedAt
```

Review the titles. Look for keywords from your proposed work: bug fixes, feature names, config changes, docs updates, etc.

### 3. Scan open PRs on upstream (including diberry)

```bash
gh pr list --repo bradygaster/squad --state open --limit 20 --json number,title,author
```

Note any PRs from `diberry` author — don't duplicate your own open work.

### 4. Scan recent commits on upstream/dev

```bash
git log --oneline upstream/dev -20
```

Read commit titles. Look for similar fixes, refactors, or features to what you're about to work on.

### 5. Check diberry's own open PRs upstream

```bash
gh pr list --repo bradygaster/squad --state open --author diberry --json number,title
```

If any of these are similar to the proposed work, coordinate or close before opening duplicates.

### 5b. Check for issues/PRs where diberry is assigned or @mentioned

```bash
# Issues assigned to diberry
gh issue list --repo bradygaster/squad --state open --assignee diberry --json number,title,labels

# Search for issues/PRs mentioning diberry (catches @mentions, review requests)
gh search issues --repo bradygaster/squad "involves:diberry" --state open --json number,title,type
```

Brady may have assigned you to an issue or @mentioned you in a PR comment asking for something specific. This is higher-priority than self-directed work — check it first and incorporate it into your plan.

### 6. Cross-reference: Decision Gate

**If ANY overlap is found (upstream OR our own work):**
- Document the overlap (example: "My PR fixes logging middleware; PR #642 by Brady already does that")
- **STOP** — do NOT proceed with the work
- Report findings to the user in clear terms (e.g., "This feature overlaps with Brady's recent commit abc1234. Propose closing our work or rebasing on his changes.")
- Let the user decide: merge upstream changes locally, close the proposed work, or proceed if the work is materially different

**Self-duplication check (our own fork):**
- Check diberry's CLOSED PRs too — a closed PR may have already solved this: `gh pr list --repo bradygaster/squad --state closed --author diberry --limit 20 --json number,title`
- Check diberry's open branches on the fork: `git branch -r --list 'origin/squad/*'` — is there already a branch for this issue/feature?
- Check diberry/squad issues: `gh issue list --repo diberry/squad --state open --json number,title --limit 20`
- If the team already built and reviewed something similar in a previous session, DO NOT rebuild it. Find the existing work and reuse or extend it.

**If NO overlap is found:**
- Proceed with the work
- Create your feature branch and start coding

## Patterns

### Pattern: Using issue context

If working from a GitHub issue:
- Read the issue to understand scope (e.g., "add new CLI flag for X")
- Use issue keywords in your PR search (search for "CLI flag" in recent PRs)
- Cross-reference with your proposed change

### Pattern: Docs and config changes

Docs and config updates are easy to duplicate. Scan for:
- README changes
- Configuration file updates (.gitignore, tsconfig.json, etc.)
- Dependency upgrades

### Pattern: Comparing commits across repos

The fork may lag upstream by several commits. Comparing commit titles alone is 70% effective; reading the actual changes on 1–2 suspicious commits is 100% effective. If unsure, inspect the upstream commit:

```bash
git show upstream/dev:{commit-sha} -- path/to/file
```

## Anti-Patterns

| What NOT to do | Why | What to do instead |
|---|---|---|
| Skip the dedup check ("we're moving fast") | Duplicates waste time and frustrate the maintainer. Flight found 3–4 already. | Always run the check — it takes 2 minutes and prevents hours of wasted work. |
| Assume the fork is source of truth | Brady may merge changes to upstream/dev directly; you won't see them unless you check. | Sync upstream remote and scan Brady's recent work every time. |
| Check only PR titles, not commit messages | PR titles can be vague; commit messages reveal intent. | Read both merged PR titles AND upstream/dev commit log. |
| Open a PR "to see if it conflicts" | Wastes Brady's review time. The dedup check is cheap; use it. | Complete the full check before opening any PR. |
| Ignore diberry's own open PRs | Easy to self-duplicate if you're not tracking what's already in flight. | Run the diberry-author-specific check to see what's pending. |
| Duplicate our own previous work | The team may have already built, reviewed, and even closed a PR for this exact thing in a prior session. Rebuilding it wastes everyone's time. | Check diberry's closed PRs, existing fork branches, and fork issues before starting ANY new work. |
| Ignore issues/PRs assigned to or mentioning diberry | Brady may have assigned work or asked for something specific — missing it means ignoring the maintainer's priorities. | Run the assigned/mentioned check (step 5b) and prioritize Brady's asks over self-directed work. |

## Examples

### Example 1: Feature overlaps with recent merge

1. You want to add a `--config` CLI flag
2. Run `gh pr list --repo bradygaster/squad --state merged --limit 20`
3. You see PR #642 "Add configuration file support" merged last week
4. Run `git show upstream/dev:HEAD -- src/cli.ts | head -50` to inspect the feature
5. It covers your proposed work
6. **Decision:** Report to user: "Brady already added config support in PR #642. We should either rebase our work on that or close."

### Example 2: No overlap found

1. You want to fix logging in the docs build
2. Scan recent PRs: no mentions of "logging" or "docs build"
3. Scan commits: no related titles
4. Check diberry's open PRs: none related to docs
5. **Decision:** No overlap. Proceed with work.

### Example 3: Open PR from diberry

1. You're about to work on TypeDoc API reference generation
2. Run `gh pr list --repo bradygaster/squad --state open --author diberry`
3. You find diberry PR #650 "Add TypeDoc API reference" still open
4. **Decision:** Coordinate with team — either wait for that PR to merge, or see if you can help close it first.

## Confidence

**Medium** — Based on Flight's confirmed audit of 3–4 duplicate PRs. The check itself is proven (Brady's repo shows clear merge history), but the team's discipline in running it consistently is the real variable. Confidence will increase as the team internalizes this gating ceremony.
