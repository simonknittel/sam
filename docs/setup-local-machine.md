# Set up the local machine

## Requirements

- [nvm](https://github.com/nvm-sh/nvm)
- [Docker](https://www.docker.com/), logged in to the registry of the [Docker Hardened Images](https://docs.docker.com/dhi/) with a Docker Hub account (`docker login dhi.io`). The wiki collaboration server and the relay service use its base images.

## Setup

1. Clone the repository
2. Copy [pnpm-monorepo/apps/app/.env.example](../pnpm-monorepo/apps/app/.env.example) to `pnpm-monorepo/apps/app/.env`
3. Copy [pnpm-monorepo/packages/database/.env.example](../pnpm-monorepo/packages/database/.env.example) to `pnpm-monorepo/packages/database/.env`
4. Set the values in the two `.env` files, or download them from Bitwarden (see [Sync the .env files with Bitwarden](./sync-env-files-with-bitwarden.md))
5. Start the Docker services: `docker compose up`
6. In a second terminal, go to the `pnpm-monorepo` directory: `cd pnpm-monorepo`
7. Install Node.js: `nvm install`
8. Enable pnpm: `corepack enable && corepack install`
9. Install the dependencies: `pnpm install`
10. Apply the migrations: `pnpm --filter @sam-monorepo/database run migrate:dev`
11. Start the app: `pnpm run dev:app`
12. Open <http://localhost:3000>
13. Log in with Discord. The Discord application must have `http://localhost:3000/api/auth/callback/discord` in its OAuth2 redirects. For the admin functions, set the `role` of your user to `admin` in the database.

### Database

The `psql` container runs PostgreSQL 18 with TimescaleDB (see the [requirements of a server](./setup-test-and-production.md#1-set-up-a-postgresql-database)). Its data is in an anonymous volume: `docker compose down` and `docker compose rm` delete the data, and the stack of a new git worktree starts with an empty database.

After a change of the image in [compose.yml](../compose.yml), make the container again, update the extension, and apply the migrations (step 10). The `up.sh` script of the [run-app skill](../.agents/skills/run-app/SKILL.md) does the first two commands itself.

```sh
docker compose up --detach psql
docker compose exec psql psql -X -U postgres -d db -c "ALTER EXTENSION timescaledb UPDATE"
```

### Development login

In development, the "Dev login" control at the top of the login page signs in as an admin without Discord. It lists only admins with a Discord account, so log in with Discord once on a new database (step 13). To test as a different user, use "Assume user" in the admin toolbar.

### Wiki realtime collaboration

Wiki edits go through the `sam-collab` container. Keep the defaults of `COLLAB_JWT_SECRET` and `COLLAB_URL` from `.env.example`. Without these variables, the wiki is read-only, also in a deployment. After a change in `pnpm-monorepo/apps/collab`, run `docker compose build sam-collab`. Or run the server without Docker: `pnpm --filter @sam-monorepo/collab run dev` (with `pnpm-monorepo/apps/collab/.env`, see its [.env.example](../pnpm-monorepo/apps/collab/.env.example)).

### Remote Control Program (relay service)

The browser runtime of the [Remote Control Program](./remote-control-program/README.md) connects to the `sam-relay` container. The `RELAY_URL` default from `.env.example` matches its port. Without `RELAY_URL`, the browser runtime works only on the machine. Apply the migrations before you start the relay service, because it writes to the database of the `psql` container. [env.ts](../pnpm-monorepo/apps/relay/src/env.ts) describes all its variables, and `docker compose logs sam-relay` shows its logs.

Set the key of the app first (see [Embedded app authentication](#embedded-app-authentication)). The container gets the public key set as a value (`APP_JWKS_BASE64`), not from the URL of the app, because a firewall of the host can block a connection from a container to the dev server. To start it:

1. Put the lines of `node .agents/skills/run-app/scripts/app-env.mjs pnpm-monorepo/apps/app/.env` into the `.env` file next to [compose.yml](../compose.yml). Do this again after a change of the key.
2. Run `docker compose up -d --build sam-relay`. Do this again after a change of `pnpm-monorepo/apps/relay` or of its workspace packages.

The `up.sh` script of the [run-app skill](../.agents/skills/run-app/SKILL.md) does these steps. [compose.yml](../compose.yml) sets one maximum event size for Soketi and for the relay service (see [Set up the relay service](./setup-test-and-production.md#10-set-up-the-relay-service-of-the-remote-control-program)).

To test the desktop companion with the local stack:

- Start the program with `SAM_BASE_URL` set to the address of the local app, for example `http://localhost:3000`. The README of the repository `sam-desktop-companion` tells how to build and start it.
- On Windows, the program reaches the local stack in WSL2 only with the mirrored network mode of WSL2.
- The desktop companion never has admin mode (decision 35 of the [concept](./remote-control-program/README.md#decisions)). Thus the user of the development login needs `remoteControlProgram;use` through a role, also when the user is an admin.

### Uploads

Uploads go to the S3-compatible `rustfs` container. Keep the `S3_*` defaults from `.env.example`. `docker compose up` creates the bucket. You can also use a different S3-compatible provider, for example Cloudflare R2 (see the comments in `.env.example`).

### Feature flags (Unleash)

The app reads its feature flags from the `unleash` container. Keep the `UNLEASH_*` defaults from `.env.example`. `docker compose up` creates all flags of the `UNLEASH_FLAG` enum, disabled. Toggle them at <http://localhost:4242> (`admin` / `unleash4all`). Without the `UNLEASH_*` variables, all flags are disabled.

### Tracing and logs (OpenTelemetry)

When `ENABLE_INSTRUMENTATION` and the `OTEL_EXPORTER_OTLP_*` variables are set, the app sends spans and log records over OTLP. Locally, the `otel-collector` container writes them to `/output/traces.jsonl` and `/output/logs.jsonl`. To examine them, wait some seconds after the last request, and run:

```sh
node scripts/check-telemetry-export.mjs
```

The script prints the spans of each trace and the log records. It fails when a span has a parent span that the collector did not receive (a problem of the export). `docker compose restart otel-collector` empties the files.

The relay service sends metrics and spans only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, and [compose.yml](../compose.yml) does not set it. To send them to the `otel-collector` container (which writes the metrics to `/output/metrics.jsonl`), put this file next to [compose.yml](../compose.yml) as `compose.override.yaml` (it is gitignored), and run `docker compose up -d otel-collector sam-relay`:

```yaml
services:
  sam-relay:
    environment:
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4318
```

### Notifications (EventBridge)

The app sends notification events to AWS EventBridge only when `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `AWS_EVENT_BUS_ARN` are set. Do not set them locally: the only event bus is the production bus, so a local action can send notifications to real users.

### Embedded app authentication

Apps embedded under `/app/external/…` can get a signed JWT of the current user (see [Embedded App Authentication](./embedded-app-authentication.md)). Without `EMBED_JWT_PRIVATE_KEY`, the feature is off. To work on it, put a new key into `pnpm-monorepo/apps/app/.env`:

```sh
openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt | base64 -w0
```

The relay service of the Remote Control Program also needs the key: it verifies the connection tokens with the public key set of the app, and without the key it refuses each token.

**Each environment must have its own key** (local, preview and production). Else a token of a preview deployment is also valid in production. For deployments, see [Test and Production](./setup-test-and-production.md#7-set-up-vercel).

### Statistics dashboard (Grafana)

The statistics page shows the dashboard of the `grafana` container in a frame. Like in production, only an embed token of the app opens it. Without `STATISTICS_GRAFANA_URL` or `EMBED_JWT_PRIVATE_KEY`, the page shows a note. To show the dashboard:

1. Set `EMBED_JWT_PRIVATE_KEY` (see [Embedded app authentication](#embedded-app-authentication)).
2. Set `STATISTICS_GRAFANA_URL="http://127.0.0.1:3100"` (an origin, without a path) in `pnpm-monorepo/apps/app/.env`. Use `127.0.0.1`, not `localhost`, so that the frame is on a different site, like in production.
3. Put the lines of `node .agents/skills/run-app/scripts/app-env.mjs pnpm-monorepo/apps/app/.env` into the `.env` file next to [compose.yml](../compose.yml). Do this again after a change of the key.
4. Run `docker compose up -d grafana`.

The `up.sh` script of the [run-app skill](../.agents/skills/run-app/SKILL.md) does steps 2 to 4. Grafana reads the database with the role of [statistics-reader-role.sql](../pnpm-monorepo/packages/database/prisma/statistics-reader-role.sql), like in production.

To change the dashboard:

1. Set `SAM_GRAFANA_ADMIN_PASSWORD=<a password>` in the `.env` file next to [compose.yml](../compose.yml), and run `docker compose up -d grafana`.
2. Log in at <http://127.0.0.1:3100/login> as `admin`, and change the dashboard "Statistiken".
3. Export it with "Exportieren" > "Als Code exportieren": under "Erweiterte Optionen", select "Klassisch" and "JSON", and keep "Dashboard mit einer anderen Instanz teilen" off (it replaces the UID of the data source). Remove the keys `id` and `version` from the file, and replace [grafana/dashboards/statistics.json](../grafana/dashboards/statistics.json) with it.
4. Remove the variable, and run `docker compose up -d grafana` again.

### Optional environment settings

- `SKIP_VALIDATION=1` skips the validation of the environment variables, for example for a build without a complete `.env`: `SKIP_VALIDATION=1 pnpm --filter @sam-monorepo/app run build`
- To run the stacks of more than one checkout (for example git worktrees) at the same time, set other host ports in a gitignored `.env` file next to [compose.yml](../compose.yml): `SAM_PSQL_PORT`, `SAM_SOKETI_PORT`, `SAM_SOKETI_METRICS_PORT`, `SAM_COLLAB_PORT`, `SAM_RELAY_PORT`, `SAM_RUSTFS_PORT`, `SAM_UNLEASH_PORT`, `SAM_OTEL_COLLECTOR_PORT` and `SAM_GRAFANA_PORT`. Set `NEXTAUTH_URL` to the URL of the dev server. Each port has its own login, because the name of the session cookie contains the port. For the [statistics dashboard](#statistics-dashboard-grafana) and the [relay service](#remote-control-program-relay-service), also change the ports of `STATISTICS_GRAFANA_URL` and `RELAY_URL`, and set `SAM_APP_ORIGIN` to the URL of the dev server (default: `http://localhost:3000`).

## Bot invite link with required scopes

Replace `XXX` with the client id of the Discord application (`DISCORD_CLIENT_ID`):

```
https://discord.com/oauth2/authorize?client_id=XXX&scope=bot&permissions=17600777028608
```

| Permission      | Bit       | Value          | Necessary for                                                                                       |
| --------------- | --------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `VIEW_CHANNEL`  | `1 << 10` | 1024           | List the voice and stage channels into which the app can publish an event                           |
| `CONNECT`       | `1 << 20` | 1048576        | Create an event in a voice channel — Discord requires this permission together with `VIEW_CHANNEL` |
| `MANAGE_EVENTS` | `1 << 33` | 8589934592     | Edit and delete guild scheduled events, also events that the bot did not create                     |
| `CREATE_EVENTS` | `1 << 44` | 17592186044416 | Create guild scheduled events                                                                       |

Without these permissions, only the [publication of events](../pnpm-monorepo/apps/app/src/modules/events/utils/discordPublishing.ts) fails (`Missing Permissions`). `@everyone` usually has `VIEW_CHANNEL`, but give it to the role of the bot too.

- An event in a **stage** channel also needs `MANAGE_CHANNELS`, `MUTE_MEMBERS` and `MOVE_MEMBERS` (`permissions=17600798000144`, see the [permissions of each event type](https://docs.discord.com/developers/resources/guild-scheduled-event)). Give these moderation permissions only if the guild has stage channels.
- `MANAGE_EVENTS` is not necessary, because the bot edits only its own events. It keeps the earlier events editable after a change of `DISCORD_TOKEN` to a different Discord application.
- To add permissions later, invite the bot again with all necessary permissions, not only the new ones. The invite updates the managed role of the bot. A bot without a managed role has only the permissions of `@everyone`.
