/**
 * SquadState Coverage Gaps — Tests for edge cases and error paths.
 *
 * Identified during FIDO's Phase 2 coverage audit.
 * Ensures error classes, schema helpers, and IO round-trips are fully tested.
 */

import { describe, it, expect } from 'vitest';
import {
  StateError,
  NotFoundError,
  ParseError,
  WriteConflictError,
  ProviderError,
} from '../../packages/squad-sdk/src/state/domain-types.js';
import { resolveCollectionPath } from '../../packages/squad-sdk/src/state/schema.js';
import {
  parseDecisions,
  serializeDecision,
  serializeDecisions,
} from '../../packages/squad-sdk/src/state/io/decisions-io.js';
import {
  parseRouting,
  serializeRouting,
} from '../../packages/squad-sdk/src/state/io/routing-io.js';
import {
  parseTeam,
  serializeTeam,
} from '../../packages/squad-sdk/src/state/io/team-io.js';
import { createAgentHandle } from '../../packages/squad-sdk/src/state/handles.js';
import { InMemoryStorageProvider } from '../../packages/squad-sdk/src/storage/in-memory-storage-provider.js';

// ── StateError Hierarchy Tests ────────────────────────────────────────────

describe('StateError Hierarchy', () => {
  describe('StateError base class', () => {
    it('has correct name and kind', () => {
      const error = new StateError('parse-error', 'test message');
      expect(error.name).toBe('StateError');
      expect(error.kind).toBe('parse-error');
      expect(error.message).toBe('test message');
      expect(error).toBeInstanceOf(Error);
    });

    it('preserves cause via ErrorOptions', () => {
      const cause = new Error('underlying');
      const error = new StateError('provider-error', 'wrapper', { cause });
      expect(error.cause).toBe(cause);
    });

    it('supports all StateErrorKind values', () => {
      const kinds: Array<import('../../packages/squad-sdk/src/state/domain-types.js').StateErrorKind> = [
        'not-found',
        'parse-error',
        'write-conflict',
        'provider-error',
      ];
      for (const kind of kinds) {
        const e = new StateError(kind, 'test');
        expect(e.kind).toBe(kind);
      }
    });
  });

  describe('NotFoundError', () => {
    it('has correct name and kind', () => {
      const error = new NotFoundError('agents', 'ghost');
      expect(error.name).toBe('NotFoundError');
      expect(error.kind).toBe('not-found');
      expect(error).toBeInstanceOf(StateError);
    });

    it('formats message with collection and id', () => {
      const error = new NotFoundError('agents', 'ghost');
      expect(error.message).toBe('Not found: agents/ghost');
    });

    it('formats message with collection only', () => {
      const error = new NotFoundError('team');
      expect(error.message).toBe('Not found: team');
    });

    it('supports instanceof checks', () => {
      const error = new NotFoundError('agents', 'ghost');
      expect(error instanceof NotFoundError).toBe(true);
      expect(error instanceof StateError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('ParseError', () => {
    it('has correct name and kind', () => {
      const error = new ParseError('decisions', 'invalid YAML');
      expect(error.name).toBe('ParseError');
      expect(error.kind).toBe('parse-error');
      expect(error).toBeInstanceOf(StateError);
    });

    it('formats message with collection and detail', () => {
      const error = new ParseError('decisions', 'invalid YAML');
      expect(error.message).toBe('Parse error in decisions: invalid YAML');
    });

    it('handles Unicode in detail string', () => {
      const error = new ParseError('team', 'Invalid emoji: 🔥💥');
      expect(error.message).toContain('Invalid emoji: 🔥💥');
    });
  });

  describe('WriteConflictError', () => {
    it('has correct name and kind', () => {
      const error = new WriteConflictError('team', 'eecom');
      expect(error.name).toBe('WriteConflictError');
      expect(error.kind).toBe('write-conflict');
      expect(error).toBeInstanceOf(StateError);
    });

    it('formats message with collection and id', () => {
      const error = new WriteConflictError('team', 'eecom');
      expect(error.message).toBe('Write conflict: team/eecom');
    });

    it('formats message with collection only', () => {
      const error = new WriteConflictError('routing');
      expect(error.message).toBe('Write conflict: routing');
    });
  });

  describe('ProviderError', () => {
    it('has correct name and kind', () => {
      const error = new ProviderError('read', 'disk full');
      expect(error.name).toBe('ProviderError');
      expect(error.kind).toBe('provider-error');
      expect(error).toBeInstanceOf(StateError);
    });

    it('formats message with operation and detail', () => {
      const error = new ProviderError('write', 'permission denied');
      expect(error.message).toBe('Provider write failed: permission denied');
    });
  });
});

// ── Schema resolveCollectionPath Tests ───────────────────────────────────

describe('resolveCollectionPath', () => {
  it('resolves static paths without id', () => {
    expect(resolveCollectionPath('decisions')).toBe('.squad/decisions.md');
    expect(resolveCollectionPath('routing')).toBe('.squad/routing.md');
    expect(resolveCollectionPath('team')).toBe('.squad/team.md');
    expect(resolveCollectionPath('log')).toBe('.squad/log');
    expect(resolveCollectionPath('config')).toBe('.squad/config.json');
  });

  it('resolves function paths with id', () => {
    expect(resolveCollectionPath('agents', 'eecom')).toBe('.squad/agents/eecom');
    expect(resolveCollectionPath('skills', 'typescript-testing')).toBe('.squad/skills/typescript-testing');
    expect(resolveCollectionPath('templates', 'charter.md')).toBe('.squad/templates/charter.md');
  });

  it('throws when function path called without id', () => {
    expect(() => resolveCollectionPath('agents')).toThrow(
      'Collection "agents" requires an entity id to resolve its path',
    );
    expect(() => resolveCollectionPath('skills')).toThrow(
      'Collection "skills" requires an entity id to resolve its path',
    );
  });

  it('handles Unicode ids', () => {
    expect(resolveCollectionPath('agents', '文件')).toBe('.squad/agents/文件');
    expect(resolveCollectionPath('skills', 'résumé-writing')).toBe('.squad/skills/résumé-writing');
  });

  it('handles ids with special characters', () => {
    expect(resolveCollectionPath('agents', 'agent-007')).toBe('.squad/agents/agent-007');
    expect(resolveCollectionPath('templates', 'issue.template.md')).toBe('.squad/templates/issue.template.md');
  });

  it('does not throw when static path called with id', () => {
    // Static paths ignore the id parameter
    expect(resolveCollectionPath('team', 'ignored')).toBe('.squad/team.md');
  });
});

// ── IO Round-Trip Tests ───────────────────────────────────────────────────

describe('IO Round-Trip', () => {
  describe('decisions-io', () => {
    it('round-trips a single decision', () => {
      const decision = {
        title: 'Use TypeScript',
        body: 'TypeScript provides type safety.',
        configRelevant: true,
        date: '2026-07-20',
        author: 'EECOM',
      };
      const serialized = serializeDecision(decision);
      const fullDoc = `# Decisions\n\n${serialized}\n`;
      const parsed = parseDecisions(fullDoc);
      expect(parsed.length).toBe(1);
      expect(parsed[0]!.title).toBe('Use TypeScript');
      expect(parsed[0]!.date).toBe('2026-07-20');
    });

    it('round-trips multiple decisions', () => {
      const decisions = [
        {
          title: 'First Decision',
          body: 'Body one.',
          configRelevant: true,
          date: '2026-07-20',
          author: 'Alice',
        },
        {
          title: 'Second Decision',
          body: 'Body two.',
          configRelevant: false,
          date: '2026-07-21',
          author: 'Bob',
        },
      ];
      const serialized = serializeDecisions(decisions);
      const parsed = parseDecisions(serialized);
      expect(parsed.length).toBe(2);
      expect(parsed[0]!.title).toBe('First Decision');
      expect(parsed[1]!.title).toBe('Second Decision');
    });

    it('handles decisions without date', () => {
      const decision = {
        title: 'No Date Decision',
        body: 'This has no date.',
        configRelevant: false,
      };
      const serialized = serializeDecision(decision);
      expect(serialized).toContain('### No Date Decision');
      expect(serialized).not.toContain(': No Date Decision');
    });

    it('handles decisions without author', () => {
      const decision = {
        title: 'Anonymous',
        body: 'No author.',
        configRelevant: false,
      };
      const serialized = serializeDecision(decision);
      expect(serialized).toContain('Anonymous');
    });

    it('handles empty decisions array', () => {
      const serialized = serializeDecisions([]);
      expect(serialized).toBe('# Decisions\n');
    });

    it('preserves Unicode in decision content', () => {
      const decision = {
        title: 'Support 日本語',
        body: 'Content with émojis 🚀 and Ελληνικά.',
        configRelevant: false,
        date: '2026-07-20',
        author: 'Ιωάννης',
      };
      const serialized = serializeDecision(decision);
      const parsed = parseDecisions(`# Decisions\n\n${serialized}\n`);
      expect(parsed[0]!.title).toContain('日本語');
      expect(parsed[0]!.body).toContain('🚀');
    });
  });

  describe('routing-io', () => {
    it('round-trips routing rules', () => {
      const rules = [
        {
          workType: 'feature-dev',
          agents: ['EECOM', 'NEWBIE'],
          examples: ['New features', 'Refactors'],
        },
        {
          workType: 'docs',
          agents: ['RETRO'],
          examples: ['API docs'],
        },
      ];
      const serialized = serializeRouting(rules);
      const parsed = parseRouting(serialized);
      expect(parsed.length).toBe(2);
      expect(parsed[0]!.workType).toBe('feature-dev');
      expect(parsed[0]!.agents).toEqual(['EECOM', 'NEWBIE']);
      expect(parsed[1]!.workType).toBe('docs');
    });

    it('handles rules without examples', () => {
      const rules = [
        {
          workType: 'testing',
          agents: ['FIDO'],
          examples: [],
        },
      ];
      const serialized = serializeRouting(rules);
      const parsed = parseRouting(serialized);
      // Parser returns undefined for empty examples column
      expect(parsed[0]!.examples).toBeUndefined();
    });

    it('handles empty rules array', () => {
      const serialized = serializeRouting([]);
      expect(serialized).toContain('# Routing Rules');
      expect(serialized).toContain('| Work Type | Agent | Examples |');
    });

    it('preserves Unicode in routing rules', () => {
      const rules = [
        {
          workType: 'internationalization',
          agents: ['多言語チーム'],
          examples: ['Support 中文', 'Translate to Español'],
        },
      ];
      const serialized = serializeRouting(rules);
      const parsed = parseRouting(serialized);
      expect(parsed[0]!.agents[0]).toBe('多言語チーム');
    });
  });

  describe('team-io', () => {
    it('round-trips team members', () => {
      const agents = [
        { name: 'eecom', role: 'Core Dev', skills: [], status: '✅ Active' },
        { name: 'retro', role: 'Docs Lead', skills: [], status: '✅ Active' },
      ];
      const serialized = serializeTeam(agents);
      const parsed = parseTeam(serialized);
      expect(parsed.length).toBe(2);
      expect(parsed[0]!.name).toBe('eecom');
      expect(parsed[0]!.role).toBe('Core Dev');
      expect(parsed[1]!.name).toBe('retro');
    });

    it('handles team metadata', () => {
      const agents = [{ name: 'agent', role: 'Dev', skills: [] }];
      const serialized = serializeTeam(agents, {
        teamName: 'Alpha Squad',
        tagline: 'First to fight.',
      });
      expect(serialized).toContain('# Alpha Squad');
      expect(serialized).toContain('> First to fight.');
    });

    it('uses default team name when not provided', () => {
      const agents = [{ name: 'agent', role: 'Dev', skills: [] }];
      const serialized = serializeTeam(agents);
      expect(serialized).toContain('# Team');
    });

    it('handles empty agents array', () => {
      const serialized = serializeTeam([]);
      expect(serialized).toContain('# Team');
      expect(serialized).toContain('## Members');
      expect(serialized).toContain('| Name | Role | Charter | Status |');
    });

    it('preserves Unicode in agent names and roles', () => {
      const agents = [
        { name: 'Αλέξανδρος', role: 'Architect 建筑师', skills: [], status: '✅ Active' },
      ];
      const serialized = serializeTeam(agents);
      const parsed = parseTeam(serialized);
      expect(parsed[0]!.name).toBe('αλέξανδρος'); // parseTeam lowercases
      expect(parsed[0]!.role).toContain('建筑师');
    });
  });
});

// ── createAgentHandle Edge Cases ──────────────────────────────────────────

describe('createAgentHandle edge cases', () => {
  it('handles agent name with spaces', async () => {
    const storage = new InMemoryStorageProvider();
    const rootDir = '/test';
    storage.writeSync(`${rootDir}/.squad/agents/Agent Smith/charter.md`, '# Agent Smith\nTest');
    storage.writeSync(`${rootDir}/.squad/agents/Agent Smith/history.md`, '# Agent Smith\n');
    storage.writeSync(`${rootDir}/.squad/team.md`, `# Team\n\n## Members\n\n| Name | Role | Charter | Status |\n|------|------|---------|--------|\n| Agent Smith | Dev | \`.squad/agents/Agent Smith/charter.md\` | ✅ Active |\n`);

    const handle = createAgentHandle('Agent Smith', storage, rootDir);
    const charter = await handle.charter();
    expect(charter).toContain('Agent Smith');
  });

  it('handles agent name with Unicode', async () => {
    const storage = new InMemoryStorageProvider();
    const rootDir = '/test';
    const name = '文件管理员';
    storage.writeSync(`${rootDir}/.squad/agents/${name}/charter.md`, `# ${name}\nTest`);
    storage.writeSync(`${rootDir}/.squad/agents/${name}/history.md`, `# ${name}\n`);
    storage.writeSync(`${rootDir}/.squad/team.md`, `# Team\n\n## Members\n\n| Name | Role | Charter | Status |\n|------|------|---------|--------|\n| ${name} | Dev | \`.squad/agents/${name}/charter.md\` | ✅ Active |\n`);

    const handle = createAgentHandle(name, storage, rootDir);
    const charter = await handle.charter();
    expect(charter).toContain(name);
  });

  it('appendHistory handles empty timestamp', async () => {
    const storage = new InMemoryStorageProvider();
    const rootDir = '/test';
    storage.writeSync(`${rootDir}/.squad/agents/test/charter.md`, '# test');
    storage.writeSync(`${rootDir}/.squad/agents/test/history.md`, '# test\n\n## Learnings\n');
    storage.writeSync(`${rootDir}/.squad/team.md`, `# Team\n\n## Members\n\n| Name | Role | Charter | Status |\n|------|------|---------|--------|\n| test | Dev | \`.squad/agents/test/charter.md\` | ✅ Active |\n`);

    const handle = createAgentHandle('test', storage, rootDir);
    await handle.appendHistory('Learnings', {
      section: 'Learnings',
      content: 'New learning.',
      timestamp: '', // Empty timestamp
    });

    const entries = await handle.history('Learnings');
    expect(entries.length).toBe(1);
    expect(entries[0]!.content).toContain('New learning.');
  });

  it('history() returns empty array when section has no content', async () => {
    const storage = new InMemoryStorageProvider();
    const rootDir = '/test';
    storage.writeSync(`${rootDir}/.squad/agents/test/charter.md`, '# test');
    storage.writeSync(`${rootDir}/.squad/agents/test/history.md`, '# test\n\n## Learnings\n\n## Decisions\n\nSome decision.');
    storage.writeSync(`${rootDir}/.squad/team.md`, `# Team\n\n## Members\n\n| Name | Role | Charter | Status |\n|------|------|---------|--------|\n| test | Dev | \`.squad/agents/test/charter.md\` | ✅ Active |\n`);

    const handle = createAgentHandle('test', storage, rootDir);
    const learnings = await handle.history('Learnings');
    expect(learnings).toEqual([]);
  });
});
