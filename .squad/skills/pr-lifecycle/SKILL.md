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

## Label State Machine

```
Non-draft PR (no lifecycle label)
    │
    ▼
squad:pr-needs-review     ← Ralph adds this when scanning non-draft PRs
    │  Ralph round: post team comment reviews
    ▼
squad:pr-reviewed         ← Ralph adds after all reviews posted
    │  Ralph round: rebase against dev
    ▼
squad:pr-rebased          ← Ralph adds after successful rebase
    │  Ralph round: follow fork-first-pipeline Steps 6-7
    ▼
squad:pr-upstream         ← Ralph adds after upstream PR opened
    │  (waiting for upstream merge)
    ▼
(PR closed/merged)        ← Remove all squad:pr-* labels
```

## Ralph's PR Scan (every round)

When Ralph scans for work, check PRs in this order:

### 1. Find PRs needing lifecycle labels
```bash
# Non-draft PRs with no squad:pr-* label = new to pipeline
gh pr list --state open --json number,title,labels,isDraft \
  --jq '[.[] | select(.isDraft == false) | select((.labels | map(.name) | any(startswith("squad:pr-"))) | not)]'
```
For each: add `squad:pr-needs-review` label.

### 2. Process PRs at each stage (ONE stage per PR per round)

**Stage: squad:pr-needs-review**
- Read the PR diff (use `gh pr diff {number}`)
- Post a comment review covering: architecture, code quality, test coverage, edge cases
- After review posted: remove `squad:pr-needs-review`, add `squad:pr-reviewed`

**Stage: squad:pr-reviewed**
- Rebase the PR branch against dev: `git rebase origin/dev`
- Push rebased branch: `git push --force-with-lease`
- After rebase: remove `squad:pr-reviewed`, add `squad:pr-rebased`

**Stage: squad:pr-rebased**
- Read `.copilot/skills/diberry-squad-fork-first-pipeline/SKILL.md` Steps 6-7
- Squash if needed, open upstream PR on bradygaster/squad
- After upstream PR opened: remove `squad:pr-rebased`, add `squad:pr-upstream`
- Post comment on fork PR linking to upstream PR

**Stage: squad:pr-upstream**
- Check if upstream PR is merged: `gh pr view {upstream-number} --repo bradygaster/squad --json state`
- If merged: close fork PR, remove all `squad:pr-*` labels, close linked issue
- If not merged: skip (waiting for upstream maintainer)

## Label Commands

```bash
# Add a lifecycle label
gh pr edit {number} --add-label "squad:pr-needs-review"

# Transition: remove old, add new
gh pr edit {number} --remove-label "squad:pr-needs-review" --add-label "squad:pr-reviewed"

# Clean up after completion
gh pr edit {number} --remove-label "squad:pr-upstream"
```

## Rules

1. **ONE stage per PR per round.** Never do review + rebase + upstream in one session.
2. **Labels are the state.** If Ralph crashes mid-stage, the label stays and Ralph retries next round.
3. **Skip PRs at stages you can't complete.** If rebase has conflicts, post a comment and leave the label (don't advance).
4. **Draft PRs are excluded.** Only non-draft PRs enter the pipeline.
5. **Multiple PRs advance in parallel.** If 3 PRs are at different stages, do all 3 (one stage each) in the same round.

## Fork vs Non-Fork Repos

| Repo type | Stages used |
|-----------|-------------|
| Fork (e.g., diberry/squad → bradygaster/squad) | All stages including squad:pr-rebased and squad:pr-upstream |
| Own repo (e.g., diberry/cosmos-plus-ai-squad) | Skip rebase and upstream stages — go from squad:pr-reviewed directly to merge |

Ralph should check if the repo has a fork-first-pipeline skill. If yes, use full pipeline. If no, skip to merge after review.

## Anti-Patterns

- **Don't** attempt all stages in one Ralph round (context overflow)
- **Don't** remove labels before completing the stage (lose state on crash)
- **Don't** skip the label scan (PRs without labels won't be found)
- **Don't** add multiple lifecycle labels to one PR (ambiguous state)
