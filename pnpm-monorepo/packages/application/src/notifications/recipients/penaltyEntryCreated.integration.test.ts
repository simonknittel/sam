import { prisma } from "@sam-monorepo/database";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import {
  createCitizenWithInheritedPermissions,
  createCitizenWithLeveledRole,
  MAXIMUM_LEVEL,
} from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import {
  findPenaltyEntryExpiredRecipient,
  findPenaltyEntryRecipient,
} from "./penaltyEntryCreated.js";
import type { Recipient } from "./recipient.js";

const PERMISSION_STRINGS = ["login;manage", "ownPenaltyEntry;read"];

const createPenaltyEntry = (citizenId: string) =>
  prisma.penaltyEntry.create({
    data: { citizenId, points: 3, reason: "Test" },
  });

beforeEach(async () => {
  await truncateAllTables();
});

describe("findPenaltyEntryRecipient", () => {
  test("notifies a citizen with the permissions only through an inherited role", async () => {
    const citizen = await createCitizenWithInheritedPermissions(
      "inherited",
      PERMISSION_STRINGS,
    );
    const penaltyEntry = await createPenaltyEntry(citizen.id);
    const { context } = createTestApplicationContext();

    const result = await findPenaltyEntryRecipient(context, {
      penaltyEntryId: penaltyEntry.id,
    });

    expect(result).toEqual({
      penaltyEntry: { points: 3, reason: "Test" },
      recipients: [{ citizenId: citizen.id }],
    });
  });

  test("notifies only the citizen at the maximum level of the role", async () => {
    const atMaximumLevel = await createCitizenWithLeveledRole(
      "at-maximum-level",
      PERMISSION_STRINGS,
      MAXIMUM_LEVEL,
    );
    const belowMaximumLevel = await createCitizenWithLeveledRole(
      "below-maximum-level",
      PERMISSION_STRINGS,
      MAXIMUM_LEVEL - 1,
    );
    const penaltyEntries = await Promise.all([
      createPenaltyEntry(atMaximumLevel.id),
      createPenaltyEntry(belowMaximumLevel.id),
    ]);
    const { context } = createTestApplicationContext();

    const recipients: Recipient[] = [];
    for (const penaltyEntry of penaltyEntries) {
      const result = await findPenaltyEntryRecipient(context, {
        penaltyEntryId: penaltyEntry.id,
      });
      recipients.push(...(result?.recipients ?? []));
    }

    expect(recipients).toEqual([{ citizenId: atMaximumLevel.id }]);
  });

  test("does not notify a deleted citizen", async () => {
    const citizen = await createCitizenWithLeveledRole(
      "deleted",
      PERMISSION_STRINGS,
      MAXIMUM_LEVEL,
    );
    const penaltyEntry = await createPenaltyEntry(citizen.id);
    const { context } = createTestApplicationContext();
    const input = { penaltyEntryId: penaltyEntry.id };

    expect(
      (await findPenaltyEntryRecipient(context, input))?.recipients,
    ).toEqual([{ citizenId: citizen.id }]);

    await prisma.citizen.update({
      where: { id: citizen.id },
      data: { deletedAt: TEST_NOW },
    });

    expect(
      (await findPenaltyEntryRecipient(context, input))?.recipients,
    ).toEqual([]);
  });
});

describe("findPenaltyEntryExpiredRecipient", () => {
  test("does not notify about an entry that was deleted before the delivery", async () => {
    const citizen = await createCitizenWithInheritedPermissions(
      "expired",
      PERMISSION_STRINGS,
    );
    const penaltyEntry = await createPenaltyEntry(citizen.id);
    const { context } = createTestApplicationContext();
    const input = { penaltyEntryId: penaltyEntry.id };

    expect(
      (await findPenaltyEntryExpiredRecipient(context, input))?.recipients,
    ).toEqual([{ citizenId: citizen.id }]);

    await prisma.penaltyEntry.update({
      where: { id: penaltyEntry.id },
      data: { deletedAt: TEST_NOW },
    });

    expect(await findPenaltyEntryExpiredRecipient(context, input)).toBeNull();
  });
});
