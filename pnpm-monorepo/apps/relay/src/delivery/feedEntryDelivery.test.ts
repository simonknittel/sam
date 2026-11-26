import { trace } from "@opentelemetry/api";
import type {
  ApplicationContext,
  CitizenRealtimeEvent,
  FeedLogEntry,
  WatchingViewer,
} from "@sam-monorepo/application";
import {
  CapabilityId,
  CitizenRealtimeChannel,
  FEED_DELIVERY_EVENT_NAME,
  feedDeliveryEventPayloadSchema,
} from "@sam-monorepo/domain";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createFeedEntryDelivery } from "./feedEntryDelivery.js";

const OWNER_ID = "owner";
const VIEWER_ID = "viewer";
const OTHER_VIEWER_ID = "other-viewer";
const START = new Date("2026-11-23T20:00:00.000Z");
const UNLIMITED = { start: null, end: null };
const MAXIMUM_EVENT_PAYLOAD_BYTES = 100 * 1_024;

let entryNumber = 0;

const createEntry = (
  eventAt = START,
  rawLine = "<2026-11-23T20:00:00.000Z> [Notice] <Join PU> address[<IP>]",
): FeedLogEntry => {
  entryNumber += 1;
  return {
    // The delivery sorts the entries of one time by the id
    id: `entry${String(entryNumber).padStart(8, "0")}`,
    owner: { id: OWNER_ID, handle: "Owner" },
    type: "joinPu",
    rawLine,
    eventAt,
    lineNumber: entryNumber,
    hash: entryNumber.toString(16).padStart(64, "0"),
    createdAt: START,
  };
};

const createEntries = (count: number) =>
  Array.from({ length: count }, () => createEntry());

const setUp = ({
  maximumEventPayloadBytes = MAXIMUM_EVENT_PAYLOAD_BYTES,
}: { readonly maximumEventPayloadBytes?: number } = {}) => {
  const publications: CitizenRealtimeEvent[][] = [];
  let failingPublications = 0;
  let viewers: WatchingViewer[] = [
    { viewerCitizenId: VIEWER_ID, visibleTimeRange: UNLIMITED },
  ];

  const findWatchingViewers = vi.fn(async () => viewers);
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const context = {
    log,
    tracer: trace.getTracer("test"),
    realtime: {
      terminateUserConnections: async () => undefined,
      publishToCitizens: async (events: readonly CitizenRealtimeEvent[]) => {
        if (failingPublications > 0) {
          failingPublications -= 1;
          throw new Error("The realtime server cannot be reached");
        }
        publications.push([...events]);
      },
    },
  } as Partial<ApplicationContext> as ApplicationContext;

  const delivery = createFeedEntryDelivery({
    context,
    maximumEventPayloadBytes,
    findWatchingViewers,
  });

  return {
    delivery,
    log,
    findWatchingViewers,
    publications,
    setViewers: (nextViewers: WatchingViewer[]) => {
      viewers = nextViewers;
    },
    failNextPublications: (count: number) => {
      failingPublications = count;
    },
    deliver: (entries: readonly FeedLogEntry[]) => {
      delivery.deliver({
        ownerCitizenId: OWNER_ID,
        capabilityId: CapabilityId.LogEntries,
        entries,
      });
    },
  };
};

/** The payloads of one publication, as the consumer client reads them */
const parsePublication = (events: readonly CitizenRealtimeEvent[]) =>
  events.map((event) => {
    // The channel that refuses an admin who assumes the user
    expect(event.channel).toBe(CitizenRealtimeChannel.RemoteControlProgram);
    expect(event.name).toBe(FEED_DELIVERY_EVENT_NAME);
    return {
      citizenId: event.citizenId,
      payload: feedDeliveryEventPayloadSchema.parse(event.data),
    };
  });

const getEntryIds = (events: readonly CitizenRealtimeEvent[]) =>
  parsePublication(events).flatMap(({ payload }) =>
    payload.entries.map((entry) => entry.id),
  );

/** Runs the promise callbacks and the timers until this time */
const advance = (milliseconds: number) =>
  vi.advanceTimersByTimeAsync(milliseconds);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

test("sends a maximum of one publication to a viewer in 2 seconds", async () => {
  const { deliver, publications } = setUp();
  const first = createEntries(2);
  const second = createEntries(1);
  const third = createEntries(1);

  deliver(first);
  await advance(0);
  expect(publications).toHaveLength(1);
  expect(getEntryIds(publications[0] ?? [])).toEqual(
    first.map((entry) => entry.id),
  );

  await advance(500);
  deliver(second);
  await advance(500);
  deliver(third);
  await advance(900);
  expect(publications).toHaveLength(1);

  await advance(100);
  expect(publications).toHaveLength(2);
  const [event] = parsePublication(publications[1] ?? []);
  expect(event?.citizenId).toBe(VIEWER_ID);
  expect(event?.payload.entries.map((entry) => entry.id)).toEqual(
    [...second, ...third].map((entry) => entry.id),
  );
  expect(event?.payload.dropped_entry_count).toBe(0);
});

test("sends each viewer only the entries in its visible time range", async () => {
  const { deliver, publications, setViewers } = setUp();
  const grantStart = new Date(START.getTime() - 60_000);
  setViewers([
    { viewerCitizenId: VIEWER_ID, visibleTimeRange: UNLIMITED },
    {
      viewerCitizenId: OTHER_VIEWER_ID,
      visibleTimeRange: { start: grantStart, end: null },
    },
  ]);
  const olderEntry = createEntry(new Date(grantStart.getTime() - 1));
  const newerEntry = createEntry(grantStart);

  deliver([olderEntry, newerEntry]);
  await advance(0);

  const idsByViewer = new Map(
    publications
      .flatMap(parsePublication)
      .map(({ citizenId, payload }) => [
        citizenId,
        payload.entries.map((entry) => entry.id),
      ]),
  );
  expect(idsByViewer).toEqual(
    new Map([
      [VIEWER_ID, [olderEntry.id, newerEntry.id]],
      [OTHER_VIEWER_ID, [newerEntry.id]],
    ]),
  );
});

test("splits the entries into events below the size limit", async () => {
  const maximumEventPayloadBytes = 10 * 1_024;
  const { deliver, publications } = setUp({ maximumEventPayloadBytes });
  // Each character has 2 bytes in UTF-8
  const entries = Array.from({ length: 20 }, () =>
    createEntry(START, "é".repeat(1_000)),
  );

  deliver(entries);
  await advance(0);

  expect(publications).toHaveLength(1);
  const events = publications[0] ?? [];
  expect(events.length).toBeGreaterThan(1);
  for (const event of events)
    expect(
      Buffer.byteLength(JSON.stringify(event.data), "utf8"),
    ).toBeLessThanOrEqual(maximumEventPayloadBytes);
  expect(getEntryIds(events)).toEqual(entries.map((entry) => entry.id));
});

test("checks the access at each delivery", async () => {
  const { deliver, publications, setViewers, findWatchingViewers } = setUp();

  deliver(createEntries(1));
  await advance(0);
  expect(publications).toHaveLength(1);

  // The grant is revoked
  setViewers([]);
  deliver(createEntries(1));
  await advance(5_000);

  expect(findWatchingViewers).toHaveBeenCalledTimes(2);
  expect(publications).toHaveLength(1);
});

test("keeps the errors in the delivery and sends the entries again", async () => {
  const { delivery, deliver, publications, log, failNextPublications } =
    setUp();
  const entries = createEntries(2);
  failNextPublications(1);

  expect(() => {
    deliver(entries);
  }).not.toThrow();
  await advance(0);
  expect(publications).toHaveLength(0);
  expect(log.error).toHaveBeenCalledTimes(1);
  // No raw line and no hash in the log
  const logText = JSON.stringify(log.error.mock.calls, (_key, value) =>
    value instanceof Error ? value.message : (value as unknown),
  );
  for (const entry of entries) {
    expect(logText).not.toContain(entry.rawLine);
    expect(logText).not.toContain(entry.hash);
  }

  await advance(2_000);
  expect(publications).toHaveLength(1);
  expect(getEntryIds(publications[0] ?? [])).toEqual(
    entries.map((entry) => entry.id),
  );

  await delivery.close();
});

test("tells the viewer about the entries above the limit of its queue", async () => {
  const { deliver, publications } = setUp();

  deliver(createEntries(1));
  await advance(0);
  // 21 full batches in the interval. The queue keeps the newest 2,000 entries.
  const batches = Array.from({ length: 21 }, () => createEntries(100));
  for (const batch of batches) deliver(batch);
  await advance(2_000);

  expect(publications).toHaveLength(2);
  const events = parsePublication(publications[1] ?? []);
  expect(events[0]?.payload.dropped_entry_count).toBe(100);
  expect(getEntryIds(publications[1] ?? [])).toEqual(
    batches.slice(1).flatMap((batch) => batch.map((entry) => entry.id)),
  );
});

test("close() sends the waiting entries and stops the timers", async () => {
  const { delivery, deliver, publications } = setUp();
  const waitingEntries = createEntries(1);

  deliver(createEntries(1));
  await advance(0);
  deliver(waitingEntries);
  await delivery.close();

  expect(publications).toHaveLength(2);
  expect(getEntryIds(publications[1] ?? [])).toEqual(
    waitingEntries.map((entry) => entry.id),
  );
  expect(vi.getTimerCount()).toBe(0);

  deliver(createEntries(1));
  await advance(5_000);
  expect(publications).toHaveLength(2);
});
