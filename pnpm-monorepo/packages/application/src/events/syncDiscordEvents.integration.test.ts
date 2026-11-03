import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/browser";
import { AuditEventType, EventParticipationChange } from "@sam-monorepo/domain";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { createTestDiscordGateway } from "../../test/discordGateway.js";
import type { DiscordScheduledEvent } from "../context.js";
import { syncDiscordEvents } from "./syncDiscordEvents.js";

const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const TOMORROW = new Date(TEST_NOW.getTime() + ONE_DAY_IN_MILLISECONDS);
const CREATOR_DISCORD_ID = "creator-discord-id";

const createScheduledEvent = (): DiscordScheduledEvent => ({
  id: randomUUID(),
  guildId: "guild",
  name: "Operation Sync",
  description: null,
  image: null,
  startTime: TOMORROW,
  endTime: null,
  creatorId: CREATOR_DISCORD_ID,
  location: null,
});

/** Runs the sync with the given event and the given RSVPs on Discord */
const runSync = async (
  scheduledEvent: DiscordScheduledEvent,
  discordUserIds: readonly string[],
) => {
  const discord = createTestDiscordGateway({
    scheduledEvents: [scheduledEvent],
    userIdsByScheduledEventId: { [scheduledEvent.id]: discordUserIds },
  });
  const { context, auditEvents, notifications } = createTestApplicationContext({
    discord,
  });

  const output = await syncDiscordEvents(context);

  return { output, auditEvents, notifications, discord };
};

const createCitizen = (discordId: string) =>
  prisma.citizen.create({ data: { handle: discordId, discordId } });

const getParticipants = (scheduledEvent: DiscordScheduledEvent) =>
  prisma.eventParticipant.findMany({
    where: { event: { discordId: scheduledEvent.id } },
    orderBy: [{ createdAt: "asc" }, { discordUserId: "asc" }],
  });

beforeEach(async () => {
  await truncateAllTables();
});

describe("syncDiscordEvents", () => {
  test("links a new event and its sign-ups to the citizens of their Discord users", async () => {
    const creator = await createCitizen(CREATOR_DISCORD_ID);
    const attendee = await createCitizen("attendee-discord-id");
    await prisma.citizen.update({
      where: { id: (await createCitizen("deleted-discord-id")).id },
      data: { deletedAt: new Date() },
    });
    const scheduledEvent = createScheduledEvent();

    const { auditEvents, notifications } = await runSync(scheduledEvent, [
      "attendee-discord-id",
      "deleted-discord-id",
      "unknown-discord-id",
    ]);

    const event = await prisma.event.findUniqueOrThrow({
      where: { discordId: scheduledEvent.id },
      include: { wikiPages: true },
    });
    expect(event.createdById).toBe(creator.id);
    expect(event.wikiPages.map((page) => page.ownerId)).toEqual([creator.id]);

    const participants = await getParticipants(scheduledEvent);
    expect(
      Object.fromEntries(
        participants.map((participant) => [
          participant.discordUserId,
          participant.citizenId,
        ]),
      ),
    ).toEqual({
      "attendee-discord-id": attendee.id,
      "deleted-discord-id": null,
      "unknown-discord-id": null,
    });
    expect(
      participants.every(
        (participant) =>
          participant.source === EventSource.DISCORD &&
          participant.cancelledAt === null,
      ),
    ).toBe(true);

    expect(
      auditEvents.filter(
        (auditEvent) =>
          auditEvent.type === AuditEventType.EVENT_IMPORTED_FROM_DISCORD,
      ),
    ).toEqual([
      {
        type: AuditEventType.EVENT_IMPORTED_FROM_DISCORD,
        data: {
          eventId: event.id,
          discordId: scheduledEvent.id,
          name: scheduledEvent.name,
        },
        createdById: null,
      },
    ]);
    expect(notifications).toEqual([
      { type: "EventCreated", payload: { eventId: event.id } },
    ]);
  });

  test("links an existing event and its earlier sign-ups when the citizens come later", async () => {
    const scheduledEvent = createScheduledEvent();
    const event = await prisma.event.create({
      data: {
        source: EventSource.DISCORD,
        discordId: scheduledEvent.id,
        discordCreatorId: CREATOR_DISCORD_ID,
        name: scheduledEvent.name,
        startTime: scheduledEvent.startTime,
        participants: {
          create: [
            { source: EventSource.DISCORD, discordUserId: "late-discord-id" },
            {
              source: EventSource.DISCORD,
              discordUserId: "withdrawn-discord-id",
              cancelledAt: new Date(),
            },
          ],
        },
      },
    });
    const creator = await createCitizen(CREATOR_DISCORD_ID);
    const lateAttendee = await createCitizen("late-discord-id");
    const withdrawnAttendee = await createCitizen("withdrawn-discord-id");

    await runSync(scheduledEvent, ["late-discord-id"]);

    const updatedEvent = await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(updatedEvent.createdById).toBe(creator.id);

    const participants = await getParticipants(scheduledEvent);
    expect(
      participants.map((participant) => ({
        citizenId: participant.citizenId,
        isCancelled: participant.cancelledAt !== null,
      })),
    ).toEqual([
      { citizenId: lateAttendee.id, isCancelled: false },
      { citizenId: withdrawnAttendee.id, isCancelled: true },
    ]);
  });

  test("a withdrawal cancels the sign-up, and a new RSVP adds a new row", async () => {
    const attendee = await createCitizen("attendee-discord-id");
    const scheduledEvent = createScheduledEvent();

    await runSync(scheduledEvent, ["attendee-discord-id"]);
    await runSync(scheduledEvent, []);
    await runSync(scheduledEvent, ["attendee-discord-id"]);

    const participants = await getParticipants(scheduledEvent);
    expect(
      participants.map((participant) => ({
        citizenId: participant.citizenId,
        isCancelled: participant.cancelledAt !== null,
      })),
    ).toEqual([
      { citizenId: attendee.id, isCancelled: true },
      { citizenId: attendee.id, isCancelled: false },
    ]);
  });

  /**
   * The sync cancels each sign-up whose user is not in the user list. Thus a
   * failed read must not count as an empty list.
   */
  test("a failed user list changes nothing", async () => {
    const scheduledEvent = createScheduledEvent();
    await prisma.event.create({
      data: {
        source: EventSource.DISCORD,
        discordId: scheduledEvent.id,
        discordCreatorId: CREATOR_DISCORD_ID,
        name: scheduledEvent.name,
        startTime: scheduledEvent.startTime,
        participants: {
          create: [
            { source: EventSource.DISCORD, discordUserId: "first-discord-id" },
            { source: EventSource.DISCORD, discordUserId: "second-discord-id" },
          ],
        },
      },
    });
    const { context } = createTestApplicationContext({
      discord: createTestDiscordGateway({
        scheduledEvents: [scheduledEvent],
        failsUserListFor: [scheduledEvent.id],
      }),
    });

    await expect(syncDiscordEvents(context)).rejects.toThrow(
      `users of the Discord event "${scheduledEvent.id}"`,
    );

    const participants = await getParticipants(scheduledEvent);
    expect(
      participants.map((participant) => ({
        discordUserId: participant.discordUserId,
        isCancelled: participant.cancelledAt !== null,
      })),
    ).toEqual([
      { discordUserId: "first-discord-id", isCancelled: false },
      { discordUserId: "second-discord-id", isCancelled: false },
    ]);
  });

  test("the sync never touches app events", async () => {
    const publishedScheduledEvent = createScheduledEvent();
    const publishedAppEvent = await prisma.event.create({
      data: {
        source: EventSource.APP,
        name: "Published app event",
        startTime: TOMORROW,
        discordPublishedId: publishedScheduledEvent.id,
        discordPublishedLocation: "Stanton",
      },
    });
    const unpublishedAppEvent = await prisma.event.create({
      data: {
        source: EventSource.APP,
        name: "Unpublished app event",
        startTime: TOMORROW,
      },
    });
    await prisma.event.create({
      data: {
        source: EventSource.DISCORD,
        discordId: "cancelled-on-discord",
        name: "Cancelled on Discord",
        startTime: TOMORROW,
      },
    });

    const { output, discord } = await runSync(publishedScheduledEvent, []);

    // No import of the published event, and no delete of an app event
    expect(
      await prisma.event.findMany({
        select: { id: true },
        orderBy: { name: "asc" },
      }),
    ).toEqual([{ id: publishedAppEvent.id }, { id: unpublishedAppEvent.id }]);
    expect(output).toMatchObject({
      fetchedEventCount: 1,
      skippedPublishedEventCount: 1,
      deletedEventCount: 1,
      createdEventCount: 0,
    });
    expect(discord.calls).toEqual(["listScheduledEvents"]);
  });

  test("a new start sends rescheduled, a new location sends updated", async () => {
    const scheduledEvent = createScheduledEvent();
    const event = await prisma.event.create({
      data: {
        source: EventSource.DISCORD,
        discordId: scheduledEvent.id,
        discordCreatorId: CREATOR_DISCORD_ID,
        name: scheduledEvent.name,
        startTime: scheduledEvent.startTime,
      },
    });

    const { notifications } = await runSync(
      {
        ...scheduledEvent,
        startTime: new Date(TOMORROW.getTime() + ONE_DAY_IN_MILLISECONDS),
        location: "Stanton",
      },
      [],
    );

    expect(notifications).toEqual([
      { type: "EventRescheduled", payload: { eventId: event.id } },
      { type: "EventUpdated", payload: { eventId: event.id } },
    ]);
  });

  test("the organizers hear about the RSVPs and the withdrawals of citizens, but not about the RSVPs of a new event", async () => {
    const [gunner, scout, newcomer] = await Promise.all(
      ["gunner", "scout", "newcomer", "staying"].map((name) =>
        createCitizen(`${name}-discord-id`),
      ),
    );
    const scheduledEvent = createScheduledEvent();

    const { notifications: importNotifications } = await runSync(
      scheduledEvent,
      ["gunner-discord-id", "scout-discord-id", "staying-discord-id"],
    );
    const event = await prisma.event.findUniqueOrThrow({
      where: { discordId: scheduledEvent.id },
    });
    await prisma.eventPosition.create({
      data: { eventId: event.id, name: "Turm", citizenId: gunner!.id },
    });

    const { output, notifications } = await runSync(scheduledEvent, [
      "staying-discord-id",
      "newcomer-discord-id",
      "unknown-discord-id",
    ]);

    expect(importNotifications).toEqual([
      { type: "EventCreated", payload: { eventId: event.id } },
    ]);
    expect(output.notificationsSent).toBe(true);
    // The withdrawal of the gunner gave the position free
    expect(notifications).toHaveLength(3);
    expect(notifications).toEqual(
      expect.arrayContaining([
        {
          type: "EventPositionVacated",
          payload: {
            eventId: event.id,
            citizenId: gunner!.id,
            positionNames: ["Turm"],
          },
        },
        {
          type: "EventParticipationChanged",
          payload: {
            eventId: event.id,
            citizenId: scout!.id,
            change: EventParticipationChange.Cancelled,
          },
        },
        {
          type: "EventParticipationChanged",
          payload: {
            eventId: event.id,
            citizenId: newcomer!.id,
            change: EventParticipationChange.SignedUp,
          },
        },
      ]),
    );
  });
});
