# Setup Local Machine

## Requirements

- [nvm](https://github.com/nvm-sh/nvm)
- [Docker](https://www.docker.com/)

## Setup

1. Clone the repository
2. Configure environment variables: Duplicate [pnpm-monorepo/apps/app/.env.example](../pnpm-monorepo/apps/app/.env.example) to `pnpm-monorepo/apps/app/.env` (and [pnpm-monorepo/packages/database/.env.example](../pnpm-monorepo/packages/database/.env.example) to `.env` likewise) and fill in the blanks.
3. Start up the database (plus Soketi, the wiki collaboration server, the S3-compatible upload storage and the Unleash feature flag server): `docker compose up`
4. Open a second terminal and change to the `pnpm-monorepo` directory: `cd pnpm-monorepo`
5. Install required Node.js version: `nvm install`
6. Enable pnpm: `corepack enable && corepack install`
7. Install dependencies: `pnpm install`
8. Update the database's schema: `pnpm --filter @sam-monorepo/database run migrate:dev`
9. Run the app (builds the app's workspace packages first): `pnpm run dev:app`
10. Access the app at: <http://localhost:3000>

### Wiki realtime collaboration

Editing wiki pages always goes through the `sam-collab` container from
[compose.yml](../compose.yml). The `COLLAB_JWT_SECRET` and `COLLAB_URL`
defaults from `pnpm-monorepo/apps/app/.env.example` match the container's
configuration — keep them. Without these variables the wiki is read-only
(this also applies to deployments, e.g. previews without the env vars).
After changing `pnpm-monorepo/apps/collab`, rebuild the container
with `docker compose build sam-collab`. Alternatively run the server without
Docker: `pnpm --filter @sam-monorepo/collab run dev` (uses
`pnpm-monorepo/apps/collab/.env`, see its
[.env.example](../pnpm-monorepo/apps/collab/.env.example)).

### Uploads (S3-compatible storage)

File uploads (role icons, wiki images, attachments, …) go to the `rustfs`
container from [compose.yml](../compose.yml). The `S3_*` defaults from
`pnpm-monorepo/apps/app/.env.example` match the container's credentials and
bucket — keep them. The bucket (incl. its anonymous-read policy and CORS
rules) is created automatically on `docker compose up` by the one-shot
`rustfs-bootstrap` service. Uploaded files live only inside the container.
Alternatively point the variables at any S3-compatible provider (e.g.
Cloudflare R2, see the comments in `.env.example`).

### Feature flags (Unleash)

Feature flags are read from the `unleash` container from
[compose.yml](../compose.yml). The `UNLEASH_*` defaults from
`pnpm-monorepo/apps/app/.env.example` match the container's backend token —
keep them. On `docker compose up` the one-shot `unleash-bootstrap` service
creates all flags of the app's `UNLEASH_FLAG` enum (disabled). Toggle them
in the Unleash admin UI at <http://localhost:4242> (login: `admin` /
`unleash4all`). Without the `UNLEASH_*` variables all flags evaluate to
disabled. Alternatively point the variables at any Unleash-compatible
provider (e.g. GitLab feature flags).

### Embedded app authentication

External apps embedded under `/app/external/…` can receive a signed JWT
identifying the current user (see
[Embedded App Authentication](./embedded-app-authentication.md)). The
feature is disabled without `EMBED_JWT_PRIVATE_KEY`: no token is appended to
an embed URL and <http://localhost:3000/.well-known/jwks.json> publishes an
empty key set. Generate a key and put it in
`pnpm-monorepo/apps/app/.env` to work on the feature:

```sh
openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt | base64 -w0
```

**Every environment needs its own key** — local, preview and production.
Sharing one would let a token minted by a preview deployment verify as a
production token. Deployments read the variable from Vercel (see
[Test and Production](./setup-test-and-production.md#7-set-up-vercel)).

### Optional environment tweaks

- `SKIP_VALIDATION=1` skips the app's environment variable validation
  (`pnpm-monorepo/apps/app/src/env.ts`), e.g. to build without a fully
  configured `.env`:
  `SKIP_VALIDATION=1 pnpm --filter @sam-monorepo/app run build`
- The Docker services' host ports can be overridden so multiple checkouts
  (e.g. git worktrees) can run their stacks side by side: set
  `SAM_PSQL_PORT`, `SAM_SOKETI_PORT`, `SAM_SOKETI_METRICS_PORT`,
  `SAM_COLLAB_PORT`, `SAM_RUSTFS_PORT` and/or `SAM_UNLEASH_PORT` in a
  gitignored `.env` next to
  [compose.yml](../compose.yml).

## Bot Invite Link with required scopes

Replace `XXX` with the application's client id (`DISCORD_CLIENT_ID`):

```
https://discord.com/oauth2/authorize?client_id=XXX&scope=bot&permissions=17600775980032
```

The `bot` scope covers everything the app asks of the bot; the permission
integer is the sum of three flags:

| Permission      | Bit       | Value          | Needed for                                                                   |
| --------------- | --------- | -------------- | ---------------------------------------------------------------------------- |
| `VIEW_CHANNEL`  | `1 << 10` | 1024           | Listing the voice and stage channels an event can be published into           |
| `MANAGE_EVENTS` | `1 << 33` | 8589934592     | Editing and deleting guild scheduled events, including ones the bot didn't create |
| `CREATE_EVENTS` | `1 << 44` | 17592186044416 | Creating guild scheduled events                                               |

The event permissions are what
[publishing app events to Discord](../pnpm-monorepo/apps/app/src/modules/events/utils/discordPublishing.ts)
needs; without them publishing fails with `Missing Permissions` while
everything else keeps working. `VIEW_CHANNEL` is usually already covered by
the guild's `@everyone` role, but granting it to the bot's own role keeps it
working if that baseline is ever tightened.

Re-inviting a bot that is already in the guild is safe and is how permissions
are added later — it updates the bot's managed role rather than adding a
second membership. Check what it actually holds first (`Server Settings →
Roles`, or the guild's `roles` endpoint): a bot with no managed role runs on
`@everyone` alone, so the invite link must carry every permission it needs
rather than only the new ones.
