# Event Wiki (Briefing tab)

## Goal

Give every event its own isolated wiki, surfaced as a new "Briefing" tab on the event detail pages. Each new event is seeded with a single, locked top-level "Briefing" page that acts as the wiki's homepage and as the feature gate; permissions use event-specific scopes (all / participants / lineup subtree) instead of roles, and the whole wiki freezes once the event is over. The design must keep a later, analogous tasks-app integration cheap.

## Decision log

- **Scoping model**: extend the existing `WikiPageNamespace` enum with `EVENT` and add a nullable `eventId` FK (`onDelete: Cascade`) to `WikiPage`. A later tasks integration adds `TASK` plus a nullable `taskId` the same way. No generic scope-string column.
- **Permission tiers**: read and edit are independently configurable per page with the scopes *managers only* / *all participants* / *lineup subtree* / *all* (= everyone with `event;read`), plus *inherit* for child pages. The manage tier is **not** configurable: it is exactly `isAllowedToManageEvent` (organizer via `discordCreatorId`, `Event.managers`, `event;manage`). The global `wiki;manage` and `wiki;create` permissions grant nothing on event wikis.
- **Uploads follow editability**: whoever can edit a page can upload images/attachments to it; no separate uploadability configuration for event pages.
- **Lineup scope membership**: assigned citizens only (`EventPosition.citizenId` anywhere in the selected subtree, including the selected position itself). Evaluated regardless of `lineupEnabled`. A deleted/dangling referenced position degrades the scope to managers-only (fail closed).
- **Post-event freeze**: once `isEventUpdatable` says the event is over (endTime passed, else startTime + 4h), *everything* freezes — content editing, uploads, page create/rename/move/delete, permission changes — for everyone including organizer/managers, consistent with all other event actions. Reading stays available per the read scopes.
- **Event deletion**: the Discord scraper's hard delete of cancelled events cascade-deletes the event wiki (pages, snapshots, favourites, visits, tag links, reports). Drafted content is lost; consistent with the event vanishing entirely.
- **Seeding**: the scraper Lambda creates the root page together with the `Event` row. Old events are never back-seeded — no root page means no Briefing tab (the gate).
- **Root page**: title locked to "Briefing" (no rename); cannot be deleted, moved, duplicated to top level, or given siblings — it is the only top-level page and the wiki's homepage; every other page is a descendant. It has no separate landing page: the global wiki's homepage concept is not used.
- **Seed defaults**: read = managers only, edit = managers only. The tab therefore starts hidden for regular users; publishing a briefing is a per-event, deliberate act of widening the root read scope.
- **Tab**: labeled "Briefing", second position (Übersicht, **Briefing**, Aufstellung, Teilnehmer, Flotte). Visible iff the root page exists **and** the viewer can read it.
- **Layout**: full-width like the wiki app (sidebar + resizable page widths), breaking out of the events `MaxWidthContent`; the event title and tab bar remain.
- **Feature parity (v1 includes)**: favourites, scoped search, page icons, hidden-pages sidebar modes, duplicate (within the same event), image/attachment uploads, snapshots & restore, trash & restore, tags & tag search, reports.
- **Tags are namespaced**: `WikiTag` gets the same event scoping so event tags never leak into global tag surfaces (or into other events). Global tag surfaces get explicit `eventId IS NULL` filters.
- **Reports stay global**: event-page reports flow into the existing `wiki;manage` reports queue unchanged. The resulting visibility leak is accepted; reports get globalized later anyway.
- **Tree rights**: create/move/delete/rename/sidebar-mode/duplicate are managers-only (mirrors the global wiki's "placement requires admin on the parent" rule). Editors edit content of existing pages.
- **Links**: event pages can `[[...]]`-link to their own event's pages and to global wiki pages. Global wiki pages never suggest or resolve event pages. No cross-event links.
- **Notification**: "Briefing veröffentlicht" fires when the root read scope leaves managers-only for the first time (guarded by a new timestamp on `Event`). Recipients are computed at emission: only citizens who can actually read the briefing under the new scope.
- **Owner concept unused**: event pages keep `ownerId = null`; the fixed manage tier replaces it.
- **Excluded surfaces**: featured pages, dashboard page, connected pages ("Verknüpfte Seiten"), export/import, and all global-wiki listings (search, trash, recents, page targets) exclude event pages.

### Out of scope

- The tasks-app integration itself (design compatibility only).
- Back-seeding briefings for events that exist before the Lambda deploy.
- The reports globalization rework.
- Export/import for event pages.
- Featured/dashboard/connected-pages equivalents inside events.
- Briefing content on Discord (the event description sync stays untouched).

## Overall implementation notes

- **Two parallel permission worlds, one page model.** The role-based resolver (`resolveWikiPagePermissions`) stays untouched for namespace `WIKI`. Namespace `EVENT` gets its own resolver that mirrors the hierarchy semantics exactly (INHERIT = nearest explicit setting wins, a page grants nothing if the parent is unreadable, higher tiers imply lower ones, cycles/broken chains deny) but evaluates scope membership instead of roles. Keeping the two resolvers separate avoids contaminating the already-complex role resolver; shared hierarchy helpers may be extracted only where it stays obviously readable.
- **Scoped context loader.** A `getEventWikiContext(eventId)`-style, request-cached loader (analogous to `getWikiContext`) loads the event (participants, managers, positions), all `EVENT`+`eventId` pages, and resolves the viewer: `{ citizenId, discordId, isParticipant, isEventManager, assignedPositionIds }` plus a `frozen` flag from `isEventUpdatable`. Every event-wiki route, action, and API path derives from this context — same "single authority" pattern as the global wiki. Wrap it with `withTrace`.
- **Scope storage.** New enum `WikiPageEventScope { INHERIT, MANAGERS, PARTICIPANTS, POSITION, ALL }` and four columns on `WikiPage`: read scope + optional position FK, edit scope + optional position FK (`onDelete: SetNull` on the position FKs; null position with scope POSITION ⇒ managers-only). Root pages must be explicit (no INHERIT), children default to INHERIT. The role-based columns (`visibility`, `editability`, `roleAccess`, uploadability) are simply unused/ignored in the `EVENT` namespace.
- **Tag uniqueness needs raw SQL.** Replacing `WikiTag.name @unique` with per-scope uniqueness cannot be expressed in Prisma alone: a plain `@@unique([eventId, name])` treats NULL `eventId` as distinct, so global names could duplicate. Use partial unique indexes in the migration SQL (`(name) WHERE "eventId" IS NULL`, `("eventId", name) WHERE "eventId" IS NOT NULL`) and document them in the schema.
- **Collab server: no code changes, but a mandatory redeploy.** The collab flow is unchanged — the app mints the same session-token shape with `canEdit` already resolved (freeze ⇒ `canEdit: false`), and the server only knows page ids. But the server's generated Prisma client must learn the `EVENT` enum value *before the first event page row exists*, otherwise reading such a row throws an unknown-enum-value error. Hence the deploy order below.
- **Deploy order**: ① app release (applies the migration; the Briefing tab code is inert because no root pages exist yet) → ② collab redeploy (fresh Prisma client) → ③ Terraform Lambda deploy (seeding starts; from then on, new events get briefings). Events created between ① and ③ behave like old events — acceptable per the no-back-seeding decision.
- **Link hrefs become data.** `wikiPageLinkNode.renderHTML` currently hardcodes `/app/wiki/<pageId>/<slug>`. The `pages` record passed into the editor extensions grows an href per entry so event pages can link into `/app/events/<eventId>/briefing/...` and to global wiki URLs from the same document. Event editors get `linkablePages` = own event's readable pages + readable global wiki pages; the global wiki's `linkablePages` stays namespace-filtered and therefore never offers event pages.
- **URLs**: `/app/events/[id]/briefing` renders the root page (canonical); child pages live at `/app/events/[id]/briefing/[pageId]/[[...slug]]` with the same id-resolves/slug-redirects behavior as the wiki; per-page snapshots, a tags listing, and a trash route nest under `/briefing`. Navigating to the root page's id-URL redirects to `/briefing`. Unreadable/missing pages 404 (never 403), matching the wiki.
- **Actions strategy**: prefer making the existing wiki server actions scope-aware — they receive a page id, so they can load the page row, branch on `namespace` to the right context/permission check, apply the freeze and root-lock guards, and revalidate the right path (`/app/events/[id]/briefing` layout). Only where an action's semantics genuinely fork (create, permissions update, collab token mint) do dedicated event variants get added. Freeze rejections reuse the existing "Das Event ist bereits vorbei." behavior.
- **Tasks future-proofing**: keep the fork points enumerable, not abstracted. The places that branch on namespace (context loader, permission resolver, base URL, revalidation target, linkable-pages source) are the exact seams a `TASK` namespace will plug into; resist building a generic adapter layer now (per the no-premature-abstraction guideline) but keep the branching in one place per concern so the third namespace is additive.
- **Security/reliability**: zod-validate all new action inputs (position id lists and page id arrays with `max()` bounds), no PII in logs, notification payloads carry ids only. No new external fetches. The purge Lambda (30-day trash) is namespace-agnostic and needs no changes.

## Implementation phases

### Phase 1: Schema and isolation groundwork

Add the scoping columns and enums, scope the tag model, and close the few global surfaces that are not yet namespace-filtered — before any event-wiki code exists, so the global wiki provably keeps behaving identically.

#### Status

Implemented and verified

#### Steps

- Write the migration: `EVENT` enum value; `eventId` FK + index on `WikiPage`; the four scope columns + `WikiPageEventScope` enum; `WikiTag.eventId` with the partial unique indexes replacing the global unique; a `briefingPublishedAt` timestamp on `Event`.
- Sweep every place that queries wiki pages or tags outside a context object and pin it to the global scope: the tag FTS branch of the search query, the tag autocomplete router, and the case-insensitive tag find-or-create must all filter `eventId IS NULL`; verify the page-side surfaces (context loader, page FTS query) already filter on namespace and extend their filters/comments to cover `eventId`.
- Regenerate the Prisma client and fix type fallout across app, collab, and lambda packages.

#### Notes

- The `namespace` column already exists with default `WIKI`; no data migration is needed.
- Partial unique indexes must be hand-written SQL in the migration (Prisma limitation, see overall notes).
- Verified empirically: the `Event` → `WikiPage` cascade passes the parent relation's `Restrict` because Postgres queues constraint triggers until the whole statement (including its cascades) is done — deleting an event's entire page tree in one go never trips the parent FK, so the existing parent relation stays untouched.
- The `CHECK` constraint compares `namespace::text` because a freshly added enum value cannot be used inside the transaction that adds it.
- The migration was authored via `prisma migrate diff --from-migrations` + `db execute` + `migrate resolve --applied` instead of `migrate dev`: the shared dev database carries an applied migration from another in-flight branch (`upload_dimensions`), and `migrate dev` would have demanded a reset. With the multi-file schema, `--to-schema` must point at the schema folder, not `schema.prisma`.

#### Verification

- Existing wiki unit tests pass unchanged; the app builds; the migration applies cleanly to a dev database and is reversible in review.
- Manual: global wiki search, tag autocomplete, tag pages, featured/dashboard/connected settings behave exactly as before.

### Phase 2: Event wiki context and permission resolver

Build the request-scoped context loader and the event-mode permission resolver — the core new logic, developed test-first since everything else consumes it.

#### Status

Implemented and verified

#### Steps

- Implement the context loader: event with participants, managers and positions; all pages of the event's scope (including soft-deleted, like the global context); the viewer struct; the `frozen` flag from `isEventUpdatable`; request-cached and traced.
- Implement the event resolver mirroring the hierarchy semantics of `resolveWikiPagePermissions` (nearest-explicit-wins inheritance, parent-read gating, tier implication, additive fixed manage tier, cycle/broken-chain denial) with scope membership checks; lineup-subtree membership evaluated via the existing position-tree utilities; frozen strips every mutating capability while leaving read (and managers' read-only admin views) intact.
- Add accessor helpers matching the global wiki's patterns (accessible-page lookup with 404-not-403 semantics, root-page detection and lock predicate).
- Unit-test the resolver in the style and coverage depth of the existing resolver tests: inheritance chains, each scope, dangling position, freeze, manager override, participant/outsider matrices.

#### Notes

- The manage tier must not consult `wiki;manage`; the admin escape hatch continues to work only through `event;manage`.
- The grant checks resolve INHERIT recursively through the parent gate (mirroring the role resolver); the source walk exists only for the settings display. The read tier's "edit implies read" uses the unfrozen edit grant so read access via an edit scope survives the freeze.
- POSITION membership is precomputed per viewer as "every assigned position plus its ancestors" (`collectPositionScopeIdsForCitizen`), turning the subtree check into a set lookup.

#### Verification

- Resolver unit tests green, including the fail-closed cases (dangling position, cycle, unreadable parent).

### Phase 3: Seeding and cascade in the scraper Lambda

Seed the locked root page at event creation and confirm deletion hygiene, so the gate semantics hold from the moment the Lambda ships.

#### Status

Implemented and verified

#### Steps

- In the scraper's event-create branch, create the root wiki page in the same transaction as the `Event` row: namespace `EVENT`, the event's id, no parent, title "Briefing", slugified title, read/edit scopes MANAGERS, `createdById` null.
- Verify the cascade chain from `Event` through `WikiPage` reaches snapshots, favourites, visits, tag links and reports (adjust FK actions where a `Restrict` would block the scraper's `deleteMany`); uploads orphan the same way a hard page destroy orphans them today.
- Confirm the trash purge automation handles event pages (leaves-first ordering is namespace-agnostic).

#### Notes

- Existing events at deploy time simply never get a row — that *is* the gate; no cutoff constant needed.
- The Lambda deploys via Terraform independently of the app; ordering per the overall notes.
- The seed is a nested create on `prisma.event.create` (atomic, no transaction wrapper). Title and slug are constants because the root page can never be renamed.
- Cascade verified against the dev database: deleting the event removes root, descendants (through the `Restrict` parent FK, same-statement semantics), tags, tag assignments and snapshots. The trash purge automation is namespace-agnostic and needs no change.

#### Verification

- Dev run of the scraper: a new Discord event yields exactly one root page with the expected defaults; cancelling it on Discord removes the event and every wiki row; an update run does not create duplicates.

### Phase 4: Briefing tab shell — gate, routes, layout, sidebar

Make the tab appear for readable briefings and render the root page full-width with the scoped sidebar (tree + favourites); reading works end to end.

#### Status

Implemented (in-app verification pending)

#### Steps

- Extend the event tab navigation with "Briefing" in second position, shown iff the root page exists and the viewer can read it; give the tab-active logic prefix matching so nested briefing routes highlight the tab.
- Restructure the events layouts so the width constraint moves out of the shared layout: header and tab bar keep their current width everywhere, tab contents keep theirs, and the briefing tab alone renders a full-width wiki-style sidebar layout.
- Add the route tree under `/app/events/[id]/briefing`: root page at the bare path (canonical, with the root's id-URL redirecting there), child pages at id + optional slug with slug-correction redirects, plus stubs for snapshots, tags and trash routes (filled in later phases).
- Build the event-scoped sidebar: page tree rooted at (and pinned to) the root page, favourites limited to the event's pages, hidden-pages toggle, expand/collapse persistence via a sibling of the existing cookie mechanism scoped to the events path, manager-only entries (trash) — reusing the wiki sidebar components with the event context as data source.
- Render pages read-only via the existing static renderer fed from the event context (editor arrives in phase 5); track visits so "recently visited" state stays consistent if ever surfaced.

#### Notes

- The sidebar cookie's page keys are id-suffix based and globally unique, so one cookie can serve all events; the existing key cap applies across them.
- Hoisting `MaxWidthContent` turned out unnecessary: the events shell already uses the same screen-3xl `MaxWidthContent` as the wiki app — the wiki's "full-width" feel comes from its `SidebarLayout` inside that wrapper, which the briefing tab now nests the same way.
- Client components stay namespace-agnostic through a `WikiPageHrefMode` React context (default = global wiki, so the wiki app needs no provider): it supplies href building, active-page detection, the locked-root flag (suppresses the root's drag handle and root-level drop bands), and the cookie scope. Server components pass precomputed hrefs.
- A `getWikiPageScopedContext(pageId)` helper (page id → namespace → matching context) is the seam server actions use to serve both scopes; the favourite toggle already runs through it.
- The shared tree/breadcrumb/target/index utilities now accept a structural `WikiSharedContext` (and `WikiPageTierPermissions`), which both context types satisfy — no forked utilities.

#### Verification

- Old event (no root page): no tab, `/briefing` 404s. New event: managers see the tab, non-managers don't (default scopes). Widening the read scope in the DB makes the tab appear for the right viewers.
- Sidebar shows only the event's pages; global wiki sidebar shows no event pages; navigation, redirects and 404 semantics match the wiki's behavior.

### Phase 5: Editing — collab, links, uploads

Wire the collab editor into event pages with freeze-aware tokens, scoped link suggestions, and uploads following editability.

#### Status

Implemented (in-app verification pending)

#### Steps

- Add the event-scoped collab token mint (same token shape; permission check via the event context; `canEdit` false when frozen) and mount the existing collab editor + edit-mode machinery on the briefing routes.
- Make link hrefs data-driven in the shared editor extensions, then feed event editors a linkable-pages set of own-event pages plus readable global wiki pages; keep the global wiki's set unchanged; verify the URL paste rule keeps linkifying global wiki URLs inside event pages and never the reverse.
- Make the upload assignment and attachment download API paths scope-aware (event pages gate uploads on the edit permission, downloads on read), including page icons for managers.
- Confirm slash-command, mentions, page-index and the other block types work against the event context (page-index nodes must only ever list event pages when configured from an event page).

#### Notes

- The collab server needs no code change; its redeploy must precede the Lambda deploy (see deploy order).
- The shared-extensions change touches the same package the collab server builds against — another reason the collab redeploy comes before event pages exist.
- The token mint, upload assignment and attachment download all switched to `getWikiPageScopedContext`, so one code path serves both scopes; the event resolver's freeze-aware `canEdit` makes frozen tokens read-only without any collab-side logic. Icon changes additionally check the freeze explicitly (they run on the canAdmin tier, which survives it).
- The attachment download resolves each linked page's own context because an upload can be linked from pages of different scopes.
- A second paste rule linkifies pasted briefing-page URLs; resolution still runs through the viewer's pages map, so foreign events render as unavailable.

#### Verification

- Two sessions co-edit an event page; a read-only-scope user gets a read-only connection; after faking the event's end time, editors get read-only tokens and the UI hides editing affordances.
- `[[` suggestions inside an event page offer that event's pages and global wiki pages only; inside the global wiki they offer no event pages; links render with correct hrefs in both static and editor rendering.

### Phase 6: Page lifecycle actions in event mode

Every mutating page action honors the event scope, the freeze, and the root lock.

#### Status

Implemented (in-app verification pending)

#### Steps

- Route the existing page actions through the namespace branch: create-child (managers, always under an event page, never top-level), rename, move (within the event only, cycle-checked), drag-reorder, delete (soft), restore, destroy, duplicate (within the event, placement rules as move), sidebar mode, favourite toggle — each with freeze guard, root-lock guard where applicable, and event-path revalidation.
- Implement the trash and snapshots routes for managers (restore actions frozen after event end; viewing history stays allowed).
- Tags: the tag action's find-or-create and the tag listing route operate on the event's tag scope; the event search's tag surface (phase 7) and autocomplete only ever see event tags.
- Reports: the report-create path works from event pages unchanged; sanity-check the global reports queue renders event-page reports (accepted leak) without breaking on their URLs.
- Emit the existing wiki audit event types with the event id in their data.

#### Notes

- The root page accepts only content edits (per scopes) and permission changes — everything else is rejected server-side, not merely hidden.
- All page actions now run through `getWikiPageScopedContext`; the freeze answers with the events' usual "Das Event ist bereits vorbei." and cross-scope moves/duplications are impossible by construction (the scoped context only contains the page's own scope, so foreign targets resolve as missing).
- Moves inside an event reset the moved subtree's scopes to INHERIT (`buildEventWikiPageMoveReset`) so both modes keep the dialogs' "takes on the new parent's permissions" promise.
- Favourites, visits and reports stay writable after the freeze (per-user/meta data, not content).
- The trash and snapshot tables are shared: `WikiTrashTable` accepts a context, `WikiSnapshotsTable` a pageHref.

#### Verification

- A manager can build, reorganize and trash/restore a page tree under the root; editors cannot; nobody can after the event ends; root-lock violations are rejected server-side (exercised with hand-crafted action calls).

### Phase 7: Permissions UI and publish notification

Managers configure scopes through a dedicated modal, and the first widening of the root read scope notifies exactly the people who gained access.

#### Status

Implemented (in-app verification pending)

#### Steps

- Build the event permission modal: independent read and edit pickers (managers / participants / lineup subtree with a position picker rendering the lineup tree / all; inherit offered on child pages), an effective-access display naming who can currently read/edit and where a setting is inherited from, and the fixed manage tier stated explicitly.
- Implement the scope-update action: validation (root must be explicit, referenced position must belong to the event, freeze guard), audit event, revalidation.
- On the root read scope leaving managers-only with the publish timestamp unset: compute the recipient citizens from the new scope (event-readers / participants / assigned subtree members), emit a new notification type through the existing app-side EventBridge trigger, set the timestamp; add the notification-router handler and the notification-catalogue/settings entry.

#### Notes

- No cascading permission rewrites are needed on scope changes — the resolver's parent-read gate constrains children dynamically, unlike the role model's prune machinery.
- Notification fires at most once per event (timestamp guard), including across un-publish/re-publish cycles.
- Recipient resolution moved into the notification router (payload carries the scope snapshot), matching the codebase's delivery pattern: PARTICIPANTS reuses `getEventParticipants`, POSITION resolves the assigned subtree, ALL notifies every citizen holding `login;manage` + `event;read`. Same audience as "computed at emission", but robust against delivery lag.
- The scope update audits as a dedicated `WIKI_PAGE_EVENT_SCOPES_UPDATED` type (the role-based audit payload is strictly typed and does not fit).

#### Verification

- Scope matrix spot checks through the UI (participant, lineup member, outsider, manager) match the resolver tests' expectations; the tab appears/disappears accordingly.
- Publishing notifies exactly the readable set once; re-narrowing and re-widening does not re-notify; a lineup-scoped publish notifies only assigned citizens.

### Phase 8: Scoped search and tag search

The sidebar search finds only this event's pages and tags.

#### Status

Not started

#### Steps

- Add the event variant of the FTS search: same query construction and ranking, filtered to the event's namespace/scope for pages and to the event's tags for the tag branch; permission-filter results through the event context; breadcrumbs from the event tree.
- Extend the search transport with an optional event scope (validated, `event;read`-gated) and mount the existing search component in the briefing sidebar pointing at it; tag results link to the briefing tag route.
- Confirm the global search path is untouched and cannot be coaxed into returning event pages.

#### Notes

- The FTS expression must keep matching the existing GIN expression index; only WHERE clauses change.

#### Verification

- Search inside event A finds its pages/tags only — not global pages, not event B's; global search finds no event pages; snippets, tag chips and breadcrumbs render correctly.

## Final end-to-end verification

- **Lifecycle walkthrough on dev**: scraper seeds a new event → tab hidden for a participant, visible for the organizer → organizer writes content, sets read = participants → participant gets the notification, sees the tab, reads; lineup-scoped page readable only by assigned citizens → event end time passes → everything read-only for everyone, including the organizer → event cancelled on Discord → event and all wiki rows gone.
- **Isolation audit**: with event pages existing, check every global surface lists none of them — search, tag autocomplete and tag pages, featured/dashboard/connected page pickers, page-index nodes on global pages, trash, recents/recently-updated, `[[` suggestions, page targets. Check the reverse direction: event surfaces never list global pages except in link suggestions.
- **Permission matrix**: for each scope (managers/participants/position/all) × (read/edit) × viewer type (organizer, event manager, `event;manage` holder, participant, assigned lineup member, applicant, outsider, `wiki;manage` holder without event rights, admin escape hatch), spot-check page access, tab visibility, and collab token behavior against the intended semantics.
- **Root invariants**: attempts to delete/move/rename/sibling the root page fail server-side; no action path creates a second top-level page in an event.
- **Freeze**: all mutating actions and the collab edit path reject after event end; reading, search, favourites and history views still work.
- **Regression**: full existing test suite; manual smoke of the global wiki (edit, search, tags, permissions modal, trash, reports) confirming zero behavior change.
- **Deploy order rehearsal**: migration → collab → Lambda sequence validated on dev/staging before production.
