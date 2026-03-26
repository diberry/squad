/**
 * Tests for Issue #53 — squad init --global file placement fix.
 *
 * Verifies that `squad init --global` creates the personal-squad directory
 * structure at the correct location (personal-squad/) and does NOT create
 * a `.squad/` directory at the global config root.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  resolveGlobalSquadPath,
  resolvePersonalSquadDir,
  ensurePersonalSquadDir,
} from '@bradygaster/squad-sdk/resolution';

// Isolated temp dir inside CWD — randomized to avoid parallel collisions
const TMP = join(process.cwd(), `.test-global-init-${randomBytes(4).toString('hex')}`);

function cleanup() {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
}

/** Override env so resolveGlobalSquadPath() returns a sandboxed path inside TMP. */
function sandboxEnv(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {
    APPDATA: process.env['APPDATA'],
    XDG_CONFIG_HOME: process.env['XDG_CONFIG_HOME'],
    HOME: process.env['HOME'],
  };
  if (process.platform === 'win32') {
    process.env['APPDATA'] = TMP;
  } else if (process.platform === 'darwin') {
    process.env['HOME'] = TMP;
  } else {
    process.env['XDG_CONFIG_HOME'] = TMP;
  }
  return saved;
}

function restoreEnv(saved: Record<string, string | undefined>) {
  for (const [key, val] of Object.entries(saved)) {
    if (val !== undefined) process.env[key] = val;
    else delete process.env[key];
  }
}

// ============================================================================
// Global init creates files inside personal-squad/
// ============================================================================

describe('issue #53 — global init creates files in personal-squad/', () => {
  let globalDir: string;
  let personalDir: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    cleanup();
    mkdirSync(TMP, { recursive: true });
    savedEnv = sandboxEnv();
    globalDir = resolveGlobalSquadPath();
    personalDir = join(globalDir, 'personal-squad');
  });

  afterEach(() => {
    restoreEnv(savedEnv);
    cleanup();
  });

  it('global init creates agents/ inside personal-squad/ directory', () => {
    const result = ensurePersonalSquadDir();
    expect(result).toBe(personalDir);
    expect(existsSync(join(personalDir, 'agents'))).toBe(true);
  });

  it('global init does NOT create .squad/ at global root level', () => {
    ensurePersonalSquadDir();
    const dotSquad = join(globalDir, '.squad');
    expect(existsSync(dotSquad)).toBe(false);
  });

  it('personal-squad/ is discoverable by resolvePersonalSquadDir()', () => {
    ensurePersonalSquadDir();
    const discovered = resolvePersonalSquadDir();
    expect(discovered).toBe(personalDir);
  });

  it('global init creates config.json in personal-squad/', () => {
    ensurePersonalSquadDir();
    const configPath = join(personalDir, 'config.json');
    expect(existsSync(configPath)).toBe(true);

    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(config).toHaveProperty('defaultModel');
    expect(config).toHaveProperty('ghostProtocol', true);
  });

  it('ensurePersonalSquadDir is idempotent', () => {
    const first = ensurePersonalSquadDir();
    const second = ensurePersonalSquadDir();
    expect(first).toBe(second);
    expect(existsSync(join(personalDir, 'agents'))).toBe(true);
    expect(existsSync(join(personalDir, 'config.json'))).toBe(true);
  });
});

// ============================================================================
// runInit with isGlobal skips full scaffold
// ============================================================================

describe('issue #53 — runInit with isGlobal skips .squad/ scaffold', () => {
  let globalDir: string;
  let personalDir: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    cleanup();
    mkdirSync(TMP, { recursive: true });
    savedEnv = sandboxEnv();
    globalDir = resolveGlobalSquadPath();
    personalDir = join(globalDir, 'personal-squad');
  });

  afterEach(() => {
    restoreEnv(savedEnv);
    cleanup();
  });

  it('runInit with isGlobal=true creates personal-squad/ with casting/ and skills/', { timeout: 15_000 }, async () => {
    const { runInit } = await import('../../packages/squad-cli/src/cli/core/init.js');

    await runInit(globalDir, { isGlobal: true });

    expect(existsSync(personalDir)).toBe(true);
    expect(existsSync(join(personalDir, 'agents'))).toBe(true);
    expect(existsSync(join(personalDir, 'casting'))).toBe(true);
    expect(existsSync(join(personalDir, 'skills'))).toBe(true);
    expect(existsSync(join(personalDir, 'config.json'))).toBe(true);

    // .squad/ should NOT exist at the global root
    const dotSquad = join(globalDir, '.squad');
    expect(existsSync(dotSquad)).toBe(false);
  });

  it('runInit with isGlobal=true does not create .squad/ at global root', { timeout: 15_000 }, async () => {
    const { runInit } = await import('../../packages/squad-cli/src/cli/core/init.js');
    await runInit(globalDir, { isGlobal: true });

    const dotSquad = join(globalDir, '.squad');
    expect(existsSync(dotSquad)).toBe(false);
  });
});
