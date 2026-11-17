import { prisma } from "@sam-monorepo/database";
import {
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
  ShipAcquisitionSource,
} from "@sam-monorepo/database/client";
import { AuditEventType, ORG_ID } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import { createTestApplicationContext } from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { measureFleetValue } from "./measureFleetValue.js";

/** See `countShips.integration.test.ts` */
const MIDNIGHT = new Date("2026-10-01T00:00:05+02:00");
const REPEATED_RUN = new Date("2026-10-01T00:30:00+02:00");
const MEASURED_DAY = "2026-09-30";

/** The store prices in USD cents: USD 600 and USD 25 */
const CARRACK_PRICE = 60_000;
const AURORA_PRICE = 2_500;
/** Only the Carrack has an in-game price */
const CARRACK_AUEC_PRICE = 26_000_000;

const createVariant = async (
  name: string,
  storePriceUsdCents: number | null,
  inGamePriceAuec: number | null = null,
) => {
  const manufacturer = await prisma.manufacturer.create({
    data: { name: `${name} Manufacturer` },
  });
  const series = await prisma.series.create({
    data: { name: `${name} Series`, manufacturerId: manufacturer.id },
  });

  return prisma.variant.create({
    data: { name, seriesId: series.id, storePriceUsdCents, inGamePriceAuec },
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

const readValues = async () => {
  const rows = await prisma.dailyFleetValue.findMany({
    orderBy: { day: "asc" },
  });

  return rows.map((row) => ({
    day: row.day.toISOString().slice(0, 10),
    store: Number(row.storeValueUsdCents),
    inGame: Number(row.inGameValueUsdCents),
    unknown: Number(row.unknownValueUsdCents),
    storeAuec: Number(row.storeValueAuec),
  }));
};

beforeEach(async () => {
  await truncateAllTables();
  await prisma.organization.create({
    data: { id: ORG_ID, name: "Organization", spectrumId: "ORGANIZATION" },
  });
});

test("stores the value of each acquisition source under the day that just ended", async () => {
  const carrack = await createVariant(
    "Carrack",
    CARRACK_PRICE,
    CARRACK_AUEC_PRICE,
  );
  const aurora = await createVariant("Aurora", AURORA_PRICE);
  const withoutPrice = await createVariant("Polaris", null);
  const member = await createMember("member");
  const otherCitizen = await prisma.citizen.create({
    data: { handle: "other" },
  });
  await prisma.ship.createMany({
    data: [
      {
        ownerId: member.id,
        variantId: carrack.id,
        acquisitionSource: ShipAcquisitionSource.STORE,
      },
      {
        ownerId: member.id,
        variantId: aurora.id,
        acquisitionSource: ShipAcquisitionSource.STORE,
      },
      {
        ownerId: member.id,
        variantId: aurora.id,
        acquisitionSource: ShipAcquisitionSource.IN_GAME,
      },
      { ownerId: member.id, variantId: aurora.id },
      { ownerId: member.id, variantId: withoutPrice.id },
      {
        ownerId: member.id,
        variantId: carrack.id,
        acquisitionSource: ShipAcquisitionSource.STORE,
        deletedAt: MIDNIGHT,
      },
      {
        ownerId: otherCitizen.id,
        variantId: carrack.id,
        acquisitionSource: ShipAcquisitionSource.STORE,
      },
    ],
  });

  const { context, auditEvents } = createTestApplicationContext({
    now: MIDNIGHT,
  });

  const output = await measureFleetValue(context);

  const values = {
    storeValueUsdCents: CARRACK_PRICE + AURORA_PRICE,
    inGameValueUsdCents: AURORA_PRICE,
    unknownValueUsdCents: AURORA_PRICE,
    storeValueAuec: CARRACK_AUEC_PRICE,
    inGameValueAuec: 0,
    unknownValueAuec: 0,
  };
  expect(output).toEqual({
    date: MEASURED_DAY,
    memberCount: 1,
    ...values,
    saved: true,
  });
  expect(await readValues()).toEqual([
    {
      day: MEASURED_DAY,
      store: CARRACK_PRICE + AURORA_PRICE,
      inGame: AURORA_PRICE,
      unknown: AURORA_PRICE,
      storeAuec: CARRACK_AUEC_PRICE,
    },
  ]);
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.FLEET_VALUE_MEASURED,
      data: { date: "2026-09-29T22:00:00.000Z", ...values },
      createdById: null,
    },
  ]);
});

test("a second run in the same night keeps the values of the first run", async () => {
  const aurora = await createVariant("Aurora", AURORA_PRICE);
  const member = await createMember("member");
  await prisma.ship.create({
    data: {
      ownerId: member.id,
      variantId: aurora.id,
      acquisitionSource: ShipAcquisitionSource.STORE,
    },
  });

  await measureFleetValue(
    createTestApplicationContext({ now: MIDNIGHT }).context,
  );

  await prisma.ship.create({
    data: {
      ownerId: member.id,
      variantId: aurora.id,
      acquisitionSource: ShipAcquisitionSource.STORE,
    },
  });
  const { context, auditEvents } = createTestApplicationContext({
    now: REPEATED_RUN,
  });
  const output = await measureFleetValue(context);

  expect(output.saved).toBe(false);
  expect(await readValues()).toEqual([
    {
      day: MEASURED_DAY,
      store: AURORA_PRICE,
      inGame: 0,
      unknown: 0,
      storeAuec: 0,
    },
  ]);
  expect(auditEvents).toEqual([]);
});
