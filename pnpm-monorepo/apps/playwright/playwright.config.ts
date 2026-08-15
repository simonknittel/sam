import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Every worker runs its own app instance, collab container and database
  // (see README.md and fixtures/test.ts), so more workers cost real memory.
  workers: 2,
  reporter: "html",

  globalSetup: "./setup/global-setup.ts",

  use: {
    trace: "on-first-retry",
    viewport: { width: 1280, height: 720 },
    // The Hero glitch animation and similar effects respect
    // prefers-reduced-motion; without this, screenshots and text assertions
    // catch elements mid-animation.
    contextOptions: { reducedMotion: "reduce" },
  },

  projects: [
    {
      // Talks to the collab container over plain HTTP and must not share a
      // worker stack with tests whose websocket editing sessions' teardown
      // writes race the database reset (can deadlock the collab container).
      // Workers are never shared across projects, so this always runs on a
      // fresh stack.
      name: "collab-http",
      testMatch: /collab-replace\.spec\.ts/,
    },
    {
      name: "app",
      testIgnore: /collab-replace\.spec\.ts/,
    },
  ],
});
