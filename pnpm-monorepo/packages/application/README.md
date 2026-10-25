# Application

This package holds the use cases of SAM. A use case is one read or one write of a feature. The Next.js app, the MCP server and the Lambda functions call the same use cases. The package does not know Next.js, React or the MCP transport.

## Use cases

Each use case has this signature:

```ts
(context: ApplicationContext, actor: Actor, input: Input) => Promise<Output>;
```

- `context` gives the services of the app that runs the use case (the ports, `src/context.ts`): `prisma`, `audit`, `notifications`, `email`, `log`, `tracer`, `now`, `changelog`, `collab`, `realtime`, `discord`, `storage`, `images`, `urls`, `signingKey` and `allowInsecureLoopbackClientIds`. `changelog`, `collab`, `realtime`, `discord`, `storage` and `images` can be null. A use case that needs `changelog`, `collab` or the copy, a presigned URL or the list of `storage` then throws a `ConflictError`. A background step without `storage` or `images` skips with a warning. A null `discord` behaves like a Discord that cannot be reached: the result of the Discord step is Failed. The port `collab` has three calls: `replaceContent` replaces the content of a wiki page through the collab server, `createSessionToken` signs the short-lived token of one editor connection, and `disconnectUser` closes all editor connections of a user. The port `realtime` ends the realtime connections of a user; without it, `banUser` skips this step. The types of the ports `storage`, `email`, `images` and `changelog` are in `src/ports/` ([`FileStorage`](src/ports/storage.ts), [`EmailRequester`](src/ports/email.ts), [`ImageReader`](src/ports/images.ts) and [`ChangelogSource`](src/ports/changelog.ts)). Their doc comments describe the calls. The shared implementations of the ports are in [`packages/infrastructure`](../infrastructure/README.md).
- `actor` is the user for whom the use case runs (`src/actor.ts`). The Next.js app builds it from the session, the MCP server from the access token.
- A use case without a user, for example the public token endpoint of the OAuth server, takes `(context, input)`.
- The use cases of a feature live in `src/<feature>/` with a barrel `index.ts` that the package index re-exports.

Obey these rules:

- **One schema.** Export the Zod input schema next to the use case. The caller parses the input with this schema: the server action parses its `FormData`, the MCP tool shows the schema to the client. The use case does not parse the input again.
- **Plain output.** Give each use case an explicit output type. Never return a Prisma row: select the fields and map them to the output type. A write gives the object after the write, in the shape of the read of the same object. Give the bare object, and `{ <object>, notifications_sent }` only when the write sends notifications (see "Side effects").
- **App-only options.** An option that only the app can give (for example an upload, a template or the Discord sync of the events: `CreateEventOptions`, `UpdateEventOptions`, `DeleteEventOptions`, and `PageOptions` of the lists; the keys of the visible apps of `toggleAppFavorite`: `ToggleAppFavoriteOptions`; the kill switch of the log analyzer sharing: `LogAnalyzerSharingOptions`) is a fourth parameter, not a field of the input schema. The MCP tools call the use case without it.
- **Key case.** The input schemas and the outputs that the MCP tools use have lowercase snake_case keys. The outputs that only the app uses have camelCase keys.
- **Shared schemas.** Take the page size, the cursor and the ids from `src/pagination.ts` (`pageLimitSchema`, `cursorSchema`, `idSchema`), and the times from `src/dateTime.ts` (`dateTimeInputSchema`: an ISO 8601 instant, or a wall time in the time zone of the organization, which the forms of the app send). Take the limits that the forms of the app also need (lengths, caps) from the `domain` package. A list that sorts in memory pages with `paginateByCursor()`, which refuses an unknown cursor with a `ValidationError`. A list that the database sorts pages with `paginateByDatabaseCursor()`, with the id of a row as the cursor. It checks that the cursor exists in the same way as `paginateByCursor()`. A list that the app pages in both directions takes a `PageOptions` parameter, not fields in its input schema: the direction, and `UnknownCursorBehavior.FirstPage` for the stale cursors in the URLs of the app.
- **Typed errors.** Throw the errors of `src/errors.ts`: `ForbiddenError`, `NotFoundError`, `ConflictError` and `ValidationError`. Write a short English message. Do not use translated strings: each app maps the errors to its own response. When an app shows its own text for a message, the message is a member of a message enum of the feature (for example `EventErrorMessage`, `LineupErrorMessage`, `TaskErrorMessage`), thrown through the base classes. The Next.js app maps the errors with `mapApplicationErrorToActionResponse()` and a record of texts by message; a not-found error and a conflict refresh the page. A write whose record can go away after the read (the Prisma error P2025) runs in `rethrowRecordNotFound()`, which throws a `NotFoundError` with the message of the feature. A write that can break a unique constraint (the Prisma error P2002) runs in `rethrowUniqueConstraintFailed()`, which throws a `ValidationError` with the message of the feature.
- **Permissions in the use case.** The caller does the gate of the app (`actor.requireClearance()`). The use case checks the permissions of its operation with `requirePermission(actor, resource, operation, attributes)`, or with `actor.authorize()` when the result changes the output.
- **Side effects in the use case.** Write the audit events with `context.audit.create()`. Send the notifications after the save with `triggerNotificationsAfterSave()` (`src/notifications.ts`): a failure does not make the result an error, the output gives `notifications_sent: false` instead, and the caller shows a warning. Use `context.now()` for the current time.
- **No framework imports.** Never import `next`, `next/*`, `react`, `react-dom`, `server-only` or a module of the app (`@/…`). The test `src/boundaries.test.ts` fails on such an import.
- **No React `cache()`.** The app wraps a read use case with `cache()` where a page needs the deduplication per request.
- **Spans.** Use `withSpan(context, name, callback)` for async work that is slow or that has many steps.
- **Automations.** A job of a Lambda function is a use case with the signature `(context)`. It reads the clock with `context.now()`, thus a test sets the time through the test context. The output holds the counts for the log of the host. The audit events have `createdById: null`. The automation lives in the folder of its feature (for example `roles/removeExpiredRoleAssignments.ts`, `silc/disburseRoleSalaries.ts`, `profitDistribution/endDueCollectionPhases.ts`, `greetings/sendBirthdayGreetings.ts`, `greetings/sendNewYearGreetings.ts`, `fleet/countShips.ts`, `notifications/archiveIrrelevantOnSiteNotifications.ts` and `uploads/deleteUnusedUploads.ts`).

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

## File layout

```
src/
  actor.ts                 Actor, createActor(), requirePermission(), requireCitizen(), satisfiesAnyPermissionString()
  context.ts               ApplicationContext, its ports and createApplicationUrls()
  ports/                   the types of the ports storage, email, images and changelog
  errors.ts                the typed errors, rethrowRecordNotFound() and rethrowUniqueConstraintFailed()
  pagination.ts            the shared page size, cursor and id schemas, paginateByCursor(), paginateByDatabaseCursor()
  dateTime.ts              the shared date-time input schema
  notifications.ts         triggerNotificationsAfterSave()
  optOutChanges.ts         the changes of a save of opt-out settings
  mcpAccess.ts             the permission that gates the MCP server
  citizenReference.ts      the citizen in the outputs
  activitySources.ts       the shared input and filter of the sources of the activity tables
  withSpan.ts              the span helper
  auth/                    the effective roles of a citizen (the session and the MCP principal), the clearance filter of the receivers, the sessions, the email confirmation and the admin toolbar
  oauth/                   the use cases of the OAuth authorization server
  <feature>/<useCase>.ts   one use case per file, with its input schema and its output type
  <feature>/index.ts       the barrel of the feature
  index.ts                 the exports of the package: the barrels and the shared modules
```

## Exceptions

These exports are not use cases. No MCP tool calls them:

- The `find…` row helpers (for example `findEventListPage`, `findEventOptions`, `findResolvedEventParticipants`, `findOwnEventParticipation`, `findEventActivityRows`, `findAddableEventParticipantIds`, `findEventPositionTree`, `findEventLineupCitizens`, `findEventTemplateDetails`, `findEventTemplatePositionTree`, `findVisibleTask`, `findManagedRole`, `findRoleTableRows`, `findSpynetCitizen`, `findNoteTablePage`, `findUserListPage`, `findSilcTransactionTablePage`, `findRoleSalaryRows`, `findProfitDistributionCycleDetails` and `findOwnOpenTaskRows`) give rows only to the renderers of the app.
- `findAllRoleBadges` has no permission check. Its callers check the permission.
- `getAuecConversionRate` takes no actor and checks no permission: the conversion rate is not personal.
- `filterLeaderboardMembers` takes the ranks of the leaderboard of the Roberts Space Industries website as host data (the interface `LeaderboardRank`, no schema). The host reads and validates the ranks.
- `linkCitizenOfSignedInUser` and `hasBirthdayTodaySafely` (the Spynet) are helpers for the auth zone. They carry no permission check: the caller checks it.
- The wiki scope entry points (`buildWikiContext`, `buildBriefingWikiContext`, `buildVariantWikiContext` and `findReadableWikiScope`) take `(context, actor, …)`, but they are not use cases: they give the scope or null, and the caller gives its own not-found answer. `toWikiScopeTarget` turns the scope input of the tRPC procedures (`wikiScopeInputSchema`) into the target of `findReadableWikiScope`. Inside the package, the use cases load the scope of a page with `requireWikiPageOfScope()`, which throws the not-found and the forbidden answers itself. The scope kinds (`WikiScopeKind`), the routes of the wiki pages (`GLOBAL_WIKI_BASE_PATH`, `getBriefingPath`, `getVariantWikiRootPath` and `getVariantWikiBasePath`) and the bases of their hrefs (`GLOBAL_WIKI_HREF_BASE`, `createBriefingWikiHrefBase` and `createVariantWikiHrefBase`) are in `domain`, because the client components of the app use them too.
- The wiki `find…` helpers (`findWikiPageDetails`, `findWikiPageReportRows`, `findWikiPageReport`, `countOpenWikiReports`, `findWikiRoleCitizens`, `findWikiLinkablePages`, `findWikiPageIndex`, `findOwnWikiFavoritePageIds`, `findOwnRecentWikiPageIds`, `findWikiScopeTags` and `findWikiSearchResults`) give rows only to the pages, the tRPC procedures and the routes of the app. Their citizens have one shape, `WikiCitizen`.
- `findWikiPermissionRoles`, `findWikiSettings` and `findWikiPageLinkTarget` take no actor and check no permission. The callers check it.
- `findWikiPageContent`, `findWikiPageOwner`, `findWikiPageTags`, `findWikiPageSnapshotRows` and `findWikiTagPages` are scope helpers. They take a wiki scope that the caller loaded for the same actor (the scope entry points above). They check the access in this scope themselves: a check of the read tier (`findWikiPageContent`, `findWikiPageOwner` and `findWikiPageTags`) or of the admin tier (`findWikiPageSnapshotRows`) that throws a `NotFoundError`, or a filter that leaves out the pages that the actor cannot read (`findWikiTagPages`). `getAccessibleWikiPage(scope, pageId, tier)` is a pure scope helper: it gives the page of the scope when the actor has the access tier on it, else null.
- `listOrganizationMembershipsOfCitizen(context, actor, citizenId)` takes the id of the citizen, not an input object: the profile tile of the app and `getCitizen` give the id of a citizen that they loaded. It checks `organizationMembership;read`.
- The pure rule and mapping helpers take no context and read no database: the pages and the components of the app apply them to the rows that a use case or a `find…` helper gave. They are `isAllowedToManageEvent`, `isAllowedToManagePositions`, `isLineupVisible`, `isEventUpdatable`, `toEventViewer`, `buildVisibleEventsWhere`, `resolveEventVisibility`, `toEventVisibilityType`, `isAllowedToManageTask`, `isTaskUpdatable`, `toTaskListRow`, `toTaskRewardKind`, `toTaskVisibilityKind`, `canSeeAnyRole`, `canUseMcp`, `getNotePermissionAttributes`, `toEventTemplateViewer`, `getQuarterOfDate` and `filterCreatableClassificationLevels` (the classification levels for which the actor can create a note of a note type; the caller gives the levels of `findClassificationLevels`).
- The `find…` helpers of the fleet, the Spynet settings, the organizations and the career flows give rows only to the renderers of the app. Each one checks the permission of its read, or gives an empty answer without it. They are: the management reads of the fleet catalog (`findManagedManufacturer`, `findManagedSeriesWithManufacturer`, `findManufacturerSeriesRows`, `findSeriesVariantRows` and `findManagedVariant`), the variant page reads (`findVariantDetail`, `findVariantBacklinks` and `findVariantShipPage`), the ship change page (`findShipChangePage`), the tag rows of the fleet filters (`findOrgFleetVariantTags`, `findOwnFleetVariantTags` and `findCitizenFleetVariantTags`), the actors of the Spynet activity (`findSpynetActivityActors`), the organization activity rows (`findOrganizationCreatedRows`, `findOrganizationRenamedRows` and `findOrganizationMembershipRows`) and the career reads `findReadableFlowDiagram`, `findManageableFlows` and `findManageableFlow`.
- `findManufacturerRows`, `findVariantCatalog`, `findVariantLinkOptions`, `findNoteTypes` and `findClassificationLevels` take no actor and check no permission: the catalog of the fleet and the note classifications are not secret, and their callers have different gates.
- `loadFlowContext` is the scope entry point of the career flows. It takes `(context, actor)`, checks no permission and gives all flows with the effective permissions of the actor. `listReadableFlows` is a pure function of this context. The career reads of the app derive from it.
- `canViewVariantPages` and `canSearchShipVariants` are boolean checks for the pages and the tiles of the app, not reads.
- `createOrganization` takes the logo lookup of the host as its app-only option `findLogo` (`CreateOrganizationOptions`): the Next.js app reads the website of Roberts Space Industries.
- `canAccessEventTemplates` and `canReadEventBriefing` are boolean checks for the pages and the tiles of the app, not reads. `canReadEventBriefing(context, actor, event)` takes a row of the event list, and its caller has checked `event;read`.
- `validateWikiIframeSrc` ignores the actor: the allowlist of the iframe hosts is not personal. The caller checks the clearance.
- `findPublishableDiscordChannels` takes no actor and checks no permission. The callers check it. It gives null when Discord cannot be reached.
- The `find…`, `count…` and `list…Own…` helpers of the uploads, the notifications, the settings, the log analyzer and the shell (`findUploadTablePage`, `findUploadAuthorOptions`, `listOwnOnSiteNotifications`, `countOwnUnreadOnSiteNotifications`, `countOwnWebPushSubscriptions`, `findOwnNotificationSettings`, `findOwnSeasonalThemeSettings`, `findOwnAppFavoriteKeys`, `findOwnLogAnalyzerEntryHashes`, `findSharedLogAnalyzerEntries`, `findOnboardingState`, `findNewItemIds` and `countNewItemsBySubject`) give rows only to the renderers of the app.
- The ten statistics helpers (`findCitizenCreationRows`, `findDailyLoginCountRows`, `findDailyMcpUsageCountRows`, `findEventStartTimes`, `findOrganizationCreationRows`, `findPositiveSilcTransactionRows`, `findRoleCitizenCountRows`, `findTotalShipCountRows`, `findUserRegistrationRows` and `findVariantShipCountRows`) check `globalStatistics;read` and give plain rows. The charts of the app build the series from them.
- `findNewItemIds` checks no permission: the caller has applied the visibility and the read permission to the ids. It gives an empty list for an actor without a citizen.
- `authorizeRealtimeChannel` is the check of the Pusher route of the app: it decides whether the actor can subscribe to a private realtime channel. The host signs the subscription after the check.
- `publishEventToDiscord` and `unpublishEventFromDiscord` are for the app only: their output `DiscordSyncResult` tells which Discord step failed. `createEvent`, `updateEvent` and `deleteEvent` give such a result in the optional output field `discord`, only when the caller gives their app-only option. Without the option the key does not exist, because the MCP tools parse the output with a strict schema.

These use cases run without an actor. No MCP tool calls them:

- The admin toolbar (`startAssumingUser`, `stopAssumingUser` and `listAssumableUsers`) takes the id of the admin as input. During an assume, the actor is the assumed user, thus the host keeps the admin gate. A different host must not call them without a check of its own.
- The development login (`findDevelopmentLoginUser`, `listDevelopmentLoginUsers` and `enableDevelopmentLoginTwoFactor`) and `findSessionIdByToken` run without a session. The host checks the environment and reads the cookie.
- `confirmEmailWithToken` is public: the token is the proof.
- The Human Resources reads of the clearance page (`getHumanResourcesRoleIds` and `listHumanResourcesContacts`) run for users who have no clearance yet.
- The recipient rules (`notifications/recipients`) and the delivery store (`notifications/delivery`) belong to the notification router of the Lambda functions. A recipient rule is the check of the receivers of one notification type, and the store writes the on-site rows and reads and prunes the web push subscriptions. The transports (the realtime channel, the push service) and the wording are in the Lambda function.
- `sendEmailConfirmation` sends the confirmation email without an actor: the sign-in calls it for a user that it just created, before the first session. It writes no audit event and never throws. `requestEmailConfirmation` calls it for the actor and writes the audit event.
- `findSeasonalTheme` and `isWelcomeDayOfCitizen` take the citizen id from the host (`findSeasonalTheme` accepts null for a viewer without a citizen). `isWelcomeDayOfCitizen` never throws.
- `probeUploadImageDimensions` runs after the response of an upload (the host schedules it): it reads the first bytes of the object and saves the dimensions and the size of the object.

## Tests

Write unit tests (Vitest, `*.test.ts` next to the file) only for complex or critical logic. Test the behavior through the end-to-end tests of the apps.

The integration tests (`*.integration.test.ts`) run against a Postgres testcontainer (`test/postgres.ts`, Docker must run). The package also holds the helper that empties the database (`test/database.ts`) and the helper that makes two sessions wait for the same locks (`test/locks.ts`). The test factory of the context (`createTestApplicationContext()` in `test/applicationContext.ts`) records the audit events, the notifications and the email requests. `createTestStorage()` (`test/storage.ts`) gives an object storage that lists its objects and records the deletes. `test/citizensWithPermissions.ts` gives citizens with permission strings for the tests of the recipient rules. All integration tests of the automations are in this package (for the tests of the Lambda functions, see [Inside the Lambda functions](../../../docs/architecture.md#inside-the-lambda-functions)).

## Add a feature

1. Add `src/<feature>/<useCase>.ts` with the input schema, the output type and the use case. Export them from the barrel `src/<feature>/index.ts`. The package index re-exports the barrel.
2. Next.js app: the composition root is `apps/app/src/modules/application`. A server action parses the `FormData` with the schema, calls the use case with `getApplicationContext()` and `await toActor(authentication.session)`, keeps its `refresh()`, and maps the errors with `mapApplicationErrorToActionResponse()` and the texts of the feature. An action of the standard shape (one use case call, the error mapping, one unconditional `refresh()`, and the success text or a redirect) uses `createUseCaseAction()` of the composition root. Pages and queries get the actor with `getRequestActor()` and map the errors with `throwApplicationErrorForPage()`. tRPC procedures call the read use cases with `toActor(ctx.session)`.
3. MCP server: add a tool that shows the input schema and calls the use case.
