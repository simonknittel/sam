import {
  getRemoteControlProgramSwitches,
  RemoteControlProgramUnleashFlag,
} from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { truncateAllTables } from "../../../test/database.js";
import {
  createCitizenActor,
  createLogEntryRow,
  DAY_MILLISECONDS,
} from "../../../test/remoteControlProgram.js";
import { ForbiddenError } from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { findOwnFeedEntryKeys } from "./findOwnFeedEntryKeys.js";

const PERMISSIONS = ["remoteControlProgram;use"];

beforeEach(async () => {
  await truncateAllTables();
});

const createEntry = async (ownerId: string, eventAt: Date) =>
  (await createLogEntryRow(ownerId, eventAt)).hash;

test("gives the keys of the own entries in the time window", async () => {
  const owner = await createCitizenActor("owner", PERMISSIONS);
  const otherOwner = await createCitizenActor("other", PERMISSIONS);
  const citizen = owner.citizen!;
  const weekStart = new Date(TEST_NOW.getTime() - 7 * DAY_MILLISECONDS);
  const ownKeys = [
    await createEntry(citizen.id, weekStart),
    await createEntry(citizen.id, TEST_NOW),
  ];
  await createEntry(citizen.id, new Date(weekStart.getTime() - 1));
  await createEntry(otherOwner.citizen!.id, TEST_NOW);
  const { context } = createTestApplicationContext();

  await expect(
    findOwnFeedEntryKeys(context, owner, { start: weekStart }),
  ).resolves.toEqual({ keys: ownKeys.toSorted(), nextPageCursor: null });

  await expect(
    findOwnFeedEntryKeys(
      createTestApplicationContext({
        remoteControlProgramSwitches: async () =>
          getRemoteControlProgramSwitches(
            (flag) =>
              flag ===
              RemoteControlProgramUnleashFlag.DisableLogEntriesCapability,
          ),
      }).context,
      owner,
      { start: weekStart },
    ),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.CapabilityTurnedOff),
  );
});
