# Change the database schema

1. Update the schema in `pnpm-monorepo/packages/database/prisma/models/` (one `.prisma` file for each domain; `schema.prisma` only holds the datasource and the generator)
2. Go to the database package: `cd pnpm-monorepo/packages/database`
3. Run `pnpm exec prisma db push`
4. Create the migration: `pnpm run migrate:dev`. The script also generates the client, because `prisma migrate dev` does not do this.
   - `prisma migrate dev` asks to reset the local database. This is the expected behavior: `db push` (step 3) made the local schema different from the migration history. The reset applies all migrations again, together with the new one.
5. Commit
6. Apply the migration to the other developer databases: `pnpm run migrate:dev`
7. Apply the migration to the production database at the correct time (see [Database migrations](./releasing.md#database-migrations): usually before the push to `main`). Use a checkout that contains the migration, and make sure that the output names it: `No pending migrations to apply` can mean that the checkout does not contain the migration. Use one of these options:
   - ~~Run the "Production database migrations" GitHub workflow~~ (currently disabled)
   - fish: `bwu && bw sync && DATABASE_URL=(bw get password "SAM (Prod) | PostgreSQL") pnpm exec prisma migrate deploy; bw lock`
   - bash: `bwu && bw sync && DATABASE_URL=$(bw get password "SAM (Prod) | PostgreSQL") pnpm exec prisma migrate deploy; bw lock`

## Create a migration and keep the local data

Step 4 resets the local database. To keep the data, use one of these options:

- Create an empty database in the `psql` container (`CREATE DATABASE <name>`), set `DATABASE_URL` to it, and run step 4 there. Skip step 3.
- Do step 3. Then create the SQL with `pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema prisma --script -o <temporary file>`. This command requires a shadow database in the Prisma config. Move the file to `prisma/migrations/<name>/migration.sql`. Then mark the migration as applied: `pnpm exec prisma migrate resolve --applied <name>`.

Do not change a migration that a database already applied. `prisma migrate deploy` does not examine the checksums: it succeeds, and the database does not get the change. `prisma migrate dev` asks to reset the local database.

## Database rules outside of the Prisma models

CHECK constraints, triggers and expression indexes are only in the migrations. `prisma db push` does not create them, and a write that breaks a CHECK fails only at runtime. Name a new CHECK in a comment at its model. To find them: `grep -rE "CHECK \(|CREATE TRIGGER|USING GIN" prisma/migrations`.

## Views of the schema `statistics`

The schema `statistics` holds views for the readers of the statistics (the dashboard and the MCP tools). The views are not in the Prisma models, thus Prisma ignores them in a diff. The migration `statistics_views` makes them.

- PostgreSQL refuses to change the type of a column, or to drop a column or a table, that a view uses (`cannot alter type of a column used by a view or rule`). The error names the views. `prisma db push` (step 3) then fails too. Skip step 3 and make the migration with `pnpm exec prisma migrate dev --create-only`. Add the statements for the views to the migration: first drop the views (`DROP VIEW statistics.<name>`; a view that reads a different view goes first), then the change of Prisma, then make the views again. Then do step 4. A rename of a column or a table needs no change: the view follows it.
- Each view must read a table of the schema `public`, directly or through a different view of `statistics`. A reset of Prisma drops the schema `public` with `CASCADE`, thus it drops only the views that use it. A view that reads no table stays, and its migration fails when the reset applies the migrations again.
- Each viewer of the dashboard can read all of the schema `statistics`: the reader role gets `SELECT` on each new view (default privileges), and PUBLIC has `EXECUTE` on each new function. Thus the schema holds no table and no function, only views with counts, sums, and the ids and names of roles and ship variants. A view that joins a table of names (for example `Role`) gets `WITH (security_barrier)`, like `statistics.daily_role_citizen_counts`.
- A view that a migration makes again gets the `SELECT` right of the reader role from the default privileges of the owner of the schema `statistics` (see `pnpm-monorepo/packages/database/prisma/statistics-reader-role.sql`).
- A change of the columns or the rows of a view changes the data of its readers. Update the dashboard (`grafana/dashboards/statistics.json`) and the MCP tools too.
