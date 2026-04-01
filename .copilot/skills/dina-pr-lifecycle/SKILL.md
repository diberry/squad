---
name: "pr-lifecycle"
description: "Label-driven PR pipeline: one stage per Ralph round, context-safe chaining"
domain: "PR workflow, code review, fork-upstream"
confidence: "high"
source: "project-dina HQ directive — context overflow fix for multi-step PR workflows"
tools:
  - name: "gh"
    description: "GitHub CLI for PR labels, reviews, and upstream operations"
    when: "Every stage transition"
---

## Context

All planning, implementation, TDD, code review, and iteration happen on **diberry/squad** (the fork).
By the time a PR reaches bradygaster/squad, the code is **done**. The upstream PR is a
delivery vehicle, not a workspace. The only work on the upstream side is mechanical:
CI green, clean rebase, single commit, no conflicts, no stray files.

This skill breaks the fork-side PR lifecycle into label-driven stages. Ralph processes
ONE stage per PR per round. Labels are the state machine — the PR advances through
the pipeline across multiple Ralph cycles without requiring a mega-prompt.

For upstream PR maintenance after the fork PR is closed, see `dina-upstream-pr-maintenance`.

## Repos & Worksurface

- **Main worksurface (where all work happens):** `diberry/squad` — this is the fork
- **Upstream (read-only unless explicitly told):** `bradygaster/squad`

All development, reviews, and iteration happen on diberry/squad. The only time you touch
bradygaster/squad is during the `squad:pr-dina-approved` stage when opening the upstream PR —
and only after Dina has approved. After that, `dina-upstream-pr-maintenance` handles the upstream PR.

## Workflow

Work happens on the fork (diberry/squad) until the PR is ready to be opened against upstream (bradygaster/squad).

## Label State Machine

```
Non-draft PR on diberry/squad (no lifecycle label)
    │
    ▼
squad:pr-needs-preparation  ← Ralph adds when scanning non-draft PRs
    │  Ralph round: rebase from bradygaster/squad dev,
    │  resolve merge conflicts, squash to single commit
    ▼
squad:pr-needs-review       ← Ralph adds after preparation is clean
    │  Ralph round: full team + Copilot review.
    │  Iterate on ALL feedback (including nits) until
    │  every reviewer approves. Cannot advance until
    │  the entire team has approved.
    ▼
squad:pr-reviewed           ← Ralph adds after ALL reviewers approve
    │  HUMAN GATE: Dina reviews. Ralph STOPS here.
    │  Dina adds squad:pr-dina-approved when satisfied.
    ▼
squad:pr-dina-approved      ← Dina adds manually after her review
    │  Ralph round: fresh rebase against bradygaster/squad dev,
    │  re-squash, pre-flight checks, open upstream PR,
    │  CLOSE fork PR (it's done)
    ▼
(Fork PR closed)            ← Fork PR served its purpose
                               Upstream PR maintained by dina-upstream-pr-maintenance
```

## Ralph's PR Scan (every round)

When Ralph scans for work, check PRs in this order:

### 0. Promote draft PRs that are ready

Draft PRs are staging areas for incomplete work. Ralph checks if any drafts are ready to enter the pipeline:

```bash
# Find draft PRs on squad/* branches (exclude diberry/* infrastructure branches)
gh pr list --state open --json number,title,labels,isDraft,headRefName \
  --jq '[.[] | select(.isDraft == true) | select(.headRefName | startswith("diberry/") | not)]'
```

For each draft PR, check readiness criteria:
- **CI passing:** `gh pr checks {number}` — all checks green (or no checks yet if CI hasn't run)
- **Linked issue:** PR description contains `Closes #N` or `Fixes #N`
- **At least 1 commit:** PR has code changes (not an empty shell)
- **Build compiles:** If CI has run, the build step passed

If ALL criteria are met:
```bash
# Undraft the PR
gh pr ready {number}
# Add the first lifecycle label
gh pr edit {number} --add-label "squad:pr-needs-preparation"
```

If any criteria fail, leave the PR as a draft. Don't comment — drafts are expected to be incomplete.

### 1. Find non-draft PRs needing lifecycle labels
```bash
# Non-draft PRs with no squad:pr-* label = new to pipeline
# EXCLUDE branches prefixed with diberry/ — those are infrastructure branches, not feature PRs
gh pr list --state open --json number,title,labels,isDraft,headRefName \
  --jq '[.[] | select(.isDraft == false) | select(.headRefName | startswith("diberry/") | not) | select((.labels | map(.name) | any(startswith("squad:pr-"))) | not)]'
```
For each: add `squad:pr-needs-preparation` label.

**Pipeline exclusions:** Branches prefixed with `diberry/` are personal/infrastructure branches (e.g., `diberry/squad` for Dina's state). They must NEVER enter the PR pipeline or be targeted at bradygaster/squad.

### 2. Process PRs at each stage (ONE stage per PR per round)

**Stage: squad:pr-needs-preparation**
- Fetch latest upstream: `git fetch upstream dev` (where upstream = bradygaster/squad)
- Rebase the PR branch against upstream dev: `git rebase upstream/dev`
- If merge conflicts exist, resolve them. If conflicts are too complex, post a comment describing the conflicts and leave the label in place for manual help.
- Squash all commits into a single commit with a conventional commit message: `type(scope): description (#{issue})` (e.g., `fix(cli): auto-update config version during upgrade (#84)`)
- Force-push the cleaned branch: `git push --force-with-lease`
- **Validation before advancing:**
  - **Naming convention** (see `dina-pr-naming`): PR title must have a valid scope prefix (`feat(sdk):`, `devops(ci):`, etc.). If missing, add it. If the PR mixes product and devops files, flag for splitting.
  - PR description must reference a linked issue (`Closes #N`). If missing, add it.
  - A changeset file must exist (`.changeset/*.md`). If missing, create one appropriate to the change scope.
  - Branch name must follow convention: `squad/{issue-number}-{kebab-slug}`. If not, post a comment but don't block.
  - CI must pass on the fork PR. Wait for checks to complete: `gh pr checks {number} --watch`. If CI fails, fix and re-push before advancing.
- After all validations pass: remove `squad:pr-needs-preparation`, add `squad:pr-needs-review`

**Stage: squad:pr-needs-review**
- Read the PR diff (use `gh pr diff {number}`)
- Request reviews from the full squad team AND Copilot code review
- Post a detailed review covering: architecture, code quality, test coverage, edge cases
- Address ALL feedback from every reviewer — nits, style issues, minor fixes, everything. No feedback is too small to skip.
- After fixing, re-request reviews from anyone who requested changes.
- **Note:** Force-pushes (from fixes) dismiss previous approvals. After each fix round, re-request all reviews — don't assume prior approvals still count.
- CI must remain green throughout. If fixes break CI, fix CI before re-requesting reviews.
- **Gate: every reviewer (team members + Copilot) must have an approved review on the latest commit.** Do not advance until all approvals are in.
- After all reviewers approve: remove `squad:pr-needs-review`, add `squad:pr-reviewed`

**Stage: squad:pr-reviewed** (HUMAN GATE — Ralph does NOT advance this)
- Ralph SKIPS this stage. It is waiting for Dina's review.
- Ralph posts a comment: "All team reviews approved. Waiting for Dina's review. Add `squad:pr-dina-approved` when ready to proceed."
- Dina reviews the PR and the squad's comments.
- When satisfied, Dina runs: `gh pr edit {number} --remove-label "squad:pr-reviewed" --add-label "squad:pr-dina-approved"`
- If Dina requests changes, she comments and leaves `squad:pr-reviewed` in place. Squad addresses feedback, re-requests reviews, and iterates until Dina approves.

**Stage: squad:pr-dina-approved**
- Upstream may have advanced since preparation. Do a fresh rebase against bradygaster/squad dev: `git fetch upstream dev && git rebase upstream/dev`
- If new conflicts arise, resolve them. Post a comment if manual help is needed.
- Re-squash to a single commit if the review/fix cycle added commits.
- Force-push: `git push --force-with-lease`
- **Pre-flight checks before opening upstream PR:**
  - Verify exactly 1 commit on the branch ahead of upstream/dev: `git rev-list --count upstream/dev..HEAD` must equal 1
  - Verify no merge conflicts with upstream dev: `git merge-tree $(git merge-base upstream/dev HEAD) upstream/dev HEAD` shows no conflicts
  - Run the build and tests locally to confirm CI will pass
  - **File audit** (see `dina-bleed-check` for full protocol): Review every file in the diff (`git diff --name-only upstream/dev..HEAD`). Remove any files that are NOT directly related to the PR's purpose:
    - No `.squad/` files unless the PR specifically changes squad configuration
    - No `.copilot/skills/` files — these are fork-personal and never go upstream
    - No unrelated test fixtures, docs, or config changes that crept in during development
    - If stray files are found, use `git checkout upstream/dev -- {file}` to revert them, then re-squash
  - If any check fails, fix and re-squash before proceeding
- Open upstream PR on bradygaster/squad targeting dev. The upstream PR must include:
  - **Full PR description** from the fork PR (copy it verbatim, don't summarize the description itself)
  - **Team review summary** — a section summarizing key findings, decisions, and fixes from the team review process (who reviewed, what issues were raised, how they were resolved)
  - **Link back** to the fork PR for full review thread context
  - **DO NOT add fork lifecycle labels** (`squad:pr-*`) to the upstream PR. Those are fork-only.
  - The only label allowed on upstream is `squad:pr-reviewed`, managed automatically by the readiness gate in `dina-upstream-pr-maintenance`.
- **Post team approval as a PR comment** on the upstream PR:
  ```
  ## Fork Review Complete
  
  This PR was reviewed and approved by the full team on the fork (diberry/squad#{fork-pr-number}).
  
  **Reviewers:** {list of reviewers who approved}
  **Review rounds:** {number of review iterations}
  **Key findings addressed:** {brief summary of major items fixed during review}
  
  All feedback (including nits) was addressed. CI green on fork. Ready for upstream review.
  ```
- Post comment on fork PR linking to upstream PR.
- **Close the fork PR** (see `dina-fork-pr-close`): the fork PR has served its purpose. Do NOT merge — just close. Keep the branch for potential upstream fixes.
- Remove all `squad:pr-*` labels from the fork PR.
- Upstream PR is now tracked by `dina-upstream-pr-maintenance` — no lifecycle label needed on the closed fork PR.

**Stage: squad:pr-upstream** — REMOVED

Upstream PR maintenance is handled by `dina-upstream-pr-maintenance`, not by this pipeline.
Once the fork PR is closed and the upstream PR is opened, this pipeline is complete.

## Stage Mapping

The `dina-fork-pipeline` skill uses step names; this skill uses label names. Here's the mapping:

| Fork Pipeline Step | Lifecycle Label | What happens |
|---|---|---|
| BRANCH + FORK PR | (draft, no label) | Create branch, open draft PR |
| (auto-promotion) | (draft → undrafted) | Ralph promotes when CI green + linked issue |
| PREFLIGHT + REBASE | `squad:pr-needs-preparation` | Rebase, squash, CI green, naming check |
| REVIEW + FIX | `squad:pr-needs-review` | Full team + Copilot review, iterate on all feedback |
| (human gate) | `squad:pr-reviewed` | Dina reviews, team waits |
| CLEAN + DEDUP + UPSTREAM | `squad:pr-dina-approved` | Preflight, file audit, dedup, open upstream, close fork PR |
| (post-pipeline) | — | Tracked by `dina-upstream-pr-maintenance` |

## Label Commands

```bash
# Add a lifecycle label
gh pr edit {number} --add-label "squad:pr-needs-preparation"

# Transition: remove old, add new
gh pr edit {number} --remove-label "squad:pr-needs-preparation" --add-label "squad:pr-needs-review"
gh pr edit {number} --remove-label "squad:pr-needs-review" --add-label "squad:pr-reviewed"
gh pr edit {number} --remove-label "squad:pr-reviewed" --add-label "squad:pr-dina-approved"

# Final transition: close fork PR after upstream opens (see dina-fork-pr-close)
gh pr close {number} --comment "Promoted to upstream PR bradygaster/squad#{upstream-number}"
```

## Rules

1. **ONE stage per PR per round.** Never do preparation + review + upstream in one session.
2. **Labels are the state.** If Ralph crashes mid-stage, the label stays and Ralph retries next round.
3. **Skip PRs at stages you can't complete.** If rebase has unresolvable conflicts, post a comment and leave the label (don't advance).
4. **Draft PRs are auto-promoted.** Ralph checks drafts for readiness (CI green, linked issue, has commits). Ready drafts are undrafted and enter the pipeline. Incomplete drafts stay as drafts.
5. **Multiple PRs advance in parallel.** If 3 PRs are at different stages, do all 3 (one stage each) in the same round.
6. **All feedback must be addressed.** During review, every comment — including nits — must be fixed before advancing. No exceptions.
7. **All reviewers must approve.** The PR cannot leave `squad:pr-needs-review` until every team member and Copilot have approved on the latest commit.
8. **CI must be green at every gate.** Never advance a PR to the next stage if CI is failing.
9. **Never merge upstream PRs.** Ralph opens and maintains the upstream PR. Only the upstream maintainer merges. Dina may explicitly override this with "merge it".

## Rollback & Rejection

If a PR needs to go backward (e.g., scope change, Dina rejects after review, upstream maintainer requests major rework):

- **Dina rejects at reviewed stage:** Leave `squad:pr-reviewed`, post changes needed. Squad fixes, re-requests reviews from team. If team re-approves, Dina re-reviews.
- **Scope change during review:** Move back to preparation — remove current label, add `squad:pr-needs-preparation`. This triggers a fresh rebase and re-squash.
- **Upstream maintainer requests major rework:** Fix on the fork branch, push to upstream PR. If changes are large enough to warrant re-review, Dina may move the fork PR back to `squad:pr-needs-review`.
- **Abandoning a PR:** Remove all `squad:pr-*` labels, close the PR, post a comment explaining why.

## Stale PR Handling

- If a PR has been at the same stage for more than 3 Ralph rounds with no progress, Ralph posts a status comment: "PR #{number} has been at `{label}` for {N} rounds. Blocker: {reason}."
- If blocked on Dina (at `squad:pr-reviewed`), Ralph reminds once then stops nagging.

## Label Setup

These labels must exist on **diberry/squad only**. Never create these on bradygaster/squad.

```bash
gh label create "squad:pr-needs-preparation" --color "FBCA04" --description "PR lifecycle: needs rebase and squash" --repo diberry/squad --force
gh label create "squad:pr-needs-review" --color "FBCA04" --description "PR lifecycle: awaiting team review" --repo diberry/squad --force
gh label create "squad:pr-reviewed" --color "0E8A16" --description "PR lifecycle: team approved, awaiting Dina" --repo diberry/squad --force
gh label create "squad:pr-dina-approved" --color "0E8A16" --description "PR lifecycle: Dina approved, ready for upstream" --repo diberry/squad --force
```

The only label that belongs on bradygaster/squad is `squad:pr-reviewed` (managed by `dina-upstream-pr-maintenance` readiness gate).

## Fork vs Non-Fork Repos

| Repo type | Stages used |
|-----------|-------------|
| Fork (e.g., diberry/squad → bradygaster/squad) | All stages: preparation → review → reviewed → dina-approved → close fork PR + open upstream |
| Own repo (e.g., diberry/cosmos-plus-ai-squad) | Skip preparation rebase and upstream stages — go from squad:pr-reviewed directly to merge |

Ralph should check if the repo has a fork-first-pipeline skill. If yes, use full pipeline. If no, skip to merge after review.

## Anti-Patterns

- **Don't** attempt all stages in one Ralph round (context overflow)
- **Don't** remove labels before completing the stage (lose state on crash)
- **Don't** skip the label scan (PRs without labels won't be found)
- **Don't** add multiple lifecycle labels to one PR (ambiguous state)
- **Don't** advance past review with unresolved feedback or missing approvals
- **Don't** skip the preparation rebase — PRs must be conflict-free and squashed before review
- **Don't** advance any stage while CI is red on the fork PR
- **Don't** open an upstream PR with multiple commits — always squash to 1
- **Don't** merge upstream PRs — only the maintainer merges (unless Dina says "merge it")
- **Don't** assume stale approvals count after force-push — re-request reviews
- **Don't** open a PR without a linked issue and changeset
