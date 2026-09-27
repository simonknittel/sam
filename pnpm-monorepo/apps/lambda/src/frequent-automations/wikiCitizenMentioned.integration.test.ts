import { prisma } from "@sam-monorepo/database";
import {
  EventSource,
  WikiPageEventScope,
  WikiPageNamespace,
} from "@sam-monorepo/database/client";
import { beforeEach, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../test/database";
import { wikiCitizenMentioned } from "./wikiCitizenMentioned";

vi.mock("../common/eventbridge", () => ({ emitEvents: vi.fn() }));

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
  const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const event = await prisma.event.create({
    data: {
      source: EventSource.APP,
      name,
      startTime,
      endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
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

test("the creator of an app event reads a briefing for managers, a participant a briefing for participants", async () => {
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

  await wikiCitizenMentioned();

  const mentions = await prisma.wikiPageCitizenMention.findMany({
    select: { id: true, notifiedAt: true, suppressedAt: true },
  });
  const stateById = new Map(
    mentions.map((mention) => [
      mention.id,
      mention.notifiedAt
        ? "notified"
        : mention.suppressedAt
          ? "suppressed"
          : "pending",
    ]),
  );
  expect(stateById.get(creatorMention.id)).toBe("notified");
  expect(stateById.get(participantMention.id)).toBe("notified");
  expect(stateById.get(outsiderMention.id)).toBe("suppressed");
});
