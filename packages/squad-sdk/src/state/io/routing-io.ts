/**
 * Routing Markdown I/O — parse and serialize routing.md files.
 *
 * Wraps the existing `parseRoutingRulesMarkdown()` from markdown-migration.ts
 * and adds serialization for round-trip support.
 *
 * @module state/io/routing-io
 */

import { parseRoutingRulesMarkdown, type ParsedRoutingRule } from '../../config/markdown-migration.js';

export type { ParsedRoutingRule };

/**
 * Parse routing markdown into typed routing rules.
 * Delegates to the existing `parseRoutingRulesMarkdown()`.
 */
export function parseRouting(markdown: string): ParsedRoutingRule[] {
  const { rules } = parseRoutingRulesMarkdown(markdown);
  return rules;
}

/**
 * Serialize routing rules to a full routing.md file.
 *
 * Produces:
 * ```
 * # Routing Rules
 *
 * ## Routing Table
 *
 * | Work Type | Agent | Examples |
 * |-----------|-------|----------|
 * | feature-dev | Lead | New features |
 * ```
 */
export function serializeRouting(rules: ParsedRoutingRule[]): string {
  const lines: string[] = [
    '# Routing Rules',
    '',
    '## Routing Table',
    '',
    '| Work Type | Agent | Examples |',
    '|-----------|-------|----------|',
  ];

  for (const rule of rules) {
    const agents = rule.agents.join(', ');
    const examples = rule.examples ? rule.examples.join(', ') : '';
    lines.push(`| ${rule.workType} | ${agents} | ${examples} |`);
  }

  lines.push('');
  return lines.join('\n');
}
