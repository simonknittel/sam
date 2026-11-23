# Relay service

The relay service of the [Remote Control Program](../../../docs/remote-control-program/README.md#relay). The runtimes keep one WebSocket connection open to it. It calls the use cases of `@sam-monorepo/application` and sends the new feed entries to the watching viewers through the realtime server.

## Modules

| File                                                  | Content                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                                        | The entry point: the environment (`src/env.ts`), the start of OpenTelemetry, then `src/main.ts`                                       |
| `src/main.ts`                                         | Composes the service, starts it, and stops it at `SIGTERM` and `SIGINT`                                                               |
| `src/applicationContext.ts`                           | The composition root: the only module with the Prisma client (see `src/boundaries.test.ts`)                                           |
| `src/relayServer.ts`                                  | The HTTP server: the WebSocket endpoint `/`, the `Origin` check, the broadcasts of the switches and of the stop, the controlled close |
| `src/relayConnection.ts`                              | One runtime connection: the handshake, the two lanes of the messages, the limits, the time limits, the upload counts                  |
| `src/httpEndpoints.ts`                                | `GET /health` and the internal endpoints of the app                                                                                   |
| `src/switches.ts`                                     | The switches from the Unleash client                                                                                                  |
| `src/metrics.ts`, `src/telemetry.ts`, `src/logger.ts` | The metrics, the OpenTelemetry SDK, the JSON logs without personal data                                                               |
| `src/delivery/`                                       | The delivery of the new entries to the viewers through the realtime server                                                            |

## Commands

Run the commands in `pnpm-monorepo/apps/relay`.

- `pnpm run dev`: starts the service with the variables of `.env` (see `src/env.ts`).
- `pnpm run typecheck`, `pnpm run build`.
- `pnpm test`: the unit tests and the integration tests. The integration tests start a PostgreSQL container (Docker must run), and connect real WebSocket clients to a relay service with a local key set of the app.
