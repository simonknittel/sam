import { prisma } from "@sam-monorepo/database";
import {
  containsIpAddress,
  createLogAnalyzerEntryHash,
  createLogEntryHash,
  getOldestLogAnalyzerEntryVersion,
  IP_ADDRESS_MARKER,
  IP_ADDRESS_PATTERN_SOURCES,
  LogAnalyzerEntryType,
  replaceIpAddresses,
  toLogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, test } from "vitest";
import { truncateAllTables } from "../../test/database.js";

/**
 * The M3 migration (see `docs/remote-control-program/migration.md`) on rows
 * of the old format: raw lines with IP addresses and the old hash. The
 * integration tests apply all migrations to an empty database, thus this test
 * runs the SQL of the migration file again on its own rows. The expected
 * values come from the TypeScript rule and the shared test data.
 */

const MIGRATION_FILE = new URL(
  "../../../database/prisma/migrations/20261123130000_log_analyzer_entry_ip_marker/migration.sql",
  import.meta.url,
);
const FIXTURES = new URL(
  "../../../../../remote-control-program-fixtures/",
  import.meta.url,
);

const readFixture = async <Value>(path: string) =>
  JSON.parse(await readFile(new URL(path, FIXTURES), "utf8")) as Value;

interface ExpectedMatches {
  readonly files: readonly {
    readonly matches: readonly {
      readonly type: string;
      readonly raw_line: string;
    }[];
  }[];
}

interface IpCases {
  readonly cases: readonly { readonly input: string }[];
}

const migrationSql = await readFile(MIGRATION_FILE, "utf8");
const { files } = await readFixture<ExpectedMatches>(
  "log-files/expected-matches.json",
);
/**
 * The migration ran in step 2 and does not change. PostgreSQL applies the IP
 * rule to characters, JavaScript to UTF-16 code units. Thus a character
 * outside the Basic Multilingual Plane between two addresses gives a
 * different line in SQL (see M3 in `docs/remote-control-program/migration.md`),
 * and the test leaves these cases out.
 */
const CHARACTER_OUTSIDE_BASIC_MULTILINGUAL_PLANE = /[\u{10000}-\u{10FFFF}]/u;

const ipCases = (
  await readFixture<IpCases>("ip-address-marker/cases.json")
).cases.filter(
  ({ input }) => !CHARACTER_OUTSIDE_BASIC_MULTILINGUAL_PLANE.test(input),
);

const toEntryType = (value: string) => {
  const type = toLogAnalyzerEntryType(value);
  if (!type) throw new Error(`Unknown type ${value}`);
  return type;
};

const matches = files
  .flatMap((file) => file.matches)
  .map((match) => ({ type: toEntryType(match.type), rawLine: match.raw_line }));

const OWNER_A = "owner-a";
const OWNER_B = "owner-b";
const EVENT_AT = new Date("2026-11-23T12:00:00.000Z");
const FIRST_CREATED_AT = new Date("2026-11-01T00:00:00.000Z");
const MILLISECONDS_PER_MINUTE = 60_000;

interface OldRow {
  readonly id: string;
  readonly type: LogAnalyzerEntryType;
  readonly rawLine: string;
  readonly createdById: string | null;
}

const matchId = (owner: string, index: number) => `${owner}-match-${index}`;

const getMatch = (index: number) => {
  const match = matches[index];
  if (!match) throw new Error(`The shared test data has no match ${index}`);
  return match;
};

/** A line with an IP address in the tag `address[…]` */
const joinPuIndex = matches.findIndex(
  ({ type, rawLine }) =>
    type === LogAnalyzerEntryType.JoinPu && rawLine.includes("address["),
);
const joinPuLine = getMatch(joinPuIndex).rawLine;
const joinPuLineWithOtherAddress = joinPuLine.replace(
  /address\[[^\]]*\]/,
  "address[192.0.2.200]",
);

/** The lines of a type that supersedes a different type (a V2 type) */
const newerVersionIndexes = matches.flatMap(({ type }, index) =>
  getOldestLogAnalyzerEntryVersion(type) === type ? [] : [index],
);
const [firstNewerVersionIndex, ...otherNewerVersionIndexes] =
  newerVersionIndexes;
if (
  firstNewerVersionIndex === undefined ||
  otherNewerVersionIndexes.length === 0
) {
  throw new Error("The shared test data needs two lines of a V2 type");
}

const copyWithOldestVersion = (index: number, id: string): OldRow => {
  const { type, rawLine } = getMatch(index);
  return {
    id,
    type: getOldestLogAnalyzerEntryVersion(type),
    rawLine,
    createdById: OWNER_A,
  };
};

/** Sorted by the time of creation, the oldest row first */
const OLD_ROWS: readonly OldRow[] = [
  /** Older than the V2 row of the same line: this V1 row stays */
  copyWithOldestVersion(firstNewerVersionIndex, "owner-a-oldest-version-first"),
  ...matches.map((match, index) => ({
    id: matchId(OWNER_A, index),
    ...match,
    createdById: OWNER_A,
  })),
  ...ipCases.map(({ input }, index) => ({
    id: `owner-a-ip-case-${index}`,
    type: LogAnalyzerEntryType.JoinPu,
    rawLine: input,
    createdById: OWNER_A,
  })),
  /** Only the IP address is different from an older row */
  {
    id: "owner-a-other-address",
    type: LogAnalyzerEntryType.JoinPu,
    rawLine: joinPuLineWithOtherAddress,
    createdById: OWNER_A,
  },
  /**
   * Newer than the V2 row of the same line: the V2 row stays and gets the
   * old hash of this row
   */
  ...otherNewerVersionIndexes.map((index) =>
    copyWithOldestVersion(index, `owner-a-oldest-version-${index}`),
  ),
  /** The same lines as owner A */
  ...matches.map((match, index) => ({
    id: matchId(OWNER_B, index),
    ...match,
    createdById: OWNER_B,
  })),
  /** Each type, thus also each `supersedes` chain of the code */
  ...Object.values(LogAnalyzerEntryType).map((type) => ({
    id: `owner-b-type-${type}`,
    type,
    rawLine: `<2026-11-23T12:00:00.000Z> [Notice] <${type}> address[192.0.2.1]`,
    createdById: OWNER_B,
  })),
  /** Rows without an owner (a deleted citizen) are never duplicates */
  {
    id: "no-owner-1",
    type: LogAnalyzerEntryType.JoinPu,
    rawLine: joinPuLine,
    createdById: null,
  },
  {
    id: "no-owner-2",
    type: LogAnalyzerEntryType.JoinPu,
    rawLine: joinPuLineWithOtherAddress,
    createdById: null,
  },
];

const runMigration = () => prisma.$executeRawUnsafe(migrationSql);

const readRows = () =>
  prisma.logAnalyzerEntry.findMany({
    select: {
      id: true,
      type: true,
      rawLine: true,
      hash: true,
      createdById: true,
    },
    orderBy: { createdAt: "asc" },
  });

/**
 * The TypeScript rule: the line with the marker, the new hash, and only the
 * oldest row of each owner and hash
 */
const calculateExpectedRows = async () => {
  const rows = await Promise.all(
    OLD_ROWS.map(async ({ id, type, rawLine, createdById }) => {
      const lineWithMarker = replaceIpAddresses(rawLine);
      return {
        id,
        type,
        rawLine: lineWithMarker,
        hash: await createLogEntryHash(type, lineWithMarker),
        createdById,
      };
    }),
  );

  const keptKeys = new Set<string>();
  return rows.filter(({ createdById, hash }) => {
    if (createdById === null) return true;

    const key = `${createdById}\n${hash}`;
    if (keptKeys.has(key)) return false;
    keptKeys.add(key);
    return true;
  });
};

beforeAll(async () => {
  await truncateAllTables();
  await prisma.citizen.createMany({
    data: [
      { id: OWNER_A, handle: OWNER_A },
      { id: OWNER_B, handle: OWNER_B },
    ],
  });
  await prisma.logAnalyzerEntry.createMany({
    data: await Promise.all(
      OLD_ROWS.map(async ({ id, type, rawLine, createdById }, index) => ({
        id,
        type,
        rawLine,
        eventAt: EVENT_AT,
        hash: await createLogAnalyzerEntryHash(type, rawLine),
        createdAt: new Date(
          FIRST_CREATED_AT.getTime() + index * MILLISECONDS_PER_MINUTE,
        ),
        createdById,
      })),
    ),
  });

  await runMigration();
});

afterAll(async () => {
  await truncateAllTables();
});

test("uses the IP rule of the domain package", () => {
  for (const source of IP_ADDRESS_PATTERN_SOURCES) {
    expect(migrationSql).toContain(`'${source}'`);
  }
  expect(migrationSql).toContain(`'\\1${IP_ADDRESS_MARKER}\\2'`);
});

test("gives the line with the marker and the new hash of the TypeScript rule", async () => {
  const rows = await readRows();

  expect(rows).toEqual(await calculateExpectedRows());
  for (const { rawLine } of rows) {
    expect(containsIpAddress(rawLine)).toBe(false);
  }
});

test("keeps only the oldest row when two rows of one owner get the same hash", async () => {
  const ids = new Set((await readRows()).map(({ id }) => id));

  expect(ids).toContain(matchId(OWNER_A, joinPuIndex));
  expect(ids).not.toContain("owner-a-other-address");

  expect(ids).toContain("owner-a-oldest-version-first");
  expect(ids).not.toContain(matchId(OWNER_A, firstNewerVersionIndex));
  for (const index of otherNewerVersionIndexes) {
    expect(ids).toContain(matchId(OWNER_A, index));
    expect(ids).not.toContain(`owner-a-oldest-version-${index}`);
  }

  for (const index of matches.keys()) {
    expect(ids).toContain(matchId(OWNER_B, index));
  }
  expect(ids).toContain("no-owner-1");
  expect(ids).toContain("no-owner-2");
});

test("changes nothing in a second run", async () => {
  const rowsAfterFirstRun = await readRows();

  await runMigration();

  expect(await readRows()).toEqual(rowsAfterFirstRun);
});
