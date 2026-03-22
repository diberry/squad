// Intermediate TypeScript representation of agent-manifest.json.
// The canonical shape lives in lib/main.tsp as `model AgentManifest`.
// This interface mirrors that model for use within the emitter and translators.

export interface AgentManifestData {
  readonly $schema?: string;
  readonly specVersion: string;
  readonly id: string;
  readonly description: string;
  readonly role?: string;
  readonly agentVersion?: string;
  readonly sensitivity: "public" | "internal" | "restricted";
  readonly behavior: {
    readonly instructions?: string;
    readonly capabilities: ReadonlyArray<{
      readonly id: string;
      readonly description?: string;
      readonly level?: string;
    }>;
    readonly boundaries?: {
      readonly handles: string;
      readonly doesNotHandle: string;
    };
  };
  readonly runtime: {
    readonly tools: ReadonlyArray<{
      readonly id: string;
      readonly description?: string;
    }>;
    readonly knowledge: ReadonlyArray<{
      readonly source: string;
      readonly description?: string;
    }>;
    readonly memory: string;
  };
  readonly communication: {
    readonly conversationStarters: readonly string[];
    readonly inputModes: readonly string[];
    readonly outputModes: readonly string[];
  };
}
