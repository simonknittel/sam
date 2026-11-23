import { prisma } from "@sam-monorepo/database";
import { ShareGrantGranteeKind } from "@sam-monorepo/database/browser";
import {
  CapabilityId,
  createLogEntryHash,
  GrantOperation,
  LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import {
  CLEARED_USER,
  createCitizenWithPermissions,
} from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
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

const MINUTE_MILLISECONDS = 60 * 1000;
const HOUR_MILLISECONDS = 60 * MINUTE_MILLISECONDS;
const DAY_MILLISECONDS = 24 * HOUR_MILLISECONDS;

const getTimeBeforeNow = (milliseconds: number) =>
  new Date(TEST_NOW.getTime() - milliseconds);
const getTimeAfterNow = (milliseconds: number) =>
  new Date(TEST_NOW.getTime() + milliseconds);

const PERMISSIONS = [
  "login;manage",
  "remoteControlProgram;use",
  "logAnalyzer;read",
];

beforeEach(async () => {
  await truncateAllTables();
});

const createCitizen = (handle: string) =>
  createCitizenWithPermissions(handle, PERMISSIONS, [], CLEARED_USER);

const createViewer = async (permissionStrings = PERMISSIONS) => {
  const citizen = await createCitizen("viewer");

  return createTestActor({
    userId: citizen.userId!,
    citizen,
    permissionStrings,
  });
};

const createCitizenGrant = (
  ownerId: string,
  granteeCitizenId: string,
  validity: { startsAt: Date; endsAt?: Date; revokedAt?: Date },
) =>
  prisma.shareGrant.create({
    data: {
      ownerId,
      granteeKind: ShareGrantGranteeKind.citizen,
      granteeCitizenId,
      capabilityIds: [CapabilityId.LogEntries],
      operations: [GrantOperation.Read],
      ...validity,
    },
  });

const createJoinPuLine = (time: Date) =>
  `<${time.toISOString()}> [Notice] <Join PU> address[IP_REDACTED] port[64336] shard[pub_euw1b_10512345_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]`;

/** The relay stores the entry at `createdAt` */
const createEntryData = async (
  ownerId: string,
  eventAt: Date,
  createdAt = TEST_NOW,
) => {
  const rawLine = createJoinPuLine(eventAt);

  return {
    type: LogAnalyzerEntryType.JoinPu,
    rawLine,
    eventAt,
    lineNumber: 1,
    hash: await createLogEntryHash(LogAnalyzerEntryType.JoinPu, rawLine),
    createdById: ownerId,
    createdAt,
  };
};

const createEntry = async (ownerId: string, eventAt: Date, createdAt?: Date) =>
  prisma.logAnalyzerEntry.create({
    data: await createEntryData(ownerId, eventAt, createdAt),
  });

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

test("gives the own entries and the entries of the valid grants in their time range", async () => {
  const viewer = await createViewer();
  const viewerId = viewer.citizen!.id;
  const [grantOwner, endedGrantOwner, revokedGrantOwner, ownerWithoutGrant] =
    await Promise.all(
      [
        "grantOwner",
        "endedGrantOwner",
        "revokedGrantOwner",
        "ownerWithoutGrant",
      ].map(createCitizen),
    );
  // A start in the past shares the older entries from the start (decision 8)
  await createCitizenGrant(grantOwner!.id, viewerId, {
    startsAt: getTimeBeforeNow(2 * DAY_MILLISECONDS),
  });
  await createCitizenGrant(endedGrantOwner!.id, viewerId, {
    startsAt: getTimeBeforeNow(3 * DAY_MILLISECONDS),
    endsAt: getTimeBeforeNow(HOUR_MILLISECONDS),
  });
  await createCitizenGrant(revokedGrantOwner!.id, viewerId, {
    startsAt: getTimeBeforeNow(3 * DAY_MILLISECONDS),
    revokedAt: getTimeBeforeNow(HOUR_MILLISECONDS),
  });

  await createEntry(viewerId, getTimeBeforeNow(10 * DAY_MILLISECONDS));
  await createEntry(viewerId, getTimeBeforeNow(HOUR_MILLISECONDS));
  await createEntry(grantOwner!.id, getTimeBeforeNow(3 * DAY_MILLISECONDS));
  await createEntry(grantOwner!.id, getTimeBeforeNow(DAY_MILLISECONDS));
  await createEntry(grantOwner!.id, getTimeBeforeNow(HOUR_MILLISECONDS));
  await createEntry(
    endedGrantOwner!.id,
    getTimeBeforeNow(2 * DAY_MILLISECONDS),
  );
  await createEntry(
    revokedGrantOwner!.id,
    getTimeBeforeNow(2 * DAY_MILLISECONDS),
  );
  await createEntry(ownerWithoutGrant!.id, getTimeBeforeNow(HOUR_MILLISECONDS));
  const { context } = createTestApplicationContext();

  const snapshot = await readSnapshot(context, viewer);

  expect(summarize(snapshot.entries)).toEqual([
    { owner: "grantOwner", eventAt: getTimeBeforeNow(HOUR_MILLISECONDS) },
    { owner: "viewer", eventAt: getTimeBeforeNow(HOUR_MILLISECONDS) },
    { owner: "grantOwner", eventAt: getTimeBeforeNow(DAY_MILLISECONDS) },
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
  });

  // The time window of the Log Analyzer
  const window = await readSnapshot(context, viewer, {
    start: getTimeBeforeNow(2 * DAY_MILLISECONDS),
    end: getTimeBeforeNow(HOUR_MILLISECONDS),
  });
  expect(summarize(window.entries)).toEqual([
    { owner: "grantOwner", eventAt: getTimeBeforeNow(DAY_MILLISECONDS) },
  ]);
});

test("gives no data to a viewer without one of the two permissions", async () => {
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
});

test("gives the changes after the cursor", async () => {
  const viewer = await createViewer();
  const viewerId = viewer.citizen!.id;
  const grantOwner = await createCitizen("grantOwner");
  const ownerWithoutGrant = await createCitizen("ownerWithoutGrant");
  await createCitizenGrant(grantOwner.id, viewerId, {
    startsAt: getTimeBeforeNow(DAY_MILLISECONDS),
  });
  await createEntry(viewerId, getTimeBeforeNow(HOUR_MILLISECONDS));
  await createEntry(grantOwner.id, getTimeBeforeNow(HOUR_MILLISECONDS));

  const snapshot = await readSnapshot(
    createTestApplicationContext({ now: getTimeAfterNow(MINUTE_MILLISECONDS) })
      .context,
    viewer,
  );
  expect(snapshot.entries).toHaveLength(2);

  const arrivedAt = getTimeAfterNow(2 * MINUTE_MILLISECONDS);
  await createEntry(viewerId, TEST_NOW, arrivedAt);
  await createEntry(grantOwner.id, TEST_NOW, arrivedAt);
  await createEntry(ownerWithoutGrant.id, TEST_NOW, arrivedAt);
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
        createEntryData(viewerId, getTimeBeforeNow((index + 1) * 1_000)),
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
