import type { Locator, Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import {
  clickUntilVisible,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import {
  appendLogLines,
  blueprintLine,
  LOG_ANALYZER_PAGE_PATH,
  LOG_ANALYZER_PERMISSIONS,
  minutesAgo,
  stubDirectoryPicker,
} from "../fixtures/log-analyzer";
import {
  closeSharingPopover,
  expectUploadedLines,
  openSharingPopover,
  pickLogFolderInPopover,
  recordRelayConnections,
  relayConnectionState,
  REMOTE_CONTROL_PROGRAM_PERMISSION,
  runtimeState,
  sharingPopover,
  sharingPopoverSection,
  SharingPopoverSection,
  sharingPopoverTab,
  sharingPopoverTrigger,
  showSharingPopoverSection,
  startBrowserRuntime,
  turnOnLogEntryTypes,
  uploadedLines,
} from "../fixtures/remote-control-program";
import { expect, test } from "../fixtures/test";

/**
 * The browser runtime of the Remote Control Program in the tabs of one
 * browser, and the sharing popover with the keyboard and on mobile (see
 * apps/app/src/modules/remote-control-program/runtime/README.md)
 */

/** Two tabs and some reads of the folder */
const RUNTIME_TEST_TIMEOUT = 120_000;

/**
 * The popover lists more than 60 types of log entries. A Tab moves the focus
 * through all of them.
 */
const MAXIMUM_TAB_PRESSES = 150;

const BLUEPRINT_TYPE_TITLE = "Blueprint erhalten";

/** Presses Tab until the target has the focus, at most the given times */
const tabTo = async (
  page: Page,
  target: Locator,
  maximumPressCount = MAXIMUM_TAB_PRESSES,
) => {
  await expect(target).toBeAttached();

  for (let pressCount = 0; pressCount < maximumPressCount; pressCount++) {
    if (await target.evaluate((element) => element === document.activeElement))
      return;
    await page.keyboard.press("Tab");
  }

  await expect(target).toBeFocused();
};

test("a second tab uses the runtime of the first tab, and continues it when the first tab closes", async ({
  page,
  context,
  prisma,
  signIn,
  relayUrl,
}) => {
  test.setTimeout(RUNTIME_TEST_TIMEOUT);

  const owner = await createCitizen(prisma, {
    handle: "rcp-tabs",
    permissionStrings: [REMOTE_CONTROL_PROGRAM_PERMISSION],
  });
  await signIn(owner.user);
  await stubDirectoryPicker(page, []);

  /** The runtime runs on each page of SAM, not only in the Log Analyzer */
  const firstTabConnections = recordRelayConnections(page, relayUrl);
  await page.goto("/app/dashboard");
  await startBrowserRuntime(page);
  await turnOnLogEntryTypes(page, [BLUEPRINT_TYPE_TITLE]);
  await expect(relayConnectionState(page, "Verbunden")).toBeVisible();
  await closeSharingPopover(page);

  const secondTab = await context.newPage();
  const secondTabConnections = recordRelayConnections(secondTab, relayUrl);
  await secondTab.goto("/app/dashboard");

  /** The second tab shows the state of the runtime of the first tab */
  await openSharingPopover(secondTab);
  await expect(runtimeState(secondTab, "Läuft")).toBeVisible();
  await expect(relayConnectionState(secondTab, "Verbunden")).toBeVisible();
  expect(firstTabConnections.openCount()).toBe(1);
  expect(secondTabConnections.openCount()).toBe(0);

  /**
   * The autostart is off. The second tab starts the runtime only because the
   * runtime of the first tab ran a short time before.
   */
  await page.close();

  await expect.poll(secondTabConnections.openCount).toBe(1);
  await expect(runtimeState(secondTab, "Läuft")).toBeVisible();
  await expect(relayConnectionState(secondTab, "Verbunden")).toBeVisible();

  const lineAfterTheChange = blueprintLine(new Date(), "Nach dem Tabwechsel");
  await appendLogLines(secondTab, [lineAfterTheChange]);
  await expectUploadedLines(prisma, owner, [lineAfterTheChange]);
});

test("a citizen who logs in after a different citizen in the same browser gets neither the folder nor the lines of the other citizen", async ({
  page,
  prisma,
  signIn,
}) => {
  test.setTimeout(RUNTIME_TEST_TIMEOUT);

  const firstCitizen = await createCitizen(prisma, {
    handle: "rcp-erster",
    permissionStrings: [REMOTE_CONTROL_PROGRAM_PERMISSION],
  });
  const secondCitizen = await createCitizen(prisma, {
    handle: "rcp-zweiter",
    permissionStrings: [REMOTE_CONTROL_PROGRAM_PERMISSION],
  });
  await signIn(firstCitizen.user);
  await stubDirectoryPicker(page, []);

  await page.goto("/app/dashboard");
  await startBrowserRuntime(page);
  await expect(relayConnectionState(page, "Verbunden")).toBeVisible();
  await turnOnLogEntryTypes(page, [BLUEPRINT_TYPE_TITLE]);
  await closeSharingPopover(page);

  const lineOfFirstCitizen = blueprintLine(new Date(), "Erster Citizen");
  await appendLogLines(page, [lineOfFirstCitizen]);
  await expectUploadedLines(prisma, firstCitizen, [lineOfFirstCitizen]);

  const accountPopover = page.getByRole("dialog", {
    name: "Account",
    exact: true,
  });
  await clickUntilVisible(
    page.getByRole("button", { name: "Account", exact: true }),
    accountPopover,
  );
  await accountPopover
    .getByRole("button", { name: "Abmelden", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

  /**
   * The game writes on. The second citizen logs in at once, thus within the
   * time in which a runtime continues the run of a closed tab
   * (`TAB_CHANGE_GAP_MILLISECONDS` of the runtime package).
   */
  const lineAfterLogout = blueprintLine(new Date(), "Nach dem Abmelden");
  await appendLogLines(page, [lineAfterLogout]);
  await signIn(secondCitizen.user);
  await page.goto("/app/dashboard");

  /** The runtime of the second citizen has no folder and does not run */
  await openSharingPopover(page);
  await expect(
    sharingPopoverSection(page, SharingPopoverSection.ThisBrowser).getByText(
      "Nicht ausgewählt",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(runtimeState(page, "Gestoppt")).toBeVisible();

  /** With the same folder, only the new lines of the second citizen go up */
  await pickLogFolderInPopover(page);
  await expect(relayConnectionState(page, "Verbunden")).toBeVisible();
  await turnOnLogEntryTypes(page, [BLUEPRINT_TYPE_TITLE]);
  const lineOfSecondCitizen = blueprintLine(new Date(), "Zweiter Citizen");
  await appendLogLines(page, [lineOfSecondCitizen]);
  await expectUploadedLines(prisma, secondCitizen, [lineOfSecondCitizen]);
  expect(await uploadedLines(prisma, firstCitizen)).toEqual([
    lineOfFirstCitizen,
  ]);
});

test("the sharing popover and the request of the Log Analyzer work with the keyboard", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createCitizen(prisma, {
    handle: "rcp-tastatur",
    permissionStrings: LOG_ANALYZER_PERMISSIONS,
  });
  await signIn(owner.user);
  /** The rows of the table have links and buttons, which the focus can pass */
  await stubDirectoryPicker(page, [blueprintLine(minutesAgo(5))]);
  await page.goto(LOG_ANALYZER_PAGE_PATH);
  await waitForAppShellHydration(page);

  const trigger = sharingPopoverTrigger(page);
  await trigger.focus();
  await page.keyboard.press("Enter");

  const status = sharingPopoverSection(page, SharingPopoverSection.Status);
  const thisBrowser = sharingPopoverSection(
    page,
    SharingPopoverSection.ThisBrowser,
  );
  const grants = sharingPopoverSection(page, SharingPopoverSection.Grants);

  /** Without a log folder, the popover opens with the explanation, whose links open the tabs */
  const start = sharingPopoverSection(page, SharingPopoverSection.Start);
  await expect(start).toBeVisible();
  await tabTo(
    page,
    start
      .getByRole("button", { name: "Runtime: Browser", exact: true })
      .first(),
  );
  await page.keyboard.press("Enter");
  await expect(thisBrowser).toBeVisible();
  await expect(
    sharingPopoverTab(page, SharingPopoverSection.ThisBrowser),
  ).toBeFocused();

  await tabTo(
    page,
    thisBrowser.getByRole("button", { name: "Ordner wählen", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expect(runtimeState(page, "Läuft")).toBeVisible();

  /** Without a type that is on, the list of the types is open */
  const blueprintType = thisBrowser.getByRole("checkbox", {
    name: BLUEPRINT_TYPE_TITLE,
    exact: true,
  });
  await tabTo(page, blueprintType);
  await page.keyboard.press("Space");
  await expect(blueprintType).toBeChecked();

  /** The arrow keys move between the tabs */
  await sharingPopoverTab(page, SharingPopoverSection.Start).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(status.getByText("dieser Browser")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await tabTo(page, grants.getByRole("button", { name: "Neue Freigabe" }));
  await page.keyboard.press("Enter");
  await expect(
    grants.getByRole("form", { name: "Neue Freigabe" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(sharingPopover(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();

  /**
   * The Log Analyzer opens the popover with a request for older entries. The
   * focus goes into the request, at the latest with the next Tab, and its
   * first button is not the upload.
   */
  await page
    .getByRole("button", { name: "Ältere Game Logs hochladen" })
    .focus();
  await page.keyboard.press("Enter");
  const request = sharingPopover(page).getByRole("region", {
    name: "Ältere Game Logs hochladen?",
  });
  /** The type of the entry is on since the last minute, thus the entry counts */
  await expect(
    request.getByRole("button", { name: "Hochladen", exact: true }),
  ).toBeVisible();

  const cancelButton = request.getByRole("button", { name: "Abbrechen" });
  /** The tabs and their panel come before it */
  await tabTo(page, cancelButton, 3);

  /** The end of the request moves the focus to the heading of its section */
  await page.keyboard.press("Enter");
  await expect(request).toHaveCount(0);
  await expect(
    thisBrowser.getByRole("heading", { name: "Runtime: Browser", exact: true }),
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(sharingPopover(page)).toHaveCount(0);
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the flyout and the Log Analyzer open the sharing popover in a bottom sheet", async ({
    page,
    prisma,
    signIn,
  }) => {
    const owner = await createCitizen(prisma, {
      handle: "rcp-mobil",
      permissionStrings: LOG_ANALYZER_PERMISSIONS,
    });
    await signIn(owner.user);
    await stubDirectoryPicker(page, []);
    await page.goto(LOG_ANALYZER_PAGE_PATH);

    /** The top bar is hidden: the trigger is in the flyout of the action bar */
    const flyoutToggle = page.getByRole("button", { name: "Apps" });
    await clickUntilVisible(
      flyoutToggle,
      page.getByRole("button", { name: "Apps", expanded: true }),
    );
    await expect(sharingPopoverTrigger(page)).toHaveCount(1);
    await openSharingPopover(page);
    await showSharingPopoverSection(page, SharingPopoverSection.Status);
    await showSharingPopoverSection(page, SharingPopoverSection.Grants);

    /** The first Escape closes only the sheet, the second one the flyout */
    await closeSharingPopover(page);
    await expect(flyoutToggle).toHaveAttribute("aria-expanded", "true");
    await expect(sharingPopoverTrigger(page)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(flyoutToggle).toHaveAttribute("aria-expanded", "false");

    /** The Log Analyzer asks for the folder in the same sheet */
    await page.getByRole("button", { name: "Öffnen", exact: true }).click();
    await pickLogFolderInPopover(page);
    await closeSharingPopover(page);
    await expect(
      page.getByRole("button", { name: "Öffnen", exact: true }),
    ).toHaveCount(0);
  });
});
