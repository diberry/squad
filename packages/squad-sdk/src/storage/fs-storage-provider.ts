import { readFile, writeFile, appendFile, access, readdir, unlink, mkdir } from 'fs/promises';
import { readFileSync, writeFileSync, existsSync as fsExistsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { StorageProvider } from './storage-provider.js';

/**
 * FSStorageProvider — Node.js `fs` implementation of StorageProvider.
 *
 * - ENOENT reads return `undefined` (no throw).
 * - Writes create parent directories recursively.
 * - Appends create the file (and parent dirs) if missing.
 * - delete is a no-op when the file does not exist.
 * - list returns an empty array for a missing directory.
 */
export class FSStorageProvider implements StorageProvider {
  async read(filePath: string): Promise<string | undefined> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw err;
    }
  }

  async write(filePath: string, data: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data, 'utf-8');
  }

  async append(filePath: string, data: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await appendFile(filePath, data, 'utf-8');
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(dirPath: string): Promise<string[]> {
    try {
      return await readdir(dirPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }

  async delete(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw err;
    }
  }

  readSync(filePath: string): string | undefined {
    try {
      return readFileSync(filePath, 'utf-8');
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw err;
    }
  }

  writeSync(filePath: string, data: string): void {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, data, 'utf-8');
  }

  existsSync(filePath: string): boolean {
    return fsExistsSync(filePath);
  }
}
