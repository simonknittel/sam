# Infrastructure

This package holds the shared implementations of the ports of the use cases. The ports are the fields of `ApplicationContext` in [`application/src/context.ts`](../application/src/context.ts). Each host composes the implementations in its composition root: the Next.js app in `apps/app/src/modules/application`, the Lambda functions in `apps/lambda/src/common/createApplicationContext.ts`.

## Exports

| Export                                 | Port                                                                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `createPrismaAuditWriter`              | `audit`                                                                                                                                   |
| `createEventBridgeNotificationTrigger` | `notifications`                                                                                                                           |
| `createEventBridgeEmailRequester`      | `email`: one `EmailRequested` event for the email function                                                                                |
| `createEventBridgeEmitter`             | none: it sends the events of the trigger and the other events of the hosts                                                                |
| `createEventBridgeClient`              | none: the client of the emitter, with timeouts                                                                                            |
| `createDiscordGateway`                 | `discord`                                                                                                                                 |
| `createCollabClient`                   | `collab`                                                                                                                                  |
| `createS3Storage`                      | `storage`: [`FileStorage`](../application/src/ports/storage.ts)                                                                           |
| `createS3Client`                       | none: the client of the storage, with timeouts, for an R2 account or an explicit endpoint                                                 |
| `createClientMetadataFetcher`          | `clientMetadata`: [`ClientMetadataFetcher`](../application/src/ports/clientMetadata.ts)                                                   |
| `createPusherRealtimeServer`           | `realtime`: the termination of the connections of a user, the events to the private channel of a citizen                                  |
| `createPusherClient`                   | none: the client of the realtime server (Pusher Channels or Soketi), with a timeout. The app also signs the subscriptions with it.        |
| `createRelayClient`                    | `relay`: the internal endpoints of the relay service of the Remote Control Program                                                        |
| `verifyRelayInternalRequestToken`      | none: the check of the tokens of the internal endpoints, for the relay service (with `RELAY_INTERNAL_PATHS` and `RelayInternalOperation`) |

## Rules

- **No host imports.** Never import a host package (for example `@sam-monorepo/app`), a module of the app (`@/…`), `@sam-monorepo/mcp`, `next`, `next/*`, `react`, `react-dom` or `server-only`. The test `src/boundaries.test.ts` fails on such an import. The package can import `@sam-monorepo/application` (for the port types), `@sam-monorepo/domain` (for the types and the names of the realtime channels), `@sam-monorepo/wiki-editor` (only the types of the collab tokens; the tests also use its parsers) and `@sam-monorepo/database`.
- **Options from the host.** A factory gets each service and each value from its options, for example the Prisma client, the logger and the ARN of the event bus. The package reads no environment variables.
- **One behavior for all hosts.** When two hosts need a different behavior, the host wraps the implementation. Example: the app wraps the EventBridge emitter in a trace span, and the Lambda functions use it as it is.
