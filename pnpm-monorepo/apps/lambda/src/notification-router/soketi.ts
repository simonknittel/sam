import { type OnSiteNotification } from "@sam-monorepo/database";
import {
  getCitizenChannelName,
  ON_SITE_NOTIFICATION_CREATED_EVENT,
} from "@sam-monorepo/notifications";
import Pusher from "pusher";
import { log } from "../common/logger";

/**
 * Maximum number of events per `triggerBatch` call, limited by the Pusher
 * Channels REST API (soketi implements the same endpoint).
 */
const TRIGGER_BATCH_MAX_EVENTS = 10;

/**
 * Realtime publishing is optional: without the environment variables the
 * client stays `null` and events are skipped — recipients then see new
 * notifications on their next page load.
 */
let channelsClient: Pusher | null = null;

if (
  process.env.PUSHER_CHANNELS_APP_ID &&
  process.env.PUSHER_CHANNELS_APP_KEY &&
  process.env.PUSHER_CHANNELS_APP_SECRET &&
  process.env.PUSHER_CHANNELS_HOST &&
  process.env.PUSHER_CHANNELS_PORT
) {
  channelsClient = new Pusher({
    appId: process.env.PUSHER_CHANNELS_APP_ID,
    key: process.env.PUSHER_CHANNELS_APP_KEY,
    secret: process.env.PUSHER_CHANNELS_APP_SECRET,
    host: process.env.PUSHER_CHANNELS_HOST,
    port: process.env.PUSHER_CHANNELS_SECURE_PORT
      ? process.env.PUSHER_CHANNELS_SECURE_PORT
      : process.env.PUSHER_CHANNELS_PORT,
    useTLS: Boolean(process.env.PUSHER_CHANNELS_SECURE_PORT),
  });
}

/**
 * Announces freshly created on-site notifications on the private channel of
 * each recipient. Each event carries the full row so connected clients can
 * prepend it without a refetch.
 */
export const publishOnSiteNotificationEvents = async (
  rows: OnSiteNotification[],
) => {
  if (!channelsClient) {
    log.info("Soketi client not configured, skipping realtime events");
    return;
  }
  if (rows.length <= 0) return;

  const events = rows.map((row) => ({
    channel: getCitizenChannelName(row.citizenId),
    name: ON_SITE_NOTIFICATION_CREATED_EVENT,
    data: JSON.stringify({
      id: row.id,
      notificationType: row.notificationType,
      payload: row.payload,
      payloadVersion: row.payloadVersion,
      createdAt: row.createdAt.toISOString(),
      readAt: null,
      archivedAt: null,
    }),
  }));

  for (
    let batchStart = 0;
    batchStart < events.length;
    batchStart += TRIGGER_BATCH_MAX_EVENTS
  ) {
    const batch = events.slice(
      batchStart,
      batchStart + TRIGGER_BATCH_MAX_EVENTS,
    );

    try {
      await channelsClient.triggerBatch(batch);
    } catch (error) {
      /**
       * Realtime delivery is best-effort: the rows are already persisted and
       * recipients will see them on their next page load.
       */
      void log.error("Error publishing on-site notification events", {
        error,
        count: batch.length,
      });
    }
  }

  log.info("Published on-site notification events", { count: events.length });
};
