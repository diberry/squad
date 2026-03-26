---
name: "cross-fork-pr-workflow"
description: "Managing PRs from a fork (diberry/squad) to upstream (bradygaster/squad)"
domain: "git-workflow, github, pr-management"
confidence: "medium"
source: "earned (PRs #636-642 — cross-fork retargeting from diberry to bradygaster)"
---

## Context
When contributing from a fork, PRs can't be "retargeted" across repos. Instead: develop on fork, team-review on fork, then create a new PR on upstream using cross-fork head reference.

## Patterns

### Fork → Upstream Pipeline
1. **Develop on fork branch** — `squad/{issue}-{slug}` on diberry/squad
2. **Team review on fork** — 3-reviewer gate (Flight, FIDO, Procedures)
3. **Push branch to origin** — `git push origin {branch}`
4. **Create upstream PR** — `gh pr create --repo bradygaster/squad --base dev --head diberry:{branch}`
5. **Comment on fork PR** — "Retargeted to bradygaster/squad — see upstream PR #{N}"
6. **@mention maintainer** — `gh pr comment {N} --repo bradygaster/squad --body "@bradygaster Ready for review"`

### Auth Switching
- `gh auth switch --user diberry` before all operations
- Enterprise account (diberry_microsoft) gets "Unauthorized" on personal repos
- Always verify: `gh auth status` before PR operations

### Rebase Before Retarget
- Always rebase onto upstream/dev before creating upstream PR
- Verify 1 commit ahead: `git rev-list --count upstream/dev..HEAD`
- Force-push to fork: `git push --force-with-lease origin {branch}`

## Anti-Patterns
- ❌ Trying `gh pr edit --base` to retarget cross-fork (doesn't work)
- ❌ Pushing directly to upstream (usually 403 for forks)
- ❌ Creating upstream PR before rebasing onto latest upstream/dev
- ❌ Forgetting to @mention the maintainer after creating upstream PR
