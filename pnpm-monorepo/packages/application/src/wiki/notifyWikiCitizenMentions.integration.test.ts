import { prisma } from "@sam-monorepo/database";
import {
  EventSource,
  EventVisibility,
  WikiPageEventScope,
  WikiPageNamespace,
} from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { notifyWikiCitizenMentions } from "./notifyWikiCitizenMentions.js";

const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
const ONE_DAY_IN_MILLISECONDS = 24 * ONE_HOUR_IN_MILLISECONDS;

beforeEach(async () => {
  await truncateAllTables();
});

const createReader = async (handle: string) => {
  const role = await prisma.role.create({
    data: {
      name: `${handle}-role`,
      permissionStrings: {
        create: [
          { permissionString: "login;manage" },
          { permissionString: "event;read" },
        ],
      },
    },
  });
  return prisma.citizen.create({
    data: { handle, roleAssignments: { create: { roleId: role.id } } },
  });
};

const createEventWithRootPage = async (
  name: string,
  createdById: string,
  eventReadScope: WikiPageEventScope,
) => {
  const startTime = new Date(TEST_NOW.getTime() + ONE_DAY_IN_MILLISECONDS);
  const event = await prisma.event.create({
    data: {
      source: EventSource.APP,
      name,
      startTime,
      endTime: new Date(startTime.getTime() + ONE_HOUR_IN_MILLISECONDS),
      createdById,
    },
  });
  const page = await prisma.wikiPage.create({
    data: {
      namespace: WikiPageNamespace.EVENT,
      title: "BRIEFING",
      slug: "briefing",
      eventId: event.id,
      eventReadScope,
      eventEditScope: WikiPageEventScope.MANAGERS,
    },
  });
  return { event, page };
};

/**
 * Three pending mentions: the creator of an event with a briefing for
 * managers and a participant of an event with a briefing for participants
 * can read their page, an outsider cannot read the briefing for participants
 */
const createPendingMentions = async () => {
  const author = await createReader("author");
  const creator = await createReader("creator");
  const participant = await createReader("participant");
  const outsider = await createReader("outsider");

  const managersEvent = await createEventWithRootPage(
    "Managers",
    author.id,
    WikiPageEventScope.MANAGERS,
  );
  await prisma.event.update({
    where: { id: managersEvent.event.id },
    data: { createdById: creator.id },
  });
  const participantsEvent = await createEventWithRootPage(
    "Participants",
    author.id,
    WikiPageEventScope.PARTICIPANTS,
  );
  await prisma.eventParticipant.create({
    data: {
      eventId: participantsEvent.event.id,
      source: EventSource.APP,
      citizenId: participant.id,
    },
  });

  const creatorMention = await prisma.wikiPageCitizenMention.create({
    data: {
      pageId: managersEvent.page.id,
      citizenId: creator.id,
      createdById: author.id,
    },
  });
  const participantMention = await prisma.wikiPageCitizenMention.create({
    data: {
      pageId: participantsEvent.page.id,
      citizenId: participant.id,
      createdById: author.id,
    },
  });
  const outsiderMention = await prisma.wikiPageCitizenMention.create({
    data: {
      pageId: participantsEvent.page.id,
      citizenId: outsider.id,
      createdById: author.id,
    },
  });

  return { creatorMention, participantMention, outsiderMention };
};

const getMentionStates = async () => {
  const mentions = await prisma.wikiPageCitizenMention.findMany({
    select: { id: true, notifiedAt: true, suppressedAt: true },
  });

  return new Map(
    mentions.map((mention) => [
      mention.id,
      mention.notifiedAt
        ? "notified"
        : mention.suppressedAt
          ? "suppressed"
          : "pending",
    ]),
  );
};

test("the creator of an app event reads a briefing for managers, a participant a briefing for participants", async () => {
  const { creatorMention, participantMention, outsiderMention } =
    await createPendingMentions();
  const { context, auditEvents, notifications } =
    createTestApplicationContext();

  const output = await notifyWikiCitizenMentions(context);

  expect(output).toEqual({
    pendingMentionCount: 3,
    notifiedMentionCount: 2,
    suppressedMentionCount: 1,
    notificationsSent: true,
  });

  const stateById = await getMentionStates();
  expect(stateById.get(creatorMention.id)).toBe("notified");
  expect(stateById.get(participantMention.id)).toBe("notified");
  expect(stateById.get(outsiderMention.id)).toBe("suppressed");

  expect(notifications).toHaveLength(2);
  expect(notifications).toEqual(
    expect.arrayContaining([
      {
        type: "WikiCitizenMentioned",
        payload: { mentionId: creatorMention.id },
      },
      {
        type: "WikiCitizenMentioned",
        payload: { mentionId: participantMention.id },
      },
    ]),
  );
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.WIKI_CITIZEN_MENTIONS_SWEPT,
      data: { notifiedCount: 2, suppressedCount: 1 },
      createdById: null,
    },
  ]);
});

test("a failed notification trigger keeps the mentions pending until the next run", async () => {
  const { creatorMention, participantMention, outsiderMention } =
    await createPendingMentions();
  const { context: failingContext } = createTestApplicationContext({
    notifications: {
      trigger: async () => {
        throw new Error("The event bus does not answer");
      },
    },
  });

  const output = await notifyWikiCitizenMentions(failingContext);

  expect(output.notificationsSent).toBe(false);
  const stateById = await getMentionStates();
  expect(stateById.get(creatorMention.id)).toBe("pending");
  expect(stateById.get(participantMention.id)).toBe("pending");
  expect(stateById.get(outsiderMention.id)).toBe("suppressed");

  const { context: workingContext, notifications } =
    createTestApplicationContext();

  const nextOutput = await notifyWikiCitizenMentions(workingContext);

  expect(nextOutput).toEqual({
    pendingMentionCount: 2,
    notifiedMentionCount: 2,
    suppressedMentionCount: 0,
    notificationsSent: true,
  });
  expect(notifications).toHaveLength(2);
  const nextStateById = await getMentionStates();
  expect(nextStateById.get(creatorMention.id)).toBe("notified");
  expect(nextStateById.get(participantMention.id)).toBe("notified");
});

test("a mention on a briefing of a deleted event or of an event that the citizen cannot see is suppressed", async () => {
  const author = await createReader("author");
  const participant = await createReader("participant");
  const restrictedEvent = await createEventWithRootPage(
    "Restricted",
    author.id,
    WikiPageEventScope.PARTICIPANTS,
  );
  const deletedEvent = await createEventWithRootPage(
    "Deleted",
    author.id,
    WikiPageEventScope.PARTICIPANTS,
  );
  const visibilityRole = await prisma.role.create({
    data: { name: "Visibility role" },
  });
  await prisma.event.update({
    where: { id: restrictedEvent.event.id },
    data: {
      visibility: EventVisibility.RESTRICTED,
      visibilityRoles: { create: { roleId: visibilityRole.id } },
    },
  });
  await prisma.event.update({
    where: { id: deletedEvent.event.id },
    data: { deletedAt: TEST_NOW },
  });
  await prisma.eventParticipant.createMany({
    data: [restrictedEvent, deletedEvent].map(({ event }) => ({
      eventId: event.id,
      source: EventSource.APP,
      citizenId: participant.id,
    })),
  });
  await prisma.wikiPageCitizenMention.createMany({
    data: [restrictedEvent, deletedEvent].map(({ page }) => ({
      pageId: page.id,
      citizenId: participant.id,
      createdById: author.id,
    })),
  });
  const { context, notifications } = createTestApplicationContext();

  const output = await notifyWikiCitizenMentions(context);

  expect(output).toEqual({
    pendingMentionCount: 2,
    notifiedMentionCount: 0,
    suppressedMentionCount: 2,
    notificationsSent: true,
  });
  expect(notifications).toEqual([]);
});
