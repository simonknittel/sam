import { prisma } from "@sam-monorepo/database";
import { EventSource, EventVisibility } from "@sam-monorepo/database/client";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import {
  createCitizenWithInheritedPermissions,
  createCitizenWithPermissions,
} from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { findEventCreatedRecipients } from "./eventCreated.js";
import {
  findEventDeletedRecipients,
  findEventParticipantRecipients,
} from "./eventParticipants.js";
import { findEventParticipationRecipient } from "./eventParticipation.js";

/** The event notifications reach the citizens who can log in and read events */
const NOTIFIABLE_PERMISSION_STRINGS = ["login;manage", "event;read"];

const createRestrictedEvent = async () => {
  const visibilityRole = await prisma.role.create({
    data: { name: "Visibility role" },
  });
  const event = await prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: TEST_NOW,
      visibility: EventVisibility.RESTRICTED,
      visibilityRoles: { create: { roleId: visibilityRole.id } },
    },
  });

  return { event, visibilityRole };
};

const toSortedCitizenIds = (
  recipients: readonly { readonly citizenId: string }[] | undefined,
) => recipients?.map((recipient) => recipient.citizenId).toSorted();

beforeEach(async () => {
  await truncateAllTables();
});

test("a restricted event reaches the citizens who can see it with their effective roles", async () => {
  const { event, visibilityRole } = await createRestrictedEvent();
  const viewer = await createCitizenWithPermissions(
    "viewer",
    NOTIFIABLE_PERMISSION_STRINGS,
    [visibilityRole.id],
  );
  const inheritedManager = await createCitizenWithInheritedPermissions(
    "inherited-manager",
    [...NOTIFIABLE_PERMISSION_STRINGS, "event;manage"],
  );
  await createCitizenWithPermissions(
    "negated-event-read",
    [...NOTIFIABLE_PERMISSION_STRINGS, "event;negate"],
    [visibilityRole.id],
  );
  await createCitizenWithPermissions(
    "without-visibility-role",
    NOTIFIABLE_PERMISSION_STRINGS,
  );
  const { context } = createTestApplicationContext();

  const result = await findEventCreatedRecipients(context, {
    eventId: event.id,
  });

  expect(toSortedCitizenIds(result?.recipients)).toEqual(
    [viewer.id, inheritedManager.id].toSorted(),
  );
});

test("the deletion reaches the participants, other notifications of a deleted event reach nobody", async () => {
  const participant = await createCitizenWithPermissions(
    "participant",
    NOTIFIABLE_PERMISSION_STRINGS,
  );
  const event = await prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: TEST_NOW,
      deletedAt: TEST_NOW,
      participants: {
        create: { source: EventSource.APP, citizenId: participant.id },
      },
    },
  });
  const { context } = createTestApplicationContext();

  const deleted = await findEventDeletedRecipients(context, {
    eventId: event.id,
  });
  const updated = await findEventParticipantRecipients(context, {
    eventId: event.id,
  });

  expect(deleted?.recipients).toEqual([{ citizenId: participant.id }]);
  expect(updated?.recipients).toEqual([]);
});

test("a participation notification reaches the citizen only while the citizen can see the event", async () => {
  const { event, visibilityRole } = await createRestrictedEvent();
  const citizen = await createCitizenWithPermissions(
    "citizen",
    NOTIFIABLE_PERMISSION_STRINGS,
    [visibilityRole.id],
  );
  const { context } = createTestApplicationContext();
  const input = { eventId: event.id, citizenId: citizen.id };

  expect(
    (await findEventParticipationRecipient(context, input))?.recipients,
  ).toEqual([{ citizenId: citizen.id }]);

  // The citizen lost the visibility role before the delivery
  await prisma.roleAssignment.deleteMany({
    where: { citizenId: citizen.id, roleId: visibilityRole.id },
  });

  expect(
    (await findEventParticipationRecipient(context, input))?.recipients,
  ).toEqual([]);
});
