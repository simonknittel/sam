# Changing database schema

1. Update the schema in `pnpm-monorepo/packages/database/prisma/` as required
2. Change to the database package: `cd pnpm-monorepo/packages/database`
3. Run `pnpm exec prisma db push`
4. Create migration: `pnpm run migrate:dev` (wraps `prisma migrate dev` and rebuilds the package so all consumers see the new client)
   - `prisma migrate dev` will prompt to reset the local database — this is expected: `db push` (step 3) made the local schema drift from the migration history, and the reset re-applies all migrations including the new one
5. Commit
6. Apply to other developer databases: `pnpm run migrate:dev`
7. Apply to production databases via either option:
   - ~~Run the "Production database migrations" GitHub workflow~~ (currently disabled)
   - `bwu && bw sync && DATABASE_URL=(bw get password "SAM (Prod) | PostgreSQL") pnpm exec prisma migrate deploy; bw lock`
