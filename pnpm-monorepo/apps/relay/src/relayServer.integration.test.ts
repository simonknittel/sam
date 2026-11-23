import {
  RUNTIME_CONNECTION_TOKEN_AUDIENCE,
  stopOwnRuntimes,
} from "@sam-monorepo/application";
import {
  AcknowledgementErrorCode,
  AcknowledgementResult,
  CapabilityId,
  ConnectorId,
  createUpMessage,
  DownMessageType,
  LOG_ENTRIES_CAPABILITY,
  LogAnalyzerEntryType,
  RELAY_CLOSE_CODES,
  RELAY_LIMITS,
  RELAY_PROTOCOL_VERSION,
  RelayCloseReason,
  RemoteControlProgramUnleashFlag,
  UpMessageType,
  type AnnounceContent,
  type FeedEntriesContent,
} from "@sam-monorepo/domain";
import { SignJWT } from "jose";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  banUser,
  createOwner,
  findLogEntryRows,
  findRuntimeLease,
  findUploadCountEvents,
  truncateAllTables,
} from "../test/database.js";
import {
  APP_BASE_URL,
  startRelay,
  type TestRelay,
} from "../test/relayHarness.js";

const RUNTIME_ID = "0b6f1d3e-2a4c-4e8f-9a1b-3c5d7e9f1a2b";

/** The WebSocket close code of `ws` for a message above `maxPayload` */
const MESSAGE_TOO_BIG_CLOSE_CODE = 1009;

const ANNOUNCEMENT: AnnounceContent = {
  connectors: [
    {
      id: ConnectorId.LogFile,
      version: 1,
      capabilities: [
        {
          id: CapabilityId.LogEntries,
          version: LOG_ENTRIES_CAPABILITY.version,
        },
      ],
    },
  ],
  local_access_layer: {
    is_stopped: false,
    capability_rules: [
      {
        capability_id: CapabilityId.LogEntries,
        is_on: true,
        is_filtered: false,
      },
    ],
  },
};

const createJoinPuEntry = (lineNumber: number) => {
  const time = new Date(Date.UTC(2026, 10, 1, 12, 0, lineNumber));
  return {
    type: LogAnalyzerEntryType.JoinPu,
    raw_line: `<${time.toISOString()}> [Notice] <Join PU> address[IP_REDACTED] port[64336] shard[pub_euw1b_10512345_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]`,
    event_at: time.toISOString(),
    line_number: lineNumber,
  };
};

const BATCH: FeedEntriesContent = {
  capability_id: CapabilityId.LogEntries,
  capability_version: LOG_ENTRIES_CAPABILITY.version,
  connector_id: ConnectorId.LogFile,
  connector_version: 1,
  entries: [createJoinPuEntry(1), createJoinPuEntry(2)],
};

let relay: TestRelay | null = null;

const start = async (...options: Parameters<typeof startRelay>) => {
  relay = await startRelay(...options);
  return relay;
};

beforeEach(async () => {
  await truncateAllTables();
});

afterEach(async () => {
  const records = relay?.logRecords ?? [];
  await relay?.stop();
  relay = null;

  // A defect of the relay service shows as an error in its log
  expect(records.filter((record) => record.level === "error")).toEqual([]);
});

const announce = async (
  client: Awaited<ReturnType<TestRelay["connect"]>>["client"],
) => {
  const acknowledgement = await client.request(
    createUpMessage(UpMessageType.Announce, ANNOUNCEMENT),
  );
  expect(acknowledgement.result).toBe(AcknowledgementResult.Accepted);
};

const upload = (
  client: Awaited<ReturnType<TestRelay["connect"]>>["client"],
  batch = BATCH,
) => client.request(createUpMessage(UpMessageType.FeedEntries, batch));

test("a runtime with a valid token connects, announces and uploads", async () => {
  const { connect, deliveries } = await start();
  const owner = await createOwner();

  const { client, welcome } = await connect(owner, RUNTIME_ID);
  expect(welcome.content).toEqual({ is_stopped: false });

  await announce(client);
  // The `switches` follow the `ack` of the `announce`
  await expect(
    client.waitForMessage(DownMessageType.Switches),
  ).resolves.toMatchObject({
    content: { turned_off_connectors: [], turned_off_capabilities: [] },
  });
  await expect(findRuntimeLease(owner.citizenId, RUNTIME_ID)).resolves.toEqual({
    leaseExpiresAt: expect.any(Date),
    announcement: ANNOUNCEMENT,
  });

  await expect(upload(client)).resolves.toEqual({
    message_id: expect.any(String),
    result: AcknowledgementResult.Accepted,
    new_entry_count: 2,
  });
  await expect(findLogEntryRows(owner.citizenId)).resolves.toEqual([
    { type: LogAnalyzerEntryType.JoinPu, lineNumber: 1, runtimeId: RUNTIME_ID },
    { type: LogAnalyzerEntryType.JoinPu, lineNumber: 2, runtimeId: RUNTIME_ID },
  ]);
  expect(deliveries).toEqual([
    {
      ownerCitizenId: owner.citizenId,
      capabilityId: CapabilityId.LogEntries,
      entries: [
        expect.objectContaining({ lineNumber: 1 }),
        expect.objectContaining({ lineNumber: 2 }),
      ],
    },
  ]);

  // The close ends the lease and writes the counts of the connection
  await client.close();
  await vi.waitFor(async () => {
    const lease = await findRuntimeLease(owner.citizenId, RUNTIME_ID);
    expect(lease?.leaseExpiresAt.getTime()).toBeLessThanOrEqual(Date.now());
  });
  await expect(findUploadCountEvents()).resolves.toEqual([
    {
      createdById: owner.userId,
      data: expect.objectContaining({
        ownerCitizenId: owner.citizenId,
        runtimeId: RUNTIME_ID,
        capabilityId: CapabilityId.LogEntries,
        newEntryCount: 2,
        duplicateEntryCount: 0,
        refusedEntryCount: 0,
      }),
    },
  ]);
});

test("a resend after a reconnect makes no duplicate", async () => {
  const { connect } = await start();
  const owner = await createOwner();

  const first = await connect(owner, RUNTIME_ID);
  await announce(first.client);
  await expect(upload(first.client)).resolves.toMatchObject({
    new_entry_count: 2,
  });
  await first.client.close();

  const second = await connect(owner, RUNTIME_ID);
  await announce(second.client);
  await expect(upload(second.client)).resolves.toMatchObject({
    result: AcknowledgementResult.Accepted,
    new_entry_count: 0,
  });
  await expect(findLogEntryRows(owner.citizenId)).resolves.toHaveLength(2);
});

test("refuses a token of a different audience and an expired token", async () => {
  const { openClient, issueToken, signingKey } = await start();
  const owner = await createOwner();
  const tokenOfDifferentAudience = await new SignJWT({
    citizen_id: owner.citizenId,
    runtime_id: RUNTIME_ID,
  })
    .setProtectedHeader({ alg: "ES256", kid: signingKey.keyId })
    .setIssuer(APP_BASE_URL)
    .setAudience(`${RUNTIME_CONNECTION_TOKEN_AUDIENCE}_other`)
    .setSubject(owner.userId)
    .setIssuedAt()
    .setExpirationTime("2 minutes")
    .sign(signingKey.privateKey);
  const expiredToken = await issueToken(
    owner,
    RUNTIME_ID,
    new Date(Date.now() - 2 * RELAY_LIMITS.connectionTokenLifetimeMilliseconds),
  );

  for (const token of [tokenOfDifferentAudience, expiredToken]) {
    const client = await openClient();
    client.sendHello(token, RUNTIME_ID);

    await expect(
      client.waitForMessage(DownMessageType.Refusal),
    ).resolves.toMatchObject({
      content: { reason: RelayCloseReason.TokenNotValid },
    });
    await expect(client.waitForClose()).resolves.toEqual({
      code: RELAY_CLOSE_CODES[RelayCloseReason.TokenNotValid],
    });
  }

  // A browser page of a different site cannot connect
  await expect(
    openClient({ origin: "https://other.example.com" }),
  ).rejects.toThrow("403");
});

test("renews the token over the open connection, and closes the connection at the end of the grace time", async () => {
  const { connect, issueToken, signingKey } = await start({
    tokenRenewalGraceMilliseconds: 0,
    connectionCheckIntervalMilliseconds: 50,
  });
  const owner = await createOwner();
  const { client } = await connect(owner, RUNTIME_ID);

  await expect(
    client.request(
      createUpMessage(UpMessageType.TokenRenewal, {
        token: await issueToken(owner, RUNTIME_ID),
      }),
    ),
  ).resolves.toMatchObject({ result: AcknowledgementResult.Accepted });

  // A token that is not valid does not close the connection, the runtime tries again
  await expect(
    client.request(
      createUpMessage(UpMessageType.TokenRenewal, { token: "not-a-token" }),
    ),
  ).resolves.toMatchObject({
    result: AcknowledgementResult.Refused,
    error_code: AcknowledgementErrorCode.TokenNotValid,
  });

  // A token that expires in two seconds, without a grace time
  const shortToken = await new SignJWT({
    citizen_id: owner.citizenId,
    runtime_id: RUNTIME_ID,
  })
    .setProtectedHeader({ alg: "ES256", kid: signingKey.keyId })
    .setIssuer(APP_BASE_URL)
    .setAudience(RUNTIME_CONNECTION_TOKEN_AUDIENCE)
    .setSubject(owner.userId)
    .setIssuedAt()
    .setExpirationTime("2 seconds")
    .sign(signingKey.privateKey);
  await expect(
    client.request(
      createUpMessage(UpMessageType.TokenRenewal, { token: shortToken }),
    ),
  ).resolves.toMatchObject({ result: AcknowledgementResult.Accepted });

  await expect(
    client.waitForMessage(DownMessageType.Close),
  ).resolves.toMatchObject({
    content: { reason: RelayCloseReason.TokenNotValid },
  });
  await expect(client.waitForClose()).resolves.toEqual({
    code: RELAY_CLOSE_CODES[RelayCloseReason.TokenNotValid],
  });
});

test("closes a connection with too many errors or with a message above the size limit", async () => {
  const { connect } = await start();
  const owner = await createOwner();

  const { client } = await connect(owner, RUNTIME_ID);
  await announce(client);
  // The burst of the rate limit, then one batch above the rate
  const batches = Array.from(
    { length: RELAY_LIMITS.uploadBurstBatches + 1 },
    () => createUpMessage(UpMessageType.FeedEntries, BATCH),
  );
  for (const batch of batches) client.send(batch);
  const acknowledgements = await Promise.all(
    batches.map((batch) => client.waitForAcknowledgement(batch)),
  );
  expect(
    acknowledgements.map((acknowledgement) => acknowledgement.content.result),
  ).toEqual([
    ...Array.from(
      { length: RELAY_LIMITS.uploadBurstBatches },
      () => AcknowledgementResult.Accepted,
    ),
    AcknowledgementResult.Refused,
  ]);
  expect(acknowledgements.at(-1)?.content).toMatchObject({
    error_code: AcknowledgementErrorCode.RateLimitExceeded,
  });

  // Each message with a valid envelope but no valid content gets its `ack`
  const notValidMessages = Array.from(
    { length: RELAY_LIMITS.maximumErrorsPerMinute },
    () => ({
      type: UpMessageType.Heartbeat,
      id: crypto.randomUUID(),
      protocol_version: RELAY_PROTOCOL_VERSION,
      content: "not valid",
    }),
  );
  for (const message of notValidMessages) client.send(JSON.stringify(message));
  await expect(
    Promise.all(
      notValidMessages.map(
        async (message) =>
          (await client.waitForAcknowledgement(message)).content,
      ),
    ),
  ).resolves.toEqual(
    notValidMessages.map((message) => ({
      message_id: message.id,
      result: AcknowledgementResult.Refused,
      error_code: AcknowledgementErrorCode.MessageNotValid,
    })),
  );
  // The batch above the rate and these messages are 11 errors in one minute
  await expect(
    client.waitForMessage(DownMessageType.Close),
  ).resolves.toMatchObject({
    content: { reason: RelayCloseReason.TooManyErrors },
  });
  await expect(client.waitForClose()).resolves.toEqual({
    code: RELAY_CLOSE_CODES[RelayCloseReason.TooManyErrors],
  });

  const second = await connect(owner, RUNTIME_ID);
  second.client.send("x".repeat(RELAY_LIMITS.maximumMessageBytes + 1));
  await expect(second.client.waitForClose()).resolves.toEqual({
    code: MESSAGE_TOO_BIG_CLOSE_CODE,
  });
});

test("a part that is turned off refuses the uploads, and a change of a flag sends the switches", async () => {
  const { connect, setEnabledFlags } = await start();
  const owner = await createOwner();
  const { client } = await connect(owner, RUNTIME_ID);
  await announce(client);

  setEnabledFlags([
    RemoteControlProgramUnleashFlag.DisableLogEntriesCapability,
  ]);
  await expect(
    client.waitForMessage(
      DownMessageType.Switches,
      (switches) => switches.content.turned_off_capabilities.length > 0,
    ),
  ).resolves.toMatchObject({
    content: {
      turned_off_connectors: [],
      turned_off_capabilities: [CapabilityId.LogEntries],
    },
  });
  await expect(upload(client)).resolves.toMatchObject({
    result: AcknowledgementResult.Refused,
    error_code: AcknowledgementErrorCode.CapabilityTurnedOff,
  });

  setEnabledFlags([
    RemoteControlProgramUnleashFlag.DisableRemoteControlProgram,
  ]);
  await expect(
    client.waitForMessage(DownMessageType.Close),
  ).resolves.toMatchObject({
    content: { reason: RelayCloseReason.ProgramTurnedOff },
  });
  await expect(client.waitForClose()).resolves.toEqual({
    code: RELAY_CLOSE_CODES[RelayCloseReason.ProgramTurnedOff],
  });
});

test("the stop of the owner reaches the runtime, and a ban closes the connection", async () => {
  const {
    connect,
    createAppContext,
    createOwnerActor,
    getHttpUrl,
    issueToken,
  } = await start();
  const owner = await createOwner();
  const { client } = await connect(owner, RUNTIME_ID);
  await announce(client);

  // The app tells the relay service through its internal endpoint
  await stopOwnRuntimes(createAppContext(), createOwnerActor(owner));
  await client.waitForMessage(DownMessageType.Stop);
  await expect(upload(client)).resolves.toMatchObject({
    result: AcknowledgementResult.Refused,
    error_code: AcknowledgementErrorCode.Stopped,
  });

  // An internal request without a valid token changes nothing
  const disconnectUrl = getHttpUrl("/internal/disconnect-user");
  const withoutToken = await fetch(disconnectUrl, {
    method: "POST",
    signal: AbortSignal.timeout(5_000),
  });
  const withConnectionToken = await fetch(disconnectUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${await issueToken(owner, RUNTIME_ID)}`,
    },
    signal: AbortSignal.timeout(5_000),
  });
  expect([withoutToken.status, withConnectionToken.status]).toEqual([401, 401]);

  await banUser(owner.userId);
  await createAppContext().relay?.disconnectUser(owner.userId);
  await expect(
    client.waitForMessage(DownMessageType.Close),
  ).resolves.toMatchObject({
    content: { reason: RelayCloseReason.AccessDenied },
  });
  await expect(client.waitForClose()).resolves.toEqual({
    code: RELAY_CLOSE_CODES[RelayCloseReason.AccessDenied],
  });
});

test("a second connection of the same runtime replaces the older connection", async () => {
  const { connect, getHttpUrl } = await start();
  const owner = await createOwner();

  const older = await connect(owner, RUNTIME_ID);
  const newer = await connect(owner, RUNTIME_ID);

  await expect(
    older.client.waitForMessage(DownMessageType.Close),
  ).resolves.toMatchObject({ content: { reason: RelayCloseReason.Replaced } });
  await expect(older.client.waitForClose()).resolves.toEqual({
    code: RELAY_CLOSE_CODES[RelayCloseReason.Replaced],
  });
  await expect(
    newer.client.request(createUpMessage(UpMessageType.Heartbeat, {})),
  ).resolves.toMatchObject({ result: AcknowledgementResult.Accepted });
  // The close of the older connection does not end the lease of the newer connection
  const lease = await findRuntimeLease(owner.citizenId, RUNTIME_ID);
  expect(lease?.leaseExpiresAt.getTime()).toBeGreaterThan(Date.now());

  const health = await fetch(getHttpUrl("/health"), {
    signal: AbortSignal.timeout(5_000),
  });
  expect(health.status).toBe(200);
});
