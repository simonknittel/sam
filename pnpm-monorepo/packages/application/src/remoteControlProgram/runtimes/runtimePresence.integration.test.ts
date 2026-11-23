import {
  CapabilityId,
  ConnectorId,
  getRemoteControlProgramSwitches,
  RELAY_LIMITS,
  RemoteControlProgramUnleashFlag,
  RuntimeKind,
  type AnnounceContent,
} from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { ConflictError, ForbiddenError } from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { announceRuntime } from "./announceRuntime.js";
import { endRuntimeLease } from "./endRuntimeLease.js";
import { listOwnRuntimes } from "./listOwnRuntimes.js";
import { renewRuntimeLease } from "./renewRuntimeLease.js";
import { storeRuntimeAnnouncement } from "./storeRuntimeAnnouncement.js";

const RUNTIME_ID = "0b6f1d3e-2a4c-4e8f-9a1b-3c5d7e9f1a2b";

const ANNOUNCEMENT: AnnounceContent = {
  connectors: [
    {
      id: ConnectorId.LogFile,
      version: 1,
      capabilities: [{ id: CapabilityId.LogEntries, version: 1 }],
    },
  ],
  local_access_layer: {
    is_stopped: false,
    capability_rules: [
      {
        capability_id: CapabilityId.LogEntries,
        is_on: true,
        is_filtered: true,
      },
    ],
  },
};

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

const createHello = (runtimeId: string, runtimeVersion = "1.0.0") => ({
  runtime_id: runtimeId,
  runtime_kind: RuntimeKind.Browser,
  runtime_version: runtimeVersion,
  protocol_version: 1,
});

const addMilliseconds = (date: Date, milliseconds: number) =>
  new Date(date.getTime() + milliseconds);

test("announces a runtime, stores its announcement, and renews and ends its lease", async () => {
  const owner = await createOwner();
  const { context } = createTestApplicationContext();

  const first = await announceRuntime(context, owner, createHello(RUNTIME_ID));
  expect(first).toEqual({
    runtime: {
      runtimeId: RUNTIME_ID,
      kind: RuntimeKind.Browser,
      runtimeVersion: "1.0.0",
      protocolVersion: 1,
      isOnline: true,
      connectedAt: TEST_NOW,
      leaseExpiresAt: addMilliseconds(
        TEST_NOW,
        RELAY_LIMITS.presenceLeaseMilliseconds,
      ),
      announcement: null,
    },
    isOwnerStopped: false,
  });
  await expect(
    storeRuntimeAnnouncement(context, owner, {
      runtime_id: RUNTIME_ID,
      announcement: ANNOUNCEMENT,
    }),
  ).resolves.toMatchObject({ announcement: ANNOUNCEMENT });

  // The next connection of the same runtime starts without the announcement
  const reconnectedAt = addMilliseconds(TEST_NOW, 60_000);
  const second = await announceRuntime(
    createTestApplicationContext({ now: reconnectedAt }).context,
    owner,
    createHello(RUNTIME_ID, "1.1.0"),
  );
  expect(second.runtime).toMatchObject({
    runtimeVersion: "1.1.0",
    connectedAt: reconnectedAt,
    announcement: null,
  });

  const heartbeatAt = addMilliseconds(reconnectedAt, 15_000);
  const heartbeatContext = createTestApplicationContext({
    now: heartbeatAt,
  }).context;
  await expect(
    renewRuntimeLease(heartbeatContext, owner, { runtime_id: RUNTIME_ID }),
  ).resolves.toMatchObject({
    isOnline: true,
    leaseExpiresAt: addMilliseconds(
      heartbeatAt,
      RELAY_LIMITS.presenceLeaseMilliseconds,
    ),
  });

  // The close of the replaced first connection keeps the lease of the second
  await expect(
    endRuntimeLease(heartbeatContext, owner, {
      runtime_id: RUNTIME_ID,
      connected_at: first.runtime.connectedAt,
    }),
  ).resolves.toEqual({ isEnded: false });
  await expect(
    endRuntimeLease(heartbeatContext, owner, {
      runtime_id: RUNTIME_ID,
      connected_at: second.runtime.connectedAt,
    }),
  ).resolves.toEqual({ isEnded: true });

  await expect(listOwnRuntimes(heartbeatContext, owner)).resolves.toEqual({
    runtimes: [
      expect.objectContaining({
        runtimeId: RUNTIME_ID,
        isOnline: false,
        leaseExpiresAt: heartbeatAt,
      }),
    ],
    stoppedAt: null,
  });
});

test("refuses a runtime above the limit of the owner until a different runtime goes offline", async () => {
  const owner = await createOwner();
  const { context } = createTestApplicationContext();
  const runtimeIds = Array.from(
    { length: RELAY_LIMITS.maximumRuntimesPerOwner + 1 },
    () => crypto.randomUUID(),
  );
  const onlineRuntimeIds = runtimeIds.slice(0, -1);
  const extraRuntimeId = runtimeIds.at(-1)!;
  for (const runtimeId of onlineRuntimeIds)
    await announceRuntime(context, owner, createHello(runtimeId));

  await expect(
    announceRuntime(context, owner, createHello(extraRuntimeId)),
  ).rejects.toThrow(
    new ConflictError(RemoteControlProgramErrorMessage.TooManyRuntimes),
  );
  // A runtime that is online already connects again
  await expect(
    announceRuntime(context, owner, createHello(onlineRuntimeIds[0]!)),
  ).resolves.toMatchObject({ runtime: { isOnline: true } });

  const [, offlineRuntimeId] = onlineRuntimeIds;
  await endRuntimeLease(context, owner, {
    runtime_id: offlineRuntimeId!,
    connected_at: TEST_NOW,
  });
  await expect(
    announceRuntime(context, owner, createHello(extraRuntimeId)),
  ).resolves.toMatchObject({ runtime: { runtimeId: extraRuntimeId } });
});

test("refuses the hello when the switch of the Remote Control Program is off", async () => {
  const owner = await createOwner();
  const { context } = createTestApplicationContext({
    remoteControlProgramSwitches: async () =>
      getRemoteControlProgramSwitches(
        (flag) =>
          flag === RemoteControlProgramUnleashFlag.DisableRemoteControlProgram,
      ),
  });

  await expect(
    announceRuntime(context, owner, createHello(RUNTIME_ID)),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.ProgramTurnedOff),
  );
});
