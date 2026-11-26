import type { Page } from "@playwright/test";
import { createCitizen, createShareGrant } from "../fixtures/factories";
import { FORBIDDEN_TEXT } from "../fixtures/interactions";
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
  countOlderEntries,
  createShareGrantInPopover,
  expectUploadedLines,
  LIVE_UPLOAD_TIMEOUT,
  openOlderEntriesUpload,
  REALTIME_DELIVERY_GRACE,
  relayConnectionState,
  revokeShareGrantInPopover,
  startBrowserRuntime,
  turnOnLogEntryTypes,
  uploadedLines,
} from "../fixtures/remote-control-program";
import { expect, test } from "../fixtures/test";

/**
 * The end-to-end paths of the Remote Control Program with the Log Analyzer
 * as the control UI: the rule for the upload, the grants, the realtime
 * delivery and the request for older entries (see
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

  /** The table tells which entries SAM has */
  for (const uploadedText of ["Neuer Helm", "Neuer Auftrag"])
    await expect(
      rowOf(page, uploadedText).getByRole("img", {
        name: "Hochgeladen",
        exact: true,
      }),
    ).toBeVisible();
  for (const localText of ["Alter Helm", "Alter Auftrag", "Shard-Beitritt"])
    await expect(
      rowOf(page, localText).getByRole("img", {
        name: "Nur auf diesem Computer",
      }),
    ).toBeVisible();

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

test("admin mode replaces the permissions of an admin, but not a grant", async ({
  page,
  prisma,
  signIn,
  enableAdminMode,
  openSignedInBrowser,
}) => {
  test.setTimeout(SHARING_TEST_TIMEOUT);

  const admin = await createCitizen(prisma, {
    handle: "rcp-admin",
    admin: true,
  });
  const owner = await createCitizen(prisma, {
    handle: "rcp-eigentuemer",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  await signIn(admin.user);
  await page.goto(LOG_ANALYZER_PAGE_PATH);
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();

  /** The runtime of the admin connects and uploads, also without a role */
  await enableAdminMode();
  await startSharing(page, [], [BLUEPRINT_TYPE_TITLE]);
  const lineOfAdmin = blueprintLine(new Date(), "Vom Admin");
  await appendLogLines(page, [lineOfAdmin]);
  await expectUploadedLines(prisma, admin, [lineOfAdmin]);
  await closeSharingPopover(page);

  const ownerPage = await openSignedInBrowser(owner.user);
  await startSharing(ownerPage, [], [BLUEPRINT_TYPE_TITLE]);
  const lineWithoutGrant = blueprintLine(new Date(), "Ohne Freigabe");
  await appendLogLines(ownerPage, [lineWithoutGrant]);
  await expectUploadedLines(prisma, owner, [lineWithoutGrant]);

  /** The relay sends the accepted entries at once, thus a wait shows that none comes */
  await page.waitForTimeout(REALTIME_DELIVERY_GRACE);
  await expect(rowOf(page, "Vom Admin")).toBeVisible();
  await expect(rowOf(page, "Ohne Freigabe")).toHaveCount(0);

  await createShareGrant(prisma, {
    ownerId: owner.entity.id,
    granteeCitizenId: admin.entity.id,
    startsAt: new Date(),
  });
  await appendLogLines(ownerPage, [blueprintLine(new Date(), "Mit Freigabe")]);
  await expect(rowOf(page, "Mit Freigabe")).toBeVisible({
    timeout: LIVE_UPLOAD_TIMEOUT,
  });
  await expect(rowOf(page, "Ohne Freigabe")).toHaveCount(0);
});

test("older entries go up only on a confirmed request, and each viewer sees them without a grant", async ({
  page,
  prisma,
  signIn,
  openSignedInBrowser,
}) => {
  test.setTimeout(SHARING_TEST_TIMEOUT);

  const owner = await createCitizen(prisma, {
    handle: "rcp-archivar",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  const viewer = await createCitizen(prisma, {
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

  const form = await openOlderEntriesUpload(page);
  const uploadButton = form.getByRole("button", {
    name: "Hochladen",
    exact: true,
  });

  /** A day that gives no limit must not count all entries */
  await form.getByLabel("Bis").fill("0026-06-30");
  await form.getByRole("button", { name: "Einträge zählen" }).click();
  await expect(form.getByText("Ein Datum ist ungültig.")).toBeVisible();
  await expect(uploadButton).toHaveCount(0);

  /** A change of the range needs a new count */
  await countOlderEntries(form, daysAgo(44), daysAgo(43));
  await expect(
    form.getByText(
      "In diesem Zeitraum gibt es keine weiteren Einträge zum Hochladen.",
    ),
  ).toBeVisible();

  /** Only the types that are on */
  await countOlderEntries(form, daysAgo(42), daysAgo(38));
  await expect(form.getByText("Anzahl: 1", { exact: true })).toBeVisible();
  expect(await uploadedLines(prisma, owner)).toEqual([]);

  await uploadButton.click();
  await expect(uploadButton).toHaveCount(0);
  await expectUploadedLines(prisma, owner, [oldLine]);

  /** The entry is history (decision 31) */
  const viewerPage = await openSignedInBrowser(viewer.user);
  await viewerPage.goto(LOG_ANALYZER_PAGE_PATH);
  await applyDateRange(viewerPage, daysAgo(42), daysAgo(38));
  await expect(rowOf(viewerPage, "Alter Bauplan")).toBeVisible();
  await expect(tableRows(viewerPage)).toHaveCount(2);
});
