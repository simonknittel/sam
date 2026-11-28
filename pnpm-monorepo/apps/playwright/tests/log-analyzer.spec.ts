import type { Page } from "@playwright/test";
import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import {
  createCitizen,
  createLogAnalyzerEntry,
  createShareGrant,
} from "../fixtures/factories";
import { toggleLabel } from "../fixtures/interactions";
import {
  appendLogLines,
  applyDateRange,
  blueprintLine,
  closeSettings,
  createBackupFile,
  dateRangeButton,
  dateRangeDialog,
  daysAgo,
  hoursAgo,
  joinPuLine,
  LOG_ANALYZER_PAGE_PATH,
  LOG_ANALYZER_PERMISSIONS,
  openDateRange,
  openSettings,
  resetDateRange,
  rowOf,
  selectFolder,
  settingCheckbox,
  SettingsColumn,
  settingsDialog,
  settingToggle,
  stubDirectoryPicker,
  tableRows,
} from "../fixtures/log-analyzer";
import { LOG_FOLDER_READ_INTERVAL } from "../fixtures/remote-control-program";
import { expect, test } from "../fixtures/test";

/**
 * The view of the Log Analyzer: the table, the filters, the date range, the
 * quick look and the overlay. The browser runtime reads the own log folder
 * (see `stubDirectoryPicker()`), and the entries of other citizens come
 * through their grants. The upload and the grants themselves are in
 * remote-control-program-sharing.spec.ts.
 *
 * The time of the event lives inside the line and decides the order of the
 * table and whether the entry is inside the window. The lines therefore
 * carry a time relative to the moment of the test.
 */
const ownDeathLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <[ActorState] Dead> [ACTOR STATE][CSCActorControlStateDead::PrePhysicsUpdate] Actor 'Testpilot' [123] ejected from zone 'RSI_Zeus_CL_1' [456] to zone 'pyro4' [789] due to previous zone being in a destroyed vehicle with detached interior. [Team_ActorFeatures][Actor]`;
const disconnectionLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <Channel Disconnected> cause=30016 reason="Remote Disconnect - Player requested disconnect" frame=220001 isRemote=1 map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=1.2.3.4:64090 localAddr=0.0.0.0:64090 connection={4, 0} session=abc node_id=bc4da5d3-3f05-e19e-4aa0-702432234095 nickname="Testpilot" playerGEID=200123456789 uptime_secs=3636.990234 [Team_Network][Network][Gateway][Disconnection]`;

const HEADER_ROWS = 1;

/** No test can open the picture-in-picture window of the browser. */
const stubPictureInPicture = (page: Page) =>
  page.addInitScript(() => {
    const overlayWindow = {
      document: document.implementation.createHTMLDocument("Overlay"),
      closeCount: 0,
      addEventListener: () => {},
      close() {
        overlayWindow.closeCount += 1;
      },
    };

    Object.defineProperty(window, "documentPictureInPicture", {
      configurable: true,
      value: { requestWindow: () => Promise.resolve(overlayWindow) },
    });
    Object.assign(window, { overlayWindow });
  });

const readOverlayWindow = (page: Page) =>
  page.evaluate(() => {
    const { document: overlayDocument, closeCount } = (
      window as unknown as {
        overlayWindow: { document: Document; closeCount: number };
      }
    ).overlayWindow;
    return { text: overlayDocument.body.textContent, closeCount };
  });

test("the entries of the citizens who share with the viewer mix into the table with a citizen column, their game version and a citizen filter", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "log-betrachter",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  const firstOwner = await createCitizen(prisma, { handle: "log-teiler-1" });
  const secondOwner = await createCitizen(prisma, { handle: "log-teiler-2" });
  const ownerWithoutGrant = await createCitizen(prisma, {
    handle: "log-fremder",
  });

  for (const owner of [firstOwner, secondOwner])
    await createShareGrant(prisma, {
      ownerId: owner.entity.id,
      granteeCitizenId: viewer.entity.id,
      startsAt: daysAgo(1),
    });

  const joinPuAt = hoursAgo(3);
  const ownDeathAt = hoursAgo(2);
  const blueprintAt = hoursAgo(1);

  await createLogAnalyzerEntry(prisma, {
    type: LogAnalyzerEntryType.JoinPu,
    rawLine: joinPuLine(joinPuAt),
    eventAt: joinPuAt,
    createdById: firstOwner.entity.id,
  });
  await createLogAnalyzerEntry(prisma, {
    type: LogAnalyzerEntryType.OwnDeath,
    rawLine: ownDeathLine(ownDeathAt),
    eventAt: ownDeathAt,
    createdById: firstOwner.entity.id,
  });
  await createLogAnalyzerEntry(prisma, {
    type: LogAnalyzerEntryType.BlueprintReceivedNotification,
    rawLine: blueprintLine(blueprintAt),
    eventAt: blueprintAt,
    createdById: secondOwner.entity.id,
    gameChannel: "PTU",
    gameVersion: "4.10.202.48190",
  });
  /** A citizen without a grant for the viewer */
  await createLogAnalyzerEntry(prisma, {
    type: LogAnalyzerEntryType.Disconnection,
    rawLine: disconnectionLine(blueprintAt),
    eventAt: blueprintAt,
    createdById: ownerWithoutGrant.entity.id,
  });

  await signIn(viewer.user);
  await page.goto(LOG_ANALYZER_PAGE_PATH);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 3);

  await expect(
    rowOf(page, "Blueprint erhalten").getByRole("link", {
      name: "log-teiler-2",
    }),
  ).toBeVisible();
  await expect(
    rowOf(page, "Shard-Beitritt").getByRole("link", { name: "log-teiler-1" }),
  ).toBeVisible();
  await expect(rowOf(page, "log-fremder")).toHaveCount(0);

  await expect(tableRows(page).nth(1)).toContainText("Blueprint erhalten");
  await expect(tableRows(page).nth(3)).toContainText("Shard-Beitritt");

  // The game version of the header of the log file, empty for an entry without it
  await expect(
    rowOf(page, "Blueprint erhalten").getByTitle("PTU 4.10.202.48190", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    rowOf(page, "Shard-Beitritt").getByRole("cell").last(),
  ).toHaveText("");

  await openSettings(page);
  await toggleLabel(settingsDialog(page), "log-teiler-2").click();
  await closeSettings(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 2);
  await expect(rowOf(page, "Blueprint erhalten")).toHaveCount(0);

  await openSettings(page);
  await settingsDialog(page)
    .getByRole("button", { name: "Alle anzeigen" })
    .click();
  await closeSettings(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 3);

  /** Every type of the others starts shown; an unchecked box hides it */
  await openSettings(page);
  await settingToggle(page, "Gestorben", SettingsColumn.ShowOthers).click();
  await closeSettings(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 2);
  await expect(rowOf(page, "Gestorben")).toHaveCount(0);

  await openSettings(page);
  await settingToggle(
    page,
    "Shard-Beitritt",
    SettingsColumn.ShowOthers,
  ).click();
  await settingToggle(
    page,
    "Blueprint erhalten",
    SettingsColumn.ShowOthers,
  ).click();
  await closeSettings(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS);
  await expect(
    page.getByText("Keine Einträge für diesen Zeitraum und diese Filter."),
  ).toBeVisible();
});

test("a date range shows the entries of its files and a reset the rolling window", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "log-zeitraum",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });

  await signIn(citizen.user);
  await stubDirectoryPicker(
    page,
    [disconnectionLine(hoursAgo(1))],
    [
      createBackupFile(daysAgo(40), joinPuLine(daysAgo(40))),
      createBackupFile(daysAgo(60), blueprintLine(daysAgo(60))),
    ],
  );
  await page.goto(LOG_ANALYZER_PAGE_PATH);

  await selectFolder(page);
  await expect(rowOf(page, "Verbindung getrennt")).toBeVisible();
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 1);

  await applyDateRange(page, daysAgo(42), daysAgo(38));

  await expect(rowOf(page, "Shard-Beitritt")).toBeVisible();
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 1);

  await resetDateRange(page);

  await expect(rowOf(page, "Verbindung getrennt")).toBeVisible();
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 1);
  await expect(dateRangeButton(page)).toHaveAccessibleName("Zeitraum");
});

test("a preset of the date range applies with one click", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "log-vorauswahl",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });

  await signIn(citizen.user);
  await stubDirectoryPicker(
    page,
    [disconnectionLine(hoursAgo(1))],
    [
      createBackupFile(daysAgo(20), joinPuLine(daysAgo(20))),
      createBackupFile(daysAgo(60), blueprintLine(daysAgo(60))),
    ],
  );
  await page.goto(LOG_ANALYZER_PAGE_PATH);

  await selectFolder(page);
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 1);

  await openDateRange(page);
  await dateRangeDialog(page)
    .getByRole("button", { name: "Letzte 30 Tage" })
    .click();

  await expect(dateRangeDialog(page)).toHaveCount(0);
  await expect(rowOf(page, "Shard-Beitritt")).toBeVisible();
  await expect(rowOf(page, "Verbindung getrennt")).toBeVisible();
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 2);
  await expect(dateRangeButton(page)).toHaveAccessibleName(/^Zeitraum: \d/);
});

test("a section sets all types of a column at once", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "log-bereich",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });

  await signIn(citizen.user);
  await page.goto(LOG_ANALYZER_PAGE_PATH);
  await openSettings(page);

  const section = settingCheckbox(
    page,
    "Bereich Party",
    SettingsColumn.ShowOthers,
  );
  const firstType = settingCheckbox(
    page,
    "Party-Einladung",
    SettingsColumn.ShowOthers,
  );
  const secondType = settingCheckbox(
    page,
    "Party-Leader",
    SettingsColumn.ShowOthers,
  );
  const otherSectionType = settingCheckbox(
    page,
    "Gestorben",
    SettingsColumn.ShowOthers,
  );

  /** All types start shown */
  await expect(section).toBeChecked();

  await settingToggle(page, "Bereich Party", SettingsColumn.ShowOthers).click();

  await expect(section).not.toBeChecked();
  await expect(firstType).not.toBeChecked();
  await expect(secondType).not.toBeChecked();
  await expect(otherSectionType).toBeChecked();

  /** One type more: the section shows that only a part is on */
  await settingToggle(
    page,
    "Party-Einladung",
    SettingsColumn.ShowOthers,
  ).click();

  await expect(section).not.toBeChecked();
  await expect(section).toHaveJSProperty("indeterminate", true);

  await settingToggle(page, "Bereich Party", SettingsColumn.ShowOthers).click();

  await expect(firstType).toBeChecked();
  await expect(secondType).toBeChecked();
  await expect(section).toBeChecked();
  await expect(section).toHaveJSProperty("indeterminate", false);
});

test("a quick look shows only its types until it ends, also hidden types", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "log-schnellansicht",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });

  await signIn(citizen.user);
  await stubDirectoryPicker(page, [
    joinPuLine(hoursAgo(3)),
    blueprintLine(hoursAgo(2)),
    disconnectionLine(hoursAgo(1)),
  ]);
  await page.goto(LOG_ANALYZER_PAGE_PATH);
  await selectFolder(page);
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 3);

  const quickLookToggle = (typeTitle: string) =>
    settingsDialog(page).getByRole("button", {
      name: `Schnellansicht: ${typeTitle}`,
      exact: true,
    });
  const quickLookBar = page.getByRole("region", { name: "Schnellansicht" });

  await openSettings(page);
  await settingToggle(
    page,
    "Blueprint erhalten",
    SettingsColumn.ShowOwn,
  ).click();

  await quickLookToggle("Blueprint erhalten").click();
  await quickLookToggle("Shard-Beitritt").click();
  await expect(quickLookToggle("Blueprint erhalten")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await closeSettings(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 2);
  await expect(rowOf(page, "Blueprint erhalten")).toBeVisible();
  await expect(rowOf(page, "Shard-Beitritt")).toBeVisible();

  await quickLookBar
    .getByRole("button", { name: "Blueprint erhalten" })
    .click();

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 1);
  await expect(rowOf(page, "Shard-Beitritt")).toBeVisible();

  await quickLookBar.getByRole("button", { name: "Beenden" }).click();

  await expect(quickLookBar).toHaveCount(0);
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 2);
  await expect(rowOf(page, "Blueprint erhalten")).toHaveCount(0);

  await rowOf(page, "Shard-Beitritt")
    .getByRole("button", { name: "Schnellansicht: Shard-Beitritt" })
    .click();
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 1);

  /** The runtime continues after the reload, thus the folder needs no new selection */
  await page.reload();

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 2);
  await expect(quickLookBar).toHaveCount(0);
});

test("the overlay stays open while the page renders again", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "log-overlay",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });

  await signIn(citizen.user);
  /** The test moves the time of the page forward instead of waiting */
  await page.clock.install();
  await stubDirectoryPicker(page, [joinPuLine(hoursAgo(2))]);
  await stubPictureInPicture(page);
  await page.goto(LOG_ANALYZER_PAGE_PATH);

  await selectFolder(page);
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 1);

  await page.getByRole("button", { name: "Overlay", exact: true }).click();
  await expect
    .poll(async () => (await readOverlayWindow(page)).text)
    .toContain("Neue Einträge seit dem Öffnen des Log Analyzers");

  /** The overlay shows the new entries of the next read of the folder */
  await appendLogLines(page, [blueprintLine(new Date())]);
  await page.clock.fastForward(LOG_FOLDER_READ_INTERVAL);
  await expect
    .poll(async () => (await readOverlayWindow(page)).text)
    .toContain("Blueprint erhalten");

  /**
   * No control of the page loads it again from the server. `refresh()` of the
   * Next.js router does that like a server action, and it writes a new history
   * state when it renders the answer.
   */
  await page.evaluate(() => {
    Object.assign(window, { historyStateBeforeRefresh: window.history.state });
    (
      window as unknown as { next: { router: { refresh: () => void } } }
    ).next.router.refresh();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.history.state !==
          (window as unknown as { historyStateBeforeRefresh: unknown })
            .historyStateBeforeRefresh,
      ),
    )
    .toBe(true);

  await appendLogLines(page, [disconnectionLine(new Date())]);
  await page.clock.fastForward(LOG_FOLDER_READ_INTERVAL);
  await expect
    .poll(async () => (await readOverlayWindow(page)).text)
    .toContain("Verbindung getrennt");
  expect((await readOverlayWindow(page)).closeCount).toBe(0);
});
