import { defineConfig } from "@playwright/test";
import "dotenv/config";

// Build custom HTTP headers object if both name and value are provided
const extraHTTPHeaders: Record<string, string> = {};
if (process.env.PLAYWRIGHT_CUSTOM_HEADER_NAME && process.env.PLAYWRIGHT_CUSTOM_HEADER_VALUE) {
	extraHTTPHeaders[process.env.PLAYWRIGHT_CUSTOM_HEADER_NAME] = process.env.PLAYWRIGHT_CUSTOM_HEADER_VALUE;
}

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
		...(Object.keys(extraHTTPHeaders).length > 0 && { extraHTTPHeaders }),
	},
});
