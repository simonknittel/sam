import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import {
  findEventLineupEnabledRecipients,
  findEventPositionAssignedRecipient,
  findEventPositionUnassignedRecipient,
} from "./eventLineup.js";

/**
 * The lineup notifications reach the citizens who can log in and open the
 * lineup page
 */
const NOTIFIABLE_PERMISSION_STRINGS = [
  "login;manage",
  "event;read",
  "ship;read",
];

const createAppEvent = (lineupEnabled: boolean) =>
  prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: TEST_NOW,
      lineupEnabled,
    },
  });

const toCitizenIds = (
  result: { readonly recipients: { readonly citizenId: string }[] } | null,
) => result?.recipients.map((recipient) => recipient.citizenId);

beforeEach(async () => {
  await truncateAllTables();
});

test("a change of an assignment reaches the citizen only while the participants see the lineup and the change is still true", async () => {
  const [pilot, replacement] = await Promise.all(
    ["pilot", "replacement"].map((handle) =>
      createCitizenWithPermissions(handle, NOTIFIABLE_PERMISSION_STRINGS),
    ),
  );
  const event = await createAppEvent(false);
  const position = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Pilot", citizenId: pilot!.id },
  });
  const { context } = createTestApplicationContext();
  const assignment = { positionId: position.id, citizenId: pilot!.id };
  const loss = {
    eventId: event.id,
    citizenId: pilot!.id,
    positionId: position.id,
  };

  // A draft lineup: the publication tells the positions later
  expect(
    await findEventPositionAssignedRecipient(context, assignment),
  ).toBeNull();

  await prisma.event.update({
    where: { id: event.id },
    data: { lineupEnabled: true },
  });

  const assignedResult = await findEventPositionAssignedRecipient(
    context,
    assignment,
  );
  expect(assignedResult?.positionName).toBe("Pilot");
  expect(toCitizenIds(assignedResult)).toEqual([pilot!.id]);
  // The pilot holds the position again before the delivery of the loss
  expect(await findEventPositionUnassignedRecipient(context, loss)).toBeNull();

  // A later change gave the position to a different citizen
  await prisma.eventPosition.update({
    where: { id: position.id },
    data: { citizenId: replacement!.id },
  });
  expect(
    await findEventPositionAssignedRecipient(context, assignment),
  ).toBeNull();
  expect(
    toCitizenIds(await findEventPositionUnassignedRecipient(context, loss)),
  ).toEqual([pilot!.id]);

  // The participation is off: the lineup shows to nobody
  await prisma.event.update({
    where: { id: event.id },
    data: { participationEnabled: false },
  });
  expect(await findEventPositionUnassignedRecipient(context, loss)).toBeNull();
});

test("the publication gives each participant who can open the lineup page the own positions in the order of the page, without the actor", async () => {
  const [pilot, observer, actor] = await Promise.all(
    ["pilot", "observer", "actor"].map((handle) =>
      createCitizenWithPermissions(handle, NOTIFIABLE_PERMISSION_STRINGS),
    ),
  );
  const withoutShipRead = await createCitizenWithPermissions(
    "without-ship-read",
    ["login;manage", "event;read"],
  );
  const event = await createAppEvent(true);
  await prisma.eventParticipant.createMany({
    data: [pilot!, observer!, actor!, withoutShipRead].map((citizen) => ({
      eventId: event.id,
      source: EventSource.APP,
      citizenId: citizen.id,
    })),
  });
  // The second top-level position is created first
  await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Bravo", order: 1, citizenId: pilot!.id },
  });
  const alpha = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Alpha", order: 0 },
  });
  await prisma.eventPosition.create({
    data: {
      eventId: event.id,
      name: "Alpha Pilot",
      parentPositionId: alpha.id,
      citizenId: pilot!.id,
    },
  });
  const { context } = createTestApplicationContext();

  const result = await findEventLineupEnabledRecipients(context, {
    eventId: event.id,
    excludedCitizenId: actor!.id,
  });

  expect(result?.recipients).toHaveLength(2);
  expect(result?.recipients).toEqual(
    expect.arrayContaining([
      { citizenId: pilot!.id, positionNames: ["Alpha Pilot", "Bravo"] },
      { citizenId: observer!.id, positionNames: [] },
    ]),
  );

  // A manager hid the lineup again before the delivery
  await prisma.event.update({
    where: { id: event.id },
    data: { lineupEnabled: false },
  });
  expect(
    await findEventLineupEnabledRecipients(context, { eventId: event.id }),
  ).toBeNull();
});
