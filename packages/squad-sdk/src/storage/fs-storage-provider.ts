import type { StorageProvider } from './storage-provider.js';

/**
 * FSStorageProvider — STUB.
 *
 * Implements the StorageProvider interface shape so TypeScript is satisfied,
 * but every method throws. Tests written against this class will all fail —
 * that is the intent: RED phase of TDD.
 */
export class FSStorageProvider implements StorageProvider {
  read(_filePath: string): Promise<string | undefined> {
    throw new Error('Not implemented');
  }

  write(_filePath: string, _data: string): Promise<void> {
    throw new Error('Not implemented');
  }

  append(_filePath: string, _data: string): Promise<void> {
    throw new Error('Not implemented');
  }

  exists(_filePath: string): Promise<boolean> {
    throw new Error('Not implemented');
  }

  list(_dirPath: string): Promise<string[]> {
    throw new Error('Not implemented');
  }

  delete(_filePath: string): Promise<void> {
    throw new Error('Not implemented');
  }

  readSync(_filePath: string): string | undefined {
    throw new Error('Not implemented');
  }

  writeSync(_filePath: string, _data: string): void {
    throw new Error('Not implemented');
  }

  existsSync(_filePath: string): boolean {
    throw new Error('Not implemented');
  }
}
