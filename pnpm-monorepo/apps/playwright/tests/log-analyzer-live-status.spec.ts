import type { Page } from "@playwright/test";
import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { createCitizen, createLogAnalyzerEntry } from "../fixtures/factories";
import { toggleLabel } from "../fixtures/interactions";
import {
  appendLogLines,
  applyDateRange,
  closeSettings,
  daysAgo,
  joinPuLine,
  LIVE_MODE_PARSE_INTERVAL,
  LOG_ANALYZER_PAGE_PATH,
  LOG_ANALYZER_PERMISSIONS,
  openSettings,
  rowOf,
  selectFolder,
  SettingsColumn,
  settingsDialog,
  settingToggle,
  stubDirectoryPicker,
} from "../fixtures/log-analyzer";
import { expect, test } from "../fixtures/test";

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const MINUTES_PER_HOUR = 60;

/**
 * Without the panel the table takes the full width instead of three
 * quarters, thus it grows by a third. The factor leaves room for the gap.
 */
const TABLE_WIDTH_GROWTH_WITHOUT_PANEL = 1.25;

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
  await page.goto(LOG_ANALYZER_PAGE_PATH);
  await selectFolder(page);

  const panel = liveStatus(page);
  await expect(
    panel.getByRole("link", { name: "log-live-status" }),
  ).toBeVisible();
  await expect(panel.getByText("online", { exact: true })).toBeVisible();
  await expect(panel.getByText("Shard: EU 100")).toBeVisible();
  await expect(panel.getByText("Armistice Zone: Betreten")).toBeVisible();
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
  /** The armistice zone shows also outside of it */
  await expect(panel.getByText("Armistice Zone: Verlassen")).toBeVisible();
  await expect(panel.getByText("Contract: Bounty Hunt")).toBeVisible();

  /** A contract continues after the end of the session, a zone does not */
  await appendLogLines(page, [gameQuitLine(minutesAgo(0))]);
  await page.clock.fastForward(LIVE_MODE_PARSE_INTERVAL);

  await expect(panel.getByText(/^offline seit/)).toBeVisible();
  await expect(panel.getByText("Shard: EU 100")).toHaveCount(0);
  await expect(panel.getByText("Armistice Zone")).toHaveCount(0);
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
  await page.goto(LOG_ANALYZER_PAGE_PATH);
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

  /** The row is muted, and only a screen reader reads the word */
  await page.clock.fastForward(80 * MILLISECONDS_PER_MINUTE);
  await expect(panel.getByText("unsicher")).toHaveCount(1);

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
  /** The Live-Status stands next to the table from the `2xl` breakpoint */
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(LOG_ANALYZER_PAGE_PATH);

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

  const tableWidth = async () =>
    (await page.getByRole("table").boundingBox())?.width ?? 0;
  const tableWidthNextToPanel = await tableWidth();

  await toggleLabel(page, "Live-Status").click();
  await expect(panel).toHaveCount(0);
  /** Without the panel, the table takes the full width */
  await expect
    .poll(tableWidth)
    .toBeGreaterThan(tableWidthNextToPanel * TABLE_WIDTH_GROWTH_WITHOUT_PANEL);

  await toggleLabel(page, "Live-Status").click();
  await expect(panel).toBeVisible();

  await applyDateRange(page, daysAgo(3), daysAgo(2));
  await expect(
    panel.getByText(/für einen vergangenen Zeitraum ausgeblendet/),
  ).toBeVisible();
});
