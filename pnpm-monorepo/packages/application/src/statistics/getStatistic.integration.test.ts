import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import { beforeEach, expect, test } from "vitest";
import * as z from "zod";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError, ValidationError } from "../errors.js";
import {
  getStatistic,
  getStatisticInputSchema,
  type GetStatisticOutput,
} from "./getStatistic.js";
import { listStatistics } from "./listStatistics.js";
import { StatisticKey } from "./statisticCatalog.js";

/**
 * The use cases read the views of the schema `statistics`. The views give
 * the days until the real yesterday, and the clock of the test context
 * (`TEST_NOW`, 2026-06-15) is earlier, thus the rows of the days below are in
 * the views. The values of the views themselves are the subject of
 * `statisticsViews.integration.test.ts`.
 */

const FIRST_DAY = "2026-06-12";
const SECOND_DAY = "2026-06-13";
/** Yesterday of `TEST_NOW` */
const LAST_DAY = "2026-06-14";
const RANGE = { from: FIRST_DAY, to: LAST_DAY };
const DAYS = [FIRST_DAY, SECOND_DAY, LAST_DAY];

const { context } = createTestApplicationContext();

const reader = createTestActor({
  userId: "reader",
  permissionStrings: ["globalStatistics;read", "otherRole;read;roleId=*"],
});

const read = (
  actor: Actor,
  input: z.input<typeof getStatisticInputSchema>,
  testContext: ApplicationContext = context,
) => getStatistic(testContext, actor, getStatisticInputSchema.parse(input));

const createVariant = async (name: string) => {
  const manufacturer = await prisma.manufacturer.create({
    data: { name: `${name} Manufacturer` },
  });
  const series = await prisma.series.create({
    data: { name: `${name} Series`, manufacturerId: manufacturer.id },
  });

  return prisma.variant.create({ data: { name, seriesId: series.id } });
};

/** The rows of the snapshot tables and of the live tables for the range */
const seedStatistics = async () => {
  const carrack = await createVariant("Carrack");
  const polaris = await createVariant("Polaris");
  const cutlass = await createVariant("Cutlass");
  const pilot = await prisma.role.create({ data: { name: "Pilot" } });
  const secret = await prisma.role.create({ data: { name: "Geheim" } });
  const empty = await prisma.role.create({ data: { name: "Leer" } });

  await prisma.variantShipCount.createMany({
    data: [
      // Before the range
      { variantId: carrack.id, day: new Date("2026-06-11"), count: 9 },
      { variantId: carrack.id, day: new Date(FIRST_DAY), count: 2 },
      { variantId: carrack.id, day: new Date(SECOND_DAY), count: 3 },
      { variantId: carrack.id, day: new Date(LAST_DAY), count: 1 },
      // No row on the second day: no value
      { variantId: polaris.id, day: new Date(FIRST_DAY), count: 1 },
      { variantId: polaris.id, day: new Date(LAST_DAY), count: 4 },
      ...DAYS.map((day) => ({
        variantId: cutlass.id,
        day: new Date(day),
        count: 0,
      })),
    ],
  });
  await prisma.roleCitizenCount.createMany({
    data: [
      { roleId: pilot.id, day: new Date(LAST_DAY), count: 5 },
      { roleId: secret.id, day: new Date(LAST_DAY), count: 5 },
      { roleId: empty.id, day: new Date(LAST_DAY), count: 0 },
    ],
  });
  await prisma.dailyFleetValue.create({
    data: {
      day: new Date(SECOND_DAY),
      storeValueUsdCents: 100_050,
      inGameValueUsdCents: 20_000,
      unknownValueUsdCents: 3000,
      // Above the range of a 32-bit integer
      storeValueAuec: 4_000_000_000,
      inGameValueAuec: 500_000,
      unknownValueAuec: 60_000,
    },
  });
  await prisma.dailyLoginCount.createMany({
    data: [
      { date: new Date(FIRST_DAY), count: 12 },
      { date: new Date(LAST_DAY), count: 13 },
    ],
  });
  await prisma.dailyMcpUsageCount.create({
    data: { day: new Date(SECOND_DAY), count: 7 },
  });

  await prisma.citizen.createMany({
    data: [
      { handle: "first", createdAt: new Date("2026-06-12T10:00:00Z") },
      // 00:30 CEST on the last day
      { handle: "midnight", createdAt: new Date("2026-06-13T22:30:00Z") },
      {
        handle: "deleted",
        createdAt: new Date("2026-06-12T10:00:00Z"),
        deletedAt: new Date("2026-06-12T11:00:00Z"),
      },
    ],
  });
  await prisma.organization.create({
    data: {
      name: "Organization",
      spectrumId: "ORGANIZATION",
      createdAt: new Date("2026-06-13T12:00:00Z"),
    },
  });
  await prisma.user.createMany({
    data: [
      { createdAt: new Date("2026-06-12T08:00:00Z") },
      { createdAt: null },
    ],
  });
  await prisma.event.createMany({
    data: [
      { startTime: new Date("2026-06-14T12:00:00Z") },
      {
        startTime: new Date("2026-06-13T12:00:00Z"),
        deletedAt: new Date("2026-06-13T13:00:00Z"),
      },
    ].map((event) => ({ ...event, source: EventSource.APP, name: "Event" })),
  });
  // The receiver is created now, thus after the range
  const receiver = await prisma.citizen.create({
    data: { handle: "receiver" },
  });
  await prisma.silcTransaction.createMany({
    data: [
      { value: 20, createdAt: new Date("2026-06-12T10:00:00Z") },
      { value: -5, createdAt: new Date("2026-06-12T11:00:00Z") },
      {
        value: 50,
        createdAt: new Date("2026-06-13T10:00:00Z"),
        deletedAt: new Date("2026-06-13T11:00:00Z"),
      },
      { value: 100, createdAt: new Date("2026-06-14T10:00:00Z") },
    ].map((transaction) => ({ ...transaction, receiverId: receiver.id })),
  });

  return { carrack, polaris, cutlass, pilot, secret };
};

let seeded: Awaited<ReturnType<typeof seedStatistics>>;

beforeEach(async () => {
  await truncateAllTables();
  seeded = await seedStatistics();
});

const single = (
  key: StatisticKey,
  name: string,
  values: (number | null)[],
) => ({
  series: [{ id: key, name, values }],
  total_series: 1,
});

const fleetValue = ({
  store,
  inGame,
  unknown,
}: {
  readonly store: number;
  readonly inGame: number;
  readonly unknown: number;
}) => ({
  series: [
    {
      id: "total",
      name: "Gesamt",
      values: [null, store + inGame + unknown, null],
    },
    { id: "store", name: "Store", values: [null, store, null] },
    { id: "in_game", name: "In-game", values: [null, inGame, null] },
    { id: "unknown", name: "Nicht angegeben", values: [null, unknown, null] },
  ],
  total_series: 4,
});

test("list_statistics gives the 12 statistics, and get_statistic gives the values of the views for each of them", async () => {
  const { carrack, polaris, pilot, secret } = seeded;
  const expected: Record<
    StatisticKey,
    Pick<GetStatisticOutput, "series" | "total_series">
  > = {
    [StatisticKey.FleetTotal]: single(
      StatisticKey.FleetTotal,
      "Flotte gesamt",
      [3, 3, 5],
    ),
    // The highest last value first. Cutlass has no value above 0.
    [StatisticKey.ShipsPerVariant]: {
      series: [
        { id: polaris.id, name: "Polaris", values: [1, null, 4] },
        { id: carrack.id, name: "Carrack", values: [2, 3, 1] },
      ],
      total_series: 2,
    },
    [StatisticKey.FleetValueUsd]: fleetValue({
      store: 100_050,
      inGame: 20_000,
      unknown: 3000,
    }),
    [StatisticKey.FleetValueAuec]: fleetValue({
      store: 4_000_000_000,
      inGame: 500_000,
      unknown: 60_000,
    }),
    [StatisticKey.Logins]: single(StatisticKey.Logins, "Logins", [
      12,
      null,
      13,
    ]),
    [StatisticKey.Citizens]: single(
      StatisticKey.Citizens,
      "Citizens",
      [1, 1, 2],
    ),
    [StatisticKey.Organizations]: single(
      StatisticKey.Organizations,
      "Organisationen",
      [0, 1, 1],
    ),
    [StatisticKey.RegisteredUsers]: single(
      StatisticKey.RegisteredUsers,
      "Registrierte Benutzer",
      [1, 1, 1],
    ),
    // The same last value: the name breaks the tie
    [StatisticKey.CitizensPerRole]: {
      series: [
        { id: secret.id, name: "Geheim", values: [null, null, 5] },
        { id: pilot.id, name: "Pilot", values: [null, null, 5] },
      ],
      total_series: 2,
    },
    [StatisticKey.Events]: single(StatisticKey.Events, "Events", [0, 0, 1]),
    [StatisticKey.NewSilc]: single(StatisticKey.NewSilc, "SILC", [20, 0, 100]),
    [StatisticKey.McpUsage]: single(StatisticKey.McpUsage, "MCP-Nutzung", [
      null,
      7,
      null,
    ]),
  };

  const catalog = await listStatistics(context, reader);
  expect(catalog).toMatchObject({
    first_day: "2025-12-02",
    last_day: LAST_DAY,
  });
  expect(catalog.statistics.map((statistic) => statistic.key)).toEqual(
    Object.values(StatisticKey),
  );

  for (const statistic of catalog.statistics)
    expect(await read(reader, { key: statistic.key, ...RANGE })).toEqual({
      key: statistic.key,
      unit: statistic.unit,
      ...RANGE,
      days: DAYS,
      ...expected[statistic.key],
    });
});

test("the range is the last 30 days until yesterday by default, ends at the latest yesterday, starts at the earliest on the first day, and has at most 366 days", async () => {
  expect(await read(reader, { key: StatisticKey.Logins })).toMatchObject({
    from: "2026-05-16",
    to: LAST_DAY,
    days: expect.arrayContaining(DAYS),
    series: [{ values: expect.arrayContaining([12, 13]) }],
  });
  expect((await read(reader, { key: StatisticKey.Logins })).days).toHaveLength(
    30,
  );
  expect(
    await read(reader, {
      key: StatisticKey.Logins,
      from: SECOND_DAY,
      to: "2026-12-31",
    }),
  ).toMatchObject({
    from: SECOND_DAY,
    to: LAST_DAY,
    days: [SECOND_DAY, LAST_DAY],
  });
  expect(
    await read(reader, {
      key: StatisticKey.Logins,
      from: "2025-01-01",
      to: "2025-12-03",
    }),
  ).toMatchObject({
    from: "2025-12-02",
    to: "2025-12-03",
    days: ["2025-12-02", "2025-12-03"],
  });

  await expect(
    read(reader, { key: StatisticKey.Logins, to: "2025-12-01" }),
  ).rejects.toThrow(ValidationError);
  await expect(
    read(reader, { key: StatisticKey.Logins, from: LAST_DAY, to: FIRST_DAY }),
  ).rejects.toThrow(ValidationError);

  // Yesterday is 2026-12-03
  const { context: laterContext } = createTestApplicationContext({
    now: new Date("2026-12-04T10:00:00Z"),
  });
  expect(
    (
      await read(
        reader,
        { key: StatisticKey.Logins, from: "2025-12-02", to: "2026-12-02" },
        laterContext,
      )
    ).days,
  ).toHaveLength(366);
  await expect(
    read(
      reader,
      { key: StatisticKey.Logins, from: "2025-12-02" },
      laterContext,
    ),
  ).rejects.toThrow(/has 367 days/);
});

test("the series limit keeps the series with the highest last value, and the ids give only their series", async () => {
  const { carrack, polaris, cutlass } = seeded;

  expect(
    await read(reader, {
      key: StatisticKey.ShipsPerVariant,
      ...RANGE,
      series_limit: 1,
    }),
  ).toMatchObject({
    series: [{ id: polaris.id }],
    total_series: 2,
  });
  // An item of the filter also with only 0
  expect(
    await read(reader, {
      key: StatisticKey.ShipsPerVariant,
      ...RANGE,
      ids: [cutlass.id],
    }),
  ).toMatchObject({
    series: [{ id: cutlass.id, name: "Cutlass", values: [0, 0, 0] }],
    total_series: 1,
  });
  expect(
    await read(reader, {
      key: StatisticKey.ShipsPerVariant,
      ...RANGE,
      ids: [carrack.id, "unknownvariant"],
    }),
  ).toMatchObject({ series: [{ id: carrack.id }], total_series: 1 });

  await expect(
    read(reader, { key: StatisticKey.Logins, ids: [carrack.id] }),
  ).rejects.toThrow(ValidationError);
});

test("an actor without globalStatistics;read gets the permission error", async () => {
  const outsider = createTestActor({
    userId: "outsider",
    permissionStrings: ["otherRole;read;roleId=*"],
  });

  await expect(listStatistics(context, outsider)).rejects.toThrow(
    ForbiddenError,
  );
  await expect(read(outsider, { key: StatisticKey.Logins })).rejects.toThrow(
    ForbiddenError,
  );
});

test("the role statistic gives only the roles that the actor can see, also through the ids", async () => {
  const { pilot, secret } = seeded;
  const pilotReader = createTestActor({
    userId: "pilot-reader",
    permissionStrings: [
      "globalStatistics;read",
      `otherRole;read;roleId=${pilot.id}`,
    ],
  });

  expect(
    await read(pilotReader, { key: StatisticKey.CitizensPerRole, ...RANGE }),
  ).toMatchObject({ series: [{ id: pilot.id }], total_series: 1 });
  expect(
    await read(pilotReader, {
      key: StatisticKey.CitizensPerRole,
      ...RANGE,
      ids: [secret.id],
    }),
  ).toMatchObject({ series: [], total_series: 0 });
  expect(
    await read(pilotReader, {
      key: StatisticKey.CitizensPerRole,
      ...RANGE,
      ids: [secret.id, pilot.id],
    }),
  ).toMatchObject({ series: [{ id: pilot.id }], total_series: 1 });
});
