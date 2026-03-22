import "@typespec/compiler";

namespace AgentSpec;

// ─── Decorator declarations ───────────────────────────────────────────────────

/** Marks a model as an agent definition. `id` is the wire identifier. */
extern dec agent(target: Model, id: valueof string, description: valueof string);

/** Declares the agent's role/title — maps to CrewAI `role`, SK description, M365 `description`. */
extern dec role(target: Model, title: valueof string);

/** Declares the agent schema version (distinct from specVersion / protocol version). */
extern dec version(target: Model, semver: valueof string);

/**
 * Declares the agent's system prompt / behavioral instruction.
 * ⚠️ Omitted from A2A Agent Card output by default.
 * ⚠️ Do NOT include secrets, PII, or internal URLs — these values are committed plaintext.
 */
extern dec instruction(target: Model, text: valueof string);

/** Declares a capability this agent provides. Repeatable. */
extern dec capability(target: Model, id: valueof string, description?: valueof string);

/** Declares scope boundaries — what this agent handles and what it explicitly does not. */
extern dec boundary(target: Model, handles: valueof string, doesNotHandle: valueof string);

/** Declares an external tool available at runtime. Repeatable. */
extern dec tool(target: Model, id: valueof string, description?: valueof string);

/**
 * Declares a knowledge source (data store, index, connector). Repeatable.
 * ⚠️ Do NOT use internal URLs — these values are committed plaintext.
 */
extern dec knowledge(target: Model, source: valueof string, description?: valueof string);

/** Declares the agent's memory persistence strategy. */
extern dec memory(target: Model, strategy: valueof MemoryStrategy);

/** Declares a suggested conversation starter prompt. Repeatable. */
extern dec conversationStarter(target: Model, prompt: valueof string);

/** Declares a supported input modality. Repeatable. */
extern dec inputMode(target: Model, mode: valueof InputMode);

/** Declares a supported output modality. Repeatable. */
extern dec outputMode(target: Model, mode: valueof OutputMode);

// ─── Enums ───────────────────────────────────────────────────────────────────

enum MemoryStrategy {
  none,
  session,
  persistent,
  shared,
}

enum InputMode {
  text,
  file,
  image,
  audio,
  structured,
}

enum OutputMode {
  text,
  file,
  image,
  audio,
  structured,
  stream,
}

enum SensitivityLevel {
  public,
  internal,
  restricted,
}

// ─── AgentManifest model ─────────────────────────────────────────────────────
// This model is the canonical shape of agent-manifest.json.
// @typespec/json-schema derives the schema from this model — not from the emitter.

model AgentManifest {
  `$schema`?: string;
  specVersion: string;
  id: string;
  description: string;
  role?: string;
  agentVersion?: string;
  sensitivity: SensitivityLevel;
  behavior: AgentBehavior;
  runtime: AgentRuntime;
  communication: AgentCommunication;
}

model AgentBehavior {
  instructions?: string;
  capabilities: AgentCapability[];
  boundaries?: AgentBoundaries;
}

model AgentCapability {
  id: string;
  description?: string;
  /** Optional proficiency level: "expert" | "proficient" | "basic" */
  level?: string;
}

model AgentBoundaries {
  handles: string;
  doesNotHandle: string;
}

model AgentRuntime {
  tools: AgentTool[];
  knowledge: AgentKnowledge[];
  memory: MemoryStrategy;
}

model AgentTool {
  id: string;
  description?: string;
}

model AgentKnowledge {
  source: string;
  description?: string;
}

model AgentCommunication {
  conversationStarters: string[];
  inputModes: InputMode[];
  outputModes: OutputMode[];
}
