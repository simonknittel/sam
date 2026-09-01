import type { Locator, Page } from "@playwright/test";
import {
  createCitizen,
  createLogAnalyzerEntry,
  createUserWithoutCitizen,
  LogAnalyzerEntryType,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  toggleLabel,
} from "../fixtures/interactions";
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

/** Rows the table renders on top of its header row */
const HEADER_ROWS = 1;

/**
 * Replaces the folder picker of the browser, which no test can answer. The
 * handle gives back one log file with the given lines, so a parse finds one
 * entry for each of them.
 *
 * The app also stores the handle in IndexedDB, which fails for this object
 * because it carries functions. That happens after the parse started and the
 * app catches it, thus it only leaves a message in the console.
 */
const stubDirectoryPicker = (page: Page, lines: readonly string[]) =>
  page.addInitScript(
    (fileLines: string[]) => {
      const file = new File([fileLines.join("\n")], "Game.log", {
        type: "text/plain",
        lastModified: Date.now(),
      });

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
        },
      };

      Object.assign(window, {
        showDirectoryPicker: () => Promise.resolve(directoryHandle),
      });
    },
    [...lines],
  );

const sharingPopover = (page: Page) =>
  page.getByRole("dialog", { name: "Teilen", exact: true });

const openSharingPopover = (page: Page) =>
  clickUntilVisible(
    page.getByRole("button", { name: "Teilen", exact: true }),
    sharingPopover(page),
  );

const closePopover = async (page: Page) => {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
};

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
  await expect(page.getByRole("heading", { name: "Anleitung" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(tableRows(page)).toHaveCount(0);

  await openSharingPopover(page);
  await toggleLabel(
    sharingPopover(page),
    "Einträge anderer Citizens anzeigen",
  ).click();
  await closePopover(page);

  /** No folder was ever chosen: the shared entries stand on their own */
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 3, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

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
  await openSharingPopover(page);
  await toggleLabel(sharingPopover(page), "log-teiler-2").click();
  await closePopover(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 2);
  await expect(page.getByText("Blueprint erhalten")).toHaveCount(0);

  await openSharingPopover(page);
  await sharingPopover(page)
    .getByRole("button", { name: "Alle anzeigen" })
    .click();
  await closePopover(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 3);

  /** Switching the setting off takes the entries of the others away again */
  await openSharingPopover(page);
  await toggleLabel(
    sharingPopover(page),
    "Einträge anderer Citizens anzeigen",
  ).click();
  await closePopover(page);

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

  await openSharingPopover(page);
  await toggleLabel(sharingPopover(page), "Eigene Einträge teilen").click();
  /** One type stays out, to prove the selection decides what goes out */
  await toggleLabel(sharingPopover(page), "Shard-Beitritt").click();
  await closePopover(page);

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
    .poll(sharedTypes, { timeout: ACTION_FEEDBACK_TIMEOUT })
    .toEqual([
      LogAnalyzerEntryType.BlueprintReceivedNotification,
      LogAnalyzerEntryType.Disconnection,
    ]);
  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 3);

  /** A second cycle finds nothing new, thus it sends nothing */
  const secondCycleUploads = recordUploads(page);

  await refresh(page);
  await expect
    .poll(sharedTypes, { timeout: ACTION_FEEDBACK_TIMEOUT })
    .toEqual([
      LogAnalyzerEntryType.BlueprintReceivedNotification,
      LogAnalyzerEntryType.Disconnection,
    ]);
  expect(secondCycleUploads).toEqual([]);

  /** Turning a type on shares the entries of that type which are parsed */
  await openSharingPopover(page);
  await toggleLabel(sharingPopover(page), "Shard-Beitritt").click();
  await closePopover(page);

  await refresh(page);

  const allThreeTypes = [
    LogAnalyzerEntryType.JoinPu,
    LogAnalyzerEntryType.BlueprintReceivedNotification,
    LogAnalyzerEntryType.Disconnection,
  ];
  await expect
    .poll(sharedTypes, { timeout: ACTION_FEEDBACK_TIMEOUT })
    .toEqual(allThreeTypes);

  /**
   * A reload empties the set of sent entries, but the upload asks the server
   * for the hashes it already holds. None of the window goes out a second
   * time, and every row carries its badge again.
   */
  await page.reload();
  const reloadUploads = recordUploads(page);
  await selectFolder(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 3, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(
    rowOf(page, "Shard-Beitritt").getByText("Hochgeladen"),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect
    .poll(sharedTypes, { timeout: ACTION_FEEDBACK_TIMEOUT })
    .toEqual(allThreeTypes);
  expect(reloadUploads).toEqual([]);
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
    window.localStorage.setItem("log_analyzer_is_sharing_enabled", "true");
  });
  await stubDirectoryPicker(page, [
    joinPuLine(hoursAgo(2)),
    blueprintLine(hoursAgo(1)),
  ]);
  await page.goto(PAGE_PATH);

  await openSharingPopover(page);
  await expect(
    sharingPopover(page).getByRole("checkbox", {
      name: "Eigene Einträge teilen",
    }),
  ).toBeDisabled();
  await expect(
    sharingPopover(page).getByText(
      "Zum Teilen muss dein Account mit einem Spynet-Citizen verknüpft sein.",
    ),
  ).toBeVisible();
  await closePopover(page);

  await selectFolder(page);

  await expect(tableRows(page)).toHaveCount(HEADER_ROWS + 2, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  /** Own entries without a citizen carry a dash in the citizen column */
  await expect(rowOf(page, "Shard-Beitritt")).toContainText("-");
  expect(await prisma.logAnalyzerEntry.count()).toBe(0);
});
