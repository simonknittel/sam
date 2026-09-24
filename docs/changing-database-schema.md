# Change the database schema

1. Update the schema in `pnpm-monorepo/packages/database/prisma/models/` (one `.prisma` file for each domain; `schema.prisma` only holds the datasource and the generator)
2. Go to the database package: `cd pnpm-monorepo/packages/database`
3. Run `pnpm exec prisma db push`
4. Create the migration: `pnpm run migrate:dev` (this script runs `prisma migrate dev` and then builds the package again, so that all consumers get the new client)
   - `prisma migrate dev` asks to reset the local database. This is the expected behavior: `db push` (step 3) made the local schema different from the migration history. The reset applies all migrations again, together with the new one.
5. Commit
6. Apply the migration to the other developer databases: `pnpm run migrate:dev`
7. Apply the migration to the production database with one of these options:
   - ~~Run the "Production database migrations" GitHub workflow~~ (currently disabled)
   - fish: `bwu && bw sync && DATABASE_URL=(bw get password "SAM (Prod) | PostgreSQL") pnpm exec prisma migrate deploy; bw lock`
   - bash: `bwu && bw sync && DATABASE_URL=$(bw get password "SAM (Prod) | PostgreSQL") pnpm exec prisma migrate deploy; bw lock`

## Create a migration and keep the local data

Step 4 resets the local database. To keep the data, use one of these options:

- Create an empty database in the `psql` container (`CREATE DATABASE <name>`), set `DATABASE_URL` to it, and run step 4 there. Skip step 3.
- Do step 3. Then create the SQL with `pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema prisma --script -o <temporary file>`. This command requires a shadow database in the Prisma config. Move the file to `prisma/migrations/<name>/migration.sql`. Then mark the migration as applied: `pnpm exec prisma migrate resolve --applied <name>`.

Do not change a migration that a database already applied. `prisma migrate deploy` compares the checksums and fails.
