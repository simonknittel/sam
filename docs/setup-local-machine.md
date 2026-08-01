# Setup Local Machine

## Requirements

- [nvm](https://github.com/nvm-sh/nvm)
- [Docker](https://www.docker.com/)

## Setup

1. Clone the repository
2. Configure environment variables: Duplicate [pnpm-monorepo/apps/app/.env.example](../pnpm-monorepo/apps/app/.env.example) to [pnpm-monorepo/apps/app/.env](../pnpm-monorepo/apps/app/.env) (and [pnpm-monorepo/packages/database/.env.example](../pnpm-monorepo/packages/database/.env.example) to `.env` likewise) and fill in the blanks.
3. Start up the database (plus Soketi and the wiki collaboration server): `docker compose up`
4. Open a second terminal and change to the `pnpm-monorepo` directory: `cd pnpm-monorepo`
5. Install required Node.js version: `nvm install`
6. Enable pnpm: `corepack enable && corepack install`
7. Install dependencies: `pnpm install`
8. Update the database's schema: `pnpm --filter @sam-monorepo/database run migrate:dev`
9. Run the app (builds the app's workspace packages first): `pnpm run dev:app`
10. Access the app at: <http://localhost:3000>

### Wiki realtime collaboration

Editing wiki pages always goes through the `sam-collab` container from
[compose.yml](../compose.yml). To enable it, add the following to
`pnpm-monorepo/apps/app/.env` (matching the container's defaults) and restart
the app:

```dotenv
COLLAB_JWT_SECRET="insecure-dev-secret"
NEXT_PUBLIC_COLLAB_URL="ws://localhost:5210"
```

Without these variables the wiki is read-only (this also applies to
deployments, e.g. previews without the env vars).
After changing `pnpm-monorepo/apps/collab`, rebuild the container
with `docker compose build sam-collab`. Alternatively run the server without
Docker: `pnpm --filter @sam-monorepo/collab run dev` (uses
`pnpm-monorepo/apps/collab/.env`, see its
[.env.example](../pnpm-monorepo/apps/collab/.env.example)).

### (Experimental) Dev Container

1. Install the _Dev Containers_ extension for VSCode
2. `Dev Containers: Reopen In Container` and wait for it to finish
3. Go to your VSCode extensions and enable the recommended ones
4. (Optional) Install your personal VSCode extensions in Dev Container
   - You'll need to do this after every rebuild of the container
5. Update the database's schema: `pnpm --filter @sam-monorepo/database run migrate:dev`
6. Run the app
   - Terminal: `pnpm run dev`
   - VSCode debugger: `F5`
7. Access the app at: <http://localhost:3000>

## Bot Invite Link with required scopes

- <https://discord.com/api/oauth2/authorize?client_id=XXX&permissions=0&scope=bot>
