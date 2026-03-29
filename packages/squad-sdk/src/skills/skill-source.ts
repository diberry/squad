/**
 * Skill Source Interface & Implementations (M5-5, Issue #128)
 *
 * Pluggable skill discovery from local filesystem or GitHub repos.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseFrontmatter, type SkillDefinition } from './skill-loader.js';
import type { GitHubFetcher } from '../config/agent-source.js';

// --- Interface ---

export interface SkillSource {
  readonly name: string;
  readonly type: 'local' | 'github';
  readonly priority: number;
  listSkills(): Promise<SkillManifest[]>;
  getSkill(id: string): Promise<SkillDefinition | null>;
  getContent(id: string): Promise<string | null>;
}

export interface SkillManifest {
  id: string;
  name: string;
  domain: string;
  source: string;
}

// --- Local implementation ---

export class LocalSkillSource implements SkillSource {
  readonly name = 'local';
  readonly type = 'local' as const;
  readonly priority: number;
  private _skillsDirsCache: string[] | undefined;

  constructor(private basePath: string, priority = 0) {
    this.priority = priority;
  }

  /** Returns all existing skill directories, .copilot/skills/ first (highest priority). */
  private get skillsDirs(): string[] {
    if (this._skillsDirsCache !== undefined) return this._skillsDirsCache;
    const dirs: string[] = [];
    const copilotDir = path.join(this.basePath, '.copilot', 'skills');
    const squadDir = path.join(this.basePath, '.squad', 'skills');
    if (fs.existsSync(copilotDir)) dirs.push(copilotDir);
    if (fs.existsSync(squadDir)) dirs.push(squadDir);
    this._skillsDirsCache = dirs;
    return dirs;
  }

  async listSkills(): Promise<SkillManifest[]> {
    const seen = new Map<string, SkillManifest>();
    for (const dir of this.skillsDirs) {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (seen.has(entry.name)) continue; // first dir wins on conflicts
        const skillFile = path.join(dir, entry.name, 'SKILL.md');
        if (!fs.existsSync(skillFile)) continue;
        try {
          const raw = fs.readFileSync(skillFile, 'utf-8');
          const { meta } = parseFrontmatter(raw);
          seen.set(entry.name, {
            id: entry.name,
            name: typeof meta.name === 'string' ? meta.name : entry.name,
            domain: typeof meta.domain === 'string' ? meta.domain : 'general',
            source: 'local',
          });
        } catch {
          // skip malformed
        }
      }
    }
    return Array.from(seen.values());
  }

  async getSkill(id: string): Promise<SkillDefinition | null> {
    for (const dir of this.skillsDirs) {
      const skillFile = path.join(dir, id, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      try {
        const raw = fs.readFileSync(skillFile, 'utf-8');
        const { meta, body } = parseFrontmatter(raw);
        if (!body) continue;
        return {
          id,
          name: typeof meta.name === 'string' ? meta.name : id,
          domain: typeof meta.domain === 'string' ? meta.domain : 'general',
          content: body,
          triggers: Array.isArray(meta.triggers) ? meta.triggers : [],
          agentRoles: Array.isArray(meta.roles) ? meta.roles : [],
        };
      } catch {
        continue;
      }
    }
    return null;
  }

  async getContent(id: string): Promise<string | null> {
    for (const dir of this.skillsDirs) {
      const skillFile = path.join(dir, id, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      try {
        const raw = fs.readFileSync(skillFile, 'utf-8');
        const { body } = parseFrontmatter(raw);
        if (body) return body;
      } catch {
        continue;
      }
    }
    return null;
  }
}

// --- GitHub implementation ---

export class GitHubSkillSource implements SkillSource {
  readonly name = 'github';
  readonly type = 'github' as const;
  readonly priority: number;

  private owner: string;
  private repoName: string;
  private branch?: string;
  private pathPrefix: string;
  private fetcher: GitHubFetcher;

  constructor(
    repo: string,
    options?: { ref?: string; pathPrefix?: string; fetcher?: GitHubFetcher; priority?: number },
  ) {
    const parts = repo.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`Invalid repo format "${repo}": expected "owner/repo"`);
    }
    this.owner = parts[0];
    this.repoName = parts[1];
    this.branch = options?.ref;
    this.pathPrefix = options?.pathPrefix ?? '.copilot/skills';
    this.fetcher = options?.fetcher ?? {
      async listDirectory() { throw new Error('No GitHubFetcher configured'); },
      async getFileContent() { throw new Error('No GitHubFetcher configured'); },
    };
    this.priority = options?.priority ?? 0;
  }

  async listSkills(): Promise<SkillManifest[]> {
    const entries = await this.fetcher.listDirectory(
      this.owner, this.repoName, this.pathPrefix, this.branch,
    );
    const dirs = entries.filter(e => e.type === 'dir');
    const manifests: SkillManifest[] = [];

    for (const dir of dirs) {
      const skillPath = `${this.pathPrefix}/${dir.name}/SKILL.md`;
      const content = await this.fetcher.getFileContent(
        this.owner, this.repoName, skillPath, this.branch,
      );
      if (!content) continue;
      const { meta } = parseFrontmatter(content);
      manifests.push({
        id: dir.name,
        name: typeof meta.name === 'string' ? meta.name : dir.name,
        domain: typeof meta.domain === 'string' ? meta.domain : 'general',
        source: 'github',
      });
    }
    return manifests;
  }

  async getSkill(id: string): Promise<SkillDefinition | null> {
    const skillPath = `${this.pathPrefix}/${id}/SKILL.md`;
    const content = await this.fetcher.getFileContent(
      this.owner, this.repoName, skillPath, this.branch,
    );
    if (!content) return null;
    const { meta, body } = parseFrontmatter(content);
    if (!body) return null;
    return {
      id,
      name: typeof meta.name === 'string' ? meta.name : id,
      domain: typeof meta.domain === 'string' ? meta.domain : 'general',
      content: body,
      triggers: Array.isArray(meta.triggers) ? meta.triggers : [],
      agentRoles: Array.isArray(meta.roles) ? meta.roles : [],
    };
  }

  async getContent(id: string): Promise<string | null> {
    const skillPath = `${this.pathPrefix}/${id}/SKILL.md`;
    const content = await this.fetcher.getFileContent(
      this.owner, this.repoName, skillPath, this.branch,
    );
    if (!content) return null;
    const { body } = parseFrontmatter(content);
    return body || null;
  }
}

// --- Registry ---

export class SkillSourceRegistry {
  private sources: Map<string, SkillSource> = new Map();

  register(source: SkillSource): void {
    this.sources.set(source.name, source);
  }

  unregister(name: string): boolean {
    return this.sources.delete(name);
  }

  getSource(name: string): SkillSource | undefined {
    return this.sources.get(name);
  }

  /** Sources sorted by priority descending (higher priority first). */
  private sortedSources(): SkillSource[] {
    return Array.from(this.sources.values()).sort((a, b) => b.priority - a.priority);
  }

  async listAllSkills(): Promise<SkillManifest[]> {
    const sorted = this.sortedSources();
    const results = await Promise.all(sorted.map(s => s.listSkills()));
    return results.flat();
  }

  async findSkill(id: string): Promise<SkillDefinition | null> {
    for (const source of this.sortedSources()) {
      const skill = await source.getSkill(id);
      if (skill) return skill;
    }
    return null;
  }

  async getContent(id: string): Promise<string | null> {
    for (const source of this.sortedSources()) {
      const content = await source.getContent(id);
      if (content) return content;
    }
    return null;
  }
}
