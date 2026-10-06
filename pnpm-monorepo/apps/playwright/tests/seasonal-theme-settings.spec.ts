import type { Page, Request } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen, createUserWithoutCitizen } from "../fixtures/factories";
import {
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

/** A server action posts to the address of the page it runs on */
const isSaveRequest = (request: Request) =>
  request.method() === "POST" &&
  new URL(request.url()).pathname === APPEARANCE_PAGE &&
  request.headers()["next-action"] !== undefined;

/** Collects the saves which the page sends from now on */
const recordSaves = (page: Page) => {
  const saves: Request[] = [];
  page.on("request", (request) => {
    if (isSaveRequest(request)) saves.push(request);
  });
  return saves;
};

/**
 * Holds the saves in the browser until the test calls the returned function,
 * thus the test can act while a save runs.
 */
const holdSaves = async (page: Page) => {
  const { promise: released, resolve: release } = Promise.withResolvers<void>();
  await page.route(
    (url) => url.pathname === APPEARANCE_PAGE,
    async (route) => {
      if (isSaveRequest(route.request())) await released;
      await route.continue();
    },
  );
  return release;
};

/** The keys of the events which the citizen switched off, sorted */
const switchedOffEvents = (prisma: PrismaClient, citizenId: string) =>
  prisma.seasonalThemeSetting
    .findMany({
      where: { citizenId },
      select: { eventKey: true },
      orderBy: { eventKey: "asc" },
    })
    .then((settings) => settings.map((setting) => setting.eventKey));

test("the appearance page offers a switch for every seasonal event", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "darstellungs-leser" });
  await signIn(citizen.user);

  await page.goto("/app/account");
  const appearanceLink = page.getByRole("link", { name: "Darstellung" });
  await expect(appearanceLink).toBeVisible();
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
  );
  /**
   * Each toggle saves once, thus the page has to be hydrated before the
   * first one — a retried click would save more than once.
   */
  await waitForAppShellHydration(page);

  // Another event's switch leaves the theme of the day alone
  await toggleEvent(page, "christmas");
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(eventCheckbox(page, "christmas")).not.toBeChecked();
  await expect(themeRoot(page)).toHaveAttribute(
    "data-seasonal-event",
    "halloween",
  );

  /**
   * The theme root lives in the layout of the app, and the action calls
   * `refresh()`: the answer of the action carries the shell without the
   * theme, thus the assertion stays in the same page life. A reload could
   * not tell a refreshed layout from a fresh request.
   */
  await toggleEvent(page, "halloween");
  await expect(themeRoot(page)).toHaveCount(0);
  await expect(eventCheckbox(page, "halloween")).not.toBeChecked();

  await toggleEvent(page, "halloween");
  await expect(themeRoot(page)).toHaveAttribute(
    "data-seasonal-event",
    "halloween",
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

test("a switch toggled while the save of another switch runs is saved too", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "darstellungs-nachzuegler",
  });
  await signIn(citizen.user);

  await page.goto(APPEARANCE_PAGE);
  // Each toggle saves once, thus the page has to be hydrated first
  await waitForAppShellHydration(page);

  const releaseSaves = await holdSaves(page);
  const firstSave = page.waitForRequest(isSaveRequest);
  await toggleEvent(page, "christmas");
  await firstSave;

  /**
   * The answer of the first save renders the form again. That render must
   * keep the save of the second switch, which waits for the debounce.
   */
  await toggleEvent(page, "new-year");
  releaseSaves();

  await expect
    .poll(() => switchedOffEvents(prisma, citizen.entity.id))
    .toEqual(["christmas", "new-year"]);
});

test("switches toggled within the debounce share one save", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "darstellungs-sammler",
  });
  await signIn(citizen.user);

  await page.goto(APPEARANCE_PAGE);
  await waitForAppShellHydration(page);

  const saves = recordSaves(page);
  for (const eventKey of ["halloween", "christmas", "new-year"])
    await toggleEvent(page, eventKey);

  await expect
    .poll(() => switchedOffEvents(prisma, citizen.entity.id))
    .toEqual(["christmas", "halloween", "new-year"]);
  expect(saves).toHaveLength(1);
});

test("a switch toggled right before a navigation is still saved", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "darstellungs-wechsler",
  });
  await signIn(citizen.user);

  await page.goto(APPEARANCE_PAGE);
  await waitForAppShellHydration(page);

  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  /** The navigation removes the form before the debounce ends */
  await toggleEvent(page, "christmas");
  await page.getByRole("link", { name: "Sitzungen" }).click();
  await expect(page).toHaveURL("/app/account/sessions");

  await expect
    .poll(() => switchedOffEvents(prisma, citizen.entity.id))
    .toEqual(["christmas"]);
  expect(pageErrors).toEqual([]);
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
  );
  // One save, thus the page has to be hydrated first
  await waitForAppShellHydration(page);

  await toggleEvent(page, "halloween");
  await expect(themeRoot(page)).toHaveCount(0);

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
  await expect(page.getByRole("link", { name: "Sitzungen" })).toBeVisible();
  // The opt-outs belong to a citizen, thus the entry stays away
  await expect(page.getByRole("link", { name: "Darstellung" })).toHaveCount(0);

  await page.goto(APPEARANCE_PAGE);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
});
