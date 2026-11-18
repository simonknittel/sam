import type { Locator } from "@playwright/test";
import { createCitizen, createUserWithoutCitizen } from "../fixtures/factories";
import { waitForAppShellHydration } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import { appDummyEnvironment } from "../setup/stack";

const EXPIRY_NOTE_TEXT = "Die Anmeldung für die Statistiken läuft ab.";

const ONE_HOUR_IN_SECONDS = 60 * 60;

interface TokenClaims {
  readonly sub: string;
  readonly aud: string;
  readonly iat: number;
  readonly exp: number;
  readonly jti: string;
}

/**
 * Reads the frame URL and the claims of its token. The stack has no
 * Grafana, thus the test only decodes the token, and the unit tests of the
 * app verify the signature. The assertions compare single values, so that
 * a failure never prints the token.
 */
const readFrame = async (frame: Locator) => {
  const url = new URL((await frame.getAttribute("src")) ?? "");
  const [, encodedClaims = ""] = (
    url.searchParams.get("auth_token") ?? ""
  ).split(".");

  return {
    url,
    claims: JSON.parse(
      Buffer.from(encodedClaims, "base64url").toString("utf8"),
    ) as TokenClaims,
  };
};

test("the statistics page shows the dashboard and signs a new token after the expiry", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "statistiker",
    permissionStrings: ["globalStatistics;read"],
  });
  await signIn(viewer.user);

  /** The test moves the clock of the page forward instead of waiting */
  await page.clock.install();
  await page.goto("/app/statistics");

  const frame = page.locator("#main-content iframe");
  await expect(frame).toHaveAttribute("title", "Statistiken");

  const first = await readFrame(frame);
  expect(first.url.origin).toBe(
    new URL(appDummyEnvironment.STATISTICS_GRAFANA_URL).origin,
  );
  expect(first.url.pathname).toBe("/d/sam-statistics/statistiken");
  expect(first.url.searchParams.get("kiosk")).toBe("1");
  expect(first.claims.aud).toBe("sam-statistics-grafana");
  expect(first.claims.sub).toBe(viewer.entity.id);
  expect(first.claims.exp - first.claims.iat).toBe(ONE_HOUR_IN_SECONDS);

  /** The timer of the note starts at the hydration */
  await waitForAppShellHydration(page);
  const expiryNote = page.getByText(EXPIRY_NOTE_TEXT);
  await expect(expiryNote).toHaveCount(0);

  await page.clock.fastForward("01:00:00");

  await expect(expiryNote).toBeVisible();
  await expect(frame).toHaveAttribute("inert");

  await page.getByRole("button", { name: "Statistiken neu laden" }).click();

  await expect(expiryNote).toHaveCount(0);
  await expect(frame).not.toHaveAttribute("inert");

  const second = await readFrame(frame);
  expect(second.claims.jti).not.toBe(first.claims.jti);
  expect(second.claims.exp - second.claims.iat).toBe(ONE_HOUR_IN_SECONDS);

  /**
   * A sleeping tab: the time goes on, but the timer does not fire. The page
   * finds the expiry when the tab becomes visible again.
   */
  await page.clock.setSystemTime(
    (await page.evaluate(() => Date.now())) + ONE_HOUR_IN_SECONDS * 1000,
  );
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(expiryNote).toBeVisible();
});

test("the statistics page shows a note instead of the dashboard to a user without a citizen", async ({
  page,
  prisma,
  signIn,
  enableAdminMode,
}) => {
  const user = await createUserWithoutCitizen(prisma, {
    name: "statistik-admin",
    admin: true,
  });
  await signIn(user);
  await enableAdminMode();

  await page.goto("/app/statistics");

  await expect(
    page
      .locator("#main-content")
      .getByText(
        "Die Statistiken benötigen einen Citizen, der mit deinem Account verknüpft ist.",
      ),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
});
