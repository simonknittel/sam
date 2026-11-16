/**
 * Why web push subscriptions get deleted without a request of their citizen.
 * The values are the reasons of the audit event.
 */
export enum WebPushPruneReason {
  /** A push service answered that the subscription is gone */
  Expired = "expired",
  /**
   * The push service answered the confirmation push of a new subscription
   * that the subscription is gone
   */
  Invalid = "invalid",
  /** An admin banned the user of the citizen */
  Banned = "banned",
}
