# Database Migration Scripts

This app contains one-time database migration scripts.

## Usage

```sh
pnpm run build:scripts
cd apps/scripts

DATABASE_URL="postgresql://postgres:admin@localhost:5432/db" pnpm exec tsx src/migrations/011-role-assignments.ts
DATABASE_URL="postgresql://postgres:admin@localhost:5432/db" ALGOLIA_APP_ID="" ALGOLIA_ADMIN_API_KEY="" pnpm exec tsx src/algolia/spynet-entities-full-index.ts
```
