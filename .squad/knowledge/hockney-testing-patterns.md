---
title: Testing Patterns and Conventions
author: hockney
tags: [testing, vitest, patterns, quality]
created: 2026-03-16
---

# Testing Patterns and Conventions

## Problem Statement

Squad's test suite must validate:
- Core SDK functionality
- CLI command behavior
- Agent coordination logic
- File system operations
- Error handling and edge cases

Without clear testing patterns, tests become flaky, slow, or incomplete.

## Test Architecture

Squad uses Vitest as its test runner. Structure:

```
test/
├── unit/           # Pure function tests, no I/O
├── integration/    # Multi-component tests, file I/O
└── fixtures/       # Test data and mock files

test-fixtures/      # Shared fixtures across test types
```

### Test Categories

**Unit Tests (test/unit/)**
- Test individual functions or classes
- No file I/O, no network, no process spawning
- Fast (< 10ms per test)
- Use mocks for dependencies

**Integration Tests (test/integration/)**
- Test component interactions
- File I/O allowed (use temp directories)
- Slower (< 1s per test)
- Use real dependencies when possible

**End-to-End Tests (future)**
- Test full workflows
- Spawn actual agents, run real commands
- Slowest (1-10s per test)

## Testing Conventions

### Test File Naming

Match source file structure:

```
squad/
└── runtime/
    └── agent.ts

test/
└── unit/
    └── runtime/
        └── agent.test.ts
```

**Pattern:** `{source-file}.test.ts`

### Test Structure (AAA Pattern)

Arrange, Act, Assert:

```typescript
import { describe, it, expect } from 'vitest';
import { parseCommand } from '../squad/cli/parser.ts';

describe('parseCommand', () => {
  it('parses simple commands', () => {
    // Arrange
    const input = 'squad init my-team';
    
    // Act
    const result = parseCommand(input);
    
    // Assert
    expect(result).toEqual({
      command: 'init',
      args: ['my-team'],
    });
  });
});
```

### Describe Blocks

Use `describe` for grouping:

```typescript
describe('Agent', () => {
  describe('spawn', () => {
    it('loads charter from file');
    it('applies default config');
    it('throws if charter missing');
  });
  
  describe('execute', () => {
    it('runs task and returns result');
    it('handles errors gracefully');
  });
});
```

**Pattern:**
- Top-level `describe`: class or module name
- Nested `describe`: method or feature name
- `it`: specific behavior

### Test Naming

Use present tense, describe behavior:

✅ **Good:**
- `it('throws error when file not found')`
- `it('returns empty array for no results')`
- `it('appends to existing file')`

❌ **Bad:**
- `it('should throw error when file not found')` (verbose)
- `it('test file reading')` (vague)
- `it('works correctly')` (meaningless)

## Mocking Patterns

### File System Mocking

Use Vitest mocks for fs operations:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('node:fs');

describe('loadConfig', () => {
  beforeEach(() => {
    vi.mocked(readFileSync).mockReturnValue('{}');
  });
  
  it('loads config from file', () => {
    const config = loadConfig('config.json');
    expect(config).toEqual({});
    expect(readFileSync).toHaveBeenCalledWith('config.json', 'utf-8');
  });
});
```

### Temporary Directories

For integration tests, use real file I/O with temp dirs:

```typescript
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('initCommand', () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'squad-test-'));
  });
  
  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });
  
  it('creates project structure', () => {
    initCommand(tempDir, { agents: 3 });
    
    expect(existsSync(join(tempDir, '.squad'))).toBe(true);
    expect(existsSync(join(tempDir, '.squad/team.md'))).toBe(true);
  });
});
```

### Process Spawning

Use Vitest's `vi.spyOn` for process-related tests:

```typescript
import { vi } from 'vitest';
import { execSync } from 'node:child_process';

vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
vi.spyOn(global.console, 'error').mockImplementation(() => {});

describe('fatal', () => {
  it('logs error and exits', () => {
    fatal('Something went wrong');
    
    expect(console.error).toHaveBeenCalledWith('Error: Something went wrong');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
```

## Assertion Patterns

### Equality

```typescript
expect(result).toBe(42);              // Primitive equality
expect(result).toEqual({ id: 1 });    // Deep equality
expect(result).toStrictEqual({ id: 1 }); // Deep + no extra props
```

### Truthiness

```typescript
expect(value).toBeTruthy();  // Coerces to true
expect(value).toBeFalsy();   // Coerces to false
expect(value).toBeDefined(); // Not undefined
expect(value).toBeNull();    // Exactly null
```

### Exceptions

```typescript
expect(() => dangerousFunction()).toThrow();
expect(() => dangerousFunction()).toThrow('Invalid input');
expect(() => dangerousFunction()).toThrow(ValidationError);
```

### Arrays and Objects

```typescript
expect(array).toContain('item');
expect(array).toHaveLength(3);
expect(object).toHaveProperty('key');
expect(object).toHaveProperty('key', 'value');
expect(array).toEqual(expect.arrayContaining([1, 2]));
```

## Test Coverage

Squad aims for 80%+ coverage on core logic:

```bash
npm run test:coverage
```

Coverage thresholds in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
});
```

**Prioritize coverage for:**
- Core SDK APIs (Squad class, Agent class)
- CLI command parsing and execution
- File system operations (high risk)
- Error handling paths

**Lower priority for:**
- Type definitions (TypeScript handles this)
- Simple getters/setters
- Framework glue code

## Performance Testing

Use Vitest's `bench` for performance-critical code:

```typescript
import { bench, describe } from 'vitest';

describe('Performance', () => {
  bench('parseCommand (simple)', () => {
    parseCommand('squad init my-team');
  });
  
  bench('parseCommand (complex)', () => {
    parseCommand('squad exec --agent keaton --task "review PR" --verbose');
  });
});
```

Run benchmarks:

```bash
npm run test:bench
```

## Flaky Test Prevention

### Time-Based Tests

Use fake timers for time-dependent code:

```typescript
import { vi } from 'vitest';

describe('timeout', () => {
  it('expires after 5 seconds', () => {
    vi.useFakeTimers();
    
    const callback = vi.fn();
    setTimeout(callback, 5000);
    
    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalled();
    
    vi.useRealTimers();
  });
});
```

### Async Tests

Always await or return promises:

```typescript
// ✅ Good
it('loads data', async () => {
  const data = await loadData();
  expect(data).toBeDefined();
});

// ❌ Bad (promise not awaited)
it('loads data', () => {
  loadData().then(data => {
    expect(data).toBeDefined();
  });
});
```

### File System Race Conditions

Ensure cleanup happens before next test:

```typescript
import { afterEach } from 'vitest';

afterEach(async () => {
  await cleanupTempFiles(); // Async cleanup
});
```

## Anti-Patterns

### ❌ Testing Implementation Details

**Bad:** Test internal state

```typescript
it('increments internal counter', () => {
  agent._counter = 0; // Accessing private field
  agent.doSomething();
  expect(agent._counter).toBe(1);
});
```

**Good:** Test observable behavior

```typescript
it('completes task', () => {
  const result = agent.doSomething();
  expect(result.completed).toBe(true);
});
```

### ❌ One Giant Test

**Bad:** Test everything at once

```typescript
it('handles full workflow', () => {
  // 100 lines of test code
  // 20 assertions
});
```

**Good:** Split into focused tests

```typescript
it('parses input');
it('validates input');
it('executes command');
it('returns result');
```

### ❌ No Test Isolation

**Bad:** Tests depend on each other

```typescript
let sharedState;

it('creates state', () => {
  sharedState = createState();
});

it('uses state', () => {
  expect(sharedState).toBeDefined(); // Fails if run alone
});
```

**Good:** Each test is independent

```typescript
it('creates and uses state', () => {
  const state = createState();
  expect(state).toBeDefined();
});
```

## Future Improvements

Potential enhancements:
- Visual regression testing (screenshot comparison)
- Contract testing (API compatibility)
- Mutation testing (test quality validation)
- Property-based testing (generative test cases)
