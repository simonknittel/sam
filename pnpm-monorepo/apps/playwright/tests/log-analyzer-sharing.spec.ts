import type { Page } from "@playwright/test";
import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import {
  createCitizen,
  createLogAnalyzerEntry,
  createUserWithoutCitizen,
} from "../fixtures/factories";
import { toggleLabel } from "../fixtures/interactions";
import {
  LIVE_MODE_PARSE_INTERVAL,
  LOG_ANALYZER_PAGE_PATH,
  LOG_ANALYZER_PERMISSIONS,
  SettingsColumn,
  appendLogLines,
  applyDateRange,
  closeSettings,
  dateRangeButton,
  dateRangeDialog,
  daysAgo,
  hoursAgo,
  joinPuLine,
  openDateRange,
  openSettings,
  resetDateRange,
  rowOf,
  selectFolder,
  settingCheckbox,
  settingToggle,
  settingsDialog,
  stubDirectoryPicker,
  tableRows,
  type BackupFile,
} from "../fixtures/log-analyzer";
import { expect, test } from "../fixtures/test";

/**
 * The upload action runs the pattern of the given type against the line again,
 * thus the lines are real log lines.
 *
 * The time inside the line decides the order of the table, and whether the
 * entry is inside the window of the shared entries query (14 days). The lines
 * therefore carry a time relative to the moment of the test.
 */
const ownDeathLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <[ActorState] Dead> [ACTOR STATE][CSCActorControlStateDead::PrePhysicsUpdate] Actor 'Testpilot' [123] ejected from zone 'RSI_Zeus_CL_1' [456] to zone 'pyro4' [789] due to previous zone being in a destroyed vehicle with detached interior. [Team_ActorFeatures][Actor]`;
const blueprintLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <SHUDEvent_OnNotification> Added notification "Received Blueprint: Morozov-SH Helmet Thule: " [25] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]`;
const disconnectionLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <Channel Disconnected> cause=30016 reason="Remote Disconnect - Player requested disconnect" frame=220001 isRemote=1 map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=1.2.3.4:64090 localAddr=0.0.0.0:64090 connection={4, 0} session=abc node_id=bc4da5d3-3f05-e19e-4aa0-702432234095 nickname="Testpilot" playerGEID=200123456789 uptime_secs=3636.990234 [Team_Network][Network][Gateway][Disconnection]`;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** A log file which the game renamed at the start of the next session */
const createBackupFile = (at: Date, line: string): BackupFile => {
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${pad(at.getDate())} ${MONTHS[at.getMonth()]} ${pad(at.getFullYear() % 100)}`;
  const time = `${pad(at.getHours())} ${pad(at.getMinutes())} ${pad(at.getSeconds())}`;

  return {
    name: `Game Build(12913470) ${date} (${time}).log`,
    lines: [line],
    lastModified: at.getTime(),
  };
};

const HEADER_ROWS = 1;

/** `isFullRead`: the worker reads the whole window again. */
const recordFullReads = (page: Page) =>
  page.addInitScript(() => {
    const fullReads: boolean[] = [];
    const originalPostMessage = Worker.prototype.postMessage;

    Worker.prototype.postMessage = function (
      this: Worker,
      ...parameters: Parameters<Worker["postMessage"]>
    ) {
      const [message] = parameters;
      if (typeof message === "object" && message && "isFullRead" in message)
        fullReads.push(Boolean(message.isFullRead));

      originalPostMessage.apply(this, parameters);
    } as Worker["postMessage"];

    Object.assign(window, { fullReads });
  });

const fullReads = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { fullReads: boolean[] }).fullReads,
  );

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

const SHARED_TYPE_TITLES = [
  "Shard-Beitritt",
  "Gestorben",
  "Blueprint erhalten",
];

const refresh = (page: Page) =>
  page.getByRole("button", { name: "Aktualisieren" }).click();

/**
 * The upload is the only action that this page sends by itself, thus such a
 * request stands for a share.
 *
 * The listener records instead of racing a timeout, so the assertion holds no
 * matter how long the steps in between take.
 */
const recordUploads = (page: Page) => {
  const uploads: string[] = [];

  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes(LOG_ANALYZER_PAGE_PATH)
    )
      uploads.push(request.url());
  });

  return uploads;
};

test("shared entries mix into the table with a citizen column and a citizen filter", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "log-betrachter",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  const firstUploader = await createCitizen(prisma, { handle: "log-teiler-1" });
  const secondUploader = await createCitizen(prisma, {
    handle: "log-teiler-2",
  });

  const joinPuAt = hoursAgo(3);
  const ownDeathAt = hoursAgo(2);
  const blueprintAt = hoursAgo(1);

  await createLogAnalyzerEntry(prisma, {
    type: LogAnalyzerEntryType.JoinPu,
    rawLine: joinPuLine(joinPuAt),
    eventAt: joinPuAt,
    createdById: firstUploader.entity.id,
  });
  await createLogAnalyzerEntry(prisma, {
    type: LogAnalyzerEntryType.OwnDeath,
    rawLine: ownDeathLine(ownDeathAt),
    eventAt: ownDeathAt,
    createdById: firstUploader.entity.id,
  });
  await createLogAnalyzerEntry(prisma, {
    type: LogAnalyzerEntryType.BlueprintReceivedNotification,
    rawLine: blueprintLine(blueprintAt),
    eventAt: blueprintAt,
    createdById: secondUploader.entity.id,
  });

  await signIn(viewer.user);
  await page.goto(LOG_ANALYZER_PAGE_PATH);

  await expect(page.getByRole("heading", { name: "Anleitung" })).toBeVisible();
  await expect(tableRows(page)).toHaveCount(0);

  await openSettings(page);
  for (const typeTitle of SHARED_TYPE_TITLES)
    await settingToggle(page, typeTitle, SettingsColumn.ShowOthers).click();
  await closeSettings(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 3);

  await expect(
    rowOf(page, "Blueprint erhalten").getByRole("link", {
      name: "log-teiler-2",
    }),
  ).toBeVisible();
  await expect(
    rowOf(page, "Shard-Beitritt").getByRole("link", { name: "log-teiler-1" }),
  ).toBeVisible();

  await expect(tableRows(page).nth(1)).toContainText("Blueprint erhalten");
  await expect(tableRows(page).nth(3)).toContainText("Shard-Beitritt");

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

  await expect(tableRows(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Anleitung" })).toBeVisible();
});

test("sharing uploads the matched entries of the selected types exactly once", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "log-teilender",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });

  await signIn(citizen.user);
  await stubDirectoryPicker(page, [
    joinPuLine(hoursAgo(3)),
    blueprintLine(hoursAgo(2)),
    disconnectionLine(hoursAgo(1)),
  ]);
  await page.goto(LOG_ANALYZER_PAGE_PATH);

  await openSettings(page);
  await settingToggle(page, "Blueprint erhalten", SettingsColumn.Share).click();
  await settingToggle(
    page,
    "Verbindung getrennt",
    SettingsColumn.Share,
  ).click();
  await closeSettings(page);

  await selectFolder(page);

  const sharedTypes = () =>
    prisma.logAnalyzerEntry
      .findMany({
        where: { createdById: citizen.entity.id },
        orderBy: { eventAt: "asc" },
        select: { type: true },
      })
      .then((entries) => entries.map((entry) => entry.type));

  await expect
    .poll(sharedTypes)
    .toEqual([
      LogAnalyzerEntryType.BlueprintReceivedNotification,
      LogAnalyzerEntryType.Disconnection,
    ]);
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 3);

  /** The line numbers order the lines of one instant for the other viewers */
  expect(
    await prisma.logAnalyzerEntry.findMany({
      where: { createdById: citizen.entity.id },
      orderBy: { eventAt: "asc" },
      select: { lineNumber: true },
    }),
  ).toEqual([{ lineNumber: 2 }, { lineNumber: 3 }]);

  const secondCycleUploads = recordUploads(page);

  await refresh(page);
  await expect
    .poll(sharedTypes)
    .toEqual([
      LogAnalyzerEntryType.BlueprintReceivedNotification,
      LogAnalyzerEntryType.Disconnection,
    ]);
  expect(secondCycleUploads).toEqual([]);

  await openSettings(page);
  await settingToggle(page, "Shard-Beitritt", SettingsColumn.Share).click();
  await closeSettings(page);

  await refresh(page);

  const allThreeTypes = [
    LogAnalyzerEntryType.JoinPu,
    LogAnalyzerEntryType.BlueprintReceivedNotification,
    LogAnalyzerEntryType.Disconnection,
  ];
  await expect.poll(sharedTypes).toEqual(allThreeTypes);

  /**
   * A reload empties the set of sent entries, but the upload asks the server
   * for the hashes it already holds. None of the window goes out a second
   * time, and every row carries its badge again.
   */
  await page.reload();
  const reloadUploads = recordUploads(page);
  await selectFolder(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 3);
  await expect(
    rowOf(page, "Shard-Beitritt").getByText("Hochgeladen"),
  ).toBeVisible();
  await expect.poll(sharedTypes).toEqual(allThreeTypes);
  expect(reloadUploads).toEqual([]);
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
  await expect(page.getByText("1 von 3 Sessions")).toBeVisible();

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

  await settingToggle(page, "Bereich Party", SettingsColumn.ShowOthers).click();

  await expect(section).toBeChecked();
  await expect(firstType).toBeChecked();
  await expect(secondType).toBeChecked();
  await expect(otherSectionType).not.toBeChecked();

  await settingToggle(
    page,
    "Party-Einladung",
    SettingsColumn.ShowOthers,
  ).click();

  await expect(section).not.toBeChecked();
  await expect(section).toHaveJSProperty("indeterminate", true);

  await settingToggle(page, "Bereich Party", SettingsColumn.ShowOthers).click();

  await expect(firstType).toBeChecked();
  await expect(section).toHaveJSProperty("indeterminate", false);

  await settingToggle(page, "Bereich Party", SettingsColumn.ShowOthers).click();

  await expect(firstType).not.toBeChecked();
  await expect(secondType).not.toBeChecked();
  await expect(section).not.toBeChecked();
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

  await page.reload();
  await selectFolder(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 2);
  await expect(quickLookBar).toHaveCount(0);
});

test("a date range older than the rolling window shares only on request", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "log-alt",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  const recentLine = joinPuLine(hoursAgo(1));
  const oldEventAt = daysAgo(40);
  const oldLine = joinPuLine(oldEventAt);

  await signIn(citizen.user);
  await stubDirectoryPicker(
    page,
    [recentLine],
    [
      createBackupFile(oldEventAt, oldLine),
      /** The oldest log sets the earliest date of the range */
      createBackupFile(daysAgo(60), blueprintLine(daysAgo(60))),
    ],
  );
  await page.goto(LOG_ANALYZER_PAGE_PATH);

  await openSettings(page);
  await settingToggle(page, "Shard-Beitritt", SettingsColumn.Share).click();
  await closeSettings(page);

  await selectFolder(page);

  const sharedLines = () =>
    prisma.logAnalyzerEntry
      .findMany({
        where: { createdById: citizen.entity.id },
        orderBy: { eventAt: "asc" },
        select: { rawLine: true },
      })
      .then((entries) => entries.map((entry) => entry.rawLine));

  await expect.poll(sharedLines).toEqual([recentLine]);

  const uploads = recordUploads(page);
  await applyDateRange(page, daysAgo(42), daysAgo(38));

  /** The entry of the shared type is on the screen, thus the read found it */
  await expect(
    page.locator(`time[datetime="${oldEventAt.toISOString()}"]`),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aktualisieren" }),
  ).toBeEnabled();

  const shareButton = page.getByRole("button", {
    name: "1 älteren Eintrag teilen",
  });
  await expect(shareButton).toBeVisible();

  expect(uploads).toEqual([]);
  expect(await sharedLines()).toEqual([recentLine]);

  await shareButton.click();
  const confirmation = page.getByRole("alertdialog", {
    name: "Ältere Einträge teilen?",
  });
  await expect(confirmation).toContainText("Shard-Beitritt");
  await confirmation.getByRole("button", { name: "Teilen" }).click();

  await expect.poll(sharedLines).toEqual([oldLine, recentLine]);
  await expect(shareButton).toHaveCount(0);
  await expect(
    rowOf(page, "Shard-Beitritt").getByText("Hochgeladen"),
  ).toBeVisible();

  await page.reload();
  await selectFolder(page);
  await applyDateRange(page, daysAgo(42), daysAgo(38));

  await expect(
    rowOf(page, "Shard-Beitritt").getByText("Hochgeladen"),
  ).toBeVisible();
  await expect(shareButton).toHaveCount(0);
});

test("a date range reaches shared entries older than the rolling window", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "log-archiv",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  const uploader = await createCitizen(prisma, { handle: "log-alt-teiler" });
  const eventAt = daysAgo(40);

  await createLogAnalyzerEntry(prisma, {
    type: LogAnalyzerEntryType.JoinPu,
    rawLine: joinPuLine(eventAt),
    eventAt,
    createdById: uploader.entity.id,
  });

  await signIn(viewer.user);
  await page.goto(LOG_ANALYZER_PAGE_PATH);

  await openSettings(page);
  await settingToggle(
    page,
    "Shard-Beitritt",
    SettingsColumn.ShowOthers,
  ).click();
  await closeSettings(page);

  await expect(tableRows(page)).toHaveCount(0);

  await applyDateRange(page, daysAgo(42), daysAgo(38));

  await expect(rowOf(page, "Shard-Beitritt")).toBeVisible();
  await expect(
    rowOf(page, "Shard-Beitritt").getByRole("link", { name: "log-alt-teiler" }),
  ).toBeVisible();
});

test("live mode reads the lines which the game adds to the log", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "log-live",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });

  await signIn(citizen.user);
  await page.clock.install();
  await stubDirectoryPicker(page, [joinPuLine(hoursAgo(2))]);
  await recordFullReads(page);
  await page.goto(LOG_ANALYZER_PAGE_PATH);

  await selectFolder(page);
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 1);
  /** A retried click of the folder button reads the folder once more */
  const readsOfTheFolder = await fullReads(page);
  expect(readsOfTheFolder).not.toHaveLength(0);
  expect(readsOfTheFolder).not.toContain(false);

  await toggleLabel(page, "Automatisch aktualisieren").click();
  await expect(
    page.getByRole("checkbox", { name: /Automatisch aktualisieren/ }),
  ).toBeChecked();

  await appendLogLines(page, [blueprintLine(hoursAgo(1))]);
  await page.clock.fastForward(LIVE_MODE_PARSE_INTERVAL);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 2);
  await expect(rowOf(page, "Blueprint erhalten")).toBeVisible();

  /**
   * The cycle of live mode reads only the added lines. The renders since
   * the first read must not ask for the whole window again.
   */
  const readsOfLiveMode = (await fullReads(page)).slice(
    readsOfTheFolder.length,
  );
  expect(readsOfLiveMode).not.toHaveLength(0);
  expect(readsOfLiveMode).not.toContain(true);
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
  await stubDirectoryPicker(page, [joinPuLine(hoursAgo(2))]);
  await stubPictureInPicture(page);
  await page.goto(LOG_ANALYZER_PAGE_PATH);

  await selectFolder(page);
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 1);

  await page.getByRole("button", { name: "Overlay", exact: true }).click();
  await expect
    .poll(async () => (await readOverlayWindow(page)).text)
    .toContain("Neue Logs aus der aktuellen Session");

  await appendLogLines(page, [blueprintLine(hoursAgo(1))]);
  await refresh(page);
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

  await appendLogLines(page, [disconnectionLine(hoursAgo(1))]);
  await refresh(page);
  await expect
    .poll(async () => (await readOverlayWindow(page)).text)
    .toContain("Verbindung getrennt");
  expect((await readOverlayWindow(page)).closeCount).toBe(0);
});

test("a user without a linked citizen cannot share", async ({
  page,
  prisma,
  signIn,
  enableAdminMode,
}) => {
  const user = await createUserWithoutCitizen(prisma, {
    name: "ohne-citizen",
    admin: true,
  });
  await signIn(user);
  await enableAdminMode();

  /**
   * The setting lives in the browser, thus it can be turned on by hand. The
   * client must refuse the upload all the same.
   */
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "log_analyzer_share_types",
      JSON.stringify({ joinPu: true, blueprintReceivedNotification: true }),
    );
  });
  await stubDirectoryPicker(page, [
    joinPuLine(hoursAgo(2)),
    blueprintLine(hoursAgo(1)),
  ]);
  await page.goto(LOG_ANALYZER_PAGE_PATH);

  await openSettings(page);
  await expect(
    settingCheckbox(page, "Shard-Beitritt", SettingsColumn.Share),
  ).toBeDisabled();
  await expect(
    settingsDialog(page).getByText(
      "Zum Teilen muss dein Account mit einem Spynet-Citizen verknüpft sein.",
    ),
  ).toBeVisible();
  await closeSettings(page);

  await selectFolder(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 2);
  await expect(rowOf(page, "Shard-Beitritt")).toContainText("-");
  expect(await prisma.logAnalyzerEntry.count()).toBe(0);
});
