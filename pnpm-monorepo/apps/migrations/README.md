# Database Migration Scripts

This application contains one-time database migration scripts for SAM.

## Prerequisites

- Node.js (see `.nvmrc` in the root directory)
- pnpm (see `packageManager` in root `package.json`)
- Access to the database

## Setup

1. Install dependencies from the repository root:
   ```bash
   pnpm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` to your database connection string

## Running a Migration Script

To run a migration script, use `tsx`:

```bash
# From the migrations app directory
DATABASE_URL="your-connection-string" npx tsx scripts/migrations/SCRIPT_NAME.ts

# Or set DATABASE_URL in .env and run
npx tsx scripts/migrations/SCRIPT_NAME.ts
```

### Examples:

```bash
# Run a TypeScript migration
npx tsx scripts/migrations/004-transform-types-and-keys.ts

# Run a migration in a subdirectory
npx tsx scripts/migrations/003-citizen-import/index.ts

# Run with explicit DATABASE_URL
DATABASE_URL="postgresql://user:pass@host:5432/db" npx tsx scripts/migrations/007-migrate-permissions.ts
```

## Migration Scripts

The migration scripts are located in `scripts/migrations/`. Each script is a one-time operation that modifies the database schema or data.

### List of Migrations:

- `001a-fleet-ownership-to-ship.ts` - Convert fleet ownership to ships
- `001b-delete-fleet-ownership.ts` - Delete fleet ownership records
- `002-permission-value-to-string.ts` - Convert permission values to strings
- `003-citizen-import/` - Import citizen data from CSV
- `004-transform-types-and-keys.ts` - Transform entity types and keys
- `005-populate-citizen-caches.ts` - Populate citizen cache data
- `006-populate-citizen-roles-cache.ts` - Populate citizen roles cache
- `007-migrate-permissions.ts` - Migrate permissions structure
- `008-import-organizations/` - Import organization data from CSV
- `009-clean-up-permission-strings.ts` - Clean up permission strings
- `010-migrate-required-variant.ts` - Migrate required variant field
- `011-role-assignments.ts` - Migrate role assignments

## Notes

- These scripts are intended to be run once during specific deployment/migration scenarios
- Always backup your database before running migration scripts
- Some scripts expect CSV data files (see `.gitignore` in script subdirectories)
- Scripts use the `@sam-monorepo/database` package for database access
