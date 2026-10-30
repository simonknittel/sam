import { prisma } from "@sam-monorepo/database";
import { EventActivityType, EventSource } from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { ConflictError } from "../errors.js";
import { applyForEventPosition } from "../lineup/applyForEventPosition.js";
import { assignEventPosition } from "../lineup/assignEventPosition.js";
import { findEventParticipantRecipients } from "../notifications/recipients/eventParticipants.js";
import { addEventParticipants } from "./addEventParticipants.js";
import { PARTICIPATION_DISABLED_REASON } from "./clearEventParticipation.js";
import { EventErrorMessage } from "./eventErrors.js";
import { signUpForEvent } from "./signUpForEvent.js";
import { EventChange, updateEvent } from "./updateEvent.js";

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

/** The permissions of the event and of the lineup pages */
const MEMBER_PERMISSION_STRINGS = ["event;read", "ship;read"];

const PARTICIPATION_DISABLED = new ConflictError(
  EventErrorMessage.ParticipationDisabled,
);

const createCitizen = (handle: string) =>
  prisma.citizen.create({
    data: { handle },
    select: { id: true, handle: true },
  });

const createActorOf = (citizen: { id: string; handle: string | null }) =>
  createTestActor({
    userId: `user-${citizen.id}`,
    citizen,
    permissionStrings: MEMBER_PERMISSION_STRINGS,
  });

/** An app event of the organizer that starts in one hour */
const createAppEvent = (organizerId: string, participationEnabled = true) =>
  prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: new Date(TEST_NOW.getTime() + HOUR_IN_MILLISECONDS),
      endTime: new Date(TEST_NOW.getTime() + 3 * HOUR_IN_MILLISECONDS),
      createdById: organizerId,
      participationEnabled,
    },
  });

beforeEach(async () => {
  await truncateAllTables();
});

test("the switch to false cancels the sign-ups, clears the lineup and notifies each participant", async () => {
  const [organizer, assignee, applicant, formerParticipant] = await Promise.all(
    ["organizer", "assignee", "applicant", "former"].map(createCitizen),
  );
  const event = await createAppEvent(organizer!.id);
  const cancelledBefore = new Date(TEST_NOW.getTime() - HOUR_IN_MILLISECONDS);
  await prisma.eventParticipant.createMany({
    data: [
      { eventId: event.id, source: EventSource.APP, citizenId: assignee!.id },
      { eventId: event.id, source: EventSource.APP, citizenId: applicant!.id },
      {
        eventId: event.id,
        source: EventSource.APP,
        citizenId: formerParticipant!.id,
        cancelledAt: cancelledBefore,
        cancelledById: formerParticipant!.id,
      },
    ],
  });
  const squad = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Squad", citizenId: assignee!.id },
  });
  const pilot = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Pilot", parentPositionId: squad.id },
  });
  await prisma.eventPositionApplication.create({
    data: { positionId: pilot.id, citizenId: applicant!.id },
  });
  const { context, auditEvents, notifications } =
    createTestApplicationContext();

  const output = await updateEvent(context, createActorOf(organizer!), {
    event_id: event.id,
    participation_enabled: false,
  });

  expect(output.changes).toEqual([EventChange.ParticipationEnabled]);
  expect(output.event.participation_enabled).toBe(false);
  expect(output.event.participants).toEqual([]);
  expect(output.notifications_sent).toBe(true);

  const participants = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    select: { citizenId: true, cancelledAt: true, cancelledById: true },
  });
  expect(participants).toHaveLength(3);
  expect(participants).toEqual(
    expect.arrayContaining([
      {
        citizenId: assignee!.id,
        cancelledAt: TEST_NOW,
        cancelledById: organizer!.id,
      },
      {
        citizenId: applicant!.id,
        cancelledAt: TEST_NOW,
        cancelledById: organizer!.id,
      },
      // An earlier cancellation stays as it was
      {
        citizenId: formerParticipant!.id,
        cancelledAt: cancelledBefore,
        cancelledById: formerParticipant!.id,
      },
    ]),
  );

  // The positions stay, without assignments and applications
  expect(
    await prisma.eventPosition.findMany({
      where: { eventId: event.id },
      select: { name: true, citizenId: true },
      orderBy: { name: "asc" },
    }),
  ).toEqual([
    { name: "Pilot", citizenId: null },
    { name: "Squad", citizenId: null },
  ]);
  expect(
    await prisma.eventPositionApplication.count({
      where: { position: { eventId: event.id } },
    }),
  ).toBe(0);

  expect(
    await prisma.eventActivity.findMany({
      where: { eventId: event.id },
      select: { type: true, citizenId: true, payload: true },
    }),
  ).toEqual([
    {
      type: EventActivityType.PARTICIPATION_TOGGLED,
      citizenId: organizer!.id,
      payload: { enabled: false, cancelledParticipantCount: 2 },
    },
  ]);
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.EVENT_PARTICIPATION_STATUS_CHANGED,
      data: {
        eventId: event.id,
        enabled: false,
        cancelledParticipantCount: 2,
        clearedPositionCount: 1,
        deletedApplicationCount: 1,
      },
      createdById: `user-${organizer!.id}`,
    },
  ]);
  expect(notifications).toHaveLength(2);
  expect(notifications).toEqual(
    expect.arrayContaining(
      [assignee!.id, applicant!.id].map((citizenId) => ({
        type: "EventParticipationRemoved",
        payload: {
          eventId: event.id,
          citizenId,
          reason: PARTICIPATION_DISABLED_REASON,
        },
      })),
    ),
  );

  // The "Event beginnt in 15 Minuten" reminder reaches nobody now
  expect(
    await findEventParticipantRecipients(context, { eventId: event.id }),
  ).toBeNull();

  // The switch to true restores nothing and notifies nobody
  const { context: secondContext, notifications: secondNotifications } =
    createTestApplicationContext();
  const enabledOutput = await updateEvent(
    secondContext,
    createActorOf(organizer!),
    { event_id: event.id, participation_enabled: true },
  );

  expect(enabledOutput.event.participation_enabled).toBe(true);
  expect(enabledOutput.event.participants).toEqual([]);
  expect(secondNotifications).toEqual([]);
});

test("while the participation is off, nobody signs up, is added, applies or is assigned", async () => {
  const [organizer, member] = await Promise.all(
    ["organizer", "member"].map(createCitizen),
  );
  const event = await createAppEvent(organizer!.id, false);
  const position = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Pilot" },
  });
  const { context, auditEvents, notifications } =
    createTestApplicationContext();
  const organizerActor = createActorOf(organizer!);
  const memberActor = createActorOf(member!);

  await expect(
    signUpForEvent(context, memberActor, { event_id: event.id }),
  ).rejects.toThrow(PARTICIPATION_DISABLED);
  await expect(
    addEventParticipants(context, organizerActor, {
      event_id: event.id,
      citizen_ids: [member!.id],
    }),
  ).rejects.toThrow(PARTICIPATION_DISABLED);
  await expect(
    applyForEventPosition(context, memberActor, { position_id: position.id }),
  ).rejects.toThrow(PARTICIPATION_DISABLED);
  await expect(
    assignEventPosition(context, organizerActor, {
      position_id: position.id,
      citizen_id: member!.id,
    }),
  ).rejects.toThrow(PARTICIPATION_DISABLED);
  // The lineup is hidden, thus its switch keeps the stored value
  await expect(
    updateEvent(context, organizerActor, {
      event_id: event.id,
      lineup_enabled: true,
    }),
  ).rejects.toThrow(PARTICIPATION_DISABLED);

  expect(
    await prisma.eventParticipant.count({ where: { eventId: event.id } }),
  ).toBe(0);
  expect(
    await prisma.eventPosition.findUniqueOrThrow({
      where: { id: position.id },
      select: { citizenId: true },
    }),
  ).toEqual({ citizenId: null });
  expect(
    await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      select: { lineupEnabled: true },
    }),
  ).toEqual({ lineupEnabled: false });
  expect(auditEvents).toEqual([]);
  expect(notifications).toEqual([]);
});
