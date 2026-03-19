/**
 * Template sync tests — ensures all template directories stay in sync
 * for casting-critical files (squad.agent.md, casting-policy.json, casting-reference.md).
 *
 * Canonical sources: .squad-templates/ and templates/
 * Copies: packages/squad-cli/templates/, packages/squad-sdk/templates/, .github/agents/
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFile(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  return existsSync(resolve(ROOT, relPath));
}

/** Extract the universe count from a squad.agent.md file (anchored to list item). */
function extractUniverseCount(content: string): number | null {
  const m = content.match(/^-\s+(\d+)\s+universes?\s+available/im);
  return m ? Number(m[1]) : null;
}

/** Parse casting-policy.json and return universe names from the allowlist. */
function parsePolicyUniverses(relPath: string): string[] {
  const json = JSON.parse(readFile(relPath));
  return json.allowlist_universes as string[];
}

/** Parse casting-policy.json and return the capacity map. */
function parsePolicyCapacity(relPath: string): Record<string, number> {
  const json = JSON.parse(readFile(relPath));
  return json.universe_capacity as Record<string, number>;
}

// ---------------------------------------------------------------------------
// All template locations
// ---------------------------------------------------------------------------

const SQUAD_AGENT_LOCATIONS = [
  '.squad-templates/squad.agent.md',
  'templates/squad.agent.md',
  '.github/agents/squad.agent.md',
  'packages/squad-cli/templates/squad.agent.md',
  'packages/squad-sdk/templates/squad.agent.md',
] as const;

const CASTING_POLICY_LOCATIONS = [
  '.squad-templates/casting-policy.json',
  'templates/casting-policy.json',
  'packages/squad-cli/templates/casting-policy.json',
  'packages/squad-sdk/templates/casting-policy.json',
] as const;

const CASTING_REFERENCE_LOCATIONS = [
  '.squad-templates/casting-reference.md',
  'templates/casting-reference.md',
  'packages/squad-cli/templates/casting-reference.md',
  'packages/squad-sdk/templates/casting-reference.md',
] as const;

// ---------------------------------------------------------------------------
// squad.agent.md — universe count consistency
// ---------------------------------------------------------------------------

describe('squad.agent.md universe count', () => {
  const canonicalPath = SQUAD_AGENT_LOCATIONS[0];
  const canonicalContent = readFile(canonicalPath);
  const expectedCount = extractUniverseCount(canonicalContent);

  it('canonical file has a parseable universe count', () => {
    expect(expectedCount).not.toBeNull();
    expect(expectedCount).toBeGreaterThan(0);
  });

  for (const loc of SQUAD_AGENT_LOCATIONS) {
    it(`${loc} matches canonical universe count (${expectedCount})`, () => {
      const content = readFile(loc);
      const count = extractUniverseCount(content);
      expect(count).toBe(expectedCount);
    });
  }

  it('universe count matches casting-policy allowlist length', () => {
    const policyUniverses = parsePolicyUniverses(CASTING_POLICY_LOCATIONS[0]);
    expect(expectedCount).toBe(policyUniverses.length);
  });
});

// ---------------------------------------------------------------------------
// casting-policy.json — content parity
// ---------------------------------------------------------------------------

describe('casting-policy.json content parity', () => {
  const canonicalContent = readFile(CASTING_POLICY_LOCATIONS[0]);

  for (const loc of CASTING_POLICY_LOCATIONS) {
    it(`${loc} matches canonical casting-policy.json`, () => {
      const content = readFile(loc);
      expect(content).toBe(canonicalContent);
    });
  }

  it('allowlist and capacity map have the same universes', () => {
    const allowlist = parsePolicyUniverses(CASTING_POLICY_LOCATIONS[0]);
    const capacity = parsePolicyCapacity(CASTING_POLICY_LOCATIONS[0]);
    const capacityNames = Object.keys(capacity);

    expect(allowlist.sort()).toEqual(capacityNames.sort());
  });

  it('all capacities are positive integers', () => {
    const capacity = parsePolicyCapacity(CASTING_POLICY_LOCATIONS[0]);
    for (const [name, cap] of Object.entries(capacity)) {
      expect(cap, `${name} capacity`).toBeGreaterThan(0);
      expect(Number.isInteger(cap), `${name} capacity is integer`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// casting-reference.md — if it exists in canonical, it must exist everywhere
// ---------------------------------------------------------------------------

describe('casting-reference.md sync', () => {
  const canonicalPath = CASTING_REFERENCE_LOCATIONS[0];
  const canonicalExists = fileExists(canonicalPath);

  if (canonicalExists) {
    const canonicalContent = readFile(canonicalPath);

    for (const loc of CASTING_REFERENCE_LOCATIONS) {
      it(`${loc} exists and matches canonical`, () => {
        expect(fileExists(loc), `${loc} should exist`).toBe(true);
        expect(readFile(loc)).toBe(canonicalContent);
      });
    }

    it('universe table row count matches casting-policy universe count', () => {
      // Expect table rows like "| Universe Name |" in the reference
      const tableRows = canonicalContent
        .split('\n')
        .filter((line) => /^\|[^-]/.test(line) && !/^\|\s*Universe/i.test(line));
      const policyUniverses = parsePolicyUniverses(CASTING_POLICY_LOCATIONS[0]);
      expect(tableRows.length).toBe(policyUniverses.length);
    });
  } else {
    it('casting-reference.md does not exist in any template dir (consistent)', () => {
      for (const loc of CASTING_REFERENCE_LOCATIONS) {
        expect(fileExists(loc), `${loc} should not exist`).toBe(false);
      }
    });
  }
});
