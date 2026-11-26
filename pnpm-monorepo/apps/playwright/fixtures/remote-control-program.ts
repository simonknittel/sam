import type { Locator, Page, WebSocket } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import type { TestCitizen } from "./factories";
import {
  clickUntilVisible,
  pickFromSearch,
  toDateValue,
  toggleLabel,
} from "./interactions";
import { expect } from "./test";

/** Helpers for the sharing popover and the browser runtime of the Remote Control Program */

export const REMOTE_CONTROL_PROGRAM_PERMISSION = "remoteControlProgram;use";

/**
 * The browser runtime reads the log folder again at this interval. A copy of
 * `LOG_FOLDER_READ_INTERVAL_MILLISECONDS` in `browserRuntime.ts` of the
 * runtime package, which the package does not export.
 */
export const LOG_FOLDER_READ_INTERVAL = 10_000;

/**
 * A new line goes up after the next read of the folder, and the relay sends
 * the new entries to a viewer at most once in 2 seconds. The rest is
 * headroom for the load of the suite.
 */
export const LIVE_UPLOAD_TIMEOUT = LOG_FOLDER_READ_INTERVAL + 15_000;

/**
 * The time in which the relay sends an accepted entry to the viewers: one
 * interval of the delivery (2 seconds) and headroom. After it, an entry that
 * did not arrive does not arrive.
 */
export const REALTIME_DELIVERY_GRACE = 6_000;

/** The raw lines of the owner in the database, in the order of the log file */
export const uploadedLines = (prisma: PrismaClient, owner: TestCitizen) =>
  prisma.logAnalyzerEntry
    .findMany({
      where: { createdById: owner.entity.id },
      orderBy: [{ eventAt: "asc" }, { lineNumber: "asc" }],
      select: { rawLine: true },
    })
    .then((entries) => entries.map((entry) => entry.rawLine));

/** Waits until the raw lines of the owner in the database are the lines */
export const expectUploadedLines = (
  prisma: PrismaClient,
  owner: TestCitizen,
  lines: readonly string[],
) =>
  expect
    .poll(() => uploadedLines(prisma, owner), { timeout: LIVE_UPLOAD_TIMEOUT })
    .toEqual(lines);

/** The accessible name of the popover */
const SHARING_POPOVER_TITLE = "Remote Control Program";

/** The name of each section is also the name of its tab or sub-tab */
export enum SharingPopoverSection {
  Start = "Start",
  Grants = "Freigaben",
  /** The sub-tabs of the runtimes */
  Runtimes = "Runtimes",
  ThisBrowser = "Browser",
  DesktopCompanion = "Desktop Companion",
}

/** The sections in a sub-tab of the tab of the runtimes */
const RUNTIME_SECTIONS: readonly SharingPopoverSection[] = [
  SharingPopoverSection.ThisBrowser,
  SharingPopoverSection.DesktopCompanion,
];

/**
 * The trigger of the popover in the top bar, or on a small viewport in the
 * flyout of the mobile action bar. After a colon, its name tells a missing access to the
 * folder. The pattern must not match the permission
 * "Remote Control Program nutzen" of the role editor.
 */
export const sharingPopoverTrigger = (page: Page) =>
  page
    .getByRole("button", { name: /^Remote Control Program(: .+)?$/ })
    .filter({ visible: true });

/** The popover of the top bar, or the bottom sheet on a small viewport */
export const sharingPopover = (page: Page) =>
  page.getByRole("dialog", { name: SHARING_POPOVER_TITLE, exact: true });

/** Only the section of the active tab is visible */
export const sharingPopoverSection = (
  page: Page,
  section: SharingPopoverSection,
) => sharingPopover(page).getByRole("region", { name: section, exact: true });

/** The tab or the sub-tab of the section. The tab of the grants also has their count in its name. */
export const sharingPopoverTab = (page: Page, section: SharingPopoverSection) =>
  sharingPopover(page).getByRole("tab", { name: new RegExp(`^${section}`) });

/** Activates the tab, and for a runtime the sub-tab, of the section in the open popover */
export const showSharingPopoverSection = async (
  page: Page,
  section: SharingPopoverSection,
) => {
  if (RUNTIME_SECTIONS.includes(section))
    await sharingPopoverTab(page, SharingPopoverSection.Runtimes).click();

  await sharingPopoverTab(page, section).click();
  const region = sharingPopoverSection(page, section);
  await expect(region).toBeVisible();
  return region;
};

/**
 * Opens the popover, when it is not open, and shows the section of this
 * browser. A click on the trigger of an open popover closes it.
 */
export const openSharingPopover = async (page: Page) => {
  const tab = sharingPopoverTab(page, SharingPopoverSection.Runtimes);
  if (!(await tab.isVisible()))
    await clickUntilVisible(sharingPopoverTrigger(page), tab);

  await showSharingPopoverSection(page, SharingPopoverSection.ThisBrowser);
};

export const closeSharingPopover = async (page: Page) => {
  await page.keyboard.press("Escape");
  await expect(sharingPopover(page)).toHaveCount(0);
};

/** The state of the browser runtime, for example "Läuft" or "Gestoppt" */
export const runtimeState = (page: Page, state: string) =>
  sharingPopoverSection(page, SharingPopoverSection.ThisBrowser).getByText(
    state,
    { exact: true },
  );

/**
 * Opens the settings of the log file connector in the section. They are open
 * already while the connector needs the owner, for example without a folder.
 */
export const openLogFileConnector = async (section: Locator) => {
  const toggle = section.getByRole("button", { name: /^Game Logs/ });
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-expanded")) !== "true")
    await toggle.click();
};

/**
 * Selects the log folder in the open popover, which starts the browser
 * runtime. The folder comes from `stubDirectoryPicker()`.
 */
export const pickLogFolderInPopover = async (page: Page) => {
  const section = await showSharingPopoverSection(
    page,
    SharingPopoverSection.ThisBrowser,
  );
  await openLogFileConnector(section);
  await section
    .getByRole("button", { name: "Ordner wählen", exact: true })
    .click();
  await expect(runtimeState(page, "Läuft")).toBeVisible();
};

/** Selects the log folder in the popover. The popover stays open. */
export const startBrowserRuntime = async (page: Page) => {
  await openSharingPopover(page);
  await pickLogFolderInPopover(page);
};

/**
 * The state of the connection of the browser runtime to the relay, for
 * example "Verbunden" or "Getrennt"
 */
export const relayConnectionState = (page: Page, state: string) =>
  sharingPopoverSection(page, SharingPopoverSection.ThisBrowser).getByText(
    state,
    { exact: true },
  );

/**
 * Turns on the types of the local access layer in the open popover: the
 * types whose new lines go up. The list shows the title of the newest
 * version of each type.
 */
export const turnOnLogEntryTypes = async (
  page: Page,
  typeTitles: readonly string[],
) => {
  const section = await showSharingPopoverSection(
    page,
    SharingPopoverSection.ThisBrowser,
  );
  await openLogFileConnector(section);
  const listToggle = section.getByRole("button", {
    name: /^Typen auswählen/,
  });
  if ((await listToggle.getAttribute("aria-expanded")) !== "true")
    await listToggle.click();

  for (const typeTitle of typeTitles) {
    const checkbox = section.getByRole("checkbox", {
      name: typeTitle,
      exact: true,
    });
    /**
     * The inner locator is queried inside each label, thus it must not carry
     * the section in its chain
     */
    await toggleLabel(
      section,
      page.getByRole("checkbox", { name: typeTitle, exact: true }),
    ).click();
    await expect(checkbox).toBeChecked();
  }
};

/**
 * Opens the upload of the older entries in the settings of the log file
 * connector. It needs the log folder and a running runtime.
 */
export const openOlderEntriesUpload = async (page: Page) => {
  const section = await showSharingPopoverSection(
    page,
    SharingPopoverSection.ThisBrowser,
  );
  await openLogFileConnector(section);

  const form = section.getByRole("form", {
    name: "Ältere Game Logs hochladen",
  });
  await clickUntilVisible(
    section.getByRole("button", { name: "Ältere Game Logs hochladen" }),
    form,
  );

  return form;
};

/** Counts the older entries of the date range, without the upload */
export const countOlderEntries = async (
  form: Locator,
  from: Date,
  to: Date,
) => {
  await form.getByLabel("Von").fill(toDateValue(from));
  await form.getByLabel("Bis").fill(toDateValue(to));
  await form.getByRole("button", { name: "Einträge zählen" }).click();
};

/** A grant in the list, by the handle of its citizen */
const shareGrantItem = (page: Page, granteeHandle: string) =>
  sharingPopoverSection(page, SharingPopoverSection.Grants)
    .getByRole("listitem")
    .filter({
      has: page.getByRole("link", { name: granteeHandle, exact: true }),
    });

/**
 * Opens the form for a new grant in the open popover and selects the
 * citizen. The citizen picker needs `citizen;read`.
 */
export const openShareGrantForm = async (page: Page, granteeHandle: string) => {
  const section = await showSharingPopoverSection(
    page,
    SharingPopoverSection.Grants,
  );
  const form = section.getByRole("form", { name: "Neue Freigabe" });
  await clickUntilVisible(
    section.getByRole("button", { name: "Neue Freigabe" }),
    form,
  );

  await pickFromSearch(
    page,
    form.getByRole("combobox", { name: "Citizen", exact: true }),
    granteeHandle,
  );

  return form;
};

/** Submits the form of a new grant and waits for the grant in the list */
export const submitShareGrantForm = async (
  page: Page,
  form: Locator,
  granteeHandle: string,
) => {
  await form.getByRole("button", { name: "Freigeben" }).click();
  await expect(form).toHaveCount(0);
  await expect(shareGrantItem(page, granteeHandle).last()).toBeVisible();
};

/** A grant for the citizen with the default validity of the form (1 hour from now) */
export const createShareGrantInPopover = async (
  page: Page,
  granteeHandle: string,
) => {
  const form = await openShareGrantForm(page, granteeHandle);
  await submitShareGrantForm(page, form, granteeHandle);
};

export const revokeShareGrantInPopover = async (
  page: Page,
  granteeHandle: string,
) => {
  await showSharingPopoverSection(page, SharingPopoverSection.Grants);
  await shareGrantItem(page, granteeHandle)
    .getByRole("button", { name: "Widerrufen" })
    .click();

  const confirmation = page.getByRole("alertdialog", {
    name: "Freigabe widerrufen?",
  });
  await confirmation.getByRole("button", { name: "Widerrufen" }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(shareGrantItem(page, granteeHandle)).toHaveCount(0);
};

/**
 * Collects the WebSocket connections of the page to the relay from now on.
 * The browser runtime holds one while it runs. The other WebSocket of the
 * page goes to the realtime service.
 */
export const recordRelayConnections = (page: Page, relayUrl: string) => {
  const connections: WebSocket[] = [];
  page.on("websocket", (webSocket) => {
    if (webSocket.url().startsWith(relayUrl)) connections.push(webSocket);
  });

  return {
    openCount: () =>
      connections.filter((connection) => !connection.isClosed()).length,
  };
};
