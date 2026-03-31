---
name: "dina-review-protocol"
description: "Team review gates, lockout rules, and migration PR protocol for fork PRs"
domain: "code review, quality gates, PR workflow"
confidence: "high"
source: "extracted from diberry-squad-fork-first-pipeline"
---

## Worksurface

All reviews happen on **diberry/squad** (the fork). Reviews are never conducted on bradygaster/squad PRs — those are presentation-ready by the time they're opened.

## Correctness Before Completeness

Reviews **MUST** follow this order:
1. **Functional correctness first** — Do tests pass? Does `npm run build && npm test` succeed? If not, stop here.
2. **Mechanical correctness** — Are all callsites updated? Are string literals consistent? Are async/await signatures correct?
3. **Ecosystem completeness last** — Docs, changelog, exports, navigation entries.

If tests fail at step 1, the review verdict is **NEEDS FIXES** with a single finding: "Tests must pass before review can proceed."

## Dual Reviewer Gate

Every fork PR must be reviewed by the **full squad team AND Copilot** before approval:
- **All APPROVE**: Ready to proceed
- **Any REJECT/REQUEST CHANGES**: Not ready — re-review cycle required
- **No partial approvals unblock**: Every reviewer must approve on the latest commit

## Convention Issues Are Blockers

These are **NOT nits** — they are blockers:
- **`/docs/` prefix in internal links**: Use bare paths (`/features/memory` not `/docs/features/memory`)
- **Double blank lines**: Single blank line is house style
- **Table ordering discontinuities**: Sequential without gaps
- **Whitespace violations**: Trailing spaces, tabs vs spaces, inconsistent indentation

## Review → Fix → Re-review Loop

1. **Fix**: Author addresses all findings on the feature branch. Use additive commits with descriptive messages. Do not squash during active review.
2. **Re-run reviews**: All reviewers must re-review, even if only one found issues.
3. **Loop until all APPROVE**: Repeat until every reviewer votes APPROVE.
4. **Bleed check**: After all approve, proceed to bleed check (see `dina-bleed-check`).

## Reviewer Lockout

If a reviewer rejects a fork PR, the original author is locked out from self-revising. A **different agent** must make the fix:

- **Original author**: Locked from further commits after rejection
- **Different agent**: Makes fixes, commits, force-pushes with `--force-with-lease`
- **Re-review**: All reviewers re-review the updated PR

This prevents single-agent fixation loops and ensures peer review diversity.

## Migration PR Protocol (>20 Files)

PRs touching more than 20 files follow a stricter protocol:

### Author obligations
1. **Mandatory local test attestation** — Full test output summary in PR description
2. **Structured change description** — What changed mechanically, semantically, and which callsites were updated
3. **Additive commits during review** — Never squash during active review on a migration PR

### Reviewer obligations
1. **Mechanical correctness focus** — All callsites updated? String literals consistent? Async/await correct?
2. **Sampling strategy** — Sample 5-10 representative files, verify the pattern holds across the rest
3. **Test verification** — Confirm author's test attestation before reviewing anything else

### Squash timing
Squash to a single commit **only at merge time**, after all reviewers approve. During review, the full commit history must be preserved.

## Review Comments Format

Post formal reviews to the fork PR as:
```
gh pr comment {pr-number} --body "REVIEW: {verdict}

## Findings
{findings}

## Summary
{summary}"
```

Verdict options: `APPROVE`, `NEEDS FIXES`, `REQUEST CHANGES`.

Findings should reference specific files, line numbers, and convention violations.

## Serial Branch Operations

⚠️ When multiple agents fix different PRs in parallel on the same physical repository, they all run `git checkout` in the same working tree, causing conflicts.

**RULE: Fixes across multiple PRs must be done SERIALLY unless using git worktrees.**

**Exception**: Use `git worktree add ../squad-195 -b squad/195-fix-issue origin/dev` for isolated working directories.

## Anti-Patterns

- **Don't** approve without running tests — verify correctness before completeness
- **Don't** skip re-review after fixes — all reviewers must re-approve
- **Don't** let the original author self-fix after rejection — use a different agent
- **Don't** review a 90-file migration like a 5-file PR — use the migration protocol
- **Don't** squash during active review — additive commits preserve iteration history

## Lessons Learned (PR #640)

- **"Approved but broken"**: Reviewers checked ecosystem completeness but nobody ran tests locally. Now: require test attestation before review.
- **Template filename drift**: Bulk migration renamed providers but missed string literals. Now: sampling strategy + mechanical correctness focus.
- **Sync-to-async breaking tests**: Tests called async methods without `await` and passed silently. Now: verify all callsites match new signatures.
