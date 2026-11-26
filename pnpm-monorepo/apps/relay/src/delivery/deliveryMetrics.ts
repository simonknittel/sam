import { metrics } from "@opentelemetry/api";

/** Why the delivery dropped entries for a viewer (the attribute `reason`) */
export enum DroppedEntryReason {
  /** The viewer had `MAXIMUM_WAITING_ENTRIES_PER_VIEWER` waiting entries */
  ViewerLimit = "viewer_limit",
  /** All viewers together had `MAXIMUM_WAITING_ENTRIES` waiting entries */
  TotalLimit = "total_limit",
  /** The entry waited longer than `MAXIMUM_WAITING_MILLISECONDS` */
  Expired = "expired",
  /** One entry alone is larger than the size limit of an event */
  TooLarge = "too_large",
  /** The publication at the controlled close failed */
  Closed = "closed",
}

/** The step of the delivery that failed (the attribute `stage`) */
export enum DeliveryStage {
  /** `findWatchingViewers` and the queue of the entries for each viewer */
  Collection = "collection",
  /** `publishToCitizens` of the realtime port */
  Publication = "publication",
}

/**
 * The bucket boundaries of the delay in seconds. Usually the delay is
 * between 0 and the interval of 2 seconds. The upper buckets show the
 * publications again after a failure (`MAXIMUM_WAITING_MILLISECONDS`).
 */
const DELAY_BUCKET_BOUNDARIES_SECONDS = [
  0.05, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 5, 7.5, 10,
];

/**
 * The instruments of the delivery. Call it after the start of the
 * OpenTelemetry SDK: before the SDK registers its meter provider, the API
 * gives instruments that record nothing.
 */
export const createDeliveryMetrics = () => {
  const meter = metrics.getMeter("sam-relay");

  return {
    deliveredEntries: meter.createCounter("sam.relay.delivery.entries", {
      unit: "{entry}",
      description:
        "The entries in the events that the realtime server accepted. An entry for two viewers counts two times.",
    }),
    deliveredEvents: meter.createCounter("sam.relay.delivery.events", {
      unit: "{event}",
      description: "The events that the realtime server accepted",
    }),
    delay: meter.createHistogram("sam.relay.delivery.delay", {
      unit: "s",
      description:
        "The time from the acceptance of the oldest entry of an event to the publication of the event",
      advice: { explicitBucketBoundaries: DELAY_BUCKET_BOUNDARIES_SECONDS },
    }),
    droppedEntries: meter.createCounter("sam.relay.delivery.dropped_entries", {
      unit: "{entry}",
      description:
        "The entries that the delivery dropped for a viewer, with the attribute reason",
    }),
    errors: meter.createCounter("sam.relay.delivery.errors", {
      unit: "{error}",
      description: "The failed steps of the delivery, with the attribute stage",
    }),
  };
};

export type DeliveryMetrics = ReturnType<typeof createDeliveryMetrics>;
