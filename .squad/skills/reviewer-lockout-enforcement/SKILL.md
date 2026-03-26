---
name: "reviewer-lockout-enforcement"
description: "When a reviewer rejects work, the original author is locked out until a different agent revises"
domain: "code-review, quality-gates, team-process"
confidence: "high"
source: "earned (PRs #44, #54 — FIDO rejected, EECOM locked out, CONTROL revised)"
---

## Context
When a reviewer rejects a PR, the original author cannot self-revise. A different agent must produce the revision. This prevents rubber-stamping and ensures fresh eyes on failed work.

## Patterns

### Lockout Cycle
1. Agent A authors work
2. Reviewer rejects with specific findings
3. Agent A is LOCKED OUT of that artifact
4. Coordinator routes revision to Agent B (different agent)
5. Agent B addresses all findings, amends commit
6. Re-review runs — if rejected again, Agent B is also locked out
7. Deadlock → escalate to user

### Coordinator Enforcement
- Before spawning revision agent, verify it's NOT the original author
- Include "EECOM authored → locked out" in revision prompt
- Track lockouts per-artifact, not per-session

## Examples
- PR #44: EECOM authored → Flight rejected → EECOM locked out → CONTROL revised → approved
- PR #54: EECOM authored → FIDO rejected (test timeout) → CONTROL revised → approved

## Anti-Patterns
- ❌ Original author "helping" the revision agent
- ❌ Coordinator re-admitting locked-out author because "it's a small fix"
- ❌ Skipping lockout for "approve with changes" (only applies to rejections)
