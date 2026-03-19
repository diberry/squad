# Decision: Template directory sync enforcement

**Author:** Fenster (Core Dev)
**Date:** 2026-07-16
**Issue:** #461
**PR:** #462

## Context

PR #460 fixed universe count in some but not all template copies, revealing that we had 5 locations with duplicated files and no automated enforcement.

## Decision

1. `.squad-templates/` is the **canonical source** for all template files.
2. All copies in `templates/`, `packages/squad-cli/templates/`, `packages/squad-sdk/templates/`, and `.github/agents/` must match canonical.
3. `test/template-sync.test.ts` enforces byte-for-byte parity for casting-policy.json, universe count parity for squad.agent.md, and cross-file count validation.
4. Any future template changes must update ALL locations and pass the sync tests.

## Impact

All team members editing template files.
