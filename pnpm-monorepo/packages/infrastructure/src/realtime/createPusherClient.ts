import Pusher from "pusher";

export type PusherClient = Pusher;

export interface PusherClientOptions {
  readonly appId: string;
  readonly key: string;
  readonly secret: string;
  readonly host: string;
  readonly port: number;
  /** HTTPS for the requests to the HTTP API */
  readonly useTls: boolean;
  /** The maximum time of one request to the HTTP API */
  readonly timeoutMilliseconds: number;
}

/**
 * The client of the HTTP API of the realtime server (Pusher Channels or
 * Soketi). The app also signs the subscriptions of its tabs with it.
 */
export const createPusherClient = ({
  appId,
  key,
  secret,
  host,
  port,
  useTls,
  timeoutMilliseconds,
}: PusherClientOptions): PusherClient =>
  new Pusher({
    appId,
    key,
    secret,
    host,
    port: port.toFixed(),
    useTLS: useTls,
    timeout: timeoutMilliseconds,
  });
