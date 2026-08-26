import type { Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import { expect, test } from "../fixtures/test";

/**
 * The indicator of a new entry, independent of the classes drawing it. The
 * entries themselves come from the source (`entries.tsx`), so the cases below
 * compare counts instead of naming single entries.
 */
const newEntryIndicators = (page: Page) =>
  page.locator("[data-new-changelog-entry]");

/** Dwell time + flush debounce + server action, with headroom. */
const READ_ON_VIEW_TIMEOUT = 15_000;

/** Long before the first changelog entry, so every tracked entry is new */
const BEFORE_THE_FIRST_ENTRY = new Date("2020-01-01T00:00:00.000Z");

test("entries are marked as seen in view and keep their indicator", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "changelog-reader",
    emailVerified: BEFORE_THE_FIRST_ENTRY,
  });
  await signIn(citizen.user);

  await page.goto("/app/changelog");
  await expect(newEntryIndicators(page).first()).toBeVisible();
  const indicatorCount = await newEntryIndicators(page).count();

  const seenCount = () =>
    prisma.changelogEntrySeen.count({
      where: { citizenId: citizen.entity.id },
    });

  /**
   * The newest entry needs a permission this citizen does not have, thus it
   * is redacted and marked without ever carrying an indicator. Scrolling to
   * an entry further down makes sure that indicators are marked as well —
   * more than one seen entry can then only mean an entry with an indicator.
   */
  await newEntryIndicators(page).nth(3).scrollIntoViewIfNeeded();
  await expect
    .poll(seenCount, { timeout: READ_ON_VIEW_TIMEOUT })
    .toBeGreaterThan(1);

  // The entries which are already marked keep their indicator until the page
  // is left, so nothing disappears under the user while they read.
  await expect(newEntryIndicators(page)).toHaveCount(indicatorCount);

  /**
   * The next visit renders the marked entries without their indicator, while
   * the entries further down the page - which were never in view - keep
   * theirs. The two counts do not subtract to each other: a redacted entry is
   * marked as well, but never carries an indicator.
   */
  await page.reload();
  await expect(newEntryIndicators(page).first()).toBeVisible();
  expect(await newEntryIndicators(page).count()).toBeLessThan(indicatorCount);
});

test("entries published before the email confirmation are not new", async ({
  page,
  prisma,
  signIn,
}) => {
  const veteran = await createCitizen(prisma, {
    handle: "changelog-veteran",
    emailVerified: BEFORE_THE_FIRST_ENTRY,
  });
  const newcomer = await createCitizen(prisma, {
    handle: "changelog-newcomer",
    emailVerified: new Date(),
  });

  await signIn(newcomer.user);
  await page.goto("/app/changelog");
  await expect(page.getByRole("heading", { name: "Changelog" })).toBeVisible();
  const newcomerIndicators = await newEntryIndicators(page).count();

  await signIn(veteran.user);
  await page.goto("/app/changelog");
  await expect(newEntryIndicators(page).first()).toBeVisible();
  const veteranIndicators = await newEntryIndicators(page).count();

  expect(newcomerIndicators).toBeLessThan(veteranIndicators);
});
