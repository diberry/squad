---
name: "dina-fork-pipeline"
description: "Core fork-first PR pipeline: 9 steps from branch to upstream merge"
domain: "PR workflow, fork-workflow, upstream-sync"
confidence: "high"
source: "consolidated from diberry-squad-fork-first-pipeline"
tools:
  - name: "gh"
    description: "GitHub CLI for PR creation, status, and upstream operations"
    when: "Fork PR creation, upstream PR creation, PR status checks"
  - name: "git"
    description: "Version control for branching, rebasing, squashing"
    when: "Branch management, rebase, squash, push"
---

## Worksurface

- **Main worksurface (where all work happens):** `diberry/squad` — this is the fork. All development, reviews, branching, and iteration happen here.
- **Upstream (read-only unless explicitly told):** `bradygaster/squad` — only touched during Step 8 (UPSTREAM) after the full pipeline is complete and Dina has approved. Never push to upstream without explicit instruction.

## Protected Branches (never enter the PR pipeline)

These branches are **infrastructure branches** on diberry/squad. They are NOT feature branches. They must NEVER:
- Be opened as PRs (not to dev, not to bradygaster/squad)
- Enter the `squad:pr-*` label pipeline
- Be squashed, rebased against dev, or merged

| Branch | Purpose |
|--------|---------|
| `diberry/squad` | Dina's personal state branch — skills, decisions, squad config. Merged only to itself. |

Any branch prefixed with `diberry/` is a personal/infrastructure branch. The PR pipeline only applies to `squad/*` branches.

## Pipeline Overview

```
TRIAGE → BRANCH → FORK PR → PREFLIGHT → REVIEW → FIX → BLEED CHECK → CLEAN → DEDUP CHECK → UPSTREAM → DONE
```

Each step maps to a label in `dina-pr-lifecycle`:

| Steps | Lifecycle Label | Details |
|---|---|---|
| TRIAGE | `go:needs-research` → `go:yes` | Investigate issue, verdict, approve or reject |
| ISSUE PICKUP | (no PR yet, `go:yes` required) | Dedup, sync dev, plan (`dina-issue-to-pr`) |
| BRANCH + FORK PR | (draft, no label) | Create branch, implement with TDD, open draft PR |
| (auto-promotion) | (draft → undrafted) | Ralph promotes when CI green + linked issue |
| PREFLIGHT + REBASE | `squad:pr-needs-preparation` | Rebase, squash, CI green, naming check |
| REVIEW + FIX | `squad:pr-needs-review` | Full team + Copilot review, iterate on all feedback |
| (human gate) | `squad:pr-reviewed` | Dina reviews, team waits |
| CLEAN + DEDUP + UPSTREAM | `squad:pr-dina-approved` | Preflight, file audit, dedup, open upstream, close fork PR |
| DONE | Fork PR closed | Upstream tracked by `dina-upstream-pr-maintenance` |

For detailed guidance, see companion skills:
- `dina-pr-lifecycle` — Label-driven state machine for PR progression
- `dina-review-protocol` — Review gates, lockout rules, migration PR protocol
- `dina-bleed-check` — Stowaway file audit, branch segregation, branch cleanup
- `dina-dedup-check` — Upstream dedup gate before opening upstream PR
- `dina-fork-sync` — Layered sync model for keeping fork current with upstream
- `dina-pr-naming` — Product vs devops scope prefixes
- `dina-issue-to-pr` — Issue pickup, dedup, TDD implementation, draft PR creation

## Step 0: TRIAGE (go: verdict gate)

Before any issue enters the pipeline, it must pass the verdict gate. See `dina-issue-to-pr` → **Verdict Gate** for the full process.

**Ralph's two loops each round:**

1. **Research loop** — scan `go:needs-research` issues, investigate, post findings, apply `go:yes` or `go:no`
2. **Build loop** — scan `go:yes` issues with no linked PR, pick up and implement

```bash
# Research loop: issues needing investigation
gh issue list --repo diberry/squad --state open --label "go:needs-research" --json number,title,labels \
  --jq '[.[] | select(.labels | map(.name) | any(test("squad:archive")) | not)]'

# Build loop: approved issues with no PR
gh issue list --repo diberry/squad --state open --label "go:yes" --json number,title,labels \
  --jq '[.[] | select(.labels | map(.name) | any(test("squad:archive")) | not)]'
```

**Verdict labels** (`go:` namespace — mutually exclusive):
| Label | Color | Meaning |
|-------|-------|---------|
| `go:needs-research` | 🟡 Yellow | Needs investigation — don't code yet |
| `go:yes` | 🟢 Green | Approved — ready to implement |
| `go:no` | 🔴 Red | Rejected — skip, add `release:backlog` |

## Step 1: ISSUE PICKUP

Before creating a branch, the issue MUST have `go:yes`. Then see `dina-issue-to-pr` for the full pre-work flow:
- Run dedup check (don't duplicate upstream work)
- Sync dev with upstream
- Check for existing branches/PRs for the issue
- Plan the scope and naming convention

## Step 2: BRANCH

Create a feature branch from latest dev on diberry/squad:
```bash
git checkout dev
git checkout -b squad/{issue-number}-{slug}
```

## Step 3: FORK PR

Push to fork and open **draft** PR **against your fork's dev branch**:
```bash
git push origin {branch-name}
gh pr create --base dev --draft  # Opens on diberry/squad, not upstream
```

## Step 3.5: PREFLIGHT TEST GATE

Before requesting review, run the full build and test suite locally:

```bash
npm run build && npm test
```

This is not optional. If tests fail, fix them before requesting review.

**PR description attestation**: Add a "Preflight" section confirming tests pass:
```markdown
## Preflight
- [x] `npm run build` — passes
- [x] `npm test` — passes (N suites, N tests, Ns runtime)
```

**Migration PRs (>20 files changed)**: Include the full test output summary in the PR description.

## Step 4: REVIEW

Iterate on the fork PR with the team. See `dina-review-protocol` for the full review process including dual reviewer gate, correctness-before-completeness ordering, and migration PR protocol.

## Step 5: FIX

Address review comments. Use **additive commits** so reviewers can see what changed between iterations. Do not squash during active review.

```bash
# Good: additive commit during review
git commit -m "fix: await async storage calls per review feedback"

# Bad: squash during active review
git commit --amend --no-edit && git push --force-with-lease  # ← hides iteration
```

Squash happens later, at Step 7 (CLEAN), after review is complete.

## Step 6: BLEED CHECK

Run a bleed audit to verify no stowaway files. See `dina-bleed-check` for the full audit process.

## Step 6.5: REBASE

Before squashing for upstream, rebase the feature branch:
```bash
git fetch origin dev
git rebase origin/dev
```

If rebase has conflicts on shared files:
1. `git rebase --abort`
2. Reset shared files to dev: `git checkout origin/dev -- {file}`
3. Re-add only this PR's surgical changes
4. `git commit --amend --no-edit`
5. Continue with Step 6 CLEAN

## Step 7: CLEAN

Prepare for upstream PR:
- Squash commits into a single commit
- Clean up commit message using `dina-pr-naming` convention: `type(scope): description (#{issue})`
- Remove any `.squad/` or `.copilot/skills/` files if present (see `dina-bleed-check`)
- Check for stale TDD comments ("RED PHASE", "TODO: implement", "WIP")
- Remove double blank lines from description

## Step 7.5: DEDUP CHECK

**Mandatory gate.** See `dina-dedup-check` for the full dedup process. If overlap is found, STOP and report to Dina before proceeding.

## Step 8: UPSTREAM

Open PR on bradygaster/squad targeting dev:
```bash
gh pr create --repo bradygaster/squad --base dev --fill
gh pr ready {pr-number} --repo bradygaster/squad
```

The upstream PR is the **final presentation** — it should not remain in draft. See `dina-pr-lifecycle` for the full upstream PR requirements (description, team review summary, file audit).

## Step 9: DONE

Upstream PR is merged. See `dina-bleed-check` for the full cleanup procedure:
- Close fork PR, remove all lifecycle labels, close linked issue
- Delete the fork branch (only after upstream PR is merged)

## Pre-Upstream Gate Checklist

Before opening the upstream PR, verify:

- [ ] **Preflight tests pass**: `npm run build && npm test` run locally
- [ ] **Test attestation in PR description**: Preflight section with results
- [ ] **All reviewers approved**: Full team + Copilot approved on latest commit
- [ ] **Dina approved**: Human gate passed
- [ ] **Bleed check pass**: Zero stowaway files
- [ ] **Dedup check pass**: No overlap with upstream
- [ ] **Single commit**: Squashed to 1 commit
- [ ] **Clean file list**: Only files directly related to the PR
- [ ] **No `.squad/` or `.copilot/skills/` files**: Excluded from commit
- [ ] **Clean description**: No double blank lines, clear problem/solution

## Anti-Patterns

| Anti-Pattern | Why It Fails | Better Way |
|---|---|---|
| Open upstream PR before fork review complete | Public iteration, messy history | Complete review cycle on fork first |
| Force-push to upstream branch | Breaks links, confuses reviewers | Squash locally, push once |
| Open multiple PRs per feature | Fragmented review, merge chaos | One upstream PR per feature |
| Skip rebase before upstream | Diverged branch creates full-file diffs | Always rebase against origin/dev |
| Leave upstream PR in draft | Signals incomplete work | Undraft — it's presentation-ready |
| Skip preflight test run | Sub-2-minute run catches failures before CI round-trips | Always run `npm run build && npm test` |
| Squash-amend-force-push during review | Hides fix iteration history | Additive commits during review, squash only at merge time |

## Commit Hygiene

- **Additive commits during review**: Descriptive messages for each fix iteration
- **Squash at merge time only**: After all reviews approve, squash to 1 commit
- **Force-push safely**: Use `--force-with-lease`
- **Always verify before push**:
  ```
  git diff --cached --stat            # File count must match intent
  git diff --cached --diff-filter=D   # Zero unintended deletions
  ```

## Related Skills

- `dina-review-protocol` — Review gates and lockout rules
- `dina-bleed-check` — Stowaway file audit and branch segregation
- `dina-dedup-check` — Upstream dedup gate
- `dina-fork-sync` — Layered sync model
- `dina-pr-lifecycle` — Label-driven PR state machine
- `dina-pr-screenshots` — Visual documentation for PRs
