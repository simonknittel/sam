import { metrics } from "@opentelemetry/api";

/**
 * The value of the attribute `reason` of `sam.relay.closes` for a close
 * without a reason of the protocol
 */
export enum UnexplainedCloseReason {
  /** The runtime or the network closed the connection */
  ClosedByRuntime = "closed_by_runtime",
  /** The runtime sent a message above `RELAY_LIMITS.maximumMessageBytes` (close code 1009) */
  MessageTooLarge = "message_too_large",
  /** A different defect of the WebSocket protocol, for example a binary frame that is not valid */
  ProtocolError = "protocol_error",
  /** A temporary error of the relay service in the handshake (close code 1011) */
  InternalError = "internal_error",
}

/** The value of the attribute `result` of `sam.relay.upload.entries` */
export enum FeedEntryResult {
  /** Stored as a new entry */
  New = "new",
  /** Valid, but the relay service had the entry already */
  Duplicate = "duplicate",
  /** Not accepted by `appendFeedEntries` */
  Refused = "refused",
}

/** The value of the attribute `result` of `sam.relay.upload.duration` */
export enum UploadResult {
  Accepted = "accepted",
  Refused = "refused",
  Failed = "failed",
}

/**
 * The upload of one batch is one transaction. 10 seconds and more show an
 * overload of the database.
 */
const UPLOAD_DURATION_BUCKET_BOUNDARIES_SECONDS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

/**
 * The metrics of the connections of the relay service. The delivery has its
 * own metrics (`delivery/deliveryMetrics.ts`). Call it after the start of the
 * OpenTelemetry SDK: before the SDK registers its meter provider, the API
 * gives instruments that record nothing.
 */
export const createRelayMetrics = () => {
  const meter = metrics.getMeter("sam-relay");

  return {
    openConnections: meter.createUpDownCounter("sam.relay.connections", {
      unit: "{connection}",
      description: "The open runtime connections (after the welcome)",
    }),
    messages: meter.createCounter("sam.relay.messages", {
      unit: "{message}",
      description:
        "The messages of the runtimes, with the attribute message_type (not_valid for a message that the relay service cannot read)",
    }),
    refusals: meter.createCounter("sam.relay.refusals", {
      unit: "{refusal}",
      description: "The refused hello messages, with the attribute reason",
    }),
    closes: meter.createCounter("sam.relay.closes", {
      unit: "{close}",
      description: "The closed runtime connections, with the attribute reason",
    }),
    refusedMessages: meter.createCounter("sam.relay.refused_messages", {
      unit: "{message}",
      description:
        "The messages that the relay service refused with an ack, with the attributes message_type and error_code",
    }),
    uploadedEntries: meter.createCounter("sam.relay.upload.entries", {
      unit: "{entry}",
      description:
        "The entries of the uploaded batches, with the attributes capability_id and result",
    }),
    uploadBudgetRefusals: meter.createCounter(
      "sam.relay.upload.budget_refusals",
      {
        unit: "{batch}",
        description:
          "The batches that the relay service refused, because their owner used the hourly budget of entries, with the attribute capability_id",
      },
    ),
    uploadDuration: meter.createHistogram("sam.relay.upload.duration", {
      unit: "s",
      description:
        "The time of appendFeedEntries for one batch, with the attributes capability_id and result",
      advice: {
        explicitBucketBoundaries: UPLOAD_DURATION_BUCKET_BOUNDARIES_SECONDS,
      },
    }),
  };
};

export type RelayMetrics = ReturnType<typeof createRelayMetrics>;
