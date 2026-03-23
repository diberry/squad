# StorageProvider Phase 2 — Migration Tracker

> 31 files with raw `fs` imports need migration to `StorageProvider`.
> Config module already migrated by Brady's team. Each file = 1 commit.

## Migration Status

### ✅ Already Migrated (by upstream)
| File | fs Imports | Status |
|------|-----------|--------|
| `src/config/init.ts` | 0 (uses StorageProvider) | ✅ Done upstream |
| `src/config/legacy-fallback.ts` | 0 (uses StorageProvider) | ✅ Done upstream |
| `src/config/agent-source.ts` | 0 | ✅ No fs imports |
| `src/config/models.ts` | 0 | ✅ No fs imports |

### 🔧 Needs Migration — agents/ (5 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/agents/history-shadow.ts` | 1 import | High (race condition #479) | |
| `src/agents/index.ts` | 1 import | Medium | |
| `src/agents/lifecycle.ts` | 1 import | Medium | |
| `src/agents/personal.ts` | 1 import | Medium | |
| `src/agents/onboarding.ts` | 2 imports | Medium | |

### 🔧 Needs Migration — ralph/ (3 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/ralph/capabilities.ts` | 2 imports | Medium | |
| `src/ralph/index.ts` | 1 import | Medium | |
| `src/ralph/rate-limiting.ts` | 2 imports | Medium | |

### 🔧 Needs Migration — runtime/ (3 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/runtime/config.ts` | 1 import | Medium | |
| `src/runtime/cross-squad.ts` | 1 import | Medium | |
| `src/runtime/scheduler.ts` | 2 imports | High | |

### 🔧 Needs Migration — skills/ (3 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/skills/skill-loader.ts` | 1 import | Low | |
| `src/skills/skill-script-loader.ts` | 1 import | Low | |
| `src/skills/skill-source.ts` | 1 import | Low | |

### 🔧 Needs Migration — sharing/ (3 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/sharing/consult.ts` | 1 import | Medium | |
| `src/sharing/export.ts` | 1 import | Medium | |
| `src/sharing/import.ts` | 1 import | Medium | |

### 🔧 Needs Migration — platform/ (3 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/platform/comms.ts` | 1 import | Medium | |
| `src/platform/comms-file-log.ts` | 1 import | Low | |
| `src/platform/index.ts` | 1 import | Low | |

### 🔧 Needs Migration — build/ (2 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/build/bundle.ts` | 1 import | Low | |
| `src/build/release.ts` | 1 import | Low | |

### 🔧 Needs Migration — other (9 files)
| File | Raw fs Calls | Complexity | Commit |
|------|-------------|------------|--------|
| `src/casting/index.ts` | 1 import | Low | `9354ea4` ✅ |
| `src/tools/index.ts` | 1 import | Medium | |
| `src/streams/resolver.ts` | 1 import | Medium | |
| `src/upstream/resolver.ts` | 1 import | Medium | |
| `src/remote/bridge.ts` | 1 import | Low | |
| `src/marketplace/packaging.ts` | 1 import | Low | |
| `src/resolution.ts` | 1 import | Low | |
| `src/multi-squad.ts` | 1 import | Medium | |
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
- **Total files:** 31 (excluding fs-storage-provider.ts)
- **Already done:** 4 (config module — done by upstream)
- **Remaining:** 26
- **Commits so far:** 1
