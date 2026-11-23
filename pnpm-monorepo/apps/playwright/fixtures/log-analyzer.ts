import type { Locator, Page } from "@playwright/test";
import { ONE_DAY_MS, ONE_HOUR_MS, ONE_MINUTE_MS } from "./factories";
import { clickUntilVisible, toggleLabel } from "./interactions";
import {
  closeSharingPopover,
  REMOTE_CONTROL_PROGRAM_PERMISSION,
  startBrowserRuntime,
} from "./remote-control-program";
import { expect } from "./test";

/**
 * The Log Analyzer is a control UI of the Remote Control Program, thus it
 * also needs the permission of the program (M7 of the migration)
 */
export const LOG_ANALYZER_PERMISSIONS = [
  "logAnalyzer;read",
  REMOTE_CONTROL_PROGRAM_PERMISSION,
];

export const LOG_ANALYZER_PAGE_PATH = "/app/tools/log-analyzer";

export const joinPuLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]`;

/** The name of the blueprint is the message of the entry */
export const blueprintLine = (
  at: Date,
  blueprint = "Morozov-SH Helmet Thule",
) =>
  `<${at.toISOString()}> [Notice] <SHUDEvent_OnNotification> Added notification "Received Blueprint: ${blueprint}: " [25] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]`;

export const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * ONE_MINUTE_MS);

export const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * ONE_HOUR_MS);

export const daysAgo = (days: number) =>
  new Date(Date.now() - days * ONE_DAY_MS);

const toDateValue = (date: Date) => date.toISOString().slice(0, 10);

export interface BackupFile {
  readonly name: string;
  readonly lines: readonly string[];
  readonly lastModified: number;
}

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
export const createBackupFile = (at: Date, line: string): BackupFile => {
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${pad(at.getDate())} ${MONTHS[at.getMonth()]} ${pad(at.getFullYear() % 100)}`;
  const time = `${pad(at.getHours())} ${pad(at.getMinutes())} ${pad(at.getSeconds())}`;

  return {
    name: `Game Build(12913470) ${date} (${time}).log`,
    lines: [line],
    lastModified: at.getTime(),
  };
};

/** The folder of the stub in the origin private file system of the page */
const LOG_FOLDER_NAME = "StarCitizen";

const LIVE_LOG_FILE_NAME = "Game.log";

/**
 * Replaces the folder picker of the browser, which no test can answer. The
 * picker gives a real folder of the origin private file system, because the
 * browser runtime keeps the handle in IndexedDB and asks it for the read
 * permission. `appendLogLines()` adds lines to `Game.log`, as the game does
 * while it runs.
 *
 * The script applies to all pages of the browser context, thus also to a
 * second tab.
 */
export const stubDirectoryPicker = (
  page: Page,
  lines: readonly string[],
  backupFiles: readonly BackupFile[] = [],
) =>
  page.context().addInitScript(
    ({
      folderName,
      liveFileName,
      fileLines,
      backups,
    }: {
      folderName: string;
      liveFileName: string;
      fileLines: string[];
      backups: BackupFile[];
    }) => {
      /** The runtime waits for the line end of the last line of `Game.log` */
      const toContent = (contentLines: readonly string[]) =>
        contentLines.map((line) => `${line}\n`).join("");

      /**
       * A file of the origin private file system has the time of its last
       * write. The runtime also selects a backup by this time, thus a backup
       * gets the time of its session.
       */
      const lastModifiedByName = new Map(
        backups.map((backup) => [backup.name, backup.lastModified]),
      );
      const getFile = FileSystemFileHandle.prototype.getFile;
      FileSystemFileHandle.prototype.getFile = async function (
        this: FileSystemFileHandle,
      ) {
        const file = await getFile.call(this);
        const lastModified = lastModifiedByName.get(this.name);
        return lastModified === undefined
          ? file
          : new File([file], file.name, { type: file.type, lastModified });
      };

      const writeFile = async (
        folder: FileSystemDirectoryHandle,
        name: string,
        content: string,
      ) => {
        const fileHandle = await folder.getFileHandle(name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
      };

      Object.assign(window, {
        showDirectoryPicker: async () => {
          const root = await navigator.storage.getDirectory();
          const folder = await root.getDirectoryHandle(folderName, {
            create: true,
          });

          // A second pick keeps the lines that the test added
          const hasLiveFile = await folder.getFileHandle(liveFileName).then(
            () => true,
            () => false,
          );
          if (!hasLiveFile) {
            for (const backup of backups)
              await writeFile(folder, backup.name, toContent(backup.lines));
            await writeFile(folder, liveFileName, toContent(fileLines));
          }

          return folder;
        },
      });
    },
    {
      folderName: LOG_FOLDER_NAME,
      liveFileName: LIVE_LOG_FILE_NAME,
      fileLines: [...lines],
      backups: backupFiles.map((backup) => ({
        ...backup,
        lines: [...backup.lines],
      })),
    },
  );

/**
 * Adds lines to `Game.log` of the stub of `stubDirectoryPicker()`. The
 * folder must be selected. All pages of the browser context share the
 * folder.
 */
export const appendLogLines = (page: Page, lines: readonly string[]) =>
  page.evaluate(
    async ({ folderName, liveFileName, newLines }) => {
      const root = await navigator.storage.getDirectory();
      const folder = await root.getDirectoryHandle(folderName);
      const fileHandle = await folder.getFileHandle(liveFileName);
      const { size } = await fileHandle.getFile();

      const writable = await fileHandle.createWritable({
        keepExistingData: true,
      });
      await writable.seek(size);
      await writable.write(newLines.map((line) => `${line}\n`).join(""));
      await writable.close();
    },
    {
      folderName: LOG_FOLDER_NAME,
      liveFileName: LIVE_LOG_FILE_NAME,
      newLines: [...lines],
    },
  );

export const settingsDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Filter", exact: true });

export const openSettings = (page: Page) =>
  clickUntilVisible(
    page.getByRole("button", { name: "Filter", exact: true }),
    settingsDialog(page),
  );

export const closeSettings = async (page: Page) => {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
};

export enum SettingsColumn {
  ShowOwn = "Eigene anzeigen",
  ShowOthers = "Andere anzeigen",
}

export const settingCheckbox = (
  page: Page,
  typeTitle: string,
  column: SettingsColumn,
) =>
  settingsDialog(page).getByRole("checkbox", {
    name: `${typeTitle}: ${column}`,
    exact: true,
  });

/**
 * The inner locator is queried inside each label, thus it must not carry the
 * dialog in its chain.
 */
export const settingToggle = (
  page: Page,
  typeTitle: string,
  column: SettingsColumn,
) =>
  toggleLabel(
    settingsDialog(page),
    page.getByRole("checkbox", {
      name: `${typeTitle}: ${column}`,
      exact: true,
    }),
  );

/** The rows of the table of the page, not of the settings dialog */
export const tableRows = (page: Page) =>
  page.locator("#main-content").getByRole("row");

export const rowOf = (page: Page, text: string): Locator =>
  tableRows(page).filter({ hasText: text });

/**
 * Selects the log folder in the sharing popover, which starts the browser
 * runtime, and waits for the own entries in the table
 */
export const selectFolder = async (page: Page) => {
  await startBrowserRuntime(page);
  await closeSharingPopover(page);
  await expect(tableRows(page).first()).toBeVisible();
};

export const dateRangeDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Zeitraum", exact: true });

/** The button names the active range after the word `Zeitraum` */
export const dateRangeButton = (page: Page) =>
  page.getByRole("button", { name: /^Zeitraum/ });

export const openDateRange = (page: Page) =>
  clickUntilVisible(dateRangeButton(page), dateRangeDialog(page));

export const applyDateRange = async (page: Page, from: Date, to: Date) => {
  await openDateRange(page);

  const dialog = dateRangeDialog(page);
  await dialog.getByLabel("Von").fill(toDateValue(from));
  await dialog.getByLabel("Bis").fill(toDateValue(to));
  await dialog.getByRole("button", { name: "Anwenden" }).click();

  await expect(dialog).toHaveCount(0);
};

export const resetDateRange = async (page: Page) => {
  await openDateRange(page);
  await dateRangeDialog(page)
    .getByRole("button", { name: "Zurücksetzen" })
    .click();
};
