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

## The extension TimescaleDB

The dumps of both scripts do not include the extension `timescaledb`
(`pg_dump --exclude-extension=timescaledb`):

- Only a superuser can drop or create the extension. The restore into the
  stage database runs as the owner of that database, which is not a
  superuser.
- The target database has the extension already. The local database gets it
  from the image of the `psql` service in [compose.yml](../compose.yml), and
  the stage database from the setup of its server (see
  [Test and Production](./setup-test-and-production.md#1-set-up-a-postgresql-database)).

`--exclude-extension` needs `pg_dump` 17 or later. The scripts run `pg_dump`
in a container of the image of the `psql` service in
[compose.yml](../compose.yml), which has `pg_dump` 18.

The databases have no hypertables yet. A dump of a hypertable needs the
extension and a different restore (`timescaledb_pre_restore()` and
`timescaledb_post_restore()`). Before the first hypertable, change the three
dumps that leave out the extension: the two scripts, and the seed of a
worktree stack in the `up.sh` script of the
[run-app skill](../.agents/skills/run-app/SKILL.md), which copies the
database of the main checkout.
