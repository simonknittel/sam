import { prisma, type Prisma } from "@sam-monorepo/database";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import {
  createCitizenWithPermissions,
  MAXIMUM_LEVEL,
} from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { findManualNotificationRecipients } from "./manualNotificationCreated.js";

const LOGIN_PERMISSION_STRINGS = ["login;manage"];

/** A linked user who passes the clearance page */
const CLEARED_USER = {
  user: { create: { emailVerified: TEST_NOW } },
} as const satisfies Prisma.CitizenCreateInput;

interface ManualNotificationFixture {
  readonly citizenIds?: readonly string[];
  readonly roleIds?: readonly string[];
  readonly createdById?: string;
}

const createManualNotification = ({
  citizenIds = [],
  roleIds = [],
  createdById,
}: ManualNotificationFixture) =>
  prisma.manualNotification.create({
    data: {
      title: "Wartung heute Abend",
      body: "SAM ist ab 22 Uhr kurz nicht erreichbar.",
      createdById,
      receiverCitizens: {
        create: citizenIds.map((citizenId) => ({ citizenId })),
      },
      receiverRoles: { create: roleIds.map((roleId) => ({ roleId })) },
    },
  });

const findRecipientIds = async (manualNotificationId: string) => {
  const { context } = createTestApplicationContext();

  const result = await findManualNotificationRecipients(context, {
    manualNotificationId,
  });

  return result?.recipients.map((recipient) => recipient.citizenId).toSorted();
};

beforeEach(async () => {
  await truncateAllTables();
});

describe("findManualNotificationRecipients", () => {
  test("gives the wording with the recipients, and null for an unknown notification", async () => {
    const receiver = await createCitizenWithPermissions(
      "receiver",
      LOGIN_PERMISSION_STRINGS,
      [],
      CLEARED_USER,
    );
    const notification = await createManualNotification({
      citizenIds: [receiver.id],
    });
    const { context } = createTestApplicationContext();

    expect(
      await findManualNotificationRecipients(context, {
        manualNotificationId: notification.id,
      }),
    ).toEqual({
      notification: {
        id: notification.id,
        title: "Wartung heute Abend",
        body: "SAM ist ab 22 Uhr kurz nicht erreichbar.",
      },
      recipients: [{ citizenId: receiver.id }],
    });

    expect(
      await findManualNotificationRecipients(context, {
        manualNotificationId: "unknown",
      }),
    ).toBeNull();
  });

  test("notifies only the selected citizens who pass the clearance page", async () => {
    const cleared = await createCitizenWithPermissions(
      "cleared",
      LOGIN_PERMISSION_STRINGS,
      [],
      CLEARED_USER,
    );
    const withoutLogin = await createCitizenWithPermissions(
      "without-login",
      [],
      [],
      CLEARED_USER,
    );
    const withoutConfirmedEmail = await createCitizenWithPermissions(
      "without-confirmed-email",
      LOGIN_PERMISSION_STRINGS,
      [],
      { user: { create: {} } },
    );
    const banned = await createCitizenWithPermissions(
      "banned",
      LOGIN_PERMISSION_STRINGS,
      [],
      { user: { create: { emailVerified: TEST_NOW, bannedAt: TEST_NOW } } },
    );
    const withoutUser = await createCitizenWithPermissions(
      "without-user",
      LOGIN_PERMISSION_STRINGS,
    );
    await createCitizenWithPermissions(
      "not-selected",
      LOGIN_PERMISSION_STRINGS,
      [],
      CLEARED_USER,
    );
    const notification = await createManualNotification({
      citizenIds: [
        cleared.id,
        withoutLogin.id,
        withoutConfirmedEmail.id,
        banned.id,
        withoutUser.id,
      ],
    });

    expect(await findRecipientIds(notification.id)).toEqual([cleared.id]);
  });

  test("does not notify a deleted citizen", async () => {
    const citizen = await createCitizenWithPermissions(
      "deleted",
      LOGIN_PERMISSION_STRINGS,
      [],
      CLEARED_USER,
    );
    const notification = await createManualNotification({
      citizenIds: [citizen.id],
    });

    expect(await findRecipientIds(notification.id)).toEqual([citizen.id]);

    // The delete also removes the login, see `Citizen.deletedAt`
    await prisma.citizen.update({
      where: { id: citizen.id },
      data: { deletedAt: TEST_NOW, userId: null },
    });

    expect(await findRecipientIds(notification.id)).toEqual([]);
  });

  test("notifies the members of a selected role through their effective roles, the sender included", async () => {
    const selectedRole = await prisma.role.create({
      data: { name: "Selected role" },
    });
    const inheritingRole = await prisma.role.create({
      data: {
        name: "Inheriting role",
        inherits: { connect: { id: selectedRole.id } },
      },
    });
    const leveledSelectedRole = await prisma.role.create({
      data: { name: "Leveled selected role", maxLevel: MAXIMUM_LEVEL },
    });

    const directHolder = await createCitizenWithPermissions(
      "direct-holder",
      LOGIN_PERMISSION_STRINGS,
      [selectedRole.id],
      CLEARED_USER,
    );
    const inheritedHolder = await createCitizenWithPermissions(
      "inherited-holder",
      LOGIN_PERMISSION_STRINGS,
      [inheritingRole.id],
      CLEARED_USER,
    );
    const belowMaximumLevel = await createCitizenWithPermissions(
      "below-maximum-level",
      LOGIN_PERMISSION_STRINGS,
      [],
      CLEARED_USER,
    );
    await prisma.roleAssignment.create({
      data: {
        citizenId: belowMaximumLevel.id,
        roleId: leveledSelectedRole.id,
        currentLevel: MAXIMUM_LEVEL - 1,
      },
    });
    await createCitizenWithPermissions(
      "holder-without-login",
      [],
      [selectedRole.id],
      CLEARED_USER,
    );
    await createCitizenWithPermissions(
      "without-role",
      LOGIN_PERMISSION_STRINGS,
      [],
      CLEARED_USER,
    );
    const notification = await createManualNotification({
      roleIds: [selectedRole.id, leveledSelectedRole.id],
      createdById: directHolder.id,
    });

    expect(await findRecipientIds(notification.id)).toEqual(
      [directHolder.id, inheritedHolder.id].toSorted(),
    );
  });

  test("notifies a citizen who is selected directly and through a role once", async () => {
    const selectedRole = await prisma.role.create({
      data: { name: "Selected role" },
    });
    const citizen = await createCitizenWithPermissions(
      "both",
      LOGIN_PERMISSION_STRINGS,
      [selectedRole.id],
      CLEARED_USER,
    );
    const notification = await createManualNotification({
      citizenIds: [citizen.id],
      roleIds: [selectedRole.id],
    });

    expect(await findRecipientIds(notification.id)).toEqual([citizen.id]);
  });
});
