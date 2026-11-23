import { prisma } from "@sam-monorepo/database";
import {
  createLogEntryHash,
  getRemoteControlProgramSwitches,
  LogAnalyzerEntryType,
  RemoteControlProgramUnleashFlag,
} from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { ForbiddenError } from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { findOwnFeedEntryKeys } from "./findOwnFeedEntryKeys.js";

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
const PERMISSIONS = ["remoteControlProgram;use"];

beforeEach(async () => {
  await truncateAllTables();
});

const createEntry = async (ownerId: string, eventAt: Date) => {
  const rawLine = `<${eventAt.toISOString()}> [Notice] <Join PU> address[IP_REDACTED] port[64336] shard[pub_euw1b_10512345_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]`;
  const hash = await createLogEntryHash(LogAnalyzerEntryType.JoinPu, rawLine);
  await prisma.logAnalyzerEntry.create({
    data: {
      type: LogAnalyzerEntryType.JoinPu,
      rawLine,
      eventAt,
      hash,
      createdById: ownerId,
    },
  });

  return hash;
};

test("gives the keys of the own entries in the time window", async () => {
  const citizen = await createCitizenWithPermissions("owner", PERMISSIONS);
  const otherCitizen = await createCitizenWithPermissions("other", PERMISSIONS);
  const owner = createTestActor({
    userId: "owner-user",
    citizen,
    permissionStrings: PERMISSIONS,
  });
  const weekStart = new Date(TEST_NOW.getTime() - 7 * DAY_MILLISECONDS);
  const ownKeys = [
    await createEntry(citizen.id, weekStart),
    await createEntry(citizen.id, TEST_NOW),
  ];
  await createEntry(citizen.id, new Date(weekStart.getTime() - 1));
  await createEntry(otherCitizen.id, TEST_NOW);
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
