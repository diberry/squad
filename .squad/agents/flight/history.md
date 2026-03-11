# Flight — Project History

> Knowledge accumulated through leading Squad development.

---

## Learnings

**Updated now.md to reflect post-v0.8.24 state:** Apollo 13 team, 3931 tests, Tamir's active branches across 5 feature streams (remote-control, hierarchical-squad-inheritance, ralph-watch, project-type-detection, prevent-git-checkout-data-loss).

**Updated wisdom.md with 4 patterns + 2 anti-patterns from recent work:** Test name-agnosticism for team rebirths, dynamic filesystem discovery for evolving content, cli-entry.ts unwired command bug pattern, bump-build.mjs version mutation timing, invalid semver formats, git reset data loss.

**Issue triage attempted for 30 open issues:** Identified 10 unlabeled issues requiring squad assignment. Enterprise Managed User permissions blocked GitHub API label updates via `gh issue edit`. Triage analysis complete:
- SDK issues (#337, #342) → squad:eecom + squad:capcom (init flow + casting engine)
- Personal squad (#343, #344) → squad:flight (architecture territory)
- A2A protocol (#332-336) → squad:flight + domain experts (network, vox, retro, eecom)
- Tooling layers (#330) → squad:eecom + squad:procedures
Manual label application needed by repo owner.

**SDK Init Shore-Up PRD created:** Consolidated 6 SDK-related issues (#337-342, #340-341) into unified 3-phase initiative at `.squad/identity/prd-sdk-init-shoreup.md`. Root causes: config sync gap, built-in member exclusion (Ralph, @copilot), CastingEngine bypass. Solution: Phase 1 fixes gaps (P1), Phase 2 wires CastingEngine (P1), Phase 3 exercises full test matrix (P2). Estimated 4 sprints to 100% SDK feature parity. Owners: EECOM + CAPCOM (phases 1-2), FIDO + CAPCOM (phase 3).

📌 **Team update (2026-03-11T01:25:00Z):** Flight completed 30-issue triage + unified SDK Init Shore-Up PRD. CAPCOM + EECOM completed deep technical analysis + implementation roadmap. 5 decisions merged to decisions.md: Phase-based quality improvement program, CastingEngine canonical casting, squad.config.ts as source of truth, Ralph always-included, implementation priority order.
