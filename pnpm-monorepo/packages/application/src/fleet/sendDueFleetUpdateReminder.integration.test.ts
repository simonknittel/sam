import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import { createTestApplicationContext } from "../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../test/database.js";
import { sendDueFleetUpdateReminder } from "./sendDueFleetUpdateReminder.js";

/** Relative to `TEST_NOW` (2026-06-15), the reminder comes after 4 months */
const SIX_MONTHS_AGO = new Date("2025-12-15T10:00:00.000Z");
const FIVE_MONTHS_AGO = new Date("2026-01-15T10:00:00.000Z");
const THREE_MONTHS_AGO = new Date("2026-03-15T10:00:00.000Z");
const ONE_MONTH_AGO = new Date("2026-05-15T10:00:00.000Z");

let variantId: string;

const createShipOwner = (handle: string, welcomedAt: Date) =>
  createCitizenWithPermissions(handle, ["login;manage", "ship;manage"], [], {
    welcomedAt,
  });

const createShip = (ownerId: string, changedAt: Date) =>
  prisma.ship.create({
    data: { ownerId, variantId, createdAt: changedAt, updatedAt: changedAt },
  });

const createFleetUpdateReminder = (citizenId: string, createdAt: Date) =>
  prisma.onSiteNotification.create({
    data: {
      citizenId,
      notificationType: "fleet_update_reminder",
      payload: {},
      createdAt,
    },
  });

const sendReminder = async (citizenId: string) => {
  const { context, notifications } = createTestApplicationContext();

  await sendDueFleetUpdateReminder(context, { citizenId });

  return notifications;
};

beforeEach(async () => {
  await truncateAllTables();

  const manufacturer = await prisma.manufacturer.create({
    data: { name: "Manufacturer" },
  });
  const series = await prisma.series.create({
    data: { name: "Series", manufacturerId: manufacturer.id },
  });
  ({ id: variantId } = await prisma.variant.create({
    data: { name: "Variant", seriesId: series.id },
  }));
});

test("requests the reminder when the ships did not change for 4 months", async () => {
  const citizen = await createShipOwner("owner", SIX_MONTHS_AGO);
  await createShip(citizen.id, FIVE_MONTHS_AGO);

  expect(await sendReminder(citizen.id)).toEqual([
    { type: "FleetUpdateReminder", payload: { citizenId: citizen.id } },
  ]);
});

test("requests no reminder when a ship changed in the last 4 months", async () => {
  const citizen = await createShipOwner("owner", SIX_MONTHS_AGO);
  await createShip(citizen.id, FIVE_MONTHS_AGO);
  await createShip(citizen.id, THREE_MONTHS_AGO);

  expect(await sendReminder(citizen.id)).toEqual([]);
});

test("requests one reminder for each time without a change", async () => {
  const remindedCitizen = await createShipOwner("reminded", SIX_MONTHS_AGO);
  await createShip(remindedCitizen.id, FIVE_MONTHS_AGO);
  await createFleetUpdateReminder(remindedCitizen.id, ONE_MONTH_AGO);

  expect(await sendReminder(remindedCitizen.id)).toEqual([]);

  // The citizen changed a ship after the last reminder
  const changedCitizen = await createShipOwner("changed", SIX_MONTHS_AGO);
  await createFleetUpdateReminder(changedCitizen.id, SIX_MONTHS_AGO);
  await createShip(changedCitizen.id, FIVE_MONTHS_AGO);

  expect(await sendReminder(changedCitizen.id)).toHaveLength(1);
});

test("the time of a citizen without ships starts with the first login", async () => {
  const newCitizen = await createShipOwner("new", THREE_MONTHS_AGO);
  expect(await sendReminder(newCitizen.id)).toEqual([]);

  const citizen = await createShipOwner("old", FIVE_MONTHS_AGO);
  expect(await sendReminder(citizen.id)).toHaveLength(1);
});
