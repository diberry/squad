/**
 * StorageProvider — abstract I/O contract for squad-sdk.
 *
 * All persistent storage operations flow through this interface so that
 * runtimes (Node fs, in-memory, cloud) can be swapped without touching
 * business logic.
 *
 * Wave 1 ships FSStorageProvider (Node.js fs wrapper).
 * Wave 2 will remove the synchronous methods; callers should migrate now.
 */
export interface StorageProvider {
  /**
   * Read the full contents of a file as a UTF-8 string.
   * Returns `undefined` if the file does not exist (ENOENT).
   */
  read(filePath: string): Promise<string | undefined>;

  /**
   * Write data to a file, creating parent directories as needed.
   * Overwrites any existing content.
   */
  write(filePath: string, data: string): Promise<void>;

  /**
   * Append data to a file, creating it (and parent dirs) if it does not exist.
   */
  append(filePath: string, data: string): Promise<void>;

  /**
   * Return `true` if the path exists (file or directory).
   */
  exists(filePath: string): Promise<boolean>;

  /**
   * Return the names (not full paths) of entries directly inside `dirPath`.
   * Returns an empty array if the directory is empty or does not exist.
   */
  list(dirPath: string): Promise<string[]>;

  /**
   * Delete a file. No-op if the file does not exist (ENOENT).
   */
  delete(filePath: string): Promise<void>;

  // ── Synchronous variants (Wave 1 compat) ────────────────────────────────
  // These exist so callers that cannot be made async in Wave 1 still work.
  // They will be removed in Wave 2; migrate to the async versions now.

  /**
   * Synchronous read. Returns `undefined` on ENOENT.
   * @deprecated Prefer `read()`. Will be removed in Wave 2.
   */
  readSync(filePath: string): string | undefined;

  /**
   * Synchronous write with recursive mkdir.
   * @deprecated Prefer `write()`. Will be removed in Wave 2.
   */
  writeSync(filePath: string, data: string): void;

  /**
   * Synchronous exists check.
   * @deprecated Prefer `exists()`. Will be removed in Wave 2.
   */
  existsSync(filePath: string): boolean;
}
