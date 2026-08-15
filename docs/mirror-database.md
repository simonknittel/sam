# Mirror database

## How to copy the production database to your local machine

1. `bwu && bw sync && ./scripts/mirror-database-production-to-local.sh (bw get password "SAM (Prod) | PostgreSQL"); bw lock`

> [!WARNING]
> The script executes inside the hardcoded `sam-psql-1` container. Docker Compose derives container names from the checkout's directory name, so run the script from a checkout in a directory named `sam` (e.g. the main checkout, not a git worktree with a different name).

## How to copy the production database to the stage database

1. `bwu && bw sync && ./scripts/mirror-database-production-to-stage.sh (bw get password "SAM (Prod) | PostgreSQL") (bw get password "SAM (develop) | PostgreSQL"); bw lock`
