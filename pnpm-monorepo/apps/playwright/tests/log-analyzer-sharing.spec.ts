import type { Locator, Page } from "@playwright/test";
import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import {
  createCitizen,
  createLogAnalyzerEntry,
  createUserWithoutCitizen,
} from "../fixtures/factories";
import { clickUntilVisible, toggleLabel } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const LOG_ANALYZER_PERMISSIONS = ["logAnalyzer;read"];

const PAGE_PATH = "/app/tools/log-analyzer";

/**
 * Real log lines, one for each pattern this spec needs. The upload action
 * runs the pattern of the given type against the line again, thus a line
 * which is not exactly of its type is refused.
 *
 * The time of the event lives inside the line and decides two things: the
 * order of the table, and whether the entry is inside the window of the
 * shared entries query (14 days). The lines therefore carry a time relative
 * to the moment of the test.
 */
const joinPuLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]`;
const ownDeathLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <[ActorState] Dead> [ACTOR STATE][CSCActorControlStateDead::PrePhysicsUpdate] Actor 'Testpilot' [123] ejected from zone 'RSI_Zeus_CL_1' [456] to zone 'pyro4' [789] due to previous zone being in a destroyed vehicle with detached interior. [Team_ActorFeatures][Actor]`;
const blueprintLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <SHUDEvent_OnNotification> Added notification "Received Blueprint: Morozov-SH Helmet Thule: " [25] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]`;
const disconnectionLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <Channel Disconnected> cause=30016 reason="Remote Disconnect - Player requested disconnect" frame=220001 isRemote=1 map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=1.2.3.4:64090 localAddr=0.0.0.0:64090 connection={4, 0} session=abc node_id=bc4da5d3-3f05-e19e-4aa0-702432234095 nickname="Testpilot" playerGEID=200123456789 uptime_secs=3636.990234 [Team_Network][Network][Gateway][Disconnection]`;

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000);

const HOURS_PER_DAY = 24;

const daysAgo = (days: number) => hoursAgo(days * HOURS_PER_DAY);

/** The value of a date input */
const toDateValue = (date: Date) => date.toISOString().slice(0, 10);

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

interface BackupFile {
  readonly name: string;
  readonly lines: readonly string[];
  readonly lastModified: number;
}

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

/** Rows the table renders on top of its header row */
const HEADER_ROWS = 1;

/**
 * Replaces the folder picker of the browser, which no test can answer. The
 * handle gives back one log file with the given lines, so a parse finds one
 * entry for each of them. `appendLogLines` adds lines to the file, as the
 * game does while it runs.
 *
 * The app also stores the handle in IndexedDB, which fails for this object
 * because it carries functions. That happens after the parse started and the
 * app catches it, thus it only leaves a message in the console.
 */
const stubDirectoryPicker = (
  page: Page,
  lines: readonly string[],
  backupFiles: readonly BackupFile[] = [],
) =>
  page.addInitScript(
    ({
      fileLines,
      backups,
    }: {
      fileLines: string[];
      backups: BackupFile[];
    }) => {
      const createFile = () =>
        new File([fileLines.join("\n")], "Game.log", {
          type: "text/plain",
          lastModified: Date.now(),
        });
      let file = createFile();

      const fileHandle = {
        kind: "file",
        name: "Game.log",
        getFile: () => Promise.resolve(file),
      };

      const directoryHandle = {
        kind: "directory",
        name: "StarCitizen",
        requestPermission: () => Promise.resolve("granted"),
        values: async function* () {
          yield fileHandle;

          for (const { name, lines: backupLines, lastModified } of backups) {
            yield {
              kind: "file",
              name,
              getFile: () =>
                Promise.resolve(
                  new File([backupLines.join("\n")], name, {
                    type: "text/plain",
                    lastModified,
                  }),
                ),
            };
          }
        },
      };

      Object.assign(window, {
        showDirectoryPicker: () => Promise.resolve(directoryHandle),
        appendLogLines: (newLines: string[]) => {
          fileLines.push(...newLines);
          file = createFile();
        },
      });
    },
    { fileLines: [...lines], backups: [...backupFiles] },
  );

const appendLogLines = (page: Page, lines: readonly string[]) =>
  page.evaluate(
    (newLines) =>
      (
        window as unknown as { appendLogLines: (lines: string[]) => void }
      ).appendLogLines(newLines),
    [...lines],
  );

/**
 * Records for each request to the log parser worker whether it reads the
 * whole window again (`isFullRead`).
 */
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

/**
 * Replaces the picture-in-picture window of the browser, which no test can
 * open. The overlay renders into a document of its own, and the stub counts
 * how often the app closes the window.
 */
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

const settingsDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Filter & Teilen", exact: true });

const openSettings = (page: Page) =>
  clickUntilVisible(
    page.getByRole("button", { name: "Filter & Teilen", exact: true }),
    settingsDialog(page),
  );

const closeSettings = async (page: Page) => {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
};

/** The columns of the settings table, as the checkboxes name them */
enum SettingsColumn {
  ShowOwn = "Eigene anzeigen",
  Share = "Teilen",
  ShowOthers = "Andere anzeigen",
}

const settingCheckbox = (
  page: Page,
  typeTitle: string,
  column: SettingsColumn,
) =>
  settingsDialog(page).getByRole("checkbox", {
    name: `${typeTitle}: ${column}`,
    exact: true,
  });

/**
 * The label around the checkbox, because the checkbox itself is `sr-only`.
 * The inner locator is queried inside each label, thus it must not carry the
 * dialog in its chain.
 */
const settingToggle = (page: Page, typeTitle: string, column: SettingsColumn) =>
  toggleLabel(
    settingsDialog(page),
    page.getByRole("checkbox", {
      name: `${typeTitle}: ${column}`,
      exact: true,
    }),
  );

const SHARED_TYPE_TITLES = [
  "Shard-Beitritt",
  "Gestorben",
  "Blueprint erhalten",
];

const tableRows = (page: Page) => page.getByRole("row");

const rowOf = (page: Page, text: string): Locator =>
  tableRows(page).filter({ hasText: text });

/**
 * A click which lands before React hydrates is swallowed, so it is retried
 * until the table shows the parsed entries. A repeated parse is harmless: it
 * finds the same entries and shares none of them a second time.
 */
const selectFolder = (page: Page) =>
  clickUntilVisible(
    page.getByRole("button", { name: "Ordner auswählen" }),
    tableRows(page).first(),
  );

const refresh = (page: Page) =>
  page.getByRole("button", { name: "Aktualisieren" }).click();

const dateRangeDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Zeitraum", exact: true });

/** The button names the active range after the word `Zeitraum` */
const dateRangeButton = (page: Page) =>
  page.getByRole("button", { name: /^Zeitraum/ });

const openDateRange = (page: Page) =>
  clickUntilVisible(dateRangeButton(page), dateRangeDialog(page));

const applyDateRange = async (page: Page, from: Date, to: Date) => {
  await openDateRange(page);

  const dialog = dateRangeDialog(page);
  await dialog.getByLabel("Von").fill(toDateValue(from));
  await dialog.getByLabel("Bis").fill(toDateValue(to));
  await dialog.getByRole("button", { name: "Anwenden" }).click();

  await expect(dialog).toHaveCount(0);
};

const resetDateRange = async (page: Page) => {
  await openDateRange(page);
  await dateRangeDialog(page)
    .getByRole("button", { name: "Zurücksetzen" })
    .click();
};

/**
 * Collects the uploads the page sends from now on. A server action posts to
 * the address of the page it runs on, and the upload is the only action this
 * page sends by itself, thus such a request stands for a share.
 *
 * The listener records instead of racing a timeout, so the assertion holds no
 * matter how long the steps in between take.
 */
const recordUploads = (page: Page) => {
  const uploads: string[] = [];

  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes(PAGE_PATH))
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
  await page.goto(PAGE_PATH);

  /** Without the viewer setting the page stays exactly as it was before */
  await expect(page.getByRole("heading", { name: "Anleitung" })).toBeVisible();
  await expect(tableRows(page)).toHaveCount(0);

  /** Every type of the others starts hidden; a checked box shows it */
  await openSettings(page);
  for (const typeTitle of SHARED_TYPE_TITLES)
    await settingToggle(page, typeTitle, SettingsColumn.ShowOthers).click();
  await closeSettings(page);

  /** No folder was ever chosen: the shared entries stand on their own */
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 3);

  await expect(
    rowOf(page, "Blueprint erhalten").getByRole("link", {
      name: "log-teiler-2",
    }),
  ).toBeVisible();
  await expect(
    rowOf(page, "Shard-Beitritt").getByRole("link", { name: "log-teiler-1" }),
  ).toBeVisible();

  /** Newest first, by the time of the event inside the raw line */
  await expect(tableRows(page).nth(1)).toContainText("Blueprint erhalten");
  await expect(tableRows(page).nth(3)).toContainText("Shard-Beitritt");

  /** Every reporter starts checked; an unchecked box hides its entries */
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

  /** Hiding a type hides its entries, hiding the last type empties the table */
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
  await page.goto(PAGE_PATH);

  /** One type stays out, to prove the selection decides what goes out */
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

  /** A second cycle finds nothing new, thus it sends nothing */
  const secondCycleUploads = recordUploads(page);

  await refresh(page);
  await expect
    .poll(sharedTypes)
    .toEqual([
      LogAnalyzerEntryType.BlueprintReceivedNotification,
      LogAnalyzerEntryType.Disconnection,
    ]);
  expect(secondCycleUploads).toEqual([]);

  /** Turning a type on shares the entries of that type which are parsed */
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

/**
 * Live mode reads the log files again at this interval
 * (LIVE_MODE_PARSE_INTERVAL_MS in the app)
 */
const LIVE_MODE_PARSE_INTERVAL = 10_000;

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
  await page.goto(PAGE_PATH);

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
  await page.goto(PAGE_PATH);

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
  await page.goto(PAGE_PATH);
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

  /** One type less: the section shows that only a part is on */
  await settingToggle(
    page,
    "Party-Einladung",
    SettingsColumn.ShowOthers,
  ).click();

  await expect(section).not.toBeChecked();
  await expect(section).toHaveJSProperty("indeterminate", true);

  /** A click on a section with a part of its types turns all of them on */
  await settingToggle(page, "Bereich Party", SettingsColumn.ShowOthers).click();

  await expect(firstType).toBeChecked();
  await expect(section).toHaveJSProperty("indeterminate", false);

  await settingToggle(page, "Bereich Party", SettingsColumn.ShowOthers).click();

  await expect(firstType).not.toBeChecked();
  await expect(secondType).not.toBeChecked();
  await expect(section).not.toBeChecked();
});

test("a date range older than the rolling window uploads nothing", async ({
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

  await signIn(citizen.user);
  await stubDirectoryPicker(
    page,
    [recentLine],
    [
      createBackupFile(oldEventAt, joinPuLine(oldEventAt)),
      /** The oldest log sets the earliest date of the range */
      createBackupFile(daysAgo(60), blueprintLine(daysAgo(60))),
    ],
  );
  await page.goto(PAGE_PATH);

  await openSettings(page);
  await settingToggle(page, "Shard-Beitritt", SettingsColumn.Share).click();
  await closeSettings(page);

  await selectFolder(page);

  const sharedLines = () =>
    prisma.logAnalyzerEntry
      .findMany({
        where: { createdById: citizen.entity.id },
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

  expect(uploads).toEqual([]);
  expect(await sharedLines()).toEqual([recentLine]);
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
  await page.goto(PAGE_PATH);

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
  /** The test moves the time of the page forward instead of waiting */
  await page.clock.install();
  await stubDirectoryPicker(page, [joinPuLine(hoursAgo(2))]);
  await recordFullReads(page);
  await page.goto(PAGE_PATH);

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

  /** Nothing but the interval of live mode reads the file again */
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
  await page.goto(PAGE_PATH);

  await selectFolder(page);
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 1);

  await page.getByRole("button", { name: "Overlay", exact: true }).click();
  await expect
    .poll(async () => (await readOverlayWindow(page)).text)
    .toContain("Neue Logs aus der aktuellen Session");

  /** The overlay shows the entries which a refresh of the folder adds */
  await appendLogLines(page, [blueprintLine(hoursAgo(1))]);
  await refresh(page);
  await expect
    .poll(async () => (await readOverlayWindow(page)).text)
    .toContain("Blueprint erhalten");

  /**
   * No control of the page loads it again from the server. The router of
   * Next.js, which the page shows as `window.next.router` for debugging,
   * does that like a server action with `refresh()`, and it writes a new
   * history state when it renders the answer. That render reaches the whole
   * log analyzer.
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
  /**
   * A user without a citizen gets no permissions from roles, thus admin mode
   * is the only way such a user reaches the page at all.
   */
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
  await page.goto(PAGE_PATH);

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
  /** Own entries without a citizen carry a dash in the citizen column */
  await expect(rowOf(page, "Shard-Beitritt")).toContainText("-");
  expect(await prisma.logAnalyzerEntry.count()).toBe(0);
});

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const MINUTES_PER_HOUR = 60;

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * MILLISECONDS_PER_MINUTE);

const FIRST_MISSION_ID = "bf7d2465-cf1e-480b-ae5c-25040d716e5f";
const SECOND_MISSION_ID = "2d9c9ff5-cf3a-43cd-95b0-c89e4c7eac56";

const enteringArmisticeLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <SHUDEvent_OnNotification> Added notification "Entering Armistice Zone - Combat Prohibited: " [3] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]`;
const leavingArmisticeLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <SHUDEvent_OnNotification> Added notification "Leaving Armistice Zone - Caution Advised: " [6] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]`;
const contractAcceptedLine = (at: Date, missionId: string, contract: string) =>
  `<${at.toISOString()}> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Accepted:  ${contract}: " [4] to queue. New queue size: 1, MissionId: [${missionId}], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]`;
const contractCompleteLine = (at: Date, missionId: string, contract: string) =>
  `<${at.toISOString()}> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Complete:  ${contract}: " [5] to queue. New queue size: 2, MissionId: [${missionId}], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]`;
const gameQuitLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <SystemQuit> CSystem::Quit invoked with - cause=30016, reason=Quit via console command, exitCode=0, thread id=2188, main thread id=2188 [Team_Unknown][System]`;

const liveStatus = (page: Page) =>
  page.getByRole("region", { name: "Live-Status" });

const enableLiveMode = async (page: Page) => {
  await toggleLabel(page, "Automatisch aktualisieren").click();
  await expect(
    page.getByRole("checkbox", { name: /Automatisch aktualisieren/ }),
  ).toBeChecked();
};

test("the live status shows the open states and closes them with their end lines", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "log-live-status",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });

  await signIn(citizen.user);
  /** The test moves the time of the page forward instead of waiting */
  await page.clock.install();
  await stubDirectoryPicker(page, [
    joinPuLine(minutesAgo(30)),
    enteringArmisticeLine(minutesAgo(20)),
    contractAcceptedLine(
      minutesAgo(10),
      FIRST_MISSION_ID,
      "Wikelo Arrive to System",
    ),
    contractAcceptedLine(minutesAgo(5), SECOND_MISSION_ID, "Bounty Hunt"),
  ]);
  await page.goto(PAGE_PATH);
  await selectFolder(page);

  const panel = liveStatus(page);
  await expect(
    panel.getByRole("link", { name: "log-live-status" }),
  ).toBeVisible();
  await expect(panel.getByText("online", { exact: true })).toBeVisible();
  await expect(panel.getByText("Shard: EU 100")).toBeVisible();
  await expect(panel.getByText("Armistice Zone")).toBeVisible();
  /** A player can have more than one contract at the same time */
  await expect(
    panel.getByText("Contract: Wikelo Arrive to System"),
  ).toBeVisible();
  await expect(panel.getByText("Contract: Bounty Hunt")).toBeVisible();
  await expect(panel.getByText(/Für einen genauen Status/)).toBeVisible();

  await enableLiveMode(page);
  await expect(panel.getByText(/Für einen genauen Status/)).toHaveCount(0);

  /** The end of one contract leaves the other contract open */
  await appendLogLines(page, [
    contractCompleteLine(
      minutesAgo(0),
      FIRST_MISSION_ID,
      "Wikelo Arrive to System",
    ),
    leavingArmisticeLine(minutesAgo(0)),
  ]);
  await page.clock.fastForward(LIVE_MODE_PARSE_INTERVAL);

  await expect(
    panel.getByText("Contract: Wikelo Arrive to System"),
  ).toHaveCount(0);
  await expect(panel.getByText("Armistice Zone")).toHaveCount(0);
  await expect(panel.getByText("Contract: Bounty Hunt")).toBeVisible();

  /** A contract continues after the end of the session */
  await appendLogLines(page, [gameQuitLine(minutesAgo(0))]);
  await page.clock.fastForward(LIVE_MODE_PARSE_INTERVAL);

  await expect(panel.getByText(/^offline seit/)).toBeVisible();
  await expect(panel.getByText("Shard: EU 100")).toHaveCount(0);
  await expect(panel.getByText("Contract: Bounty Hunt")).toBeVisible();
});

test("the live status ends the session when the own log stops, and a contract fades before it disappears", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "log-live-stille",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });

  await signIn(citizen.user);
  await page.clock.install();
  await stubDirectoryPicker(page, [
    joinPuLine(minutesAgo(2)),
    contractAcceptedLine(minutesAgo(1), FIRST_MISSION_ID, "Bounty Hunt"),
  ]);
  await page.goto(PAGE_PATH);
  await selectFolder(page);
  await enableLiveMode(page);

  const panel = liveStatus(page);
  await expect(panel.getByText("online", { exact: true })).toBeVisible();

  /** The game writes a line every few minutes while it runs */
  await page.clock.fastForward(11 * MILLISECONDS_PER_MINUTE);
  await expect(panel.getByText(/^offline seit/)).toBeVisible();
  await expect(panel.getByText("Shard: EU 100")).toHaveCount(0);
  await expect(panel.getByText("Contract: Bounty Hunt")).toBeVisible();
  await expect(panel.getByText("unsicher")).toHaveCount(0);

  await page.clock.fastForward(80 * MILLISECONDS_PER_MINUTE);
  await expect(panel.getByText("unsicher")).toBeVisible();

  await page.clock.fastForward(5 * MINUTES_PER_HOUR * MILLISECONDS_PER_MINUTE);
  await expect(panel.getByText("Gerade ist niemand aktiv.")).toBeVisible();
});

test("the live status of another citizen ignores the type filters, and follows the citizen filter, the toggle and a past date range", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "log-live-betrachter",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  const uploader = await createCitizen(prisma, { handle: "log-live-teiler" });

  const joinPuAt = minutesAgo(20);
  const contractAt = minutesAgo(10);
  await createLogAnalyzerEntry(prisma, {
    type: LogAnalyzerEntryType.JoinPu,
    rawLine: joinPuLine(joinPuAt),
    eventAt: joinPuAt,
    createdById: uploader.entity.id,
  });
  await createLogAnalyzerEntry(prisma, {
    type: LogAnalyzerEntryType.ContractAcceptedNotification,
    rawLine: contractAcceptedLine(contractAt, FIRST_MISSION_ID, "Bounty Hunt"),
    eventAt: contractAt,
    createdById: uploader.entity.id,
  });

  await signIn(viewer.user);
  await page.goto(PAGE_PATH);

  /** The table shows only the shard, the Live-Status also the contract */
  await openSettings(page);
  await settingToggle(
    page,
    "Shard-Beitritt",
    SettingsColumn.ShowOthers,
  ).click();
  await closeSettings(page);

  const panel = liveStatus(page);
  await expect(
    panel.getByRole("link", { name: "log-live-teiler" }),
  ).toBeVisible();
  await expect(panel.getByText("Shard: EU 100")).toBeVisible();
  await expect(panel.getByText("Contract: Bounty Hunt")).toBeVisible();
  await expect(rowOf(page, "Contract angenommen")).toHaveCount(0);

  await openSettings(page);
  await toggleLabel(settingsDialog(page), "log-live-teiler").click();
  await closeSettings(page);
  await expect(panel.getByText("Gerade ist niemand aktiv.")).toBeVisible();

  await openSettings(page);
  await settingsDialog(page)
    .getByRole("button", { name: "Alle anzeigen" })
    .click();
  await closeSettings(page);
  await expect(
    panel.getByRole("link", { name: "log-live-teiler" }),
  ).toBeVisible();

  await toggleLabel(page, "Live-Status").click();
  await expect(panel).toHaveCount(0);
  await toggleLabel(page, "Live-Status").click();
  await expect(panel).toBeVisible();

  await applyDateRange(page, daysAgo(3), daysAgo(2));
  await expect(
    panel.getByText(/für einen vergangenen Zeitraum ausgeblendet/),
  ).toBeVisible();
});
