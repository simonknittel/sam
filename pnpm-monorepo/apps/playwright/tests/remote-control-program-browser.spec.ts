import type { Locator, Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import { waitForAppShellHydration } from "../fixtures/interactions";
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
  LIVE_UPLOAD_TIMEOUT,
  openSharingPopover,
  pickLogFolderInPopover,
  recordRelayConnections,
  relayConnectionState,
  REMOTE_CONTROL_PROGRAM_PERMISSION,
  runtimeState,
  sharingPopover,
  sharingPopoverSection,
  SharingPopoverSection,
  sharingPopoverTrigger,
  startBrowserRuntime,
  turnOnLogEntryTypes,
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

/** Presses Tab until the target has the focus */
const tabTo = async (page: Page, target: Locator) => {
  await expect(target).toBeAttached();

  for (let pressCount = 0; pressCount < MAXIMUM_TAB_PRESSES; pressCount++) {
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
  await turnOnLogEntryTypes(page, ["Blueprint erhalten"]);
  await expect(relayConnectionState(page, "Verbunden")).toBeVisible();
  await closeSharingPopover(page);

  const secondTab = await context.newPage();
  const secondTabConnections = recordRelayConnections(secondTab, relayUrl);
  await secondTab.goto("/app/dashboard");

  /** The second tab shows the state of the runtime of the first tab */
  await openSharingPopover(secondTab);
  await expect(runtimeState(secondTab, "läuft")).toBeVisible();
  await expect(relayConnectionState(secondTab, "Verbunden")).toBeVisible();
  expect(firstTabConnections.openCount()).toBe(1);
  expect(secondTabConnections.openCount()).toBe(0);

  /**
   * The autostart is off. The second tab starts the runtime only because the
   * runtime of the first tab ran a short time before.
   */
  await page.close();

  await expect.poll(secondTabConnections.openCount).toBe(1);
  await expect(runtimeState(secondTab, "läuft")).toBeVisible();
  await expect(relayConnectionState(secondTab, "Verbunden")).toBeVisible();

  const lineAfterTheChange = blueprintLine(new Date(), "Nach dem Tabwechsel");
  await appendLogLines(secondTab, [lineAfterTheChange]);
  await expect
    .poll(
      async () =>
        (
          await prisma.logAnalyzerEntry.findMany({
            where: { createdById: owner.entity.id },
            select: { rawLine: true },
          })
        ).map((entry) => entry.rawLine),
      { timeout: LIVE_UPLOAD_TIMEOUT },
    )
    .toEqual([lineAfterTheChange]);
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
  const sharedWithOthers = sharingPopoverSection(
    page,
    SharingPopoverSection.SharedWithOthers,
  );
  await expect(thisBrowser).toBeVisible();

  /** The focus moves through the sections in their order */
  await tabTo(page, status.getByRole("button", { name: "Alles stoppen" }));
  await tabTo(
    page,
    thisBrowser.getByRole("button", { name: "Ordner wählen", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expect(runtimeState(page, "läuft")).toBeVisible();

  /** Without a type that is on, the list of the types is open */
  const blueprintType = thisBrowser.getByRole("checkbox", {
    name: "Blueprint erhalten",
    exact: true,
  });
  await tabTo(page, blueprintType);
  await page.keyboard.press("Space");
  await expect(blueprintType).toBeChecked();

  await tabTo(
    page,
    sharedWithOthers.getByRole("button", { name: "Neue Freigabe" }),
  );
  await page.keyboard.press("Enter");
  await expect(
    sharedWithOthers.getByRole("form", { name: "Neue Freigabe" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(sharingPopover(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();

  /**
   * The Log Analyzer opens the popover with a request for older entries. The
   * focus goes into the request, at the latest with the next Tab, and its
   * first button is not the upload.
   */
  await page.getByRole("button", { name: "Ältere Einträge teilen" }).focus();
  await page.keyboard.press("Enter");
  const request = sharingPopover(page).getByRole("region", {
    name: "Ältere Einträge hochladen?",
  });
  /** The type of the entry is on since the last minute, thus the entry counts */
  await expect(
    request.getByRole("button", { name: "1 Eintrag hochladen" }),
  ).toBeVisible();

  const cancelButton = request.getByRole("button", { name: "Abbrechen" });
  if (
    !(await cancelButton.evaluate(
      (element) => element === document.activeElement,
    ))
  )
    await page.keyboard.press("Tab");
  await expect(cancelButton).toBeFocused();

  /** The end of the request moves the focus to the heading of its section */
  await page.keyboard.press("Enter");
  await expect(request).toHaveCount(0);
  await expect(
    thisBrowser.getByRole("heading", { name: "Dieser Browser", exact: true }),
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(sharingPopover(page)).toHaveCount(0);
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the action bar and the Log Analyzer open the sharing popover in a bottom sheet", async ({
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

    /** The top bar is hidden: the trigger is the item of the action bar */
    await expect(sharingPopoverTrigger(page)).toHaveCount(1);
    await openSharingPopover(page);
    await expect(
      sharingPopoverSection(page, SharingPopoverSection.Status),
    ).toBeVisible();
    await expect(
      sharingPopoverSection(page, SharingPopoverSection.SharedWithOthers),
    ).toBeVisible();
    await closeSharingPopover(page);

    /** The Log Analyzer asks for the folder in the same sheet */
    await page
      .getByRole("button", { name: "Remote Control Program öffnen" })
      .click();
    await pickLogFolderInPopover(page);
    await closeSharingPopover(page);
    await expect(
      page.getByRole("button", { name: "Remote Control Program öffnen" }),
    ).toHaveCount(0);
  });
});
