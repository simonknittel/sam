# Changing database schema

1. Update `schema.prisma` as required (both `pnpm-monorepo/apps/app/prisma/schema.prisma` and `pnpm-monorepo/packages/database/prisma/schema.prisma` must stay in sync)
2. Change to the app directory: `cd pnpm-monorepo/apps/app`
3. Run `pnpm exec prisma db push`
4. Create migration `pnpm exec prisma migrate dev --name my-migration`
5. Commit
6. Apply to other developer databases: `pnpm exec prisma migrate dev`
7. Apply to production databases: `DATABASE_URL="..." pnpm exec prisma migrate deploy`
