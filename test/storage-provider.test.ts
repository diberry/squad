/**
 * StorageProvider Contract Tests — RED phase
 *
 * These tests define the complete contract that any StorageProvider
 * implementation must satisfy. They are written against FSStorageProvider
 * stubs, so every test fails until the implementation is wired in.
 *
 * Run these tests BEFORE implementation → all fail (RED).
 * Run them AFTER implementation → all pass (GREEN).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { FSStorageProvider } from '../packages/squad-sdk/src/storage/fs-storage-provider.js';
import type { StorageProvider } from '../packages/squad-sdk/src/storage/storage-provider.js';

let provider: StorageProvider;
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'squad-storage-test-'));
  provider = new FSStorageProvider();
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ── write / read ────────────────────────────────────────────────────────────

describe('write + read', () => {
  it('writes a file and reads it back', async () => {
    const file = join(tmpDir, 'hello.txt');
    await provider.write(file, 'hello world');
    const result = await provider.read(file);
    expect(result).toBe('hello world');
  });

  it('overwrites existing content on write', async () => {
    const file = join(tmpDir, 'overwrite.txt');
    await provider.write(file, 'first');
    await provider.write(file, 'second');
    const result = await provider.read(file);
    expect(result).toBe('second');
  });

  it('write creates parent directories recursively', async () => {
    const file = join(tmpDir, 'deep', 'nested', 'dir', 'file.txt');
    await provider.write(file, 'deep content');
    const result = await provider.read(file);
    expect(result).toBe('deep content');
  });

  it('read returns undefined for a missing file (ENOENT)', async () => {
    const file = join(tmpDir, 'nonexistent.txt');
    const result = await provider.read(file);
    expect(result).toBeUndefined();
  });

  it('read returns empty string for a file written with empty string', async () => {
    const file = join(tmpDir, 'empty.txt');
    await provider.write(file, '');
    const result = await provider.read(file);
    expect(result).toBe('');
  });
});

// ── append ───────────────────────────────────────────────────────────────────

describe('append', () => {
  it('creates a file on first append', async () => {
    const file = join(tmpDir, 'new-append.txt');
    await provider.append(file, 'line1\n');
    const result = await provider.read(file);
    expect(result).toBe('line1\n');
  });

  it('appends to an existing file', async () => {
    const file = join(tmpDir, 'existing.txt');
    await provider.write(file, 'line1\n');
    await provider.append(file, 'line2\n');
    const result = await provider.read(file);
    expect(result).toBe('line1\nline2\n');
  });

  it('append creates parent directories', async () => {
    const file = join(tmpDir, 'sub', 'append.log');
    await provider.append(file, 'entry');
    const result = await provider.read(file);
    expect(result).toBe('entry');
  });
});

// ── exists ───────────────────────────────────────────────────────────────────

describe('exists', () => {
  it('returns true for an existing file', async () => {
    const file = join(tmpDir, 'real.txt');
    await provider.write(file, 'data');
    expect(await provider.exists(file)).toBe(true);
  });

  it('returns false for a missing path', async () => {
    const file = join(tmpDir, 'ghost.txt');
    expect(await provider.exists(file)).toBe(false);
  });

  it('returns true for a directory', async () => {
    expect(await provider.exists(tmpDir)).toBe(true);
  });
});

// ── list ─────────────────────────────────────────────────────────────────────

describe('list', () => {
  it('returns file names in a directory', async () => {
    await provider.write(join(tmpDir, 'a.txt'), 'a');
    await provider.write(join(tmpDir, 'b.txt'), 'b');
    const entries = await provider.list(tmpDir);
    expect(entries.sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('returns an empty array for an empty directory', async () => {
    const entries = await provider.list(tmpDir);
    expect(entries).toEqual([]);
  });

  it('returns an empty array for a non-existent directory', async () => {
    const entries = await provider.list(join(tmpDir, 'no-such-dir'));
    expect(entries).toEqual([]);
  });

  it('returns only direct children — not full paths', async () => {
    await provider.write(join(tmpDir, 'file.txt'), 'x');
    const entries = await provider.list(tmpDir);
    expect(entries).not.toContain(join(tmpDir, 'file.txt'));
    expect(entries).toContain('file.txt');
  });
});

// ── delete ───────────────────────────────────────────────────────────────────

describe('delete', () => {
  it('removes an existing file', async () => {
    const file = join(tmpDir, 'todelete.txt');
    await provider.write(file, 'bye');
    await provider.delete(file);
    expect(await provider.exists(file)).toBe(false);
  });

  it('is a no-op when file does not exist (no throw)', async () => {
    const file = join(tmpDir, 'never-existed.txt');
    await expect(provider.delete(file)).resolves.toBeUndefined();
  });
});

// ── sync methods ─────────────────────────────────────────────────────────────

describe('sync methods', () => {
  it('writeSync + readSync round-trip', () => {
    const file = join(tmpDir, 'sync.txt');
    provider.writeSync(file, 'sync data');
    expect(provider.readSync(file)).toBe('sync data');
  });

  it('writeSync creates parent directories', () => {
    const file = join(tmpDir, 'sync', 'nested', 'file.txt');
    provider.writeSync(file, 'nested sync');
    expect(provider.readSync(file)).toBe('nested sync');
  });

  it('readSync returns undefined for missing file', () => {
    const file = join(tmpDir, 'missing-sync.txt');
    expect(provider.readSync(file)).toBeUndefined();
  });

  it('existsSync returns true for an existing file', () => {
    const file = join(tmpDir, 'exists-sync.txt');
    provider.writeSync(file, 'yes');
    expect(provider.existsSync(file)).toBe(true);
  });

  it('existsSync returns false for a missing path', () => {
    expect(provider.existsSync(join(tmpDir, 'nope.txt'))).toBe(false);
  });
});

// ── sync / async parity ──────────────────────────────────────────────────────

describe('sync/async parity', () => {
  it('readSync and read return the same content', async () => {
    const file = join(tmpDir, 'parity.txt');
    await provider.write(file, 'parity check');
    const async_result = await provider.read(file);
    const sync_result = provider.readSync(file);
    expect(sync_result).toBe(async_result);
  });

  it('existsSync and exists agree on a present file', async () => {
    const file = join(tmpDir, 'agree.txt');
    await provider.write(file, 'x');
    expect(provider.existsSync(file)).toBe(await provider.exists(file));
  });

  it('existsSync and exists agree on a missing file', async () => {
    const file = join(tmpDir, 'absent.txt');
    expect(provider.existsSync(file)).toBe(await provider.exists(file));
  });
});
