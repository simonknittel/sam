# Mirror database

## How to copy the production database to your local machine

1. `bwu && bw sync && ./scripts/mirror-database-production-to-local.sh (bw get password "SAM (Prod) | PostgreSQL"); bw lock`

> [!WARNING]
> The script executes inside the hardcoded `sam-psql-1` container. Docker Compose derives container names from the checkout's directory name, so run the script from a checkout in a directory named `sam` (e.g. the main checkout, not a git worktree with a different name).

### Sensitive data

The production-to-local mirror strips sensitive data:

- The data of `Session`, `VerificationToken`, `EmailConfirmationToken` and `WebPushSubscription` gets excluded from the dump. The tables get restored empty.
- After the restore, `scripts/anonymize-mirrored-database.sql` nulls the OAuth tokens on `Account` and anonymizes email addresses on `User` and in `AuditEvent` payloads.

The production-to-stage mirror copies the database unchanged.

## How to copy the production database to the stage database

1. `bwu && bw sync && ./scripts/mirror-database-production-to-stage.sh (bw get password "SAM (Prod) | PostgreSQL") (bw get password "SAM (develop) | PostgreSQL"); bw lock`
