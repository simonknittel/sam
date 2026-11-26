# Relay service

The relay service of the [Remote Control Program](../../../docs/remote-control-program/README.md#relay). The runtimes keep one WebSocket connection open to it. It calls the use cases of `@sam-monorepo/application` and sends the new feed entries to the watching viewers through the realtime server.

## Modules

| File                                                  | Content                                                                                                                                                                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                                        | The entry point: the environment (`src/env.ts`), the start of OpenTelemetry, then `src/main.ts`                                                                                                                       |
| `src/main.ts`                                         | Composes the service, starts it, and stops it at `SIGTERM` and `SIGINT`                                                                                                                                               |
| `src/applicationContext.ts`                           | The composition root: the only module with the Prisma client (see `src/boundaries.test.ts`)                                                                                                                           |
| `src/relayServer.ts`                                  | The HTTP server: the WebSocket endpoint `/`, the `Origin` check, the limit of the sockets before the `welcome`, the close of all connections when the program turns off, the disconnected users, the controlled close |
| `src/relayConnection.ts`                              | One runtime connection: the handshake, the two lanes of the messages, the limits, the time limits, the upload counts, the keys of the own entries                                                                     |
| `src/rateLimits.ts`                                   | The limits of each owner for all its connections: the `hello`s, the upload rate of each runtime and capability, the hourly budget of entries                                                                          |
| `src/httpEndpoints.ts`                                | `GET /health` and the internal endpoints of the app                                                                                                                                                                   |
| `src/programSwitch.ts`                                | The Unleash flag of the program from the Unleash client, or the program on without Unleash                                                                                                                            |
| `src/metrics.ts`, `src/telemetry.ts`, `src/logger.ts` | The metrics, the OpenTelemetry SDK, the JSON logs without personal data, and a log with a rate limit for the events of clients without a valid token                                                                  |
| `src/delivery/`                                       | The delivery of the new entries to the viewers through the realtime server                                                                                                                                            |

## Protocol versions

The relay service accepts the protocol versions from `MINIMUM_RELAY_PROTOCOL_VERSION` to `RELAY_PROTOCOL_VERSION` of [protocol.ts](../../packages/domain/src/remoteControlProgram/protocol.ts). The browser runtime uses version 1. The desktop companion uses version 2: it has no session of the app, thus it gets the keys of its own entries from the relay service (decision 34 of the [concept](../../../docs/remote-control-program/README.md#decisions)).

The answers to `feed_entry_keys_request`:

| Condition                                                                                                        | Answer                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| The `hello` of the connection has version 2 or newer                                                             | `feed_entry_keys` with the id of the request and one page of the keys of the owner (the use case `findOwnFeedEntryKeys`), and no `ack` |
| The `hello` of the connection has version 1, or the content is not valid                                         | `ack` with `message_not_valid`. Counts as an error.                                                                                    |
| Above the rate of `feedEntryKeyRequestIntervalMilliseconds` and `feedEntryKeyRequestBurstSize` of `RELAY_LIMITS` | `ack` with `rate_limit_exceeded`. Counts as an error.                                                                                  |
| The data lane is full, or a temporary error, for example of the database                                         | `ack` with `internal_error`. The runtime sends the request again.                                                                      |
| The user has no access any more, or the switch turned off the program                                            | `close` with `access_denied` or `program_turned_off`, like for each message                                                            |

## Commands

Run the commands in `pnpm-monorepo/apps/relay`.

- `pnpm run dev`: starts the service with the variables of `.env` (see `src/env.ts`).
- `pnpm run typecheck`, `pnpm run build`.
- `pnpm test`: the unit tests and the integration tests. The integration tests start a PostgreSQL container with the helpers of `packages/application/test/` (Docker must run), and connect real WebSocket clients to a relay service with a local key set of the app.
