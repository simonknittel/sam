import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import type { Context, ScheduledEvent } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type * as z from "zod";
import { truncateAllTables } from "../../test/database";
import { handler } from "../scrape-discord-events";
import { getEvents } from "./discord/utils/getEvents";
import { getEventUsers } from "./discord/utils/getEventUsers";
import type { eventSchema } from "./discord/utils/schemas";

vi.mock("./setup", () => ({
  env: { DISCORD_GUILD_ID: "guild", DISCORD_BOT_TOKEN: "bot-token" },
}));
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

const toEventUser = (discordUserId: string) => ({
  user_id: discordUserId,
  user: { id: discordUserId, username: discordUserId },
  member: {},
});

const runHandler = () =>
  handler(
    {} as ScheduledEvent,
    { awsRequestId: "integration-test" } as Context,
    () => {},
  );

/** Runs the sync with the given event and the given RSVPs on Discord */
const runSync = async (
  discordEvent: z.infer<typeof eventSchema>,
  discordUserIds: readonly string[],
) => {
  vi.mocked(getEvents).mockResolvedValue({ date: null, data: [discordEvent] });
  vi.mocked(getEventUsers).mockResolvedValue(discordUserIds.map(toEventUser));

  await runHandler();
};

/** Discord user IDs are snowflakes: numbers as strings */
const createDiscordUserIds = (count: number) =>
  [...new Array(count).keys()].map((index) =>
    String(100_000_000_000_000_000n + BigInt(index)),
  );

const compareDiscordUserIds = (first: string, second: string) =>
  Number(BigInt(first) - BigInt(second));

/**
 * Replaces the Discord API for the users of the event, with the real
 * `getEventUsers`. Like Discord, it returns the users in ascending order of
 * their ID, at most `limit` users after the user ID `after`.
 *
 * @returns the `after` parameter of each request
 */
const mockDiscordEventUsers = async (
  discordEvent: z.infer<typeof eventSchema>,
  discordUserIds: readonly string[],
  { isAfterIgnored = false } = {},
) => {
  const actualModule = await vi.importActual<
    typeof import("./discord/utils/getEventUsers")
  >("./discord/utils/getEventUsers");
  vi.mocked(getEventUsers).mockImplementation(actualModule.getEventUsers);
  vi.mocked(getEvents).mockResolvedValue({ date: null, data: [discordEvent] });

  const sortedUserIds = discordUserIds.toSorted(compareDiscordUserIds);
  const requestedAfterValues: (string | null)[] = [];

  vi.stubGlobal("fetch", (input: URL) => {
    const url = new URL(input);
    if (
      url.pathname !==
      `/api/v10/guilds/guild/scheduled-events/${discordEvent.id}/users`
    )
      throw new Error(`Unexpected request: ${url.toString()}`);

    const after = url.searchParams.get("after");
    /** 100 is the default of Discord */
    const limit = Number(url.searchParams.get("limit") ?? 100);
    requestedAfterValues.push(after);

    const page = sortedUserIds
      .filter(
        (discordUserId) =>
          isAfterIgnored ||
          after === null ||
          compareDiscordUserIds(discordUserId, after) > 0,
      )
      .slice(0, limit)
      .map(toEventUser);

    return Promise.resolve(Response.json(page));
  });

  return requestedAfterValues;
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

afterEach(() => {
  vi.unstubAllGlobals();
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

  describe("with more than one page of users on Discord", () => {
    /** Discord returns at most 100 users in one page */
    const discordUserIds = createDiscordUserIds(250);

    /** The users signed up in an earlier run */
    const createEventWithParticipants = (
      discordEvent: z.infer<typeof eventSchema>,
    ) =>
      prisma.event.create({
        data: {
          source: EventSource.DISCORD,
          discordId: discordEvent.id,
          discordCreatorId: CREATOR_DISCORD_ID,
          name: discordEvent.name,
          startTime: discordEvent.scheduled_start_time,
          participants: {
            create: discordUserIds.map((discordUserId) => ({
              source: EventSource.DISCORD,
              discordUserId,
            })),
          },
        },
      });

    /** No sign-up is cancelled, and no sign-up is added */
    const expectAllParticipantsActive = async (
      discordEvent: z.infer<typeof eventSchema>,
    ) => {
      const participants = await getParticipants(discordEvent);
      expect(participants).toHaveLength(discordUserIds.length);
      expect(
        participants
          .filter((participant) => participant.cancelledAt !== null)
          .map((participant) => participant.discordUserId),
      ).toEqual([]);
    };

    test("reads all pages, thus it cancels no sign-up after the first page", async () => {
      const discordEvent = createDiscordEvent();
      await createEventWithParticipants(discordEvent);
      const requestedAfterValues = await mockDiscordEventUsers(
        discordEvent,
        discordUserIds,
      );

      await runHandler();

      await expectAllParticipantsActive(discordEvent);
      expect(requestedAfterValues).toEqual([
        null,
        discordUserIds[99],
        discordUserIds[199],
      ]);
    });

    test("fails without a change when the pages do not end", async () => {
      const discordEvent = createDiscordEvent();
      await createEventWithParticipants(discordEvent);
      await mockDiscordEventUsers(discordEvent, discordUserIds, {
        isAfterIgnored: true,
      });

      await expect(runHandler()).rejects.toThrow(
        `users for the event "${discordEvent.id}"`,
      );

      await expectAllParticipantsActive(discordEvent);
    });
  });
});
