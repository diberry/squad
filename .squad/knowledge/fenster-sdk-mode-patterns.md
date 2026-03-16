---
title: SDK Mode Patterns — Detection and Build
author: fenster
tags: [sdk, build, architecture, detection]
created: 2026-03-16
---

# SDK Mode Patterns — Detection and Build

## Problem Statement

Squad supports two operating modes:
1. **Runtime mode:** Users run Squad from installed npm package
2. **SDK mode:** Developers work in Squad's own repository

These modes have different requirements:
- Runtime mode needs compiled JavaScript
- SDK mode needs source TypeScript with watch mode
- Detection must be automatic and reliable
- Build scripts must handle both modes

## SDK Mode Detection

### Primary Signal: squad.config.ts

The definitive signal of SDK mode is the presence of `squad.config.ts` in the project root.

```typescript
// scripts/detect-sdk-mode.ts
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function isSDKMode(): boolean {
  return existsSync(resolve(process.cwd(), 'squad.config.ts'));
}
```

**Why `squad.config.ts`?**
- Only exists in Squad's own repo
- Runtime users never have this file
- Clear semantic meaning ("this is the SDK project")

### Anti-Pattern: package.json Detection

❌ **Don't use:** `package.json` name field

**Bad:**
```typescript
function isSDKMode() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  return pkg.name === 'squad-sdk';
}
```

**Why not:**
- Fragile — breaks if package is renamed
- Not semantic — package name is for npm, not mode detection
- Unreliable — user projects might have similar names

### Anti-Pattern: Directory Structure Detection

❌ **Don't use:** Presence of `packages/` or `squad/` directories

**Bad:**
```typescript
function isSDKMode() {
  return existsSync('packages') && existsSync('squad');
}
```

**Why not:**
- Coincidental — users might have these directories
- Unreliable — structure could change
- Vague — doesn't clearly indicate SDK mode

## Build Patterns

### Build Script Structure

Squad's build script handles both modes:

```typescript
// build.mjs (simplified)
import { build } from 'esbuild';
import { isSDKMode } from './detect-sdk-mode.ts';

async function main() {
  const mode = isSDKMode() ? 'sdk' : 'runtime';
  
  if (mode === 'sdk') {
    // SDK mode: incremental builds, watch mode
    await buildSDKMode();
  } else {
    // Runtime mode: optimized production build
    await buildRuntimeMode();
  }
}
```

### SDK Mode Build

**Characteristics:**
- Watch mode enabled (rebuild on change)
- Source maps included (for debugging)
- No minification (readability matters)
- Incremental builds (fast iteration)

```javascript
// buildSDKMode()
await build({
  entryPoints: ['squad/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  watch: true,
  sourcemap: true,
  minify: false,
  incremental: true,
});
```

### Runtime Mode Build

**Characteristics:**
- No watch mode (one-time build)
- Source maps optional (smaller package)
- Minification enabled (smaller bundle)
- Optimized for distribution

```javascript
// buildRuntimeMode()
await build({
  entryPoints: ['squad/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  sourcemap: false,
  minify: true,
  treeShaking: true,
});
```

## Development Workflows

### SDK Mode Workflow

Developer working on Squad codebase:

1. Clone Squad repo
2. Run `npm install`
3. Run `npm run build` (detects SDK mode, starts watch)
4. Edit TypeScript files in `squad/`
5. Watch rebuilds automatically
6. Test with `npm test`

### Runtime Mode Workflow

User installing Squad as dependency:

1. Run `npm install squad-sdk`
2. Import Squad: `import { Squad } from 'squad-sdk'`
3. Use compiled JavaScript from `dist/`

## Version Bumping in SDK Mode

### Problem: Auto-Increment During Development

Squad's `bump-build.mjs` script auto-increments version on every build. This is fine for releases but breaks SDK mode:

**Bad behavior:**
- Developer runs `npm run build`
- `bump-build.mjs` increments version: 0.8.21 → 0.8.22
- Developer makes another change, builds again
- Version increments: 0.8.22 → 0.8.23
- 20 builds later: version is 0.8.41 (not released!)

### Solution: SKIP_BUILD_BUMP

Environment variable to skip version bumping in SDK mode:

```bash
SKIP_BUILD_BUMP=1 npm run build
```

**Implementation:**
```javascript
// bump-build.mjs
if (process.env.SKIP_BUILD_BUMP === '1') {
  console.log('Skipping version bump (SKIP_BUILD_BUMP=1)');
  process.exit(0);
}

// Proceed with version bump...
```

**When to use:**
- SDK mode development (always)
- CI builds (usually)
- Local testing (usually)

**When NOT to use:**
- Release builds (must increment version)
- Publishing to npm (version must reflect release)

## Testing in Both Modes

### Unit Tests

Unit tests should work in both modes:

```typescript
// Test imports from source (SDK mode)
import { Squad } from '../squad/index.ts';

// Or from dist (runtime mode)
import { Squad } from '../dist/index.js';
```

Use conditional imports based on mode:

```typescript
const Squad = isSDKMode()
  ? await import('../squad/index.ts')
  : await import('../dist/index.js');
```

### Integration Tests

Integration tests use built output:

```typescript
// Always test against dist/ (production-like)
import { Squad } from '../dist/index.js';
```

Build before running integration tests:

```bash
npm run build && npm run test:integration
```

## CI/CD Patterns

### CI Build (GitHub Actions)

CI should use runtime mode build:

```yaml
- name: Build
  run: npm run build
  env:
    SKIP_BUILD_BUMP: 1  # Don't increment version in CI
```

### Release Build

Release builds need version bump:

```yaml
- name: Build for Release
  run: npm run build
  # SKIP_BUILD_BUMP not set — version increments
```

## Common Issues

### Issue: Version Drifts in SDK Mode

**Symptom:** `package.json` version is 0.8.50 but latest release is 0.8.22

**Cause:** Forgot to set `SKIP_BUILD_BUMP=1` during development

**Solution:**
1. Reset version in `package.json` to current release
2. Set `SKIP_BUILD_BUMP=1` in your shell profile
3. Add to build scripts: `"build": "SKIP_BUILD_BUMP=1 node build.mjs"`

### Issue: Tests Fail After Build

**Symptom:** Tests pass in SDK mode, fail in runtime mode

**Cause:** Tests importing from source instead of dist

**Solution:** Update imports to use dist:

```diff
- import { Squad } from '../squad/index.ts';
+ import { Squad } from '../dist/index.js';
```

### Issue: Watch Mode Not Working

**Symptom:** Changes to TypeScript files don't trigger rebuild

**Cause:** Not in SDK mode or watch disabled

**Solution:**
1. Verify `squad.config.ts` exists
2. Check build script for `watch: true`
3. Restart build with `npm run build`

## Future Improvements

Potential enhancements:
- Auto-detection without environment variables (smarter build script)
- Workspace detection (monorepo support)
- Conditional exports in package.json (direct source imports in SDK mode)
- Type-checking during watch (currently esbuild skips type-checking)
