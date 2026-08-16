import type { Locator, Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import { expect, test } from "../fixtures/test";
import { setUnleashFlag, UNLEASH_FLAG } from "../fixtures/unleash";

/**
 * Flag changes reach the app only after its 30 second definitions cache
 * expires (see the app's getUnleashFlag), so every state assertion polls
 * with a timeout well above that. Both flag states are asserted, so a
 * timeout here means the app did not pick up the change from the stack's
 * Unleash container — not that the default kicked in.
 */
const FLAG_PROPAGATION_TIMEOUT = 90_000;
const FLAG_PROPAGATION_INTERVALS = [2_000];
/** Two polled flag states plus navigations per test */
const FLAG_TEST_TIMEOUT = 300_000;

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
  await expect
    .poll(
      () =>
        pageShows(page, "/dogfight-trainer", (currentPage) =>
          currentPage.getByRole("heading", { name: "SAM" }),
        ),
      {
        timeout: FLAG_PROPAGATION_TIMEOUT,
        intervals: FLAG_PROPAGATION_INTERVALS,
      },
    )
    .toBe(true);
  // The heading belongs to the landing page the disabled flag redirects to
  await expect(page).toHaveURL("/", { timeout: 15_000 });

  await setUnleashFlag(UNLEASH_FLAG.EnableCareBearShooter, true);
  // The Unity build behind the dummy build URL never loads — the page
  // serving its shell instead of redirecting is the flag's observable effect
  await expect
    .poll(
      () =>
        pageShows(page, "/dogfight-trainer", (currentPage) =>
          currentPage.getByText("Loading ..."),
        ),
      {
        timeout: FLAG_PROPAGATION_TIMEOUT,
        intervals: FLAG_PROPAGATION_INTERVALS,
      },
    )
    .toBe(true);
  await expect(page).toHaveURL("/dogfight-trainer");
});

test("the kill switch flag takes the log analyzer offline", async ({
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

  await setUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer, false);
  await expect
    .poll(
      () =>
        pageShows(page, "/app/tools/log-analyzer", (currentPage) =>
          currentPage.getByText(
            "Der Log Analyzer wertet die Game Logs von Star Citizen aus",
          ),
        ),
      {
        timeout: FLAG_PROPAGATION_TIMEOUT,
        intervals: FLAG_PROPAGATION_INTERVALS,
      },
    )
    .toBe(true);

  await setUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer, true);
  await expect
    .poll(
      () =>
        pageShows(page, "/app/tools/log-analyzer", (currentPage) =>
          currentPage.getByText("Ein unerwarteter Fehler ist aufgetreten"),
        ),
      {
        timeout: FLAG_PROPAGATION_TIMEOUT,
        intervals: FLAG_PROPAGATION_INTERVALS,
      },
    )
    .toBe(true);
});
