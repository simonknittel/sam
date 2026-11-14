import type { Locator, Page } from "@playwright/test";
import { clickUntilVisible, toggleLabel } from "./interactions";
import { expect } from "./test";

/** Helpers for the specs of the Log Analyzer */

export const LOG_ANALYZER_PERMISSIONS = ["logAnalyzer;read"];

export const LOG_ANALYZER_PAGE_PATH = "/app/tools/log-analyzer";

export const joinPuLine = (at: Date) =>
  `<${at.toISOString()}> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]`;

export const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000);

const HOURS_PER_DAY = 24;

export const daysAgo = (days: number) => hoursAgo(days * HOURS_PER_DAY);

/** The value of a date input */
const toDateValue = (date: Date) => date.toISOString().slice(0, 10);

export interface BackupFile {
  readonly name: string;
  readonly lines: readonly string[];
  readonly lastModified: number;
}

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
export const stubDirectoryPicker = (
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

export const appendLogLines = (page: Page, lines: readonly string[]) =>
  page.evaluate(
    (newLines) =>
      (
        window as unknown as { appendLogLines: (lines: string[]) => void }
      ).appendLogLines(newLines),
    [...lines],
  );

export const settingsDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Filter & Teilen", exact: true });

export const openSettings = (page: Page) =>
  clickUntilVisible(
    page.getByRole("button", { name: "Filter & Teilen", exact: true }),
    settingsDialog(page),
  );

export const closeSettings = async (page: Page) => {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
};

/** The columns of the settings table, as the checkboxes name them */
export enum SettingsColumn {
  ShowOwn = "Eigene anzeigen",
  Share = "Teilen",
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
 * The label around the checkbox, because the checkbox itself is `sr-only`.
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

export const tableRows = (page: Page) => page.getByRole("row");

export const rowOf = (page: Page, text: string): Locator =>
  tableRows(page).filter({ hasText: text });

/**
 * A click which lands before React hydrates is swallowed, so it is retried
 * until the table shows the parsed entries. A repeated parse is harmless: it
 * finds the same entries and shares none of them a second time.
 */
export const selectFolder = (page: Page) =>
  clickUntilVisible(
    page.getByRole("button", { name: "Ordner auswählen" }),
    tableRows(page).first(),
  );

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

/**
 * Live mode reads the log files again at this interval
 * (LIVE_MODE_PARSE_INTERVAL_MS in the app)
 */
export const LIVE_MODE_PARSE_INTERVAL = 10_000;
