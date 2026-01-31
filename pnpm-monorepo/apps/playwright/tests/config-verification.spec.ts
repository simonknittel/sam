import { expect, test } from "@playwright/test";

test("viewport is configured to 1280x720", async ({ page }) => {
	const viewportSize = page.viewportSize();
	expect(viewportSize).toEqual({ width: 1280, height: 720 });
});

test("prefers-reduced-motion is enabled", async ({ page }) => {
	await page.goto("/");
	const prefersReducedMotion = await page.evaluate(() => {
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	});
	expect(prefersReducedMotion).toBe(true);
});
