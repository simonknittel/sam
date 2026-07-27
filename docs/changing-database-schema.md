# Changing database schema

1. Update the schema in `pnpm-monorepo/packages/database/prisma/` as required
2. Change to the database package: `cd pnpm-monorepo/packages/database`
3. Run `pnpm exec prisma db push`
4. Create migration: `pnpm run migrate:dev` (wraps `prisma migrate dev` and rebuilds the package so all consumers see the new client)
5. Commit
6. Apply to other developer databases: `pnpm run migrate:dev`
7. Apply to production databases: run the "Production database migrations" GitHub workflow, or `DATABASE_URL="..." pnpm exec prisma migrate deploy`
