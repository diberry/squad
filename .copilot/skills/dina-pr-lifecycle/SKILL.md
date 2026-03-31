---
name: "pr-lifecycle"
description: "Label-driven PR pipeline: one stage per Ralph round, context-safe chaining"
domain: "PR workflow, code review, fork-upstream"
confidence: "low"
source: "project-dina HQ directive — context overflow fix for multi-step PR workflows"
tools:
  - name: "gh"
    description: "GitHub CLI for PR labels, reviews, and upstream operations"
    when: "Every stage transition"
---

## Context

Complex PR workflows (review + rebase + upstream) exceed a single Copilot session's
context window when attempted all at once. This skill breaks PR lifecycle into
label-driven stages. Ralph processes ONE stage per PR per round. Labels are the
state machine — the PR advances through the pipeline across multiple Ralph cycles
without requiring a mega-prompt.

## Repos & Worksurface

- **Main worksurface (where all work happens):** `diberry/squad` — this is the fork
- **Upstream (read-only unless explicitly told):** `bradygaster/squad`

All development, reviews, and iteration happen on diberry/squad. The only time you touch
bradygaster/squad is during the `squad:pr-dina-approved` and `squad:pr-upstream` stages
of this pipeline — and only after Dina has approved.

## Workflow

Work happens on the fork (diberry/squad) until the PR is ready to be opened against upstream (bradygaster/squad).

## Label State Machine

```
Non-draft PR (no lifecycle label)
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
    │  re-squash to single commit, open upstream PR
    ▼
squad:pr-upstream           ← Ralph adds after upstream PR opened
    │  (waiting for upstream merge)
    ▼
(PR closed/merged)          ← Remove all squad:pr-* labels
```

## Ralph's PR Scan (every round)

When Ralph scans for work, check PRs in this order:

### 1. Find PRs needing lifecycle labels
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
  - **File audit:** Review every file in the diff (`git diff --name-only upstream/dev..HEAD`). Remove any files that are NOT directly related to the PR's purpose:
    - No `.squad/` files unless the PR specifically changes squad configuration
    - No `.copilot/skills/` files unless the PR is about skills
    - No unrelated test fixtures, docs, or config changes that crept in during development
    - If stray files are found, use `git checkout upstream/dev -- {file}` to revert them, then re-squash
  - If any check fails, fix and re-squash before proceeding
- Open upstream PR on bradygaster/squad targeting dev. The upstream PR must include:
  - **Full PR description** from the fork PR (copy it verbatim, don't summarize the description itself)
  - **Team review summary** — a section summarizing key findings, decisions, and fixes from the team review process (who reviewed, what issues were raised, how they were resolved)
  - **Link back** to the fork PR for full review thread context
- Post comment on fork PR linking to upstream PR.
- After upstream PR opened: remove `squad:pr-dina-approved`, add `squad:pr-upstream`

**Stage: squad:pr-upstream**
- This stage manages the upstream PR on bradygaster/squad. We do NOT control labels on that repo — validation is done by inspecting the PR directly.
- Every round, check the upstream PR state:
  ```bash
  gh pr view {upstream-number} --repo bradygaster/squad --json state,mergeable,statusCheckRollup,commits
  ```
- **CI check:** If any status checks are failing, diagnose and fix. Rebase, fix broken tests, push until all checks pass. Do not wait for maintainer review while CI is red.
- **Merge conflicts:** If `mergeable` is `CONFLICTING`, rebase against bradygaster/squad dev, resolve conflicts, re-squash to a single commit, and force-push.
- **Commit count:** If more than 1 commit (from fix pushes), squash back to a single commit and force-push.
- **File audit:** Every round, verify no stray files have crept in. Run `gh pr view {upstream-number} --repo bradygaster/squad --json files --jq '.files[].path'` and confirm every file is directly relevant to the PR. Remove any that aren't.
- **Upstream reviewer feedback:** If the upstream maintainer requests changes, address them, re-squash to 1 commit, and push. Post a comment summarizing what was changed.
- **Ready state:** PR is ready when: CI green + mergeable + single commit + clean file list + no outstanding change requests. Skip until maintainer merges.
- If merged: close fork PR, remove all `squad:pr-*` labels, close linked issue.

## Label Commands

```bash
# Add a lifecycle label
gh pr edit {number} --add-label "squad:pr-needs-preparation"

# Transition: remove old, add new
gh pr edit {number} --remove-label "squad:pr-needs-preparation" --add-label "squad:pr-needs-review"
gh pr edit {number} --remove-label "squad:pr-needs-review" --add-label "squad:pr-reviewed"
gh pr edit {number} --remove-label "squad:pr-reviewed" --add-label "squad:pr-dina-approved"
gh pr edit {number} --remove-label "squad:pr-dina-approved" --add-label "squad:pr-upstream"

# Clean up after completion
gh pr edit {number} --remove-label "squad:pr-upstream"
```

## Rules

1. **ONE stage per PR per round.** Never do preparation + review + upstream in one session.
2. **Labels are the state.** If Ralph crashes mid-stage, the label stays and Ralph retries next round.
3. **Skip PRs at stages you can't complete.** If rebase has unresolvable conflicts, post a comment and leave the label (don't advance).
4. **Draft PRs are excluded.** Only non-draft PRs enter the pipeline.
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
- If blocked on upstream maintainer (at `squad:pr-upstream` with CI green), Ralph checks once per round silently — no repeated comments.

## Label Setup

These labels must exist on diberry/squad. Create them if missing:

```bash
gh label create "squad:pr-needs-preparation" --color "FBCA04" --description "PR lifecycle: needs rebase and squash" --force
gh label create "squad:pr-needs-review" --color "FBCA04" --description "PR lifecycle: awaiting team review" --force
gh label create "squad:pr-reviewed" --color "0E8A16" --description "PR lifecycle: team approved, awaiting Dina" --force
gh label create "squad:pr-dina-approved" --color "0E8A16" --description "PR lifecycle: Dina approved, ready for upstream" --force
gh label create "squad:pr-upstream" --color "1D76DB" --description "PR lifecycle: upstream PR opened" --force
```

## Fork vs Non-Fork Repos

| Repo type | Stages used |
|-----------|-------------|
| Fork (e.g., diberry/squad → bradygaster/squad) | All stages including preparation, upstream rebase, and squad:pr-upstream |
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
