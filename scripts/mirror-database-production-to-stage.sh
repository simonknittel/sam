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
docker container run -it --rm postgres:18.6-alpine3.23@sha256:885cf05d376c7cf27afef02073e6bdac3841252537f16e244fd1c1e6a7c99fb1 bash \
	-c "PGSSLROOTCERT=system pg_dump --dbname=$SOURCE_CONNECTION_STRING --no-owner --no-privileges --no-acl --no-tablespaces --format=custom --file dump && pg_restore --dbname=$TARGET_CONNECTION_STRING --no-owner --clean --if-exists dump"

echo "✅ Successfully mirrored database (production to stage)"
