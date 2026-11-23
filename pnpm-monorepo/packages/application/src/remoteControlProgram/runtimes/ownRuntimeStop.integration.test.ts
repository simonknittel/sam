import { prisma } from "@sam-monorepo/database";
import { RuntimeKind } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { createTestRelayService } from "../../../test/relayService.js";
import { announceRuntime } from "./announceRuntime.js";
import { getOwnRuntimeStop } from "./getOwnRuntimeStop.js";
import { startOwnRuntimes } from "./startOwnRuntimes.js";
import { stopOwnRuntimes } from "./stopOwnRuntimes.js";

beforeEach(async () => {
  await truncateAllTables();
});

const createOwner = async () => {
  const citizen = await createCitizenWithPermissions("owner", [
    "remoteControlProgram;use",
  ]);

  return createTestActor({
    userId: "owner-user",
    citizen,
    permissionStrings: ["remoteControlProgram;use"],
  });
};

test("stops and starts all runtimes of the owner and tells the relay service", async () => {
  const owner = await createOwner();
  const relayService = createTestRelayService();
  const { context } = createTestApplicationContext({
    relay: relayService.relay,
  });

  await expect(stopOwnRuntimes(context, owner)).resolves.toEqual({
    stoppedAt: TEST_NOW,
  });
  // A second stop keeps the time of the first stop
  await expect(
    stopOwnRuntimes(
      createTestApplicationContext({
        now: new Date(TEST_NOW.getTime() + 60_000),
        relay: relayService.relay,
      }).context,
      owner,
    ),
  ).resolves.toEqual({ stoppedAt: TEST_NOW });
  await expect(getOwnRuntimeStop(context, owner)).resolves.toEqual({
    stoppedAt: TEST_NOW,
  });
  await expect(
    announceRuntime(context, owner, {
      runtime_id: crypto.randomUUID(),
      runtime_kind: RuntimeKind.Browser,
      runtime_version: "1.0.0",
      protocol_version: 1,
    }),
  ).resolves.toMatchObject({ isOwnerStopped: true });

  await expect(startOwnRuntimes(context, owner)).resolves.toEqual({
    stoppedAt: null,
  });
  await expect(getOwnRuntimeStop(context, owner)).resolves.toEqual({
    stoppedAt: null,
  });
  expect(relayService.ownerStopChangeCitizenIds).toEqual([
    owner.citizen!.id,
    owner.citizen!.id,
    owner.citizen!.id,
  ]);
});

test("keeps the stop when the relay service cannot be reached", async () => {
  const owner = await createOwner();
  const warnings: string[] = [];
  const { context } = createTestApplicationContext({
    relay: createTestRelayService({ fails: true }).relay,
    log: {
      info: () => undefined,
      warn: (message) => warnings.push(message),
      error: () => undefined,
    },
  });

  await expect(stopOwnRuntimes(context, owner)).resolves.toEqual({
    stoppedAt: TEST_NOW,
  });

  await expect(
    prisma.remoteControlProgramOwnerStop.findMany({
      select: { ownerId: true },
    }),
  ).resolves.toEqual([{ ownerId: owner.citizen!.id }]);
  expect(warnings).toHaveLength(1);
});
