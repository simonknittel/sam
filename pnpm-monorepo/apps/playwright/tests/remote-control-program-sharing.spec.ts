import type { Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import { instantToWallTime, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { createCitizen, type TestCitizen } from "../fixtures/factories";
import { toggleLabel } from "../fixtures/interactions";
import {
  appendLogLines,
  applyDateRange,
  blueprintLine,
  createBackupFile,
  daysAgo,
  joinPuLine,
  LOG_ANALYZER_PAGE_PATH,
  LOG_ANALYZER_PERMISSIONS,
  minutesAgo,
  rowOf,
  stubDirectoryPicker,
  tableRows,
} from "../fixtures/log-analyzer";
import {
  closeSharingPopover,
  createShareGrantInPopover,
  LIVE_UPLOAD_TIMEOUT,
  openShareGrantForm,
  openSharingPopover,
  REALTIME_DELIVERY_GRACE,
  relayConnectionState,
  revokeShareGrantInPopover,
  sharingPopover,
  sharingPopoverSection,
  SharingPopoverSection,
  sharingPopoverTrigger,
  startBrowserRuntime,
  submitShareGrantForm,
  turnOnLogEntryTypes,
} from "../fixtures/remote-control-program";
import { expect, test } from "../fixtures/test";

/**
 * The end-to-end paths of the Remote Control Program with the Log Analyzer
 * as the control UI: the rule for the upload, the grants, the realtime
 * delivery, the "Stop all" and the request for older entries (see
 * docs/remote-control-program/README.md). The browser runtime reads the
 * folder of `stubDirectoryPicker()` every 10 seconds, thus each new line
 * takes some seconds.
 */

/** Some reads of the folder and two browsers per test */
const SHARING_TEST_TIMEOUT = 180_000;

/** The owner also picks the citizen of a grant, which needs `citizen;read` */
const OWNER_PERMISSIONS = [...LOG_ANALYZER_PERMISSIONS, "citizen;read"];

const BLUEPRINT_TYPE_TITLE = "Blueprint erhalten";
const CONTRACT_TYPE_TITLE = "Contract angenommen";

const MISSION_ID = "bf7d2465-cf1e-480b-ae5c-25040d716e5f";

/** The name of the contract is the message of the entry */
const contractAcceptedLine = (at: Date, contract: string) =>
  `<${at.toISOString()}> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Accepted:  ${contract}: " [4] to queue. New queue size: 1, MissionId: [${MISSION_ID}], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]`;

/** The raw lines of the owner in the database, in the order of the log file */
const uploadedLines = (prisma: PrismaClient, owner: TestCitizen) =>
  prisma.logAnalyzerEntry
    .findMany({
      where: { createdById: owner.entity.id },
      orderBy: [{ eventAt: "asc" }, { lineNumber: "asc" }],
      select: { rawLine: true },
    })
    .then((entries) => entries.map((entry) => entry.rawLine));

const expectUploadedLines = (
  prisma: PrismaClient,
  owner: TestCitizen,
  lines: readonly string[],
) =>
  expect
    .poll(() => uploadedLines(prisma, owner), { timeout: LIVE_UPLOAD_TIMEOUT })
    .toEqual(lines);

/**
 * The owner opens the Log Analyzer, selects the folder in the sharing
 * popover and turns on the types. The popover stays open.
 */
const startSharing = async (
  page: Page,
  folderLines: readonly string[],
  typeTitles: readonly string[],
) => {
  await stubDirectoryPicker(page, folderLines);
  await page.goto(LOG_ANALYZER_PAGE_PATH);
  await startBrowserRuntime(page);
  await expect(relayConnectionState(page, "Verbunden")).toBeVisible();
  await turnOnLogEntryTypes(page, typeTitles);
};

/** The first read of the feed ended, thus an empty table stays empty */
const waitForFeed = async (page: Page) => {
  await expect(
    page.getByRole("button", { name: "Filter", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Lade Einträge …")).toHaveCount(0);
};

test("only the lines that the runtime reads live leave the machine, and only of the types that are on", async ({
  page,
  prisma,
  signIn,
}) => {
  test.setTimeout(SHARING_TEST_TIMEOUT);

  const owner = await createCitizen(prisma, {
    handle: "rcp-teiler",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  await signIn(owner.user);

  await startSharing(
    page,
    [
      blueprintLine(minutesAgo(5), "Alter Helm"),
      contractAcceptedLine(minutesAgo(4), "Alter Auftrag"),
    ],
    [BLUEPRINT_TYPE_TITLE, CONTRACT_TYPE_TITLE],
  );
  await closeSharingPopover(page);

  /** The lines from before the start stay on the machine */
  await expect(rowOf(page, "Alter Helm")).toBeVisible();
  await expect(rowOf(page, "Alter Auftrag")).toBeVisible();

  const blueprintAfterStart = blueprintLine(new Date(), "Neuer Helm");
  const contractAfterStart = contractAcceptedLine(new Date(), "Neuer Auftrag");
  await appendLogLines(page, [
    blueprintAfterStart,
    /** A type that is off */
    joinPuLine(new Date()),
    contractAfterStart,
  ]);

  await expectUploadedLines(prisma, owner, [
    blueprintAfterStart,
    contractAfterStart,
  ]);
  await expect(rowOf(page, "Shard-Beitritt")).toBeVisible();

  /** The relay keeps the context of each entry (principle 13) */
  expect(
    await prisma.logAnalyzerEntry.count({
      where: { createdById: owner.entity.id, runtimeId: null },
    }),
  ).toBe(0);
});

test("a grant shows the new entries of the owner in realtime, and a revocation stops them", async ({
  page,
  prisma,
  signIn,
  openSignedInBrowser,
}) => {
  test.setTimeout(SHARING_TEST_TIMEOUT);

  const owner = await createCitizen(prisma, {
    handle: "rcp-eigentuemer",
    permissionStrings: OWNER_PERMISSIONS,
  });
  const grantee = await createCitizen(prisma, {
    handle: "rcp-empfaenger",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  await signIn(owner.user);
  await startSharing(page, [], [BLUEPRINT_TYPE_TITLE]);

  const lineBeforeGrant = blueprintLine(new Date(), "Vor der Freigabe");
  await appendLogLines(page, [lineBeforeGrant]);
  await expectUploadedLines(prisma, owner, [lineBeforeGrant]);

  /** Without a grant, the grantee sees nothing of the owner */
  const granteePage = await openSignedInBrowser(grantee.user);
  await granteePage.goto(LOG_ANALYZER_PAGE_PATH);
  await waitForFeed(granteePage);
  await expect(tableRows(granteePage)).toHaveCount(0);

  await createShareGrantInPopover(page, "rcp-empfaenger");

  /** The page of the grantee gets the new entry without a reload */
  const lineWithGrant = blueprintLine(new Date(), "Mit Freigabe");
  await appendLogLines(page, [lineWithGrant]);
  await expect(rowOf(granteePage, "Mit Freigabe")).toBeVisible({
    timeout: LIVE_UPLOAD_TIMEOUT,
  });
  await expect(
    rowOf(granteePage, "Mit Freigabe").getByRole("link", {
      name: "rcp-eigentuemer",
    }),
  ).toBeVisible();
  /** The grant shows only the entries from its start (decision 8) */
  await expect(rowOf(granteePage, "Vor der Freigabe")).toHaveCount(0);

  await revokeShareGrantInPopover(page, "rcp-empfaenger");

  const lineAfterRevocation = blueprintLine(new Date(), "Nach dem Widerruf");
  await appendLogLines(page, [lineAfterRevocation]);
  await expectUploadedLines(prisma, owner, [
    lineBeforeGrant,
    lineWithGrant,
    lineAfterRevocation,
  ]);

  /** The relay sends the accepted entries at once, thus a wait shows that none comes */
  await granteePage.waitForTimeout(REALTIME_DELIVERY_GRACE);
  await expect(rowOf(granteePage, "Nach dem Widerruf")).toHaveCount(0);

  await granteePage.reload();
  await waitForFeed(granteePage);
  await expect(tableRows(granteePage)).toHaveCount(0);
});

test("after a stop of all runtimes, the lines of the stopped time stay on the machine", async ({
  page,
  prisma,
  signIn,
}) => {
  test.setTimeout(SHARING_TEST_TIMEOUT);

  const owner = await createCitizen(prisma, {
    handle: "rcp-stopper",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  await signIn(owner.user);
  await startSharing(page, [], [BLUEPRINT_TYPE_TITLE]);

  const lineBeforeStop = blueprintLine(new Date(), "Vor dem Stopp");
  await appendLogLines(page, [lineBeforeStop]);
  await expectUploadedLines(prisma, owner, [lineBeforeStop]);

  const status = sharingPopoverSection(page, SharingPopoverSection.Status);
  await status.getByRole("button", { name: "Alles stoppen" }).click();
  const confirmation = page.getByRole("alertdialog", {
    name: "Alles stoppen?",
  });
  await confirmation.getByRole("button", { name: "Alles stoppen" }).click();

  await expect(
    status.getByRole("button", { name: "Alles starten" }),
  ).toBeVisible();
  /** The relay tells the runtime, and the trigger tells the stop */
  await expect(
    relayConnectionState(page, "Verbunden, alles gestoppt"),
  ).toBeVisible();
  await expect(sharingPopoverTrigger(page)).toHaveAccessibleName(
    "Remote Control Program: alles gestoppt",
  );
  await closeSharingPopover(page);

  /** The runtime reads on: the line shows on the machine */
  await appendLogLines(page, [blueprintLine(new Date(), "Im Stopp")]);
  await expect(rowOf(page, "Im Stopp")).toBeVisible({
    timeout: LIVE_UPLOAD_TIMEOUT,
  });

  await openSharingPopover(page);
  await status.getByRole("button", { name: "Alles starten" }).click();
  await expect(relayConnectionState(page, "Verbunden")).toBeVisible();
  await expect(sharingPopoverTrigger(page)).toHaveAccessibleName(
    "Remote Control Program",
  );

  /** Only the new lines after the start go up */
  const lineAfterStart = blueprintLine(new Date(), "Nach dem Start");
  await appendLogLines(page, [lineAfterStart]);
  await expectUploadedLines(prisma, owner, [lineBeforeStop, lineAfterStart]);
});

test("older entries go up only on a confirmed request, and only a grant that covers their time shows them", async ({
  page,
  prisma,
  signIn,
  openSignedInBrowser,
}) => {
  test.setTimeout(SHARING_TEST_TIMEOUT);

  const owner = await createCitizen(prisma, {
    handle: "rcp-archivar",
    permissionStrings: OWNER_PERMISSIONS,
  });
  const grantee = await createCitizen(prisma, {
    handle: "rcp-leser",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  await signIn(owner.user);

  const oldEventAt = daysAgo(40);
  const oldLine = blueprintLine(oldEventAt, "Alter Bauplan");
  await stubDirectoryPicker(
    page,
    [blueprintLine(minutesAgo(5), "Aktueller Bauplan")],
    [
      createBackupFile(oldEventAt, oldLine),
      /** A type that is off */
      createBackupFile(daysAgo(39), joinPuLine(daysAgo(39))),
    ],
  );
  await page.goto(LOG_ANALYZER_PAGE_PATH);
  await startBrowserRuntime(page);
  await turnOnLogEntryTypes(page, [BLUEPRINT_TYPE_TITLE]);
  /** A grant from now on does not cover the older entries */
  await createShareGrantInPopover(page, "rcp-leser");
  await closeSharingPopover(page);

  await applyDateRange(page, daysAgo(42), daysAgo(38));
  await expect(rowOf(page, "Alter Bauplan")).toBeVisible();
  await expect(rowOf(page, "Shard-Beitritt")).toBeVisible();

  await page.getByRole("button", { name: "Ältere Einträge teilen" }).click();
  const request = sharingPopover(page).getByRole("region", {
    name: "Ältere Einträge hochladen?",
  });
  /** The count of each type that is on */
  await expect(request.getByRole("listitem")).toHaveText([
    new RegExp(`^${BLUEPRINT_TYPE_TITLE}\\s*1$`),
  ]);
  await expect(
    request.getByText("Nur du: Keine deiner Freigaben deckt den Zeitraum ab."),
  ).toBeVisible();
  expect(await uploadedLines(prisma, owner)).toEqual([]);

  await request.getByRole("button", { name: "1 Eintrag hochladen" }).click();
  await expect(request).toHaveCount(0);
  await expectUploadedLines(prisma, owner, [oldLine]);

  /** The grant from now on does not show the older entry */
  const granteePage = await openSignedInBrowser(grantee.user);
  await granteePage.goto(LOG_ANALYZER_PAGE_PATH);
  await applyDateRange(granteePage, daysAgo(42), daysAgo(38));
  await waitForFeed(granteePage);
  await expect(tableRows(granteePage)).toHaveCount(0);

  /** A grant with a start in the past shows the entries from its start */
  await openSharingPopover(page);
  const form = await openShareGrantForm(page, "rcp-leser");
  await toggleLabel(
    form,
    page.getByRole("radio", { name: "Zeitraum", exact: true }),
  ).click();
  await form
    .getByLabel("Start", { exact: true })
    .fill(instantToWallTime(daysAgo(41), ORGANIZATION_TIMEZONE));
  await submitShareGrantForm(page, form, "rcp-leser");

  await granteePage.reload();
  await applyDateRange(granteePage, daysAgo(42), daysAgo(38));
  await expect(rowOf(granteePage, "Alter Bauplan")).toBeVisible();
  await expect(tableRows(granteePage)).toHaveCount(2);
});
