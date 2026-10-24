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
import { findEventBriefingPublishedRecipients } from "./eventBriefingPublished.js";

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

  const result = await findEventBriefingPublishedRecipients(context, {
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
    await findEventBriefingPublishedRecipients(context, { eventId: event.id }),
  ).toBeNull();
});
