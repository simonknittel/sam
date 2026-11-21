#!/bin/sh

# Usage: `./scripts/mirror-database-production-to-stage.sh "postgresql://<user>:<pass>@<host>:5432/production" "postgresql://<user>:<pass>@<host>:5432/stage"`
# # See `docs/mirror-database.md` for more information

# Exit immediately if a command exits with a non-zero status.
set -e

SOURCE_CONNECTION_STRING=$1
TARGET_CONNECTION_STRING=$2

# Same image as the psql service in compose.yml — keep the two in sync.
# The production connection string uses `sslmode=verify-full`. The container
# has no `~/.postgresql/root.crt`, thus `pg_dump` uses the system CA roots.
# Only `pg_dump`: with `sslrootcert=system`, libpq refuses a weaker `sslmode`,
# which the stage connection string can have.
# The dump leaves out the extension timescaledb. See docs/mirror-database.md,
# also before the first hypertable.
docker container run -it --rm "timescale/timescaledb:2.32.1-pg18@sha256:70e6526ad8e31e3f4833f2c5863b50b92d7a6bee4d432ad1f660e2c6dd956d94" bash \
	-c "PGSSLROOTCERT=system pg_dump --dbname=$SOURCE_CONNECTION_STRING --no-owner --no-privileges --no-acl --no-tablespaces --exclude-extension=timescaledb --format=custom --file dump && pg_restore --dbname=$TARGET_CONNECTION_STRING --no-owner --clean --if-exists dump"

echo "✅ Successfully mirrored database (production to stage)"
