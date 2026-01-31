import { test } from "@playwright/test";

test("redirect to clearance", async ({ page }) => {
	await page.goto("/");
	await page.waitForURL('/app/clearance');
});
