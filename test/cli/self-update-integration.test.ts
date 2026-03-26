/**
 * Self-Update Integration Tests
 * Tests for checkForNewerCLI and upgrade messaging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdir, rm } from 'fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';

import { checkForNewerCLI } from '@bradygaster/squad-cli/self-update';
import { runUpgrade } from '@bradygaster/squad-cli/core/upgrade';
import { runInit } from '@bradygaster/squad-cli/core/init';

const TEST_ROOT = join(process.cwd(), `.test-self-update-${randomBytes(4).toString('hex')}`);

describe('self-update integration: checkForNewerCLI', () => {
  let savedNoUpdate: string | undefined;
  let savedAppData: string | undefined;
  const fakeCacheDir = join(process.cwd(), `.test-cache-${randomBytes(4).toString('hex')}`);

  beforeEach(() => {
    savedNoUpdate = process.env.SQUAD_NO_UPDATE_CHECK;
    savedAppData = process.env.APPDATA;
    delete process.env.SQUAD_NO_UPDATE_CHECK;
    // Point cache to a non-existent directory so readCache always returns null
    process.env.APPDATA = fakeCacheDir;
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    if (savedNoUpdate !== undefined) process.env.SQUAD_NO_UPDATE_CHECK = savedNoUpdate;
    else delete process.env.SQUAD_NO_UPDATE_CHECK;
    if (savedAppData !== undefined) process.env.APPDATA = savedAppData;
    else delete process.env.APPDATA;
    // Clean up any cache dir created by writeCache
    if (existsSync(fakeCacheDir)) {
      await rm(fakeCacheDir, { recursive: true, force: true });
    }
  });

  it('returns update info when npm has newer version', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ 'dist-tags': { latest: '99.0.0' } }),
    } as Response);

    const result = await checkForNewerCLI('0.8.25');
    expect(result).toEqual({ available: true, latest: '99.0.0', current: '0.8.25' });
  });

  it('returns not-available when already latest', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ 'dist-tags': { latest: '0.8.25' } }),
    } as Response);

    const result = await checkForNewerCLI('0.8.25');
    expect(result).toEqual({ available: false, latest: '0.8.25', current: '0.8.25' });
  });

  it('returns null on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));

    const result = await checkForNewerCLI('0.8.25');
    expect(result).toBeNull();
  });

  it('respects SQUAD_NO_UPDATE_CHECK', async () => {
    process.env.SQUAD_NO_UPDATE_CHECK = '1';
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await checkForNewerCLI('0.8.25');
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('self-update integration: upgrade message', () => {
  beforeEach(async () => {
    if (existsSync(TEST_ROOT)) {
      await rm(TEST_ROOT, { recursive: true, force: true });
    }
    await mkdir(TEST_ROOT, { recursive: true });
    await runInit(TEST_ROOT);
    // First upgrade ensures the project is at current version
    await runUpgrade(TEST_ROOT);
  });

  afterEach(async () => {
    if (existsSync(TEST_ROOT)) {
      await rm(TEST_ROOT, { recursive: true, force: true });
    }
  });

  it('upgrade message says "Project files" not just "Already up to date"', async () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    };

    try {
      // Second upgrade should hit the "already current" path
      await runUpgrade(TEST_ROOT);
    } finally {
      console.log = origLog;
    }

    const output = logs.join('\n');
    expect(output).toContain('Project files');
    expect(output).not.toContain('Already up to date');
  });
});

describe('self-update integration: cache and edge cases', () => {
  let savedNoUpdate: string | undefined;
  let savedAppData: string | undefined;
  const fakeCacheDir = join(process.cwd(), `.test-cache-edge-${randomBytes(4).toString('hex')}`);

  function seedCache(version: string): void {
    const cacheDir = join(fakeCacheDir, 'squad-cli');
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(
      join(cacheDir, 'update-check.json'),
      JSON.stringify({ latestVersion: version, checkedAt: Date.now() }),
      'utf8',
    );
  }

  beforeEach(() => {
    savedNoUpdate = process.env.SQUAD_NO_UPDATE_CHECK;
    savedAppData = process.env.APPDATA;
    delete process.env.SQUAD_NO_UPDATE_CHECK;
    process.env.APPDATA = fakeCacheDir;
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    if (savedNoUpdate !== undefined) process.env.SQUAD_NO_UPDATE_CHECK = savedNoUpdate;
    else delete process.env.SQUAD_NO_UPDATE_CHECK;
    if (savedAppData !== undefined) process.env.APPDATA = savedAppData;
    else delete process.env.APPDATA;
    if (existsSync(fakeCacheDir)) {
      await rm(fakeCacheDir, { recursive: true, force: true });
    }
  });

  it('cache-hit path returns cached version without fetching', async () => {
    seedCache('99.0.0');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await checkForNewerCLI('0.8.25');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ available: true, latest: '99.0.0', current: '0.8.25' });
  });

  it('prerelease current sees stable upgrade as available', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ 'dist-tags': { latest: '0.9.1' } }),
    } as Response);

    const result = await checkForNewerCLI('0.9.1-build.4');
    expect(result).toEqual({ available: true, latest: '0.9.1', current: '0.9.1-build.4' });
  });

  it('stable current does not upgrade to prerelease', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ 'dist-tags': { latest: '0.9.1-rc.1' } }),
    } as Response);

    const result = await checkForNewerCLI('0.9.1');
    expect(result).toEqual({ available: false, latest: '0.9.1-rc.1', current: '0.9.1' });
  });

  it('malformed version from npm returns null', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ 'dist-tags': { latest: 'not-a-version' } }),
    } as Response);

    const result = await checkForNewerCLI('0.8.25');
    expect(result).toBeNull();
  });

  it('bypassCache skips cache and fetches from npm', async () => {
    seedCache('1.0.0');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ 'dist-tags': { latest: '99.0.0' } }),
    } as Response);

    const result = await checkForNewerCLI('0.8.25', { bypassCache: true });
    expect(fetchSpy).toHaveBeenCalled();
    expect(result).toEqual({ available: true, latest: '99.0.0', current: '0.8.25' });
  });
});
