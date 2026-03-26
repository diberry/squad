/**
 * Self-update check — Phase 1: background version check with notification.
 *
 * Non-blocking startup check that queries the npm registry for the latest
 * version of @bradygaster/squad-cli and displays a passive banner when
 * an update is available. Results are cached for 24 hours.
 *
 * Disable with: SQUAD_NO_UPDATE_CHECK=1
 *
 * @module cli/self-update
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { compareVersions } from './upgrade.js';
import { BOLD, RESET, DIM, YELLOW } from './core/output.js';

const PACKAGE_NAME = '@bradygaster/squad-cli';
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 3000; // 3 seconds

interface CacheData {
  latestVersion: string;
  checkedAt: number;
}

/** Directory for squad CLI cache files. */
function getCacheDir(): string {
  const base = process.env.APPDATA
    ?? (process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : path.join(os.homedir(), '.config'));
  return path.join(base, 'squad-cli');
}

function getCachePath(): string {
  return path.join(getCacheDir(), 'update-check.json');
}

/** Read cached version check result, if still valid. */
function readCache(): CacheData | null {
  try {
    const raw = fs.readFileSync(getCachePath(), 'utf8');
    const data: CacheData = JSON.parse(raw);
    if (Date.now() - data.checkedAt < CACHE_TTL_MS) {
      return data;
    }
  } catch {
    // Cache missing, corrupt, or expired — ignore
  }
  return null;
}

/** Write version check result to cache. */
function writeCache(data: CacheData): void {
  try {
    const dir = getCacheDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getCachePath(), JSON.stringify(data), 'utf8');
  } catch {
    // Non-critical — silently ignore write failures
  }
}

/** Fetch latest version from npm registry with timeout. */
export async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(REGISTRY_URL, {
      headers: { Accept: 'application/vnd.npm.install-v1+json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json() as { 'dist-tags'?: { latest?: string } };
    return data['dist-tags']?.latest ?? null;
  } catch {
    // Network failure, timeout, or parse error — silently ignore
    return null;
  }
}

export interface CLIUpdateCheck {
  available: boolean;
  latest: string;
  current: string;
}

/**
 * Check if a newer CLI version exists on npm.
 * Returns null if check fails or is disabled. Never throws.
 */
export async function checkForNewerCLI(
  currentVersion: string,
  options?: { bypassCache?: boolean }
): Promise<CLIUpdateCheck | null> {
  try {
    if (process.env.SQUAD_NO_UPDATE_CHECK === '1') return null;

    const cached = options?.bypassCache ? null : readCache();
    let latest: string;

    if (cached) {
      latest = cached.latestVersion;
    } else {
      const fetched = await fetchLatestVersion();
      if (!fetched) return null;
      latest = fetched;
      writeCache({ latestVersion: latest, checkedAt: Date.now() });
    }

    return {
      available: compareVersions(latest, currentVersion) > 0,
      latest,
      current: currentVersion,
    };
  } catch {
    return null;
  }
}

/**
 * Check for updates and print a banner if a newer version is available.
 *
 * This function is designed to be fire-and-forget: it never throws,
 * never blocks the shell, and silently no-ops on any failure.
 *
 * @param currentVersion - The currently running CLI version
 */
export async function notifyIfUpdateAvailable(
  currentVersion: string,
  options?: { bypassCache?: boolean }
): Promise<void> {
  try {
    const result = await checkForNewerCLI(currentVersion, options);
    if (result?.available) {
      console.log(
        `\n${YELLOW}⚡${RESET} ${BOLD}Squad v${result.latest}${RESET} available ${DIM}(you have v${result.current})${RESET}` +
        `\n   Run: ${BOLD}npm install -g @bradygaster/squad-cli@latest${RESET}\n`,
      );
    }
  } catch {
    // Absolute safety net
  }
}
