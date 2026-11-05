import { prisma } from "@sam-monorepo/database";
import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { ForbiddenError } from "../errors.js";
import { MAXIMUM_SHARED_ENTRIES_PER_REQUEST } from "./findSharedLogAnalyzerEntries.js";
import { findSharedLogAnalyzerEntriesInRange } from "./findSharedLogAnalyzerEntriesInRange.js";

const SHARING_ENABLED = { isSharingDisabled: false };

const createEntry = (index: number, eventAt: Date) =>
  prisma.logAnalyzerEntry.create({
    data: {
      type: LogAnalyzerEntryType.JoinPu,
      rawLine: `line ${index}`,
      eventAt,
      hash: `hash-${index}`,
    },
  });

const createReader = () =>
  createTestActor({ permissionStrings: ["logAnalyzer;read"] });

beforeEach(async () => {
  await truncateAllTables();
});

test("gives only the entries of the range, the newest first", async () => {
  await createEntry(1, new Date("2026-03-01T00:00:00.000Z"));
  await createEntry(2, new Date("2026-03-02T00:00:00.000Z"));
  await createEntry(3, new Date("2026-03-02T12:00:00.000Z"));
  await createEntry(4, new Date("2026-03-03T00:00:00.000Z"));
  const { context } = createTestApplicationContext();

  const { entries, nextCursorId } = await findSharedLogAnalyzerEntriesInRange(
    context,
    createReader(),
    {
      from: new Date("2026-03-02T00:00:00.000Z"),
      to: new Date("2026-03-03T00:00:00.000Z"),
    },
    SHARING_ENABLED,
  );

  expect(entries.map((entry) => entry.rawLine)).toEqual(["line 3", "line 2"]);
  expect(nextCursorId).toBeNull();
});

test("pages through all entries of a range", async () => {
  const extraEntryCount = 3;
  const entryCount = MAXIMUM_SHARED_ENTRIES_PER_REQUEST + extraEntryCount;
  const eventAt = new Date("2026-03-02T12:00:00.000Z");

  await prisma.logAnalyzerEntry.createMany({
    data: Array.from({ length: entryCount }, (_value, index) => ({
      type: LogAnalyzerEntryType.JoinPu,
      rawLine: `line ${index}`,
      eventAt,
      hash: `hash-${index}`,
    })),
  });
  const { context } = createTestApplicationContext();

  const firstPage = await findSharedLogAnalyzerEntriesInRange(
    context,
    createReader(),
    { from: new Date("2026-03-01T00:00:00.000Z") },
    SHARING_ENABLED,
  );
  const lastPage = await findSharedLogAnalyzerEntriesInRange(
    context,
    createReader(),
    {
      from: new Date("2026-03-01T00:00:00.000Z"),
      cursorId: firstPage.nextCursorId ?? undefined,
    },
    SHARING_ENABLED,
  );

  expect(firstPage.entries).toHaveLength(MAXIMUM_SHARED_ENTRIES_PER_REQUEST);
  expect(lastPage.entries).toHaveLength(extraEntryCount);
  expect(lastPage.nextCursorId).toBeNull();

  const rawLines = new Set(
    [...firstPage.entries, ...lastPage.entries].map((entry) => entry.rawLine),
  );
  expect(rawLines.size).toBe(entryCount);
});

test("the kill switch closes the query", async () => {
  const { context } = createTestApplicationContext();

  await expect(
    findSharedLogAnalyzerEntriesInRange(
      context,
      createReader(),
      { from: new Date("2026-03-01T00:00:00.000Z") },
      { isSharingDisabled: true },
    ),
  ).rejects.toThrow(ForbiddenError);
});
