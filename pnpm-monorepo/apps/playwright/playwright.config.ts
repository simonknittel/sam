import { defineConfig } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: process.env.BASE_URL,
    trace: "on-first-retry",
    extraHTTPHeaders: {
      [process.env.PLAYWRIGHT_CUSTOM_HEADER_NAME as string]: process.env
        .PLAYWRIGHT_CUSTOM_HEADER_VALUE as string,
    },
    viewport: { width: 1280, height: 720 },
    // reducedMotion: "reduce",
  },
});
