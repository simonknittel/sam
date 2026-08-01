# Wiki System — Implementation Plan

Status: planned (interview completed 2026-07-27), not started.

## 0. Decisions log (from interview)

| Topic | Decision |
| --- | --- |
| Build vs. buy | Build in-repo, glue open-source pieces together (Tiptap v3, Hocuspocus 4, Yjs). No external wiki product. |
| Collab backend | Self-hosted Hocuspocus container, deployed next to Soketi on the core-services Docker host (Traefik + Ansible + Terraform pattern). Server code lives in this monorepo. |
| Save model | Live autosave (Notion-style). The page is the editor; no draft state. Snapshots are created automatically while editing (30-minute cadence); no manual snapshot step. |
| History | Snapshots + one-click restore. No visual diff in v1. |
| Permission inheritance | Nearest explicit setting wins (Notion-style). A child page may be more or less visible than its parent. Redacted breadcrumbs for invisible ancestors. |
| Page-level permission tiers | Three per-page settings, each inheritable: **visibility** (read), **editing**, **admin** (permissions/move/rename/delete). |
| URLs | `/app/wiki/<id>/<slug>` — only the cuid resolves, slug is cosmetic. Internal links store page IDs and never break. |
| Iframes/embeds | Dedicated embed nodes for YouTube/Twitch/Spotify/Google; generic iframes validated against a DB-stored domain allowlist, editable in a `wiki;manage`-gated settings UI. |
| Search | Postgres full-text search (first FTS in the codebase). Permission filtering server-side, no leaks. |
| App-level permissions | `wiki;read` (see app + public pages), `wiki;create` (create top-level pages), `wiki;manage` (wiki admin: settings + page-admin on all pages). Child-page creation is gated by *edit* on the parent. |
| V1 extras | File attachments (non-image uploads) and favorites & recents. Comments and page templates are deferred. |
| Migration | No automatic migration of content, permissions, or similar — no seed script, no role mapping. Only the help app is migrated, re-authored manually by you. The documents app stays live for now. |
| Rollout | Cutover replaces only the help app (route redirects, tile removal) once the help content has been manually re-authored. The documents app and its 28 `documentX` permission resources stay untouched. |
| Page defaults | New top-level pages default to `RESTRICTED` with no roles (≙ private/owner-only) on all three tiers; children default to `INHERIT`. No separate PRIVATE/CREATOR enum values — `RESTRICTED` implicitly includes the source page's owner. |
| Ownership | Pages have a transferable **owner** who holds all implicit permissions; `createdBy` is a pure audit fact with no permission implications — so access can be revoked when members leave or switch departments. Ownership is **inheritable** like the permission tiers: `ownerId = NULL` inherits from the nearest ancestor with an explicit owner. Top-level pages start with the creator as explicit owner; child pages start inheriting. |
| Cascades | Changing any permission setting (visibility/editing/admin) or the owner offers an "auch auf alle Unterseiten anwenden" checkbox that resets the descendants to INHERIT/inherited ownership so they follow the changed setting. |
| Read experience | Readers without edit permission also get realtime content: read-only collab connection, live updates while viewing. |
| Reports | Users can report pages they can see; `wiki;manage` holders triage them via a reports list + app-tile badge + web-push notification (v1). |
| Media access | Images stay public-by-URL (unguessable cuid); file attachments are served via a permission-checked route redirecting to short-lived presigned R2 GET URLs. |
| Trash | `/app/wiki/trash` with restore + permanent delete; auto-purge after 30 days via midnight-automations. |
| JSON export/import | Wiki admins (`wiki;manage`) can export a page's raw Tiptap JSON and import JSON to replace a page's content — full replace, safety snapshot first, reuses the snapshot-restore write path. |
| Demo-content script | Script in `apps/scripts` generates a "live demo page" Tiptap JSON exercising every formatting option/embed; imported manually via the JSON import to author/refresh help pages. |
| Sidebar curation | Per-page `sidebarMode`: VISIBLE / HIDDEN / CHILDREN_HIDDEN. Hiding always takes the whole subtree out of the sidebar; CHILDREN_HIDDEN keeps the page itself visible as the entry point for "dataset" subtrees. Purely cosmetic, no permission implications — hidden pages stay reachable via search, links, tags, favorites and the page-index node. |
| Tags | Global free-form tags (`WikiTag`/`WikiPageTag`), assigned by page editors via an autocompleting combobox (case-insensitive find-or-create prevents duplicates). Tag chips in the page header link to `/app/wiki/tags/<tagId>` — a permission-filtered list of all pages carrying the tag. |
| Page-index node | `wikiPageIndex` block node ("Seitenverzeichnis"): tree mode (root page + max depth, default unlimited) or tag mode (tag set + AND/OR). Resolved per viewer at render time (permission-filtered), ignores `sidebarMode` — the canonical way to surface sidebar-hidden dataset pages. |
| Page links (2026-08-01) | The support-page setting is generalized into a registry of configurable "page links" (`WIKI_PAGE_LINKS`), each stored as `WikiSetting["pageLink:<key>"]` with a picker in the settings UI and a stable redirect URL `/app/wiki/link/<key>` — so future well-known links (not only support) can point at wiki pages. See §10. |
| Text-only blocks | Quotes, table cells and list items hold text only (`paragraph+`; list items additionally allow nested bullet/numbered/task lists so Tab-indentation keeps working), headings hold plain text (`text*` — no page links/mentions/hard breaks), code blocks and collapsible-section titles are text-only leaves. All schema-enforced, so paste/drag'n'drop cannot bypass it; marks/highlighting stay available (except in code blocks); text alignment is blocked in all of them incl. lists (gated TextAlign commands + a guard plugin stripping `textAlign` from paragraphs that land inside). Toolbar, slash menu, gutter palette and edit menu hide/disable the inapplicable actions per context (`getWikiSelectionRestrictions`). |

## 1. Goals & non-goals

**Goals (v1):**

- New integrated app "Wiki" (module `modules/wiki`, routes under `/app/wiki`) replacing the help app. The documents app stays live for now — migrating it into the wiki remains possible later, but is out of scope.
- Hierarchical pages with per-page visibility / editing / admin permissions, inherited from the nearest ancestor with an explicit setting.
- Tiptap v3 editor with realtime collaboration (Yjs + Hocuspocus), live autosave, presence carets.
- Rich content: images, tables, code blocks, task lists, YouTube/Twitch/Spotify/Google embeds, allowlisted generic iframes, internal page links, file attachments.
- Automatic table of contents, permission-aware full-text search, snapshots + restore, favorites & recents.
- Organization for large "dataset" subtrees: per-page sidebar curation (`sidebarMode`), free-form tags with autocomplete + tag list pages, and a configurable page-index node (page tree or tag query) — §18.
- Deep links from the apps overview and the topbar apps popover (replacing the Hilfe tile; the Dokumente tile stays).

**Non-goals (v1, but the data model must not block them):**

- Events/tasks using the same page backend (see §17).
- Custom interactive "rich content components" (polls, charts) — see §17.
- Comments, page templates, visual version diffs, CmdK deep content search.
- Anonymous/unauthenticated access. "Public" always means "any authenticated user holding `wiki;read`".

## 2. Architecture overview

```
Browser ──(HTTPS)── Next.js app on Vercel        ── Postgres (shared)
   │                  • all reads, CRUD, search,          ▲
   │                  • permission resolution,            │
   │                  • JWT minting for collab            │
   └──(WSS)───────  Hocuspocus 4 container  ──────────────┘
                      • core-services host, next to Soketi
                      • verifies JWT, syncs Yjs docs,
                      • persists doc + derived JSON/text
```

- The Next.js app remains the single authority for permissions. The collab server never computes permissions itself — it trusts short-lived JWTs minted by the app and persists documents.
- Every user who can see a page connects to Hocuspocus: editors read-write, readers via a read-only connection (`connection.readOnly`), so viewers see edits live. Static rendering from `WikiPage.content` is still used for the SSR first paint and as the fallback when the collab server is unavailable/unconfigured.
- Soketi stays untouched (still used for release toasts); Hocuspocus is a second, independent service speaking the Yjs protocol.

## 3. Data model (Prisma, `packages/database/prisma/models/wiki.prisma`)

Sketch — final field names during implementation. Per coding guidelines: timestamps over booleans, `created/updated/deleted` columns, soft delete.

```prisma
enum WikiPageNamespace { WIKI }           // later: EVENT, TASK

// RESTRICTED always implicitly includes the creator of the page defining the
// setting; "private"/"creator only" is simply RESTRICTED with an empty role
// list (the UI labels it accordingly).
enum WikiPageVisibility { INHERIT PUBLIC RESTRICTED }
enum WikiPageEditability { INHERIT ALL RESTRICTED }
enum WikiPageAdminability { INHERIT RESTRICTED }
enum WikiPageSidebarMode { VISIBLE HIDDEN CHILDREN_HIDDEN }   // §18 — sidebar curation, not a permission

model WikiPage {
  id          String   @id @default(cuid())
  namespace   WikiPageNamespace @default(WIKI)
  parentId    String?
  parent      WikiPage?  @relation("hierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children    WikiPage[] @relation("hierarchy")
  sortOrder   Int      @default(0)         // manual ordering among siblings
  sidebarMode WikiPageSidebarMode @default(VISIBLE)   // §18

  title       String
  slug        String                        // derived from title, cosmetic only
  iconId      String?                       // uploaded image (like Role.icon)
  icon        Upload?  @relation("icon", ...)

  ydoc        Bytes?                        // Yjs state — source of truth for content
  content     Json?                         // Tiptap JSON derivative (static rendering)
  searchText  String   @default("")         // plain text extracted from content

  visibility  WikiPageVisibility  @default(INHERIT)
  editability WikiPageEditability @default(INHERIT)
  adminability WikiPageAdminability @default(INHERIT)
  roleAccess  WikiPageRoleAccess[]

  // Effective owner = nearest explicit owner up the chain (NULL = inherit;
  // NULL at the root = no owner, wiki;manage only). Top-level pages start
  // with the creator as owner, children start inheriting. Transferable by
  // page admins. createdBy is a pure audit fact.
  ownerId   String?
  owner     Entity?  @relation("owner", ...)

  createdAt DateTime @default(now())
  createdById String?
  createdBy  Entity? @relation("createdBy", ...)   // audit only, no permissions
  updatedAt DateTime @updatedAt
  updatedById String?
  deletedAt DateTime?
  deletedById String?

  snapshots  WikiPageSnapshot[]
  favorites  WikiPageFavorite[]
  visits     WikiPageVisit[]
  reports    WikiPageReport[]
  tags       WikiPageTag[]
}

enum WikiPageAccessType { READ EDIT ADMIN }

model WikiPageRoleAccess {
  id     String @id @default(cuid())
  pageId String
  page   WikiPage @relation(..., onDelete: Cascade)
  roleId String
  role   Role @relation(..., onDelete: Cascade)
  type   WikiPageAccessType
  @@unique([pageId, roleId, type])
}

enum WikiPageSnapshotKind { AUTO MANUAL }

model WikiPageSnapshot {
  id        String @id @default(cuid())
  pageId    String
  page      WikiPage @relation(..., onDelete: Cascade)
  kind      WikiPageSnapshotKind
  name      String?              // for MANUAL (Cmd+S prompt)
  content   Json                 // Tiptap JSON at snapshot time
  createdAt DateTime @default(now())
  createdById String?
}

model WikiPageFavorite {
  userId String
  pageId String
  createdAt DateTime @default(now())
  @@id([userId, pageId])
}

model WikiPageVisit {
  userId String
  pageId String
  lastVisitedAt DateTime
  @@id([userId, pageId])
}

model WikiTag {
  id        String @id @default(cuid())
  name      String @unique       // display casing from first use; actions match case-insensitively (find-or-create)
  createdAt DateTime @default(now())
  createdById String?
  pages     WikiPageTag[]
}

model WikiPageTag {
  pageId String
  page   WikiPage @relation(..., onDelete: Cascade)
  tagId  String
  tag    WikiTag @relation(..., onDelete: Cascade)
  createdAt DateTime @default(now())
  createdById String?
  @@id([pageId, tagId])
}

model WikiPageReport {
  id        String @id @default(cuid())
  pageId    String
  page      WikiPage @relation(..., onDelete: Cascade)
  message   String                         // required free text, max 2048 (Zod)
  createdAt DateTime @default(now())
  createdById String
  createdBy User @relation(...)
  resolvedAt DateTime?                     // timestamp-over-boolean, per guidelines
  resolvedById String?
  resolutionComment String?
}

model WikiSetting {                        // pattern like SilcSetting
  key   String @id                         // e.g. "iframeAllowlist", "supportPageId"
  value Json
  updatedAt DateTime @updatedAt
  updatedById String?
}
```

Notes:

- **`ydoc` is the source of truth** for content; `content` (Tiptap JSON) and `searchText` are derivatives updated by the collab server on every store (and by server actions for non-collab writes like restore).
- `parentId` uses `onDelete: Restrict` — deleting a page with children requires deleting/moving children first (UI offers "delete subtree" which soft-deletes recursively).
- Soft delete: `deletedAt` set; subtree queries always filter `deletedAt: null`. Trash view (§14) restores or permanently deletes; the midnight-automations lambda purges pages deleted >30 days ago.
- Search index: the Prisma schema cannot express a generated tsvector column. After `pnpm run migrate:dev --create-only`, append to the generated migration:
  `CREATE INDEX ... ON "WikiPage" USING GIN (to_tsvector('german', "title" || ' ' || "searchText"));`
  (Same expression used at query time via `$queryRaw`.) Per AGENTS.md, you run the migration commands yourself; the plan only calls out the manual SQL addition.
- `Upload` model gets nullable `size Int?` and `wikiPageId String?` columns — the wiki assign branch (§13) links attachments to their page so the presigned-GET route can permission-check against it.

## 4. Permission model

Two layers, matching "general access via permission strings, detail at page level":

**App level** (existing `resource;operation` machinery — add resource literal `wiki` to `PermissionSet.tsx`):

- `wiki;read` — see the app (tile, CmdK), read PUBLIC pages, use search/favorites/recents.
- `wiki;create` — create top-level pages.
- `wiki;manage` — wiki admin: settings UI (iframe allowlist, support page), plus implicit ADMIN on every page (covers "creator left" and lockout recovery).

**Page level** (custom resolution over `WikiPage` + `WikiPageRoleAccess`):

Effective setting per tier = walk up from the page to the root; the first non-`INHERIT` value wins. Top-level pages must not be `INHERIT` (enforced at create; defaults below). Resolution:

- visibility: `PUBLIC` → any user with `wiki;read`; `RESTRICTED` → owner of the page that supplied the setting, or ≥1 role in that page's `READ` role set.
- editability: `ALL` → any user with `wiki;read`; `RESTRICTED` → source owner or `EDIT` role set.
- adminability: `RESTRICTED` → source owner or `ADMIN` role set.
- "Private"/"owner only" is not a separate value: it is `RESTRICTED` with an empty role list (the UI labels that case "Privat"). Since `RESTRICTED` implicitly includes the source page's owner, subtree owners keep access to inheriting descendants.
- **Ownership:** inheritable like the tiers — a page's *effective owner* is the nearest explicit owner up the ancestor chain (`ownerId = NULL` means inherit; NULL at the root means no owner). The effective owner always has all three tiers. Top-level pages start with the creator as explicit owner; child pages start inheriting, so creating a page in someone's subtree does not fragment ownership. Transfer by page admins (the effective owner implicitly is one) or `wiki;manage`. The creator has *no* implicit permissions — when a member leaves or switches departments, transferring ownership (or just their subtree root's ownership) fully revokes their implicit access. Pages whose effective owner resolves to nothing (deleted Entity, ownerless root) fall back to `wiki;manage`-only.
- Implicit grants regardless of settings: the page **owner** always has all three tiers on their own page; `wiki;manage` holders always have all three on every page; the existing admin escape hatch (`user.role === "admin"` + `enable_admin` cookie) bypasses everything, same as `authorize()` does.
- edit ⇒ read and admin ⇒ edit ⇒ read (a tier implies the ones below it) to avoid unusable configurations.

Implementation: `modules/wiki/utils/resolvePagePermissions.ts`, a pure function over `(pages: {id,parentId,visibility,editability,adminability,createdById,roleAccess}[], userRoleIds, appPermissions)` with exhaustive vitest coverage (the wiki's equivalent of `comparePermissionSets.test.ts`). Queries fetch the full page tree (id/parent/permission fields only — cheap at expected scale, hundreds of pages), wrapped in React `cache()` + `withTrace`, and everything (tree sidebar, breadcrumbs, search filtering, move targets) derives from one resolved structure per request.

"Nearest setting wins" consequences handled explicitly:

- A user may see a page whose ancestors they cannot see: the tree sidebar shows only visible pages but keeps visible descendants reachable by flattening them under the nearest visible ancestor. (No breadcrumbs — the always-visible sidebar tree covers orientation.)
- Moving a subtree never silently changes effective permissions of pages with explicit settings; pages set to `INHERIT` change with their new ancestor chain — the move dialog warns when the effective visibility of moved `INHERIT` pages would widen.

## 5. Realtime collaboration

**New workspace app: `pnpm-monorepo/apps/collab`** (`@sam-monorepo/collab`):

- Node 24 + TypeScript, `@hocuspocus/server` v4, `yjs`, `y-prosemirror` (Y.Doc ⇄ ProseMirror via `yXmlFragmentToProseMirrorRootNode`), `jose`, `@sam-monorepo/database` for Prisma access, and `@sam-monorepo/wiki-editor` — the shared workspace package holding the editor extensions/schema and text extraction, so app and collab server can never drift apart.
- Hooks:
  - `onAuthenticate` — verifies a short-lived JWT (HS256, shared secret `COLLAB_JWT_SECRET`), claims: `userId`, `pageId` (= document name), `canEdit`. Rejects mismatched document names; sets `connection.readOnly = !canEdit`.
  - `onLoadDocument` — loads `WikiPage.ydoc`; if null (page predates collaboration), seeds the Y.Doc from the stored content JSON using the shared schema.
  - `onStoreDocument` (debounced 2–5 s) — persists `ydoc` (encoded state), regenerates `content` JSON + `searchText` (plain-text walk over the JSON), sets `updatedAt/updatedById`.
  - `onDisconnect` — when the last client leaves, trigger the auto-snapshot check (§9) and write one `WIKI_PAGE_UPDATED` audit event per user editing session (not per keystroke).
- Internal HTTP endpoint (shared-secret header) for the app to push a "replace document content" command on snapshot restore, so connected clients converge (§9).
- Known limitation (accepted): permission revocation applies on next reconnect, not mid-session. JWTs are minted per page load with a short TTL (~60 s validity for connecting; the session lives as long as the socket).

**Next.js side:**

- Server action / route mints the JWT for every user who can see the page (claims: `userId`, `pageId`, `canEdit`); the page component passes `NEXT_PUBLIC_COLLAB_URL` + token to the editor. Readers connect read-only and receive live updates.
- `@hocuspocus/provider` + `@tiptap/extension-collaboration` + `@tiptap/extension-collaboration-caret` (presence carets with citizen handle + color; carets only shown for users who can edit).
- Env vars (all optional at runtime per coding guidelines): `COLLAB_JWT_SECRET`, `NEXT_PUBLIC_COLLAB_URL`. If unset, editors degrade to single-user mode with debounced autosave through a server action and readers get static content only — this is also the local-dev default and keeps Vercel preview deployments functional without the collab server.

**Deployment (core-services repo, mirrors Soketi):**

- Dockerfile in `apps/collab`; GitHub Actions workflow builds and pushes `ghcr.io/simonknittel/sam-collab` on release.
- core-services: `ansible/hocuspocus.yml` + `roles/hocuspocus/templates/compose.yml.j2` (Traefik labels incl. the `crowdsec@file` middleware, `internal_traefik_network`, host e.g. `sam-collab.simonknittel.de`), `terraform/hocuspocus.tf` (Cloudflare CNAME, PagerDuty service + dependency, UptimeRobot monitor). Needs `DATABASE_URL` (same Postgres as the app) and `COLLAB_JWT_SECRET`.
- Local dev: `pnpm dev` in `apps/collab` (optionally add a service to the root `compose.yml` later).

## 6. Editor (Tiptap v3, all MIT/free)

Component: `modules/wiki/components/PageEditor.tsx` (client). Extensions:

| Concern | Extension |
| --- | --- |
| Base marks/nodes | `StarterKit` (v3 bundles link + underline; disable its history — undo/redo comes from Collaboration/Yjs) |
| Collab | `Collaboration`, `CollaborationCaret` |
| Tables | `@tiptap/extension-table` kit |
| Code blocks | `@tiptap/extension-code-block-lowlight` + `lowlight` |
| Images | `@tiptap/extension-image` + `@tiptap/extension-file-handler` (paste/drop → existing `useUpload` flow → R2 URL) |
| Attachments | custom `Attachment` node (file card: name, size, download) using the extended upload API (§13) |
| YouTube | `@tiptap/extension-youtube` |
| Twitch / Spotify / Google Docs, Sheets, Slides | custom iframe-based nodes with fixed, hardcoded host patterns + URL→embed-URL normalization; inserted via paste detection and a slash/insert menu |
| Generic iframe | custom node; `src` host validated against the DB allowlist (client hint + hard server-side validation in the collab server's store hook is *not* possible per-keystroke, so validation happens at node insertion via server action check + at static render time the host is re-checked and blocked if no longer allowlisted) |
| Internal page links | custom suggestion (typing `[[` or via slash menu) searching visible pages, storing `pageId`; renders the current title reactively; pasting an `/app/wiki/<id>/...` URL converts to the node |
| Citizen mentions | custom `wikiCitizenMention` node + suggestion (typing `@` or via slash menu) searching all citizens (tRPC `getAllCitizens`), storing `citizenId` plus the handle at insertion time as label fallback and search text; renders the current handle (resolved server-side per page for the mentioned ids) as a link to `/app/spynet/citizen/<id>` |
| TOC anchors | `@tiptap/extension-unique-id` (stable heading IDs) + `@tiptap/extension-table-of-contents` |
| Block UX | `@tiptap/extension-drag-handle-react`, `Placeholder`, `TaskList`/`TaskItem`, `Details` (collapsible sections) |
| Grid layouts | custom `wikiGrid`/`wikiGridCell` nodes: 2–4 columns side-by-side via CSS grid, stacked on mobile |
| Slash commands | Notion-like "/" menu (`@tiptap/suggestion`): filterable block palette (`/h1`, `/tabelle`, `/raster`, …) with keyboard navigation |
| Highlighting | `@tiptap/extension-highlight` (multicolor inline text marker) + custom `wikiCallout` node (blocks with colored background/border: neutral/blue/green/yellow/red) |
| Page index | custom `wikiPageIndex` block node (§18): lists pages by subtree or tag query, resolved per viewer at render time; configured via the edit-menu overlay, inserted via slash menu (`/verzeichnis`) |

Hotkeys: Tiptap defaults cover bold/italic/underline/code/undo/redo etc.; add `Cmd+K` → link dialog (`Cmd+S` just flushes the autosave — snapshots are automatic). Page-level shortcuts via the already-present `react-hotkeys-hook`.

Toolbar: fixed top toolbar + bubble menu for selections; German labels, matching existing form/Button components. Only rendered for users with edit permission.

## 7. Read view & table of contents

- Everyone who can see a page mounts the same collab-connected Tiptap component: users **with** edit permission get the always-editable Notion-style editor; users **without** get `editable: false` plus a read-only Hocuspocus connection, so they watch content change live.
- First paint: the server renders `WikiPage.content` via `@tiptap/static-renderer` (React components mapped per node type — same visual components as the editor node views where possible); the client then swaps in the collab-connected component once the provider has synced. The static renderer is also the full fallback when the collab server is unreachable or unconfigured.
- TOC: right-hand sticky sidebar generated from the headings (editor: TOC extension; static view: walk the JSON). Replaces the hand-maintained `modules/help/components/TableOfContents.tsx` pattern; heading anchors deep-link via the unique IDs.

## 8. Search

- Query path: server action → `$queryRaw` with `websearch_to_tsquery('german', $q)` (plus a `:*` prefix term on the last word so search-as-you-type matches partial words) against `to_tsvector('german', title || ' ' || searchText)` (expression GIN index from §3), `deletedAt IS NULL`, ranked with `ts_rank`, limit ~50 → filter the candidate IDs through the request's resolved permission structure → return only visible pages (title, breadcrumb, `ts_headline` snippet). No leakage: filtering happens server-side before the response.
- UI: search field at the top of the wiki sidebar + on the wiki landing page; results show breadcrumb + snippet.
- Later (not v1): CmdK nested search page like the existing Spynet one.

## 9. Snapshots, restore & JSON export/import

- **Automatic (no manual step):** before stored content is overwritten — in the single-user autosave action and in the collab server's store hook — the previous state is preserved as an `AUTO` snapshot when the newest snapshot of the page is older than 30 minutes and the content changed. Any state is snapshotted right before edits replace it, so a restore point at most 30 minutes behind always exists. Retention: keep the latest 50 `AUTO` snapshots per page.
- **Safety snapshots:** restore and JSON import first preserve the current state as a named `MANUAL` snapshot (kept forever, immune to AUTO retention) — the undo path.
- **Restore:** snapshots list at `/app/wiki/<id>/snapshots` (page-admin only). Restore = server action that (1) writes `content`/`searchText`, (2) regenerates `ydoc` via `TiptapTransformer.toYdoc` when no session is live, or (3) calls the collab server's internal replace endpoint when a session is live so connected editors converge. An automatic safety snapshot of the pre-restore state is created first.

**JSON export/import (wiki admins only, gated `wiki;manage` — not page admins):**

- **Export:** action in the page menu → route handler (e.g. `/api/wiki/[pageId]/export`) that re-checks `wiki;manage`, then serves the page's current Tiptap JSON (`WikiPage.content`) as a download (`<slug>.json`, `Content-Disposition: attachment`). Read-only, no audit event.
- **Import:** dialog with a file input (page menu) → server action that (1) validates the uploaded JSON against the shared `@sam-monorepo/wiki-editor` schema — reject unknown node/mark types and re-validate generic-iframe hosts against the allowlist, since import bypasses insertion-time validation, (2) creates an automatic safety snapshot of the current state, (3) **fully replaces** the page content through the same write path as snapshot restore above (`content`/`searchText` + `ydoc` regeneration, or the collab replace endpoint when a session is live). No merge semantics. Audit event `WIKI_PAGE_CONTENT_IMPORTED`.
- Use cases: content backup/transfer between pages or environments, and the target for the demo-content script (§15).

## 10. Wiki settings (`/app/wiki/settings`, gated `wiki;manage`)

- **Iframe allowlist:** editable domain list (add/remove, stored in `WikiSetting.iframeAllowlist`). Used by the generic-iframe node validation and re-checked at static render time.
- **Page links (generalized support page, 2026-08-01):** registry `WIKI_PAGE_LINKS` (`modules/wiki/utils/wikiPageLinks.ts`) of well-known app locations that link to a configurable wiki page; v1 has one entry, `support`. Each entry gets a page picker in the settings ("Verknüpfte Seiten" tile), stored as `WikiSetting["pageLink:<key>"]` (replaces `supportPageId`; no data migration — pre-release). Server components resolve via `getWikiPageLinkTarget(key)` (null when unset, page deleted, or viewer lacks `wiki;read` — links hide then); client components and i18n strings use the stable redirect URL `/app/wiki/link/<key>`, which falls back to `/app/wiki` when unset. The `support` link replaces the hardcoded `/app/help/support` links (topbar question-mark icon, mobile account row, error boundary, external-app info page).

## 11. Favorites & recents

- Star toggle on every page → `WikiPageFavorite`; `WikiPageVisit` upserted on page view (throttled to once per page per hour).
- Wiki landing page (`/app/wiki`) shows favorites, recently visited, and recently updated (visible pages only); sidebar pins favorites on top.

## 12. Page reports

- Every page a user can see gets a "Seite melden" action (page menu) → modal with a required free-text reason → server action creates a `WikiPageReport` (rate-limited: max ~5 open reports per user).
- Triage: `/app/wiki/reports` (gated `wiki;manage`) lists open reports with page link, reporter, reason, and a resolve action (optional resolution comment). Resolved reports stay queryable (timestamps, no deletion).
- Visibility of open reports: the wiki app tile shows a dot badge for `wiki;manage` holders via the existing `appDotBadgeCounts` mechanism (same pattern as the changelog badge), plus a counter inside the wiki sidebar.
- Reporting does not auto-hide or lock the page — action stays a human decision (admins can restrict visibility manually via the permissions dialog).
- **Web-push (v1):** the report-create action triggers a notification through the existing pipeline (`triggerNotification` → EventBridge → SQS → notification-router lambda). New `NotificationType` (e.g. `wikiPageReported`) in `modules/notifications/utils/NotificationTypes.ts` + a new lambda type-handler in `apps/lambda/src/notification-router/type-handlers/` that resolves recipients as users whose roles grant `wiki;manage` (via `PermissionString` → `Role` → `RoleAssignment`), filtered by their `NotificationSetting` opt-in and existing `WebPushSubscription`s. Payload links directly to `/app/wiki/reports`.

## 13. Uploads & attachments

- Extend `POST /api/upload` beyond `image/*`: accept an additional allowlist (`application/pdf`, common archive/office types), max size (default 25 MB), persist `size`. Keep the image-only restriction for callers that need it via a param or separate schema branch.
- Extend `PATCH /api/upload/assign` (or add a wiki-specific action) with a `wikiPage` branch requiring edit permission on the target page, setting `Upload.wikiPageId`.
- **Page icons** are uploaded images (`WikiPage.iconId` → `Upload`, like `Role.icon`), set via the existing `ImageUpload`/`useUpload` flow by anyone with edit permission; rendered in the tree sidebar, breadcrumbs, and page header. Public-by-URL like all images.
- **Serving:** images render inline from `NEXT_PUBLIC_S3_PUBLIC_URL` (public-by-URL, unguessable cuid — accepted trade-off). File attachments are **not** public: the `Attachment` node links to a route handler (e.g. `/api/wiki/attachment/[uploadId]`) that checks the current user's visibility on `Upload.wikiPageId`'s page, then redirects to a short-lived (~5 min) presigned R2 GET URL.

## 14. Routes & navigation integration

Routes (module `modules/wiki`, routes `src/app/app/wiki/`):

- `/app/wiki` — landing: search, favorites, recents; tree sidebar layout for all wiki routes. Sidebar: home link ("Wiki") as top-most entry, one "Neue Seite" button (parent defaults to the currently open page, changeable via dropdown incl. "Oberste Ebene"), per-row reorder buttons (hover) for page admins. The "Papierkorb" link lives only in the layout top navigation.
- `/app/wiki/[pageId]` and `/app/wiki/[pageId]/[slug]` — page view/editor (canonical redirect to current slug); `authorizePage("wiki", "read")` + page-level visibility check (`forbidden()`/`notFound()` semantics: invisible = 404 to avoid existence leaks).
- `/app/wiki/[pageId]/snapshots` — history + restore (page admin).
- `/app/wiki/reports` — open/resolved reports triage (gated `wiki;manage`), §12.
- `/app/wiki/tags/[tagId]` — permission-filtered list of all pages carrying the tag (gated `wiki;read`), §18; linked from the tag chips in page headers.
- `/app/wiki/trash` — deleted pages (visible to `wiki;manage` + each page's admins) with restore and permanent-delete actions; auto-purge >30 days via midnight-automations.
- `/app/wiki/settings` — §10.

Page actions (all via `createAuthenticatedAction`): create (top-level: `wiki;create`; child: edit on parent), rename, move (admin on page + edit on new parent), change permissions incl. ownership transfer (admin, one dialog), sidebar-mode change (admin, §18), tag assign/remove (edit, §18), delete/restore-from-trash (admin), favorite toggle, snapshot create/restore, JSON export/import (`wiki;manage`, §9), report create (visibility on page) / resolve (`wiki;manage`), settings update.

**Cascade checkboxes:** every permission change (visibility/editing/admin) and the ownership transfer offer an "Auch auf alle Unterseiten anwenden" checkbox. Semantics are uniform: descendants are reset to `INHERIT` (tiers) / inherited ownership (`ownerId = NULL`), so they follow the changed setting and stay attached to it for future changes. Cascades only touch descendants the acting user has admin on — pages with foreign explicit settings inside the subtree are listed in the dialog and skipped unless the actor has admin there too.

Navigation wiring (cutover release; documents app untouched):

- `INTEGRATED_APPS.ts`: remove `Hilfe` (keep `Dokumente`); add `{ name: "Wiki", slug: "wiki", href: "/app/wiki", permissionStrings: ["wiki;read"], tags: ["featured"] }` + `modules/wiki/assets/screenshot.png`.
- CmdK `List.tsx`: remove the help entry; add wiki entry with `authKey: "wiki"`.
- No `/app/help` redirects (decision 2026-08-01: no backwards compatibility for the removed help app — old `/app/help/*` URLs, incl. the 2025-10-02 changelog entry link, simply 404).
- Permission admin surfaces: add a small "Wiki" section (3 strings) to `PermissionMatrix.tsx` and a tab/section in `modules/roles/components/tabs/`. `DocumentsTab.tsx` and the 28 `documentX` matrix entries stay.
- `PermissionSet.tsx`: add `wiki`; the 28 `documentX` resource literals stay.

## 15. Cutover (help app only — no automatic migration)

No automatic migration of any content, permissions, or similar: no seed script, no role mapping, no generated page trees. The documents app stays live and untouched; only the help app is replaced, and its content is re-authored manually by you.

Order of operations:

1. Schema migration (new tables; nothing dropped) — existing `production-database-migrations.yml` flow.
2. Collab server deployed in core-services beforehand (it is inert until the app ships).
3. Wiki ships (phases 1–8) while the help app is still live. Manual work (yours): author the help content as wiki pages (demo-content script + JSON import where useful), create a support page and set `WikiSetting.supportPageId`, and fill the iframe allowlist via the settings UI as needed.
4. Cutover release once the re-authoring is done: remove the help module (no redirects — old `/app/help` URLs 404), rewire navigation (§14), changelog entry in `modules/changelog/entries.tsx` + new screenshot asset.

The documents app: untouched in v1. Migrating it into the wiki later stays possible but is a separate decision; nothing in this plan depends on it.

**Demo-content script (`apps/scripts`):**

- Generates the Tiptap JSON for a "live demo page" exercising every supported feature: all heading levels, every text mark (bold, italic, underline, strikethrough, inline code, multicolor highlight, links), bullet/ordered/task lists, blockquote, horizontal rule, code blocks with syntax highlighting, tables, collapsible details, 2–4-column grids, callouts in every color, images, YouTube/Twitch/Spotify/Google embeds, an allowlisted generic iframe, internal page links, a page-index node in both modes, and a file attachment card.
- Depends on `@sam-monorepo/wiki-editor` and validates the generated doc against the shared schema before writing, so the script fails loudly when extensions change instead of silently drifting out of date.
- Nodes referencing real records (internal-link page IDs, image/attachment upload IDs, iframe hosts) are parameterized via CLI flags with documented placeholder defaults you replace after import.
- Output: a JSON file you import via §9's import dialog to create/refresh help pages — e.g. a "Formatierungsoptionen" page that documents the editor for users and doubles as a manual regression check (one page rendering every node type in both the editor and the static renderer).

## 16. Audit events & notifications

New immutable `AuditEventType`s: `WIKI_PAGE_CREATED`, `WIKI_PAGE_UPDATED` (one per user editing session), `WIKI_PAGE_MOVED`, `WIKI_PAGE_PERMISSIONS_UPDATED`, `WIKI_PAGE_OWNERSHIP_TRANSFERRED`, `WIKI_PAGE_DELETED`, `WIKI_PAGE_RESTORED` (trash), `WIKI_PAGE_SNAPSHOT_RESTORED`, `WIKI_PAGE_CONTENT_IMPORTED`, `WIKI_PAGE_REPORTED`, `WIKI_PAGE_REPORT_RESOLVED`, `WIKI_PAGE_SIDEBAR_MODE_UPDATED`, `WIKI_PAGE_TAGS_UPDATED` (one per assign/remove action), `WIKI_SETTINGS_UPDATED`. Cascaded permission/ownership changes write one event per affected page. Upload events reuse `UPLOAD_CREATED`.

Notifications: v1 signals open reports to `wiki;manage` holders via the app-tile dot badge **and** web-push through the existing notification-router (§12). Watch/subscribe on pages remains a later candidate.

## 17. Future reuse (design constraints honored now)

- **Events & tasks:** `WikiPage.namespace` exists from day one. Later, `EVENT`/`TASK` namespaces plus a nullable owner relation (e.g. `eventId`) attach page trees to an event; the events UI mounts the same `PageEditor`/static renderer and permission resolver with a different root context and its own routes — visually outside the wiki app, as required. Event managers replace the Discord-synced description with rich pages without the 4-minute scrape overwriting them (the scrape only touches `Event.description`).
- **Rich content components:** Tiptap React NodeViews + a node-type registry in `modules/wiki`. Each custom component is a node with attrs (config) rendering a React component that may fetch app data via tRPC/server components. The static renderer needs a matching component per node type — the registry keeps editor and static rendering in lockstep.
- **Comments, templates, diffs, CmdK content search, watch-notifications:** explicitly deferred; nothing in the schema blocks them (snapshots already store full JSON for future diffing).

## 18. Page organization: sidebar curation, tags & page-index node

Added 2026-07-30 — supports "dataset" subtrees with many child pages that would overwhelm the tree sidebar.

**Sidebar curation (`WikiPage.sidebarMode`):**

- Enum `VISIBLE` (default) / `HIDDEN` / `CHILDREN_HIDDEN`. A page appears in the tree sidebar iff its own mode is not `HIDDEN` and no ancestor is `HIDDEN` or `CHILDREN_HIDDEN` — hiding always takes the whole subtree out of the sidebar. `CHILDREN_HIDDEN` keeps the page itself visible as the dataset's entry point (typically hosting a page-index node) while all current *and future* children stay hidden with a single switch.
- Purely cosmetic, not a permission: hidden pages stay fully reachable via direct links, internal page links, search, favorites (a favorited hidden page still shows in the sidebar's favorites block), recents, tag pages and the page-index node; they remain selectable in the move dialog and the "Neue Seite" parent dropdown.
- Interplay with the §4 flattening rule: sidebar hiding wins — permission-visible descendants inside a sidebar-hidden subtree are not flattened upward.
- Toggled by **page admins** (three-option control in the page menu); implemented as a filter step over the per-request resolved tree structure (§4), so the sidebar — and only the sidebar — honors it.

**Tags:**

- Global free-form labels: `WikiTag` (globally unique name) + `WikiPageTag` join. Assign/remove requires **edit** permission on the page; chips render in the page header for everyone who can see the page.
- Input: combobox in the page header (chips + text field). Autocomplete queries existing tag names case-insensitively (debounced); Enter creates a new tag only when nothing matches, and the server action re-checks case-insensitively (find-or-create) so `Mining`/`mining` can never coexist. Zod: trimmed, inner whitespace collapsed, 1–50 chars.
- Clicking a chip → `/app/wiki/tags/[tagId]`: all pages carrying the tag that the viewer can see (icon, title, ancestor path — same presentation as search results); invisible pages are silently omitted, an empty result shows a neutral empty state.
- Autocomplete suggests all existing tag names regardless of where they are used — a deliberate, name-only metadata leak (§20).
- Lifecycle: removing a tag's last assignment deletes the tag (keeps autocomplete clean); the midnight trash-purge automation also sweeps orphaned tags left behind by permanent page deletion (assignments themselves cascade-delete). Tags are not part of the FTS index in v1.

**Page-index node (`wikiPageIndex`, "Seitenverzeichnis" — not to be confused with the heading-based TOC of §7):**

- The first §17-style rich-content component: a block node whose attrs are pure config; the page list is resolved per viewer at render time and never stored in the document.
- Attrs: `mode: "tree" | "tags"`. Tree mode: `rootPageId` (page picker, defaults to the current page) + `maxDepth` (`null` = unlimited, default; `1` = direct children only). Tag mode: `tagIds: string[]` + `matchMode: "all" | "any"` (AND = page must carry all selected tags, OR = any; default `"all"`).
- Tree mode renders the descendant tree as nested links (icon + title, sibling `sortOrder`), **ignoring `sidebarMode`** — this node is the canonical way to surface hidden dataset pages. Tag mode renders a flat list sorted by title.
- Rendering: the editor NodeView fetches the list from the server (permission-filtered server-side); the static renderer resolves it from the request's resolved permission structure. Both only ever return pages the viewer can see, so different viewers may see different lists. Refresh happens on mount/attr change only — no realtime page-list updates in v1.
- Config via the WikiEditMenu overlay (mode switch, page picker, depth, tag multi-select, AND/OR toggle); insertion via the slash menu (`/verzeichnis`, `/seitenliste`). A deleted/invisible root page or an empty result renders a neutral "Keine Seiten" placeholder without leaking titles.

## 19. Implementation phases

Each phase is shippable to `develop` behind the unfinished app (the tile only appears once `INTEGRATED_APPS` is wired in phase 9).

1. **Foundation:** Prisma models + migration; `wiki` resource literal; permission matrix/tab entries; `resolvePagePermissions` + vitest suite; module scaffolding.
2. **Pages CRUD:** tree sidebar, create/rename/move/delete (soft), trash view + restore + purge automation, permissions dialog (3 tiers, role multi-select), sibling reordering.
3. **Editor, single-user:** Tiptap with all extensions except collab; debounced autosave via server action; static read view via static-renderer; TOC.
4. **Collab:** `apps/collab` app + Dockerfile + CI image build; JWT minting; provider wiring + presence carets; core-services Ansible/Terraform (separate repo PR).
5. **Embeds & files:** dedicated embed nodes, generic iframe + allowlist validation, settings UI, upload API extension, attachment node + presigned-GET route, internal page links.
6. **Search, favorites/recents, reports:** FTS index + query + UI; favorite/visit models + landing page; report modal, triage list, tile badge; web-push wiring (new `NotificationType` + lambda type-handler + `NotificationSetting` entry).
7. **Organization (§18):** `sidebarMode` + sidebar filtering; tag models, header combobox, tag list pages, orphan-tag cleanup in the purge automation; `wikiPageIndex` node (NodeView + static renderer + edit-menu config + slash-menu entries).
8. **Snapshots:** automatic snapshots, list + restore, safety snapshot, collab replace endpoint; JSON export/import for `wiki;manage` (§9, shares the restore write path).
9. **Cutover:** demo-content script (§15 — needs the phase-5 node types and the phase-7 page-index node), manual help re-authoring (yours, not code), remove the help module (documents app stays), `/app/help` redirects, `INTEGRATED_APPS`/CmdK/topbar rewiring, changelog entry, screenshots, Playwright smoke tests (create/read/permission-deny). No seed script, no permission migration.
   *Status 2026-08-01:* help module removed without redirects (old `/app/help/*` URLs 404 — no backwards compatibility), Hilfe tile removed, CmdK wiki entry added (`authKey` on `wiki;read`), all four support links wired to the `support` page link (§10). Still open: help re-authoring, demo-content script, changelog entry, wiki screenshot for the apps overview (`INTEGRATED_APPS` entry has no `imageSrc` yet), Playwright smoke tests.

## 20. Defaults I chose — flag if you disagree

- New **top-level** pages default to `RESTRICTED` with an empty role list (≙ private/owner-only) on all three tiers (decided in interview); children default to `INHERIT` on all three.
- Cascade semantics: cascades reset descendants to `INHERIT` (tiers) / inherited ownership (owner) rather than copying explicit values — equivalent effect, keeps future inheritance attached.
- Child pages default to **inherited ownership**: creating a page inside someone's subtree does not make the creator its owner — they act under the subtree owner's rules. Only top-level pages make their creator the explicit owner.
- Tier implication: admin ⇒ edit ⇒ read (no "can edit but not read" configs).
- Invisible pages return **404**, not 403, to avoid leaking existence.
- Reports: not anonymous (admins see the reporter), free-text reason required, multiple reports per page allowed, max ~5 open reports per user, resolving never auto-changes the page itself.
- Page titles are a separate DB field with a rename action — not realtime-collaborative; concurrent viewers see a renamed title on next navigation.
- Attachment presigned GET URLs expire after ~5 minutes; trash auto-purges after 30 days.
- Auto-snapshot cadence 30 min / retention 50; safety snapshots (before restore/import) are kept forever.
- Attachment mime allowlist starts with PDF + office + archives, 25 MB cap.
- FTS uses the `german` config (content is German); revisit if English content grows.
- Audit granularity for content: one event per user editing session, not per save.
- JSON export/import is `wiki;manage`-only, not page-admin: import injects arbitrary node structures (bypassing insertion-time UX validation), so it stays a wiki-admin tool; page admins keep snapshots/restore for content recovery.
- Import fully replaces the page content (no merge); the automatic safety snapshot is the undo path.
- UI copy in German, matching the rest of the app.
- Collab JWT TTL ~60 s (connect-time only); permission changes apply on reconnect.
- `sidebarMode` is a 3-value enum instead of the per-page on/off toggle originally described: `HIDDEN` covers "this page (and its subtree) not in the sidebar", `CHILDREN_HIDDEN` covers the dataset case with one switch on the parent that automatically applies to future children. Hiding always hides the whole subtree — no flatten-up.
- Sidebar-mode changes are page-**admin** (structural, affects everyone's navigation); tag assign/remove is page-**edit**.
- Tag autocomplete exposes all tag names, even ones used only on invisible pages — accepted name-only leak in favor of consistent naming; the tag list page itself is permission-filtered.
- Tags are global (no per-subtree namespaces), case-insensitively unique, and deleted when their last assignment is removed.
- Page-index node defaults: tree mode with the current page as root and unlimited depth; tag mode defaults to AND (`"all"`). The node ignores `sidebarMode` and refreshes on mount/attr change only (no realtime list updates).
- Tag names are not in the FTS index (v1) — tag pages + autocomplete cover discovery.

## Sources

- [Tiptap open-sources 10 formerly Pro extensions (MIT)](https://tiptap.dev/blog/release-notes/were-open-sourcing-more-of-tiptap) — incl. table-of-contents, drag-handle, file-handler, unique-id, details
- [Tiptap Editor 3.0](https://tiptap.dev/tiptap-editor-v3)
- [Hocuspocus 4 stable release](https://tiptap.dev/blog/release-notes/hocuspocus-4-stable-release) / [@hocuspocus/server](https://www.npmjs.com/package/@hocuspocus/server)
