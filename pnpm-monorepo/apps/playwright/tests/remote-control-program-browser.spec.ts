import type { Locator, Page } from "@playwright/test";
import { createCitizen, createRole } from "../fixtures/factories";
import {
  clickUntilVisible,
  pickRoles,
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
  logEntryTypesToggle,
  logFileConnectorTab,
  logFolderRow,
  openOlderEntriesUpload,
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
  showLogFileConnector,
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

/**
 * The sub-tab of the game logs is selected and shows the log folder. The list
 * of the types in it stays closed.
 */
const expectLogFileConnectorShown = async (section: Locator) => {
  await expect(logFileConnectorTab(section)).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(logFolderRow(section)).toBeVisible();
  await expect(logEntryTypesToggle(section)).toHaveAttribute(
    "aria-expanded",
    "false",
  );
};

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

test("a second tab uses the runtime of the first tab, and starts a new runtime when the first tab closes", async ({
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
   * time in which the next runtime takes the run record of a closed tab
   * (`RUN_RECORD_MAXIMUM_AGE_MILLISECONDS` of the runtime package).
   */
  const lineAfterLogout = blueprintLine(new Date(), "Nach dem Abmelden");
  await appendLogLines(page, [lineAfterLogout]);
  await signIn(secondCitizen.user);
  await page.goto("/app/dashboard");

  /** The runtime of the second citizen has no folder and does not run */
  await openSharingPopover(page);
  const secondCitizenBrowser = sharingPopoverSection(
    page,
    SharingPopoverSection.ThisBrowser,
  );
  await showLogFileConnector(secondCitizenBrowser);
  await expect(
    secondCitizenBrowser.getByText("Nicht ausgewählt", { exact: true }),
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

test("the sharing popover and the upload of older entries work with the keyboard", async ({
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

  const thisBrowser = sharingPopoverSection(
    page,
    SharingPopoverSection.ThisBrowser,
  );
  const grants = sharingPopoverSection(page, SharingPopoverSection.Grants);

  /**
   * Without a log folder, the popover opens with the explanation, whose links
   * open the tabs. The link of the folder also selects the sub-tab of the
   * game logs.
   */
  const start = sharingPopoverSection(page, SharingPopoverSection.Start);
  await expect(start).toBeVisible();
  await tabTo(
    page,
    start
      .getByRole("button", { name: "Runtimes › Browser", exact: true })
      .first(),
  );
  await page.keyboard.press("Enter");
  await expect(thisBrowser).toBeVisible();
  await expect(
    sharingPopoverTab(page, SharingPopoverSection.ThisBrowser),
  ).toBeFocused();
  await expectLogFileConnectorShown(thisBrowser);

  await tabTo(
    page,
    thisBrowser.getByRole("button", { name: "Ordner wählen", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expect(runtimeState(page, "Läuft")).toBeVisible();

  await tabTo(page, logEntryTypesToggle(thisBrowser));
  await page.keyboard.press("Enter");
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
  await tabTo(page, grants.getByRole("button", { name: "Neue Freigabe" }));
  await page.keyboard.press("Enter");
  await expect(
    grants.getByRole("form", { name: "Neue Freigabe" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(sharingPopover(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();

  /**
   * The trigger shows the game logs, with the parts closed again. The preset
   * counts at once, and the end of the upload moves the focus.
   */
  await page.keyboard.press("Enter");
  await expect(thisBrowser).toBeVisible();
  await expectLogFileConnectorShown(thisBrowser);
  const form = await openOlderEntriesUpload(page);
  await tabTo(page, form.getByRole("button", { name: "Letzte 7 Tage" }));
  await page.keyboard.press("Enter");
  const uploadButton = form.getByRole("button", {
    name: "Hochladen",
    exact: true,
  });
  /** The type of the entry is on since the last minute, thus the entry counts */
  await tabTo(page, uploadButton);
  await page.keyboard.press("Enter");
  await expect(uploadButton).toHaveCount(0);
  await expect(
    form.getByRole("button", { name: "Einträge zählen" }),
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
    const thisBrowser = sharingPopoverSection(
      page,
      SharingPopoverSection.ThisBrowser,
    );
    /** Also without a folder, the sub-tab of the game logs shows the folder without a click */
    await expectLogFileConnectorShown(thisBrowser);
    await showSharingPopoverSection(
      page,
      SharingPopoverSection.DesktopCompanion,
    );
    await showSharingPopoverSection(page, SharingPopoverSection.Grants);

    /** The first Escape closes only the sheet, the second one the flyout */
    await closeSharingPopover(page);
    await expect(flyoutToggle).toHaveAttribute("aria-expanded", "true");
    await expect(sharingPopoverTrigger(page)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(flyoutToggle).toHaveAttribute("aria-expanded", "false");

    /** The Log Analyzer asks for the folder in the same sheet, with the sub-tab of the game logs */
    await page.getByRole("button", { name: "Öffnen", exact: true }).click();
    await expectLogFileConnectorShown(thisBrowser);
    await pickLogFolderInPopover(page);
    await closeSharingPopover(page);
    await expect(
      page.getByRole("button", { name: "Öffnen", exact: true }),
    ).toHaveCount(0);
  });

  test("the role picker of a new grant opens above the bottom sheet", async ({
    page,
    prisma,
    signIn,
  }) => {
    await createRole(prisma, { name: "Medic" });
    await createRole(prisma, { name: "Pilot" });
    const owner = await createCitizen(prisma, {
      handle: "rcp-mobil",
      permissionStrings: [
        ...LOG_ANALYZER_PERMISSIONS,
        "otherRole;read;roleId=*",
      ],
    });
    await signIn(owner.user);
    await page.goto("/app/dashboard");

    await clickUntilVisible(
      page.getByRole("button", { name: "Apps" }),
      page.getByRole("button", { name: "Apps", expanded: true }),
    );
    await openSharingPopover(page);
    const grants = await showSharingPopoverSection(
      page,
      SharingPopoverSection.Grants,
    );
    const form = grants.getByRole("form", { name: "Neue Freigabe" });
    await clickUntilVisible(
      grants.getByRole("button", { name: "Neue Freigabe" }),
      form,
    );

    const submitButton = form.getByRole("button", { name: "Freigeben" });
    const rolesError = form.getByText("Wähle mindestens eine Rolle aus.");
    await submitButton.click();
    await expect(rolesError).toBeVisible();

    /** `pickRoles()` closes the picker with Escape, which keeps the sheet open */
    await pickRoles(form.getByRole("button", { name: "Rolle auswählen" }), [
      "Pilot",
      "Medic",
    ]);
    await expect(rolesError).toHaveCount(0);
    await submitButton.click();
    await expect(form).toHaveCount(0);
    await expect(
      grants.getByRole("listitem").filter({ hasText: "Rollen Medic, Pilot" }),
    ).toBeVisible();
  });
});
