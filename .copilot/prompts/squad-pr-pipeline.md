# Squad PR Pipeline for diberry/squad (fork of bradygaster/squad)

When working on the diberry/squad repository, follow these instructions for PR lifecycle management.

## Skills Location

All pipeline skills live on the `diberry/squad` branch (NOT dev). Before processing PRs, read the relevant skills:

```bash
git show origin/diberry/squad:.copilot/skills/dina-pr-lifecycle/SKILL.md
git show origin/diberry/squad:.copilot/skills/dina-upstream-pr-maintenance/SKILL.md
git show origin/diberry/squad:.copilot/skills/dina-pr-naming/SKILL.md
git show origin/diberry/squad:.copilot/skills/dina-bleed-check/SKILL.md
git show origin/diberry/squad:.copilot/skills/dina-dev-sync/SKILL.md
git show origin/diberry/squad:.copilot/skills/dina-fork-pr-close/SKILL.md
```

## Two Separate Loops

### Loop 1: Fork PRs (diberry/squad)

Process label-driven pipeline per `dina-pr-lifecycle`:

1. Sync dev branch first (`dina-dev-sync`)
2. Scan non-draft PRs for lifecycle labels (skip `diberry/*` branches)
3. Process ONE stage per PR per round: preparation → review → reviewed (human gate) → dina-approved → close fork PR + open upstream
4. Enforce: single commit, CI green, naming convention (`dina-pr-naming`), file audit (`dina-bleed-check`), all team + Copilot reviews approved

### Loop 2: Upstream PRs (bradygaster/squad)

Maintain open upstream PRs per `dina-upstream-pr-maintenance`:

1. Check all open PRs by diberry on bradygaster/squad
2. For each: verify CI green, mergeable, single commit, clean file list
3. Fix any failures — rebase, resolve conflicts, squash, remove stray files
4. Respond to maintainer feedback (mechanical fixes only — no scope expansion)
5. **NEVER add labels** to upstream PRs — post team approval as a PR comment instead
6. **NEVER merge** upstream PRs — only the maintainer merges

## Key Rules

- **All work happens on diberry/squad.** Upstream is a delivery vehicle, not a workspace.
- **Product vs devops:** Use `dina-pr-naming` prefixes. Never mix `.github/workflows/` (devops) with `templates/workflows/` (product) in the same PR.
- **`diberry/*` branches are protected** — never enter the pipeline, never target upstream.
- **Dev branch is a mirror** of bradygaster/squad dev — never commit fork-specific content to it.
- **Skills on `diberry/squad` branch only** — read them with `git show origin/diberry/squad:` prefix, don't check out the branch.

## Available Skills (on diberry/squad branch)

| Skill | Purpose |
|-------|---------|
| `dina-issue-to-pr` | Issue pickup, dedup, TDD implementation, draft PR creation |
| `dina-pr-lifecycle` | Label-driven PR state machine (draft promotion → preparation → review → approved → upstream) |
| `dina-upstream-pr-maintenance` | Maintain open upstream PRs (CI, rebase, conflicts, single commit) |
| `dina-pr-naming` | Product vs devops scope prefixes for titles and commits |
| `dina-bleed-check` | Stowaway file audit, branch segregation, branch cleanup |
| `dina-dev-sync` | Keep fork dev in sync with upstream dev |
| `dina-fork-pr-close` | Close fork PRs when upstream PR opens |
| `dina-fork-pipeline` | Full pipeline (issue → branch → upstream → done) |
| `dina-review-protocol` | Review gates, lockout rules, migration PR protocol |
| `dina-dedup-check` | Upstream dedup gate before opening upstream PRs |
| `dina-fork-sync` | Layered sync model for .squad/ config |
| `dina-pr-screenshots` | Visual documentation for PRs |
