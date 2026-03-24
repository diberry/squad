import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import nPlugin from "eslint-plugin-n";

export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.squad/**"],
  },

  // Source packages — type-aware rules enabled via tsconfig project service
  {
    files: ["packages/**/*.ts", "packages/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      n: nPlugin,
    },
    rules: {
      // Catch fire-and-forget promises and missing awaits
      "@typescript-eslint/no-floating-promises": "warn",

      // Flag synchronous I/O inside functions (allowAtRootLevel
      // permits sync calls in module-level config/setup code)
      "n/no-sync": ["warn", { allowAtRootLevel: true }],

      // Prevent console.log in production; allow warn/error
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Prefer StorageProvider over raw fs imports (#481)
      "no-restricted-imports": ["warn", {
        paths: [
          { name: "fs", message: "Use StorageProvider instead of direct fs imports. See #481." },
          { name: "node:fs", message: "Use StorageProvider instead of direct node:fs imports. See #481." },
          { name: "fs/promises", message: "Use StorageProvider instead of direct fs/promises imports. See #481." },
          { name: "node:fs/promises", message: "Use StorageProvider instead of direct node:fs/promises imports. See #481." },
        ],
      }],
    },
  },

  // fs-storage-provider and sqlite-storage-provider legitimately use raw fs
  {
    files: [
      "packages/**/storage/fs-storage-provider.ts",
      "packages/**/storage/sqlite-storage-provider.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  // Test files — no tsconfig coverage, so only non-type-aware rules
  {
    files: ["test/**/*.ts"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
