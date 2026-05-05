# AGENTS.md

- Use Conventional Commits for commit messages
- Add a changelog entry to `app/src/app/app/changelog/page.tsx` for any user-facing changes
- When changing the database Prisma schema, make sure to create a matching `migration.sql` file in the `app/prisma/migrations` folder. Also, make sure to mirror the schema changes between `app/prisma` and `pnpm-monorepo/packages/database/prisma`.
- Follow the [coding guidelines](./docs/coding-guidelines.md) for any new code you write or review.
