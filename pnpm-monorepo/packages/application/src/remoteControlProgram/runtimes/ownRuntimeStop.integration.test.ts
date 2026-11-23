import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { truncateAllTables } from "../../../test/database.js";
import { createTestRelayService } from "../../../test/relayService.js";
import { createCitizenActor } from "../../../test/remoteControlProgram.js";
import { checkRuntimeHello } from "./checkRuntimeHello.js";
import { getRuntimeStopOfOwner } from "./getRuntimeStopOfOwner.js";
import { startOwnRuntimes } from "./startOwnRuntimes.js";
import { stopOwnRuntimes } from "./stopOwnRuntimes.js";

beforeEach(async () => {
  await truncateAllTables();
});

const createOwner = () =>
  createCitizenActor("owner", ["remoteControlProgram;use"]);

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
  const ownerStopInput = { ownerCitizenId: owner.citizen!.id };
  await expect(getRuntimeStopOfOwner(context, ownerStopInput)).resolves.toEqual(
    { stoppedAt: TEST_NOW },
  );
  await expect(
    checkRuntimeHello(context, owner, { runtime_id: crypto.randomUUID() }),
  ).resolves.toEqual({ isOwnerStopped: true });

  await expect(startOwnRuntimes(context, owner)).resolves.toEqual({
    stoppedAt: null,
  });
  await expect(getRuntimeStopOfOwner(context, ownerStopInput)).resolves.toEqual(
    { stoppedAt: null },
  );
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
