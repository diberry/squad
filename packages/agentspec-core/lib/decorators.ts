import type {
  DecoratorContext,
  Model,
} from "@typespec/compiler";
import { StateKeys } from "../src/lib.js";

// ─── State key types ─────────────────────────────────────────────────────────

export interface AgentState {
  readonly id: string;
  readonly description: string;
}

export interface CapabilityEntry {
  readonly id: string;
  readonly description?: string;
}

export interface ToolEntry {
  readonly id: string;
  readonly description?: string;
}

export interface KnowledgeEntry {
  readonly source: string;
  readonly description?: string;
}

export interface BoundaryState {
  readonly handles: string;
  readonly doesNotHandle: string;
}

// ─── Decorator implementations ───────────────────────────────────────────────

export function $agent(
  ctx: DecoratorContext,
  target: Model,
  id: string,
  description: string
): void {
  ctx.program.stateMap(StateKeys.agent).set(target, { id, description });
  ctx.program.stateSet(StateKeys.agentSet).add(target);
}

export function $role(
  ctx: DecoratorContext,
  target: Model,
  title: string
): void {
  ctx.program.stateMap(StateKeys.role).set(target, title);
}

export function $version(
  ctx: DecoratorContext,
  target: Model,
  semver: string
): void {
  ctx.program.stateMap(StateKeys.version).set(target, semver);
}

export function $instruction(
  ctx: DecoratorContext,
  target: Model,
  text: string
): void {
  ctx.program.stateMap(StateKeys.instruction).set(target, text);
}

export function $capability(
  ctx: DecoratorContext,
  target: Model,
  id: string,
  description?: string
): void {
  const map = ctx.program.stateMap(StateKeys.capabilities);
  const existing: CapabilityEntry[] = map.get(target) ?? [];
  map.set(target, [...existing, { id, description }]);
}

export function $boundary(
  ctx: DecoratorContext,
  target: Model,
  handles: string,
  doesNotHandle: string
): void {
  ctx.program.stateMap(StateKeys.boundary).set(target, { handles, doesNotHandle });
}

export function $tool(
  ctx: DecoratorContext,
  target: Model,
  id: string,
  description?: string
): void {
  const map = ctx.program.stateMap(StateKeys.tools);
  const existing: ToolEntry[] = map.get(target) ?? [];
  map.set(target, [...existing, { id, description }]);
}

export function $knowledge(
  ctx: DecoratorContext,
  target: Model,
  source: string,
  description?: string
): void {
  const map = ctx.program.stateMap(StateKeys.knowledge);
  const existing: KnowledgeEntry[] = map.get(target) ?? [];
  map.set(target, [...existing, { source, description }]);
}

export function $memory(
  ctx: DecoratorContext,
  target: Model,
  strategy: string
): void {
  ctx.program.stateMap(StateKeys.memory).set(target, strategy);
}

export function $conversationStarter(
  ctx: DecoratorContext,
  target: Model,
  prompt: string
): void {
  const map = ctx.program.stateMap(StateKeys.conversationStarters);
  const existing: string[] = map.get(target) ?? [];
  map.set(target, [...existing, prompt]);
}

export function $inputMode(
  ctx: DecoratorContext,
  target: Model,
  mode: string
): void {
  const map = ctx.program.stateMap(StateKeys.inputModes);
  const existing: string[] = map.get(target) ?? [];
  map.set(target, [...existing, mode]);
}

export function $outputMode(
  ctx: DecoratorContext,
  target: Model,
  mode: string
): void {
  const map = ctx.program.stateMap(StateKeys.outputModes);
  const existing: string[] = map.get(target) ?? [];
  map.set(target, [...existing, mode]);
}
