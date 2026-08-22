# Event templates

## Goal

Let users create, maintain and share reusable templates for standalone in-app events. A template prepopulates title, description, cover image, role access (visibility), lineup and briefing during event creation; the event creator picks a template in the create modal and gets a fully seeded event without the template staying attached to it. Templates are personal by default, shareable to roles (read/use vs. edit) by holders of a new permission, and fully manageable by `event;manage` holders.

## Decision log

Decisions from the planning interview (2026-08-22):

- **APP events only:** Templates exist only for standalone in-app events; the Discord path is untouched.
- **What a template holds:** title, description, cover image, visibility prefill (`PUBLIC`/`RESTRICTED` + role list), a full lineup position tree, and a full briefing wiki page tree. Explicitly **not** held: participants, lineup assignments/applications, start/end dates.
- **Authoring model — full editor, no snapshots:** Templates are first-class living documents edited in place on their own detail pages (Stammdaten / Aufstellung / Briefing / Freigabe), using the _real_ lineup editor and the _real_ event-wiki shell. A "save event as template" snapshot path was considered and rejected (out of scope).
- **Architecture — generalize, don't duplicate (no-workarounds principle):** `EventPosition` and `WikiPage`/`WikiTag` are generalized to a container (event **or** template) via a nullable `eventId` plus a new `templateId` and hand-written CHECK constraints, instead of parallel template tables. One editor codebase serves both containers; position-scoped briefing pages inside a template reference the template's own positions naturally.
- **Briefing fidelity:** the template briefing is a complete page tree including hierarchy, order, tags and the event read/edit scopes (`MANAGERS`/`PARTICIPANTS`/position-scoped). Inside the template these scopes are stored metadata only (see implementation notes); on event creation the tree is copied 1:1 with position scopes remapped to the cloned positions.
- **Cover image included:** creating an event from a template copies the template cover's S3 object into a fresh `Upload` owned by the event creator (upload ownership semantics stay untouched). Duplicating a template copies the cover the same way.
- **Creation permission:** everyone with `event;create` can create personal templates. No separate creation permission.
- **Share permission `eventTemplateShare;manage`:** a new permission _resource_ (`eventTemplateShare`) with the existing `manage` operation — no new operation vocabulary. Holders can share templates **they own** to roles (read/use and edit tiers), edit those shares, and transfer ownership to another citizen. No "shared-template moderator" middle tier exists. An owner without the permission keeps content/delete rights but cannot modify shares or transfer; existing shares keep working.
- **Ownership model (wiki-style):** `createdById` is a pure audit fact with no permission implications; `ownedById` is the live permission-bearing owner. Creators are the initial owners and can lose all access after a transfer. Ownership transfer keeps the share settings — only the owner changes.
- **Edit tier = content only:** role-shared EDIT users may change all template content (title, description, cover, visibility prefill, lineup, briefing) but not sharing, ownership or deletion. EDIT implies READ (career `FlowRoleAccess` precedent: one tier per role).
- **`event;manage` sees and manages ALL templates**, including personal ones — every capability on every template.
- **Duplicate:** anyone with at least read/use access may duplicate; the copy is a personal template owned by the duplicator; the source's role shares are deliberately not copied (same reasoning as `duplicateFlow`); content incl. visibility prefill and cover is copied.
- **Deletion:** soft delete (`deletedAt`/`deletedById`) with restore, career-flow pattern: a Status filter (Aktiv/Gelöscht/Alle) in the management table doubles as the restore UI. Deleting/restoring allowed for owner + `event;manage`. A deleted template grants nothing to anyone else and never appears in the picker.
- **Picker UX:** a "Vorlage (optional)" select at the top of the existing create-event modal prefills the form; additionally every template row and detail page gets a "Verwenden" button that opens the same modal with the template preselected.
- **Detached after use:** no FK from `Event` to the template. The creation is recorded in the system log only (new audit type carrying template id + name as historical facts).
- **Location:** template management lives inside the events app at `/app/events/templates` (+ per-template subpages); the events module navigation gains a "Vorlagen" item.
- **Changelog:** a tracked entry (`isTracked: true`).

Decisions made by Claude during planning (veto welcome):

- **List/nav access gate:** the templates section is reachable for users with `event;create` OR `event;manage` OR at least one template visible to them (covers role-shared editors/users without `event;create`).
- **Template creation entry points:** a house-style create modal (name/description/cover), reachable from the templates list CTA and a new "Event-Vorlage" item in the topbar "Neu" menu (gated like the list). Creation redirects to the new template's detail page where lineup/briefing/prefill are edited.
- **Lineup publication is not part of the template:** events created from a template start with `lineupEnabled = false`; the organizer publishes the lineup when ready.
- **Briefing root seeding:** creating a template seeds the same manager-scoped `BRIEFING` root page events get (shared seed helper with a template container). Creating an event _from_ a template copies the template's tree instead of seeding a fresh root.
- **Audit strategy honors log immutability:** existing `AuditEventType`s stay untouched. New types for all template mutations; position mutations emit the existing event-scoped types when performed on an event and new template-scoped types when performed on a template; wiki page mutations keep their existing page-keyed types (container-agnostic). Creating an event from a template emits the unchanged `EVENT_CREATED_IN_APP` plus a new "created from template" type.
- **Ownership transfer target:** any existing citizen; no requirement that they hold `event;create` or the share permission (a template owned by someone who cannot use it is odd but harmless, mirroring the wiki's "owner may lose reachability" tolerance — minus the reachability check, which a flat model does not need).
- **Prefill role edge case:** a template's visibility prefill may contain roles the event creator cannot see; the role selector keeps them visible/removable (documented `WikiRoleSelector` behavior), and `createEvent` accepts them as today (it never validated role visibility).
- **No template name uniqueness** (consistent with events).

### Out of scope

- "Save event as template" / snapshot-from-event authoring (rejected in the interview in favor of the full editor).
- Template versioning or history; tracking which events used a template.
- Citizen-level share grants (roles only; ownership is the only citizen-level right, mirroring the wiki).
- Notifications or an activity feed for template changes (system log only).
- Applying a template to an _existing_ event.
- Discord events and publishing templates to Discord.
- Template categories/tags or a template marketplace beyond the role-shared model.

## Overall implementation notes

- **Schema:** new `EventTemplate` model (id, `name` ≤ 128, `description` ≤ 2000, `coverImageId` → Upload, `visibility` prefill reusing the `EventVisibility` enum, `createdAt`/`createdById`, `updatedAt`/`updatedById`, `ownedById`, `deletedAt`/`deletedById`) plus `EventTemplateVisibilityRole` (prefill roles, unique template+role) and `EventTemplateRoleAccess` (`type: READ | EDIT`, unique template+role — the career `FlowRoleAccess` shape, not the wiki's three-type table). `EventPosition.eventId` becomes nullable and `templateId` is added (CHECK: exactly one set); `WikiPage` and `WikiTag` get `templateId` and the existing EVENT-namespace CHECK constraint is extended to "namespace = EVENT ⇔ exactly one of eventId/templateId set". CHECK constraints are hand-written migration SQL (established precedent). All new tables follow the created/updated/deleted-by guidelines.
- **Permission resolution** is a small pure resolver in the permissions package (flat, modeled on `resolveFlowPermissions`, not the wiki's hierarchy machinery): viewer `{citizenId, roleIds (effective), hasEventManage, hasTemplateShareManage}` → per-template `{canRead, canEdit, canManage, canManageShares}` where `canManage` (delete/restore/duplicate-independent admin) = owner ∨ `event;manage`, and `canManageShares`/transfer = (owner ∧ `eventTemplateShare;manage`) ∨ `event;manage`. A soft-deleted template grants nothing except list/restore visibility to owner + `event;manage` (career precedent). A matching Prisma `where` fragment powers list queries and the picker so no call site can forget the soft-delete/visibility exclusion; a single-template accessor returns null → `notFound()` so invisible and nonexistent templates are indistinguishable.
- **Container generalization** is a behavior-neutral refactor phase of its own: lineup server actions and editor components receive a container-aware authorization seam — event containers keep `isAllowedToManagePositions` + `isEventUpdatable` exactly as today; template containers use template `canEdit` (+ not deleted, no time freeze). Citizen assignment and position applications are event-only: their UI is not rendered and their actions reject template positions. The wiki side adds a third branch to the scoped-context selection: inside a template container, the template ACL replaces the event-scope evaluation wholesale — `canRead(template)` reads all briefing pages, `canEdit(template)` edits and administrates them; the per-page event scopes remain editable as metadata that only takes effect after copying into an event (this is the semantic that keeps the model honest: scopes describe the _future event_, the template ACL describes the _template_).
- **Copy machinery:** `clonePositions` is refactored to return an old→new id map (currently returns a count); `copyWikiPageSubtree` learns template containers as source/target and remaps `eventReadScopePositionId`/`eventEditScopePositionId` through that map. Both run inside the event-creation transaction (30 s timeout precedent exists in the wiki copy).
- **Cover copy:** a small uploads-module helper copies an S3 object (`CopyObjectCommand`) into a new `Upload` row owned by the acting user, reusing the existing dimension probing. Keys are server-derived only; the source is always the template's own cover, reachable only through a template the user may read.
- **Create-from-template flow:** the create-event form gets a template select (usable templates via a tRPC query, following the `getVisibleRoles` pattern) that prefills name/description/visibility/roles/cover preview client-side — prefilled fields stay editable, and since the form fields are uncontrolled, prefill works by remounting the field block keyed by the selected template id (React 19 form-reset gotcha). Submitting passes `templateId` (+ whether to keep the template cover); the server re-validates read/use access at action time, then seeds positions, copies the briefing tree (instead of the fresh root seed) and copies the cover in the transaction. Submitted form values win over template values.
- **"Verwenden" preselection** requires the app-wide CreateContext to support an optional per-open payload (currently forms only take `onSuccess`/`className`) — a deliberate small generalization of the modal registry rather than a parallel modal.
- **Management UI** follows the career-flow composition: `SidebarLayout` with filters (text search; Typ Persönlich/Geteilt/Alle; Status Aktiv/Gelöscht/Alle; owner combobox filter for `event;manage` holders only, applied only for them so it can never widen a view) + `TableTile` with columns Name, Besitzer (citizen link), Persönlich/Geteilt, Aktualisiert, and an sr-only actions column (Verwenden, Duplizieren, Löschen/Wiederherstellen); manager-only columns composed conditionally. Detail pages: Stammdaten (edit form + details + Danger Zone), Aufstellung, Briefing (mirroring the event briefing route set incl. tags/trash/snapshots), Freigabe (shares + ownership transfer, tab visible only to those who can manage shares).
- **New audit types** (added, never modified): template created/updated/deleted/restored/duplicated, shares updated, ownership transferred (previous + new owner), template position created/updated/deleted (template container), and event-created-from-template (event id + template id + template name). German UI labels throughout ("Vorlagen", "Event-Vorlage", "Verwenden", "Freigabe", "Besitzer").
- **Zod/DoS caps:** name ≤ 128, description ≤ 2000, share-role and prefill-role arrays ≤ 50; position trees already bounded by `MAX_LINEUP_DEPTH`/`MAX_POSITIONS_PER_LEVEL`.
- **Reused building blocks:** `SidebarLayout` + filter primitives, `TableTile`/`TRow`, `Tile` Danger Zone treatment, `Modal` + CreateContext, `ConfirmActionButton`, `WikiRoleSelector`, `CitizenInput`, `createAuthenticatedAction`/`useAction`, `resolveEffectiveRoles`, `clonePositions`, `copyWikiPageSubtree`, the career duplicate/status-filter patterns.
- **No Unleash flag:** nothing is reachable without `event;create`; sharing additionally needs the new permission grant. Schema ships inert.

## Implementation phases

### Phase 1: Schema — template models and container columns

Introduce the `EventTemplate` model family and generalize `EventPosition`, `WikiPage` and `WikiTag` to the event-or-template container. After this phase the app behaves exactly as before on the new schema.

#### Status

Done.

#### Steps

- Add `EventTemplate`, `EventTemplateVisibilityRole` and `EventTemplateRoleAccess` (with a new `READ | EDIT` access-type enum) to the events schema file, wired to `Upload` (cover), `Entity` (created/updated/owned/deleted by) and `Role`.
- Make `EventPosition.eventId` nullable, add `templateId` (cascade on template delete); add `templateId` to `WikiPage` and `WikiTag`.
- Hand-write the migration SQL for the CHECK constraints: exactly-one-container on positions, and the extended EVENT-namespace constraint on wiki pages (replace the existing constraint from the `event_wiki_scoping` migration).
- Regenerate the Prisma client and mechanically update compile-breaking references across the app and lambdas (`position.event` now optional, etc.) without behavioral changes.

#### Notes

- The destructive-prisma consent guard applies to local db commands; plan for `prisma migrate dev` in the worktree's local stack.
- No data backfill is needed — all new columns start empty/null on existing rows.
- The migration was generated with `prisma migrate diff --from-config-datasource --to-schema prisma --script` and applied with `prisma migrate deploy`, so no local database had to be reset.
- The `WikiPage` CHECK became "EVENT ⇒ exactly one container, otherwise none", which also rules out a page belonging to an event *and* a template. `WikiTag` got the matching at-most-one constraint plus a template-scoped partial unique index; the global one now requires both container columns to be NULL.
- The lineup order and the "add position" button used to read the event id off a rendered row. That row now carries a nullable `eventId`, so the id comes from the page through `LineupOrderContext` instead — the place the container prop lands in phase 3.
- `EventPosition` also gained an index on `eventId`, which the NOT NULL column never had.

#### Verification

- Migration runs cleanly on a fresh database and on a production-mirrored local database; the replaced wiki CHECK constraint still rejects invalid rows (spot-insert tests for both constraints).
- Typecheck, lint, unit and Playwright suites pass; events, lineup and briefing behave unchanged.

### Phase 2: Authorization foundation

The new permission resource, the pure template-permission resolver, and the query helpers every later phase builds on.

#### Status

Done.

#### Steps

- Add the `eventTemplateShare` resource to the permissions package's `PermissionSet`, a "Event-Vorlagen teilen" row to the roles Events tab, and the matching entry in the static permissions matrix.
- Build `resolveEventTemplatePermissions` in the permissions package (pure, session-free) with the viewer shape and capability set from the implementation notes, including the deleted-template semantics.
- Build the app-side viewer builder (effective roles + the two `authorize` checks), the visible-templates Prisma `where` fragment, the list query (filters: search/type/status/owner) and the single-template accessor (null → `notFound()`), plus the section access gate (`event;create` ∨ `event;manage` ∨ ≥ 1 visible template).
- Unit-test the resolver: personal owner, read-share, edit-share (implies read), non-shared stranger, owner without share permission, `event;manage` on a personal template, deleted template for each viewer, ownership-transferred creator losing access.

#### Notes

- Roles are matched via effective roles (level gate + inheritance), consistent with events and wiki.
- The template code lives in its own module (`modules/event-templates`) rather than inside the already flat `modules/events`.
- `visibleEventTemplatesWhere()` is ANDed into every query instead of spread, so a caller's own `OR` can never widen it. The owner filter is only honored for `event;manage` holders, who see everything anyway.
- The resolver answers the owner before the deleted check, so a deleted template stays visible and restorable to them; the share branch below it fails closed.

#### Verification

- Resolver unit tests green; permission appears in the roles UI and matrix and round-trips through a role save.

### Phase 3: Container generalization of lineup and wiki (behavior-neutral)

Refactor the lineup editor/actions and the wiki scoped context to operate on an event-or-template container, and upgrade the copy utilities. No user-visible change in this phase.

#### Status

Done.

#### Steps

- Introduce the container authorization seam for all position actions (create/update/rename/delete/order/paste/copy) and thread it through the editor components; event containers keep today's guards verbatim, template containers use template `canEdit`. Assignment, application and lineup-publish paths stay event-only (UI hidden, actions reject template positions).
- Add the template branch to the wiki scoped-context selection: template briefing pages resolve read/edit/admin from the template ACL; scope-editing UI keeps storing event scopes as metadata. Ensure the global wiki context never loads template pages.
- Refactor `clonePositions` to return the old→new position id map; extend `copyWikiPageSubtree` to template source/target containers with position-scope remapping through that map; unit-test the remap (position-scoped page → copied page points at the cloned position).
- Audit every existing position/wiki query for container safety (event queries filter by `eventId`, so template rows must never leak in — verify the handful of spots that load positions without an event filter, e.g. variant/role back-relations).

#### Notes

- This is the phase where the no-workarounds principle earns its cost: after it, templates get the entire editing UX for free.
- Existing event-scoped audit emission stays byte-identical for event containers.
- The container type is `EventContainer` (`modules/events/utils/eventContainer.ts`) and serves both the lineup and the briefing; `authorizeEventContainer()` is the single seam every lineup mutation passes through.
- `WikiScope.Event` now means "a briefing" — of an event or of a template — so the seventeen existing scope switches needed no third case. `EventWikiContext.event` is null inside a template, which is what the briefing-publish notification and the freeze key off.
- Inside a template the resolver runs with `isEventManager = canEdit(template)` and the read grant is then overridden to true, so the per-page scopes still resolve their inheritance sources for the scope editor while the template ACL decides access.
- Claude decision: the lineup clipboard carries a container, so a position travels between events, between templates and in either direction between the two. Blocking cross-container pastes would have meant hiding paste targets and an extra error path for no security gain — a read share already lets someone copy the whole lineup by creating an event from the template.
- Two container leaks found and closed while auditing: the global wiki's tag route and the global search matched a template's tags (both container columns are what makes a tag global), and `updateWikiPageTags` would have filed a template page's tags globally. `updateWikiPageTags` now reuses `findOrCreateWikiTags`, which the copy path already used.
- A page's briefing scopes are a per-container audit type (`WIKI_PAGE_TEMPLATE_SCOPES_UPDATED`) because the existing one requires an event id; every other wiki page mutation stays container-agnostic as planned.
- @citizen mentions inside a template briefing are suppressed rather than notified: the mention sweep resolves briefing pages through their event and fails closed without one.
- `createEventPosition` gained the parent-container check it never had — a parent from another event used to be accepted and would have stranded the position in the wrong tree.

#### Verification

- Full existing unit + Playwright suites green (proving behavior neutrality for events); new unit tests for the id-map clone and the scope-remapped copy.

### Phase 4: Template CRUD and management UI

The templates section: list with sidebar/table layout, create modal, Stammdaten detail page, soft delete/restore, duplicate.

#### Status

Done.

#### Steps

- Routes under `/app/events/templates` with the "Vorlagen" item in the events module navigation (gated per the access rule); list page = filters sidebar + table with the Name / Besitzer / Persönlich-Geteilt / Aktualisiert / actions columns and cursor or offset pagination consistent with the career table.
- Create action + modal (name, description, cover) registered in CreateContext and the topbar "Neu" menu; requires `event;create`; sets creator = owner, seeds the manager-scoped briefing root page; redirects to the detail page.
- Stammdaten detail page: edit form (name, description, cover, visibility prefill with role selector), details block (created/updated/owner), Danger Zone with confirm-guarded delete and — for deleted templates — restore; update/delete/restore actions gated by the resolver (`canEdit` for content, `canManage` for delete/restore).
- Duplicate action + button ("Duplizieren", career pattern with a name-prefilled modal): copies fields, prefill roles, cover (S3 copy to a duplicator-owned upload), positions tree and briefing tree; drops role shares; duplicator becomes creator + owner; allowed at `canRead`.
- Emit the new audit types for every mutation; `revalidatePath` the templates section.

#### Notes

- The Status filter (Aktiv/Gelöscht/Alle) is offered to everyone, but only ever surfaces rows the visibility fragment already allows: a viewer without a deleted template of their own gets an empty Gelöscht list rather than a hidden filter.
- Duplicating requires the source's positions + briefing loaded through the read path so deleted templates can't be a source.
- The list is unpaginated for now, like the career flow list it follows; templates are per-organizer artefacts, so the row count stays in the tens.
- `EventCoverImageField` learned a `defaultUploadId`, so the same field serves the create form and the template's edit form, where removing the cover has to be expressible.
- The sub-navigation already links Aufstellung, Briefing and Freigabe; those routes land in phases 5 and 6.

#### Verification

- Create → template appears in list and detail; a second user without access sees neither list entry nor detail (404). Edit fields round-trip. Delete → vanishes for others, owner restores via status filter. Duplicate → personal copy with content + cover but without shares; system log rows exist for each mutation.

### Phase 5: Sharing and ownership

The Freigabe tab: role shares in two tiers and ownership transfer that keeps the shares.

#### Status

Done.

#### Steps

- Freigabe tab on the template detail (visible only when `canManageShares`): per-role tier editor (Lesen/Verwenden vs. Bearbeiten, one tier per role — modeled on the career role-access editor), showing current shares with add/remove/change.
- Share-update action gated on `canManageShares`, array-capped, diff-audited with the new shares-updated type.
- Ownership transfer section: `CitizenInput` picker + confirm; action gated on `canManageShares`; updates `ownedById` only (shares untouched), audits previous + new owner; UI communicates that the current owner may lose access.
- Surface the owner and share state read-only on Stammdaten for viewers who cannot manage shares (owner name + Persönlich/Geteilt badge).

#### Notes

- An owner without `eventTemplateShare;manage` gets no Freigabe tab; existing shares keep functioning — only `event;manage` can then change them.
- Transferring to a citizen without `event;create` is allowed (documented decision).
- The Freigabe route 404s rather than 403s without `canManageShares`, so the tab's absence and its inaccessibility look the same.
- The transfer uses a plain modal, not the confirm dialog: the citizen picker opens its option list in a portal the alert dialog's overlay swallows the clicks of.

#### Verification

- Share read/use → target-role user sees the template in list + picker but cannot edit; edit share → can edit content but the Freigabe tab and delete stay hidden and their actions reject direct submissions. Transfer ownership → new owner has full owner rights, previous owner (without any share) loses access entirely while shares persist; audit rows written.

### Phase 6: Template lineup and briefing editing

Wire the generalized editors into the template detail as Aufstellung and Briefing tabs.

#### Status

Done.

#### Steps

- Aufstellung tab: the lineup editor on the template container — create/edit/nest/reorder/duplicate/paste positions with required variants and formatting; no assignment, application or publish controls; mutations emit the new template-position audit types.
- Briefing tab: the event-briefing route set mirrored for the template container (page tree, page view/edit, tags, trash, snapshots), driven by the template ACL; the seeded root page is editable like an event's.
- Template sub-navigation (Stammdaten / Aufstellung / Briefing / Freigabe) with the Freigabe tab conditional on `canManageShares`.

#### Notes

- Read/use viewers see Aufstellung and Briefing read-only (they need to judge a template before using it); edit affordances render only with `canEdit` — same pattern the event lineup uses for non-managers.
- A position row derives "is this staffed at all" from its container, so the template lineup drops the Citizen column and the application control without a prop of its own. The drag targets moved from `showActions && showManage` to plain `showManage` — identical for events, since an event's `showManage` already implies it is not over.
- The four-level position include is now a shared constant instead of being spelled out again for the template lineup.

#### Verification

- Build a nested lineup with variants and a multi-page briefing incl. a position-scoped page inside a template as an edit-share user; a read/use user sees everything read-only; an outsider 404s; system log rows for position mutations carry the template types.

### Phase 7: Event creation from a template

The picker in the create-event modal, prefill, server-side seeding, and the Verwenden entry points.

#### Status

Done.

#### Steps

- tRPC query returning the viewer's usable templates (id, name) plus a per-template prefill payload (description, visibility, role ids, cover preview); add the "Vorlage (optional)" select to the top of the create-event form, prefilling via keyed remount; cover section shows the template cover with replace/remove; start/end stay empty.
- Extend `createEvent` with an optional `templateId` (+ keep-template-cover flag): re-validate read/use at action time; inside the transaction clone the position tree (id map), copy the briefing tree with scope remapping _instead of_ the fresh root seed, and copy the cover into a creator-owned upload when kept; created events start with `lineupEnabled = false`; submitted field values always win.
- Emit the new created-from-template audit type (event id, template id, template name) alongside the unchanged existing creation audit/activity/notification behavior.
- Add "Verwenden" buttons on template rows and detail pages, opening the create-event modal preselected — implemented via the CreateContext payload generalization.

#### Notes

- The template stays detached: no FK, nothing on the event references it afterwards.
- Picker lists only non-deleted, readable templates; a template deleted between prefill and submit fails the action-time check gracefully.
- The template's `name` is both its label in every list and the prefilled event title — the plan's "a template holds a title" and "a template has a name" are the same field, and a second one would only ever drift.
- The prefilled cover cannot travel as an upload id (it belongs to the template, and the action only accepts the submitter's own uploads), so it travels as a `keepTemplateCover` flag; replacing it submits a real id, which wins.
- `CreateContext` gained an optional per-open payload, which is what the "Verwenden" buttons use to preselect a template in the app-wide create-event modal.

#### Verification

- Create an event from a rich template: form prefilled but editable; resulting event has the lineup (unassigned, unpublished), the briefing tree with a position-scoped page pointing at the _event's_ cloned position, the copied cover owned by the creator, and the chosen visibility. Replacing prefilled values sticks. A user without access to the template cannot use its id via direct submission. System log shows both creation entries.

### Phase 8: E2E tests, formatting, changelog

Playwright coverage for the new flows and final polish.

#### Status

Done.

#### Steps

- New Playwright specs (existing local-stack fixtures): template CRUD + access gate; sharing tiers from three viewpoints (read/use, edit, outsider); ownership transfer keeping shares while the old owner loses access; duplicate dropping shares; `event;manage` listing and managing a foreign personal template; delete + restore via status filter; template lineup/briefing editing; event-creation-from-template end-to-end (prefill, seeding, cover, detachment); picker excluding deleted/inaccessible templates.
- `pnpm run format` in `pnpm-monorepo`, full lint/typecheck/unit pass.
- Add the tracked changelog entry (`isTracked: true`, gated to `event;create`, with screenshots of the template detail and the picker).

#### Notes

- Unit tests exist only where logic is critical: the permission resolver, the clone id map, the scope-remapped copy (per test-pyramid guideline).
- The E2E run surfaced a pre-existing app defect rather than a test problem: `SuspenseWithErrorBoundaryTile` caught `notFound()` and rendered its generic error tile, so every 404 raised inside it (the career flow settings page has the same shape) showed "Ein unerwarteter Fehler ist aufgetreten" instead of the 404 page. The boundary now passes Next's control-flow errors on via `unstable_rethrow`.
- Second finding, left alone as out of scope: `CitizenInput` stays in its loading skeleton forever when `citizens.getAllCitizens` fails, which is what a viewer without `citizen;read` gets. Every citizen picker in the app shares this — the ownership transfer is only the newest one.
- No screenshots in the changelog entry: the feature has no single screen that carries it, and the entry links straight to the section.

#### Verification

- Full Playwright suite green including all pre-existing suites (no event/wiki regressions).

### Phase 9: Independent review

Fresh subagents verify the implementation against this plan and the original goal.

#### Status

Done — two fresh reviews ran (plan conformance and security). Both independently found the same two high-severity defects; those and every medium finding are fixed. The remaining findings are recorded below for Simon to accept or reject.

#### Steps

- One fresh review subagent audits the implementation against the plan phase by phase (schema constraints, permission gates on every action, audit coverage, detachment, container leaks between events and templates).
- One fresh security-focused subagent reviews authorization (direct-submission bypasses, IDOR on template/position/page ids across containers, S3 copy path, Zod caps) and the guidelines checklist.
- Findings are triaged with the user and fixed; re-review the fixes.

#### Findings and what was done

Fixed:

1. **The nightly upload cleanup would have deleted every template cover** within ~48 hours, row and S3 object, silently — `Upload.eventTemplateCovers` was missing from the three places that enumerate usage relations. Fixed at the root: the list now lives once in the domain package (`UPLOAD_USAGE_RELATIONS` / `UNUSED_UPLOAD_WHERE`) and both the lambda and the upload manager read it, so the failure mode its own comment warned about ("as happened to `eventCovers`") cannot recur. Covered by a unit test.
2. **A template's briefing root page was not locked.** `isEventWikiRootPage` tested `eventId !== null`, so for templates it said "not a root" and the UI offered rename, move and delete on it — to every EDIT-share holder. Deleting it would have 404'd the whole briefing *including its trash route*, with no way back, and produced broken duplicates and briefing-less events. The check is container-aware now, which also restores the root's INHERIT-scope guard. Covered by an E2E test.
3. **A template with a trashed briefing root produced events with no briefing at all** — `createEvent` skipped the root seed whenever a template context existed, rather than when there was something to copy.
4. **Template lineups could not be reordered.** The drag targets had moved to `showManage` but the drag handle had not, so nothing was draggable and the template branch of the reorder action was unreachable.
5. A copied briefing that is already open now records `briefingPublishedAt` at creation, so a later scope change cannot fire the one-time "briefing published" notification long after the fact.
6. "Verwenden" and "Duplizieren" are hidden from viewers without `event;create`, who could otherwise only reach a forbidden error.
7. The list search term is capped at 255 characters, like the upload manager's.
8. Removed the `CitizenInput` `form` prop again — the transfer ended up not needing it.

Left as they are, for Simon to accept or reject:

- **Duplicating takes only read access, not `event;create`** (the decision log says so), which lets a read-share holder mint templates they own and keep section access after the share is revoked. Both reviewers flagged the tension with "everyone with `event;create` can create personal templates". Adding the gate is a one-line change if you want it.
- **Briefing images and attachments are shared, not copied**, between a template and the events created from it — that is `copyWikiPageSubtree`'s documented behavior everywhere; only the cover is copied because the plan called for it. A template editor deleting such an upload affects events already created.
- **`EventTemplateRoleAccess` has no created/updated-by columns** (and `EventTemplateVisibilityRole` only `createdAt`), matching `FlowRoleAccess` and `EventVisibilityRole` exactly but not the plan's blanket "all new tables follow the created/updated/deleted-by guidelines". The shares-updated audit type carries the diff instead.
- **No database constraint keeps `parentPositionId` inside one container** — the application enforces it at every write, but the CHECK constraints do not. A self-referential constraint would need a trigger.
- **Role ids in the share and prefill editors are existence-checked, not visibility-checked**, exactly as `updateFlowRoleAccess` does it. It only ever widens access to the sharer's own template.
- **`CitizenInput` spins forever when its query fails**, which is what a viewer without `citizen;read` sees. Pre-existing and shared by every citizen picker in the app.

#### Verification

- Both reviews report no open findings that the user has not explicitly accepted.

## Final end-to-end verification

- Fresh local stack: run all migrations, seed sessions, run the complete Playwright suite. — **Done.** Every Playwright run builds its own stack from an empty database and replays all 88 migrations, and the full suite is green with the twelve new template specs alongside the 131 pre-existing ones. Typecheck, lint, both unit suites and the lambda build are green too.
- Manual smoke pass as three users (owner with both permissions, role-shared editor without `eventTemplateShare;manage`, plain `event;read` user): build a full template (fields, cover, nested lineup, multi-page briefing with a position-scoped page), share it in both tiers, transfer ownership, duplicate it, create an event from it and run one sign-up/lineup/briefing cycle on that event; verify Discord events and plain app events behave exactly as before. — **Automated instead of manual:** the E2E specs cover all three viewpoints, both share tiers, the transfer, the duplicate and the creation incl. the remapped position scope, and the pre-existing event, Discord-event and wiki suites prove the untouched behavior. A human pass on the cover upload and the drag-reorder is still worth doing, since neither is exercised end to end.
- Production-mirrored database: run the migration and spot-check that existing events, positions and wiki pages are untouched and both CHECK constraints are active. — **Done locally** against the seeded copy of the production data: the migration applied cleanly and all three CHECK constraints plus the three WikiTag partial indexes are present and reject the invalid row shapes. Production itself is step 2 of the rollout.

## Rollout plan

1. Merge to `main`; ships with the next release. — Not started.
2. Run the production DB migration workflow immediately after the release; verify existing events/briefings render correctly. — Not started.
3. Grant `eventTemplateShare;manage` to a small trial role; build and share one real template, create one real event from it. — Not started.
4. Widen the grant to the intended roles; the tracked changelog entry announces the feature. — Not started.
5. Monitor system log and error tracking for a week; then remove this plan file. — Not started.
