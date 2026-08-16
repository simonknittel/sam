#!/bin/sh

# Usage: `./scripts/mirror-database-production-to-local.sh "postgresql://<user>:<pass>@<host>:5432/<database>"`
# # See `docs/mirror-database.md` for more information

# Exit immediately if a command exits with a non-zero status.
set -e

CONNECTION_STRING=$1
SCRIPT_DIRECTORY=$(dirname "$0")

docker compose rm --stop --force psql
docker compose up --detach psql

# The excluded tables only contain live credentials (session tokens, email
# confirmation tokens, web push subscriptions) which must not leave
# production. Their tables get restored empty. The dump file gets removed
# because it still contains the not yet anonymized data of the other tables.
docker container exec --interactive sam-psql-1 /bin/bash <<EOF
	pg_dump --dbname=$CONNECTION_STRING --no-owner --no-privileges --no-acl --no-tablespaces --exclude-table-data='"Session"' --exclude-table-data='"VerificationToken"' --exclude-table-data='"EmailConfirmationToken"' --exclude-table-data='"WebPushSubscription"' --format=custom --file dump && \
		pg_restore --dbname=postgresql://postgres:admin@localhost:5432/db --no-owner --clean --if-exists dump && \
		rm dump
EOF

docker container exec --interactive sam-psql-1 psql --dbname=postgresql://postgres:admin@localhost:5432/db --set ON_ERROR_STOP=1 --quiet < "$SCRIPT_DIRECTORY/anonymize-mirrored-database.sql"

echo "✅ Successfully mirrored database (production to local)"
