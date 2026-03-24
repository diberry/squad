/**
 * Team Markdown I/O — parse and serialize team.md files.
 *
 * Wraps the existing `parseTeamMarkdown()` from markdown-migration.ts
 * and adds serialization for round-trip support.
 *
 * @module state/io/team-io
 */

import { parseTeamMarkdown, type ParsedAgent } from '../../config/markdown-migration.js';

export type { ParsedAgent };

/**
 * Optional metadata for the team.md file header.
 */
export interface TeamMetadata {
  /** Team name displayed in the title */
  teamName?: string;
  /** Tagline shown below the title */
  tagline?: string;
}

/**
 * Parse team markdown into typed agent entries.
 * Delegates to the existing `parseTeamMarkdown()`.
 */
export function parseTeam(markdown: string): ParsedAgent[] {
  const { agents } = parseTeamMarkdown(markdown);
  return agents;
}

/**
 * Serialize agents to a full team.md file.
 *
 * Produces the canonical table format:
 * ```
 * # Team Name
 *
 * ## Members
 *
 * | Name | Role | Charter | Status |
 * |------|------|---------|--------|
 * | Agent | Developer | `.squad/agents/agent/charter.md` | ✅ Active |
 * ```
 */
export function serializeTeam(agents: ParsedAgent[], metadata?: TeamMetadata): string {
  const teamName = metadata?.teamName ?? 'Team';
  const lines: string[] = [`# ${teamName}`];

  if (metadata?.tagline) {
    lines.push('');
    lines.push(`> ${metadata.tagline}`);
  }

  lines.push('');
  lines.push('## Members');
  lines.push('');
  lines.push('| Name | Role | Charter | Status |');
  lines.push('|------|------|---------|--------|');

  for (const agent of agents) {
    const name = agent.name;
    const role = agent.role;
    const charter = `.squad/agents/${agent.name}/charter.md`;
    const status = agent.status ?? '✅ Active';
    lines.push(`| ${name} | ${role} | \`${charter}\` | ${status} |`);
  }

  lines.push('');
  return lines.join('\n');
}
