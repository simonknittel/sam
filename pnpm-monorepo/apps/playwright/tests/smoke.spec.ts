import { expect, test } from "@playwright/test";

test("@smoke homepage returns 200", async ({ request }) => {
	const response = await request.get("/");
	expect(response.status()).toBe(200);
});

test("@smoke 404 page returns 404", async ({ request }) => {
	const response = await request.get("/404");
	expect(response.status()).toBe(404);
});
