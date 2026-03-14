# Copilot-only docs clarification

**By:** PAO  
**Date:** 2026-03-14

## What

- Added a Platform requirements section and a GitHub Copilot FAQ answer in `README.md`.
- Updated installation, first-session, and migration docs to say Squad routes all LLM requests through GitHub Copilot.
- Updated model-selection-related docs to describe GitHub Copilot as the broker for model access and to remove BYOK-facing wording.
- Marked `SquadProviderConfig` and the `provider` field as internal in `packages/squad-sdk/src/adapter/types.ts`.

## Why

GitHub Copilot is the only supported LLM backend for Squad. User-facing docs must not imply direct provider API access or BYOK support, and internal SDK types should not look like supported public configuration.

## Impact

Users now see a consistent Copilot-only story across setup and model-selection docs. The SDK type surface is also less likely to leak experimental provider override details into generated documentation.
