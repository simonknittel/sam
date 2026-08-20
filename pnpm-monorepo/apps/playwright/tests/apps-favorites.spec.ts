import type { Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import { expect, test } from "../fixtures/test";

/**
 * Base UI renders the popup with `role="dialog"`. Scoping to it keeps the
 * assertions away from the mobile flyout, which lists the same apps.
 */
const appsPopover = (page: Page) => page.getByRole("dialog");

/**
 * The popover opens on hover — clicking the trigger would race the hover
 * delay and could toggle it straight back closed.
 */
const openAppsPopover = async (page: Page) => {
  await page.getByRole("button", { name: "Apps" }).hover();
  await expect(
    appsPopover(page).getByText("Featured", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
};

const favoritesHeading = (page: Page) =>
  appsPopover(page).getByText("Favoriten", { exact: true });

/** The app is listed once per section it appears in */
const appLinks = (page: Page) =>
  appsPopover(page).getByRole("link", { name: "Dashboard", exact: true });

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
  const tile = appLinks(page).locator(
    "xpath=ancestor::div[contains(@class, 'group/app-tile')][1]",
  );
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
