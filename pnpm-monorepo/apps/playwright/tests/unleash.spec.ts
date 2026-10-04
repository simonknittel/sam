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
 * One attempt of the retry loop after the crash flag went off. The click
 * fails fast when the button is gone or still disabled. The new server
 * render has some seconds to show the log analyzer. If it does not, the flag
 * can still be on in the cache of the app, and the loop tries again.
 */
const RETRY_CLICK_TIMEOUT = 2_000;
const RETRY_RENDER_TIMEOUT = 5_000;

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
 * Holds each `router.refresh()` of the page until `release()`. Next.js asks
 * for the new server render with the RSC header, a prefetch also carries the
 * prefetch header.
 */
const holdPageRefresh = async (page: Page, path: string) => {
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const state = { requestCount: 0 };

  const isPage = (url: URL) => url.pathname === path;
  await page.route(isPage, async (route) => {
    const headers = route.request().headers();
    if (headers.rsc === "1" && !headers["next-router-prefetch"]) {
      state.requestCount += 1;
      await released;
    }
    await route.continue();
  });

  return {
    requestCount: () => state.requestCount,
    release,
    stop: () => page.unroute(isPage),
  };
};

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
  /** Tests on other workers open the log analyzer at the same time */
  const userScope = { userId: citizen.user.id };

  const introduction = page.getByText(
    "Der Log Analyzer wertet die Game Logs von Star Citizen aus",
  );
  const tileError = page.getByText("Ein unerwarteter Fehler ist aufgetreten");

  await setUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer, false, userScope);
  await expectFlagPropagation
    .poll(() => pageShows(page, "/app/tools/log-analyzer", () => introduction))
    .toBe(true);

  await setUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer, true, userScope);
  await expectFlagPropagation
    .poll(() => pageShows(page, "/app/tools/log-analyzer", () => tileError))
    .toBe(true);

  /**
   * The retry button stays disabled until the refresh of the page ends,
   * thus a second click cannot start a second refresh. The test holds the
   * refresh, thus it cannot end before the assertion. The flag is still on,
   * thus the tile fails again after the refresh.
   */
  const retryButton = page.getByRole("button", { name: "Erneut versuchen" });
  const heldRefresh = await holdPageRefresh(page, "/app/tools/log-analyzer");
  await retryButton.click();
  await expect.poll(heldRefresh.requestCount).toBeGreaterThan(0);
  await expect(retryButton).toBeDisabled();
  heldRefresh.release();
  await expect(retryButton).toBeEnabled();
  await expect(tileError).toBeVisible();
  await heldRefresh.stop();

  /**
   * The retry loads the tile again from the server without a reload of the
   * page.
   */
  await setUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer, false, userScope);
  await expect(async () => {
    if (!(await introduction.isVisible()))
      await retryButton.click({ timeout: RETRY_CLICK_TIMEOUT });
    await expect(introduction).toBeVisible({
      timeout: RETRY_RENDER_TIMEOUT,
    });
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
  /** Tests on other workers need the sharing at the same time */
  const userScope = { userId: citizen.user.id };

  await setUnleashFlag(
    UNLEASH_FLAG.DisableLogAnalyzerSharing,
    false,
    userScope,
  );
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

  await setUnleashFlag(UNLEASH_FLAG.DisableLogAnalyzerSharing, true, userScope);
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
});
