#!/bin/sh

# Usage: `./scripts/mirror-database-production-to-stage.sh "postgresql://<user>:<pass>@<host>:5432/production" "postgresql://<user>:<pass>@<host>:5432/staging"`
# # See `docs/mirror-database.md` for more information

# Exit immediately if a command exits with a non-zero status.
set -e

SOURCE_CONNECTION_STRING=$1
TARGET_CONNECTION_STRING=$2

# Same image as the psql service in compose.yml — keep the two in sync
docker container run -it --rm postgres:18.4-alpine3.23@sha256:996d0920e4ff9df1fc19dacb904492f3c1ec0ec1cc338f0ad7123be7731c5f5e bash \
	-c "pg_dump --dbname=$SOURCE_CONNECTION_STRING --no-owner --no-privileges --no-acl --no-tablespaces --format=custom --file dump && pg_restore --dbname=$TARGET_CONNECTION_STRING --no-owner --clean --if-exists dump"

echo "✅ Successfully mirrored database (production to stage)"
