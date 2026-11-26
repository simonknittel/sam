import {
  createUpMessage,
  type UpMessageOfType,
  type UpMessageType,
} from "@sam-monorepo/domain";

/**
 * The protocol version of the browser runtime. It is older than
 * `RELAY_PROTOCOL_VERSION`: the browser runtime gets the keys of the own
 * entries from the app (decision 34), thus it does not use version 2. The
 * relay sends it no message type of a newer version.
 */
export const CHANNEL_PROTOCOL_VERSION = 1;

/** Each message of the channel client has its protocol version */
export const createChannelMessage = <Type extends UpMessageType>(
  type: Type,
  content: UpMessageOfType<Type>["content"],
) => createUpMessage(type, content, CHANNEL_PROTOCOL_VERSION);
