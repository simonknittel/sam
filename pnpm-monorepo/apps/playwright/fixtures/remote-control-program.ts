import type { Locator, Page, WebSocket } from "@playwright/test";
import { clickUntilVisible, pickFromSearch, toggleLabel } from "./interactions";
import { expect } from "./test";

/** Helpers for the sharing popover and the browser runtime of the Remote Control Program */

export const REMOTE_CONTROL_PROGRAM_PERMISSION = "remoteControlProgram;use";

/**
 * The browser runtime reads the log folder again at this interval
 * (`LOG_FOLDER_READ_INTERVAL_MILLISECONDS` of the runtime package)
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

/** The accessible name of the popover */
const SHARING_POPOVER_TITLE = "Remote Control Program";

export enum SharingPopoverSection {
  Status = "Status",
  ThisBrowser = "Dieser Browser",
  SharedWithOthers = "Mit anderen geteilt",
}

/**
 * The trigger of the popover in the top bar, or on a small viewport in the
 * mobile action bar. After a colon, its name tells a "Stop all" or a missing
 * access to the folder. The pattern must not match the permission
 * "Remote Control Program nutzen" of the role editor.
 */
export const sharingPopoverTrigger = (page: Page) =>
  page
    .getByRole("button", { name: /^Remote Control Program(: .+)?$/ })
    .filter({ visible: true });

/** The popover of the top bar, or the bottom sheet on a small viewport */
export const sharingPopover = (page: Page) =>
  page.getByRole("dialog", { name: SHARING_POPOVER_TITLE, exact: true });

export const sharingPopoverSection = (
  page: Page,
  section: SharingPopoverSection,
) => sharingPopover(page).getByRole("region", { name: section, exact: true });

/**
 * Opens the popover, when it is not open. A click on the trigger of an open
 * popover closes it. The section of this browser shows at once, the other
 * sections show after the read of the server data.
 */
export const openSharingPopover = async (page: Page) => {
  const thisBrowser = sharingPopoverSection(
    page,
    SharingPopoverSection.ThisBrowser,
  );
  if (await thisBrowser.isVisible()) return;

  await clickUntilVisible(sharingPopoverTrigger(page), thisBrowser);
};

export const closeSharingPopover = async (page: Page) => {
  await page.keyboard.press("Escape");
  await expect(sharingPopover(page)).toHaveCount(0);
};

/** The state of the browser runtime, for example "läuft" or "gestoppt" */
export const runtimeState = (page: Page, state: string) =>
  sharingPopoverSection(page, SharingPopoverSection.ThisBrowser).getByText(
    `Laufzeit: ${state}`,
    { exact: true },
  );

/**
 * Selects the log folder in the open popover, which starts the browser
 * runtime. The folder comes from `stubDirectoryPicker()`.
 */
export const pickLogFolderInPopover = async (page: Page) => {
  await sharingPopoverSection(page, SharingPopoverSection.ThisBrowser)
    .getByRole("button", { name: "Ordner wählen", exact: true })
    .click();
  await expect(runtimeState(page, "läuft")).toBeVisible();
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
  const section = sharingPopoverSection(
    page,
    SharingPopoverSection.ThisBrowser,
  );
  const listToggle = section.getByRole("button", {
    name: /^Typen der Log-Einträge/,
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

/** A grant in the section "Mit anderen geteilt", by the handle of its citizen */
const shareGrantItem = (page: Page, granteeHandle: string) =>
  sharingPopoverSection(page, SharingPopoverSection.SharedWithOthers)
    .getByRole("listitem")
    .filter({
      has: page.getByRole("link", { name: granteeHandle, exact: true }),
    });

/**
 * Opens the form for a new grant in the open popover and selects the
 * citizen. The citizen picker needs `citizen;read`.
 */
export const openShareGrantForm = async (page: Page, granteeHandle: string) => {
  const section = sharingPopoverSection(
    page,
    SharingPopoverSection.SharedWithOthers,
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
