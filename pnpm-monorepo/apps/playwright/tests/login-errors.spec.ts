import { expect, test } from "../fixtures/test";

test("a login that the user cancels at Discord shows its message on the login page", async ({
  page,
}) => {
  await page.goto("/api/auth/callback/discord?error=access_denied");

  await expect(
    page.getByText("Du hast die Anmeldung bei Discord abgebrochen."),
  ).toBeVisible();
  await expect(page).toHaveURL("/?error=LoginCancelled");
});

test("a failed callback from Discord shows its message on the login page instead of the page of next-auth", async ({
  page,
}) => {
  // The browser has no state cookie, thus next-auth refuses the callback
  await page.goto("/api/auth/callback/discord?code=unknown&state=unknown");

  await expect(
    page.getByText("Die Anmeldung bei Discord ist abgelaufen"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/" && url.searchParams.get("error") === "OAuthCallback",
  );
});

test("the login page shows the generic message for an error code that discloses too much", async ({
  page,
}) => {
  await page.goto("/?error=OAuthAccountNotLinked");

  await expect(
    page.getByText("Beim Anmelden ist ein Fehler aufgetreten."),
  ).toBeVisible();
});
