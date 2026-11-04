import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against an already running stack with a disposable database: see "End-to-end tests" in README.md.
 * One worker, because the specs share that database.
 */
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
});
