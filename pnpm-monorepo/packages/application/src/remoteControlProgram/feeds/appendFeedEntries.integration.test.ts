import { prisma } from "@sam-monorepo/database";
import {
  AcknowledgementErrorCode,
  AcknowledgementResult,
  CapabilityId,
  CONNECTOR_CATALOG,
  ConnectorId,
  createLogEntryHash,
  LOG_ENTRIES_CAPABILITY,
  LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { truncateAllTables } from "../../../test/database.js";
import {
  createCitizenActor,
  createJoinPuLine,
  HOUR_MILLISECONDS,
  ONE_HOUR_AGO,
} from "../../../test/remoteControlProgram.js";
import { ForbiddenError } from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import {
  appendFeedEntries,
  type AppendFeedEntriesInput,
} from "./appendFeedEntries.js";

const RUNTIME_ID = "0d4c1a52-6b0e-4f7a-9c1e-2f3b4a5c6d7e";

type LogEntryOfBatch = AppendFeedEntriesInput["batch"]["entries"][number];

beforeEach(async () => {
  await truncateAllTables();
});

const createOwner = () =>
  createCitizenActor("owner", ["remoteControlProgram;use"]);

/** The values of the header of a log file of LIVE */
const LIVE_HEADER = {
  game_environment: "LIVE",
  game_build: "13220821",
} as const;

const createJoinPuEntry = (
  time: Date,
  lineNumber: number,
  address?: string,
): LogEntryOfBatch => ({
  type: LogAnalyzerEntryType.JoinPu,
  raw_line: createJoinPuLine(time, address),
  event_at: time.toISOString(),
  line_number: lineNumber,
  ...LIVE_HEADER,
});

/**
 * A crash report has no time: the runtime gives the time of the preceding
 * line. Its log file has no valid header values.
 */
const createGameCrashEntry = (
  time: Date,
  lineNumber: number,
): LogEntryOfBatch => ({
  type: LogAnalyzerEntryType.GameCrash,
  raw_line:
    "Exception STATUS_CRYENGINE_OUT_OF_SYSMEM(0x2BADFF61) addr=0x00007FFE2CE13CFA digest=114a1cfe538433f07c4a87c536ae0528",
  event_at: time.toISOString(),
  line_number: lineNumber,
  game_environment: null,
  game_build: null,
});

const createInput = (
  entries: LogEntryOfBatch[],
  connectorVersion = CONNECTOR_CATALOG[ConnectorId.LogFile].version,
): AppendFeedEntriesInput => ({
  runtime_id: RUNTIME_ID,
  batch: {
    capability_id: CapabilityId.LogEntries,
    capability_version: LOG_ENTRIES_CAPABILITY.version,
    connector_id: ConnectorId.LogFile,
    connector_version: connectorVersion,
    entries,
  },
});

const findStoredEntries = () =>
  prisma.logAnalyzerEntry.findMany({
    orderBy: { lineNumber: "asc" },
    select: {
      id: true,
      type: true,
      rawLine: true,
      eventAt: true,
      lineNumber: true,
      hash: true,
      createdById: true,
      createdAt: true,
      runtimeId: true,
      connectorVersion: true,
      capabilityVersion: true,
      gameEnvironment: true,
      gameBuild: true,
    },
  });

test("stores the new entries with their context and the values of their header, and skips a second copy", async () => {
  const owner = await createOwner();
  const { context } = createTestApplicationContext();
  // The relay takes the time of the raw line, not the time of the runtime
  const joinPu = {
    ...createJoinPuEntry(ONE_HOUR_AGO, 12),
    event_at: TEST_NOW.toISOString(),
  };
  // A time of the observation in the future becomes the time of the arrival
  const gameCrash = createGameCrashEntry(
    new Date(TEST_NOW.getTime() + HOUR_MILLISECONDS),
    40,
  );

  const output = await appendFeedEntries(
    context,
    owner,
    createInput([joinPu, gameCrash]),
  );

  const entryContext = {
    createdById: owner.citizen!.id,
    createdAt: TEST_NOW,
    runtimeId: RUNTIME_ID,
    connectorVersion: CONNECTOR_CATALOG[ConnectorId.LogFile].version,
    capabilityVersion: LOG_ENTRIES_CAPABILITY.version,
  };
  const storedEntries = await findStoredEntries();
  expect(storedEntries).toEqual([
    {
      ...entryContext,
      id: expect.any(String),
      type: LogAnalyzerEntryType.JoinPu,
      rawLine: joinPu.raw_line,
      eventAt: ONE_HOUR_AGO,
      lineNumber: 12,
      hash: await createLogEntryHash(joinPu.type, joinPu.raw_line),
      gameEnvironment: "LIVE",
      gameBuild: "13220821",
    },
    {
      ...entryContext,
      id: expect.any(String),
      type: LogAnalyzerEntryType.GameCrash,
      rawLine: gameCrash.raw_line,
      eventAt: TEST_NOW,
      lineNumber: 40,
      hash: await createLogEntryHash(gameCrash.type, gameCrash.raw_line),
      gameEnvironment: null,
      gameBuild: null,
    },
  ]);
  expect(output).toMatchObject({
    result: AcknowledgementResult.Accepted,
    counts: { newEntryCount: 2, duplicateEntryCount: 0, refusedEntryCount: 0 },
  });
  const newEntries =
    output.result === AcknowledgementResult.Accepted ? output.newEntries : [];
  expect(
    newEntries.toSorted(
      (first, second) => (first.lineNumber ?? 0) - (second.lineNumber ?? 0),
    ),
  ).toEqual(
    storedEntries.map((entry) => ({
      id: entry.id,
      owner: { id: owner.citizen!.id, handle: "owner" },
      type: entry.type,
      rawLine: entry.rawLine,
      eventAt: entry.eventAt,
      lineNumber: entry.lineNumber,
      hash: entry.hash,
      createdAt: entry.createdAt,
      gameEnvironment: entry.gameEnvironment,
      gameBuild: entry.gameBuild,
    })),
  );

  // A resend, for example after a reconnect, with one more entry
  const later = createTestApplicationContext({
    now: new Date(TEST_NOW.getTime() + HOUR_MILLISECONDS),
  }).context;
  const gameQuit: LogEntryOfBatch = {
    type: LogAnalyzerEntryType.GameQuit,
    raw_line:
      "<2026-06-15T09:30:00.000Z> [Notice] <SystemQuit> CSystem::Quit invoked with - cause=30016, reason=Quit via console command, exitCode=0, thread id=2188, main thread id=2188 [Team_Unknown][System]",
    event_at: "2026-06-15T09:30:00.000Z",
    line_number: 41,
    ...LIVE_HEADER,
  };

  await expect(
    appendFeedEntries(later, owner, createInput([joinPu, gameCrash, gameQuit])),
  ).resolves.toEqual({
    result: AcknowledgementResult.Accepted,
    newEntries: [expect.objectContaining({ rawLine: gameQuit.raw_line })],
    counts: { newEntryCount: 1, duplicateEntryCount: 2, refusedEntryCount: 0 },
  });
  await expect(findStoredEntries()).resolves.toEqual([
    ...storedEntries,
    expect.objectContaining({
      type: LogAnalyzerEntryType.GameQuit,
      eventAt: new Date(gameQuit.event_at),
    }),
  ]);
});

test("refuses each line with an IP address, a different pattern or too much text, and stores the other lines", async () => {
  const owner = await createOwner();
  const warnings: unknown[] = [];
  const { context } = createTestApplicationContext({
    log: {
      info: () => undefined,
      warn: (...parameters) => warnings.push(parameters),
      error: () => undefined,
    },
  });
  const validEntry = createJoinPuEntry(ONE_HOUR_AGO, 1);
  const entryWithIpAddress = createJoinPuEntry(ONE_HOUR_AGO, 2, "192.0.2.10");
  const entryOfDifferentPattern = {
    ...createJoinPuEntry(ONE_HOUR_AGO, 3),
    type: LogAnalyzerEntryType.GameQuit,
  };
  // The schema of the protocol refuses it too, thus only a different caller can send it
  const tooLongEntry = {
    ...createJoinPuEntry(ONE_HOUR_AGO, 4),
    raw_line: `${createJoinPuLine(ONE_HOUR_AGO)}${" ".repeat(
      LOG_ENTRIES_CAPABILITY.maximumRawLineLength,
    )}`,
  };

  await expect(
    appendFeedEntries(
      context,
      owner,
      createInput([
        validEntry,
        entryWithIpAddress,
        entryOfDifferentPattern,
        tooLongEntry,
      ]),
    ),
  ).resolves.toMatchObject({
    result: AcknowledgementResult.Accepted,
    counts: { newEntryCount: 1, duplicateEntryCount: 0, refusedEntryCount: 3 },
  });
  // A batch without a valid entry
  await expect(
    appendFeedEntries(context, owner, createInput([entryWithIpAddress])),
  ).resolves.toEqual({
    result: AcknowledgementResult.Refused,
    errorCode: AcknowledgementErrorCode.EntriesNotValid,
    counts: { newEntryCount: 0, duplicateEntryCount: 0, refusedEntryCount: 1 },
  });

  await expect(findStoredEntries()).resolves.toEqual([
    expect.objectContaining({ rawLine: validEntry.raw_line }),
  ]);
  // The logs get the problems, but no raw line and no hash
  expect(warnings).toHaveLength(2);
  expect(JSON.stringify(warnings)).not.toContain("192.0.2.10");
  expect(JSON.stringify(warnings)).not.toContain(
    await createLogEntryHash(validEntry.type, validEntry.raw_line),
  );
});

test("refuses the batches while the program is off, of a stopped owner, of an unknown connector version and of a user without the permission", async () => {
  const owner = await createOwner();
  const input = createInput([createJoinPuEntry(ONE_HOUR_AGO, 1)]);
  const refusal = (errorCode: AcknowledgementErrorCode) => ({
    result: AcknowledgementResult.Refused,
    errorCode,
    counts: { newEntryCount: 0, duplicateEntryCount: 0, refusedEntryCount: 1 },
  });
  await expect(
    appendFeedEntries(
      createTestApplicationContext({
        isRemoteControlProgramTurnedOff: async () => true,
      }).context,
      owner,
      input,
    ),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.ProgramTurnedOff),
  );

  const { context } = createTestApplicationContext();
  await expect(
    appendFeedEntries(
      context,
      owner,
      createInput(
        input.batch.entries,
        CONNECTOR_CATALOG[ConnectorId.LogFile].version + 1,
      ),
    ),
  ).resolves.toEqual(refusal(AcknowledgementErrorCode.MessageNotValid));
  await expect(
    appendFeedEntries(
      context,
      createTestActor({ userId: owner.userId, citizen: owner.citizen }),
      input,
    ),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.PermissionMissing),
  );

  await expect(findStoredEntries()).resolves.toEqual([]);
});
