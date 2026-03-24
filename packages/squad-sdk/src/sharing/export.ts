/**
 * M5-1: Export command (squad export)
 * Exports Squad configuration as a portable bundle.
 */

import { join, basename } from 'node:path';
import type { StorageProvider } from '../storage/storage-provider.js';
import { FSStorageProvider } from '../storage/fs-storage-provider.js';

export interface ExportOptions {
  includeHistory?: boolean;
  includeSkills?: boolean;
  format?: 'json' | 'yaml';
  anonymize?: boolean;
}

export interface AgentCharter {
  name: string;
  role: string;
  content: string;
}

export interface ExportRoutingRule {
  pattern: string;
  agent: string;
  priority?: number;
}

export interface ExportMetadata {
  version: string;
  timestamp: string;
  source: string;
}

export interface ExportBundle {
  config: Record<string, unknown>;
  agents: AgentCharter[];
  skills: string[];
  routingRules: ExportRoutingRule[];
  metadata: ExportMetadata;
  history?: Record<string, unknown>[];
}

const SECRET_PATTERNS = [
  /token[=:]\s*['"]?[A-Za-z0-9_\-]{20,}/gi,
  /secret[=:]\s*['"]?[A-Za-z0-9_\-]{20,}/gi,
  /password[=:]\s*['"]?[^\s'"]{8,}/gi,
  /ghp_[A-Za-z0-9]{36}/g,
  /gho_[A-Za-z0-9]{36}/g,
  /github_pat_[A-Za-z0-9_]{82}/g,
];

/**
 * Strip secrets and sensitive patterns from text content.
 */
export function sanitizeContent(content: string): string {
  let sanitized = content;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

/**
 * Anonymize PII and local paths from content.
 */
export function anonymizeContent(content: string): string {
  let result = sanitizeContent(content);
  // Strip absolute paths (Unix and Windows)
  result = result.replace(/(?:\/[\w.-]+){3,}/g, '/[path]');
  result = result.replace(/[A-Z]:\\(?:[\w.-]+\\){2,}/gi, '[path]\\');
  // Strip email-like patterns
  result = result.replace(/[\w.+-]+@[\w.-]+\.\w{2,}/g, '[email]');
  return result;
}

async function readTeamConfig(projectDir: string, storage: StorageProvider): Promise<Record<string, unknown>> {
  const teamFile = join(projectDir, '.ai-team', 'team.md');
  const content = await storage.read(teamFile);
  if (content !== undefined) {
    return { teamFile: content };
  }
  return {};
}

async function readAgents(projectDir: string, storage: StorageProvider): Promise<AgentCharter[]> {
  const agentsDir = join(projectDir, '.github', 'agents');
  if (!(await storage.exists(agentsDir))) return [];

  const files = (await storage.list(agentsDir)).filter(f => f.endsWith('.md'));
  const agents: AgentCharter[] = [];
  for (const f of files) {
    const content = await storage.read(join(agentsDir, f));
    if (content === undefined) continue;
    const name = basename(f, '.md').replace('.agent', '');
    agents.push({ name, role: name, content });
  }
  return agents;
}

async function readRoutingRules(projectDir: string, storage: StorageProvider): Promise<ExportRoutingRule[]> {
  const routingFile = join(projectDir, '.ai-team', 'routing.md');
  const content = await storage.read(routingFile);
  if (content === undefined) return [];

  const rules: ExportRoutingRule[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*[-*]\s+`?([^`]+)`?\s*→\s*(\w+)/);
    if (match) {
      rules.push({ pattern: match[1]!.trim(), agent: match[2]!.trim() });
    }
  }
  return rules;
}

/**
 * Export a Squad project configuration as a bundle.
 *
 * TODO: Callers (test/sharing.test.ts, test/e2e-migration.test.ts) must be
 * updated to await this function after the sync→async migration.
 */
export async function exportSquadConfig(
  projectDir: string,
  options?: ExportOptions,
  storage: StorageProvider = new FSStorageProvider(),
): Promise<ExportBundle> {
  const opts: Required<ExportOptions> = {
    includeHistory: options?.includeHistory ?? false,
    includeSkills: options?.includeSkills ?? true,
    format: options?.format ?? 'json',
    anonymize: options?.anonymize ?? false,
  };

  const config = await readTeamConfig(projectDir, storage);
  let agents = await readAgents(projectDir, storage);
  let routingRules = await readRoutingRules(projectDir, storage);
  const skills: string[] = [];

  if (opts.includeSkills) {
    const skillSources = [
      { dir: join(projectDir, '.copilot', 'skills'), layout: 'nested' as const },
      { dir: join(projectDir, '.squad', 'skills'), layout: 'nested' as const },
      { dir: join(projectDir, '.ai-team', 'skills'), layout: 'flat' as const },
    ];
    let source: typeof skillSources[number] | undefined;
    for (const s of skillSources) {
      if (await storage.exists(s.dir)) {
        source = s;
        break;
      }
    }
    if (source) {
      if (source.layout === 'nested') {
        const entries = await storage.list(source.dir);
        for (const name of entries) {
          if (await storage.exists(join(source.dir, name, 'SKILL.md'))) {
            skills.push(name);
          }
        }
      } else {
        const skillFiles = (await storage.list(source.dir)).filter(f => f.endsWith('.md'));
        skills.push(...skillFiles.map(f => basename(f, '.md')));
      }
    }
  }

  if (opts.anonymize) {
    agents = agents.map(a => ({
      ...a,
      content: anonymizeContent(a.content),
    }));
  }

  const bundle: ExportBundle = {
    config: opts.anonymize ? {} : config,
    agents,
    skills,
    routingRules,
    metadata: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      source: opts.anonymize ? '[anonymized]' : projectDir,
    },
  };

  if (opts.includeHistory) {
    bundle.history = [];
  }

  return bundle;
}

/**
 * Serialize an export bundle to a string.
 */
export function serializeBundle(bundle: ExportBundle, format?: 'json' | 'yaml'): string {
  if (format === 'yaml') {
    return toSimpleYaml(bundle);
  }
  return JSON.stringify(bundle, null, 2);
}

/** Minimal YAML serializer for flat/nested objects */
function toSimpleYaml(obj: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (obj === null || obj === undefined) return `${pad}null\n`;
  if (typeof obj === 'string') return obj.includes('\n') ? `|\n${obj.split('\n').map(l => pad + '  ' + l).join('\n')}\n` : `${obj}\n`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return `${obj}\n`;
  if (Array.isArray(obj)) {
    if (obj.length === 0) return `[]\n`;
    return obj.map(item => {
      if (typeof item === 'object' && item !== null) {
        const inner = toSimpleYaml(item, indent + 2).trimStart();
        return `${pad}- ${inner}`;
      }
      return `${pad}- ${item}\n`;
    }).join('');
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return `{}\n`;
    return entries.map(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        return `${pad}${k}:\n${toSimpleYaml(v, indent + 2)}`;
      }
      return `${pad}${k}: ${toSimpleYaml(v)}`;
    }).join('');
  }
  return `${obj}\n`;
}
