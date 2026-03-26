---
name: "ci-failure-triage"
description: "Distinguish pre-existing upstream CI failures from failures introduced by our changes"
domain: "ci, debugging, git-workflow"
confidence: "high"
source: "earned (PRs #636-642 on bradygaster/squad — pre-existing cli-shell-comprehensive.test.ts failures)"
---

## Context
When CI fails on a PR, the first question is: "Did we break this, or was it already broken?" Skipping this step wastes hours debugging someone else's problem.

## Patterns

### Triage Steps
1. Check the failing test file — is it in our diff? (`git diff --name-only upstream/dev..HEAD`)
2. If NOT in our diff → likely pre-existing
3. Verify: run the same test on upstream/dev base (`git stash && git checkout upstream/dev && npx vitest run {test}`)
4. If it fails on upstream too → pre-existing, document and move on
5. If it passes on upstream but fails on our branch → we broke it, fix required

### Common Pre-existing Patterns
- "expected [] to include" — async/await test bug (tests call async functions without await)
- Flaky timeout tests — pass on rerun
- Platform-specific failures (Windows EPERM vs Linux EACCES)

### Documentation
When identifying pre-existing failures, note them in the PR body:
"CI test failures in {file} are pre-existing on upstream/dev (verified). Our PR has zero diff on this file."

## Anti-Patterns
- ❌ Assuming all CI failures are our fault
- ❌ "Fixing" pre-existing failures in an unrelated PR (scope creep)
- ❌ Ignoring CI failures without verifying they're pre-existing
