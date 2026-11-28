import {
  MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH,
  MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES,
} from "../logAnalyzer/logAnalyzerEntries.js";

/**
 * The catalog of the Remote Control Program: the Unleash flag, the
 * capabilities, the connectors, the runtime kinds and the limits of the relay.
 * The runtimes, the relay service and the consumers share it (see
 * `docs/remote-control-program/README.md#capabilities`).
 *
 * A released version of a capability does not change (principle 10). To
 * change a capability, add a new version.
 */

/**
 * The Unleash flag of the Remote Control Program (see "Switches" of the
 * concept). It is a kill switch: when the flag is on, the full Remote Control
 * Program is off. The connectors and the capabilities have no flags of their
 * own. Without a value of the flag (no Unleash in the stack, or Unleash is
 * not available), the program stays on. The flag `DisableMcpServer` of the
 * app works the same way. The flag is a switch of the organization: the app
 * and the relay service read it without the context of a user, thus a
 * strategy can only select an app name (for example the app of one
 * Playwright worker).
 *
 * The flag is also in the flag list of the Unleash bootstrap in
 * `compose.yml` and in `UNLEASH_FLAG` of `apps/playwright/fixtures/unleash.ts`.
 */
export enum RemoteControlProgramUnleashFlag {
  /**
   * The relay refuses and closes the connections of the runtimes, and the
   * consumers read no data
   */
  DisableRemoteControlProgram = "DisableRemoteControlProgram",
}

export enum CapabilityId {
  LogEntries = "log_entries",
}

/** The kinds "state" (step 4) and "action" (step 6) come later */
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
 * runtime runs in a SAM tab of a Chromium browser. The desktop companion is
 * a program on the machine with an OAuth login. The relay service accepts a
 * kind only with the source of its connection token (see
 * `authenticateRuntimeConnection()`). A new kind is a compatible change of
 * the protocol: a runtime of an older release never sends it.
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
  readonly maximumEntriesPerBatch: number;
}

export type CapabilityDefinition = FeedCapabilityDefinition;

/** The matched lines of `Game.log` (see "Log Analyzer" of the concept) */
export const LOG_ENTRIES_CAPABILITY = {
  id: CapabilityId.LogEntries,
  /**
   * Version 2 adds the game environment and the build number of the log file
   * to each entry (decision 17). The relay accepts only version 2.
   */
  version: 2,
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
  readonly capabilityIds: readonly CapabilityId[];
}

/**
 * The URL scheme of the desktop companion (decision 37). The program
 * registers it for the user of the operating system. A link to
 * `DESKTOP_COMPANION_OPEN_URL` starts the program, or opens the window of
 * the copy that runs. The program accepts only this URL: a different path or
 * a parameter does nothing, because each website can open such a link.
 */
export const DESKTOP_COMPANION_URL_SCHEME = "sam-desktop-companion";

export const DESKTOP_COMPANION_OPEN_URL = `${DESKTOP_COMPANION_URL_SCHEME}://open`;

export const CONNECTOR_CATALOG: Readonly<
  Record<ConnectorId, ConnectorDefinition>
> = {
  [ConnectorId.LogFile]: {
    id: ConnectorId.LogFile,
    /** Version 2 reads the header of each log file (see `logFileHeader.ts`) */
    version: 2,
    capabilityIds: [CapabilityId.LogEntries],
  },
};

/** Two limits of `RELAY_LIMITS` have this value */
const MAXIMUM_FEED_ENTRY_KEY_PAGES_PER_CHECK = 50;

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
   * The keys on one page of `feed_entry_keys`. A full page (2,000 keys of 64
   * characters, and the JSON) is approximately 134 KB, thus it stays below
   * `maximumMessageBytes`.
   */
  maximumFeedEntryKeysPerPage: 2_000,
  /**
   * The pages of `feed_entry_keys` of one check of a runtime, for example for
   * the count of a request for older entries: 100,000 keys. Above it, the
   * runtime sends the entries without a check, and the relay removes the
   * duplicates.
   */
  maximumFeedEntryKeyPagesPerCheck: MAXIMUM_FEED_ENTRY_KEY_PAGES_PER_CHECK,
  /**
   * The `feed_entry_keys_request`s of one connection: one in each interval,
   * and a burst of `feedEntryKeyRequestBurstSize` after a pause. A runtime
   * requests the pages of one check one after the other, thus the burst
   * covers the pages of one check. Each page is one query of the database,
   * thus the limit bounds this work. A request above the rate gets
   * `rate_limit_exceeded` and counts as an error.
   */
  feedEntryKeyRequestIntervalMilliseconds: 1_000,
  feedEntryKeyRequestBurstSize: MAXIMUM_FEED_ENTRY_KEY_PAGES_PER_CHECK,
  /**
   * A correct runtime almost never gets an error. More errors in one minute
   * show a defect or an attack, thus the relay closes the connection.
   */
  maximumErrorsPerMinute: 10,
} as const;
