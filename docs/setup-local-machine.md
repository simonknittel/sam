# Set up the local machine

## Requirements

- [nvm](https://github.com/nvm-sh/nvm)
- [Docker](https://www.docker.com/)

## Setup

1. Clone the repository
2. Copy [pnpm-monorepo/apps/app/.env.example](../pnpm-monorepo/apps/app/.env.example) to `pnpm-monorepo/apps/app/.env`
3. Copy [pnpm-monorepo/packages/database/.env.example](../pnpm-monorepo/packages/database/.env.example) to `pnpm-monorepo/packages/database/.env`
4. Set the values in the two `.env` files
5. Start the database, Soketi, the wiki collaboration server, the S3-compatible upload storage and the Unleash feature flag server: `docker compose up`
6. Open a second terminal and go to the `pnpm-monorepo` directory: `cd pnpm-monorepo`
7. Install the necessary Node.js version: `nvm install`
8. Enable pnpm: `corepack enable && corepack install`
9. Install the dependencies: `pnpm install`
10. Update the database schema: `pnpm --filter @sam-monorepo/database run migrate:dev`
11. Start the app (this command first builds the workspace packages of the app): `pnpm run dev:app`
12. Open the app at: <http://localhost:3000>

### Wiki realtime collaboration

All wiki page edits go through the `sam-collab` container from
[compose.yml](../compose.yml). The `COLLAB_JWT_SECRET` and `COLLAB_URL`
defaults from `pnpm-monorepo/apps/app/.env.example` match the configuration
of the container. Keep these defaults. Without these variables, the wiki is
read-only. This also applies to deployments, for example previews without
these variables. After a change to `pnpm-monorepo/apps/collab`, build the
container again: `docker compose build sam-collab`. As an alternative, run
the server without Docker: `pnpm --filter @sam-monorepo/collab run dev`.
This command uses `pnpm-monorepo/apps/collab/.env` (see its
[.env.example](../pnpm-monorepo/apps/collab/.env.example)).

### Uploads (S3-compatible storage)

The app sends file uploads (for example role icons, wiki images and
attachments) to the `rustfs` container from [compose.yml](../compose.yml). The `S3_*` defaults
from `pnpm-monorepo/apps/app/.env.example` match the credentials and the
bucket of the container. Keep these defaults. On `docker compose up`, the
one-shot `rustfs-bootstrap` service creates the bucket together with its
anonymous-read policy and its CORS rules. Uploaded files stay only inside
the container. As an alternative, point the variables to any S3-compatible
provider (for example Cloudflare R2, see the comments in `.env.example`).

### Feature flags (Unleash)

The app reads feature flags from the `unleash` container from
[compose.yml](../compose.yml). The `UNLEASH_*` defaults from
`pnpm-monorepo/apps/app/.env.example` match the backend token of the
container. Keep these defaults. On `docker compose up`, the one-shot
`unleash-bootstrap` service creates all flags of the app's `UNLEASH_FLAG`
enum in the disabled state. Toggle the flags in the Unleash admin UI at
<http://localhost:4242> (login: `admin` / `unleash4all`). Without the
`UNLEASH_*` variables, all flags are disabled. As an alternative, point the
variables to any Unleash-compatible provider (for example GitLab feature
flags).

### Tracing and logs (OpenTelemetry)

The app sends spans and log records over OTLP when
`ENABLE_INSTRUMENTATION`, `OTEL_EXPORTER_OTLP_PROTOCOL` and
`OTEL_EXPORTER_OTLP_ENDPOINT` are all set (see the comments in
`pnpm-monorepo/apps/app/.env.example`). Without these variables, the app
creates no spans and sends no log records. Deployments send to Grafana
Cloud; locally, the `otel-collector` container from
[compose.yml](../compose.yml) receives the data.

The container has no user interface. It writes every received OTLP request
as one JSON line to `/output/traces.jsonl`, `/output/logs.jsonl` and
`/output/metrics.jsonl` in its volume. This script copies the traces and the
log records out of the container and examines them:

```sh
node scripts/check-telemetry-export.mjs
```

It prints the number of spans of each trace, the span names and the
received log records. It fails when a span references a parent span that
the collector never received. Such an orphan span is the symptom of an
export problem: a trace viewer cannot find the parent and shows the span at
the root of the trace. Wait some seconds after the last request before you
run the check — a few spans of the framework end after the response and
leave the app with the next scheduled batch.

The files only grow. To begin a clean measurement, restart the container —
this truncates them:

```sh
docker compose restart otel-collector
```

### Embedded app authentication

External apps embedded under `/app/external/…` can receive a signed JWT
that identifies the current user (see
[Embedded App Authentication](./embedded-app-authentication.md)). Without
`EMBED_JWT_PRIVATE_KEY`, the feature is disabled: the app appends no token
to an embed URL, and <http://localhost:3000/.well-known/jwks.json>
publishes an empty key set. To work on the feature, generate a key and put
it in `pnpm-monorepo/apps/app/.env`:

```sh
openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt | base64 -w0
```

**Each environment must have its own key** — local, preview and production.
With one shared key, a token from a preview deployment can verify as a
production token. Deployments read the variable from Vercel (see
[Test and Production](./setup-test-and-production.md#7-set-up-vercel)).

### Optional environment settings

- `SKIP_VALIDATION=1` skips the environment variable validation of the app
  (`pnpm-monorepo/apps/app/src/env.ts`), for example to build without a
  fully configured `.env`:
  `SKIP_VALIDATION=1 pnpm --filter @sam-monorepo/app run build`
- You can override the host ports of the Docker services, so that multiple
  checkouts (for example git worktrees) can run their stacks at the same
  time. Set `SAM_PSQL_PORT`, `SAM_SOKETI_PORT`, `SAM_SOKETI_METRICS_PORT`,
  `SAM_COLLAB_PORT`, `SAM_RUSTFS_PORT`, `SAM_UNLEASH_PORT` and/or
  `SAM_OTEL_COLLECTOR_PORT` in a gitignored `.env` file next to
  [compose.yml](../compose.yml).

## Bot invite link with required scopes

Replace `XXX` with the client id of the Discord application
(`DISCORD_CLIENT_ID`):

```
https://discord.com/oauth2/authorize?client_id=XXX&scope=bot&permissions=17600777028608
```

The `bot` scope includes all functions that the app uses on the bot. The
permission integer is the sum of four flags:

| Permission      | Bit       | Value          | Necessary for                                                                                       |
| --------------- | --------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `VIEW_CHANNEL`  | `1 << 10` | 1024           | List the voice and stage channels into which the app can publish an event                           |
| `CONNECT`       | `1 << 20` | 1048576        | Create an event in a voice channel — Discord requires this permission together with `VIEW_CHANNEL` |
| `MANAGE_EVENTS` | `1 << 33` | 8589934592     | Edit and delete guild scheduled events, also events that the bot did not create                     |
| `CREATE_EVENTS` | `1 << 44` | 17592186044416 | Create guild scheduled events                                                                       |

The [Discord event publication code](../pnpm-monorepo/apps/app/src/modules/events/utils/discordPublishing.ts)
needs these permissions. Without them, the publish step fails with
`Missing Permissions`, and all other functions continue to operate. The
`@everyone` role of the guild usually already includes `VIEW_CHANNEL`.
Grant it to the bot's own role also, so that the bot keeps the permission
if the guild removes it from `@everyone`.

Discord requires
[different permissions for each event entity type](https://docs.discord.com/developers/resources/guild-scheduled-event):
an external event needs only `CREATE_EVENTS`; a voice event also needs
`VIEW_CHANNEL` and `CONNECT`; a **stage** event also needs
`MANAGE_CHANNELS`, `MUTE_MEMBERS` and `MOVE_MEMBERS`
(`permissions=17600798000144`). The link above does not include these three
permissions. They are moderation permissions, and guilds without stage
channels never need them. The channel picker does offer stage channels, and
an event publication into a stage channel needs these permissions. Thus
grant them only if the guild has stage channels.

`MANAGE_EVENTS` is redundant: the app only edits events that the bot
created, and `CREATE_EVENTS` already permits that. The link includes
`MANAGE_EVENTS` so that a rotation of `DISCORD_TOKEN` to a different
Discord application does not make the events that were published before
unmanageable.

It is safe to invite a bot again that is already in the guild. This is also
the procedure to add permissions later: the invite updates the managed role
of the bot and does not add a second membership. First examine which
permissions the bot has (`Server Settings → Roles`, or the `roles` endpoint
of the guild). A bot without a managed role operates with the permissions
of `@everyone` only. Thus the invite link must include all necessary
permissions, not only the new ones.
