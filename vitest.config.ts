import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    // A git worktree carries its own copy of this suite; without excluding it,
    // `npm test` runs both checkouts and reports the other one's failures.
    exclude: [...configDefaults.exclude, "e2e/**", ".worktrees/**"],
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
  },
});
