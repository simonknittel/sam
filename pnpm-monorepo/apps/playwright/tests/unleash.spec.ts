import type { Locator, Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import {
  appendLogLines,
  blueprintLine,
  LOG_ANALYZER_PAGE_PATH,
  LOG_ANALYZER_PERMISSIONS,
  rowOf,
  stubDirectoryPicker,
} from "../fixtures/log-analyzer";
import {
  LIVE_UPLOAD_TIMEOUT,
  sharingPopoverSection,
  SharingPopoverSection,
  startBrowserRuntime,
  turnOnLogEntryTypes,
} from "../fixtures/remote-control-program";
import { expect, test } from "../fixtures/test";
import {
  expectFlagPropagation,
  FLAG_PROPAGATION_TIMEOUT,
  setUnleashFlag,
  UNLEASH_FLAG,
} from "../fixtures/unleash";

/** Up to four polls for a flag state plus their navigations per test */
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
 * The wait covers client-side-only components (next/dynamic with ssr: false)
 * and server redirects, which Next.js streams as a client-side navigation after
 * the document shell.
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
 * Next.js asks for the new server render with the RSC header, a prefetch also
 * carries the prefetch header.
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
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  await signIn(citizen.user);
  const userScope = { userId: citizen.user.id };

  /** The guide stays outside of the error tile, thus the button is the mark */
  const filterButton = page.getByRole("button", {
    name: "Filter",
    exact: true,
  });
  const tileError = page.getByText("Ein unerwarteter Fehler ist aufgetreten");

  await setUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer, false, userScope);
  await expectFlagPropagation
    .poll(() => pageShows(page, LOG_ANALYZER_PAGE_PATH, () => filterButton))
    .toBe(true);

  await setUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer, true, userScope);
  await expectFlagPropagation
    .poll(() => pageShows(page, LOG_ANALYZER_PAGE_PATH, () => tileError))
    .toBe(true);

  /**
   * The retry button stays disabled until the refresh of the page ends,
   * thus a second click cannot start a second refresh. The test holds the
   * refresh, thus it cannot end before the assertion. The flag is still on,
   * thus the tile fails again after the refresh.
   */
  const retryButton = page.getByRole("button", { name: "Erneut versuchen" });
  const heldRefresh = await holdPageRefresh(page, LOG_ANALYZER_PAGE_PATH);
  await retryButton.click();
  await expect.poll(heldRefresh.requestCount).toBeGreaterThan(0);
  await expect(retryButton).toBeDisabled();
  heldRefresh.release();
  await expect(retryButton).toBeEnabled();
  await expect(tileError).toBeVisible();
  await heldRefresh.stop();

  await setUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer, false, userScope);
  await expect(async () => {
    if (!(await filterButton.isVisible()))
      await retryButton.click({ timeout: RETRY_CLICK_TIMEOUT });
    await expect(filterButton).toBeVisible({
      timeout: RETRY_RENDER_TIMEOUT,
    });
  }).toPass({ timeout: FLAG_PROPAGATION_TIMEOUT });
  await expect(retryButton).toHaveCount(0);
});

test("the flag of the log entries stops their uploads, and the sharing popover tells why", async ({
  page,
  prisma,
  signIn,
  stackFlagScope,
}) => {
  test.setTimeout(FLAG_TEST_TIMEOUT);

  const owner = await createCitizen(prisma, {
    handle: "rcp-abgeschaltet",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  await signIn(owner.user);

  const uploadedLines = () =>
    prisma.logAnalyzerEntry
      .findMany({
        where: { createdById: owner.entity.id },
        orderBy: { eventAt: "asc" },
        select: { rawLine: true },
      })
      .then((entries) => entries.map((entry) => entry.rawLine));
  const turnedOffNote = sharingPopoverSection(
    page,
    SharingPopoverSection.ThisBrowser,
  ).getByText(
    "Die Organisation hat abgeschaltet: Log-Einträge. Dieser Browser lädt davon nichts hoch.",
  );

  /**
   * The relay service of the worker has the Unleash app name of the app of
   * the worker, thus the scope of the stack turns off the part for both
   */
  try {
    await setUnleashFlag(
      UNLEASH_FLAG.DisableLogEntriesCapability,
      false,
      stackFlagScope,
    );
    await stubDirectoryPicker(page, []);
    await page.goto(LOG_ANALYZER_PAGE_PATH);
    await startBrowserRuntime(page);
    await turnOnLogEntryTypes(page, ["Blueprint erhalten"]);

    /** The baseline: the upload works */
    const lineBefore = blueprintLine(new Date(), "Vor der Abschaltung");
    await appendLogLines(page, [lineBefore]);
    await expectFlagPropagation
      .poll(uploadedLines, { timeout: FLAG_PROPAGATION_TIMEOUT })
      .toEqual([lineBefore]);

    await setUnleashFlag(
      UNLEASH_FLAG.DisableLogEntriesCapability,
      true,
      stackFlagScope,
    );
    await expectFlagPropagation(turnedOffNote).toBeVisible();

    /** The runtime reads on: the line shows on the machine */
    await appendLogLines(page, [
      blueprintLine(new Date(), "Während der Abschaltung"),
    ]);
    await expect(rowOf(page, "Während der Abschaltung")).toBeVisible({
      timeout: LIVE_UPLOAD_TIMEOUT,
    });

    await setUnleashFlag(
      UNLEASH_FLAG.DisableLogEntriesCapability,
      false,
      stackFlagScope,
    );
    await expectFlagPropagation(turnedOffNote).toHaveCount(0);

    /** The lines of the time in which the part was off stay on the machine */
    const lineAfter = blueprintLine(new Date(), "Nach der Abschaltung");
    await appendLogLines(page, [lineAfter]);
    await expect
      .poll(uploadedLines, { timeout: LIVE_UPLOAD_TIMEOUT })
      .toEqual([lineBefore, lineAfter]);
  } finally {
    await setUnleashFlag(
      UNLEASH_FLAG.DisableLogEntriesCapability,
      false,
      stackFlagScope,
    );
  }
});
