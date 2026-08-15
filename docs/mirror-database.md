# Mirror database

> How to copy the production database to your local machine

1. `./scripts/mirror-database-production-to-local.sh "postgresql://<user>:<pass>@<host>:5432/<database>"`

> [!WARNING]
> The script executes inside the hardcoded `sam-psql-1` container. Docker Compose derives container names from the checkout's directory name, so run the script from a checkout in a directory named `sam` (e.g. the main checkout, not a git worktree with a different name).

> How to copy the production database to the stage database

1. `./scripts/mirror-database-production-to-stage.sh "postgresql://<user>:<pass>@<host>:5432/production" "postgresql://<user>:<pass>@<host>:5432/stage"`
2. `cd pnpm-monorepo/packages/database`
3. `DATABASE_URL="postgresql://<user>:<pass>@<host>:5432/stage" pnpm exec prisma db push`
