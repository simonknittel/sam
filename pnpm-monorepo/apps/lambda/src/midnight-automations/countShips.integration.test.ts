import { prisma } from "@sam-monorepo/database";
import {
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@sam-monorepo/database/client";
import { ORG_ID } from "@sam-monorepo/domain";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../test/database";
import { countShips } from "./countShips";

/**
 * The scheduler starts the function at midnight in Europe/Berlin. The first
 * day of a month makes sure that the counted day rolls back into the month
 * before.
 */
const MIDNIGHT = new Date("2026-10-01T00:00:05+02:00");
const REPEATED_RUN = new Date("2026-10-01T00:30:00+02:00");
const COUNTED_DAY = "2026-09-30";

const createVariant = async (name: string) => {
  const manufacturer = await prisma.manufacturer.create({
    data: { name: `${name} Manufacturer` },
  });
  const series = await prisma.series.create({
    data: { name: `${name} Series`, manufacturerId: manufacturer.id },
  });

  return prisma.variant.create({
    data: { name, seriesId: series.id },
  });
};

const createMember = async (handle: string) => {
  const citizen = await prisma.citizen.create({ data: { handle } });
  await prisma.activeOrganizationMembership.create({
    data: {
      organizationId: ORG_ID,
      citizenId: citizen.id,
      type: OrganizationMembershipType.MAIN,
      visibility: OrganizationMembershipVisibility.PUBLIC,
    },
  });

  return citizen;
};

const readCounts = async () => {
  const rows = await prisma.variantShipCount.findMany({
    select: { day: true, count: true, variant: { select: { name: true } } },
    orderBy: { variant: { name: "asc" } },
  });

  return rows.map((row) => ({
    variant: row.variant.name,
    day: row.day.toISOString().slice(0, 10),
    count: row.count,
  }));
};

beforeEach(async () => {
  await truncateAllTables();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(MIDNIGHT);
  await prisma.organization.create({
    data: { id: ORG_ID, name: "Organization", spectrumId: "ORGANIZATION" },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

test("stores the counts under the day that just ended in Europe/Berlin", async () => {
  const carrack = await createVariant("Carrack");
  await createVariant("Polaris");
  const member = await createMember("member");
  await prisma.ship.createMany({
    data: [
      { ownerId: member.id, variantId: carrack.id },
      { ownerId: member.id, variantId: carrack.id, deletedAt: new Date() },
    ],
  });

  await countShips();

  expect(await readCounts()).toEqual([
    { variant: "Carrack", day: COUNTED_DAY, count: 1 },
    { variant: "Polaris", day: COUNTED_DAY, count: 0 },
  ]);
});

test("a second run in the same night keeps the counts of the first run", async () => {
  const carrack = await createVariant("Carrack");
  const member = await createMember("member");
  await prisma.ship.create({
    data: { ownerId: member.id, variantId: carrack.id },
  });

  await countShips();

  await prisma.ship.create({
    data: { ownerId: member.id, variantId: carrack.id },
  });
  vi.setSystemTime(REPEATED_RUN);
  await countShips();

  expect(await readCounts()).toEqual([
    { variant: "Carrack", day: COUNTED_DAY, count: 1 },
  ]);
});
