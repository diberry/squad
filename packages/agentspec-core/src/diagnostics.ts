import type { Model, Program } from "@typespec/compiler";
import { reportDiagnostic } from "./lib.js";

// ─── PII detection patterns ───────────────────────────────────────────────────

const PII_PATTERNS: ReadonlyArray<{ readonly name: string; readonly pattern: RegExp }> = [
  { name: "email", pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/ },
  { name: "phone", pattern: /\+?[\d\s\-\(\)]{10,}/ },
  { name: "bearer-token", pattern: /sk-|Bearer |ghp_|token:/ },
  { name: "sas-url", pattern: /sig=|sv=|se=/ },
];

/**
 * Check a decorator string value for PII patterns and report a compiler
 * warning if any match. Configurable to `error` level via tspconfig.yaml.
 */
export function checkForPii(program: Program, value: string, target: Model): void {
  for (const { pattern } of PII_PATTERNS) {
    if (pattern.test(value)) {
      reportDiagnostic(program, {
        code: "pii-in-decorator",
        target,
        messageId: "default",
        format: {},
      });
      return; // one warning per value is enough
    }
  }
}

export { PII_PATTERNS };
