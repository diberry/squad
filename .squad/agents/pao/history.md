# PAO

> Public Affairs Officer

## Core Context

Docs live in docs/ with blog/, concepts/, cookbook/, getting-started/, guide/, features/, scenarios/ sections. Blog tests use filesystem discovery (dynamic); other sections use hardcoded expected arrays. Microsoft Style Guide enforced: sentence-case headings, active voice, second person, present tense. Docs format: plain markdown, H1 title, experimental warning, "Try this" code blocks, overview, HR, H2 content sections. Scannability framework: paragraphs for narrative, bullets for scannable items, tables for comparisons.

## Learnings

### Blog Post Format
YAML frontmatter: title, date, author, wave, tags, status, hero. Body: experimental warning, What Shipped, Why This Matters, Quick Stats, What's Next. 200-400 words for infrastructure releases. No hype — explain value.

### Boundary Review Heuristic
"Squad Ships It" litmus test: if Squad doesn't ship the code/config, it's IRL content. Platform features used alongside Squad: clarify whose feature it is. Squad behavior/config docs stay. External infrastructure docs (ralph-operations, proactive-communication) → IRL.

### DOCS-TEST SYNC
When adding docs pages, update test assertions in docs-build.test.ts in the SAME commit. When rebasing doc PRs, main branch (already merged) takes priority.

### Contributor Recognition
CONTRIBUTORS.md tracks team roster and community contributors. Each release includes recognition updates. Append PR counts, don't replace.

### Skill Scope Documentation Pattern
Explicitly state what a skill produces and does NOT produce. Deterministic skills prevent agents from generating unnecessary code when templates exist.

### Teams MCP Audit
External tool integrations require explicit "where to get it" guidance. Placeholder paths need clarification that users must provide actual MCP server implementations.

### Cross-Org Authentication Docs
Problem/solution structure for multi-account auth: gh auth switch, Copilot instructions, Squad skill pattern. Cover credential helpers, EMU variations, common error messages. Cross-reference in troubleshooting and enterprise-platforms pages.

### Roster & Contributor Recognition (v0.8.25)
Squad moved to Apollo 13/NASA Mission Control naming scheme (Flight, Procedures, EECOM, FIDO, PAO, CAPCOM, CONTROL, Surgeon, Booster, GNC, Network, RETRO, INCO, GUIDO, Telemetry, VOX, DSKY, Sims, Handbook). CONTRIBUTORS.md tracks both team roster and community contributors; contributor table entries grow with PRs (append PR counts rather than replace, maintaining attribution history).

### Git Rebase for Doc Merges
When rebasing doc PRs with conflicts from other merged doc PRs, the main branch version (already merged) should generally take priority. For Node.js version references, maintain LTS terminology when present (e.g., `nvm install --lts` over specific version numbers like `nvm install 20`). Conflict resolution pattern: preserve new content from PR branch only where it doesn't duplicate or contradict already-merged changes. Use `git -c core.editor=true rebase --continue` to bypass interactive editor issues on Windows.

### Astro Docs Format (v0.8.26)
Squad docs use plain markdown without Astro frontmatter. Structure: title (H1), experimental warning callout, "Try this" code blocks at top, overview paragraph, horizontal rule, then content sections with H2 headings. Microsoft Style Guide enforced: sentence-case headings, active voice, second person ("you"), present tense, no ampersands except in code/brand names. Features and scenarios directories added to test coverage in docs-build.test.ts. Reference implementations linked where available (e.g., ralph-watch.ps1 for operational patterns).

### Proactive Communication Patterns (v0.8.26)
Two-way communication layer between Squad and work environment. Outbound: Teams webhook notifications (breaking, briefings, recaps, flashes) sent via Adaptive Cards — only when newsworthy. Inbound: WorkIQ/Playwright scanning of Teams channels and email → auto-create GitHub issues with teams-bridge label, anti-duplicate logic enforced. Loop: inbound creates issues → Ralph dispatches → agents work → outbound notifies results. Human stays informed on mobile. Prerequisites are enhancements, not requirements.

📌 **Team update (2026-03-11T01:27:57Z):** Proactive communication patterns and PR trust levels (full/selective/self-managing spectrum) documented in decisions.md. Pattern rationale reinforced: Ralph 24/7 autonomous deployment requires awareness loop (Teams webhooks for outbound) and external work integration (WorkIQ scanning for inbound). Trust levels enable context-appropriate oversight without bottlenecking teams.

### PR Trust Model Documentation (v0.8.26)
Three trust levels for PR management: (1) Full review (default, team repos) — human gate on every merge; (2) Selective review (personal projects with patterns) — human reviews only critical paths; (3) Self-managing (solo personal repos only) — Squad merges own PRs, human reviews retroactively. Added to reviewer-protocol.md as new section. Important: self-managing ≠ unmonitored; use Ralph work monitoring and Teams notifications for awareness. Decision matrix included for when to use each level.

### Final Docs Review Pattern (v0.8.26)
Pre-PR quality reviews check: (1) Microsoft Style Guide compliance (sentence-case headings, active voice, no ampersands, present tense, second person); (2) Tone consistency (practical, developer-focused, no hype); (3) Technical accuracy (code examples, file paths, commands); (4) Cross-reference integrity (valid links between pages); (5) DOCS-TEST SYNC (test assertions match new pages); (6) Privacy directive compliance (no individual repos without consent). Fixed duplicate section heading in reviewer-protocol.md (merge artifact). All staged docs passed review and are ready to commit.

### Squad vs IRL Boundary Review (v0.8.26)
Evaluated four docs pages from PR #331 (Tamir's blog analysis) against Squad-specificity criterion: does content document Squad features/patterns (belongs in Squad docs) or community implementation examples (belongs in Squad IRL)? Key distinction: Squad docs = "how the feature works + universal best practices" vs IRL = "how one person built an amazing setup." Results: ralph-operations.md borderline (deployment wrappers are external infrastructure, not Squad features — trim "outer loop" framing), issue-templates.md borderline (GitHub feature documented for Squad context, not Squad code — clarify scope), proactive-communication.md does not belong (community extension pattern using WorkIQ/Playwright, not built into Squad), reviewer-protocol.md trust levels section belongs (documents user choice spectrum within Squad's existing review system). Pattern: if Squad doesn't ship the code, it's IRL content; if it's a GitHub platform feature used alongside Squad, clarify that distinction; if it documents actual Squad behavior/configuration, it belongs.

### Boundary Review Execution (v0.8.26)
Executed boundary review findings from PR #331: (1) Deleted ralph-operations.md (infrastructure around Squad, not Squad itself — moved to IRL); (2) Deleted proactive-communication.md (external tools/webhooks — moved to IRL); (3) Reframed issue-templates.md intro to clarify "GitHub feature configured for Squad" not "Squad feature"; (4) Updated EXPECTED_SCENARIOS in docs-build.test.ts to match remaining files. Pattern reinforced: boundary review = remove external infrastructure docs, reframe platform integration docs to clarify whose feature it is, keep Squad behavior/config docs. Changes staged for commit.

### Docs Catalog Audit (2026-03-22)
Full audit of the Astro docs site identified critical quality and navigation gaps. **Findings:** 0 dead nav links (healthy); 15 orphaned pages not discoverable via sidebar (FAQ, guides, reference pages, 6 legacy root files); 3 stale/broken pages using deprecated install syntax; 5 duplicate content conflicts. **Top 5 Actions:** (1) Add CI test to enforce nav coverage — catch orphaned pages automatically; (2) Delete 6 root-level legacy files (guide.md, sample-prompts.md, tips-and-tricks.md, tour-*.md) — deprecated syntax and not in nav; (3) Make whatsnew.md a release checklist artifact — current report (v0.8.2) vs actual (v0.8.26+) erodes trust; (4) Update insider-program.md to current install method — replace deprecated `npx github:` syntax; (5) Resolve choose-your-interface vs choosing-your-path duplication — one canonical page rule. **Skill Created:** docs-catalog-audit (low confidence; audit framework needs iteration). **Decision:** Merged into decisions.md for team adoption.

### Cross-Org Authentication Docs (v0.8.26)
Created docs/src/content/docs/scenarios/cross-org-auth.md covering GitHub personal + Enterprise Managed Users (EMU) multi-account auth. Three solutions documented: (1) gh auth switch for manual account toggling; (2) Copilot instructions (.github/copilot-instructions.md) for account mapping documentation; (3) Squad skill pattern for auth error detection and recovery. Covered git credential helpers (per-host and per-org), EMU hostname variations (github.com vs dedicated instances), and common error messages (HTTP 401, authentication required). Added cross-references in troubleshooting.md (new section), enterprise-platforms.md (authentication section), and navigation.ts. Updated test/docs-build.test.ts with 'cross-org-auth' in EXPECTED_SCENARIOS. Pattern: Microsoft Style Guide (sentence-case), "Try this" prompts at top, problem/solution structure, practical examples over abstractions, links to related pages at bottom.

### Scannability Framework (v0.8.25)
Format selection is a scannability decision, not style preference. Paragraphs for narrative/concepts (3-4 sentences max). Bullets for scannable items (features, options, non-sequential steps). Tables for comparisons or structured reference data (config, API params). Quotes/indents for callouts/warnings. Decision test: if reader hunts for one item in a paragraph, convert to bullets/table. This framework is now a hard rule in charter under SCANNABILITY REVIEW.

### Docs Catalog Audit (2026)
Full audit of the Astro-based docs site. Key patterns and findings:

**Orphaned pages (exist but not in navigation.ts):** 15 total — `get-started/choose-your-interface.md`, `guide/faq.md`, `guide/build-autonomous-agent.md`, `guide/github-auth-setup.md`, `features/built-in-roles.md`, `features/context-hygiene.md`, `features/cost-tracking.md`, `features/issue-templates.md`, `reference/vscode-troubleshooting.md`, and 6 root-level legacy files (`guide.md`, `sample-prompts.md`, `tips-and-tricks.md`, `tour-first-session.md`, `tour-github-issues.md`, `tour-gitlab-issues.md`).

**Stale content:** `whatsnew.md` reports v0.8.2 as current; actual is v0.8.26+. `insider-program.md` uses deprecated `npx github:` install format and references old `.ai-team/` directory name throughout.

**Duplicate/overlap pairs:** `choosing-your-path.md` (in nav) vs `choose-your-interface.md` (orphan, more complete); root-level `sample-prompts.md` vs `guide/sample-prompts.md`; root-level `tips-and-tricks.md` vs `guide/tips-and-tricks.md`; root-level `tour-first-session.md` vs `get-started/first-session.md`.

**Content quality:** All actively-navved pages are well-written, follow Microsoft Style Guide, and use correct install commands. Format standards (H1, experimental callout, "Try this" block, HR, H2 sections) are inconsistently applied — some orphaned pages like `built-in-roles.md` and `cost-tracking.md` lack the standard header/callout pattern.

**Structural issues:** `features/team-setup.md` has a duplicate `## How Init Works` heading (merge artifact). `features/streams.md` nav title is "Streams" but H1 is "Squad SubSquads" (mismatch). `guide/faq.md` is a high-value page completely invisible from the sidebar. `features/built-in-roles.md` is a comprehensive roles reference also invisible from nav.

**Gap:** No dedicated FAQ entry point, no changelog page, cookbook section is thin (one page), no user-facing explanation of the NASA Mission Control naming scheme for agents.

**Navigation:** Zero dead nav links (every nav slug has a matching file). All orphan pages are linked internally from other pages so they are reachable — but not browseable via sidebar.
