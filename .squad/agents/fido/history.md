# FIDO

> Flight Dynamics Officer

## Learnings

### Name-Agnostic Testing Pattern
Tests reading live .squad/ files (team.md, routing.md) must assert structure/behavior, not specific agent names. Names change during team rebirths. Two classes of tests: (1) live-file tests — must survive rebirths, use property checks, (2) inline-fixture tests — self-contained, can hardcode names. See ralph-triage.test.ts for the canonical pattern.

### Dynamic Content Discovery
Blog tests in docs-build.test.ts use filesystem discovery (readdirSync) instead of hardcoded arrays. Adding/removing blog posts no longer requires updating the test. Pattern: discover from disk, sort, validate build output exists.

### Test Baseline (Post-v0.8.24)
3,931 tests passing, 46 todo, 5 skipped, 149 test files (~89s). Only failure: aspire-integration.test.ts (needs Docker daemon). Speed gates in speed-gates.test.ts enforce UX budgets (help output <100 lines, init <10s, etc.).

### Command Wiring Regression Test
cli-command-wiring.test.ts prevents the "unwired command" bug: verifies every .ts file in packages/squad-cli/src/cli/commands/ is imported in cli-entry.ts. Bidirectional validation — also checks that every import points to an existing file.

### CLI Packaging Smoke Test (v0.8.24 Release Assessment)
cli-packaging-smoke.test.ts validates the PACKAGED CLI artifact (npm pack → install → execute). Tests 27 commands + 3 aliases by invoking them through the installed tarball. Catches: missing imports (MODULE_NOT_FOUND), broken package.json exports, bin script misconfiguration, and ESM resolution failures. Gate runs before both SDK and CLI publish jobs. Complements cli-command-wiring.test.ts (source-level import verification) by testing the artifact users actually download. All 32 tests passing (37s runtime). Approved for v0.8.24 release gate.

📌 **Team update (2026-03-08T21:18:00Z):** FIDO + EECOM released unanimous GO verdict for v0.8.24. Smoke test approved as release gate. FIDO confirmed 32/32 pass + publish.yml wired correctly. EECOM confirmed 26/26 commands + packaging complete (minor gap: "streams" alias untested, non-blocking).

### Docs Test Sync Pattern
Test assertions for markdown documentation must stay in sync with actual files on disk. Pattern in docs-build.test.ts: use EXPECTED_* arrays (EXPECTED_GET_STARTED, EXPECTED_REFERENCE, etc.) that list files by name (without .md extension). When adding new docs sections, update three places: (1) EXPECTED_* array for the section, (2) sections array in getAllMarkdownFiles(), (3) HTML existence check loop. Test validates both markdown files exist AND build produces HTML output. Prevents CI breakage from stale test counts.

📌 Team update (2026-03-09T19:16:49Z): PAO + FIDO verified docs-test sync across PRs #318, #317, #305, #303. All 4 new docs files in PR #303 have matching test assertions (EXPECTED_CONCEPTS array correct, no gaps). Sync pattern now documented and team-wide validated.

### PR #326 Quality Review: Adoption Tracking (2026-03-09)
Reviewed PR #326 "Adoption tracking showcase and automated monitoring" for test coverage, CI/CD security, and script robustness. **Verdict: ✅ APPROVE.** Test assertions correctly synced (`EXPECTED_COMMUNITY = ['built-with-squad']` matches disk). GitHub Action permissions minimally scoped (`contents: write` only). Script has solid error handling (retry logic, rate limit warnings, graceful degradation). Identified minor gaps: (1) no unit tests for adoption-monitor.mjs pure functions (calculateDelta, calculatePercentage), (2) missing directory existence check for `.squad/adoption/reports/`, (3) no failure notification mechanism. All gaps non-blocking — script is low-risk (only writes reports). Recommended follow-up issue for unit test coverage. Pattern validated: zero-dependency Node.js scripts with built-in fetch, fail-fast on missing env vars, graceful degradation on API failures.


