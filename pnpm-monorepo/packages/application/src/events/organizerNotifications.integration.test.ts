import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import { EventParticipationChange } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { applyForEventPosition } from "../lineup/applyForEventPosition.js";
import { cancelEventParticipation } from "./cancelEventParticipation.js";
import { signUpForEvent } from "./signUpForEvent.js";

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

/** The permissions of the event and of the lineup pages */
const MEMBER_PERMISSION_STRINGS = ["event;read", "ship;read"];

const createMember = async (handle: string) => {
  const citizen = await prisma.citizen.create({
    data: { handle },
    select: { id: true, handle: true },
  });

  return {
    citizen,
    actor: createTestActor({
      userId: `user-${citizen.id}`,
      citizen,
      permissionStrings: MEMBER_PERMISSION_STRINGS,
    }),
  };
};

/** An app event with a published lineup and the given participants */
const createAppEvent = (
  startsInHours: number,
  participantIds: readonly string[] = [],
) =>
  prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: new Date(
        TEST_NOW.getTime() + startsInHours * HOUR_IN_MILLISECONDS,
      ),
      endTime: new Date(
        TEST_NOW.getTime() + (startsInHours + 2) * HOUR_IN_MILLISECONDS,
      ),
      lineupEnabled: true,
      participants: {
        create: participantIds.map((citizenId) => ({
          source: EventSource.APP,
          citizenId,
        })),
      },
    },
  });

beforeEach(async () => {
  await truncateAllTables();
});

test("a new sign-up notifies the organizers from 24 hours before the start, a comment update does not", async () => {
  const { citizen, actor } = await createMember("pilot");
  const earlyEvent = await createAppEvent(25);
  // The first moment of the notice period
  const lateEvent = await createAppEvent(24);
  const { context, notifications } = createTestApplicationContext();

  const earlyOutput = await signUpForEvent(context, actor, {
    event_id: earlyEvent.id,
  });
  await signUpForEvent(context, actor, { event_id: lateEvent.id });
  await signUpForEvent(context, actor, {
    event_id: lateEvent.id,
    comment: "Mit der Cutlass.",
  });

  expect(earlyOutput.is_participating).toBe(true);
  expect(notifications).toEqual([
    {
      type: "EventParticipationChanged",
      payload: {
        eventId: lateEvent.id,
        citizenId: citizen.id,
        change: EventParticipationChange.SignedUp,
      },
    },
  ]);
});

test("an own cancellation notifies about the vacated positions at each time, about the other cancellations only from 24 hours before the start", async () => {
  const [gunner, scout] = await Promise.all(
    ["gunner", "scout"].map(createMember),
  );
  const participantIds = [gunner!.citizen.id, scout!.citizen.id];
  const earlyEvent = await createAppEvent(48, participantIds);
  const lateEvent = await createAppEvent(1, participantIds);
  await prisma.eventPosition.createMany({
    data: [earlyEvent, lateEvent].flatMap((event) =>
      ["Turm links", "Turm rechts"].map((name) => ({
        eventId: event.id,
        name,
        citizenId: gunner!.citizen.id,
      })),
    ),
  });
  const { context, notifications } = createTestApplicationContext();

  for (const event of [earlyEvent, lateEvent])
    for (const member of [gunner!, scout!])
      await cancelEventParticipation(context, member.actor, {
        event_id: event.id,
      });

  expect(notifications).toEqual([
    {
      type: "EventPositionVacated",
      payload: {
        eventId: earlyEvent.id,
        citizenId: gunner!.citizen.id,
        positionNames: expect.arrayContaining(["Turm links", "Turm rechts"]),
      },
    },
    {
      type: "EventPositionVacated",
      payload: {
        eventId: lateEvent.id,
        citizenId: gunner!.citizen.id,
        positionNames: expect.arrayContaining(["Turm links", "Turm rechts"]),
      },
    },
    {
      type: "EventParticipationChanged",
      payload: {
        eventId: lateEvent.id,
        citizenId: scout!.citizen.id,
        change: EventParticipationChange.Cancelled,
      },
    },
  ]);
});

test("a new application notifies the organizers, a repeated one does not", async () => {
  const { citizen, actor } = await createMember("pilot");
  const event = await createAppEvent(48, [citizen.id]);
  const position = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Pilot" },
  });
  const { context, notifications } = createTestApplicationContext();

  const output = await applyForEventPosition(context, actor, {
    position_id: position.id,
  });
  await applyForEventPosition(context, actor, { position_id: position.id });

  const application = await prisma.eventPositionApplication.findFirstOrThrow();
  expect(output.id).toBe(position.id);
  expect(notifications).toEqual([
    {
      type: "EventPositionApplicationCreated",
      payload: { applicationId: application.id },
    },
  ]);
});
