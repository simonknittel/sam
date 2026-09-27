import { prisma } from "@sam-monorepo/database";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../test/database";
import { countCitizensPerRole } from "./countCitizensPerRole";

/**
 * The scheduler starts the function at midnight in Europe/Berlin. The first
 * day of a month makes sure that the counted day rolls back into the month
 * before.
 */
const MIDNIGHT = new Date("2026-10-01T00:00:05+02:00");
const REPEATED_RUN = new Date("2026-10-01T00:30:00+02:00");
const COUNTED_DAY = "2026-09-30";

const readCounts = async () => {
  const rows = await prisma.roleCitizenCount.findMany({
    select: { day: true, count: true, role: { select: { name: true } } },
    orderBy: { role: { name: "asc" } },
  });

  return rows.map((row) => ({
    role: row.role.name,
    day: row.day.toISOString().slice(0, 10),
    count: row.count,
  }));
};

beforeEach(async () => {
  await truncateAllTables();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(MIDNIGHT);
});

afterEach(() => {
  vi.useRealTimers();
});

test("stores the counts under the day that just ended in Europe/Berlin", async () => {
  const pilot = await prisma.role.create({ data: { name: "Pilot" } });
  await prisma.role.create({ data: { name: "Quartermaster" } });
  await prisma.citizen.create({
    data: {
      handle: "citizen",
      roleAssignments: { create: { roleId: pilot.id } },
    },
  });
  await prisma.citizen.create({
    data: {
      handle: "deleted-citizen",
      deletedAt: new Date(),
      roleAssignments: { create: { roleId: pilot.id } },
    },
  });

  await countCitizensPerRole();

  expect(await readCounts()).toEqual([
    { role: "Pilot", day: COUNTED_DAY, count: 1 },
    { role: "Quartermaster", day: COUNTED_DAY, count: 0 },
  ]);
});

test("a second run in the same night keeps the counts of the first run", async () => {
  const pilot = await prisma.role.create({ data: { name: "Pilot" } });
  await prisma.citizen.create({
    data: {
      handle: "citizen",
      roleAssignments: { create: { roleId: pilot.id } },
    },
  });

  await countCitizensPerRole();

  await prisma.citizen.create({
    data: {
      handle: "late-citizen",
      roleAssignments: { create: { roleId: pilot.id } },
    },
  });
  vi.setSystemTime(REPEATED_RUN);
  await countCitizensPerRole();

  expect(await readCounts()).toEqual([
    { role: "Pilot", day: COUNTED_DAY, count: 1 },
  ]);
});
