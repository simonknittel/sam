#!/bin/sh

# Usage: `./scripts/mirror-database-production-to-stage.sh "postgresql://<user>:<pass>@<host>:5432/production" "postgresql://<user>:<pass>@<host>:5432/staging"`
# # See `docs/mirror-database.md` for more information

# Exit immediately if a command exits with a non-zero status.
set -e

SOURCE_CONNECTION_STRING=$1
TARGET_CONNECTION_STRING=$2

docker container run -it --rm postgres:18.3 bash \
	-c "pg_dump --dbname=$SOURCE_CONNECTION_STRING --no-owner --no-privileges --no-acl --no-tablespaces --format=custom --file dump && pg_restore --dbname=$TARGET_CONNECTION_STRING --no-owner --clean --if-exists dump"

echo "✅ Successfully mirrored database (production to stage)"
