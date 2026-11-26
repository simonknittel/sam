import type Pusher from "pusher-js";

/** The events and the states of pusher-js */
const SUBSCRIPTION_SUCCEEDED_EVENT = "pusher:subscription_succeeded";
const SUBSCRIPTION_ERROR_EVENT = "pusher:subscription_error";
const STATE_CHANGE_EVENT = "state_change";
const CONNECTED_STATE = "connected";

interface ConnectionStateChange {
  readonly previous: string;
  readonly current: string;
}

export interface RealtimeChannelHandlers {
  readonly onEvent: (data: unknown) => void;
  /**
   * The subscription is ready: the first time, and after each reconnect.
   * The events between the loss and this call are lost.
   */
  readonly onSubscribed: () => void;
  /** No event arrives until the next `onSubscribed()` */
  readonly onUnsubscribed: () => void;
}

/**
 * The count of the users of each channel of each client. Each user binds its
 * own handlers, and only the last user unsubscribes: an unsubscription of
 * pusher-js ends the channel for all users in the tab.
 */
const channelUserCounts = new WeakMap<Pusher, Map<string, number>>();

/**
 * Subscribes to one event of a channel of the Pusher connection of the app
 * (`ChannelsProvider`), and tells when the subscription is ready or lost.
 * Returns the function that ends the subscription.
 */
export const watchRealtimeChannel = (
  client: Pusher,
  channelName: string,
  eventName: string,
  handlers: RealtimeChannelHandlers,
) => {
  const userCounts = channelUserCounts.get(client) ?? new Map<string, number>();
  channelUserCounts.set(client, userCounts);
  userCounts.set(channelName, (userCounts.get(channelName) ?? 0) + 1);

  const handleStateChange = ({ current }: ConnectionStateChange) => {
    // pusher-js subscribes again after the reconnect
    if (current !== CONNECTED_STATE) handlers.onUnsubscribed();
  };

  const channel = client.subscribe(channelName);
  channel.bind(eventName, handlers.onEvent);
  channel.bind(SUBSCRIPTION_SUCCEEDED_EVENT, handlers.onSubscribed);
  channel.bind(SUBSCRIPTION_ERROR_EVENT, handlers.onUnsubscribed);
  client.connection.bind(STATE_CHANGE_EVENT, handleStateChange);

  // A different user subscribed before, thus the event does not come again
  if (channel.subscribed) handlers.onSubscribed();

  return () => {
    channel.unbind(eventName, handlers.onEvent);
    channel.unbind(SUBSCRIPTION_SUCCEEDED_EVENT, handlers.onSubscribed);
    channel.unbind(SUBSCRIPTION_ERROR_EVENT, handlers.onUnsubscribed);
    client.connection.unbind(STATE_CHANGE_EVENT, handleStateChange);
    handlers.onUnsubscribed();

    const remainingUserCount = (userCounts.get(channelName) ?? 1) - 1;
    if (remainingUserCount > 0) {
      userCounts.set(channelName, remainingUserCount);
      return;
    }

    userCounts.delete(channelName);
    client.unsubscribe(channelName);
  };
};
