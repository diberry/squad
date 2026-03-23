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

// ── path traversal protection ────────────────────────────────────────────────

describe('path traversal protection', () => {
  let confinedProvider: StorageProvider;
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'squad-confined-'));
    confinedProvider = new FSStorageProvider(rootDir);
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('blocks relative path traversal with ../', async () => {
    await expect(confinedProvider.read('../etc/passwd')).rejects.toThrow(/Path traversal blocked/);
  });

  it('blocks absolute path outside rootDir', async () => {
    await expect(confinedProvider.write('/tmp/evil.txt', 'hack')).rejects.toThrow(/Path traversal blocked/);
  });

  it('allows normal operations within rootDir', async () => {
    await confinedProvider.write('subdir/file.txt', 'safe');
    const content = await confinedProvider.read('subdir/file.txt');
    expect(content).toBe('safe');
  });

  it('blocks traversal in write', async () => {
    await expect(confinedProvider.write('../../etc/shadow', 'bad')).rejects.toThrow(/Path traversal blocked/);
  });

  it('blocks traversal in append', async () => {
    await expect(confinedProvider.append('../outside.log', 'entry')).rejects.toThrow(/Path traversal blocked/);
  });

  it('blocks traversal in exists', async () => {
    await expect(confinedProvider.exists('../../.env')).rejects.toThrow(/Path traversal blocked/);
  });

  it('blocks traversal in list', async () => {
    await expect(confinedProvider.list('..')).rejects.toThrow(/Path traversal blocked/);
  });

  it('blocks traversal in delete', async () => {
    await expect(confinedProvider.delete('../victim.txt')).rejects.toThrow(/Path traversal blocked/);
  });

  it('blocks traversal in sync methods', () => {
    expect(() => confinedProvider.readSync('../../secret.txt')).toThrow(/Path traversal blocked/);
    expect(() => confinedProvider.writeSync('../bad.txt', 'data')).toThrow(/Path traversal blocked/);
    expect(() => confinedProvider.existsSync('../../.ssh/id_rsa')).toThrow(/Path traversal blocked/);
  });

  it('allows operations at rootDir itself', async () => {
    await confinedProvider.write('root-file.txt', 'at root');
    expect(await confinedProvider.exists('root-file.txt')).toBe(true);
    const entries = await confinedProvider.list('.');
    expect(entries).toContain('root-file.txt');
  });
});

// ── symlink traversal protection ─────────────────────────────────────────────

describe('symlink traversal protection', () => {
  let confinedProvider: StorageProvider;
  let rootDir: string;
  let outsideDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'squad-symlink-root-'));
    outsideDir = await mkdtemp(join(tmpdir(), 'squad-symlink-outside-'));
    confinedProvider = new FSStorageProvider(rootDir);
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
    await rm(outsideDir, { recursive: true, force: true });
  });

  // Skip symlink tests on Windows due to permission requirements
  const isWindows = process.platform === 'win32';
  const testOrSkip = isWindows ? it.skip : it;

  testOrSkip('blocks read via symlink pointing outside rootDir', async () => {
    const { symlink } = await import('fs/promises');
    const outsideFile = join(outsideDir, 'secret.txt');
    const symlinkPath = join(rootDir, 'link-to-outside');

    await provider.write(outsideFile, 'secret data');
    await symlink(outsideFile, symlinkPath);

    await expect(confinedProvider.read('link-to-outside')).rejects.toThrow(/Symlink traversal blocked/);
  });

  testOrSkip('blocks write via symlink pointing outside rootDir', async () => {
    const { symlink } = await import('fs/promises');
    const outsideFile = join(outsideDir, 'target.txt');
    const symlinkPath = join(rootDir, 'evil-link');

    await provider.write(outsideFile, 'initial');
    await symlink(outsideFile, symlinkPath);

    await expect(confinedProvider.write('evil-link', 'overwrite')).rejects.toThrow(/Symlink traversal blocked/);
  });

  testOrSkip('blocks exists check via symlink', async () => {
    const { symlink } = await import('fs/promises');
    const outsideFile = join(outsideDir, 'exists.txt');
    const symlinkPath = join(rootDir, 'link');

    await provider.write(outsideFile, 'data');
    await symlink(outsideFile, symlinkPath);

    await expect(confinedProvider.exists('link')).rejects.toThrow(/Symlink traversal blocked/);
  });

  testOrSkip('allows symlinks within rootDir pointing to other paths within rootDir', async () => {
    const { symlink } = await import('fs/promises');
    const targetPath = join(rootDir, 'target.txt');
    const linkPath = join(rootDir, 'link.txt');

    await confinedProvider.write('target.txt', 'internal data');
    await symlink(targetPath, linkPath);

    const content = await confinedProvider.read('link.txt');
    expect(content).toBe('internal data');
  });

  testOrSkip('blocks write through symlink directory to outside rootDir (ENOENT bypass)', async () => {
    const { symlink, mkdir: mkdirFs } = await import('fs/promises');
    const { existsSync } = await import('fs');

    // Create an outside target directory
    const outsideTarget = join(outsideDir, 'escape-target');
    await mkdirFs(outsideTarget, { recursive: true });

    // Create a symlink DIRECTORY inside rootDir pointing outside
    const symlinkDir = join(rootDir, 'link-dir');
    await symlink(outsideTarget, symlinkDir, 'dir');

    // Attempt to write a NEW file through the symlink directory.
    // The file doesn't exist yet, so realpath on the full path throws ENOENT.
    // The old code would blindly trust the resolved path and follow the symlink.
    await expect(confinedProvider.write('link-dir/newfile.txt', 'malicious'))
      .rejects.toThrow(/Symlink traversal blocked/);

    // Verify the file was NOT written outside rootDir
    expect(existsSync(join(outsideTarget, 'newfile.txt'))).toBe(false);
  });

  testOrSkip('blocks writeSync through symlink directory to outside rootDir (ENOENT bypass)', () => {
    const { symlinkSync, mkdirSync: mkdirSyncFs, existsSync } = require('fs');

    // Create an outside target directory
    const outsideTarget = join(outsideDir, 'escape-target-sync');
    mkdirSyncFs(outsideTarget, { recursive: true });

    // Create a symlink DIRECTORY inside rootDir pointing outside
    const symlinkDir = join(rootDir, 'link-dir-sync');
    symlinkSync(outsideTarget, symlinkDir, 'dir');

    // Attempt writeSync through the symlink directory
    expect(() => confinedProvider.writeSync('link-dir-sync/newfile.txt', 'malicious'))
      .toThrow(/Symlink traversal blocked/);

    // Verify the file was NOT written outside rootDir
    expect(existsSync(join(outsideTarget, 'newfile.txt'))).toBe(false);
  });
});

// ── cross-platform path handling ─────────────────────────────────────────

describe('cross-platform path handling', () => {
  it('allows access with different case on case-insensitive platforms', async () => {
    if (process.platform !== 'win32' && process.platform !== 'darwin') {
      return; // Only relevant on case-insensitive filesystems
    }
    const root = await mkdtemp(join(tmpdir(), 'squad-case-test-'));
    const confinedProvider = new FSStorageProvider(root);

    await confinedProvider.write('test.txt', 'hello');

    // Build an alternate-cased root path
    const altCase = root.charAt(0) === root.charAt(0).toUpperCase()
      ? root.charAt(0).toLowerCase() + root.slice(1)
      : root.charAt(0).toUpperCase() + root.slice(1);

    const result = await confinedProvider.read(join(altCase, 'test.txt'));
    expect(result).toBe('hello');

    await rm(root, { recursive: true, force: true });
  });
});

// ── deleteDir ────────────────────────────────────────────────────────────────

describe('deleteDir', () => {
  it('recursively removes a directory and all contents', async () => {
    const dir = join(tmpDir, 'to-delete');
    await provider.write(join(dir, 'file1.txt'), 'a');
    await provider.write(join(dir, 'subdir', 'file2.txt'), 'b');

    await provider.deleteDir(dir);

    expect(await provider.exists(dir)).toBe(false);
    expect(await provider.exists(join(dir, 'file1.txt'))).toBe(false);
    expect(await provider.exists(join(dir, 'subdir', 'file2.txt'))).toBe(false);
  });

  it('is a no-op when directory does not exist', async () => {
    const dir = join(tmpDir, 'nonexistent-dir');
    await expect(provider.deleteDir(dir)).resolves.toBeUndefined();
  });

  it('removes nested directory structures', async () => {
    const dir = join(tmpDir, 'deep');
    await provider.write(join(dir, 'a', 'b', 'c', 'file.txt'), 'nested');

    await provider.deleteDir(dir);

    expect(await provider.exists(dir)).toBe(false);
  });

  it('blocks deleteDir traversal when rootDir is set', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'squad-delete-confined-'));
    const confinedProvider = new FSStorageProvider(rootDir);

    await expect(confinedProvider.deleteDir('../outside')).rejects.toThrow(/Path traversal blocked/);

    await rm(rootDir, { recursive: true, force: true });
  });
});

// ── concurrent writes ────────────────────────────────────────────────────────

describe('concurrent writes', () => {
  it('handles multiple simultaneous writes to different files', async () => {
    const writes = Array.from({ length: 10 }, (_, i) =>
      provider.write(join(tmpDir, `concurrent-${i}.txt`), `data-${i}`)
    );
    await Promise.all(writes);
    for (let i = 0; i < 10; i++) {
      const content = await provider.read(join(tmpDir, `concurrent-${i}.txt`));
      expect(content).toBe(`data-${i}`);
    }
  });

  it('handles concurrent writes to the same file (last writer wins)', async () => {
    const file = join(tmpDir, 'race.txt');
    const writes = Array.from({ length: 5 }, (_, i) =>
      provider.write(file, `writer-${i}`)
    );
    await Promise.all(writes);
    const content = await provider.read(file);
    expect(content).toMatch(/^writer-[0-4]$/);
  });

  it('handles concurrent appends without data loss', async () => {
    const file = join(tmpDir, 'append-race.txt');
    const appends = Array.from({ length: 10 }, (_, i) =>
      provider.append(file, `line-${i}\n`)
    );
    await Promise.all(appends);
    const content = await provider.read(file);
    for (let i = 0; i < 10; i++) {
      expect(content).toContain(`line-${i}`);
    }
  });

  it('handles concurrent reads and writes', async () => {
    const file = join(tmpDir, 'rw-race.txt');
    await provider.write(file, 'initial');

    const ops = [
      provider.read(file),
      provider.write(file, 'updated'),
      provider.read(file),
      provider.append(file, '-appended'),
      provider.read(file),
    ];
    const results = await Promise.all(ops);
    expect(typeof results[0]).toBe('string');
    expect(typeof results[2]).toBe('string');
    expect(typeof results[4]).toBe('string');
  });

  it('handles concurrent directory creation via writes', async () => {
    const writes = Array.from({ length: 5 }, (_, i) =>
      provider.write(join(tmpDir, 'shared-parent', `file-${i}.txt`), `content-${i}`)
    );
    await Promise.all(writes);
    const entries = await provider.list(join(tmpDir, 'shared-parent'));
    expect(entries.length).toBe(5);
  });
});
