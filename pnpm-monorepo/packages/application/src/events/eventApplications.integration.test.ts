import { prisma } from "@sam-monorepo/database";
import { EventSource, EventVisibility } from "@sam-monorepo/database/client";
import {
  EventApplicationAnswer,
  EventApplicationStatus,
} from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../test/database.js";
import { ConflictError, ValidationError } from "../errors.js";
import { findEventApplicationRecipients } from "../notifications/recipients/eventApplicationCreated.js";
import { addEventParticipants } from "./addEventParticipants.js";
import {
  approveEventApplications,
  declineEventApplications,
} from "./answerEventApplications.js";
import { acceptEventInvitation } from "./answerEventInvitation.js";
import { EventErrorMessage } from "./eventErrors.js";
import { inviteEventParticipants } from "./inviteEventParticipants.js";
import {
  applyForEvent,
  withdrawEventApplication,
} from "./ownEventApplication.js";
import { signUpForEvent } from "./signUpForEvent.js";
import { EventChange, updateEvent } from "./updateEvent.js";

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

/**
 * A member who can log in and see the public events. An approval, like a
 * direct add, needs such a citizen.
 */
const createCitizen = async (handle: string) => {
  const citizen = await createCitizenWithPermissions(handle, [
    "login;manage",
    "event;read",
  ]);

  return { id: citizen.id, handle: citizen.handle };
};

const createActorOf = (citizen: { id: string; handle: string | null }) =>
  createTestActor({
    userId: `user-${citizen.id}`,
    citizen,
    permissionStrings: ["event;read"],
  });

/** An app event of the organizer that starts in one hour and requires applications */
const createAppEvent = (organizerId: string) =>
  prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: new Date(TEST_NOW.getTime() + HOUR_IN_MILLISECONDS),
      endTime: new Date(TEST_NOW.getTime() + 3 * HOUR_IN_MILLISECONDS),
      createdById: organizerId,
      applicationRequired: true,
    },
  });

beforeEach(async () => {
  await truncateAllTables();
});

test("an applicant cannot sign up, and the approval signs the applicant up with the comment", async () => {
  const [organizer, applicant] = await Promise.all(
    ["organizer", "applicant"].map(createCitizen),
  );
  const event = await createAppEvent(organizer!.id);
  const applicantActor = createActorOf(applicant!);

  const { context, notifications } = createTestApplicationContext();

  await expect(
    signUpForEvent(context, applicantActor, { event_id: event.id }),
  ).rejects.toThrow(new ConflictError(EventErrorMessage.ApplicationRequired));

  const applied = await applyForEvent(context, applicantActor, {
    event_id: event.id,
    comment: "Gladius",
  });
  expect(applied.application_required).toBe(true);
  expect(applied.is_participating).toBe(false);
  expect(applied.applications).toEqual([
    expect.objectContaining({
      citizen: expect.objectContaining({ id: applicant!.id }),
      status: EventApplicationStatus.Open,
      comment: "Gladius",
    }),
  ]);

  // The organizers hear about the open application
  expect(notifications).toEqual([
    {
      type: "EventApplicationCreated",
      payload: { applicationId: expect.any(String) },
    },
  ]);
  const { applicationId } = notifications[0]!.payload as {
    applicationId: string;
  };
  const recipients = await findEventApplicationRecipients(context, {
    applicationId,
  });
  expect(recipients?.application.comment).toBe("Gladius");
  expect(recipients?.citizen.handle).toBe("applicant");

  await expect(
    applyForEvent(context, applicantActor, { event_id: event.id }),
  ).rejects.toThrow(new ConflictError(EventErrorMessage.AlreadyApplied));

  const { context: answerContext, notifications: answerNotifications } =
    createTestApplicationContext();
  const approved = await approveEventApplications(
    answerContext,
    createActorOf(organizer!),
    { event_id: event.id, citizen_ids: [applicant!.id] },
  );

  expect(approved.approved_citizen_ids).toEqual([applicant!.id]);
  expect(approved.event.applications).toEqual([]);
  expect(approved.event.participants).toEqual([
    expect.objectContaining({
      citizen: expect.objectContaining({ id: applicant!.id }),
      comment: "Gladius",
    }),
  ]);
  expect(answerNotifications).toEqual([
    {
      type: "EventApplicationAnswered",
      payload: {
        eventId: event.id,
        citizenId: applicant!.id,
        answer: EventApplicationAnswer.Approved,
        reason: null,
      },
    },
  ]);

  // An answered application needs no notification of the organizers anymore
  expect(
    await findEventApplicationRecipients(context, { applicationId }),
  ).toBeNull();
});

test("a manager of the event signs up directly and cannot apply", async () => {
  const organizer = await createCitizen("organizer");
  const event = await createAppEvent(organizer.id);
  const organizerActor = createActorOf(organizer);
  const { context } = createTestApplicationContext();

  await expect(
    applyForEvent(context, organizerActor, { event_id: event.id }),
  ).rejects.toThrow(
    new ConflictError(EventErrorMessage.ApplicationNotRequired),
  );

  const signedUp = await signUpForEvent(context, organizerActor, {
    event_id: event.id,
  });
  expect(signedUp.is_participating).toBe(true);
});

test("a declined applicant cannot apply again, but an applicant who withdrew can", async () => {
  const [organizer, declinedApplicant, withdrawingApplicant] =
    await Promise.all(
      ["organizer", "declined", "withdrawing"].map(createCitizen),
    );
  const event = await createAppEvent(organizer!.id);
  const { context, notifications } = createTestApplicationContext();

  await applyForEvent(context, createActorOf(declinedApplicant!), {
    event_id: event.id,
  });
  await applyForEvent(context, createActorOf(withdrawingApplicant!), {
    event_id: event.id,
  });
  notifications.length = 0;

  const declined = await declineEventApplications(
    context,
    createActorOf(organizer!),
    {
      event_id: event.id,
      citizen_ids: [declinedApplicant!.id],
      reason: "Kein Platz mehr",
    },
  );
  expect(declined.event.applications).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        citizen: expect.objectContaining({ id: declinedApplicant!.id }),
        status: EventApplicationStatus.Declined,
        decline_reason: "Kein Platz mehr",
        declined_by: expect.objectContaining({ id: organizer!.id }),
      }),
    ]),
  );
  expect(notifications).toEqual([
    {
      type: "EventApplicationAnswered",
      payload: {
        eventId: event.id,
        citizenId: declinedApplicant!.id,
        answer: EventApplicationAnswer.Declined,
        reason: "Kein Platz mehr",
      },
    },
  ]);

  await expect(
    applyForEvent(context, createActorOf(declinedApplicant!), {
      event_id: event.id,
    }),
  ).rejects.toThrow(new ConflictError(EventErrorMessage.ApplicationDeclined));

  // A second answer to the same application changes nothing
  await expect(
    approveEventApplications(context, createActorOf(organizer!), {
      event_id: event.id,
      citizen_ids: [declinedApplicant!.id, withdrawingApplicant!.id],
    }),
  ).rejects.toThrow(new ConflictError(EventErrorMessage.CitizenNotApplied));
  expect(
    await prisma.eventParticipant.count({ where: { eventId: event.id } }),
  ).toBe(0);

  await withdrawEventApplication(
    context,
    createActorOf(withdrawingApplicant!),
    { event_id: event.id },
  );
  const reapplied = await applyForEvent(
    context,
    createActorOf(withdrawingApplicant!),
    { event_id: event.id },
  );
  expect(reapplied.applications).toHaveLength(2);
});

test("the switch of the applications to false approves the open applications", async () => {
  const [organizer, applicant] = await Promise.all(
    ["organizer", "applicant"].map(createCitizen),
  );
  const event = await createAppEvent(organizer!.id);
  const { context, notifications } = createTestApplicationContext();
  await applyForEvent(context, createActorOf(applicant!), {
    event_id: event.id,
    comment: "Cutlass",
  });
  notifications.length = 0;

  const output = await updateEvent(context, createActorOf(organizer!), {
    event_id: event.id,
    application_required: false,
  });

  expect(output.changes).toEqual([EventChange.ApplicationRequired]);
  expect(output.event.application_required).toBe(false);
  expect(output.event.applications).toEqual([]);
  expect(output.event.participants).toEqual([
    expect.objectContaining({
      citizen: expect.objectContaining({ id: applicant!.id }),
      comment: "Cutlass",
    }),
  ]);
  expect(notifications).toEqual([
    {
      type: "EventApplicationAnswered",
      payload: {
        eventId: event.id,
        citizenId: applicant!.id,
        answer: EventApplicationAnswer.Approved,
        reason: null,
      },
    },
  ]);

  // Without the requirement, nobody applies
  const [latecomer] = await Promise.all(["latecomer"].map(createCitizen));
  await expect(
    applyForEvent(context, createActorOf(latecomer!), { event_id: event.id }),
  ).rejects.toThrow(
    new ConflictError(EventErrorMessage.ApplicationNotRequired),
  );
});

test("an add, an accepted invitation and the switch of the participation close an open application", async () => {
  const [organizer, addedApplicant, invitedApplicant, waitingApplicant, guest] =
    await Promise.all(
      ["organizer", "added", "invited", "waiting", "guest"].map(createCitizen),
    );
  const event = await createAppEvent(organizer!.id);
  const organizerActor = createActorOf(organizer!);
  const { context } = createTestApplicationContext();
  for (const applicant of [addedApplicant, invitedApplicant, waitingApplicant])
    await applyForEvent(context, createActorOf(applicant!), {
      event_id: event.id,
    });

  // A direct add approves the application
  await addEventParticipants(context, organizerActor, {
    event_id: event.id,
    citizen_ids: [addedApplicant!.id],
  });

  // An accepted invitation withdraws the application
  await inviteEventParticipants(context, organizerActor, {
    event_id: event.id,
    citizen_ids: [invitedApplicant!.id, guest!.id],
  });
  await acceptEventInvitation(context, createActorOf(invitedApplicant!), {
    event_id: event.id,
  });

  // An invited citizen answers the invitation instead of an application
  await expect(
    applyForEvent(context, createActorOf(guest!), { event_id: event.id }),
  ).rejects.toThrow(
    new ConflictError(EventErrorMessage.InvitedInsteadOfApplication),
  );

  // The switch of the participation to false withdraws the open application
  await updateEvent(context, organizerActor, {
    event_id: event.id,
    participation_enabled: false,
  });

  const applications = await prisma.eventApplication.findMany({
    where: { eventId: event.id },
    select: { citizenId: true, approvedById: true, withdrawnById: true },
  });
  expect(applications).toHaveLength(3);
  expect(applications).toEqual(
    expect.arrayContaining([
      {
        citizenId: addedApplicant!.id,
        approvedById: organizer!.id,
        withdrawnById: null,
      },
      {
        citizenId: invitedApplicant!.id,
        approvedById: null,
        withdrawnById: invitedApplicant!.id,
      },
      {
        citizenId: waitingApplicant!.id,
        approvedById: null,
        withdrawnById: organizer!.id,
      },
    ]),
  );
});

test("a citizen who cannot see the event anymore is not approved", async () => {
  const [organizer, applicant] = await Promise.all(
    ["organizer", "applicant"].map(createCitizen),
  );
  const event = await createAppEvent(organizer!.id);
  const { context, notifications } = createTestApplicationContext();
  await applyForEvent(context, createActorOf(applicant!), {
    event_id: event.id,
  });

  // A manager restricts the event to a role that the applicant does not have
  const pilots = await prisma.role.create({ data: { name: "Piloten" } });
  await prisma.event.update({
    where: { id: event.id },
    data: {
      visibility: EventVisibility.RESTRICTED,
      visibilityRoles: { create: { roleId: pilots.id } },
    },
  });
  notifications.length = 0;

  await expect(
    approveEventApplications(context, createActorOf(organizer!), {
      event_id: event.id,
      citizen_ids: [applicant!.id],
    }),
  ).rejects.toThrow(
    new ValidationError(EventErrorMessage.CitizenCannotSeeEvent),
  );

  // The switch to false withdraws the application instead of an approval
  await updateEvent(context, createActorOf(organizer!), {
    event_id: event.id,
    application_required: false,
  });
  expect(
    await prisma.eventApplication.findFirstOrThrow({
      where: { eventId: event.id, citizenId: applicant!.id },
      select: { approvedAt: true, withdrawnById: true },
    }),
  ).toEqual({ approvedAt: null, withdrawnById: organizer!.id });
  expect(
    await prisma.eventParticipant.count({ where: { eventId: event.id } }),
  ).toBe(0);
  expect(notifications).toEqual([]);
});
