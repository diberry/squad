# StorageProvider Phase 2 — Migration Tracker

> 35 files with raw `fs` imports migrated to `StorageProvider`.
> Each file = 1 commit (or grouped when trivial).

## Migration Status

### ✅ Migrated — config/ (4 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/config/models.ts` | 3 sync (readFileSync, writeFileSync, existsSync) | Low | `e187b58` ✅ |
| `src/config/legacy-fallback.ts` | 2 sync (existsSync, readFileSync) | Low | `e187b58` ✅ |
| `src/config/agent-source.ts` | 5 async (fs/promises) | Medium | `aa3d285` ✅ |
| `src/config/init.ts` | 14+ (sync + async) | High — partial | `669902c` ✅ (residual: cpSync, statSync, mkdirSync) |

### 🔧 Needs Migration — agents/ (5 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/agents/history-shadow.ts` | 1 import | High (race condition #479) | `f9e0a7f` ✅ |
| `src/agents/index.ts` | 1 import | Medium | |
| `src/agents/lifecycle.ts` | 1 import | Medium | |
| `src/agents/personal.ts` | 1 import | Medium | |
| `src/agents/onboarding.ts` | 2 imports | Medium | |

### 🔧 Needs Migration — ralph/ (3 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/ralph/capabilities.ts` | 2 imports | Medium | `390a049` ✅ |
| `src/ralph/index.ts` | 1 import | Medium | `4ed8fc7` ✅ |
| `src/ralph/rate-limiting.ts` | 2 imports | Medium | `4ed59e2` ✅ |

### ✅ Migrated — runtime/ (4 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/runtime/config.ts` | 1 import | Medium | `2e32923` ✅ |
| `src/runtime/cross-squad.ts` | 1 import | Medium | `f362768` ✅ |
| `src/runtime/scheduler.ts` | 2 imports | High | `f8bfc50` ✅ |
| `src/runtime/squad-observer.ts` | 1 import | Medium | `c97cabc` ✅ |

### 🔧 Needs Migration — skills/ (3 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/skills/skill-loader.ts` | 1 import | Low | |
| `src/skills/skill-script-loader.ts` | 1 import | Low | |
| `src/skills/skill-source.ts` | 1 import | Low | |

### 🔧 Needs Migration — sharing/ (3 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/sharing/consult.ts` | 1 import | Medium | `a77b056` ✅ |
| `src/sharing/export.ts` | 1 import | Medium | `7e9140f` ✅ |
| `src/sharing/import.ts` | 1 import | Medium | `d6cb0d4` ✅ |

### 🔧 Needs Migration — platform/ (3 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/platform/comms.ts` | 1 import | Medium | `0dda907` ✅ |
| `src/platform/comms-file-log.ts` | 1 import | Low | `ff93567` ✅ |

### 🔧 Needs Migration — build/ (2 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/build/bundle.ts` | 1 import | Low | |
| `src/build/release.ts` | 1 import | Low | |

### 🔧 Needs Migration — other (9 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/casting/index.ts` | 1 import | Low | `9354ea4` ✅ |
| `src/tools/index.ts` | 1 import | Medium | `e28ba4f` ✅ |
| `src/streams/resolver.ts` | 1 import | Medium | `ff5cfa4` ✅ |
| `src/upstream/resolver.ts` | 1 import | Medium | `25641a6` ✅ |
| `src/remote/bridge.ts` | 1 import | Low | |
| `src/marketplace/packaging.ts` | 1 import | Low | |
| `src/resolution.ts` | 1 import | Low | |
| `src/multi-squad.ts` | 1 import | Medium | `274f524` ✅ |
| `src/platform/comms-file-log.ts` | 1 import | Low | |

## Migration Order (recommended)

1. **Low complexity first:** casting/index → skills/* → build/* → marketplace/packaging → remote/bridge → resolution
2. **Medium next:** agents/index → agents/lifecycle → agents/personal → sharing/* → tools/index → platform/*
3. **High last:** agents/history-shadow (#479 race), runtime/scheduler, agents/onboarding

## Rules
- One file per commit, one commit per agent spawn
- Smallest possible change — replace fs import with StorageProvider DI
- Build must pass after each commit (`npm run build`)
- Storage tests must pass (`npx vitest run test/storage-provider.test.ts`)
- Do NOT push to bradygaster/squad — all work stays on diberry/squad or local

## Stats
- **Total files:** 35 (excluding fs-storage-provider.ts)
- **Fully migrated:** 21 (zero residual raw fs)
- **Partially migrated:** 14 (SP calls + justified residual raw fs with TODOs)
- **Remaining unmigrated:** 0
- **Commits:** 38 (35 migrations + 2 regression fixes + 1 Phase 3 prep)

## Fix Commits
| Commit | Description |
|--------|-------------|
| `88f734c` | Fix: revert sync functions incorrectly made async (skill-loader, export, comms-file-log) |
| `81e799e` | Fix: restore error behavior for observer and compiler after migration |
| `99bf0e4` | Replace readdirSync with storage.listSync() in export.ts and resolver.ts |

## Residual `node:fs` (no StorageProvider equivalent — all have TODOs)
- `readdirSync` with `withFileTypes` (needs Dirent) — skill-loader, consult, bundle, marketplace, init
- `statSync` / `stat` (needs isDirectory/size) — bundle, release, multi-squad, resolution, init
- `mkdirSync` (empty dirs, not before write) — comms-file-log, multi-squad, resolution, init
- `cpSync` / `copyFile` — consult, init
- `realpathSync` — skill-script-loader
- `fs.watch` / `FSWatcher` — squad-observer
- `rmSync` — multi-squad
