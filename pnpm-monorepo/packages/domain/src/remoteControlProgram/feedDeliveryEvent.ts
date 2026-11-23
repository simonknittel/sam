import * as z from "zod";
import { LOG_ANALYZER_ENTRY_HASH_PATTERN } from "../logAnalyzer/logAnalyzerEntries.js";
import { CapabilityId, LOG_ENTRIES_CAPABILITY } from "./catalog.js";

/**
 * The realtime event with the new entries of a feed for one viewer (see
 * "Delivery to the consumers" of `docs/remote-control-program/README.md`).
 * The relay service sends it to the private Remote Control Program channel
 * of the viewer (`getRemoteControlProgramChannelName()`). The consumer client
 * of the app parses it with `feedDeliveryEventPayloadSchema`.
 *
 * The prefix keeps the name apart from the events of the other channels, for
 * example `ON_SITE_NOTIFICATION_CREATED_EVENT`.
 */
export const FEED_DELIVERY_EVENT_NAME = "remote_control_program_feed_entries";

/**
 * The upper limit of the entries in one event. Usually the size limit of the
 * realtime server for one event (see
 * `docs/setup-test-and-production.md#10-set-up-the-relay-service-of-the-remote-control-program`)
 * gives fewer entries: one entry of `log_entries` is at least approximately
 * 280 bytes of JSON. The relay service also splits by this number, thus a
 * higher size limit of the realtime server does not make an event that the
 * schema refuses.
 */
export const MAXIMUM_FEED_DELIVERY_EVENT_ENTRIES = 500;

/** A `cuid()` or `cuid(2)` id has a maximum of 32 characters */
const MAXIMUM_ID_LENGTH = 64;

/** The values of `LogAnalyzerEntryType` are much shorter */
const MAXIMUM_TYPE_LENGTH = 128;

/** The handle of a citizen has no limit in the database. It is a display text. */
const MAXIMUM_HANDLE_LENGTH = 256;

const deliveredLogEntrySchema = z.object({
  id: z.string().min(1).max(MAXIMUM_ID_LENGTH),
  /** The citizen who uploaded the entry */
  owner: z.object({
    id: z.string().min(1).max(MAXIMUM_ID_LENGTH),
    handle: z.string().max(MAXIMUM_HANDLE_LENGTH).nullable(),
  }),
  /**
   * A value of `LogAnalyzerEntryType`. Text, not the enum: the relay service
   * can know a newer pattern than the app (see `toLogAnalyzerEntryType()`).
   */
  type: z.string().min(1).max(MAXIMUM_TYPE_LENGTH),
  /** The raw line with the IP marker. Never write it to the logs. */
  raw_line: z.string().min(1).max(LOG_ENTRIES_CAPABILITY.maximumRawLineLength),
  /** The time of the observation */
  event_at: z.iso.datetime(),
  /** Null for an entry of the upload before the Remote Control Program */
  line_number: z.int32().min(1).nullable(),
  /**
   * The key of the entry for the owner (`createLogEntryHash()`). The consumer
   * client removes the duplicates with it. Never write it to the logs.
   */
  hash: z.string().regex(LOG_ANALYZER_ENTRY_HASH_PATTERN),
  /** The time of the arrival at the relay */
  created_at: z.iso.datetime(),
});

const logEntriesDeliverySchema = z.object({
  capability_id: z.literal(CapabilityId.LogEntries),
  /**
   * Usually in the order of the arrival. One event can contain the entries
   * of more than one owner.
   */
  entries: z
    .array(deliveredLogEntrySchema)
    .min(1)
    .max(MAXIMUM_FEED_DELIVERY_EVENT_ENTRIES),
  /**
   * The entries for this viewer that the relay service dropped before this
   * event, for example after too many waiting entries or after failed
   * publications. When the count is not 0, the consumer client reads the
   * changes since its cursor, as after a reconnect of the realtime service.
   */
  dropped_entry_count: z.int32().min(0),
});

/**
 * The payload of `FEED_DELIVERY_EVENT_NAME`. A new capability is a new
 * option. The relay service sends a capability only to a viewer that
 * watches it, thus a consumer of an older release does not get a capability
 * that it does not know.
 */
export const feedDeliveryEventPayloadSchema = z.discriminatedUnion(
  "capability_id",
  [logEntriesDeliverySchema],
);

export type FeedDeliveryEventPayload = z.infer<
  typeof feedDeliveryEventPayloadSchema
>;
