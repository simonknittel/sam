import type { Page } from "@playwright/test";
import {
  ConfirmationStatus,
  type PrismaClient,
} from "@sam-monorepo/database/client";
import { createCitizen, ONE_MINUTE_MS } from "../fixtures/factories";
import {
  clickUntilUrl,
  clickUntilVisible,
  toggleLabel,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** The page size of the tables, see `PER_PAGE` of the app */
const PER_PAGE = 50;

const OTHER_TABLE_PERMISSIONS = ["citizen;read", "spynetOther;read"];

const UNCONFIRMED_HANDLE = "unbestaetigter-handle";
const FALSE_REPORT_HANDLE = "falsch-gemeldeter-handle";
const CONFIRMED_DISCORD_ID = "discord-4711";
const NEWEST_CONFIRMED_HANDLE = `protokoll-${PER_PAGE + 1}`;
const OLDEST_CONFIRMED_HANDLE = "protokoll-01";

/**
 * One confirmed handle log more than a page holds, and newer than these an
 * unconfirmed handle log, a false report and a confirmed Discord ID log.
 * Thus a viewer who may read one of these three logs sees it on page 1.
 */
const createLogs = async (prisma: PrismaClient) => {
  const citizen = await prisma.citizen.create({
    data: { handle: "beobachteter" },
  });
  const now = Date.now();

  await prisma.citizenLog.createMany({
    data: [
      ...Array.from({ length: PER_PAGE + 1 }, (unused, index) => {
        const createdAt = new Date(
          now - (PER_PAGE + 1 - index) * ONE_MINUTE_MS,
        );

        return {
          citizenId: citizen.id,
          type: "handle",
          content: `protokoll-${String(index + 1).padStart(2, "0")}`,
          confirmed: ConfirmationStatus.CONFIRMED,
          confirmedAt: createdAt,
          createdAt,
        };
      }),
      {
        citizenId: citizen.id,
        type: "handle",
        content: UNCONFIRMED_HANDLE,
        createdAt: new Date(now),
      },
      {
        citizenId: citizen.id,
        type: "handle",
        content: FALSE_REPORT_HANDLE,
        confirmed: ConfirmationStatus.FALSE_REPORT,
        confirmedAt: new Date(now),
        createdAt: new Date(now),
      },
      {
        citizenId: citizen.id,
        type: "discord-id",
        content: CONFIRMED_DISCORD_ID,
        confirmed: ConfirmationStatus.CONFIRMED,
        confirmedAt: new Date(now),
        createdAt: new Date(now),
      },
    ],
  });
};

/**
 * Only the visible rows: while the page streams, React keeps a hidden copy of
 * the table next to the visible one
 */
const tableRows = (page: Page) =>
  page.locator("tbody tr").filter({ visible: true });

const logContent = (page: Page, content: string) =>
  tableRows(page).getByText(content, { exact: true });

test("a viewer without the confirm permission sees only the confirmed logs of the readable types", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "log-leser",
    permissionStrings: [...OTHER_TABLE_PERMISSIONS, "handle;read"],
  });
  await createLogs(prisma);

  await signIn(viewer.user);
  await page.goto("/app/spynet/other");

  await expect(logContent(page, NEWEST_CONFIRMED_HANDLE)).toBeVisible();
  await expect(tableRows(page)).toHaveCount(PER_PAGE);
  await expect(page.getByText("1 / 2")).toBeVisible();
  for (const content of [
    UNCONFIRMED_HANDLE,
    FALSE_REPORT_HANDLE,
    CONFIRMED_DISCORD_ID,
  ])
    await expect(logContent(page, content)).toHaveCount(0);

  await page.goto("/app/spynet/other?page=2");
  await expect(page.getByText("2 / 2")).toBeVisible();
  await expect(tableRows(page)).toHaveCount(1);
  await expect(logContent(page, OLDEST_CONFIRMED_HANDLE)).toBeVisible();
});

test("a viewer with the confirm and read permissions sees all logs of these types and filters the false reports", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "log-pruefer",
    permissionStrings: [
      ...OTHER_TABLE_PERMISSIONS,
      "handle;read",
      "handle;confirm",
      "discord-id;read",
    ],
  });
  await createLogs(prisma);

  await signIn(viewer.user);
  await page.goto("/app/spynet/other");

  for (const content of [
    UNCONFIRMED_HANDLE,
    FALSE_REPORT_HANDLE,
    CONFIRMED_DISCORD_ID,
    NEWEST_CONFIRMED_HANDLE,
  ])
    await expect(logContent(page, content)).toBeVisible();

  const confirmationFilter = page.getByRole("dialog", {
    name: "Bestätigungsstatus",
  });
  await clickUntilVisible(
    page.getByRole("button", { name: "Bestätigungsstatus" }),
    confirmationFilter,
  );
  await clickUntilUrl(
    page,
    toggleLabel(confirmationFilter, "Falschmeldung"),
    /filters=confirmation-false-report/,
  );

  await expect(tableRows(page)).toHaveCount(1);
  await expect(logContent(page, FALSE_REPORT_HANDLE)).toBeVisible();
});
