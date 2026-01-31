import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

// Build custom HTTP headers object if both name and value are provided
const extraHTTPHeaders: Record<string, string> = {};
const headerName = process.env.PLAYWRIGHT_CUSTOM_HEADER_NAME;
const headerValue = process.env.PLAYWRIGHT_CUSTOM_HEADER_VALUE;

if (headerName && headerValue) {
	// Basic validation: HTTP header names should be alphanumeric with hyphens/underscores
	if (!/^[a-zA-Z0-9_-]+$/.test(headerName)) {
		throw new Error(`Invalid HTTP header name: ${headerName}. Header names must contain only alphanumeric characters, hyphens, and underscores.`);
	}
	extraHTTPHeaders[headerName] = headerValue;
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
		viewport: { width: 1280, height: 720 },
		reducedMotion: "reduce",
	},

	projects: [
		{ name: 'setup', testMatch: /.*\.setup\.ts/ },

		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: '.auth/user.json',
			},
			dependencies: ['setup'],
		},
	]
});
