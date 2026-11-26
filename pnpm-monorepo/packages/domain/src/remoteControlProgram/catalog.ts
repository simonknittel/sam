import {
  MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH,
  MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES,
} from "../logAnalyzer/logAnalyzerEntries.js";

/**
 * The catalog of the Remote Control Program: the capabilities, the
 * connectors, the runtime kinds, the switches and the limits of the relay.
 * The runtimes, the relay service and the consumers share it (see
 * `docs/remote-control-program/README.md#capabilities`).
 *
 * A released version of a capability does not change (principle 10). To
 * change a capability, add a new version.
 */

/**
 * The Unleash flags of the Remote Control Program (see "Switches" of the
 * concept). Each flag is a kill switch: when the flag is on, its part is off.
 * Without a value of the flag (no Unleash in the stack, or Unleash is not
 * available), all parts stay on. The flag `DisableMcpServer` of the app
 * works the same way. The flags are switches of
 * the organization: the app and the relay service read them without the
 * context of a user, thus a strategy can only select an app name (for example
 * the app of one Playwright worker).
 *
 * Add each new flag also to the flag list of the Unleash bootstrap in
 * `compose.yml` and to `UNLEASH_FLAG` of `apps/playwright/fixtures/unleash.ts`.
 * The app and the relay service read the flags of this enum directly.
 */
export enum RemoteControlProgramUnleashFlag {
  /**
   * Turns off all parts: the relay refuses the connections of the runtimes,
   * and the consumers read no data
   */
  DisableRemoteControlProgram = "DisableRemoteControlProgram",
  /** The relay refuses the uploads of the log file connector */
  DisableLogFileConnector = "DisableLogFileConnector",
  /** The relay refuses the uploads of `log_entries`, and the consumers read no log entries */
  DisableLogEntriesCapability = "DisableLogEntriesCapability",
}

export enum CapabilityId {
  LogEntries = "log_entries",
}

/** The kinds "state" (step 3) and "action" (step 5) come later */
export enum CapabilityKind {
  /** Entries that the relay appends. Each entry has a time and a unique key. */
  Feed = "feed",
}

/** The timing "periodic" comes when a capability needs it */
export enum CapabilityTiming {
  /** The relay gives the new values to the consumers within seconds */
  Realtime = "realtime",
}

export enum CapabilitySensitivity {
  Normal = "normal",
  /** The sharing popover shows a warning */
  High = "high",
}

export enum ConnectorId {
  LogFile = "log_file",
}

/**
 * The kinds of the runtimes: the values of the Prisma enum of the table of
 * the runtimes, which `runtime_kind` of the protocol also uses. The browser
 * runtime runs in a SAM tab of a Chromium browser. The desktop companion
 * comes in step 3. A new kind is a compatible change of the protocol: a
 * runtime of an older release never sends it.
 */
export { RemoteControlProgramRuntimeKind as RuntimeKind } from "@sam-monorepo/database/browser";

export interface FeedCapabilityDefinition {
  readonly id: CapabilityId;
  /** The current version. A released version does not change. */
  readonly version: number;
  readonly kind: CapabilityKind.Feed;
  readonly timing: CapabilityTiming;
  /**
   * A runtime sends a maximum of one batch of the capability in this
   * interval. The relay refuses the batches above this rate (see
   * `RELAY_LIMITS.uploadBurstBatches`).
   */
  readonly minimumUploadIntervalMilliseconds: number;
  readonly sensitivity: CapabilitySensitivity;
  readonly unleashFlag: RemoteControlProgramUnleashFlag;
  readonly maximumEntriesPerBatch: number;
}

export type CapabilityDefinition = FeedCapabilityDefinition;

/** The matched lines of `Game.log` (see "Log Analyzer" of the concept) */
export const LOG_ENTRIES_CAPABILITY = {
  id: CapabilityId.LogEntries,
  version: 1,
  kind: CapabilityKind.Feed,
  timing: CapabilityTiming.Realtime,
  /**
   * One batch each second gives a live log without a perceptible delay. A
   * request for older entries with 5,000 entries (50 batches) takes
   * approximately one minute.
   */
  minimumUploadIntervalMilliseconds: 1_000,
  /**
   * The raw lines contain the names of other players, the server and the
   * location of the owner, and SAM keeps them permanently (decision 12)
   */
  sensitivity: CapabilitySensitivity.High,
  unleashFlag: RemoteControlProgramUnleashFlag.DisableLogEntriesCapability,
  maximumEntriesPerBatch: MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES,
  maximumRawLineLength: MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH,
} as const satisfies FeedCapabilityDefinition & {
  readonly maximumRawLineLength: number;
};

export const CAPABILITY_CATALOG: Readonly<
  Record<CapabilityId, CapabilityDefinition>
> = {
  [CapabilityId.LogEntries]: LOG_ENTRIES_CAPABILITY,
};

export interface ConnectorDefinition {
  readonly id: ConnectorId;
  /**
   * The current version of the connector. Each stored value records it
   * (principle 13). Increase it when the connector changes the values that
   * it supplies. All implementations of a connector (TypeScript and Rust)
   * with the same version give the same values for the shared test data.
   */
  readonly version: number;
  readonly unleashFlag: RemoteControlProgramUnleashFlag;
  readonly capabilityIds: readonly CapabilityId[];
}

export const CONNECTOR_CATALOG: Readonly<
  Record<ConnectorId, ConnectorDefinition>
> = {
  [ConnectorId.LogFile]: {
    id: ConnectorId.LogFile,
    version: 1,
    unleashFlag: RemoteControlProgramUnleashFlag.DisableLogFileConnector,
    capabilityIds: [CapabilityId.LogEntries],
  },
};

/** The parts that the switches of the organization turn off */
export interface RemoteControlProgramSwitches {
  readonly isProgramTurnedOff: boolean;
  readonly turnedOffConnectorIds: readonly ConnectorId[];
  readonly turnedOffCapabilityIds: readonly CapabilityId[];
}

/**
 * Reads the switches from the values of the Unleash flags. The callback
 * gives true when the flag is on.
 */
export const getRemoteControlProgramSwitches = (
  isFlagEnabled: (flag: RemoteControlProgramUnleashFlag) => boolean,
): RemoteControlProgramSwitches => ({
  isProgramTurnedOff: isFlagEnabled(
    RemoteControlProgramUnleashFlag.DisableRemoteControlProgram,
  ),
  turnedOffConnectorIds: Object.values(CONNECTOR_CATALOG)
    .filter((connector) => isFlagEnabled(connector.unleashFlag))
    .map((connector) => connector.id),
  turnedOffCapabilityIds: Object.values(CAPABILITY_CATALOG)
    .filter((capability) => isFlagEnabled(capability.unleashFlag))
    .map((capability) => capability.id),
});

/**
 * All parts are on: the switches of a host without Unleash, and the switches
 * until the first answer of Unleash
 */
export const ALL_REMOTE_CONTROL_PROGRAM_PARTS_ON: RemoteControlProgramSwitches =
  {
    isProgramTurnedOff: false,
    turnedOffConnectorIds: [],
    turnedOffCapabilityIds: [],
  };

/** The limits of the relay service, which the runtimes also obey */
export const RELAY_LIMITS = {
  /**
   * The largest message in one direction. A full batch of `log_entries` (100
   * lines of 1,000 characters with 3 bytes each in UTF-8, and the JSON) is
   * approximately 320 KB. The limit leaves space for it and bounds the memory
   * of the relay for each message. A larger message closes the connection
   * (close code 1009 of the WebSocket library).
   */
  maximumMessageBytes: 512 * 1024,
  /**
   * The runtimes of one owner that can be online at the same time. One owner
   * has some browsers and later one desktop companion. The limit stops one
   * account from opening many connections. Only the runtimes with a valid
   * lease of the presence count.
   */
  maximumRuntimesPerOwner: 5,
  /**
   * The lifetime of a connection token. The same lifetime as the collab
   * tokens of the wiki.
   */
  connectionTokenLifetimeMilliseconds: 120_000,
  /**
   * Half of the lifetime of a token, thus one renewal can fail or come late
   * without an effect
   */
  tokenRenewalIntervalMilliseconds: 60_000,
  /**
   * The relay closes a connection this time after the expiry of its last
   * token. The time covers the request for the next token, and the timers of
   * a hidden browser tab, which the browser can delay to one run in each
   * minute. The same time as the collab server.
   */
  tokenRenewalGraceMilliseconds: 30_000,
  /**
   * The relay closes a connection without a `welcome` this time after its
   * start, and the runtime stops to wait for the `welcome` after this time.
   * The runtime sends the `hello` at once after the connection opens, and
   * the handshake needs some queries of the database. A short time limits the
   * sockets that wait without a valid token.
   */
  handshakeTimeoutMilliseconds: 10_000,
  /** The interval of the `heartbeat` of a runtime (see "Presence" of the concept) */
  heartbeatIntervalMilliseconds: 15_000,
  /**
   * A runtime without a `heartbeat` in this time is offline. The lease is
   * longer than one minute, because a hidden browser tab can delay its timers
   * to one run in each minute.
   */
  presenceLeaseMilliseconds: 90_000,
  /**
   * The batches of one capability that a runtime can send faster than the
   * minimum interval of the capability. The network can make two batches
   * arrive closer together than the runtime sent them.
   */
  uploadBurstBatches: 5,
  /**
   * A correct runtime almost never gets an error. More errors in one minute
   * show a defect or an attack, thus the relay closes the connection.
   */
  maximumErrorsPerMinute: 10,
} as const;
