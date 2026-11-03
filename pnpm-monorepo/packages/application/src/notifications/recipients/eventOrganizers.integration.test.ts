import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { findEventOrganizerRecipients } from "./eventOrganizers.js";
import { findEventPositionApplicationRecipients } from "./eventPositionApplicationCreated.js";

/** The event notifications reach the citizens who can log in and read events */
const NOTIFIABLE_PERMISSION_STRINGS = ["login;manage", "event;read"];

/** The lineup notifications also need the permission of the lineup page */
const LINEUP_NOTIFIABLE_PERMISSION_STRINGS = [
  ...NOTIFIABLE_PERMISSION_STRINGS,
  "ship;read",
];

const DISCORD_CREATOR_ID = "discord-creator-id";

/**
 * An event with each kind of organizer, and with a manager who causes the
 * change, a manager who cannot log in, a manager who cannot open the lineup
 * page and a holder of `event;manage` who is no organizer
 */
const createOrganizedEvent = async () => {
  const [
    creator,
    manager,
    discordCreator,
    actingManager,
    managerWithoutLogin,
    managerWithoutShipRead,
  ] = await Promise.all([
    createCitizenWithPermissions(
      "creator",
      LINEUP_NOTIFIABLE_PERMISSION_STRINGS,
    ),
    createCitizenWithPermissions(
      "manager",
      LINEUP_NOTIFIABLE_PERMISSION_STRINGS,
    ),
    createCitizenWithPermissions(
      "discord-creator",
      LINEUP_NOTIFIABLE_PERMISSION_STRINGS,
      [],
      { discordId: DISCORD_CREATOR_ID },
    ),
    createCitizenWithPermissions(
      "acting-manager",
      LINEUP_NOTIFIABLE_PERMISSION_STRINGS,
    ),
    createCitizenWithPermissions("manager-without-login", [
      "event;read",
      "ship;read",
    ]),
    createCitizenWithPermissions(
      "manager-without-ship-read",
      NOTIFIABLE_PERMISSION_STRINGS,
    ),
  ]);
  await createCitizenWithPermissions("event-manager", [
    ...LINEUP_NOTIFIABLE_PERMISSION_STRINGS,
    "event;manage",
    "othersEventPosition;manage",
  ]);
  const event = await prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: TEST_NOW,
      createdById: creator.id,
      discordCreatorId: DISCORD_CREATOR_ID,
      managers: {
        connect: [
          manager,
          actingManager,
          managerWithoutLogin,
          managerWithoutShipRead,
        ].map((citizen) => ({ id: citizen.id })),
      },
    },
  });

  return {
    event,
    actingManager,
    /** The organizers who get a notification about the lineup */
    lineupRecipientIds: [creator.id, manager.id, discordCreator.id],
    managerWithoutShipRead,
  };
};

const toSortedCitizenIds = (
  recipients: readonly { readonly citizenId: string }[] | undefined,
) => recipients?.map((recipient) => recipient.citizenId).toSorted();

beforeEach(async () => {
  await truncateAllTables();
});

test("the organizers who can log in hear about the change of a citizen, the citizen does not", async () => {
  const { event, actingManager, lineupRecipientIds, managerWithoutShipRead } =
    await createOrganizedEvent();
  const { context } = createTestApplicationContext();

  const result = await findEventOrganizerRecipients(context, {
    eventId: event.id,
    citizenId: actingManager.id,
  });

  expect(result?.citizen).toEqual({ handle: "acting-manager" });
  expect(toSortedCitizenIds(result?.recipients)).toEqual(
    [...lineupRecipientIds, managerWithoutShipRead.id].toSorted(),
  );
});

test("a new application reaches the organizers who can open the lineup page without the applicant, a withdrawn one nobody", async () => {
  const { event, actingManager, lineupRecipientIds } =
    await createOrganizedEvent();
  const position = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Pilot" },
  });
  const application = await prisma.eventPositionApplication.create({
    data: { positionId: position.id, citizenId: actingManager.id },
  });
  const { context } = createTestApplicationContext();
  const input = { applicationId: application.id };

  const result = await findEventPositionApplicationRecipients(context, input);

  expect(result?.position).toEqual({ name: "Pilot" });
  expect(result?.citizen).toEqual({ handle: "acting-manager" });
  expect(toSortedCitizenIds(result?.recipients)).toEqual(
    lineupRecipientIds.toSorted(),
  );

  await prisma.eventPositionApplication.delete({
    where: { id: application.id },
  });

  expect(
    await findEventPositionApplicationRecipients(context, input),
  ).toBeNull();
});
