# @agentspec/core

> **The OpenAPI of agent definitions — framework-agnostic, compiler-validated, narrative-native.**

`@agentspec/core` is a TypeSpec library that defines 12 universal agent primitives via TypeSpec decorators. Define your agent once in a `.tsp` file. Framework-specific emitters produce native artifacts for each target.

## Prerequisites

Before publishing `@agentspec/core@0.1.0`, complete these gates:

- [ ] Register the `agentspec` npm org (P0 — do this immediately)
- [ ] Enable npm org 2FA enforcement
- [ ] Configure provenance attestation on publish workflow (`npm publish --provenance`)
- [ ] Restrict publish token to GitHub OIDC identity (no static tokens)

## Install

```bash
npm install --save-dev @agentspec/core @typespec/compiler
```

Peer dependency: `@typespec/compiler >=0.60.0 <0.62.0`

## The 12 decorators

| Decorator | Purpose |
|---|---|
| `@agent(id, description)` | Marks a model as an agent; `id` is the wire identifier |
| `@role(title)` | Agent's role/purpose |
| `@version(semver)` | Agent schema version |
| `@instruction(text)` | System prompt ⚠️ omitted from A2A Agent Card by default |
| `@capability(id, description?)` | What this agent can do (repeatable) |
| `@boundary(handles, doesNotHandle)` | Explicit scope declaration |
| `@tool(id, description?)` | External tool at runtime (repeatable) |
| `@knowledge(source, description?)` | Data source (repeatable) |
| `@memory(strategy)` | Persistence strategy |
| `@conversationStarter(prompt)` | Suggested prompt (repeatable) |
| `@inputMode(mode)` | Supported input modality (repeatable) |
| `@outputMode(mode)` | Supported output modality (repeatable) |

## Quick start

```typespec
import "@agentspec/core";
using AgentSpec;

@agent("flight", "Architecture decisions that compound")
@role("Lead")
@version("0.1.0")
@instruction("You are Flight, the technical lead...")
@capability("architecture-review", "Evaluates system-level design decisions")
@boundary(
  handles: "Architecture decisions, PR reviews",
  doesNotHandle: "Feature implementation, test writing"
)
@memory(MemoryStrategy.persistent)
@conversationStarter("What's the right architecture for this feature?")
model Flight {}
```

Run `tsp compile` → produces `.agentspec/flight-agent-manifest.json`.

## Security

⚠️ **Decorator values are committed plaintext.** Do not include:
- Email addresses or phone numbers (PII)
- Secrets, API keys, bearer tokens
- Internal URLs or SharePoint links

The compiler emits a warning (configurable to error) when PII patterns are detected.

## A2A Agent Card

`@instruction` is **omitted from A2A Agent Card output by default**. Opt in:

```yaml
# tspconfig.yaml
options:
  "@agentspec/core":
    a2a-publish-instructions: true
```

Sensitivity gates:
- `"public"` — card may be served at `/.well-known/agent-card`
- `"internal"` *(default)* — card generated but not published
- `"restricted"` — no card generated

## TypeSpec version policy

Peer dep is minor-locked: `>=0.60.0 <0.62.0`. TypeSpec is pre-1.0 and ships breaking changes between minors. When TypeSpec ships a new minor: test, update peer dep range, update lockfile in a single PR. Never float the range.

## Examples

- [`examples/weather-agent.tsp`](./examples/weather-agent.tsp) — minimal single-agent example
- [`examples/squad-team.tsp`](./examples/squad-team.tsp) — multi-agent team definition

## License

MIT
