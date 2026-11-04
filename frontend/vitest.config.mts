import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Vitest stands in for the bundler that normally enforces this marker.
      { find: "server-only", replacement: path.resolve(root, "tests/empty.ts") },
      { find: /^@\//, replacement: `${path.resolve(root, "src")}/` },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    unstubGlobals: true,
  },
});
