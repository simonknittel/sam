export const CITIZEN_CHANNEL_PREFIX = "private-citizen-";

export const getCitizenChannelName = (citizenId: string) =>
  `${CITIZEN_CHANNEL_PREFIX}${citizenId}`;

/**
 * The channel of the Remote Control Program of one citizen: the relay
 * service sends the new feed entries of the watched owners to it (see
 * `FEED_DELIVERY_EVENT_NAME`). It is separate from the channel of the
 * notifications, because an admin who assumes a user sees the notifications
 * of the user, but not the data of the Remote Control Program (decision 4 of
 * `docs/remote-control-program/README.md`).
 */
export const REMOTE_CONTROL_PROGRAM_CHANNEL_PREFIX =
  "private-remote-control-program-";

export const getRemoteControlProgramChannelName = (citizenId: string) =>
  `${REMOTE_CONTROL_PROGRAM_CHANNEL_PREFIX}${citizenId}`;

/** The private channels of one citizen */
export enum CitizenRealtimeChannel {
  /** `getCitizenChannelName()` */
  Notifications = "notifications",
  /** `getRemoteControlProgramChannelName()` */
  RemoteControlProgram = "remote_control_program",
}

export const getCitizenRealtimeChannelName = (
  channel: CitizenRealtimeChannel,
  citizenId: string,
) => {
  switch (channel) {
    case CitizenRealtimeChannel.Notifications:
      return getCitizenChannelName(citizenId);

    case CitizenRealtimeChannel.RemoteControlProgram:
      return getRemoteControlProgramChannelName(citizenId);

    default:
      throw new Error(`Unknown realtime channel: ${channel satisfies never}`);
  }
};

/** The app has no subscriber for it at the moment. */
export const EVENT_CHANNEL_PREFIX = "private-event-";

/**
 * The limit of Pusher Channels for the name of a channel. The longest prefix
 * (`REMOTE_CONTROL_PROGRAM_CHANNEL_PREFIX`, 31 characters) and an id of a
 * citizen (a `cuid()` or `cuid(2)` id, a maximum of 32 characters) stay far
 * below it.
 */
export const MAXIMUM_REALTIME_CHANNEL_NAME_LENGTH = 164;

export const ON_SITE_NOTIFICATION_CREATED_EVENT =
  "on-site-notification-created";
