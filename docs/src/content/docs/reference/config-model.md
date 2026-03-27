# squad config model

> ⚠️ **Experimental** — Squad is alpha software. APIs, commands, and behavior may change between releases.

**Try this:**
```bash
squad config model
```

View your current model configuration — default model and per-agent overrides.

---

## What it does

The `squad config model` command manages persistent model preferences in `.squad/config.json`. You can set a default model for all agents, pin a specific model to one agent, or clear overrides to return to [automatic model selection](/features/model-selection/#5-layer-model-resolution).

Changes persist across sessions — they're written to disk, not session state.

---

## Syntax

```bash
squad config model [model-name] [--agent <name>] [--clear]
```

## Arguments

| Argument | Description |
|----------|-------------|
| `model-name` | Model ID from the [model catalog](#available-models). Optional — omit to show current config. |

## Options

| Option | Description |
|--------|-------------|
| `--agent <name>` | Target a specific agent instead of the team-wide default. Agent name must match a directory in `.squad/agents/`. |
| `--clear` | Remove the override instead of setting one. Combine with `--agent` to clear a single agent's override. |

---

## Examples

### Show current model configuration

```bash
squad config model
```

Output:

```
Model configuration:
  Default model: claude-opus-4.6

  Agent overrides:
    fenster → claude-sonnet-4.6
    mcmanus → claude-haiku-4.5
```

If no overrides are set, you see:

```
Model configuration:
  Default model: (auto)

  No agent overrides configured.
```

### Set the default model for all agents

```bash
squad config model claude-opus-4.6
```

```
✓ Default model set to claude-opus-4.6
```

Every agent uses this model unless they have a per-agent override.

### Pin a model to a specific agent

```bash
squad config model claude-sonnet-4.6 --agent fenster
```

```
✓ Model for fenster set to claude-sonnet-4.6
```

This agent uses the pinned model regardless of the team default.

### Clear the default model

```bash
squad config model --clear
```

```
✓ Default model override cleared (reverted to auto-selection).
```

Removes `defaultModel` from `.squad/config.json`. Squad returns to [task-aware auto-selection](/features/model-selection/#5-layer-model-resolution).

### Clear an agent override

```bash
squad config model --clear --agent fenster
```

```
✓ Model override for fenster cleared.
```

The agent falls back to the team default or auto-selection.

---

## How it fits into model resolution

The `squad config model` command writes to Layer 1 (persistent config) of the [5-layer model resolution hierarchy](/features/model-selection/#5-layer-model-resolution):

| Layer | Source | How to set |
|-------|--------|------------|
| 1. Persistent config | `.squad/config.json` | **`squad config model`** (this command) |
| 2. Session directive | Conversation prompt | "Use opus for this session" |
| 3. Charter preference | Agent's `charter.md` `## Model` section | Edit the charter file |
| 4. Task-aware auto-selection | Coordinator logic | Automatic — based on task type |
| 5. Default | Fallback | `claude-haiku-4.5` |

First match wins. Per-agent overrides (`agentModelOverrides`) take priority over the global `defaultModel` within Layer 1.

---

## Config file format

The command reads and writes `.squad/config.json`:

```json
{
  "version": 1,
  "defaultModel": "claude-opus-4.6",
  "agentModelOverrides": {
    "fenster": "claude-sonnet-4.6",
    "mcmanus": "claude-haiku-4.5"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | `number` | Config schema version (always `1`) |
| `defaultModel` | `string` (optional) | Model ID applied to all agents. When omitted, Squad uses automatic model selection. If `null` is present, it is treated the same as unset/absent. |
| `agentModelOverrides` | `object` | Map of agent name → model ID. Overrides `defaultModel` for that agent. |

---

## Model tiers (examples)

Squad validates model names against the built-in `MODEL_CATALOG`. Invalid names are rejected with a list of valid options. The table below is a **non-exhaustive snapshot** of common models by tier; the actual catalog may include additional or newer models.

| Tier | Example models |
|------|----------------|
| **Premium** | `claude-opus-4.6`, `claude-opus-4.6-fast`, `claude-opus-4.5` |
| **Standard** | `claude-sonnet-4.6`, `gpt-5.4`, `gpt-5.3-codex`, `gpt-5.2-codex`, `claude-sonnet-4`, `gpt-5.2`, `gpt-5.1-codex`, `gpt-5.1`, `gpt-5`, `gemini-3-pro-preview` |
| **Fast** | `claude-haiku-4.5`, `gpt-5.1-codex-mini`, `gpt-4.1`, `gpt-5-mini` |

---

## Validation

The command validates both model names and agent names:

- **Model names** are checked against `MODEL_CATALOG`. If the model is unknown, you see the full list of available models grouped by tier.
- **Agent names** are checked against directories in `.squad/agents/`. If the agent is unknown, you see the list of known agents.
- **Squad directory** is required. If `.squad/` isn't found, the command tells you to run `squad init` first.

---

## See also

- [Model selection](/features/model-selection/) — full explanation of the 5-layer hierarchy, fallback chains, and economy mode
- [Switching models](/scenarios/switching-models/) — scenario guide for budget vs. quality tradeoffs
- [Configuration reference](/reference/config/#model-configuration) — other Squad configuration files and settings
- [CLI reference](/reference/cli/) — all Squad CLI commands
