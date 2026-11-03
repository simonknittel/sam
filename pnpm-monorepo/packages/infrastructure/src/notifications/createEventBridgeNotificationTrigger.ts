import { createId } from "@paralleldrive/cuid2";
import type { ApplicationContext, Logger } from "@sam-monorepo/application";
import type { EmitEvents } from "../eventbridge/createEventBridgeEmitter.js";

/** The rule of the notification router matches only this detail type */
const NOTIFICATION_REQUESTED_DETAIL_TYPE = "NotificationRequested";

export interface EventBridgeNotificationTriggerOptions {
  readonly emitEvents: EmitEvents;
  /**
   * The `Source` of the events: the host that requests the notifications,
   * for example "App" or the name of a Lambda function
   */
  readonly source: string;
  readonly log: Logger;
  /**
   * Sends at a later time, for example after the response of the request
   * (`after()` of Next.js). Then `trigger()` cannot give a failure to the
   * caller, thus it logs the failure. Without it, `trigger()` waits for the
   * send and throws a failure.
   */
  readonly defer?: (send: () => Promise<void>) => void;
}

/**
 * Sends each notification as one `NotificationRequested` event to the
 * notification router. The router processes each `requestId` only once.
 */
export const createEventBridgeNotificationTrigger = ({
  emitEvents,
  source,
  log,
  defer,
}: EventBridgeNotificationTriggerOptions): ApplicationContext["notifications"] => ({
  trigger: async (notifications) => {
    const entries = notifications.map((notification) => ({
      Source: source,
      DetailType: NOTIFICATION_REQUESTED_DETAIL_TYPE,
      Detail: JSON.stringify({
        type: notification.type,
        payload: notification.payload,
        requestId: createId(),
      }),
    }));

    if (!defer) return emitEvents(entries);

    defer(async () => {
      try {
        await emitEvents(entries);
      } catch (error) {
        log.error("Failed to trigger notifications after the response", {
          types: notifications.map((notification) => notification.type),
          error,
        });
      }
    });
  },
});
