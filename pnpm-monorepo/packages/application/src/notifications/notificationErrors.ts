/**
 * The messages of the typed errors of the notifications. They are the
 * members of an enum, thus the app can show its own text for each of them.
 */
export enum NotificationErrorMessage {
  /** A `ValidationError`: the name has no prefix of a realtime channel */
  RealtimeChannelUnknown = "The realtime channel does not exist",
  /** A `ForbiddenError` */
  RealtimeChannelForbidden = "The realtime channel is not open to the actor",
  /** A `NotFoundError` */
  WebPushSubscriptionNotFound = "The web push subscription does not exist",
}
