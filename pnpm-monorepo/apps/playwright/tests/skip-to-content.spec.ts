import { createCitizen } from "../fixtures/factories";
import { tabUntilFocused } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("the skip link is revealed by focus and jumps past both navigations", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "tastatur-nutzer" });
  await signIn(citizen.user);

  // A page whose layout renders a sub navigation next to the top bar
  await page.goto("/app/account");
  const subNavigationLink = page.getByRole("link", { name: "Sitzungen" });
  await expect(subNavigationLink).toBeVisible();

  const skipLink = page.getByRole("link", { name: "Zum Inhalt springen" });
  await expect(skipLink).not.toBeInViewport();

  // It has to be the very first tab stop, ahead of the top bar
  await tabUntilFocused(page, skipLink);
  await expect(skipLink).toBeInViewport();

  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  // Both navigations sit before the content, so tabbing on must not reach them
  await page.keyboard.press("Tab");
  await expect(subNavigationLink).not.toBeFocused();
  await expect(page.getByRole("button", { name: "Apps" })).not.toBeFocused();
});
