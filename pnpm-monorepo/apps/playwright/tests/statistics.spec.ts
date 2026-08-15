import type { Page } from "@playwright/test";
import { VariantStatus } from "@sam-monorepo/database/client";
import { createCitizen, createVariant } from "../fixtures/factories";
import { ACTION_FEEDBACK_TIMEOUT } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const CHART_TITLES = [
  "Flotte gesamt",
  "Flotte",
  "Logins",
  "Citizens",
  "Organisationen",
  "Registrierte Benutzer",
  "Rollen",
  "Events",
  "SILC",
];

const chartSection = (page: Page, title: string) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });

/**
 * Counts non-transparent pixels. An empty-but-mounted canvas passes
 * DOM-only checks — this catches the "flatlined chart" class of bug.
 */
const countPaintedPixels = (page: Page, title: string) =>
  chartSection(page, title)
    .locator("canvas")
    .first()
    .evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext("2d");
      if (!context || canvas.width === 0 || canvas.height === 0) return 0;
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      let painted = 0;
      for (let index = 3; index < pixels.length; index += 4) {
        if ((pixels[index] ?? 0) > 0) painted += 1;
      }
      return painted;
    });

/** Axis lines alone already paint far more than this. */
const MIN_PAINTED_PIXELS = 1_000;

test("all nine statistics charts paint their canvases", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "statistiker",
    permissionStrings: ["globalStatistics;read"],
  });

  /**
   * The snapshot charts (Flotte, Rollen, Logins) only have data for days
   * with seeded rows; the chart axis ends yesterday, and snapshot rows are
   * shifted back 12 hours before bucketing — 30 hours ago is safely on a
   * past axis day.
   */
  const THIRTY_HOURS_MS = 30 * 60 * 60 * 1000;
  const snapshotDate = new Date(Date.now() - THIRTY_HOURS_MS);
  const { variant } = await createVariant(prisma, {
    manufacturerName: "Roberts Space Industries",
    seriesName: "Polaris",
    variantName: "Polaris",
    status: VariantStatus.FLIGHT_READY,
  });
  await prisma.variantShipCount.create({
    data: { variantId: variant.id, count: 7, createdAt: snapshotDate },
  });
  await prisma.roleCitizenCount.create({
    data: { roleId: viewer.role.id, count: 3, createdAt: snapshotDate },
  });
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  await prisma.dailyLoginCount.create({
    data: { date: new Date(Date.now() - ONE_DAY_MS), count: 5 },
  });

  await signIn(viewer.user);
  await page.goto("/app/statistics");

  await expect(page.getByText("Zeitraum:")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  for (const title of CHART_TITLES) {
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByText("Keine Daten für den ausgewählten Zeitraum vorhanden."),
  ).toHaveCount(0);

  for (const title of CHART_TITLES) {
    await expect(
      chartSection(page, title).locator("canvas").first(),
    ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
    await expect
      .poll(() => countPaintedPixels(page, title), {
        timeout: ACTION_FEEDBACK_TIMEOUT,
        message: `chart "${title}" should paint pixels`,
      })
      .toBeGreaterThan(MIN_PAINTED_PIXELS);
  }
});

test("statistics are forbidden without the permission", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "unbefugter" });

  await signIn(citizen.user);
  await page.goto("/app/statistics");

  await expect(
    page.getByText("Du bist nicht berechtigt dies zu sehen."),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
});
