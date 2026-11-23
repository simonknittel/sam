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
  type FeedEntriesContent,
} from "@sam-monorepo/domain";
import { SignJWT } from "jose";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  createJoinPuLine,
  LOG_FILE_ANNOUNCEMENT,
} from "../../../packages/application/test/remoteControlProgram.js";
import {
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
const OTHER_RUNTIME_ID = "7c1e5a90-3b2d-4f6e-8a7b-9c0d1e2f3a4b";

/** The WebSocket close code of `ws` for a message above `maxPayload` */
const MESSAGE_TOO_BIG_CLOSE_CODE = 1009;

/** The standard WebSocket close code for an unexpected condition of the server */
const INTERNAL_ERROR_CLOSE_CODE = 1011;

const DISCONNECT_USER_PATH = "/internal/disconnect-user";

const createJoinPuEntry = (lineNumber: number) => {
  const time = new Date(Date.UTC(2026, 10, 1, 12, 0, lineNumber));
  return {
    type: LogAnalyzerEntryType.JoinPu,
    raw_line: createJoinPuLine(time),
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

type TestClient = Awaited<ReturnType<TestRelay["connect"]>>["client"];

const announce = async (client: TestClient) => {
  const acknowledgement = await client.request(
    createUpMessage(UpMessageType.Announce, LOG_FILE_ANNOUNCEMENT),
  );
  expect(acknowledgement.result).toBe(AcknowledgementResult.Accepted);
};

const upload = (client: TestClient, batch = BATCH) =>
  client.request(createUpMessage(UpMessageType.FeedEntries, batch));

const sendHeartbeat = (client: TestClient) =>
  client.request(createUpMessage(UpMessageType.Heartbeat, {}));

const expectRefusal = async (client: TestClient, reason: RelayCloseReason) => {
  await expect(
    client.waitForMessage(DownMessageType.Refusal),
  ).resolves.toMatchObject({ content: { reason } });
  await expect(client.waitForClose()).resolves.toEqual({
    code: RELAY_CLOSE_CODES[reason],
  });
};

const expectClose = async (client: TestClient, reason: RelayCloseReason) => {
  await expect(
    client.waitForMessage(DownMessageType.Close),
  ).resolves.toMatchObject({ content: { reason } });
  await expect(client.waitForClose()).resolves.toEqual({
    code: RELAY_CLOSE_CODES[reason],
  });
};

test("a runtime with a valid token connects, announces and uploads", async () => {
  const { connect, deliveries } = await start();
  const owner = await createOwner();

  const { client, welcome } = await connect(owner, RUNTIME_ID);
  expect(welcome.content).toEqual({ is_stopped: false });

  await announce(client);
  // The runtime knows the parts that are off before its first upload
  expect(client.getMessages().map((message) => message.type)).toEqual([
    DownMessageType.Welcome,
    DownMessageType.Switches,
    DownMessageType.Acknowledgement,
  ]);
  expect(client.getMessages(DownMessageType.Switches)).toMatchObject([
    { content: { turned_off_connectors: [], turned_off_capabilities: [] } },
  ]);
  await expect(findRuntimeLease(owner.citizenId, RUNTIME_ID)).resolves.toEqual({
    leaseExpiresAt: expect.any(Date),
    announcement: LOG_FILE_ANNOUNCEMENT,
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

test("refuses a token that is not valid and a page of a different origin", async () => {
  const { openClient, issueToken } = await start();
  const owner = await createOwner();
  const expiredToken = await issueToken(
    owner,
    RUNTIME_ID,
    new Date(Date.now() - 2 * RELAY_LIMITS.connectionTokenLifetimeMilliseconds),
  );

  const client = await openClient();
  client.sendHello(expiredToken, RUNTIME_ID);
  await expectRefusal(client, RelayCloseReason.TokenNotValid);

  await expect(
    openClient({ origin: "https://other.example.com" }),
  ).rejects.toThrow("403");
});

test("renews the token over the open connection, and closes the connection at the end of the grace time", async () => {
  const { connect, issueToken, signingKey } = await start({
    timing: {
      tokenRenewalGraceMilliseconds: 0,
      connectionCheckIntervalMilliseconds: 50,
    },
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
    .setProtectedHeader({ alg: signingKey.algorithm, kid: signingKey.keyId })
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

  await expectClose(client, RelayCloseReason.TokenNotValid);
});

test("limits the uploads of a runtime also across a reconnect, and closes a connection with too many errors or with a message above the size limit", async () => {
  const { connect } = await start();
  const owner = await createOwner();

  const first = await connect(owner, RUNTIME_ID);
  await announce(first.client);
  // The burst of the rate limit, then one batch above the rate
  const batches = Array.from(
    { length: RELAY_LIMITS.uploadBurstBatches + 1 },
    () => createUpMessage(UpMessageType.FeedEntries, BATCH),
  );
  for (const batch of batches) first.client.send(batch);
  const acknowledgements = await Promise.all(
    batches.map((batch) => first.client.waitForAcknowledgement(batch)),
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

  // A new connection of the runtime continues the rate, within one interval of the capability
  await first.client.close();
  const second = await connect(owner, RUNTIME_ID);
  await announce(second.client);
  await expect(upload(second.client)).resolves.toMatchObject({
    result: AcknowledgementResult.Refused,
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
  for (const message of notValidMessages)
    second.client.send(JSON.stringify(message));
  await expect(
    Promise.all(
      notValidMessages.map(
        async (message) =>
          (await second.client.waitForAcknowledgement(message)).content,
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
  await expectClose(second.client, RelayCloseReason.TooManyErrors);

  const third = await connect(owner, RUNTIME_ID);
  third.client.send("x".repeat(RELAY_LIMITS.maximumMessageBytes + 1));
  await expect(third.client.waitForClose()).resolves.toEqual({
    code: MESSAGE_TOO_BIG_CLOSE_CODE,
  });
});

test("limits the heartbeats of a connection", async () => {
  const { connect } = await start();
  const owner = await createOwner();
  const { client } = await connect(owner, RUNTIME_ID);

  const heartbeats = Array.from({ length: 4 }, () =>
    createUpMessage(UpMessageType.Heartbeat, {}),
  );
  for (const heartbeat of heartbeats) client.send(heartbeat);

  await expect(
    Promise.all(
      heartbeats.map(
        async (heartbeat) =>
          (await client.waitForAcknowledgement(heartbeat)).content,
      ),
    ),
  ).resolves.toEqual([
    expect.objectContaining({ result: AcknowledgementResult.Accepted }),
    expect.objectContaining({ result: AcknowledgementResult.Accepted }),
    expect.objectContaining({ result: AcknowledgementResult.Accepted }),
    expect.objectContaining({
      result: AcknowledgementResult.Refused,
      error_code: AcknowledgementErrorCode.RateLimitExceeded,
    }),
  ]);
});

test("limits the hellos of an owner, and a refused hello keeps the presence of the open connection", async () => {
  const { connect, openClient, issueToken } = await start();
  const owner = await createOwner();
  const open = await connect(owner, RUNTIME_ID);
  await announce(open.client);

  // The other 9 hellos of the limit of 10 in one minute. Each connection replaces the previous connection of its runtime.
  for (let helloCount = 1; helloCount < 10; helloCount++)
    await connect(owner, OTHER_RUNTIME_ID);

  const refused = await openClient();
  refused.sendHello(await issueToken(owner, RUNTIME_ID), RUNTIME_ID);
  await expectRefusal(refused, RelayCloseReason.TooManyErrors);

  await expect(sendHeartbeat(open.client)).resolves.toMatchObject({
    result: AcknowledgementResult.Accepted,
  });
  const lease = await findRuntimeLease(owner.citizenId, RUNTIME_ID);
  expect(lease?.leaseExpiresAt.getTime()).toBeGreaterThan(Date.now());
  expect(lease?.announcement).toEqual(LOG_FILE_ANNOUNCEMENT);
});

test("limits the sockets that wait for their welcome", async () => {
  const { openClient, issueToken } = await start({
    maximumUnauthenticatedSockets: 1,
  });
  const owner = await createOwner();

  const waiting = await openClient();
  await expect(openClient()).rejects.toThrow("503");

  // An open connection does not count
  waiting.sendHello(await issueToken(owner, RUNTIME_ID), RUNTIME_ID);
  await waiting.waitForMessage(DownMessageType.Welcome);
  await expect(openClient()).resolves.toBeDefined();
});

test("a key set of the app that cannot be read is an internal error, not a token that is not valid", async () => {
  const { openClient, issueToken, getHttpUrl, setKeySetAvailable, logRecords } =
    await start();
  const owner = await createOwner();
  const token = await issueToken(owner, RUNTIME_ID);
  setKeySetAvailable(false);

  // The runtime connects again after its delay
  const client = await openClient();
  client.sendHello(token, RUNTIME_ID);
  await expect(client.waitForClose()).resolves.toEqual({
    code: INTERNAL_ERROR_CLOSE_CODE,
  });

  // The app sends the request again
  const response = await fetch(getHttpUrl(DISCONNECT_USER_PATH), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5_000),
  });
  expect(response.status).toBe(503);

  expect(
    logRecords
      .filter((record) => record.level === "error")
      .map((record) => record.message),
  ).toEqual([
    "The handshake of a runtime failed",
    "The key set of the app cannot be read",
  ]);
  // The errors that the test expects
  logRecords.splice(0);
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
  await expectClose(client, RelayCloseReason.ProgramTurnedOff);
});

test("the stop of the owner reaches the runtime, and a ban closes the connections, also in their handshake", async () => {
  const {
    connect,
    openClient,
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
  const disconnectUrl = getHttpUrl(DISCONNECT_USER_PATH);
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

  // The ban of the app. The database has no ban: like a handshake that read the user before the ban.
  await createAppContext().relay?.disconnectUser(owner.userId);
  await expectClose(client, RelayCloseReason.AccessDenied);

  const inHandshake = await openClient();
  inHandshake.sendHello(await issueToken(owner, RUNTIME_ID), RUNTIME_ID);
  await expectRefusal(inHandshake, RelayCloseReason.AccessDenied);
});

test("a second connection of the same runtime replaces the older connection", async () => {
  const { connect, getHttpUrl } = await start();
  const owner = await createOwner();

  const older = await connect(owner, RUNTIME_ID);
  const newer = await connect(owner, RUNTIME_ID);

  await expectClose(older.client, RelayCloseReason.Replaced);
  await expect(sendHeartbeat(newer.client)).resolves.toMatchObject({
    result: AcknowledgementResult.Accepted,
  });
  // The close of the older connection does not end the lease of the newer connection
  const lease = await findRuntimeLease(owner.citizenId, RUNTIME_ID);
  expect(lease?.leaseExpiresAt.getTime()).toBeGreaterThan(Date.now());

  const health = await fetch(getHttpUrl("/health"), {
    signal: AbortSignal.timeout(5_000),
  });
  expect(health.status).toBe(200);
});
