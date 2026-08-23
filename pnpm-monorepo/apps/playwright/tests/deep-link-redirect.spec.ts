import { createCitizen } from "../fixtures/factories";
import { expect, test } from "../fixtures/test";

test("an unauthenticated deep link visit lands on the login page with the target preserved", async ({
  page,
}) => {
  await page.goto("/app/account?tab=sessions");

  await expect(page).toHaveURL(
    "/?redirect-to=%2Fapp%2Faccount%3Ftab%3Dsessions",
  );
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
});

test("the login page sends an authenticated user to the preserved deep link", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "deep-link" });
  await signIn(citizen.user);

  await page.goto("/?redirect-to=%2Fapp%2Faccount");

  await expect(page).toHaveURL("/app/account");
});

test("the login page rejects an external redirect target", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "open-redirect" });
  await signIn(citizen.user);

  await page.goto(
    `/?redirect-to=${encodeURIComponent("https://evil.example.com/app")}`,
  );

  await expect(page).toHaveURL("/app/dashboard");
});

test("the login page rejects a protocol-relative redirect target", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "schema-relative" });
  await signIn(citizen.user);

  await page.goto(
    `/?redirect-to=${encodeURIComponent("//evil.example.com/app")}`,
  );

  await expect(page).toHaveURL("/app/dashboard");
});
