# Aufstellungen (Lineups) as a standalone app

## Goal

Decouple lineups from events so they become a first-class entity of their own. A new app at `/app/lineups` lets users manage reusable lineup templates and create ad-hoc lineups on the fly, sharing both with individual citizens and roles. Events keep their lineup tab unchanged for end users, but an event lineup is now just a `Lineup` row that happens to be attached to an event.

## Decision log

- **Unified data model.** `Lineup` + `LineupPosition` replace `EventPosition`. Templates, ad-hoc lineups and event lineups are all rows in `Lineup`, distinguished by `kind` and by whether `eventId` is set. One rendering/editing code path instead of two or three parallel families of models and components.
- **`Lineup.kind = TEMPLATE | LINEUP`.** Templates hold structure only (names, descriptions, colors, required variants, required roles, nesting). They never have participants, assignments or applications; the UI hides those affordances. Lineups have all of it.
- **FK lives on `Lineup`, not on `Event`.** `Lineup.eventId String? @unique` with `onDelete: Cascade`, instead of the `Event.lineupId` sketched during planning. This gives cascade delete for free (deleting an event deletes its lineup) and makes the authorization rule literally readable as `lineup.eventId !== null`.
- **Event lineups are created lazily.** No `Lineup` row exists for an event until its first position is created or its lineup is published. `event.lineup === null` therefore means "this event has no lineup yet", which is exactly the precondition the attach flow needs. A single `getOrCreateEventLineup()` helper (upsert on the unique `eventId`) is used by every write path.
- **Templates are applied by cloning, never linked.** Editing a template afterwards does not touch lineups created from it. Consistent with today's `copyLineupFromEvent`.
- **Authorization is split by ownership.** A lineup with an `eventId` uses today's event rules unchanged (`isAllowedToManagePositions()` to edit, `published || canManage` to view, past events not editable). A lineup without an `eventId` uses its own ACL. One façade, `getLineupAccess()`, resolves both.
- **ACL: owner + citizen grants + role grants + "für alle sichtbar".** Grants are `READ` or `EDIT`. Identical for templates and lineups. `lineup;manage` / `lineupTemplate;manage` override the ACL entirely.
- **Explicit participant list on standalone lineups.** Assignment, the "keinem Posten zugeordnet" hint and the ship requirement check all work off that list, mirroring how event lineups use Discord participants today. Participants can read the lineup once it is published.
- **Publishing is unified on `Lineup.published`; `Event.lineupEnabled` is removed.** One flag with one meaning for both kinds. Publishing an event lineup keeps triggering the existing `EventLineupEnabled` push; publishing a standalone lineup triggers a new `LineupPublished` push to its participants.
- **Separate permission resources for templates and lineups:** `lineup;read|create|manage` and `lineupTemplate;read|create|manage`. `othersEventPosition;manage` keeps governing event lineups and is not touched.
- **Read access on the source is enough to copy out of it.** Applying a template, duplicating a lineup and pasting a position all require read on the source and manage on the target. This relaxes today's `pasteEventPosition()`, which demands manage rights on the source event.
- **Event lineups are read-only inside the new app.** They are listed so they can be reused (save as template, duplicate, copy positions out of them) and they link back to `/app/events/[id]/lineup`, where editing happens as before. `/app/lineups/[id]` redirects to the event page when the lineup belongs to an event.
- **Attaching a standalone lineup to an event moves it.** Positions and assignments come along; the lineup's own participant list, ACL and owner are discarded in favour of the event's rules. Blocked when the event already has a lineup. Requires manage rights on both sides. There is no detach.
- **One-shot database migration.** A single Prisma migration renames the three position tables, creates the new ones and backfills lineups for existing events. Hand-written SQL goes into the generated migration file.
- **Existing lineup UX carries over untouched:** drag & drop reordering, 4-level nesting limit, 50-positions-per-level limit, cross-lineup clipboard, copy/paste/duplicate of positions, colors and font sizes, per-position required ships and roles, requirement checking against owned ships.

### Out of scope

- Scheduled date/time on standalone lineups. They are named, described and listed by creation date only.
- Applications ("Bewerben") on standalone lineups. The `LineupPositionApplication` model and UI stay, but only event lineups expose the apply button.
- A fleet overview for standalone lineups. The "Flotte" tab stays event-only.
- Detaching an event lineup back into a standalone lineup.
- Live-linked templates, template versioning, or "update lineup from template".
- Export/download of standalone lineups.
- Migrating past events without positions into `Lineup` rows.

## Overall implementation notes

### Target schema

```prisma
enum LineupKind {
  TEMPLATE
  LINEUP
}

enum LineupAccessLevel {
  READ
  EDIT
}

model Lineup {
  id            String                @id @default(cuid())
  kind          LineupKind
  /// NULL for event lineups, which display the name of their event instead.
  name          String?
  description   String?
  published     Boolean               @default(false)
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt
  /// NULL for event lineups and for lineups whose owner was deleted. The
  /// latter are only reachable via `lineup;manage`.
  ownerId       String?
  owner         Entity?               @relation("lineupOwner", fields: [ownerId], references: [id], onDelete: SetNull)
  /// Grants READ to everyone holding `lineup;read` / `lineupTemplate;read`.
  visibleToAll  Boolean               @default(false)
  /// Set for event lineups only. Templates must never have one.
  eventId       String?               @unique
  event         Event?                @relation(fields: [eventId], references: [id], onDelete: Cascade)
  positions     LineupPosition[]
  participants  LineupParticipant[]
  citizenAccess LineupCitizenAccess[]
  roleAccess    LineupRoleAccess[]

  @@index([kind, ownerId])
}

model LineupPosition {
  id               String                          @id @default(cuid())
  lineupId         String
  lineup           Lineup                          @relation(fields: [lineupId], references: [id], onDelete: Cascade)
  name             String
  description      String?
  requiredVariants LineupPositionRequiredVariant[]
  requiredRoles    Role[]
  applications     LineupPositionApplication[]     @relation("applications")
  citizenId        String?
  citizen          Entity?                         @relation("citizen", fields: [citizenId], references: [id], onDelete: SetNull)
  parentPositionId String?
  parentPosition   LineupPosition?                 @relation("parentPosition", fields: [parentPositionId], references: [id], onDelete: Cascade)
  childPositions   LineupPosition[]                @relation("parentPosition")
  order            Int                             @default(0)
  fontSize         String?
  backgroundColor  String?
  textColor        String?

  @@index([lineupId])
}

model LineupParticipant {
  id        String   @id @default(cuid())
  lineupId  String
  lineup    Lineup   @relation(fields: [lineupId], references: [id], onDelete: Cascade)
  citizenId String
  citizen   Entity   @relation(fields: [citizenId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([lineupId, citizenId])
  @@index([citizenId])
}

model LineupCitizenAccess {
  id        String            @id @default(cuid())
  lineupId  String
  lineup    Lineup            @relation(fields: [lineupId], references: [id], onDelete: Cascade)
  citizenId String
  citizen   Entity            @relation(fields: [citizenId], references: [id], onDelete: Cascade)
  level     LineupAccessLevel
  createdAt DateTime          @default(now())

  @@unique([lineupId, citizenId])
  @@index([citizenId])
}

model LineupRoleAccess {
  id        String            @id @default(cuid())
  lineupId  String
  lineup    Lineup            @relation(fields: [lineupId], references: [id], onDelete: Cascade)
  roleId    String
  role      Role              @relation(fields: [roleId], references: [id], onDelete: Cascade)
  level     LineupAccessLevel
  createdAt DateTime          @default(now())

  @@unique([lineupId, roleId])
}
```

`EventPositionRequiredVariant` and `EventPositionApplication` are renamed to `LineupPositionRequiredVariant` and `LineupPositionApplication` with their `positionId` FKs repointed. `Event.lineupEnabled` and `Event.positions` are removed; `Event` gains `lineup Lineup?` as the back-relation. `Role.eventPositions` becomes `Role.lineupPositions`; `Entity` gains `ownedLineups`, `lineupParticipations` and `lineupAccess` back-relations.

Two invariants Prisma cannot express, enforced in application code: a `TEMPLATE` never has an `eventId`, participants or assignments; an event lineup never has an owner or ACL rows.

### Authorization façade

Everything server-side goes through one module, `modules/lineups/utils/getLineupAccess.ts`:

```ts
interface LineupAccess {
  canRead: boolean;
  /// Create, update, delete, reorder positions; manage participants
  canManage: boolean;
  /// Manage the ACL and the publish flag. Owner-only for standalone lineups.
  canAdminister: boolean;
  isParticipant: boolean;
}
```

Resolution rules:

- **Event lineup** (`eventId !== null`): `canRead = (await authorize("event", "read")) && (published || canManage)`. `canManage = isAllowedToManagePositions(event) && isEventUpdatable(event)`. `canAdminister = canManage`. `isParticipant` comes from `EventDiscordParticipant`. Identical to today's behaviour.
- **Standalone lineup / template**: `canManage = isOwner || citizenAccess EDIT || roleAccess EDIT || authorize(resource, "manage")`. `canRead = canManage || citizenAccess READ || roleAccess READ || (visibleToAll && authorize(resource, "read")) || (published && isParticipant)`. `canAdminister = isOwner || authorize(resource, "manage")`. `resource` is `lineup` or `lineupTemplate` depending on `kind`.

Where `isEventUpdatable()` is folded into `canManage`, a past event's lineup becomes read-only exactly as it is today.

### Module layout

Everything lineup-related moves into a new `modules/lineups` module. `modules/events` keeps event-specific concerns (managers, participants, fleet, calendar, Discord sync) and imports the lineup components for its tab.

```
modules/lineups/
  actions/      createLineup, updateLineup, deleteLineup, updateLineupPublished,
                createLineupPosition, updateLineupPosition, updateLineupPositionName,
                deleteLineupPosition, updateLineupOrder, pasteLineupPosition,
                updateLineupPositionCitizenId, resetLineupPositionCitizenId,
                createLineupPositionApplicationForCurrentUser, delete…,
                copyLineupFrom, saveLineupAsTemplate, attachLineupToEvent,
                createLineupParticipants, deleteLineupParticipant,
                updateLineupAccess, deleteLineupAccess
  components/   Lineup (the shared editor: Positions, Position, drag & drop,
                clipboard, visibility contexts), plus the app's own list,
                tiles, dialogs and header
  queries/      getLineupById, getLineups, getTemplates, getEventLineups
  utils/        getLineupAccess, getLineupCitizens, clonePositions, positionTree,
                checkRequirements, isLineupVisible
```

The shared editor takes a `LineupAccess` object and a `kind` instead of an event, so it can hide assignment, application and participant affordances for templates without branching on `eventId` all over the tree.

### Routes

- `/app/lineups` — overview with three sections: **Aufstellungen**, **Vorlagen**, **Event-Aufstellungen** (read-only, links to the event).
- `/app/lineups/[id]` — detail/editor. Redirects to `/app/events/[eventId]/lineup` when the lineup belongs to an event.
- `/app/events/[id]/lineup` — unchanged URL, now renders the shared editor.

### Audit events

Per the system-log rules, no existing `AuditEventType` is modified or deleted. The `EVENT_POSITION_*` / `EVENT_LINEUP_*` types stay defined with a deprecation comment so historical entries keep rendering; new writes use new `LINEUP_*` types carrying `lineupId` instead of `eventId`:

`LINEUP_CREATED`, `LINEUP_UPDATED`, `LINEUP_DELETED`, `LINEUP_PUBLISHED_CHANGED`, `LINEUP_POSITION_CREATED`, `LINEUP_POSITION_UPDATED`, `LINEUP_POSITION_DELETED`, `LINEUP_POSITION_NAME_UPDATED`, `LINEUP_ORDER_CHANGED`, `LINEUP_POSITION_CITIZEN_ASSIGNED`, `LINEUP_POSITION_CITIZEN_REMOVED`, `LINEUP_POSITION_APPLICATION_CREATED`, `LINEUP_POSITION_APPLICATION_DELETED`, `LINEUP_COPIED`, `LINEUP_POSITION_COPIED`, `LINEUP_ACCESS_CHANGED`, `LINEUP_ACCESS_REVOKED`, `LINEUP_PARTICIPANTS_ADDED`, `LINEUP_PARTICIPANT_REMOVED`, `LINEUP_ATTACHED_TO_EVENT`, `LINEUP_SAVED_AS_TEMPLATE`.

### Conventions to follow

- Server actions via `createAuthenticatedAction` from `modules/actions`; client calls via `useAction`.
- Reuse `modules/common` components; `CitizenInput` (`modules/citizen`) for citizen pickers, `RoleSelector` (`modules/silc/components/RoleSalariesClient`) as the reference for the role picker — extract it into `modules/common` if it fits without changes.
- Zod schemas on every action, with `.max()` on arrays (participants, access grants, variant ids).
- Props interfaces explicit and `readonly`.
- German UI copy, matching the existing "Aufstellung" wording.
- After touching anything under `pnpm-monorepo`, run `pnpm run format` from that directory.

## Implementation phases

### 1. Schema and data migration

Introduce the new models, rename the position models and backfill a `Lineup` row for every event that currently has positions or an enabled lineup. This phase changes only the schema; the app is updated in phase 2, so the two must land together.

#### Status

Not started.

#### Steps

1. Model the lineup entity and its two enums in the Prisma schema, together with the participant list and the two access-grant tables, so templates, ad-hoc lineups and event lineups all share one shape.
2. Rename the three position models onto lineups and repoint their foreign key from the event to the lineup, so positions no longer know anything about events.
3. Strip the lineup concern out of `Event`: drop the publish flag and the position relation, leaving a single optional back-relation to the lineup, and follow the renames through the back-relations on `Role` and `Entity`.
4. Have the user generate the migration with `pnpm run migrate:dev` in `packages/database` — never author a `migration.sql` directly.
5. Extend the generated migration with the data migration, ordered so nothing is lost: rename the existing position tables in place instead of dropping and recreating them, including the implicit join table behind `requiredRoles` whose name Prisma derives from the model names; create one lineup per event that has positions or an enabled lineup, reusing the event's id as the lineup id so the two stay traceable and no id generation is needed in SQL; then repoint the positions and drop the superseded columns.
6. Validate the result against a mirror of production (`docs/mirror-database.md`), not just a fresh database — the entire risk of this phase sits in the backfill.

#### Notes

- The implicit many-to-many table for `requiredRoles` is the easiest thing to miss; Prisma derives its name from the model names, so a missed rename silently drops every position's required roles.
- `name` stays nullable so an event lineup always shows its event's current name rather than a stale copy.

#### Verification

- `pnpm run migrate:dev` produces a migration that applies cleanly to a fresh database and to a mirror of production.
- `SELECT count(*) FROM "LineupPosition" WHERE "lineupId" IS NULL;` returns 0.
- `SELECT count(*) FROM "Lineup" l JOIN "DiscordEvent" e ON e.id = l."eventId";` equals the number of backfilled lineups.
- `pnpm run build` in `packages/database` succeeds and the generated client exposes the new models.

### 2. Rekey the existing lineup code onto `Lineup`

A behaviour-neutral refactor: move the lineup UI, actions and utils out of `modules/events` into `modules/lineups`, key them on `lineupId`, and route all authorization through `getLineupAccess()`. The event lineup tab must look and behave exactly as before.

#### Status

Not started.

#### Steps

1. Move the lineup components, actions and utils out of `modules/events` into a new `modules/lineups`, so the events module is left with event concerns only (managers, participants, fleet, Discord sync) and consumes lineups as a dependency.
2. Rekey the moved code from the event to the lineup throughout — component props, form fields, queries and action schemas — and give the shared editor a resolved access object and the lineup kind instead of an event, so it can hide the assignment, application and participant affordances without testing for an event all over the tree.
3. Build the authorization façade `getLineupAccess()` with the two branches described above, plus the helper that lazily creates an event's lineup on first write, and route every action through it instead of the event-specific checks it replaces.
4. Rewrite the position actions onto lineups with behaviour for event lineups kept identical, revalidating both the event route and the new lineup route. The one deliberate change: pasting only requires read access on the source, while the target still requires manage.
5. Replace the removed event publish flag everywhere it was read — the enable toggle, the visibility check, the event's sub-navigation and the lineup tab — and keep the existing Discord push firing for event lineups.
6. Add the new `LINEUP_*` audit types alongside the existing event ones, marking the latter deprecated rather than removing them so historical log entries keep rendering, and switch every write to the new types.
7. Rework the event query to load the lineup with its nested positions and add the equivalent query for standalone lineups. Both duplicate the nesting-depth limit, which is tracked in a comment naming the three places it appears — all three move in this phase.
8. Point the event's lineup route at the shared editor so its URL and user-visible behaviour stay exactly as they are.

#### Notes

- The clipboard already lives in local storage and already spans events, so cross-lineup paste comes for free; only its `eventId` field needs to become `lineupId` and its "stammt aus einem anderen Event" hint needs rewording.
- `getEventCitizens()` becomes `getLineupCitizens(lineup)`, returning Discord participants for event lineups and `LineupParticipant` rows for standalone ones. Both shapes stay `{ citizen, ships }[]`, so `checkRequirements()` and `Unassigned` are untouched.
- Keep the four-level and 50-per-level limits exactly as they are; they are validated server-side in `updateLineupOrder` and `pasteLineupPosition`.

#### Verification

- `pnpm run lint`, `pnpm run test` and `pnpm run build` pass in `apps/app`; `pnpm run build:lambda` passes.
- The existing `positionTree` unit tests still pass unchanged.
- Manually on a seeded database: an event lineup can be created, reordered by drag & drop, nested four levels deep, copied from another event, published and unpublished; a participant sees it only once published; a past event's lineup is read-only.
- The system log renders both old `EVENT_POSITION_CREATED` entries and new `LINEUP_POSITION_CREATED` entries.

### 3. Permissions and app shell

Register the new app, its permissions and its overview page, listing templates, standalone lineups and event lineups.

#### Status

Not started.

#### Steps

1. Register the two new permission resources and their read/create/manage strings across the permission set, the role matrix and a new roles tab, so they can be assigned like every other permission.
2. Register the app in the apps overview under the name "Aufstellungen" with its own screenshot, gated on read access to either lineups or templates.
3. Build the overview page with its three sections — lineups, templates and event lineups — each gated on the permission that section needs, the last on the existing event read permission.
4. Write the list queries so each section's access rules resolve inside a single database query: look up the current user's role ids once, then filter on ownership, grants, org-wide visibility and published-participant in one go, with an unfiltered branch for holders of the manage permission.
5. Build the detail page: refuse without read access, redirect to the event's lineup tab when the lineup belongs to an event, and otherwise render the shared editor under a header carrying name, description, owner and publish state.
6. Wire the module's navigation into the shell the way the events module does.

#### Notes

- The ACL query is the one place where a naive implementation would N+1 across every lineup; resolve the current user's role ids once and pass them into a single `findMany`.
- Event lineups appear in the overview with the event name and a link to `/app/events/[id]/lineup`, no inline actions beyond "als Vorlage speichern" and "duplizieren" (phase 5).

#### Verification

- A user without any lineup permission does not see the app tile and gets `forbidden()` on `/app/lineups`.
- A user with only `lineupTemplate;read` sees the templates section and neither of the other two.
- Opening `/app/lineups/<id-of-an-event-lineup>` redirects to the event's lineup tab.

### 4. Creating, sharing and publishing

The write side of the new app: create lineups and templates, manage the participant list, manage the ACL, publish.

#### Status

Not started.

#### Steps

1. Implement creation of both kinds through a single action taking an optional source, cloning the source's positions once read access on it is confirmed — so all four entry points (leer, aus Vorlage, Aufstellung duplizieren, aus Event-Aufstellung) are one code path behind one dialog whose picker only offers readable sources.
2. Implement renaming/describing and deletion, restricted to the owner and holders of the manage permission, with deletion behind a confirmation dialog.
3. Build participant management for standalone lineups on top of the existing citizen picker, hidden for templates and for event lineups, which source their participants from Discord instead.
4. Build the share dialog: citizen and role grants at read or edit level plus the org-wide visibility toggle, restricted to the owner, with the owner shown as a row that cannot be edited or removed.
5. Extend publishing to standalone lineups and reject it for templates, in the UI and server-side alike.
6. Add the standalone publish notification end to end — a new type in the lambda's notification router resolving receivers from the lineup's own participant list rather than Discord attendees, and a matching subscribable notification type under a new "Aufstellungen" section so users can opt out.
7. Record audit events for every new write path.

#### Notes

- The owner can never be removed from their own ACL; the dialog renders them as a non-editable "Besitzer" row.
- Granting `EDIT` to a citizen who is also a participant is legitimate and must not be deduplicated away.
- Publishing a template is meaningless — hide the toggle for `TEMPLATE` and reject it server-side.

#### Verification

- Create a template, add nested positions, share it read-only with another citizen: they see it and can clone from it but get `forbidden()` on every write action.
- Grant `EDIT` to a role: every citizen holding that role can edit; removing the role removes access.
- Publish a standalone lineup with two participants: both receive a web push linking to the lineup, and only then can they open it.
- A `lineup;manage` holder can open and delete a lineup they were never granted access to.

### 5. Cross-app flows

Wire the new app and the events app together.

#### Status

Not started.

#### Steps

1. Add "Vorlage anwenden" to the event lineup tab, cloning a readable template's positions in after the ones already there and creating the event's lineup if it has none yet.
2. Generalise the existing "copy from event" button into a single source picker spanning templates, standalone lineups and other events' lineups, so there is one way to pull a lineup in rather than one per source kind.
3. Add "Als Vorlage speichern" to both the event lineup tab and standalone lineups, producing a template owned by the current user with assignments and applications dropped.
4. Implement attaching a standalone lineup to an event: manage rights required on both sides, rejected for templates and for events that already have a lineup, then one transaction that moves the lineup under the event and discards its owner, grants, org-wide visibility and participant list while keeping positions and assignments. Assignments to citizens who are not event participants survive and render the way an assigned non-participant does today.
5. Give the attach flow an entry point on the lineup page, picking from events the user manages that have no lineup yet.

#### Notes

- After attaching, the lineup's `published` value carries over unchanged, so an already-published ad-hoc lineup is immediately visible to the event's participants. Warn about that in the confirmation dialog.
- `clonePositions()` already drops citizens and applications, which is exactly what both cloning flows need.

#### Verification

- Applying a template twice appends its positions twice without renumbering the existing ones incorrectly.
- Saving an event lineup as a template produces the same tree with the same colors, required ships and required roles, and no assignments.
- Attaching a lineup to an event that already has one is rejected with a clear message; attaching to an empty event moves it and leaves the source page 404/redirecting.
- After attaching, the ACL rows and participants are gone from the database.

### 6. Tests, changelog and documentation

#### Status

Not started.

#### Steps

1. Unit-test the authorization façade across all of its branches — owner, citizen grant, role grant, org-wide visibility, published-participant, manage override, event lineup published and unpublished, past event. Every access decision in both apps funnels through it, which is what makes it worth testing in isolation.
2. Add an end-to-end spec covering the new app's core loop: build a template, create a lineup from it, add a participant, publish, and check what that participant sees.
3. Cover the migration's regression risk with a case asserting the lineup tab of an event that predates the migration still works.
4. Ask the user whether a changelog entry is warranted — this is a user-facing new app, so it almost certainly is — and prepare its screenshots.
5. Check whether the app list is documented under `docs/` and update it if so.

#### Notes

- Per the coding guidelines, keep the emphasis on end-to-end coverage; `getLineupAccess()` is the one piece complex enough to deserve unit tests.

#### Verification

- `pnpm run test` and the Playwright suite pass.
- `pnpm run format` produces no diff.

## Final end-to-end verification

Run once every phase is done, against a database restored from a production mirror so migrated rows are exercised next to freshly created ones.

1. **Toolchain is green.** Lint, unit tests and the app build pass, the lambda build passes, and `pnpm run format` leaves no diff.
2. **The migration held on real data.** Every pre-existing position ended up under a lineup, the number of lineups matches the number of events that had positions or an enabled lineup, no event kept a publish flag, and a position that had required roles before still has them — the join-table rename is the one failure that is silent.
3. **No event lineup regressed.** On an event that predates the migration: positions, nesting, colors, assigned citizens, applications and required ships render as before; drag & drop reordering, adding, deleting and copying positions still work; publishing and unpublishing still work; a past event's lineup is read-only.
4. **Event participant visibility is unchanged.** As a Discord participant without manage rights, the lineup tab is hidden while unpublished and appears once published, and publishing still delivers the existing web push.
5. **App gating works.** A user with neither lineup permission sees no app tile and is refused on `/app/lineups`; a user with only template read sees only the templates section; the event-lineups section follows the event read permission.
6. **Template lifecycle.** Create a template, build a nested tree with colors, required ships and required roles, then share it read-only with a citizen and with a role: they can open it and clone from it but every write is refused, an edit grant lets them edit, revoking removes access, and the org-wide toggle exposes it to everyone holding the read permission.
7. **Ad-hoc lineup lifecycle.** Create a lineup from that template and confirm the structure arrived without assignments; add participants and assign them; confirm the unassigned hint and the ship requirement check read the participant list. Publish it: participants get the new push, can open it and see their assignment — and could not before.
8. **Templates stay structure-only.** A template offers no participants, assignments, applications or publish toggle, and the server refuses those operations even when the request is crafted by hand.
9. **Cross-app flows.** Apply a template to an event lineup twice and confirm positions append without disturbing the existing order; save an event lineup as a template and confirm colors, required ships and required roles came across while assignments did not; paste a position out of a lineup you can only read into one you manage, and confirm the reverse is refused.
10. **Attach.** Attach a standalone lineup to an event you manage that has no lineup: positions and assignments survive, owner, grants and participants are gone from the database, and the event tab renders it. Attaching to an event that already has a lineup, or attaching a template, is rejected with a clear message.
11. **Structural limits still hold server-side.** Four nesting levels and 50 positions per level are enforced in both apps and on every path that creates positions — manual creation, paste, template application and cloning — not just in the UI.
12. **System log is intact.** Entries written before the migration still render, new writes appear under the new lineup types, and no existing type was modified or removed.
13. **Notification settings.** The new "Aufstellungen" section appears in the notification settings and opting out actually suppresses the push.
14. **Dead ends behave.** The lineup URL of an event lineup redirects to the event tab, a deleted lineup's URL is a clean 404, and a lineup whose owner was deleted is still reachable by a holder of the manage permission.
