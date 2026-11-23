# Application

This package holds the use cases of SAM. A use case is one read or one write of a feature. The Next.js app, the MCP server and the Lambda functions call the same use cases. The package does not know Next.js, React or the MCP transport.

## Use cases

Each use case has this signature:

```ts
(context: ApplicationContext, actor: Actor, input: Input) => Promise<Output>;
```

- `context` gives the services of the app that runs the use case: the ports of [`src/context.ts`](src/context.ts) and [`src/ports/`](src/ports). Their doc comments describe the calls and the meaning of a null port. A use case that needs a null `changelog` or `collab` throws a `ConflictError`. The shared implementations of the ports are in [`packages/infrastructure`](../infrastructure/README.md).
- `actor` is the user for whom the use case runs (`src/actor.ts`). The Next.js app builds it from the session, the MCP server from the access token.
- A use case without a user, for example the public token endpoint of the OAuth server, takes `(context, input)`.
- The use cases of a feature live in `src/<feature>/` with a barrel `index.ts` that the package index re-exports.

Obey these rules:

- **One schema.** Export the Zod input schema next to the use case. The caller parses the input with this schema: the server action parses its `FormData`, the MCP tool shows the schema to the client. The use case does not parse the input again.
- **Plain output.** Give each use case an explicit output type. Never return a Prisma row: select the fields and map them to the output type. A row helper (see [Exceptions](#exceptions)) names its columns with `select` and does not use `include`, because `include` loads all columns of the model. A write gives the object after the write, in the shape of the read of the same object. Give the bare object, and an object with more keys only when the write gives more than the object (for example the changes or the result of the Discord sync).
- **App-only options.** An option that only the app can give (for example an upload, the Discord sync of the events or the `PageOptions` of the lists) is a fourth parameter, not a field of the input schema. The MCP tools call the use case without it. An output key that only such an option fills does not exist without the option, because the MCP tools parse the output with a strict schema.
- **Key case.** The input schemas and the outputs that the MCP tools use have lowercase snake_case keys. The outputs that only the app uses have camelCase keys.
- **Shared schemas.** Take the page size, the cursor and the ids from `src/pagination.ts` (`pageLimitSchema`, `cursorSchema`, `idSchema`), and the times from `src/dateTime.ts` (`dateTimeInputSchema`: an ISO 8601 instant, or a wall time in the time zone of the organization, which the forms of the app send). Take the limits that the forms of the app also need (lengths, caps) from the `domain` package. A list that sorts in memory pages with `paginateByCursor()`, which refuses an unknown cursor with a `ValidationError`. A list that the database sorts pages with `paginateByDatabaseCursor()`, with the id of a row as the cursor. It checks that the cursor exists in the same way as `paginateByCursor()`. A list that the app pages in both directions takes a `PageOptions` parameter, not fields in its input schema: the direction, and `UnknownCursorBehavior.FirstPage` for the stale cursors in the URLs of the app.
- **Typed errors.** Throw the errors of `src/errors.ts`: `ForbiddenError`, `NotFoundError`, `ConflictError` and `ValidationError`. Write a short English message. Do not use translated strings: each app maps the errors to its own response. When an app shows its own text for a message, the message is a member of a message enum of the feature (for example `EventErrorMessage`, `LineupErrorMessage`, `TaskErrorMessage`), thrown through the base classes. The Next.js app maps the errors with `mapApplicationErrorToActionResponse()` and a record of texts by message; a not-found error and a conflict refresh the page. A write whose record can go away after the read (the Prisma error P2025) runs in `rethrowRecordNotFound()`, which throws a `NotFoundError` with the message of the feature. A write that can break a unique constraint (the Prisma error P2002) runs in `rethrowUniqueConstraintFailed()`, which throws a `ValidationError` with the message of the feature.
- **Permissions in the use case.** The caller does the gate of the app (`actor.requireClearance()`). The use case checks the permissions of its operation with `requirePermission(actor, resource, operation, attributes)`, or with `actor.authorize()` when the result changes the output.
- **Side effects in the use case.** Write the audit events with `context.audit.create()`. Send the notifications after the save with `triggerNotificationsAfterSave()` (`src/notifications.ts`): a failure does not make the result an error, and the output does not report it. The Next.js app writes the audit events and sends the notifications after its response (`after()`), thus a use case must not read its own audit events. Use `context.now()` for the current time.
- **No framework imports.** Never import `next`, `next/*`, `react`, `react-dom`, `server-only` or a module of the app (`@/…`). The test `src/boundaries.test.ts` fails on such an import.
- **No React `cache()`.** The app wraps a read use case with `cache()` where a page needs the deduplication per request.
- **Spans.** Use `withSpan(context, name, callback)` for async work that is slow or that has many steps.
- **Automations.** A job of a Lambda function is a use case with the signature `(context)`. It reads the clock with `context.now()`, thus a test sets the time through the test context. The output holds the counts for the log of the host. The audit events have `createdById: null`. A count of a day keeps the first run: a run that repeats in the same night saves nothing. The automation lives in the folder of its feature.

Example:

```ts
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";

export const renameShipInputSchema = z.object({
  ship_id: idSchema,
  name: z.string().trim().max(255).describe("An empty name removes the name."),
});

export interface RenameShipOutput {
  readonly id: string;
  readonly name: string;
}

export const renameShip = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof renameShipInputSchema>,
): Promise<RenameShipOutput> => {
  requirePermission(actor, "ship", "manage");
  // Load the ship, throw a NotFoundError when it is missing, update it,
  // write the audit event, and return the output type.
};
```

## Exceptions

- **Row helpers** (`find…` and `count…`) give rows only to the renderers of the app. They have no input schema and no output type, and no MCP tool calls them. When a row helper checks no permission, its doc comment says so, and the caller checks it.
- **Scopes of the wiki and of the career flows.** A scope entry point (`build…WikiContext`, `findReadableWikiScope` and `loadFlowContext`) gives a scope or null, and the caller gives its own not-found answer. A scope helper takes a scope that the caller loaded for the same actor. Inside the package, the use cases load the scope of a page with `requireWikiPageOfScope()`, which throws the errors itself.
- **Rules** (`is…`, `to…` and `can…`) are pure functions or boolean checks, not reads. The app applies them to rows, the MCP tools use them for the visibility of a tool.
- **Use cases without an actor.** The admin toolbar, the development login, `findSessionIdByToken`, `confirmEmailWithToken`, `sendEmailConfirmation`, the Human Resources reads of the clearance page, `findSeasonalTheme`, `isWelcomeDayOfCitizen`, the recipient rules and the delivery store of the notifications, and the use cases of the relay service that run before a runtime has an actor or for a delivery (`authenticateRuntimeConnection`, `loadReadAccessToOwner` and `findWatchingViewers`). They check no permission, or a token is the proof. A host must not call them without a check of its own. During an assume, the actor is the assumed user, thus the use cases of the admin toolbar take the id of the admin as input, and the host keeps the admin gate.

## Tests

Write unit tests (Vitest, `*.test.ts` next to the file) only for complex or critical logic. Test the behavior through the end-to-end tests of the apps.

The integration tests (`*.integration.test.ts`) run against a Postgres testcontainer (`test/postgres.ts`, Docker must run). The package also holds the helper that empties the database (`test/database.ts`) and the helper that makes two sessions wait for the same locks (`test/locks.ts`). The test factory of the context (`createTestApplicationContext()` in `test/applicationContext.ts`) records the audit events, the notifications and the email requests. `createTestStorage()` (`test/storage.ts`) gives an object storage that lists its objects and records the deletes. `test/citizensWithPermissions.ts` gives citizens with permission strings for the tests of the recipient rules. All integration tests of the automations are in this package (for the tests of the Lambda functions, see [Inside the Lambda functions](../../../docs/architecture.md#inside-the-lambda-functions)).

## Add a feature

1. Add `src/<feature>/<useCase>.ts` with the input schema, the output type and the use case. Export them from the barrel `src/<feature>/index.ts`. The package index re-exports the barrel.
2. Next.js app: the composition root is `apps/app/src/modules/application`. A server action parses the `FormData` with the schema, calls the use case with `getApplicationContext()` and `await toActor(authentication.session)`, keeps its `refresh()`, and maps the errors with `mapApplicationErrorToActionResponse()` and the texts of the feature. An action of the standard shape uses `createUseCaseAction()` of the composition root. Pages and queries get the actor with `getRequestActor()` and map the errors with `throwApplicationErrorForPage()`. tRPC procedures call the read use cases with `toActor(ctx.session)`.
3. MCP server: add a tool that shows the input schema and calls the use case.
