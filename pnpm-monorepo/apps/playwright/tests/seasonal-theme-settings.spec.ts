import type { Page } from "@playwright/test";
import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen, createUserWithoutCitizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilUrl,
  NOT_FOUND_TEXT,
  SAVED_TEXT,
  sectionByHeading,
  themeRoot,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** A day of the Halloween range, thus every visit here carries that theme */
const HALLOWEEN_DATE = "2026-10-15";

const APPEARANCE_PAGE = "/app/account/appearance";

/**
 * Every switch of the page, with the title which names it and the label of
 * its range, as a citizen reads them.
 */
const SEASONAL_EVENT_SWITCHES = [
  {
    title: "Halloween",
    rangeLabel: "1. bis 31. Oktober",
  },
  {
    title: "Weihnachten",
    rangeLabel: "1. bis 26. Dezember",
  },
  {
    title: "Neujahr",
    rangeLabel: "27. Dezember bis 1. Januar",
  },
] as const;

/**
 * The checkbox itself is sr-only — the visible control is the box its
 * wrapping label draws, thus a toggle goes through that label the way a
 * click does.
 */
const eventCheckbox = (page: Page, eventKey: string) =>
  page.locator(`input[name="${eventKey}"]`);

const toggleEvent = (page: Page, eventKey: string) =>
  toggleLabel(page, eventCheckbox(page, eventKey)).click();

test("the appearance page offers a switch for every seasonal event", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "darstellungs-leser" });
  await signIn(citizen.user);

  await page.goto("/app/account");
  const appearanceLink = page.getByRole("link", { name: "Darstellung" });
  await expect(appearanceLink).toBeVisible({
    // The first navigation warms the worker's app up
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await clickUntilUrl(page, appearanceLink, APPEARANCE_PAGE);

  const tile = sectionByHeading(page, "Saisonale Events");
  for (const { title, rangeLabel } of SEASONAL_EVENT_SWITCHES) {
    await expect(tile.getByText(rangeLabel)).toBeVisible();
    // Every event is on by default, thus a citizen who never visited this
    // page has no row at all
    await expect(tile.getByRole("checkbox", { name: title })).toBeChecked();
  }

  const settingCount = await prisma.seasonalThemeSetting.count({
    where: { citizenId: citizen.entity.id },
  });
  expect(settingCount).toBe(0);
});

test("switching the active event off strips its theme and switching it on restores it", async ({
  page,
  prisma,
  signIn,
  setSeasonalDate,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "darstellungs-schalter",
  });
  await signIn(citizen.user);
  await setSeasonalDate(HALLOWEEN_DATE);

  await page.goto(APPEARANCE_PAGE);
  await expect(themeRoot(page)).toHaveAttribute(
    "data-seasonal-event",
    "halloween",
    // The first navigation warms the worker's app up
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );
  /**
   * Each toggle saves once, thus the page has to be hydrated before the
   * first one — a retried click would save more than once.
   */
  await waitForAppShellHydration(page);

  // Another event's switch leaves the theme of the day alone
  await toggleEvent(page, "christmas");
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(eventCheckbox(page, "christmas")).not.toBeChecked();
  await expect(themeRoot(page)).toHaveAttribute(
    "data-seasonal-event",
    "halloween",
  );

  /**
   * The theme root lives in the layout of the app, and the action revalidates
   * that layout: the answer of the action carries the shell without the
   * theme, thus the assertion stays in the same page life. A reload could
   * not tell a revalidated layout from a fresh request.
   */
  await toggleEvent(page, "halloween");
  await expect(themeRoot(page)).toHaveCount(0, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(eventCheckbox(page, "halloween")).not.toBeChecked();

  await toggleEvent(page, "halloween");
  await expect(themeRoot(page)).toHaveAttribute(
    "data-seasonal-event",
    "halloween",
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );
  await expect(eventCheckbox(page, "halloween")).toBeChecked();

  // A fresh visit shows what the rows say, not what the browser remembers
  await page.goto(APPEARANCE_PAGE);
  // A whole request tells the same as the answer of the action above
  await expect(themeRoot(page)).toHaveAttribute(
    "data-seasonal-event",
    "halloween",
  );
  await expect(eventCheckbox(page, "christmas")).not.toBeChecked();
  await expect(eventCheckbox(page, "halloween")).toBeChecked();
  await expect(eventCheckbox(page, "new-year")).toBeChecked();

  // Opt-out model: only the switched-off event keeps a row
  const settings = await prisma.seasonalThemeSetting.findMany({
    where: { citizenId: citizen.entity.id },
  });
  expect(settings.map((setting) => setting.eventKey)).toEqual(["christmas"]);

  await expectAuditEvents(prisma, ["SEASONAL_THEME_SETTINGS_UPDATED"]);
});

test("the login page keeps its theme although the citizen switched it off", async ({
  page,
  context,
  prisma,
  signIn,
  setSeasonalDate,
}) => {
  const citizen = await createCitizen(prisma, { handle: "abmelde-anmelder" });
  await signIn(citizen.user);
  await setSeasonalDate(HALLOWEEN_DATE);

  await page.goto(APPEARANCE_PAGE);
  await expect(themeRoot(page)).toHaveAttribute(
    "data-seasonal-event",
    "halloween",
    // The first navigation warms the worker's app up
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );
  // One save, thus the page has to be hydrated first
  await waitForAppShellHydration(page);

  await toggleEvent(page, "halloween");
  await expect(themeRoot(page)).toHaveCount(0, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  /**
   * The login page cannot know its viewer and is therefore always themed.
   * A signed-in citizen never sees it, thus the session goes and the date
   * of the override stays.
   */
  await context.clearCookies();
  await setSeasonalDate(HALLOWEEN_DATE);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "SAM" }),
  ).toBeVisible();
  await expect(themeRoot(page)).toHaveAttribute(
    "data-seasonal-event",
    "halloween",
  );
});

test("a viewer without a citizen has no appearance page", async ({
  page,
  prisma,
  signIn,
  enableAdminMode,
}) => {
  /**
   * A user without a citizen gets no permissions from roles, thus admin mode
   * is the only way such a user reaches the account at all.
   */
  const user = await createUserWithoutCitizen(prisma, {
    name: "ohne-citizen-darstellung",
    admin: true,
  });
  await signIn(user);
  await enableAdminMode();

  /**
   * The sessions are the one account page such a viewer can open: the
   * profile, the notifications and the appearance all need a citizen. The
   * navigation of the account renders there, thus the missing entry shows.
   */
  await page.goto("/app/account/sessions");
  await expect(page.getByRole("link", { name: "Sitzungen" })).toBeVisible({
    // The first navigation warms the worker's app up
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  // The opt-outs belong to a citizen, thus the entry stays away
  await expect(page.getByRole("link", { name: "Darstellung" })).toHaveCount(0);

  await page.goto(APPEARANCE_PAGE);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
});
