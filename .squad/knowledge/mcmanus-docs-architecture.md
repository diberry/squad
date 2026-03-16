---
title: Documentation Architecture and Conventions
author: mcmanus
tags: [documentation, structure, style, conventions]
created: 2026-03-16
---

# Documentation Architecture and Conventions

## Problem Statement

Squad's documentation serves multiple audiences:
- Users installing and using Squad
- Contributors building features
- Team members maintaining the codebase
- External developers integrating Squad

Without clear structure and conventions, documentation becomes fragmented, outdated, or inconsistent.

## Documentation Structure

Squad uses a layered documentation architecture:

### Layer 1: User-Facing (README.md, docs/)
**Audience:** Squad users, new adopters

**Content:**
- Installation instructions
- Quick start guide
- CLI commands reference
- Common workflows and examples

**Tone:** Friendly, example-driven, action-oriented

**Location:** `README.md`, `docs/` directory

### Layer 2: Contributor-Facing (CONTRIBUTING.md, docs/contributing/)
**Audience:** External contributors, open-source developers

**Content:**
- Development setup
- Code conventions
- Testing requirements
- PR process

**Tone:** Welcoming, detailed, prescriptive

**Location:** `CONTRIBUTING.md`, `docs/contributing/`

### Layer 3: Team Context (.squad/)
**Audience:** Squad team members, agents

**Content:**
- Team roster and roles
- Architectural decisions
- Skills and patterns
- Historical context

**Tone:** Internal, dense, assumes context

**Location:** `.squad/` directory (not published to npm)

## Documentation Conventions

### Markdown Style

**Headings:**
- Use ATX-style headers (`#`, `##`, not underlines)
- One H1 per document (document title)
- Hierarchical: don't skip levels (H1 → H3)

**Code blocks:**
- Always specify language: ` ```typescript ` (not ` ``` `)
- Use `bash` for shell commands (not `sh`, `shell`, `console`)
- Include output when helpful

**Links:**
- Use relative paths for internal links: `[guide](./docs/guide.md)`
- Use absolute GitHub URLs for cross-repo links

**Lists:**
- Use `-` for unordered lists (not `*` or `+`)
- Use `1.` for ordered lists (Markdown auto-numbers)

### Tone Guidelines

**User docs:**
- **Imperative mood:** "Install Squad with npm install"
- **Active voice:** "Squad creates agents" (not "Agents are created by Squad")
- **No hype:** Substantiated claims only (see tone ceiling rule)
- **Examples first:** Show, then explain

**Contributor docs:**
- **Prescriptive:** "You must run tests before pushing"
- **Detailed:** Include rationale for conventions
- **Checkpoints:** Use checklists for multi-step processes

**Team docs:**
- **Dense:** Assume context, link to background
- **Attributed:** Sign decisions, date learnings
- **Structured:** Use frontmatter, tags, timestamps

### Common Patterns

#### Installation Instructions
```markdown
## Installation

Install Squad globally:

\`\`\`bash
npm install -g squad-sdk
\`\`\`

Verify installation:

\`\`\`bash
squad --version
\`\`\`
```

#### Command Reference
```markdown
## squad init

Initialize a new Squad team.

\`\`\`bash
squad init [directory]
\`\`\`

**Options:**
- `--template <name>` — Use a specific template
- `--agents <count>` — Number of agents to create

**Example:**
\`\`\`bash
squad init my-team --agents 3
\`\`\`
```

#### Troubleshooting Section
```markdown
## Troubleshooting

### Error: "Module not found"

**Cause:** Squad is not installed globally or not in PATH.

**Solution:**
1. Check installation: `npm list -g squad-sdk`
2. Reinstall if missing: `npm install -g squad-sdk`
3. Verify PATH includes npm global bin directory
```

## Documentation Lifecycle

### Creation
When adding a feature:
1. Document in user-facing docs if it's user-visible
2. Document in contributor docs if it affects development workflow
3. Update CHANGELOG.md with feature description

### Updates
When changing a feature:
1. Update affected documentation in same PR
2. Check for broken links with `npm run docs:check` (if script exists)
3. Update examples if behavior changed

### Deprecation
When deprecating a feature:
1. Add deprecation notice to docs: `> ⚠️ **Deprecated:** Use X instead.`
2. Keep docs for one major version (for reference)
3. Remove docs when feature is removed

### Migration
When restructuring docs:
1. Add redirects or symlinks for moved files (if possible)
2. Update all internal links
3. Create migration guide if significant restructuring

## Tone Ceiling Rule

**No hype. Substantiated claims only.**

Inspired by Stripe's documentation philosophy: technical writing should be precise, not marketing.

❌ **Hype:**
- "Squad is revolutionary"
- "The most powerful AI framework"
- "Game-changing multi-agent system"

✅ **Substantiated:**
- "Squad coordinates multiple agents using a drop-box pattern"
- "Squad supports TypeScript with strict mode enabled"
- "Squad integrates with GitHub Copilot SDK"

If you can't prove it, don't claim it.

## Documentation Tools

### Linting
Use markdownlint for consistency:

```bash
npm run lint:docs  # Check markdown style
```

Standard rules:
- MD001: Heading levels increment by one
- MD013: Line length limit (120 chars, configurable)
- MD040: Code blocks must specify language

### Link Checking
Validate internal links:

```bash
npm run docs:check  # Find broken links
```

### Generation
Some docs are generated from code:
- CLI help text: extracted from commander definitions
- API reference: generated from TypeScript definitions with typedoc

Regenerate after changes:

```bash
npm run docs:generate
```

## Anti-Patterns

### ❌ Inline Code Comments as Documentation
Code comments are for maintainers, not users.

**Bad:** Only explain feature in code comments  
**Good:** Document in user docs, reference in code comments

### ❌ Stale Examples
Examples that don't work frustrate users.

**Bad:** Leave example using deprecated API  
**Good:** Update examples when API changes, test examples in CI

### ❌ README Bloat
Don't put everything in README.

**Bad:** 5000-line README covering every detail  
**Good:** Concise README with links to detailed docs

### ❌ Assumed Context
Don't assume readers know Squad internals.

**Bad:** "Use the coordinator pattern as usual"  
**Good:** "The coordinator routes work to agents (see routing guide)"

## Future Improvements

Potential enhancements:
- Interactive examples (CodeSandbox, StackBlitz)
- Video walkthroughs for complex workflows
- Auto-generated API reference from TypeScript
- Versioned docs (docs for v0.8, v0.9, etc.)
- Docs site with search (Docusaurus, VitePress)
