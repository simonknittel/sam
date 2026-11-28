import { prisma } from "@sam-monorepo/database";
import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { truncateAllTables } from "../../../test/database.js";
import {
  createCitizenActor,
  createClearedCitizen,
  createJoinPuLine,
  createLogEntryRow,
  createLogEntryRowData,
  createShareGrantRow,
  DAY_MILLISECONDS,
  getTimeAfterNow,
  getTimeBeforeNow,
  HOUR_MILLISECONDS,
  MINUTE_MILLISECONDS,
  toCitizenGrantee,
  VIEWER_PERMISSIONS,
} from "../../../test/remoteControlProgram.js";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { ForbiddenError } from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import type { FeedLogEntry } from "./feedLogEntry.js";
import {
  FeedEntryReadMode,
  MAXIMUM_FEED_ENTRIES_PER_READ,
  readFeedEntries,
  readFeedEntriesInputSchema,
} from "./readFeedEntries.js";

beforeEach(async () => {
  await truncateAllTables();
});

const createViewer = () => createCitizenActor("viewer");

const createCitizenGrant = (
  ownerId: string,
  granteeCitizenId: string,
  validity: { startsAt: Date; endsAt?: Date; revokedAt?: Date },
) => createShareGrantRow(ownerId, toCitizenGrantee(granteeCitizenId), validity);

const readSnapshot = (
  context: ApplicationContext,
  viewer: Actor,
  input: { start?: Date; end?: Date; page_cursor?: string } = {},
) =>
  readFeedEntries(
    context,
    viewer,
    readFeedEntriesInputSchema.parse({
      mode: FeedEntryReadMode.Snapshot,
      ...input,
    }),
  );

const readChanges = (
  context: ApplicationContext,
  viewer: Actor,
  cursor: string,
) =>
  readFeedEntries(
    context,
    viewer,
    readFeedEntriesInputSchema.parse({
      mode: FeedEntryReadMode.Changes,
      cursor,
    }),
  );

/** The owner and the time of each entry, newest first, in a fixed order */
const summarize = (entries: readonly FeedLogEntry[]) =>
  entries
    .map((entry) => ({ owner: entry.owner.handle, eventAt: entry.eventAt }))
    .toSorted(
      (first, second) =>
        second.eventAt.getTime() - first.eventAt.getTime() ||
        (first.owner ?? "").localeCompare(second.owner ?? ""),
    );

test("gives the own entries, the live entries of the valid grants and the history of all owners", async () => {
  const viewer = await createViewer();
  const viewerId = viewer.citizen!.id;
  const [
    grantOwner,
    endedGrantOwner,
    revokedGrantOwner,
    ownerWithoutGrant,
    deletedOwner,
  ] = await Promise.all(
    [
      "grantOwner",
      "endedGrantOwner",
      "revokedGrantOwner",
      "ownerWithoutGrant",
      "deletedOwner",
    ].map((handle) => createClearedCitizen(handle)),
  );
  await prisma.citizen.update({
    where: { id: deletedOwner!.id },
    data: { deletedAt: TEST_NOW, userId: null },
  });
  await createCitizenGrant(grantOwner!.id, viewerId, {
    startsAt: getTimeBeforeNow(90 * MINUTE_MILLISECONDS),
  });
  await createCitizenGrant(endedGrantOwner!.id, viewerId, {
    startsAt: getTimeBeforeNow(3 * DAY_MILLISECONDS),
    endsAt: getTimeBeforeNow(MINUTE_MILLISECONDS),
  });
  await createCitizenGrant(revokedGrantOwner!.id, viewerId, {
    startsAt: getTimeBeforeNow(3 * DAY_MILLISECONDS),
    revokedAt: getTimeBeforeNow(MINUTE_MILLISECONDS),
  });

  await createLogEntryRow(viewerId, getTimeBeforeNow(10 * DAY_MILLISECONDS));
  await createLogEntryRow(viewerId, getTimeBeforeNow(HOUR_MILLISECONDS));
  for (const owner of [
    grantOwner,
    endedGrantOwner,
    revokedGrantOwner,
    ownerWithoutGrant,
    deletedOwner,
  ]) {
    await createLogEntryRow(owner!.id, getTimeBeforeNow(HOUR_MILLISECONDS));
    await createLogEntryRow(
      owner!.id,
      getTimeBeforeNow(100 * MINUTE_MILLISECONDS),
    );
    await createLogEntryRow(owner!.id, getTimeBeforeNow(3 * HOUR_MILLISECONDS));
  }
  const { context } = createTestApplicationContext();

  const snapshot = await readSnapshot(context, viewer);

  const history = [
    "endedGrantOwner",
    "grantOwner",
    "ownerWithoutGrant",
    "revokedGrantOwner",
  ].map((owner) => ({
    owner,
    eventAt: getTimeBeforeNow(3 * HOUR_MILLISECONDS),
  }));
  expect(summarize(snapshot.entries)).toEqual([
    { owner: "grantOwner", eventAt: getTimeBeforeNow(HOUR_MILLISECONDS) },
    { owner: "viewer", eventAt: getTimeBeforeNow(HOUR_MILLISECONDS) },
    ...history,
    { owner: "viewer", eventAt: getTimeBeforeNow(10 * DAY_MILLISECONDS) },
  ]);
  expect(snapshot).toMatchObject({ hasMore: false, nextPageCursor: null });
  expect(snapshot.entries[0]).toEqual({
    id: expect.any(String),
    owner: { id: expect.any(String), handle: expect.any(String) },
    type: LogAnalyzerEntryType.JoinPu,
    rawLine: createJoinPuLine(getTimeBeforeNow(HOUR_MILLISECONDS)),
    eventAt: getTimeBeforeNow(HOUR_MILLISECONDS),
    lineNumber: 1,
    hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    createdAt: TEST_NOW,
    // An entry without the values of the header, for example of the capability version 1
    gameEnvironment: null,
    gameBuild: null,
  });

  // The time window of the Log Analyzer
  const window = await readSnapshot(context, viewer, {
    start: getTimeBeforeNow(2 * DAY_MILLISECONDS),
    end: getTimeBeforeNow(HOUR_MILLISECONDS),
  });
  expect(summarize(window.entries)).toEqual(history);

  // Admin mode replaces the permissions, but not the grants
  const admin = await createClearedCitizen("admin", []);
  const adminSnapshot = await readSnapshot(
    context,
    createTestActor({
      userId: admin.userId!,
      citizen: admin,
      adminMode: true,
    }),
  );
  expect(summarize(adminSnapshot.entries)).toEqual([
    ...history,
    { owner: "viewer", eventAt: getTimeBeforeNow(10 * DAY_MILLISECONDS) },
  ]);
});

test("gives no data to a viewer without one of the two permissions, and to an admin who assumes the viewer", async () => {
  const viewer = await createViewer();
  const { context } = createTestApplicationContext();

  await expect(
    readSnapshot(
      context,
      createTestActor({
        userId: viewer.userId,
        citizen: viewer.citizen,
        permissionStrings: ["remoteControlProgram;use"],
      }),
    ),
  ).rejects.toThrow(
    new ForbiddenError(
      RemoteControlProgramErrorMessage.ConsumerPermissionMissing,
    ),
  );
  await expect(
    readSnapshot(
      context,
      createTestActor({
        userId: viewer.userId,
        citizen: viewer.citizen,
        permissionStrings: ["logAnalyzer;read"],
      }),
    ),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.PermissionMissing),
  );
  await expect(
    readSnapshot(
      context,
      createTestActor({
        userId: viewer.userId,
        citizen: viewer.citizen,
        permissionStrings: VIEWER_PERMISSIONS,
        assumedByAdminId: "admin-user",
      }),
    ),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.AssumedUser),
  );
});

test("gives the changes after the cursor", async () => {
  const viewer = await createViewer();
  const viewerId = viewer.citizen!.id;
  const grantOwner = await createClearedCitizen("grantOwner");
  const ownerWithoutGrant = await createClearedCitizen("ownerWithoutGrant");
  await createCitizenGrant(grantOwner.id, viewerId, {
    startsAt: getTimeBeforeNow(DAY_MILLISECONDS),
  });
  await createLogEntryRow(viewerId, getTimeBeforeNow(HOUR_MILLISECONDS));
  await createLogEntryRow(grantOwner.id, getTimeBeforeNow(HOUR_MILLISECONDS));

  const snapshot = await readSnapshot(
    createTestApplicationContext({ now: getTimeAfterNow(MINUTE_MILLISECONDS) })
      .context,
    viewer,
  );
  expect(snapshot.entries).toHaveLength(2);

  const arrivedAt = getTimeAfterNow(2 * MINUTE_MILLISECONDS);
  await createLogEntryRow(viewerId, TEST_NOW, arrivedAt);
  await createLogEntryRow(grantOwner.id, TEST_NOW, arrivedAt);
  await createLogEntryRow(ownerWithoutGrant.id, TEST_NOW, arrivedAt);
  const later = createTestApplicationContext({
    now: getTimeAfterNow(3 * MINUTE_MILLISECONDS),
  }).context;

  const changes = await readChanges(later, viewer, snapshot.cursor);
  expect(summarize(changes.entries)).toEqual([
    { owner: "grantOwner", eventAt: TEST_NOW },
    { owner: "viewer", eventAt: TEST_NOW },
  ]);
  expect(changes).toMatchObject({ hasMore: false, nextPageCursor: null });
  await expect(readChanges(later, viewer, changes.cursor)).resolves.toEqual({
    entries: [],
    cursor: changes.cursor,
    hasMore: false,
    nextPageCursor: null,
  });

  // Shortly after the arrival, a later upload can still commit with an older arrival time, thus the cursor stays before the new entries
  const soonAfterArrival = createTestApplicationContext({
    now: new Date(arrivedAt.getTime() + 1_000),
  }).context;
  const earlyChanges = await readChanges(
    soonAfterArrival,
    viewer,
    snapshot.cursor,
  );
  expect(earlyChanges.entries).toHaveLength(2);
  await expect(
    readChanges(soonAfterArrival, viewer, earlyChanges.cursor),
  ).resolves.toMatchObject({ entries: changes.entries });
});

test("tells when a read has more entries than its maximum", async () => {
  const viewer = await createViewer();
  const viewerId = viewer.citizen!.id;
  await prisma.logAnalyzerEntry.createMany({
    data: await Promise.all(
      Array.from({ length: MAXIMUM_FEED_ENTRIES_PER_READ + 1 }, (_, index) =>
        createLogEntryRowData(viewerId, getTimeBeforeNow((index + 1) * 1_000)),
      ),
    ),
  });
  const { context } = createTestApplicationContext({
    now: getTimeAfterNow(HOUR_MILLISECONDS),
  });

  const firstPage = await readSnapshot(context, viewer);
  expect(firstPage.entries).toHaveLength(MAXIMUM_FEED_ENTRIES_PER_READ);
  expect(firstPage).toMatchObject({
    hasMore: true,
    nextPageCursor: expect.any(String),
  });
  const secondPage = await readSnapshot(context, viewer, {
    page_cursor: firstPage.nextPageCursor!,
  });
  expect(secondPage).toMatchObject({
    entries: [
      {
        eventAt: getTimeBeforeNow((MAXIMUM_FEED_ENTRIES_PER_READ + 1) * 1_000),
      },
    ],
    hasMore: false,
    nextPageCursor: null,
  });

  const changes = await readChanges(
    context,
    viewer,
    `${TEST_NOW.toISOString()}|`,
  );
  expect(changes.entries).toHaveLength(MAXIMUM_FEED_ENTRIES_PER_READ);
  expect(changes.hasMore).toBe(true);
  await expect(
    readChanges(context, viewer, changes.cursor),
  ).resolves.toMatchObject({
    entries: [expect.any(Object)],
    hasMore: false,
  });
});
