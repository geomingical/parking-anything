import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // Underscore-prefixed parameters are deliberately unused — typed mock
      // signatures need the arity even when the body ignores the arguments.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    ".worktrees/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "video/**/vendor/**",
    "next-env.d.ts",
  ]),
]);
