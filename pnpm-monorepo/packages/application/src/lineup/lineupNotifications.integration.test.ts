import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { assignEventPosition } from "./assignEventPosition.js";
import { deleteLineupPosition } from "./deleteLineupPosition.js";

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

const createCitizen = (handle: string) =>
  prisma.citizen.create({
    data: { handle },
    select: { id: true, handle: true },
  });

/**
 * An app event of the organizer that starts in one hour, with a published
 * lineup or a draft
 */
const createAppEvent = (organizerId: string, lineupEnabled = true) =>
  prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: new Date(TEST_NOW.getTime() + HOUR_IN_MILLISECONDS),
      createdById: organizerId,
      lineupEnabled,
    },
  });

/** The organizer manages the positions of the own event */
const createOrganizerActor = (organizer: {
  id: string;
  handle: string | null;
}) =>
  createTestActor({
    userId: `user-${organizer.id}`,
    citizen: organizer,
    permissionStrings: ["event;read", "ship;read"],
  });

beforeEach(async () => {
  await truncateAllTables();
});

test("an assignment notifies the new and the previous citizen, but not the actor", async () => {
  const [organizer, first, second] = await Promise.all(
    ["organizer", "first", "second"].map(createCitizen),
  );
  const event = await createAppEvent(organizer!.id);
  await prisma.eventParticipant.createMany({
    data: [organizer!, first!, second!].map((citizen) => ({
      eventId: event.id,
      source: EventSource.APP,
      citizenId: citizen.id,
    })),
  });
  const position = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Pilot" },
  });
  const { context, notifications } = createTestApplicationContext();
  const assign = (citizenId: string | null) =>
    assignEventPosition(context, createOrganizerActor(organizer!), {
      position_id: position.id,
      citizen_id: citizenId,
    });

  const output = await assign(first!.id);
  await assign(second!.id);
  // A repeated assignment changes nothing
  await assign(second!.id);
  // The actor takes the position and removes the own assignment again
  await assign(organizer!.id);
  await assign(null);

  expect(output).toMatchObject({
    position: { id: position.id, assignee: { id: first!.id } },
    notifications_sent: true,
  });
  expect(notifications).toEqual([
    {
      type: "EventPositionAssigned",
      payload: { positionId: position.id, citizenId: first!.id },
    },
    {
      type: "EventPositionAssigned",
      payload: { positionId: position.id, citizenId: second!.id },
    },
    {
      type: "EventPositionUnassigned",
      payload: {
        eventId: event.id,
        citizenId: first!.id,
        positionId: position.id,
        positionName: "Pilot",
      },
    },
    {
      type: "EventPositionUnassigned",
      payload: {
        eventId: event.id,
        citizenId: second!.id,
        positionId: position.id,
        positionName: "Pilot",
      },
    },
  ]);
});

test("a deletion notifies the citizens of the position and of its children, but not the actor", async () => {
  const [organizer, first, second, reserve] = await Promise.all(
    ["organizer", "first", "second", "reserve"].map(createCitizen),
  );
  const event = await createAppEvent(organizer!.id);
  const createPosition = (
    name: string,
    citizenId: string,
    parentPositionId: string | null,
  ) =>
    prisma.eventPosition.create({
      data: { eventId: event.id, name, citizenId, parentPositionId },
    });
  const squad = await createPosition("Squad", first!.id, null);
  const pilot = await createPosition("Pilot", second!.id, squad.id);
  await createPosition("Co-Pilot", first!.id, squad.id);
  await createPosition("Gunner", organizer!.id, pilot.id);
  await createPosition("Reserve", reserve!.id, null);
  const { context, notifications } = createTestApplicationContext();

  const output = await deleteLineupPosition(
    context,
    createOrganizerActor(organizer!),
    { position_id: squad.id },
  );

  expect(output).toEqual({ position_id: squad.id, notifications_sent: true });
  expect(notifications).toHaveLength(3);
  expect(notifications).toEqual(
    expect.arrayContaining(
      [
        { citizenId: first!.id, positionName: "Squad" },
        { citizenId: second!.id, positionName: "Pilot" },
        { citizenId: first!.id, positionName: "Co-Pilot" },
      ].map((payload) => ({
        type: "EventPositionUnassigned",
        payload: { eventId: event.id, positionId: null, ...payload },
      })),
    ),
  );
});

test("a change of a draft lineup notifies nobody", async () => {
  const [organizer, participant] = await Promise.all(
    ["organizer", "participant"].map(createCitizen),
  );
  const event = await createAppEvent(organizer!.id, false);
  await prisma.eventParticipant.create({
    data: {
      eventId: event.id,
      source: EventSource.APP,
      citizenId: participant!.id,
    },
  });
  const [assigned, deleted] = await Promise.all(
    ["Pilot", "Gunner"].map((name) =>
      prisma.eventPosition.create({ data: { eventId: event.id, name } }),
    ),
  );
  await prisma.eventPosition.update({
    where: { id: deleted!.id },
    data: { citizenId: participant!.id },
  });
  const { context, notifications } = createTestApplicationContext();
  const actor = createOrganizerActor(organizer!);

  await assignEventPosition(context, actor, {
    position_id: assigned!.id,
    citizen_id: participant!.id,
  });
  await deleteLineupPosition(context, actor, { position_id: deleted!.id });

  expect(notifications).toEqual([]);
});
