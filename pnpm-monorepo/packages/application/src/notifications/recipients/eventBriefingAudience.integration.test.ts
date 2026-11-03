import { prisma } from "@sam-monorepo/database";
import {
  EventSource,
  WikiPageEventScope,
  WikiPageNamespace,
} from "@sam-monorepo/database/client";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import {
  findEventBriefingAudienceRecipients,
  findEventBriefingUpdatedRecipients,
} from "./eventBriefingAudience.js";

/** The event notifications reach the citizens who can log in and read events */
const NOTIFIABLE_PERMISSION_STRINGS = ["login;manage", "event;read"];

beforeEach(async () => {
  await truncateAllTables();
});

test("the current position scope of the root page reaches the citizens of the subtree of the position", async () => {
  const [rootAssignee, middleAssignee, leafAssignee, siblingAssignee] =
    await Promise.all(
      ["root", "middle", "leaf", "sibling"].map((handle) =>
        createCitizenWithPermissions(handle, NOTIFIABLE_PERMISSION_STRINGS),
      ),
    );
  const event = await prisma.event.create({
    data: { source: EventSource.APP, name: "Einsatz", startTime: TEST_NOW },
  });
  const createPosition = (
    name: string,
    citizenId: string,
    parentPositionId: string | null,
  ) =>
    prisma.eventPosition.create({
      data: { eventId: event.id, name, citizenId, parentPositionId },
    });
  const root = await createPosition("Root", rootAssignee!.id, null);
  const middle = await createPosition("Middle", middleAssignee!.id, root.id);
  await createPosition("Leaf", leafAssignee!.id, middle.id);
  await createPosition("Sibling", siblingAssignee!.id, root.id);
  const rootPage = await prisma.wikiPage.create({
    data: {
      namespace: WikiPageNamespace.EVENT,
      title: "BRIEFING",
      slug: "briefing",
      eventId: event.id,
      eventReadScope: WikiPageEventScope.POSITION,
      eventReadScopePositionId: middle.id,
      eventEditScope: WikiPageEventScope.MANAGERS,
    },
  });
  const { context } = createTestApplicationContext();

  const result = await findEventBriefingAudienceRecipients(context, {
    eventId: event.id,
  });

  expect(
    result?.recipients.map((recipient) => recipient.citizenId).toSorted(),
  ).toEqual([middleAssignee!.id, leafAssignee!.id].toSorted());

  // A manager closed the briefing again before the delivery
  await prisma.wikiPage.update({
    where: { id: rootPage.id },
    data: {
      eventReadScope: WikiPageEventScope.MANAGERS,
      eventReadScopePositionId: null,
    },
  });

  expect(
    await findEventBriefingAudienceRecipients(context, { eventId: event.id }),
  ).toBeNull();
});

test("the citizen who caused the notification is not a recipient", async () => {
  const [announcer, participant] = await Promise.all(
    ["announcer", "participant"].map((handle) =>
      createCitizenWithPermissions(handle, NOTIFIABLE_PERMISSION_STRINGS),
    ),
  );
  const event = await prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: TEST_NOW,
      participants: {
        create: [announcer!.id, participant!.id].map((citizenId) => ({
          source: EventSource.APP,
          citizenId,
        })),
      },
    },
  });
  await prisma.wikiPage.create({
    data: {
      namespace: WikiPageNamespace.EVENT,
      title: "BRIEFING",
      slug: "briefing",
      eventId: event.id,
      eventReadScope: WikiPageEventScope.PARTICIPANTS,
      eventEditScope: WikiPageEventScope.MANAGERS,
    },
  });
  const { context } = createTestApplicationContext();

  const result = await findEventBriefingAudienceRecipients(context, {
    eventId: event.id,
    excludedCitizenId: announcer!.id,
  });

  expect(result?.recipients).toEqual([{ citizenId: participant!.id }]);
});

test("an update reaches the audience and the organizers once, without the citizen who announced it", async () => {
  const [announcer, coManager, participatingManager, participant] =
    await Promise.all(
      ["announcer", "co-manager", "participating-manager", "participant"].map(
        (handle) =>
          createCitizenWithPermissions(handle, NOTIFIABLE_PERMISSION_STRINGS),
      ),
    );
  const event = await prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: TEST_NOW,
      createdById: announcer!.id,
      managers: {
        connect: [coManager!, participatingManager!].map((citizen) => ({
          id: citizen.id,
        })),
      },
      participants: {
        create: [participatingManager!.id, participant!.id].map(
          (citizenId) => ({ source: EventSource.APP, citizenId }),
        ),
      },
    },
  });
  const rootPage = await prisma.wikiPage.create({
    data: {
      namespace: WikiPageNamespace.EVENT,
      title: "BRIEFING",
      slug: "briefing",
      eventId: event.id,
      eventReadScope: WikiPageEventScope.PARTICIPANTS,
      eventEditScope: WikiPageEventScope.MANAGERS,
    },
  });
  const { context } = createTestApplicationContext();
  const input = { eventId: event.id, excludedCitizenId: announcer!.id };

  const result = await findEventBriefingUpdatedRecipients(context, input);

  expect(
    result?.recipients.map((recipient) => recipient.citizenId).toSorted(),
  ).toEqual(
    [coManager!.id, participatingManager!.id, participant!.id].toSorted(),
  );

  // A manager closed the briefing again: the organizers can still read it
  await prisma.wikiPage.update({
    where: { id: rootPage.id },
    data: { eventReadScope: WikiPageEventScope.MANAGERS },
  });

  expect(
    (await findEventBriefingUpdatedRecipients(context, input))?.recipients
      .map((recipient) => recipient.citizenId)
      .toSorted(),
  ).toEqual([coManager!.id, participatingManager!.id].toSorted());
});
