---
name: "diberry-squad-fork-first-pipeline"
description: "Master fork workflow: 9-step PR pipeline with upstream dedup gating and layered fork sync"
domain: "PR workflow, cross-fork collaboration, fork-workflow, pull-requests, upstream-sync, process-gating, git-workflow, fork-management"
confidence: "high"
source: "consolidated from fork-first-pipeline, upstream-dedup-check, and fork-sync skills"
tools:
  - name: "gh"
    description: "GitHub CLI for querying PR status, commit history, and creating PRs"
    when: "Fetch recent merged/open PRs, commits from upstream, create fork/upstream PRs"
  - name: "git"
    description: "Version control for branching, syncing, rebasing, and committing"
    when: "Branch management, upstream sync, rebase, bleed check, fork sync"
---

# Fork-First PR Pipeline

## Confidence
High

## Domain
PR workflow, cross-fork collaboration, fork-workflow, upstream-sync, process-gating, fork-management

## Problem Statement
PRs opened directly on the upstream repository get messy iteration in public. Code review feedback creates visible churn. Force-push history is exposed. This workflow keeps development clean by staging changes on the fork first, then opening a single clean upstream PR after review is complete.

Additionally, without systematic dedup checking, the team risks duplicating work the upstream maintainer has already merged. And without a layered sync model, fork `.squad/` config drifts from upstream over time.

This consolidated skill covers the full fork workflow lifecycle: pipeline, dedup gating, and sync maintenance.

## 9-Step Pipeline

```
BRANCH → FORK PR → PREFLIGHT → REVIEW → FIX → BLEED CHECK → CLEAN → DEDUP CHECK → UPSTREAM → DONE
```

### Step 1: BRANCH
Create a feature branch locally:
```bash
git checkout -b squad/{issue-number}-{slug}
```

### Step 2: FORK PR
Push to fork and open PR **against your fork's dev branch**:
```bash
git push origin {branch-name}
gh pr create --base dev --draft  # Opens on fork/dev, not upstream
```

### Step 2.5: PREFLIGHT TEST GATE

Before requesting review, the author **MUST** run the full build and test suite locally:

```bash
npm run build && npm test
```

This is not optional for any PR. If tests fail, fix them before requesting review.

**PR description attestation**: Add a "Preflight" section to the PR description confirming tests pass:
```markdown
## Preflight
- [x] `npm run build` — passes
- [x] `npm test` — passes (N suites, N tests, Ns runtime)
```

**Migration PRs (>20 files changed)**: Include the full test output summary (suite count, pass/fail counts, total runtime) in the PR description. This prevents the "approved but broken" pattern where reviewers check ecosystem completeness without verifying functional correctness.

The 89-second test run is cheaper than one CI round-trip. Always run it locally.

### Step 3: REVIEW
Iterate on the fork PR with teammates. Collect feedback via review comments. This happens in your fork, not upstream.

#### Correctness Before Completeness
Reviews **MUST** follow this order:
1. **Functional correctness first** — Do tests pass? Does `npm run build && npm test` succeed? If not, stop here. Do not review ecosystem items on broken code.
2. **Mechanical correctness** — Are all callsites updated? Are string literals consistent? Are async/await signatures correct throughout?
3. **Ecosystem completeness last** — Docs, changelog, exports, navigation entries.

If tests fail at step 1, the review verdict is **NEEDS FIXES** with a single finding: "Tests must pass before review can proceed." Do not spend reviewer time evaluating docs or changelog on code that doesn't build.

### Step 4: FIX
Address review comments. Use **additive commits** so reviewers can see what changed between iterations. Do not squash-amend-force-push during active review — this hides fix iteration history and makes re-review impossible.

```bash
# Good: additive commit during review
git commit -m "fix: await async storage calls per review feedback"

# Bad: squash during active review
git commit --amend --no-edit && git push --force-with-lease  # ← hides iteration
```

Squash happens later, at Step 6 (CLEAN), after CI is green and review is complete.

### Step 5: BLEED CHECK
Run a bleed audit to verify no stowaway files are committed. Check for:
- `.squad/` files (should not be in app PRs)
- Navigation entries for wrong PR
- Test expectations for wrong PR
- Full-file rewrites
- Build artifacts
- Root-level strays

If bleed detected, fix on the feature branch.

### Step 5.5: REBASE
Before squashing for upstream, rebase the feature branch against `origin/dev` to avoid full-file rewrites:
```bash
git fetch origin dev
git rebase origin/dev
```

#### Shared File Strategy
For files shared across PRs (navigation.ts, test files, CI workflows):
- **Never** make full-file changes on feature branches
- **Always** reset to dev first, then make surgical additions:
  ```bash
  git checkout origin/dev -- docs/src/navigation.ts
  # Then manually add ONLY the entries for this PR's content
  ```
- This prevents diffs that rewrite the entire file, which cause merge conflicts with every other PR

#### Serial Branch Operations — Critical Rule

⚠️ **When multiple agents fix different PRs in parallel on the same physical repository (even if different branches), they all run `git checkout` in the same working tree.** This causes:
- Working tree conflicts (both agents try to update `.git/index` simultaneously)
- Commits landing on wrong branches (Agent A's commit lands on Agent B's branch)
- Race conditions (`.git/HEAD` and `.git/index` become inconsistent)

**RULE: Bleed fixes across multiple PRs must be done SERIALLY (one at a time) unless using git worktrees.** Never launch parallel agents that checkout different branches in the same repo without worktrees.

**Exception**: Use `git worktree add ../squad-195 -b squad/195-fix-issue origin/dev` to give each agent an isolated working directory.

#### When Rebase Fails
If rebase has conflicts on shared files:
1. `git rebase --abort`
2. Reset the shared files to dev: `git checkout origin/dev -- {file}`
3. Re-add only this PR's surgical changes
4. `git commit --amend --no-edit`
5. Continue with step 6 CLEAN

### Step 6: CLEAN
Prepare for upstream PR:
- Squash commits into logical units
- Clean up commit messages
- Remove any `.squad/` files if present
- Check for stale TDD comments ("RED PHASE", "TODO: implement", "WIP") that no longer apply
- Verify no `/docs/` prefix in titles
- Remove double blank lines from description

**Note on `.squad/skills/` files**: The `.squad/skills/` directory may be gitignored in some configurations. If you need to commit skill files to the fork, use `git add -f` to force them through, even if they match `.gitignore` patterns.

### Step 6.5: UPSTREAM DEDUP CHECK

> **This is a mandatory gate.** Before ANY agent starts work targeting `bradygaster/squad`, run this check. If overlap is found, STOP and report to the user before proceeding.

#### Context

This project is a fork of `bradygaster/squad`. The team opens PRs upstream, but without systematizing the dedup check, we risk duplicating work Brady has already merged himself. Flight's 2026-03-28 audit found **3–4 duplicate PRs** (#641 vs #620, #642 vs #634, #636 vs #627), wasting team effort and creating maintainer noise.

**Apply this check when:**
- Opening a PR to `bradygaster/squad`
- Starting work on an issue assigned for upstream contribution
- Any code, docs, or fix intended for the fork repo

#### The Check (Step-by-Step)

##### 1. Sync with upstream remote

```bash
git fetch upstream
```

Ensures your local view of `upstream/dev` is current.

##### 2. Scan recent merged PRs on upstream

```bash
gh pr list --repo bradygaster/squad --state merged --limit 20 --json number,title,mergedAt
```

Review the titles. Look for keywords from your proposed work: bug fixes, feature names, config changes, docs updates, etc.

##### 3. Scan open PRs on upstream (including diberry)

```bash
gh pr list --repo bradygaster/squad --state open --limit 20 --json number,title,author
```

Note any PRs from `diberry` author — don't duplicate your own open work.

##### 4. Scan recent commits on upstream/dev

```bash
git log --oneline upstream/dev -20
```

Read commit titles. Look for similar fixes, refactors, or features to what you're about to work on.

##### 5. Check diberry's own open PRs upstream

```bash
gh pr list --repo bradygaster/squad --state open --author diberry --json number,title
```

If any of these are similar to the proposed work, coordinate or close before opening duplicates.

##### 5b. Check for issues/PRs where diberry is assigned or @mentioned

```bash
# Issues assigned to diberry
gh issue list --repo bradygaster/squad --state open --assignee diberry --json number,title,labels

# Search for issues/PRs mentioning diberry (catches @mentions, review requests)
gh search issues --repo bradygaster/squad "involves:diberry" --state open --json number,title,type
```

Brady may have assigned you to an issue or @mentioned you in a PR comment asking for something specific. This is higher-priority than self-directed work — check it first and incorporate it into your plan.

##### 6. Cross-reference: Decision Gate

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

#### Dedup Patterns

##### Pattern: Using issue context

If working from a GitHub issue:
- Read the issue to understand scope (e.g., "add new CLI flag for X")
- Use issue keywords in your PR search (search for "CLI flag" in recent PRs)
- Cross-reference with your proposed change

##### Pattern: Docs and config changes

Docs and config updates are easy to duplicate. Scan for:
- README changes
- Configuration file updates (.gitignore, tsconfig.json, etc.)
- Dependency upgrades

##### Pattern: Comparing commits across repos

The fork may lag upstream by several commits. Comparing commit titles alone is 70% effective; reading the actual changes on 1–2 suspicious commits is 100% effective. If unsure, inspect the upstream commit:

```bash
git show upstream/dev:{commit-sha} -- path/to/file
```

#### Dedup Examples

**Example 1: Feature overlaps with recent merge**

1. You want to add a `--config` CLI flag
2. Run `gh pr list --repo bradygaster/squad --state merged --limit 20`
3. You see PR #642 "Add configuration file support" merged last week
4. Run `git show upstream/dev:HEAD -- src/cli.ts | head -50` to inspect the feature
5. It covers your proposed work
6. **Decision:** Report to user: "Brady already added config support in PR #642. We should either rebase our work on that or close."

**Example 2: No overlap found**

1. You want to fix logging in the docs build
2. Scan recent PRs: no mentions of "logging" or "docs build"
3. Scan commits: no related titles
4. Check diberry's open PRs: none related to docs
5. **Decision:** No overlap. Proceed with work.

**Example 3: Open PR from diberry**

1. You're about to work on TypeDoc API reference generation
2. Run `gh pr list --repo bradygaster/squad --state open --author diberry`
3. You find diberry PR #650 "Add TypeDoc API reference" still open
4. **Decision:** Coordinate with team — either wait for that PR to merge, or see if you can help close it first.

#### Dedup Confidence

**Medium** — Based on Flight's confirmed audit of 3–4 duplicate PRs. The check itself is proven (Brady's repo shows clear merge history), but the team's discipline in running it consistently is the real variable.

### Step 7: UPSTREAM
Open PR on upstream repository against bradygaster/squad:dev:
```bash
gh pr create --repo bradygaster/squad --base dev --fill
```

After the PR is created, undraft it to mark it ready for review. The upstream PR is the **final presentation** — it should not remain in draft:
```bash
gh pr ready {pr-number} --repo bradygaster/squad
```

The upstream PR signals completion of the fork pipeline. Leaving it in draft confuses reviewers — they may assume work is still in progress when iteration is already complete.

### Step 8: DONE
Upstream PR is merged. Close or keep fork PR for reference.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Better Way |
|---|---|---|
| Open upstream PR before fork review complete | Public iteration, messy history | Complete review cycle on fork first |
| Force-push to upstream branch | Breaks links, confuses reviewers | Squash locally, push once |
| Skip bleed check | Stowaway files merge upstream | Always audit before upstream PR |
| Commit `.squad/` files in app PRs | Repo pollution, merge conflicts | Exclude from staging, bleed check catches this |
| Open multiple PRs per feature | Fragmented review, merge chaos | One upstream PR per feature |
| Skip rebase before upstream | Diverged branch creates full-file diffs | Always rebase against origin/dev before step 6 |
| Parallel branch checkouts in same repo | Multiple agents switch branches simultaneously, causing working tree conflicts and commits landing on wrong branches | Use git worktrees or fix PRs serially |
| Forgetting to stash skill file updates | `.squad/skills/` files are gitignored, so they don't commit to the fork | Use `git add -f` when committing skill files |
| Leaving stale TDD comments in code | "RED PHASE", "TODO: implement" markers confuse reviewers after merge | Clean up all TDD markers before approval |
| Leave upstream PR in draft | Signals incomplete work when pipeline is done | Undraft upstream PR after opening — it's presentation-ready |
| Approving without running tests | Reviewers check ecosystem completeness (docs, changelog, exports) but miss functional breakage | Require test attestation before review; verify correctness before completeness |
| Squash-amend-force-push during review | Hides fix iteration history, reviewers can't see what changed between rounds | Use additive commits during review, squash only at merge time |
| Reviewing a 90-file migration like a 5-file PR | Mechanical errors (missed callsites, unwired async) survive review because reviewer skims | Use Migration PR Protocol: sample files, verify mechanical patterns, require test attestation |
| Skipping preflight test run | A sub-2-minute local test run would catch failures before CI round-trips | Always run `npm run build && npm test` before requesting review |
| Skip the dedup check ("we're moving fast") | Duplicates waste time and frustrate the maintainer. Flight found 3–4 already. | Always run the check — it takes 2 minutes and prevents hours of wasted work. |
| Assume the fork is source of truth | Brady may merge changes to upstream/dev directly; you won't see them unless you check. | Sync upstream remote and scan Brady's recent work every time. |
| Check only PR titles, not commit messages | PR titles can be vague; commit messages reveal intent. | Read both merged PR titles AND upstream/dev commit log. |
| Open a PR "to see if it conflicts" | Wastes Brady's review time. The dedup check is cheap; use it. | Complete the full check before opening any PR. |
| Ignore diberry's own open PRs | Easy to self-duplicate if you're not tracking what's already in flight. | Run the diberry-author-specific check to see what's pending. |
| Duplicate our own previous work | The team may have already built, reviewed, and even closed a PR for this exact thing in a prior session. Rebuilding it wastes everyone's time. | Check diberry's closed PRs, existing fork branches, and fork issues before starting ANY new work. |
| Ignore issues/PRs assigned to or mentioning diberry | Brady may have assigned work or asked for something specific — missing it means ignoring the maintainer's priorities. | Run the assigned/mentioned check (step 5b of dedup) and prioritize Brady's asks over self-directed work. |
| `git checkout upstream/dev -- .squad/` | Overwrites EVERYTHING including personal skills and logs | Sync layer by layer using specific paths |
| `git merge upstream/dev` | Merges ALL files, creates conflicts in logs and personal content | Cherry-pick `.squad/` paths only via targeted checkout |
| Committing `.copilot/skills/` in upstream PRs | Personal skills bleed into upstream repo | Keep `.copilot/` out of upstream-targeted commits; use bleed check |
| Overwriting `decisions.md` with `git checkout` | Loses fork-specific decisions | Union merge — keep all unique lines from both sides |
| `git add .` or `git add -A` after sync | Stages personal files, logs, and unrelated changes | Stage only the specific synced paths |
| Skipping Layer 3 verification | Silent corruption of personal skills during sync | Always run Layer 3 checks before committing |

## Pre-Upstream Gate Checklist

Before opening the upstream PR, verify:

- [ ] **Preflight tests pass**: `npm run build && npm test` run locally with passing results
- [ ] **Test attestation in PR description**: Preflight section with suite count, pass/fail, runtime
- [ ] **Flight approval**: Fork PR merged into fork/dev
- [ ] **FIDO approval**: Code quality, tests pass, no security issues
- [ ] **Bleed check pass**: Zero stowaway files, no `.squad/` commits
- [ ] **Dedup check pass**: No overlap with upstream merged PRs or commits
- [ ] **Squash commits**: 1-3 logical commits, not N from iteration (squash at merge time, not during review)
- [ ] **Clean description**: No double blank lines, clear problem/solution
- [ ] **No `.squad/` files**: Excluded from commit entirely
- [ ] **No `/docs/` prefix**: If docs changes, they go elsewhere
- [ ] **No double blank lines**: Markdown/description formatting clean
- [ ] **Migration PR extras (if >20 files)**: Full test output summary, structured change description, additive commit history preserved until squash

## Team Review Protocol

The fork PR review phase enforces team-wide quality standards. These patterns are mandatory.

### Dual Reviewer Gate
Every fork PR must be reviewed by **BOTH Flight (architecture)** and **FIDO (quality)** before approval. The rule:
- **Both APPROVE**: Ready to proceed
- **One APPROVE + One REJECT**: Not ready — re-review cycle required
- **No single-reviewer approvals**: A partial approval does not unblock

Both reviewers must sign off in the same review round or in sequential re-review rounds (see Review→Fix→Re-review Loop below).

### Convention Issues Are Blockers
The following are **NOT nits** — they are blockers per team directive. Flight and FIDO must flag these as `NEEDS FIXES`, never as "non-blocking notes":

- **`/docs/` prefix in internal links**: Links like `/docs/features/memory` should be bare: `/features/memory`. The /docs/ prefix is stripped at build time; links must not include it.
- **Double blank lines**: Single blank line is house style. Two or more consecutive blank lines must be reduced to one.
- **Table ordering discontinuities**: If tables reference order (e.g., step 1, 2, 3), they must be sequential without gaps.
- **Whitespace violations**: Trailing spaces, tabs instead of spaces, or inconsistent indentation.

When a reviewer finds any of these, the review verdict is **NEEDS FIXES** with findings documented. The author must correct all flagged conventions.

### Review→Fix→Re-review Loop
After reviewers identify blockers:

1. **Fix**: Author addresses all blocker comments on the feature branch. Use additive commits with descriptive messages (e.g., `fix: await async storage calls per review feedback`). Do not squash-amend during active review — reviewers need to see what changed.
2. **Re-run reviews**: **Both Flight AND FIDO must re-review**, even if only one reviewer found issues. This ensures convention fixes don't introduce new problems.
3. **Loop until both APPROVE**: Repeat until both reviewers vote APPROVE.
4. **Bleed check**: After both APPROVE, proceed to Step 5 (bleed check).

Do not skip to bleed check after a single reviewer fix.

### Reviewer Lockout
If Flight rejects a fork PR, the original author is locked out from self-revising. A **different agent** must make the fix and commit it. This is enforced mechanically:

- **Original author**: Locked from further commits on the feature branch after rejection.
- **Different agent** (e.g., Booster stepping in for PAO): Makes the fixes, commits, and force-pushes with `--force-with-lease`.
- **Re-review**: Both Flight and FIDO re-review the updated PR.

This rule prevents single-agent fixation loops and ensures peer review diversity.

### Known PAO Quirks (Watch for These)
If PAO is the author, Flight and FIDO should watch for:

- **`.squad/` file creep**: PAO often includes `.squad/agents/pao/history.md` or other `.squad/` files in commits. These must be explicitly excluded via bleed check or pre-commit rules.
- **`/docs/` prefix overuse**: PAO tends to add `/docs/` prefix to all internal links. Every reviewer must instruct "use bare paths — no /docs/ prefix."
- **Force-push caution**: Before PAO pushes, verify `git diff --cached --stat` matches intent and `git diff --cached --diff-filter=D` shows zero unintended deletions.

This is not a critique — it is a known pattern. Treat it as a checklist, not a personal issue.

### Migration PR Protocol (>20 Files)

PRs touching more than 20 files (bulk renames, API migrations, provider abstractions) follow a stricter protocol. These cannot be reviewed like a 5-file feature PR.

#### Author obligations
1. **Mandatory local test attestation** — Run `npm run build && npm test` and include the full test output summary in the PR description (suite count, pass/fail, runtime).
2. **Structured change description** — Break the PR description into: (a) what changed mechanically, (b) what changed semantically, (c) what callsites were updated.
3. **Additive commits during review** — Never squash during active review on a migration PR. Reviewers need to see exactly which files changed between iterations.

#### Reviewer obligations
1. **Mechanical correctness focus** — Are all callsites updated? Are string literals consistent across the migration? Are sync-to-async signature changes properly awaited everywhere?
2. **Sampling strategy** — Don't read all 80 files line-by-line. Sample 5-10 representative files, then verify the mechanical pattern holds across the rest.
3. **Test verification** — Before approving, confirm the author's test attestation. If the attestation is missing, request it before reviewing anything else.

#### Squash timing
Squash to a single commit **only at merge time** (Step 6: CLEAN), after CI is green and both reviewers approve. During review, the full commit history must be preserved.

### Review Comments Posted on PR
Formal reviews are posted to the fork PR as:
```
gh pr comment {pr-number} --body "REVIEW: {verdict}

## Findings
{findings}

## Summary
{summary}"
```

Verdict options: `APPROVE`, `NEEDS FIXES`, `REQUEST CHANGES`.

Findings should reference specific files, line numbers, and convention violations. Summary should restate the path forward (re-review required, bleed check next, etc.).

### Tamir Reviewer Rule
Only assign Tamir as a reviewer on **upstream PRs** where his original code PR is the source material for the content being documented. Do not add him to every upstream PR by default. On fork PRs, Flight and FIDO are the standard reviewers.

### Commit Hygiene
To ensure clean histories:

- **Additive commits during review**: Use descriptive commit messages for each fix iteration so reviewers can track what changed. Do NOT squash-amend-force-push during active review — this hides the fix history and makes re-review harder.
- **Squash at merge time only**: After CI is green and both reviewers approve, squash all review iterations into a single logical commit before opening the upstream PR (Step 6: CLEAN).
- **One commit per upstream PR**: The upstream PR should contain 1-3 logical commits, not N from iteration.
- **Force-push safely**: Use `--force-with-lease` to prevent accidental overwrites if teammates push simultaneously (rare in single-agent fork setup, but good practice). Only force-push after review is complete and you're preparing for upstream.
- **Always verify before push**:
  ```
  git diff --cached --stat       # File count must match intent
  git diff --cached --diff-filter=D  # Should show zero unintended deletions
  ```

## Lessons Learned — PR #640 Retrospective

These anti-patterns were observed during the StorageProvider abstraction PR (#640) and directly informed the Preflight Test Gate, Correctness Before Completeness, and Migration PR Protocol additions to this skill.

### "Approved but broken"
Flight and FIDO both approved the PR — twice — while CI was failing. Reviews checked ecosystem completeness (docs present? changelog updated? exports wired?) but nobody ran `npm test` locally or verified CI status before approving. **Root cause**: the review checklist evaluated packaging, not correctness.

### Template filename drift during bulk migration
An 89-file migration renamed storage provider references across the codebase. Some template filenames were updated inconsistently — the provider class was renamed but string literals referencing template paths were not. This is a mechanical correctness issue that sampling-based review should catch.

### Sync-to-async signature changes breaking tests
The migration changed synchronous method signatures to async, but not all test callsites added `await`. Tests that called async methods without awaiting them passed silently (the promise was truthy) until the test runner caught unhandled rejections. **Lesson**: when a migration changes function signatures, reviewers must verify all callsites match the new signature.

### The 89-second test run
The full test suite runs in ~89 seconds. Running it once locally before requesting review would have caught all three CI failures and prevented 3 consecutive CI round-trips (each taking 5-10 minutes). The preflight test gate exists because this single check has the highest ROI of any quality step in the pipeline.

### Squash-amend-force-push hiding iteration
During review, the author used `git commit --amend --no-edit && git push --force-with-lease` to address feedback. This replaced the previous commit entirely, making it impossible for reviewers to see what changed between review rounds. The fix: use additive commits during review, squash only at merge time.

## Maintenance: Fork Sync

This section defines how to sync upstream `.squad/` config into this fork while preserving personal skills and decisions. Without a layered sync model, fork `.squad/` config drifts from upstream over time — upstream adds agents, skills, templates, or updates charters, and the fork doesn't get them.

**When to run fork sync:**
- After upstream pushes new agent charters or skills
- Before starting a new round of upstream PRs
- When squad agents behave differently from upstream expectations
- Periodically (weekly or before major work sessions)

### Layered Sync Model

Four layers define ownership and sync behavior for every `.squad/` path.

#### Layer 1: Upstream-Owned (overwrite from upstream)

These files are authored and maintained by upstream. Fork accepts upstream's version on sync.

| Path | Description |
|---|---|
| `.squad/agents/*/charter.md` | Agent role definitions |
| `.squad/templates/**` | All template files |
| `.squad/casting/policy.json` | Casting policy config |
| `.squad/casting/registry.json` | Agent registry |
| `.squad/casting/history.json` | Casting history |
| `.squad/ceremonies.md` | Ceremony definitions |
| `.squad/routing.md` | Work routing rules |
| `.squad/team.md` | Team roster and capabilities |

#### Layer 2: Merged (union/append-only)

These files accumulate content from both sides. Sync merges, never overwrites.

| Path | Merge Strategy |
|---|---|
| `.squad/decisions.md` | Union merge — keep all unique lines from both sides |
| `.squad/agents/*/history.md` | Union merge — keep all unique entries from both sides |

#### Layer 3: Personal (never sync upstream, never bleed into PRs)

These files are fork-specific. They never travel to upstream and should not change during sync.

| Path | Description |
|---|---|
| `.copilot/skills/**` | Personal copilot-level skills |
| `.squad/decisions/inbox/**` | Fork-specific pending decisions |

#### Layer 4: Ignored (fork-local, never sync)

Ephemeral or session-local files that are never part of sync.

| Path | Description |
|---|---|
| `.squad/log/**` | Session logs |
| `.squad/orchestration-log/**` | Orchestration logs |
| `.squad/identity/**` | Identity files |

### Fork Sync Patterns

#### Pre-flight

```bash
git fetch upstream
git --no-pager diff --stat upstream/dev -- .squad/ | head -50
```

Review what changed. If nothing changed, stop — no sync needed.

#### Step 1: Sync Layer 1 (overwrite from upstream)

```bash
# Checkout upstream versions of all owned files
git checkout upstream/dev -- .squad/agents/*/charter.md
git checkout upstream/dev -- .squad/templates/
git checkout upstream/dev -- .squad/casting/
git checkout upstream/dev -- .squad/ceremonies.md
git checkout upstream/dev -- .squad/routing.md
git checkout upstream/dev -- .squad/team.md
```

#### Step 2: Sync Layer 2 (union merge)

For `decisions.md`:

```bash
# Save current fork version
cp .squad/decisions.md .squad/decisions.md.fork

# Get upstream version
git show upstream/dev:.squad/decisions.md > .squad/decisions.md.upstream

# Union merge: keep all unique lines from both sides
sort -u .squad/decisions.md.fork .squad/decisions.md.upstream > .squad/decisions.md.merged

# Review the merged result, then replace
mv .squad/decisions.md.merged .squad/decisions.md
rm .squad/decisions.md.fork .squad/decisions.md.upstream
```

For each agent's `history.md`, repeat the same pattern:

```bash
# Example for agent "eecom"
cp .squad/agents/eecom/history.md .squad/agents/eecom/history.md.fork
git show upstream/dev:.squad/agents/eecom/history.md > .squad/agents/eecom/history.md.upstream
sort -u .squad/agents/eecom/history.md.fork .squad/agents/eecom/history.md.upstream > .squad/agents/eecom/history.md.merged
mv .squad/agents/eecom/history.md.merged .squad/agents/eecom/history.md
rm .squad/agents/eecom/history.md.fork .squad/agents/eecom/history.md.upstream
```

> **Note:** `sort -u` does a line-level dedup. For structured markdown with headers, manual review after merge is recommended to ensure section ordering makes sense.

#### Step 3: Verify Layer 3 untouched

```bash
# These should NOT have changed during sync
git diff --name-only -- .copilot/skills/
```

If any personal files changed, restore them immediately:

```bash
git checkout HEAD -- <path>
```

#### Step 4: Discover new upstream content

```bash
# Check for new agents, skills, or templates added upstream
git --no-pager diff --diff-filter=A --name-only upstream/dev -- .squad/agents/
git --no-pager diff --diff-filter=A --name-only upstream/dev -- .squad/skills/
git --no-pager diff --diff-filter=A --name-only upstream/dev -- .squad/templates/
```

Report any new items to the user for review before including them.

#### Step 5: Commit sync

```bash
# Stage ONLY synced files — never .copilot/ or personal skills
git add .squad/agents/*/charter.md \
        .squad/templates/ \
        .squad/casting/ \
        .squad/ceremonies.md \
        .squad/routing.md \
        .squad/team.md \
        .squad/decisions.md \
        .squad/agents/*/history.md

# Verify staged files match intent
git diff --cached --stat
git diff --cached --diff-filter=D --name-only  # confirm no unintended deletions

# Commit
git commit -m "sync: pull .squad/ updates from upstream/dev"
```

### Fork Sync Examples

#### Full sync run

```bash
# 1. Pre-flight
git fetch upstream
git --no-pager diff --stat upstream/dev -- .squad/ | head -50
# Output shows 4 files changed — proceed

# 2. Layer 1: overwrite
git checkout upstream/dev -- .squad/agents/*/charter.md
git checkout upstream/dev -- .squad/templates/
git checkout upstream/dev -- .squad/casting/
git checkout upstream/dev -- .squad/ceremonies.md .squad/routing.md .squad/team.md

# 3. Layer 2: union merge decisions.md
cp .squad/decisions.md .squad/decisions.md.fork
git show upstream/dev:.squad/decisions.md > .squad/decisions.md.upstream
sort -u .squad/decisions.md.fork .squad/decisions.md.upstream > .squad/decisions.md.merged
mv .squad/decisions.md.merged .squad/decisions.md
rm .squad/decisions.md.fork .squad/decisions.md.upstream

# 4. Verify personal files untouched
git diff --name-only -- .copilot/skills/
# (no output = good)

# 5. Discover new upstream content
git --no-pager diff --diff-filter=A --name-only upstream/dev -- .squad/agents/ .squad/skills/ .squad/templates/

# 6. Commit
git add .squad/agents/*/charter.md .squad/templates/ .squad/casting/ .squad/ceremonies.md .squad/routing.md .squad/team.md .squad/decisions.md .squad/agents/*/history.md
git diff --cached --stat
git commit -m "sync: pull .squad/ updates from upstream/dev"
```

#### Dry-run (inspect only, no changes)

```bash
git fetch upstream
git --no-pager diff --stat upstream/dev -- .squad/ | head -50
git --no-pager diff upstream/dev -- .squad/agents/*/charter.md | head -100
git --no-pager diff upstream/dev -- .squad/templates/ | head -100
```

## Workflow Summary

This pipeline separates concerns:
- **Fork PR**: Messy iteration, team feedback, bleed capture
- **Upstream PR**: Clean, single-commit, ready-to-merge
- **Dedup Check**: Prevents duplicate work before upstream PR
- **Fork Sync**: Keeps upstream config current without corrupting personal content

Result: Upstream PRs are lean, reviewed, deduplicated, and production-ready.

## Branch Segregation Rule

**Confidence:** high (validated by 3 stowaway incidents on PR #640)

### What goes where

| Content | Target Branch |
|---------|--------------|
| Code changes for the feature/issue | Feature branch |
| .squad/ state (decisions, logs, history) | dev |
| Skill updates (.squad/skills/) | dev |
| Fork-sync results | dev |
| Anything not part of a specific PR's scope | dev |

### Mechanic (when on a feature branch)

If you need to commit infrastructure work while on a feature branch:

1. `git stash` -- save feature work
2. `git checkout dev && git pull`
3. Commit and push the infrastructure change to dev
4. `git checkout -` -- return to feature branch
5. `git stash pop` -- restore feature work

### Coordinator responsibility

When dispatching agents for non-feature work while on a feature branch, include in the spawn prompt:

> "You are on a feature branch. Infrastructure work (.squad/, skills, decisions) must go to dev -- switch before committing."

### Anti-pattern

NEVER commit .squad/, skills, decisions, or fork-sync to a feature branch. This creates "stowaways" that contaminate PRs and require manual cleanup during squash.

**Evidence:** PR #640 had 3 stowaway incidents in one session -- fork-sync skill, fork-first-pipeline update, and .squad/ state all landed on the StorageProvider PR branch and had to be stripped.

## Related

- **Issue #105:** Full design discussion with implementation options and acceptance criteria for fork sync
- `.copilot/skills/diberry-squad-sa-pr-extraction/SKILL.md` — Clean commit workflow for SA PRs
- `.copilot/skills/diberry-squad-daily-rebase-sync/SKILL.md` — Daily rebase to keep SA branch current
