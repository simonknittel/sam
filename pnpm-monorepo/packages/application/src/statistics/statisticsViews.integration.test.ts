import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import {
  addDaysToLocalDate,
  getLocalDatesOfRange,
  toDateColumnValue,
  toLocalDateKey,
} from "@sam-monorepo/domain";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { truncateAllTables } from "../../test/database.js";
import {
  FIRST_STATISTICS_DATE,
  FIRST_STATISTICS_DAY,
  getLastStatisticsDate,
} from "./statisticCatalog.js";

/**
 * The views of the schema `statistics` (migration `statistics_views`) and
 * the reader role of `prisma/statistics-reader-role.sql`. The views give the
 * days until yesterday, thus the rows of the tests are on fixed days in the
 * past. Only the checks of the last day use the date of the test run. The
 * first and the last day come from the catalog of the MCP tools, thus the
 * tests also prove that the SQL and the TypeScript agree.
 */

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** Yesterday in Europe/Berlin on the clock of the test run */
const lastDate = getLastStatisticsDate({ now: () => new Date() });
const YESTERDAY = toLocalDateKey(lastDate);
const yesterdayColumnValue = toDateColumnValue(lastDate);
const todayColumnValue = toDateColumnValue(addDaysToLocalDate(lastDate, 1));
const DAY_COUNT = getLocalDatesOfRange({
  start: FIRST_STATISTICS_DATE,
  end: lastDate,
}).length;

const monorepoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const readerRoleFile = fileURLToPath(
  new URL(
    "../../../database/prisma/statistics-reader-role.sql",
    import.meta.url,
  ),
);

const LIVE_TABLE_VIEWS = [
  "daily_citizen_totals",
  "daily_organization_totals",
  "daily_user_totals",
  "daily_event_counts",
  "daily_new_silc",
];

/**
 * The value column of a view for each day between two days (inclusive), by
 * the day. The filter is the filter of a reader, for example of a time range.
 */
const readDays = async (
  view: string,
  column: string,
  fromDay: string,
  toDay: string,
) => {
  const rows = await prisma.$queryRawUnsafe<
    { day: string; value: number | bigint }[]
  >(
    `SELECT "day"::text AS "day", ${column} AS "value" FROM statistics.${view} WHERE "day" BETWEEN $1::date AND $2::date ORDER BY "day"`,
    fromDay,
    toDay,
  );

  return Object.fromEntries(rows.map((row) => [row.day, row.value]));
};

const createVariant = async (name: string) => {
  const manufacturer = await prisma.manufacturer.create({
    data: { name: `${name} Manufacturer` },
  });
  const series = await prisma.series.create({
    data: { name: `${name} Series`, manufacturerId: manufacturer.id },
  });

  return prisma.variant.create({ data: { name, seriesId: series.id } });
};

/**
 * Runs the SQL file like an operator, with the superuser of the test
 * database. The error has the output of Prisma, thus a test can check the
 * message of the database.
 */
const executeSqlFile = async (path: string) => {
  const child = spawn(
    "pnpm",
    [
      "--filter",
      "@sam-monorepo/database",
      "exec",
      "prisma",
      "db",
      "execute",
      "--file",
      path,
    ],
    { cwd: monorepoRoot, env: process.env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));

  const [code] = await once(child, "exit");
  if (code !== 0)
    throw new Error(`prisma db execute exited with code ${code}: ${output}`);
};

beforeEach(async () => {
  await truncateAllTables();
});

test("gives the columns of the contract", async () => {
  const columns = await prisma.$queryRaw<
    { view: string; column: string; type: string }[]
  >`
    SELECT
      columns.table_name AS "view",
      columns.column_name AS "column",
      columns.data_type AS "type"
    FROM information_schema.columns
    JOIN information_schema.views
      ON views.table_schema = columns.table_schema
      AND views.table_name = columns.table_name
    WHERE columns.table_schema = 'statistics'
    ORDER BY columns.table_name, columns.ordinal_position
  `;

  const columnsByView = Map.groupBy(columns, (column) => column.view);

  expect(
    Object.fromEntries(
      Array.from(columnsByView, ([view, viewColumns]) => [
        view,
        viewColumns.map((column) => `${column.column} ${column.type}`),
      ]),
    ),
  ).toEqual({
    daily_citizen_totals: ["day date", "citizen_total integer"],
    daily_event_counts: ["day date", "event_count integer"],
    daily_fleet_values: [
      "day date",
      "store_value_usd_cents bigint",
      "in_game_value_usd_cents bigint",
      "unknown_value_usd_cents bigint",
      "store_value_auec bigint",
      "in_game_value_auec bigint",
      "unknown_value_auec bigint",
    ],
    daily_login_counts: ["day date", "login_count integer"],
    daily_mcp_usage_counts: ["day date", "audit_event_count integer"],
    daily_new_silc: ["day date", "new_silc bigint"],
    daily_organization_totals: ["day date", "organization_total integer"],
    daily_role_citizen_counts: [
      "day date",
      "role_id text",
      "role_name text",
      "citizen_count integer",
    ],
    daily_ship_counts: [
      "day date",
      "variant_id text",
      "variant_name text",
      "ship_count integer",
    ],
    daily_user_totals: ["day date", "user_total integer"],
    roles: ["role_id text", "role_name text"],
    ship_variants: ["variant_id text", "variant_name text"],
  });
});

test("gives each live-table view one row for each day from the first day until yesterday", async () => {
  // Rows of today and of tomorrow do not give a day after yesterday
  await prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Event of tomorrow",
      startTime: new Date(Date.now() + MILLISECONDS_PER_DAY),
    },
  });
  await prisma.organization.create({
    data: { name: "Organization of today", spectrumId: "TODAY" },
  });

  for (const view of LIVE_TABLE_VIEWS) {
    const [range] = await prisma.$queryRawUnsafe<
      { dayCount: number; firstDay: string; lastDay: string }[]
    >(
      `SELECT count(*)::integer AS "dayCount", min("day")::text AS "firstDay", max("day")::text AS "lastDay" FROM statistics.${view}`,
    );

    expect({ view, ...range }).toEqual({
      view,
      dayCount: DAY_COUNT,
      firstDay: FIRST_STATISTICS_DAY,
      lastDay: YESTERDAY,
    });
  }
});

test("counts an event that is not deleted on its start day in Europe/Berlin, also around midnight UTC and on the days of the time change", async () => {
  await prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Deleted event",
      startTime: new Date("2026-03-12T12:00:00Z"),
      deletedAt: new Date("2026-03-12T13:00:00Z"),
    },
  });
  await prisma.event.createMany({
    data: [
      // 23:59:59 CET on 2026-03-10
      "2026-03-10T22:59:59Z",
      // Shortly before midnight UTC: 00:30 CET on 2026-03-11
      "2026-03-10T23:30:00Z",
      // The time change to summer time: 2026-03-29 has 23 hours
      "2026-03-28T23:00:00Z",
      "2026-03-29T21:59:59Z",
      "2026-03-29T22:00:00Z",
      // The time change to winter time: 2026-10-25 has 25 hours
      "2026-10-24T22:00:00Z",
      "2026-10-25T22:59:59Z",
    ].map((startTime) => ({
      source: EventSource.APP,
      name: "Event",
      startTime: new Date(startTime),
    })),
  });

  expect(
    await readDays(
      "daily_event_counts",
      "event_count",
      "2026-03-10",
      "2026-03-12",
    ),
  ).toEqual({ "2026-03-10": 1, "2026-03-11": 1, "2026-03-12": 0 });
  expect(
    await readDays(
      "daily_event_counts",
      "event_count",
      "2026-03-28",
      "2026-03-30",
    ),
  ).toEqual({ "2026-03-28": 0, "2026-03-29": 2, "2026-03-30": 1 });
  expect(
    await readDays(
      "daily_event_counts",
      "event_count",
      "2026-10-24",
      "2026-10-26",
    ),
  ).toEqual({ "2026-10-24": 0, "2026-10-25": 2, "2026-10-26": 0 });
});

test("sums the new SILC of each day without the deleted, the negative and the reset transactions", async () => {
  const receiver = await prisma.citizen.create({
    data: { handle: "receiver" },
  });
  await prisma.silcTransaction.createMany({
    data: [
      // 00:30 CEST on 2026-10-25
      { value: 20, createdAt: new Date("2026-10-24T22:30:00Z") },
      { value: -30, createdAt: new Date("2026-10-25T11:00:00Z") },
      {
        value: 50,
        createdAt: new Date("2026-10-25T12:00:00Z"),
        deletedAt: new Date("2026-10-25T13:00:00Z"),
      },
      {
        value: 40,
        createdAt: new Date("2026-10-25T14:00:00Z"),
        resetsNegativeBalance: true,
      },
      // 23:30 CET on 2026-10-25
      { value: 100, createdAt: new Date("2026-10-25T22:30:00Z") },
    ].map((transaction) => ({ ...transaction, receiverId: receiver.id })),
  });

  expect(
    await readDays("daily_new_silc", "new_silc", "2026-10-24", "2026-10-26"),
  ).toEqual({ "2026-10-24": 0n, "2026-10-25": 120n, "2026-10-26": 0n });
});

test("gives the running totals of the active citizens, the organizations and the users", async () => {
  await prisma.citizen.createMany({
    data: [
      // Before the first day of the statistics
      { handle: "early", createdAt: new Date("2025-11-20T10:00:00Z") },
      // 00:30 CET on 2026-03-11
      { handle: "midnight", createdAt: new Date("2026-03-10T23:30:00Z") },
      {
        handle: "deleted",
        createdAt: new Date("2026-03-11T12:00:00Z"),
        deletedAt: new Date("2026-03-11T13:00:00Z"),
      },
      { handle: "later", createdAt: new Date("2026-03-13T08:00:00Z") },
    ],
  });
  await prisma.organization.createMany({
    data: [
      { createdAt: new Date("2025-11-01T10:00:00Z") },
      // 23:30 CET on 2026-10-25, the day of the change to winter time
      { createdAt: new Date("2026-10-25T22:30:00Z") },
    ].map((organization, index) => ({
      ...organization,
      name: `Organization ${index}`,
      spectrumId: `ORGANIZATION${index}`,
    })),
  });
  await prisma.user.createMany({
    data: [
      // 00:30 CET on 2026-03-29, the day of the change to summer time
      { createdAt: new Date("2026-03-28T23:30:00Z") },
      { createdAt: null },
      // 00:30 CEST on 2026-03-30
      { createdAt: new Date("2026-03-29T22:30:00Z") },
    ],
  });

  expect(
    await readDays(
      "daily_citizen_totals",
      "citizen_total",
      "2026-03-10",
      "2026-03-13",
    ),
  ).toEqual({
    "2026-03-10": 1,
    "2026-03-11": 2,
    "2026-03-12": 2,
    "2026-03-13": 3,
  });
  expect(
    await readDays(
      "daily_citizen_totals",
      "citizen_total",
      YESTERDAY,
      YESTERDAY,
    ),
  ).toEqual({ [YESTERDAY]: 3 });
  expect(
    await readDays(
      "daily_organization_totals",
      "organization_total",
      FIRST_STATISTICS_DAY,
      FIRST_STATISTICS_DAY,
    ),
  ).toEqual({ [FIRST_STATISTICS_DAY]: 1 });
  expect(
    await readDays(
      "daily_organization_totals",
      "organization_total",
      "2026-10-24",
      "2026-10-26",
    ),
  ).toEqual({ "2026-10-24": 1, "2026-10-25": 2, "2026-10-26": 2 });
  expect(
    await readDays(
      "daily_user_totals",
      "user_total",
      "2026-03-28",
      "2026-03-30",
    ),
  ).toEqual({ "2026-03-28": 0, "2026-03-29": 1, "2026-03-30": 2 });
  expect(
    await readDays("daily_user_totals", "user_total", YESTERDAY, YESTERDAY),
  ).toEqual({ [YESTERDAY]: 2 });
});

test("gives the rows of the snapshot tables for the days of the statistics with the current names", async () => {
  const carrack = await createVariant("Carrack");
  const polaris = await createVariant("Polaris");
  const pilot = await prisma.role.create({ data: { name: "Pilot" } });
  const emptyRole = await prisma.role.create({ data: { name: "Empty" } });
  const beforeFirstDay = new Date("2025-12-01");
  const day = new Date("2026-10-24");

  await prisma.variantShipCount.createMany({
    data: [
      { variantId: carrack.id, day: beforeFirstDay, count: 3 },
      { variantId: carrack.id, day, count: 2 },
      { variantId: polaris.id, day, count: 0 },
      { variantId: carrack.id, day: yesterdayColumnValue, count: 4 },
      { variantId: carrack.id, day: todayColumnValue, count: 9 },
    ],
  });
  await prisma.variant.update({
    where: { id: carrack.id },
    data: { name: "Carrack Expedition" },
  });
  await prisma.roleCitizenCount.createMany({
    data: [
      { roleId: pilot.id, day, count: 5 },
      { roleId: emptyRole.id, day, count: 0 },
      { roleId: pilot.id, day: todayColumnValue, count: 6 },
    ],
  });
  await prisma.dailyLoginCount.createMany({
    data: [
      { date: beforeFirstDay, count: 1 },
      { date: day, count: 12 },
      { date: todayColumnValue, count: 13 },
    ],
  });
  await prisma.dailyMcpUsageCount.createMany({
    data: [
      { day, count: 7 },
      { day: todayColumnValue, count: 8 },
    ],
  });
  await prisma.dailyFleetValue.createMany({
    data: [day, todayColumnValue].map((valueDay) => ({
      day: valueDay,
      storeValueUsdCents: 100_000,
      inGameValueUsdCents: 20_000,
      unknownValueUsdCents: 3000,
      storeValueAuec: 4_000_000,
      inGameValueAuec: 500_000,
      unknownValueAuec: 60_000,
    })),
  });

  expect(
    await prisma.$queryRaw`
      SELECT "day"::text AS "day", variant_id, variant_name, ship_count
      FROM statistics.daily_ship_counts
      ORDER BY "day", variant_name
    `,
  ).toEqual([
    {
      day: "2026-10-24",
      variant_id: carrack.id,
      variant_name: "Carrack Expedition",
      ship_count: 2,
    },
    {
      day: "2026-10-24",
      variant_id: polaris.id,
      variant_name: "Polaris",
      ship_count: 0,
    },
    {
      day: YESTERDAY,
      variant_id: carrack.id,
      variant_name: "Carrack Expedition",
      ship_count: 4,
    },
  ]);
  expect(
    await prisma.$queryRaw`SELECT variant_id, variant_name FROM statistics.ship_variants`,
  ).toEqual([{ variant_id: carrack.id, variant_name: "Carrack Expedition" }]);
  expect(
    await prisma.$queryRaw`
      SELECT "day"::text AS "day", role_id, role_name, citizen_count
      FROM statistics.daily_role_citizen_counts
      ORDER BY role_name
    `,
  ).toEqual([
    {
      day: "2026-10-24",
      role_id: emptyRole.id,
      role_name: "Empty",
      citizen_count: 0,
    },
    {
      day: "2026-10-24",
      role_id: pilot.id,
      role_name: "Pilot",
      citizen_count: 5,
    },
  ]);
  expect(
    await prisma.$queryRaw`SELECT role_id, role_name FROM statistics.roles`,
  ).toEqual([{ role_id: pilot.id, role_name: "Pilot" }]);
  expect(
    await prisma.$queryRaw`SELECT "day"::text AS "day", login_count FROM statistics.daily_login_counts`,
  ).toEqual([{ day: "2026-10-24", login_count: 12 }]);
  expect(
    await prisma.$queryRaw`SELECT "day"::text AS "day", audit_event_count FROM statistics.daily_mcp_usage_counts`,
  ).toEqual([{ day: "2026-10-24", audit_event_count: 7 }]);
  expect(
    await prisma.$queryRaw`
      SELECT
        "day"::text AS "day",
        store_value_usd_cents,
        in_game_value_usd_cents,
        unknown_value_usd_cents,
        store_value_auec,
        in_game_value_auec,
        unknown_value_auec
      FROM statistics.daily_fleet_values
    `,
  ).toEqual([
    {
      day: "2026-10-24",
      store_value_usd_cents: 100_000n,
      in_game_value_usd_cents: 20_000n,
      unknown_value_usd_cents: 3000n,
      store_value_auec: 4_000_000n,
      in_game_value_auec: 500_000n,
      unknown_value_auec: 60_000n,
    },
  ]);
});

describe("the reader role", () => {
  const READER_PASSWORD = "reader-password";
  let serverAddress: string;
  let readerConnection: string;

  /**
   * The test opens the sessions of the reader role with `dblink` inside the
   * database server, because this package has no PostgreSQL client of its
   * own. The address of the container (not localhost) makes the server
   * check the password.
   */
  beforeAll(async () => {
    // Two times: the file must run again without an error
    await executeSqlFile(readerRoleFile);
    await executeSqlFile(readerRoleFile);
    await prisma.$executeRawUnsafe(
      `ALTER ROLE sam_statistics_grafana PASSWORD '${READER_PASSWORD}'`,
    );
    await prisma.$executeRawUnsafe("CREATE SCHEMA reader_session");
    await prisma.$executeRawUnsafe(
      "CREATE EXTENSION dblink SCHEMA reader_session",
    );

    const [server] = await prisma.$queryRaw<{ address: string }[]>`
      SELECT format(
        'host=%s port=%s dbname=%s',
        host(inet_server_addr()),
        inet_server_port(),
        current_database()
      ) AS "address"
    `;
    serverAddress = server!.address;
    readerConnection = `${serverAddress} user=sam_statistics_grafana password=${READER_PASSWORD}`;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe("DROP SCHEMA reader_session CASCADE");
  });

  /**
   * Runs the SQL in a new session of the reader role, and gives the first
   * column of each row as text
   */
  const queryAsReader = async (sql: string) => {
    const rows = await prisma.$queryRaw<{ value: string }[]>`
      SELECT "value" FROM reader_session.dblink(${readerConnection}, ${sql})
        AS remote("value" text)
    `;

    return rows.map((row) => row.value);
  };

  const execute = (connection: string, sql: string) =>
    prisma.$queryRaw`
      SELECT reader_session.dblink_exec(${connection}, ${sql})
    `;

  const executeAsReader = (sql: string) => execute(readerConnection, sql);

  /**
   * The functions of `pg_catalog` that the file revokes from PUBLIC, with the
   * rights of a role on them
   */
  const readFunctionRights = (role: string) =>
    prisma.$queryRaw<{ name: string; hasExecute: boolean }[]>`
      SELECT
        oid::regprocedure::text AS "name",
        has_function_privilege(${role}::name, oid, 'EXECUTE') AS "hasExecute"
      FROM pg_catalog.pg_proc
      WHERE pronamespace = 'pg_catalog'::regnamespace
        AND (
          proname LIKE '%advisory%'
          OR proname IN ('lo_creat', 'lo_create', 'lo_from_bytea', 'lo_put', 'lowrite', 'lo_truncate', 'lo_truncate64', 'pg_logical_emit_message')
        )
    `;

  /** All signatures of PostgreSQL 18, see the file */
  const REVOKED_FUNCTION_COUNT = 30;

  /**
   * Some functions of the jobs of TimescaleDB that the file revokes from
   * PUBLIC (each signature), with the rights of a role on them
   */
  const readJobFunctionRights = (role: string) =>
    prisma.$queryRaw<{ name: string; hasExecute: boolean }[]>`
      SELECT
        oid::regprocedure::text AS "name",
        has_function_privilege(${role}::name, oid, 'EXECUTE') AS "hasExecute"
      FROM pg_catalog.pg_proc
      WHERE (
          pronamespace = 'public'::regnamespace
          AND proname IN ('add_job', 'alter_job', 'delete_job', 'run_job', 'add_retention_policy', 'add_continuous_aggregate_policy')
        )
        OR (pronamespace = 'timescaledb_experimental'::regnamespace AND proname = 'add_policies')
        OR (pronamespace = '_timescaledb_functions'::regnamespace AND proname = 'start_background_workers')
    `;

  /** The functions of readJobFunctionRights in TimescaleDB 2.32 */
  const JOB_FUNCTION_COUNT = 8;

  test("reads each view", async () => {
    const views = await prisma.$queryRaw<{ name: string }[]>`
      SELECT table_name AS "name" FROM information_schema.views
      WHERE table_schema = 'statistics'
    `;
    expect(views).toHaveLength(12);

    for (const { name } of views) {
      expect(
        await queryAsReader(`SELECT count(*)::text FROM statistics.${name}`),
      ).toHaveLength(1);
    }
  });

  test("reads a view that a later migration makes", async () => {
    await prisma.$executeRawUnsafe(
      "CREATE VIEW statistics.later_view AS SELECT 1 AS answer",
    );

    try {
      expect(
        await queryAsReader("SELECT answer::text FROM statistics.later_view"),
      ).toEqual(["1"]);
    } finally {
      await prisma.$executeRawUnsafe("DROP VIEW statistics.later_view");
    }
  });

  test("cannot read a table of the schema public", async () => {
    await expect(
      queryAsReader('SELECT count(*)::text FROM public."Citizen"'),
    ).rejects.toThrow(/permission denied for table Citizen/);
  });

  test("cannot write, also not in a read-write transaction", async () => {
    const insert = `INSERT INTO public."Organization" ("id", "name", "spectrumId") VALUES ('organization', 'Organization', 'ORGANIZATION')`;

    await expect(executeAsReader(insert)).rejects.toThrow(
      /cannot execute INSERT in a read-only transaction/,
    );
    await expect(
      executeAsReader(`BEGIN READ WRITE; ${insert}; COMMIT`),
    ).rejects.toThrow(/permission denied for table Organization/);
    await expect(
      executeAsReader(
        "BEGIN READ WRITE; CREATE VIEW statistics.reader_view AS SELECT 1; COMMIT",
      ),
    ).rejects.toThrow(/permission denied for schema statistics/);
    await expect(
      executeAsReader(
        "BEGIN READ WRITE; CREATE TABLE public.reader_table (id integer); COMMIT",
      ),
    ).rejects.toThrow(/permission denied for schema public/);
    expect(
      await queryAsReader(
        "SELECT has_schema_privilege('public', 'CREATE')::text",
      ),
    ).toEqual(["false"]);
  });

  test("cannot hold an advisory lock, write a WAL message, make a large object or a temporary table", async () => {
    for (const lock of [
      // The lock of the SILC ledger (lockSilcLedger)
      "pg_advisory_lock(hashtext('SilcLedger'))",
      // The lock of prisma migrate
      "pg_try_advisory_lock(72707369)",
      "pg_advisory_xact_lock(hashtext('WikiPage_hierarchy'))",
    ])
      await expect(queryAsReader(`SELECT ${lock}::text`)).rejects.toThrow(
        /permission denied for function pg_(try_)?advisory_(xact_)?lock/,
      );
    // Without the revoke, both signatures write WAL also in a read-only
    // transaction
    for (const message of ["'message'", "'\\x01'::bytea"])
      await expect(
        queryAsReader(
          `SELECT pg_logical_emit_message(false, 'prefix', ${message})::text`,
        ),
      ).rejects.toThrow(
        /permission denied for function pg_logical_emit_message/,
      );
    await expect(
      executeAsReader(
        "BEGIN READ WRITE; SELECT lo_from_bytea(0, '\\x01'); COMMIT",
      ),
    ).rejects.toThrow(/permission denied for function lo_from_bytea/);
    await expect(
      executeAsReader(
        "BEGIN READ WRITE; CREATE TEMP TABLE reader_table (id integer); COMMIT",
      ),
    ).rejects.toThrow(/permission denied to create temporary tables/);

    const functionRights = await readFunctionRights("sam_statistics_grafana");
    expect(functionRights).toHaveLength(REVOKED_FUNCTION_COUNT);
    expect(functionRights.filter((right) => right.hasExecute)).toEqual([]);
  });

  test("cannot make a job of TimescaleDB, which would run in the background", async () => {
    await expect(
      executeAsReader(
        "BEGIN READ WRITE; SELECT add_job('pg_catalog.now', '1 hour', scheduled => false); COMMIT",
      ),
    ).rejects.toThrow(/permission denied for function add_job/);

    const jobFunctionRights = await readJobFunctionRights(
      "sam_statistics_grafana",
    );
    expect(jobFunctionRights).toHaveLength(JOB_FUNCTION_COUNT);
    expect(jobFunctionRights.filter((right) => right.hasExecute)).toEqual([]);
  });

  test("stops a long statement at the timeout, and limits the temporary files", async () => {
    const start = performance.now();

    await expect(queryAsReader("SELECT pg_sleep(30)::text")).rejects.toThrow(
      /canceling statement due to statement timeout/,
    );
    // The timeout of the role is 5 seconds
    expect(performance.now() - start).toBeLessThan(10_000);

    expect(await queryAsReader("SHOW temp_file_limit")).toEqual(["100MB"]);
    await expect(executeAsReader("SET temp_file_limit = -1")).rejects.toThrow(
      /permission denied to set parameter "temp_file_limit"/,
    );
  }, 20_000);

  test("removes the role defaults that a viewer changed, also the defaults for one database", async () => {
    const [database] = await prisma.$queryRaw<{ name: string }[]>`
      SELECT quote_ident(current_database()) AS "name"
    `;
    await executeAsReader(
      `BEGIN READ WRITE; ALTER ROLE CURRENT_USER SET statement_timeout = 0; ALTER ROLE CURRENT_USER SET work_mem = '1GB'; ALTER ROLE CURRENT_USER IN DATABASE ${database!.name} SET default_transaction_read_only = off; COMMIT`,
    );
    expect(await queryAsReader("SHOW default_transaction_read_only")).toEqual([
      "off",
    ]);

    await executeSqlFile(readerRoleFile);

    expect(
      await prisma.$queryRaw`
        SELECT setdatabase::integer AS "database", setconfig AS "settings"
        FROM pg_catalog.pg_db_role_setting
        WHERE setrole = 'sam_statistics_grafana'::regrole
      `,
    ).toEqual([
      {
        database: 0,
        settings: [
          "statement_timeout=5s",
          "default_transaction_read_only=on",
          "idle_in_transaction_session_timeout=10s",
          "temp_file_limit=100MB",
        ],
      },
    ]);
  });

  test("refuses to run when the role can make objects in the schema public", async () => {
    await prisma.$executeRawUnsafe("GRANT CREATE ON SCHEMA public TO PUBLIC");

    try {
      await expect(executeSqlFile(readerRoleFile)).rejects.toThrow(
        /The role sam_statistics_grafana has the right CREATE on the schema public/,
      );
    } finally {
      await prisma.$executeRawUnsafe(
        "REVOKE CREATE ON SCHEMA public FROM PUBLIC",
      );
    }
  });

  /**
   * A later version of PostgreSQL can add a signature that the file does not
   * revoke. The test makes such a signature: PUBLIC gets EXECUTE on each new
   * function.
   */
  test("refuses to run when PUBLIC can execute a signature that the file does not revoke", async () => {
    await prisma.$executeRawUnsafe(
      "CREATE FUNCTION pg_catalog.pg_advisory_lock(text) RETURNS void LANGUAGE sql AS 'SELECT'",
    );

    try {
      await expect(executeSqlFile(readerRoleFile)).rejects.toThrow(
        /PUBLIC can execute these functions of pg_catalog: pg_advisory_lock\(text\)/,
      );
    } finally {
      await prisma.$executeRawUnsafe(
        "DROP FUNCTION pg_catalog.pg_advisory_lock(text)",
      );
    }
  });

  /**
   * In production, the owner of the schema `statistics` is the role of the
   * app, which is not a superuser. The superuser of the test database is the
   * owner here, thus the test lends the schema to such a role.
   */
  test("gives the owner of the schema statistics the rights that it revokes from PUBLIC", async () => {
    const OWNER_PASSWORD = "owner-password";
    await prisma.$executeRawUnsafe(
      `CREATE ROLE statistics_owner LOGIN PASSWORD '${OWNER_PASSWORD}'`,
    );
    await prisma.$executeRawUnsafe(
      "ALTER SCHEMA statistics OWNER TO statistics_owner",
    );
    // The procedure of a job: TimescaleDB calls it with these two arguments
    await prisma.$executeRawUnsafe(
      "CREATE PROCEDURE public.statistics_owner_job(job_id integer, config jsonb) LANGUAGE sql AS 'SELECT 1'",
    );

    try {
      await executeSqlFile(readerRoleFile);

      expect(
        (await readFunctionRights("statistics_owner")).filter(
          (right) => !right.hasExecute,
        ),
      ).toEqual([]);
      expect(
        (await readJobFunctionRights("statistics_owner")).filter(
          (right) => !right.hasExecute,
        ),
      ).toEqual([]);
      await execute(
        `${serverAddress} user=statistics_owner password=${OWNER_PASSWORD}`,
        "BEGIN; SELECT pg_advisory_xact_lock(hashtext('SilcLedger')); SELECT pg_try_advisory_lock(72707369); CREATE TEMP TABLE owner_table (id integer); SELECT lo_from_bytea(0, '\\x01'); SELECT delete_job(add_job('public.statistics_owner_job', '1 hour', scheduled => false)); ROLLBACK",
      );
    } finally {
      await prisma.$executeRawUnsafe(
        "DROP PROCEDURE public.statistics_owner_job(integer, jsonb)",
      );
      await prisma.$executeRawUnsafe(
        "ALTER SCHEMA statistics OWNER TO CURRENT_USER",
      );
      // Also removes the rights and the default privileges of the role
      await prisma.$executeRawUnsafe("DROP OWNED BY statistics_owner");
      await prisma.$executeRawUnsafe("DROP ROLE statistics_owner");
    }
  });
});
