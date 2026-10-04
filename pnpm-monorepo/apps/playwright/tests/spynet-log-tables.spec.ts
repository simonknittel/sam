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
  await expect(page.getByText("1 / 2").filter({ visible: true })).toBeVisible();
  for (const content of [
    UNCONFIRMED_HANDLE,
    FALSE_REPORT_HANDLE,
    CONFIRMED_DISCORD_ID,
  ])
    await expect(logContent(page, content)).toHaveCount(0);

  await page.goto("/app/spynet/other?page=2");
  await expect(page.getByText("2 / 2").filter({ visible: true })).toBeVisible();
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

const headerLink = (page: Page, name: string) =>
  page.locator("thead").getByRole("link", { name, exact: true });

test("the log table sorts by the confirmation time and keeps the sort and the filters on the next page", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "log-sortierer",
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

  await headerLink(page, "Eingereicht am").click();
  await expect(page).toHaveURL(/sort=created-at-asc/);
  await expect(tableRows(page).first()).toContainText(OLDEST_CONFIRMED_HANDLE);

  /**
   * The newest confirmation first, and the log without a decision last: on
   * the second page after the three oldest confirmed logs
   */
  await headerLink(page, "Bestätigt am").click();
  await expect(page).toHaveURL(/sort=confirmed-at-desc/);
  await expect(logContent(page, CONFIRMED_DISCORD_ID)).toBeVisible();
  await expect(
    page.locator("thead").getByRole("columnheader", { name: "Bestätigt am" }),
  ).toHaveAttribute("aria-sort", "descending");
  await page.getByRole("link", { name: "Nächste Seite" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/sort=confirmed-at-desc/);
  await expect(tableRows(page)).toHaveCount(4);
  await expect(tableRows(page).last()).toContainText(UNCONFIRMED_HANDLE);

  /** 51 confirmed handle logs and the confirmed Discord ID: two pages */
  await page.goto("/app/spynet/other");
  const confirmationFilter = page.getByRole("dialog", {
    name: "Bestätigungsstatus",
  });
  await clickUntilVisible(
    page.getByRole("button", { name: "Bestätigungsstatus" }),
    confirmationFilter,
  );
  await clickUntilUrl(
    page,
    toggleLabel(confirmationFilter, /^Bestätigt$/),
    /filters=confirmation-confirmed$/,
  );
  await expect(page.getByText("1 / 2").filter({ visible: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(confirmationFilter).not.toBeVisible();

  await page.getByRole("link", { name: "Nächste Seite" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/filters=confirmation-confirmed/);
  await expect(tableRows(page)).toHaveCount(2);
  await expect(tableRows(page).last()).toContainText(OLDEST_CONFIRMED_HANDLE);

  // A page number below 1 shows the first page
  await page.goto("/app/spynet/other?page=-1");
  await expect(page.getByText("1 / 2").filter({ visible: true })).toBeVisible();
  await expect(tableRows(page)).toHaveCount(PER_PAGE);
});

test("the notes table keeps the note type filters of an old bookmark when it sorts", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "notiz-sortierer",
    permissionStrings: ["citizen;read", "spynetNotes;read"],
  });
  const observation = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  const rumour = await prisma.noteType.create({ data: { name: "Gerücht" } });
  const sighting = await prisma.noteType.create({ data: { name: "Sichtung" } });
  const classificationLevel = await prisma.classificationLevel.create({
    data: { name: "Geheim" },
  });
  const citizen = await prisma.citizen.create({
    data: { handle: "beobachteter" },
  });

  /** The note of the first note type is the newest */
  const now = Date.now();
  await prisma.citizenLog.createMany({
    data: [observation, rumour, sighting].map((noteType, index) => {
      const createdAt = new Date(now - (index + 1) * ONE_MINUTE_MS);

      return {
        citizenId: citizen.id,
        type: "note",
        content: `Notiz: ${noteType.name}`,
        noteTypeId: noteType.id,
        classificationLevelId: classificationLevel.id,
        confirmed: ConfirmationStatus.CONFIRMED,
        confirmedAt: createdAt,
        createdAt,
      };
    }),
  });

  await signIn(viewer.user);

  /** The format of the filter list before nuqs: URLSearchParams encoded the comma */
  await page.goto(
    `/app/spynet/notes?filters=note-type-${observation.id}%2Cnote-type-${rumour.id}`,
  );
  await expect(tableRows(page)).toHaveCount(2);
  await expect(tableRows(page).first()).toContainText("Notiz: Beobachtung");
  await expect(logContent(page, "Notiz: Sichtung")).toHaveCount(0);

  const noteTypeFilter = page.getByRole("dialog", { name: "Notizarten" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Notizarten" }),
    noteTypeFilter,
  );
  await expect(
    noteTypeFilter.getByRole("checkbox", { name: "Beobachtung" }),
  ).toBeChecked();
  await expect(
    noteTypeFilter.getByRole("checkbox", { name: "Gerücht" }),
  ).toBeChecked();
  await expect(
    noteTypeFilter.getByRole("checkbox", { name: "Sichtung" }),
  ).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(noteTypeFilter).not.toBeVisible();

  await headerLink(page, "Eingereicht am").click();
  await expect(page).toHaveURL(/sort=created-at-asc/);
  await expect(page).toHaveURL(
    new RegExp(`filters=note-type-${observation.id},note-type-${rumour.id}`),
  );
  await expect(tableRows(page)).toHaveCount(2);
  await expect(tableRows(page).first()).toContainText("Notiz: Gerücht");
});
