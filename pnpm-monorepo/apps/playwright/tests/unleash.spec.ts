import type { Locator, Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import { expect, test } from "../fixtures/test";
import { setUnleashFlag, UNLEASH_FLAG } from "../fixtures/unleash";

/**
 * The stack runs the app with a one second flag cache
 * (UNLEASH_REVALIDATE_SECONDS, see setup/stack.ts), so a toggle shows up
 * after roughly one navigation. The headroom is for suite load. Both flag
 * states are asserted, so a timeout here means the app did not pick up the
 * change from the stack's Unleash container — not that the default kicked in.
 */
const FLAG_PROPAGATION_TIMEOUT = 30_000;
const expectFlagPropagation = expect.configure({
  timeout: FLAG_PROPAGATION_TIMEOUT,
});
/** Two polled flag states plus navigations per test */
const FLAG_TEST_TIMEOUT = 120_000;

/**
 * Navigates and reports whether the element shows up. The wait covers
 * client-side-only components (next/dynamic with ssr: false) and server
 * redirects, which Next.js streams as a client-side navigation after the
 * document shell — both render shortly after the navigation.
 */
const pageShows = async (
  page: Page,
  path: string,
  locate: (page: Page) => Locator,
) => {
  await page.goto(path);
  try {
    await locate(page).first().waitFor({ state: "visible", timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
};

test("the care bear shooter is released by its feature flag", async ({
  page,
}) => {
  test.setTimeout(FLAG_TEST_TIMEOUT);

  // A retry may still see the enabled flag of the previous attempt, so the
  // disabled baseline is enforced and polled instead of assumed
  await setUnleashFlag(UNLEASH_FLAG.EnableCareBearShooter, false);
  await expectFlagPropagation
    .poll(() =>
      pageShows(page, "/dogfight-trainer", (currentPage) =>
        currentPage.getByRole("heading", { name: "SAM" }),
      ),
    )
    .toBe(true);
  // The heading belongs to the landing page the disabled flag redirects to
  await expect(page).toHaveURL("/");

  await setUnleashFlag(UNLEASH_FLAG.EnableCareBearShooter, true);
  // The Unity build behind the dummy build URL never loads — the page
  // serving its shell instead of redirecting is the flag's observable effect
  await expectFlagPropagation
    .poll(() =>
      pageShows(page, "/dogfight-trainer", (currentPage) =>
        currentPage.getByText("Loading ..."),
      ),
    )
    .toBe(true);
  await expect(page).toHaveURL("/dogfight-trainer");
});

/**
 * The tests of this group steer the same page with two different flags.
 * They must not overlap: the crash flag of one test would fail the toolbar
 * poll of the other, thus the group runs them one after the other on one
 * worker.
 */
test.describe(() => {
  test.describe.configure({ mode: "serial" });

  test("the kill switch flag takes the log analyzer offline, and the retry of the error tile brings it back", async ({
    page,
    prisma,
    signIn,
  }) => {
    test.setTimeout(FLAG_TEST_TIMEOUT);

    const citizen = await createCitizen(prisma, {
      handle: "loganalyst",
      permissionStrings: ["logAnalyzer;read"],
    });
    await signIn(citizen.user);

    const introduction = page.getByText(
      "Der Log Analyzer wertet die Game Logs von Star Citizen aus",
    );

    await setUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer, false);
    await expectFlagPropagation
      .poll(() =>
        pageShows(page, "/app/tools/log-analyzer", () => introduction),
      )
      .toBe(true);

    await setUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer, true);
    await expectFlagPropagation
      .poll(() =>
        pageShows(page, "/app/tools/log-analyzer", (currentPage) =>
          currentPage.getByText("Ein unerwarteter Fehler ist aufgetreten"),
        ),
      )
      .toBe(true);

    /**
     * The retry loads the tile again from the server without a reload of the
     * page. The tests which follow also need the page in working order.
     */
    await setUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer, false);
    const retryButton = page.getByRole("button", { name: "Erneut versuchen" });
    await expect(async () => {
      if (!(await introduction.isVisible()))
        await retryButton.click({ timeout: 2_000 });
      await expect(introduction).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: FLAG_PROPAGATION_TIMEOUT });
    await expect(retryButton).toHaveCount(0);
  });

  enum SharingToolbarState {
    NoToolbar = "no toolbar",
    WithSharing = "with sharing",
    WithoutSharing = "without sharing",
  }

  /**
   * Navigates and reports which label the settings button of the log analyzer
   * toolbar shows: "Filter & Teilen" with the sharing, "Filter" without it.
   * The toolbar itself has to appear first — its absence stays a state of its
   * own, so a page which did not render cannot pass for the removed sharing.
   */
  const sharingToolbarState = async (page: Page) => {
    await page.goto("/app/tools/log-analyzer");
    const withSharing = page.getByRole("button", {
      name: "Filter & Teilen",
      exact: true,
    });
    const withoutSharing = page.getByRole("button", {
      name: "Filter",
      exact: true,
    });
    try {
      await withSharing
        .or(withoutSharing)
        .waitFor({ state: "visible", timeout: 5_000 });
    } catch {
      return SharingToolbarState.NoToolbar;
    }

    return (await withSharing.isVisible())
      ? SharingToolbarState.WithSharing
      : SharingToolbarState.WithoutSharing;
  };

  /** A shared entries query as the app would send it (superjson envelope) */
  const sharedEntriesUrl = () => {
    const queryParameters = new URLSearchParams({
      input: JSON.stringify({ json: { daysToLoad: 14 } }),
    });

    return `/api/trpc/logAnalyzer.getSharedEntries?${queryParameters.toString()}`;
  };

  test("the kill switch flag removes the sharing of the log analyzer", async ({
    page,
    prisma,
    signIn,
  }) => {
    test.setTimeout(FLAG_TEST_TIMEOUT);

    const citizen = await createCitizen(prisma, {
      handle: "sharing-flagged",
      permissionStrings: ["logAnalyzer;read"],
    });
    await signIn(citizen.user);

    await setUnleashFlag(UNLEASH_FLAG.DisableLogAnalyzerSharing, false);
    await expectFlagPropagation
      .poll(() => sharingToolbarState(page))
      .toBe(SharingToolbarState.WithSharing);
    /**
     * The baseline of the request below: the query answers this session.
     * The tRPC route holds its own cached copy of the flag definitions,
     * separate from the one the pages above refreshed, and a request serves
     * the stale copy while it starts the refresh — thus the two request
     * assertions poll like the page assertions do.
     */
    await expectFlagPropagation
      .poll(async () => {
        const response = await page.request.get(sharedEntriesUrl());
        return response.status();
      })
      .toBe(200);

    await setUnleashFlag(UNLEASH_FLAG.DisableLogAnalyzerSharing, true);
    await expectFlagPropagation
      .poll(() => sharingToolbarState(page))
      .toBe(SharingToolbarState.WithoutSharing);

    /**
     * The server refuses on its own, thus a client with a cached page or a
     * handmade request cannot read shared entries either.
     */
    await expectFlagPropagation
      .poll(async () => {
        const response = await page.request.get(sharedEntriesUrl());
        return response.status();
      })
      .toBe(403);

    /** The other tests of the log analyzer rely on the sharing */
    await setUnleashFlag(UNLEASH_FLAG.DisableLogAnalyzerSharing, false);
  });
});
