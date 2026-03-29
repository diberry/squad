/**
 * Version stamping and reading utilities — zero dependencies
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Get package version from package.json
 * Walks up from the current file to find package.json — works from both
 * compiled dist/cli/core/version.js and bundled cli.js at the root.
 */
export function getPackageVersion(): string {
  const currentFile = fileURLToPath(import.meta.url);
  let dir = path.dirname(currentFile);
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'package.json');
    if (fs.existsSync(candidate)) {
      const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      return pkg.version;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return '0.0.0';
}

/**
 * Stamp version into squad.agent.md after copying
 */
export function stampVersion(filePath: string, version: string): void {
  let content = fs.readFileSync(filePath, 'utf8');
  // Replace version in HTML comment (must come immediately after frontmatter closing ---)
  content = content.replace(/<!-- version: [^>]+ -->/m, `<!-- version: ${version} -->`);
  // Replace version in the Identity section's Version line
  content = content.replace(/- \*\*Version:\*\* [0-9.]+(?:-[a-z]+(?:\.\d+)?)?/m, `- **Version:** ${version}`);
  // Replace {version} placeholder in the greeting instruction so it's unambiguous
  content = content.replace(/`Squad v\{version\}`/g, `\`Squad v${version}\``);
  fs.writeFileSync(filePath, content);
}

/**
 * Read version from squad.agent.md HTML comment
 */
export function readInstalledVersion(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    // Try to read from HTML comment first (new format)
    const commentMatch = content.match(/<!-- version: ([0-9.]+(?:-[a-z]+(?:\.\d+)?)?) -->/);
    if (commentMatch) return commentMatch[1]!;
    // Fallback: try old frontmatter format for backward compatibility during upgrade
    const frontmatterMatch = content.match(/^version:\s*"([^"]+)"/m);
    return frontmatterMatch ? frontmatterMatch[1]! : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Config file names to check, in priority order */
const CONFIG_CANDIDATES = ['squad.config.ts', 'squad.config.js'] as const;

/**
 * Discover the squad config file (squad.config.ts or squad.config.js) in a project directory.
 * Returns the absolute path if found, or null.
 */
export function discoverSquadConfig(projectDir: string): string | null {
  for (const name of CONFIG_CANDIDATES) {
    const candidate = path.join(projectDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Stamp the version field inside a squad.config.ts or squad.config.js file.
 * Replaces `version: 'X.Y.Z'` or `version: "X.Y.Z"` with the new version.
 */
export function stampConfigVersion(filePath: string, version: string): void {
  let content = fs.readFileSync(filePath, 'utf8');
  const replaced = content.replace(
    /^(\s*version:\s*)(['"])([0-9]+\.[0-9]+\.[0-9]+(?:-[a-z]+(?:\.\d+)?)?)(['"])/m,
    `$1$2${version}$4`,
  );
  if (replaced !== content) {
    fs.writeFileSync(filePath, replaced);
  }
}

/**
 * Read the version from a squad.config.ts or squad.config.js file.
 * Returns the version string, or null if not found.
 */
export function readConfigVersion(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^\s*version:\s*['"]([0-9]+\.[0-9]+\.[0-9]+(?:-[a-z]+(?:\.\d+)?)?)['"],?/m);
    return match ? match[1]! : null;
  } catch {
    return null;
  }
}
