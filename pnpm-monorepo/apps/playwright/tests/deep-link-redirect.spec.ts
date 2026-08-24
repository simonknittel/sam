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

/**
 * Every shape of "not a path on this origin" the guard has to catch. Each of
 * them would otherwise hand an attacker a login-flavoured redirect to a site
 * of their choosing. One sign-in walks all of them.
 */
const OPEN_REDIRECT_VECTORS: readonly [name: string, target: string][] = [
  ["absolute URL", "https://evil.example.com/app"],
  ["protocol-relative URL", "//evil.example.com/app"],
  ["backslash-prefixed URL", "\\\\evil.example.com/app"],
  ["mixed slash URL", "/\\evil.example.com/app"],
  ["javascript: URL", "javascript:alert(1)"],
  ["double-encoded absolute URL", "%2Fhttps%3A%2F%2Fevil.example.com"],
  ["path outside /app", "/imprint"],
];

test("the login page rejects every redirect target that leaves /app", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "open-redirect" });
  await signIn(citizen.user);

  for (const [name, target] of OPEN_REDIRECT_VECTORS) {
    await page.goto(`/?redirect-to=${encodeURIComponent(target)}`);
    await expect(page, `${name} must be refused`).toHaveURL("/app/dashboard");
  }
});
