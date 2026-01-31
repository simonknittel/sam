import { expect, test } from "@playwright/test";

test("@smoke homepage returns 200", async ({ request }) => {
	const response = await request.get("/");
	expect(response.status()).toBe(200);
});

test("@smoke 404 page returns 404", async ({ request }) => {
	const response = await request.get("/404");
	expect(response.status()).toBe(404);
});

test("@smoke homepage h1 contains S.A.M.", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator("h1")).toContainText("S.A.M.");
});
