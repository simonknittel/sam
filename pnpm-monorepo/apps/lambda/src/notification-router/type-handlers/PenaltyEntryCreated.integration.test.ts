import { prisma } from "@sam-monorepo/database";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../../test/database";
import {
  createCitizenWithInheritedPermissions,
  createCitizenWithLeveledRole,
  MAXIMUM_LEVEL,
} from "../../common/effectivePermissions.fixtures";
import { publishNotifications } from "../publish";
import { PenaltyEntryCreatedHandler } from "./PenaltyEntryCreated";

vi.mock("../publish", () => ({ publishNotifications: vi.fn() }));

const PERMISSION_STRINGS = ["login;manage", "ownPenaltyEntry;read"];

const createPenaltyEntry = (citizenId: string) =>
  prisma.penaltyEntry.create({
    data: { citizenId, points: 3, reason: "Test" },
  });

beforeEach(async () => {
  await truncateAllTables();
});

describe("PenaltyEntryCreatedHandler", () => {
  test("notifies a citizen with the permissions only through an inherited role", async () => {
    const citizen = await createCitizenWithInheritedPermissions(
      "inherited",
      PERMISSION_STRINGS,
    );
    const penaltyEntry = await createPenaltyEntry(citizen.id);

    await PenaltyEntryCreatedHandler({ penaltyEntryId: penaltyEntry.id });

    expect(publishNotifications).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({
        receiverId: citizen.id,
        notificationType: "penalty_entry_created",
      }),
    ]);
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

    for (const penaltyEntry of penaltyEntries)
      await PenaltyEntryCreatedHandler({ penaltyEntryId: penaltyEntry.id });

    expect(publishNotifications).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ receiverId: atMaximumLevel.id }),
    ]);
  });

  test("does not notify a deleted citizen", async () => {
    const citizen = await createCitizenWithLeveledRole(
      "deleted",
      PERMISSION_STRINGS,
      MAXIMUM_LEVEL,
    );
    const penaltyEntry = await createPenaltyEntry(citizen.id);

    await PenaltyEntryCreatedHandler({ penaltyEntryId: penaltyEntry.id });

    expect(publishNotifications).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ receiverId: citizen.id }),
    ]);

    await prisma.citizen.update({
      where: { id: citizen.id },
      data: { deletedAt: new Date() },
    });

    await PenaltyEntryCreatedHandler({ penaltyEntryId: penaltyEntry.id });

    expect(publishNotifications).toHaveBeenCalledTimes(1);
  });
});
