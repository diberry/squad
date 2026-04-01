---
name: "dina-issue-to-pr"
description: "Pick up an issue, plan, implement with TDD, and open a draft PR on diberry/squad"
domain: "issue management, implementation, TDD, PR workflow"
confidence: "high"
source: "Dina directive — automate the issue-to-draft-PR transition"
---

## Worksurface

All work happens on **diberry/squad** (the fork). This skill covers everything from picking up an issue to opening a draft PR. Once the draft PR is open, `dina-pr-lifecycle` takes over (auto-promotion → pipeline).

## When to Use

- When Ralph scans for work and finds open issues with no linked PR
- When Dina assigns an issue to the squad
- When starting any new feature, fix, or docs work

## Pre-Work Checks

Before writing any code, run these checks:

### 1. Dedup check
Run `dina-dedup-check` to verify the work hasn't already been done upstream:
```bash
gh pr list --repo bradygaster/squad --state merged --limit 20 --json number,title
git log --oneline upstream/dev -20
gh pr list --repo bradygaster/squad --state open --author diberry --json number,title
```
If overlap found, STOP and report to Dina.

### 2. Sync dev
Run `dina-dev-sync` to ensure dev is current with upstream:
```bash
git fetch upstream dev
git checkout dev
git merge --ff-only upstream/dev && git push origin dev
```

### 3. Check for existing branch/PR
Don't duplicate work already in progress:
```bash
# Check for existing branch for this issue
git branch -r --list "origin/squad/{issue-number}-*"
# Check for existing PR
gh pr list --repo diberry/squad --state open --json number,title --jq '.[] | select(.title | test("#{issue-number}"))'
```
If a branch or PR already exists, pick it up instead of starting fresh.

## Implementation Flow

### 1. Create branch

Branch from latest dev:
```bash
git checkout dev
git checkout -b squad/{issue-number}-{kebab-slug}
```

Branch name must follow convention: `squad/{issue-number}-{kebab-slug}`
Example: `squad/84-fix-config-version`

### 2. Plan the work

Before coding, understand the scope:
- Read the issue description and any linked issues
- Identify which files need to change
- Determine the scope prefix (`dina-pr-naming`): `feat(sdk):`, `fix(cli):`, `devops(ci):`, etc.
- If the issue is unclear, comment on it asking for clarification — don't guess

### 3. Implement with TDD

Follow test-driven development:
1. **Write failing test(s)** that define the expected behavior
2. **Implement the fix/feature** to make tests pass
3. **Refactor** if needed while keeping tests green

Use additive commits during implementation — don't squash yet:
```bash
git commit -m "test: add failing test for config version stamping"
git commit -m "fix(cli): stamp config version during upgrade"
git commit -m "test: add edge case for missing config file"
```

### 4. Run preflight

Before opening the PR:
```bash
npm run build && npm test
```
This is not optional. If tests fail, fix them.

### 5. Push and open draft PR

```bash
git push origin squad/{issue-number}-{kebab-slug}
gh pr create --base dev --draft --title "{scope}: {description}" --body "Closes #{issue-number}

## Summary
{what this PR does}

## Changes
{list of changes}

## Preflight
- [x] \`npm run build\` — passes
- [x] \`npm test\` — passes (N suites, N tests)
"
```

**Draft PR requirements:**
- Title uses `dina-pr-naming` convention: `type(scope): description`
- Body references the linked issue: `Closes #{issue-number}`
- Preflight section with test results
- Changeset file included (`.changeset/*.md`) if the change affects the published package

### 6. Create changeset (if needed)

If the PR changes SDK or CLI code that ships to customers:
```bash
npx changeset
# Select the affected packages
# Choose the semver bump level (patch/minor/major)
# Write a summary
git add .changeset/ && git commit -m "chore: add changeset"
```

Skip changesets for devops/docs-only changes.

## After Draft PR is Open

Once the draft PR is open, the pipeline takes over automatically:

1. **Ralph's Step 0** scans draft PRs each round
2. If CI green + linked issue + has commits → Ralph undrafts and adds `squad:pr-needs-preparation`
3. Pipeline proceeds per `dina-pr-lifecycle`

You don't need to manually undraft or add labels.

## Issue Discovery

Ralph should scan for workable issues each round:
```bash
# Open issues with no linked PR
gh issue list --repo diberry/squad --state open --json number,title,labels \
  --jq '[.[] | select(.labels | map(.name) | any(test("squad:archive")) | not)]'

# Cross-reference with open PRs to find issues with no PR yet
gh pr list --repo diberry/squad --state all --json number,title,body \
  --jq '[.[] | .body] | join("\n")' | grep -oP "Closes #\K\d+"
```

Prioritize by labels:
1. `priority:p0` — blocking release
2. `priority:p1` — this sprint
3. `priority:p2` — next sprint
4. No priority label — backlog

## Anti-Patterns

- **Don't** start coding without running the dedup check — may duplicate upstream work
- **Don't** branch from a stale dev — always sync dev first
- **Don't** open a non-draft PR — always start as draft, let the pipeline promote it
- **Don't** skip TDD — write tests before or alongside the implementation
- **Don't** skip the preflight — `npm run build && npm test` before opening the PR
- **Don't** forget the linked issue — `Closes #N` in the PR body is required for auto-promotion
- **Don't** squash during implementation — use additive commits, squash happens at `squad:pr-needs-preparation`
