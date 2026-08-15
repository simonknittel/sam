# pnpm-monorepo

## Prerequisites

- Git
- [Docker](https://www.docker.com/) (for the database and the other backing services from [compose.yml](../compose.yml))
- [nvm](https://github.com/creationix/nvm) and [pnpm](https://pnpm.io/)
  1. `nvm install`
  2. `corepack enable`
  3. `corepack install`

## Installation

1. Run `pnpm install` to install all dependencies
2. Configure environment variables: Duplicate the `.env.example` files to `.env` and fill in the blanks.
   - `apps/app/.env.example`
   - `apps/collab/.env.example`
   - `apps/lambda/.env.example`
   - `packages/database/.env.example`
3. Start the backing services (database, Soketi, collab server) from the repository root: `docker compose up`
4. Run the Next.js app (builds the app's workspace packages first): `pnpm run dev:app` (see [docs/setup-local-machine.md](../docs/setup-local-machine.md))
5. Access the app at <http://localhost:3000>
