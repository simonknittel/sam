# Mirror the database

## Copy the production database to your local machine

- fish: `bwu && bw sync && ./scripts/mirror-database-production-to-local.sh (bw get password "SAM (Prod) | PostgreSQL"); bw lock`
- bash: `bwu && bw sync && ./scripts/mirror-database-production-to-local.sh $(bw get password "SAM (Prod) | PostgreSQL"); bw lock`

> [!WARNING]
> Run the script from a checkout in a directory with the name `sam` (for example the main checkout, not a git worktree with a different name). The script uses the hardcoded container name `sam-psql-1`, and Docker Compose makes the container name from the directory name.

### Sensitive data

The production-to-local mirror removes sensitive data:

- The dump does not include the data of the `Session`, `VerificationToken`, `EmailConfirmationToken` and `WebPushSubscription` tables. The restore creates these tables empty.
- After the restore, `scripts/anonymize-mirrored-database.sql` sets the OAuth tokens on `Account` to null and anonymizes the email addresses on `User` and in `AuditEvent` payloads.

The production-to-stage mirror copies the database without changes.

## Copy the production database to the stage database

- fish: `bwu && bw sync && ./scripts/mirror-database-production-to-stage.sh (bw get password "SAM (Prod) | PostgreSQL") (bw get password "SAM (develop) | PostgreSQL"); bw lock`
- bash: `bwu && bw sync && ./scripts/mirror-database-production-to-stage.sh $(bw get password "SAM (Prod) | PostgreSQL") $(bw get password "SAM (develop) | PostgreSQL"); bw lock`
