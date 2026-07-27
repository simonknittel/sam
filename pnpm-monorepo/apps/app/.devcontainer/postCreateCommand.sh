#!/bin/sh

# Make the script fail on error (this is somewhat similar to chaining each commands using `&&` but for the whole file instead.)
set -e

# Make sure the node user can write to the node_modules directory which is mounted as named volume (see docker-compose.yml)
sudo chown node:node node_modules

# Use the pnpm version pinned via `packageManager` in pnpm-monorepo/package.json
sudo corepack enable

pnpm install

# After a `git clone` the `.env` won't exist. When you start the container from an existing local project, the `.env` may already exist.
if [ -e ../../packages/database/.env ]; then
	pnpm --filter @sam-monorepo/database run migrate:dev
else
	echo "Skipping database migration due to missing packages/database/.env file"
fi
