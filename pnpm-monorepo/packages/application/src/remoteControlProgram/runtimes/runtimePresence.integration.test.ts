import {
  getRemoteControlProgramSwitches,
  RELAY_LIMITS,
  RemoteControlProgramUnleashFlag,
  RuntimeKind,
} from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { truncateAllTables } from "../../../test/database.js";
import {
  createCitizenActor,
  LOG_FILE_ANNOUNCEMENT,
} from "../../../test/remoteControlProgram.js";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { ConflictError, ForbiddenError } from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { checkRuntimeHello } from "./checkRuntimeHello.js";
import { claimRuntimePresence } from "./claimRuntimePresence.js";
import { endRuntimeLease } from "./endRuntimeLease.js";
import { listOwnRuntimes } from "./listOwnRuntimes.js";
import { renewRuntimeLease } from "./renewRuntimeLease.js";
import { storeRuntimeAnnouncement } from "./storeRuntimeAnnouncement.js";

const RUNTIME_ID = "0b6f1d3e-2a4c-4e8f-9a1b-3c5d7e9f1a2b";

beforeEach(async () => {
  await truncateAllTables();
});

const createOwner = () =>
  createCitizenActor("owner", ["remoteControlProgram;use"]);

const createHello = (runtimeId: string, runtimeVersion = "1.0.0") => ({
  runtime_id: runtimeId,
  runtime_kind: RuntimeKind.browser,
  runtime_version: runtimeVersion,
  protocol_version: 1,
});

/** The handshake of the relay service: the check of the `hello`, then the claim at the open */
const connect = async (
  context: ApplicationContext,
  owner: Actor,
  hello: ReturnType<typeof createHello>,
) => {
  await checkRuntimeHello(context, owner, { runtime_id: hello.runtime_id });
  return claimRuntimePresence(context, owner, hello);
};

const addMilliseconds = (date: Date, milliseconds: number) =>
  new Date(date.getTime() + milliseconds);

test("claims the presence of a runtime at the open, stores its announcement, and renews and ends its lease", async () => {
  const owner = await createOwner();
  const { context } = createTestApplicationContext();

  const first = await connect(context, owner, createHello(RUNTIME_ID));
  expect(first).toEqual({
    runtimeId: RUNTIME_ID,
    kind: RuntimeKind.browser,
    runtimeVersion: "1.0.0",
    protocolVersion: 1,
    isOnline: true,
    connectedAt: TEST_NOW,
    leaseExpiresAt: addMilliseconds(
      TEST_NOW,
      RELAY_LIMITS.presenceLeaseMilliseconds,
    ),
    announcement: null,
  });
  await expect(
    storeRuntimeAnnouncement(context, owner, {
      runtime_id: RUNTIME_ID,
      announcement: LOG_FILE_ANNOUNCEMENT,
    }),
  ).resolves.toMatchObject({ announcement: LOG_FILE_ANNOUNCEMENT });

  // The hello of a second connection that then fails changes nothing
  const reconnectedAt = addMilliseconds(TEST_NOW, 60_000);
  const reconnectContext = createTestApplicationContext({
    now: reconnectedAt,
  }).context;
  await expect(
    checkRuntimeHello(reconnectContext, owner, { runtime_id: RUNTIME_ID }),
  ).resolves.toEqual({ isOwnerStopped: false });
  await expect(listOwnRuntimes(reconnectContext, owner)).resolves.toEqual({
    runtimes: [{ ...first, announcement: LOG_FILE_ANNOUNCEMENT }],
    stoppedAt: null,
  });

  // The next open connection of the same runtime starts without the announcement
  const second = await claimRuntimePresence(
    reconnectContext,
    owner,
    createHello(RUNTIME_ID, "1.1.0"),
  );
  expect(second).toMatchObject({
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
      connected_at: first.connectedAt,
    }),
  ).resolves.toEqual({ isEnded: false });
  await expect(
    endRuntimeLease(heartbeatContext, owner, {
      runtime_id: RUNTIME_ID,
      connected_at: second.connectedAt,
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
    await connect(context, owner, createHello(runtimeId));

  const tooManyRuntimes = new ConflictError(
    RemoteControlProgramErrorMessage.TooManyRuntimes,
  );
  await expect(
    checkRuntimeHello(context, owner, { runtime_id: extraRuntimeId }),
  ).rejects.toThrow(tooManyRuntimes);
  // Two parallel connections can both pass the hello, thus the claim checks the limit again
  await expect(
    claimRuntimePresence(context, owner, createHello(extraRuntimeId)),
  ).rejects.toThrow(tooManyRuntimes);
  // A runtime that is online already connects again
  await expect(
    connect(context, owner, createHello(onlineRuntimeIds[0]!)),
  ).resolves.toMatchObject({ isOnline: true });

  const [, offlineRuntimeId] = onlineRuntimeIds;
  await endRuntimeLease(context, owner, {
    runtime_id: offlineRuntimeId!,
    connected_at: TEST_NOW,
  });
  await expect(
    connect(context, owner, createHello(extraRuntimeId)),
  ).resolves.toMatchObject({ runtimeId: extraRuntimeId });
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
    checkRuntimeHello(context, owner, { runtime_id: RUNTIME_ID }),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.ProgramTurnedOff),
  );
});
