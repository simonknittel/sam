import type { Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import { ACTION_FEEDBACK_TIMEOUT, themeRoot } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * A day next to a theme range, together with the event it belongs to.
 * Halloween stands alone in October, while New Year follows Christmas
 * without a gap: the day after the Christmas range already carries the New
 * Year theme, and the day before the New Year range still carries Christmas.
 */
interface NeighbouringDay {
  readonly date: string;
  /** The event of that day, or nothing while no theme is active */
  readonly event: string | null;
}

interface SeasonalEventCase {
  /** Value of `data-seasonal-event` on the theme root */
  readonly event: string;
  /** A day of the theme range which is not a greeting day */
  readonly insideDate: string;
  readonly dayBefore: NeighbouringDay;
  readonly dayAfter: NeighbouringDay;
  readonly greetingDate: string;
}

const SEASONAL_EVENTS: readonly SeasonalEventCase[] = [
  {
    event: "halloween",
    insideDate: "2026-10-15",
    dayBefore: { date: "2026-09-30", event: null },
    dayAfter: { date: "2026-11-01", event: null },
    greetingDate: "2026-10-31",
  },
  {
    event: "christmas",
    insideDate: "2026-12-15",
    dayBefore: { date: "2026-11-30", event: null },
    dayAfter: { date: "2026-12-27", event: "new-year" },
    greetingDate: "2026-12-24",
  },
  {
    event: "new-year",
    insideDate: "2026-12-30",
    dayBefore: { date: "2026-12-26", event: "christmas" },
    dayAfter: { date: "2027-01-02", event: null },
    greetingDate: "2027-01-01",
  },
];

/** A page of a sub-app */
const THEMED_PAGE = "/app/account/profile";
const THEMED_PAGE_TITLE = "Account";

for (const seasonalEvent of SEASONAL_EVENTS) {
  test(`the ${seasonalEvent.event} theme dresses the app during its range only`, async ({
    page,
    prisma,
    signIn,
    setSeasonalDate,
  }) => {
    const citizen = await createCitizen(prisma, {
      handle: `${seasonalEvent.event}-besucher`,
    });
    await signIn(citizen.user);

    await setSeasonalDate(seasonalEvent.insideDate);
    await page.goto(THEMED_PAGE);
    await expect(themeRoot(page)).toHaveAttribute(
      "data-seasonal-event",
      seasonalEvent.event,
      // The first navigation warms the worker's app up
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    );

    for (const neighbour of [seasonalEvent.dayBefore, seasonalEvent.dayAfter]) {
      await setSeasonalDate(neighbour.date);
      await page.goto(THEMED_PAGE);

      if (neighbour.event) {
        await expect(
          themeRoot(page),
          `${neighbour.date} belongs to ${neighbour.event}`,
        ).toHaveAttribute("data-seasonal-event", neighbour.event);
      } else {
        // The page must be there, else the missing theme proves nothing
        await expect(
          page.getByRole("heading", { level: 1, name: THEMED_PAGE_TITLE }),
        ).toBeVisible();
        await expect(
          themeRoot(page),
          `${neighbour.date} must carry no theme`,
        ).toHaveCount(0);
      }
    }
  });

  test(`the ${seasonalEvent.event} banner greets on the dashboard on its greeting day only`, async ({
    page,
    prisma,
    signIn,
    setSeasonalDate,
  }) => {
    const citizen = await createCitizen(prisma, {
      handle: `${seasonalEvent.event}-begruesster`,
    });
    await signIn(citizen.user);

    const banner = page.locator("[data-seasonal-banner]");

    await setSeasonalDate(seasonalEvent.greetingDate);
    await page.goto("/app/dashboard");
    await expect(banner).toBeVisible({
      // The first navigation warms the worker's app up
      timeout: ACTION_FEEDBACK_TIMEOUT,
    });

    await setSeasonalDate(seasonalEvent.insideDate);
    await page.goto("/app/dashboard");
    // The theme is there, thus the missing banner is no missing page
    await expect(themeRoot(page)).toHaveAttribute(
      "data-seasonal-event",
      seasonalEvent.event,
    );
    await expect(banner).toHaveCount(0);
  });
}

test("the login page wears the theme of the day", async ({
  page,
  setSeasonalDate,
}) => {
  for (const seasonalEvent of SEASONAL_EVENTS) {
    await setSeasonalDate(seasonalEvent.insideDate);
    await page.goto("/");

    // The login page has no viewer and thus no opt-out; it is always themed
    await expect(themeRoot(page)).toHaveAttribute(
      "data-seasonal-event",
      seasonalEvent.event,
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    );
  }
});

/**
 * The date override is a development and test hook, thus a value which names
 * no day must leave the app exactly as it is instead of failing a page.
 */
const UNUSABLE_DATES = ["not-a-date", "2026-02-30"];

/** The event of the theme root of the page, or nothing without a theme */
const readSeasonalEvent = async (page: Page) => {
  const root = themeRoot(page);
  if ((await root.count()) === 0) return null;

  return root.first().getAttribute("data-seasonal-event");
};

test("a date override which names no day behaves like no override", async ({
  page,
  prisma,
  signIn,
  setSeasonalDate,
}) => {
  const citizen = await createCitizen(prisma, { handle: "datum-verdreher" });
  await signIn(citizen.user);

  const dashboardHeading = page.getByRole("heading", { name: "Spynet" });

  /**
   * The real date of the run decides the baseline, and that date may well
   * lie inside a theme range. The other tests of this file prove that the
   * override works; this one proves that an unusable value is no override.
   */
  await page.goto("/app/dashboard");
  await expect(dashboardHeading).toBeVisible({
    // The first navigation warms the worker's app up
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  const eventWithoutOverride = await readSeasonalEvent(page);

  for (const date of UNUSABLE_DATES) {
    await setSeasonalDate(date);
    await page.goto("/app/dashboard");

    await expect(
      dashboardHeading,
      `${date} must leave the dashboard as it is`,
    ).toBeVisible();
    expect(
      await readSeasonalEvent(page),
      `${date} must dress the app like no cookie at all`,
    ).toBe(eventWithoutOverride);
  }
});
