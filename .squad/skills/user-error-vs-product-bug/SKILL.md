---
name: "user-error-vs-product-bug"
description: "Structured analysis to determine if an issue is user error, missing docs, or a product bug"
domain: "issue-triage, ux-analysis, investigation"
confidence: "high"
source: "earned (Issues #46 upgrade UX, #53 global init — both initially ambiguous)"
---

## Context
When a user reports something "doesn't work as expected," the cause could be: (A) user error, (B) missing/misleading documentation, (C) actual product bug. The fix differs dramatically. Wrong diagnosis wastes effort.

## Patterns

### Analysis Framework
1. **Reproduce exactly** — run the user's exact command/steps
2. **Read the code** — trace what actually happens (not what docs say)
3. **Read the docs** — check if docs match code behavior
4. **Classify:**

| Code does X | Docs say X | User expects X | → Verdict |
|-------------|-----------|----------------|-----------|
| ✅ | ✅ | ❌ | User error — docs are correct, user misread |
| ✅ | ❌ | ❌ | Doc bug — code works but docs are wrong/missing |
| ❌ | ✅ | ✅ | Product bug — code doesn't match docs or intent |
| ❌ | ❌ | ✅ | Product bug + doc bug — worst case, both wrong |

### Issue Filing
Include in every bug issue:
- What the user expected
- What actually happened
- Root cause (which file, which line)
- Classification: user error / doc bug / product bug
- Proposed fix with specific files

## Examples
- Issue #46: `squad upgrade` says "up to date" at 0.8.25 when npm has 0.9.1 → **Product bug** (command name implies CLI upgrade, code only upgrades project files)
- Issue #53: `squad init --global` creates files in wrong location → **Product bug** (docs correct, code wrong)

## Anti-Patterns
- ❌ Classifying as "user error" without reading the code
- ❌ Classifying as "product bug" without checking docs
- ❌ Filing an issue without reproduction steps
