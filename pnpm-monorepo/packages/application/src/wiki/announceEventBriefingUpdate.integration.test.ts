import { prisma } from "@sam-monorepo/database";
import {
  EventSource,
  WikiPageEventScope,
  WikiPageNamespace,
} from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { ConflictError, ForbiddenError } from "../errors.js";
import { announceEventBriefingUpdate } from "./announceEventBriefingUpdate.js";
import { WikiErrorMessage } from "./wikiErrors.js";

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

beforeEach(async () => {
  await truncateAllTables();
});

/**
 * An event of the manager from `startTime` for two hours. The participants
 * can read its briefing when it is published, else only the managers.
 */
const createEventWithBriefing = async (
  managerId: string,
  {
    startTime,
    briefingPublishedAt,
  }: {
    readonly startTime: Date;
    readonly briefingPublishedAt: Date | null;
  },
) => {
  const event = await prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime,
      endTime: new Date(startTime.getTime() + 2 * HOUR_IN_MILLISECONDS),
      createdById: managerId,
      briefingPublishedAt,
    },
  });
  await prisma.wikiPage.create({
    data: {
      namespace: WikiPageNamespace.EVENT,
      title: "BRIEFING",
      slug: "briefing",
      eventId: event.id,
      eventReadScope: briefingPublishedAt
        ? WikiPageEventScope.PARTICIPANTS
        : WikiPageEventScope.MANAGERS,
      eventEditScope: WikiPageEventScope.MANAGERS,
    },
  });

  return event;
};

/** A citizen who can see the events, but manages none by a permission */
const createCitizenActor = async (handle: string) => {
  const citizen = await prisma.citizen.create({
    data: { handle },
    select: { id: true, handle: true },
  });

  return createTestActor({
    userId: `user-${citizen.id}`,
    citizen,
    permissionStrings: ["event;read"],
  });
};

test("a published briefing notifies its readers without the manager who announced", async () => {
  const actor = await createCitizenActor("manager");
  const event = await createEventWithBriefing(actor.citizen!.id, {
    startTime: new Date(TEST_NOW.getTime() + HOUR_IN_MILLISECONDS),
    briefingPublishedAt: TEST_NOW,
  });
  const { context, auditEvents, notifications } =
    createTestApplicationContext();

  await announceEventBriefingUpdate(context, actor, {
    event_id: event.id,
  });

  expect(notifications).toEqual([
    {
      type: "EventBriefingUpdated",
      payload: { eventId: event.id, actorCitizenId: actor.citizen!.id },
    },
  ]);
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.EVENT_BRIEFING_UPDATE_ANNOUNCED,
      data: { eventId: event.id },
      createdById: actor.userId,
    },
  ]);
});

test("an unpublished briefing and an event that ended refuse the announcement", async () => {
  const actor = await createCitizenActor("manager");
  const unpublishedEvent = await createEventWithBriefing(actor.citizen!.id, {
    startTime: new Date(TEST_NOW.getTime() + HOUR_IN_MILLISECONDS),
    briefingPublishedAt: null,
  });
  const endedEvent = await createEventWithBriefing(actor.citizen!.id, {
    startTime: new Date(TEST_NOW.getTime() - 3 * HOUR_IN_MILLISECONDS),
    briefingPublishedAt: TEST_NOW,
  });
  const { context, auditEvents, notifications } =
    createTestApplicationContext();

  await expect(
    announceEventBriefingUpdate(context, actor, {
      event_id: unpublishedEvent.id,
    }),
  ).rejects.toThrow(new ConflictError(WikiErrorMessage.BriefingNotPublished));
  await expect(
    announceEventBriefingUpdate(context, actor, { event_id: endedEvent.id }),
  ).rejects.toThrow(new ConflictError(WikiErrorMessage.BriefingFrozen));

  expect(auditEvents).toEqual([]);
  expect(notifications).toEqual([]);
});

test("a citizen who cannot manage the event cannot announce, and nothing is sent", async () => {
  const manager = await createCitizenActor("manager");
  const reader = await createCitizenActor("reader");
  const event = await createEventWithBriefing(manager.citizen!.id, {
    startTime: new Date(TEST_NOW.getTime() + HOUR_IN_MILLISECONDS),
    briefingPublishedAt: TEST_NOW,
  });
  const { context, auditEvents, notifications } =
    createTestApplicationContext();

  await expect(
    announceEventBriefingUpdate(context, reader, { event_id: event.id }),
  ).rejects.toThrow(ForbiddenError);

  expect(auditEvents).toEqual([]);
  expect(notifications).toEqual([]);
});
