---
name: "dina-pr-naming"
description: "Naming conventions for PRs, issues, branches, and commits — product vs devops scope"
domain: "PR workflow, naming conventions, issue management"
confidence: "high"
source: "Dina directive — distinguish product work from repo-ops/devops work"
---

## Worksurface

Applies to all PRs, issues, branches, and commits on **diberry/squad** and upstream PRs on **bradygaster/squad**.

## Purpose

The squad repo contains both **product code** (SDK, CLI, templates shipped to customers) and **devops/repo-ops** (CI workflows, repo configuration, team process). Without clear naming, reviewers can't tell at a glance whether a PR changes what customers get or just how the repo operates. PR #705 was a real-world example — it mixed repo CI changes with product template changes because there was no naming discipline.

## Scope Prefixes

Every PR title, issue title, branch name, and commit message must use a scope prefix that signals whether the change is product or devops:

### Product scopes (changes what customers get)

| Prefix | Meaning | Example files touched |
|--------|---------|----------------------|
| `feat(sdk):` | New SDK feature | `packages/squad-sdk/src/` |
| `feat(cli):` | New CLI feature | `packages/squad-cli/src/` |
| `fix(sdk):` | SDK bug fix | `packages/squad-sdk/src/` |
| `fix(cli):` | CLI bug fix | `packages/squad-cli/src/` |
| `feat(templates):` | New template for customers | `templates/`, `.squad-templates/`, `packages/*/templates/` |
| `fix(templates):` | Template fix for customers | Same as above |
| `docs:` | User-facing documentation | `docs/` |
| `feat(skills):` | New skill shipped in product | `packages/*/templates/skills/` |

### Devops/repo-ops scopes (changes how the repo operates)

| Prefix | Meaning | Example files touched |
|--------|---------|----------------------|
| `devops(ci):` | CI/CD workflow changes | `.github/workflows/` |
| `devops(repo):` | Repo config, labels, settings | `.github/`, repo settings |
| `devops(process):` | Team process, ceremonies | `.squad/`, process docs |
| `devops(deps):` | Dependency updates | `package.json`, `package-lock.json` |
| `chore:` | Maintenance, cleanup | Various |
| `test:` | Test-only changes | `test/` |

### Mixed scope (both product and devops)

If a PR genuinely touches both product and devops files, use the **primary** scope and note the secondary in the description:
```
feat(cli): add config model command

Also updates CI to test the new command (devops scope).
```

## Applying the Convention

### Issue titles
```
devops: Add scope labels to distinguish repo-ops from product work
feat(sdk): StorageProvider abstraction layer
fix(cli): auto-update config version during upgrade
```

### PR titles
```
devops(ci): add concurrency controls to 5 workflows
feat(sdk): sync squad.agent.md roster when agents added to team.md
fix(templates): update heartbeat workflow for new event format
```

### Branch names
```
squad/122-devops-ci-concurrency
squad/84-fix-config-version
squad/83-fix-roster-sync
```

### Commit messages
```
devops(ci): add concurrency controls to 5 workflows (Phase 3 item A1)
feat(sdk): add buildRosterBlock() and syncRosterToAgentDoc()
fix(cli): stamp config version during upgrade path
```

## File-to-Scope Mapping

When creating a PR, check which files are touched and use this mapping:

| Files | Scope |
|-------|-------|
| `.github/workflows/` | `devops(ci)` |
| `.github/` (non-workflows) | `devops(repo)` |
| `.squad/` | `devops(process)` |
| `packages/squad-sdk/src/` | `feat/fix(sdk)` |
| `packages/squad-cli/src/` | `feat/fix(cli)` |
| `templates/`, `.squad-templates/`, `packages/*/templates/` | `feat/fix(templates)` — **product** |
| `docs/` | `docs` |
| `test/` (test-only) | `test` |
| `scripts/` | `devops(repo)` |

**Critical distinction:** `.github/workflows/` is devops (repo CI), but `templates/workflows/` and `packages/*/templates/workflows/` are **product** (shipped to customers). Never mix them in the same PR.

## Integration with Pipeline

During the `squad:pr-needs-preparation` stage of `dina-pr-lifecycle`:
- Verify the PR title has a valid scope prefix
- If missing, add the appropriate prefix based on files changed
- If the PR mixes product and devops files, flag it for splitting

## Anti-Patterns

- **Don't** use generic titles like "fix stuff" or "updates" — always include scope
- **Don't** mix `.github/workflows/` (devops) with `templates/workflows/` (product) in the same PR
- **Don't** use `feat(ci)` — CI is devops, not a product feature. Use `devops(ci)`
- **Don't** omit the scope prefix — reviewers need to know the blast radius at a glance
