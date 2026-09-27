import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import type { Context, ScheduledEvent } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type * as z from "zod";
import { truncateAllTables } from "../../test/database";
import { handler } from "../scrape-discord-events";
import { getEvents } from "./discord/utils/getEvents";
import { getEventUsers } from "./discord/utils/getEventUsers";
import type { eventSchema } from "./discord/utils/schemas";

vi.mock("./setup", () => ({ env: {} }));
vi.mock("./discord/utils/getEvents", () => ({ getEvents: vi.fn() }));
vi.mock("./discord/utils/getEventUsers", () => ({ getEventUsers: vi.fn() }));
vi.mock("./notifications", () => ({ triggerNotifications: vi.fn() }));

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CREATOR_DISCORD_ID = "creator-discord-id";

const createDiscordEvent = (): z.infer<typeof eventSchema> => ({
  id: randomUUID(),
  guild_id: "guild",
  name: "Operation Sync",
  image: null,
  scheduled_start_time: new Date(Date.now() + ONE_DAY_MS),
  scheduled_end_time: null,
  user_count: 0,
  creator_id: CREATOR_DISCORD_ID,
  creator: { id: CREATOR_DISCORD_ID, username: "creator" },
  entity_metadata: {},
});

/** Runs the sync with the given event and the given RSVPs on Discord */
const runSync = async (
  discordEvent: z.infer<typeof eventSchema>,
  discordUserIds: readonly string[],
) => {
  vi.mocked(getEvents).mockResolvedValue({ date: null, data: [discordEvent] });
  vi.mocked(getEventUsers).mockResolvedValue(
    discordUserIds.map((discordUserId) => ({
      user_id: discordUserId,
      user: { id: discordUserId, username: discordUserId },
      member: {},
    })),
  );

  await handler(
    {} as ScheduledEvent,
    { awsRequestId: "integration-test" } as Context,
    () => {},
  );
};

const createCitizen = (discordId: string) =>
  prisma.citizen.create({ data: { handle: discordId, discordId } });

const getParticipants = (discordEvent: z.infer<typeof eventSchema>) =>
  prisma.eventParticipant.findMany({
    where: { event: { discordId: discordEvent.id } },
    orderBy: [{ createdAt: "asc" }, { discordUserId: "asc" }],
  });

beforeEach(async () => {
  await truncateAllTables();
});

describe("scrape Discord events", () => {
  test("links a new event and its sign-ups to the citizens of their Discord users", async () => {
    const creator = await createCitizen(CREATOR_DISCORD_ID);
    const attendee = await createCitizen("attendee-discord-id");
    await prisma.citizen.update({
      where: { id: (await createCitizen("deleted-discord-id")).id },
      data: { deletedAt: new Date() },
    });
    const discordEvent = createDiscordEvent();

    await runSync(discordEvent, [
      "attendee-discord-id",
      "deleted-discord-id",
      "unknown-discord-id",
    ]);

    const event = await prisma.event.findUniqueOrThrow({
      where: { discordId: discordEvent.id },
      include: { wikiPages: true },
    });
    expect(event.createdById).toBe(creator.id);
    expect(event.wikiPages.map((page) => page.ownerId)).toEqual([creator.id]);

    const participants = await getParticipants(discordEvent);
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
  });

  test("links an existing event and its earlier sign-ups when the citizens come later", async () => {
    const discordEvent = createDiscordEvent();
    const event = await prisma.event.create({
      data: {
        source: EventSource.DISCORD,
        discordId: discordEvent.id,
        discordCreatorId: CREATOR_DISCORD_ID,
        name: discordEvent.name,
        startTime: discordEvent.scheduled_start_time,
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

    await runSync(discordEvent, ["late-discord-id"]);

    const updatedEvent = await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(updatedEvent.createdById).toBe(creator.id);

    const participants = await getParticipants(discordEvent);
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
    const discordEvent = createDiscordEvent();

    await runSync(discordEvent, ["attendee-discord-id"]);
    await runSync(discordEvent, []);
    await runSync(discordEvent, ["attendee-discord-id"]);

    const participants = await getParticipants(discordEvent);
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
});
