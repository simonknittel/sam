import type { Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import { clickUntilVisible } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * Base UI renders the popup with `role="dialog"`; its name keeps the
 * assertions away from the mobile flyout, which lists the same apps.
 */
const appsPopover = (page: Page) =>
  page.getByRole("dialog", { name: "Apps", exact: true });

const openAppsPopover = (page: Page) =>
  clickUntilVisible(
    page.getByRole("button", { name: "Apps" }),
    appsPopover(page).getByText("Featured", { exact: true }),
  );

const favoritesHeading = (page: Page) =>
  appsPopover(page).getByText("Favoriten", { exact: true });

/** The app is listed once per section it appears in */
const appLinks = (page: Page) =>
  appsPopover(page).getByRole("link", { name: "Dashboard", exact: true });

/**
 * The tile carrying the app's link — every app is one item of a list. The
 * `has` locator is resolved against each list item, so it must not carry
 * the popover scope of appLinks().
 */
const appTile = (page: Page) =>
  appsPopover(page)
    .getByRole("listitem")
    .filter({
      has: page.getByRole("link", { name: "Dashboard", exact: true }),
    });

test("favoriting an app adds it to the popover's favorites section and persists", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "favoriten-nutzer" });
  await signIn(citizen.user);

  await page.goto("/app");
  await openAppsPopover(page);

  await expect(favoritesHeading(page)).toHaveCount(0);
  await expect(appLinks(page)).toHaveCount(1);

  // The star is revealed by hovering the tile the link belongs to
  const tile = appTile(page);
  await tile.hover();
  await tile.getByRole("button", { name: "Als Favorit speichern" }).click();

  await expect(favoritesHeading(page)).toBeVisible();
  // Once under "Favoriten" and still once under "Featured"
  await expect(appLinks(page)).toHaveCount(2);

  // The star flips optimistically — reloading before the action has landed
  // would abort it
  await expect
    .poll(() =>
      prisma.citizenAppFavorite.count({
        where: { citizenId: citizen.entity.id },
      }),
    )
    .toBe(1);

  await page.reload();
  await openAppsPopover(page);

  await expect(favoritesHeading(page)).toBeVisible();
  await expect(appLinks(page)).toHaveCount(2);

  await appsPopover(page)
    .getByRole("button", { name: "Favorit entfernen" })
    .first()
    .click();

  await expect(favoritesHeading(page)).toHaveCount(0);
  await expect(appLinks(page)).toHaveCount(1);
  await expect
    .poll(() =>
      prisma.citizenAppFavorite.count({
        where: { citizenId: citizen.entity.id },
      }),
    )
    .toBe(0);
});
