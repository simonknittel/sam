# AGENTS.md

- Use Conventional Commits for commit messages
- Add a changelog entry to `app/src/app/app/changelog/page.tsx` for any user-facing changes
- When changing the database Prisma schema, make sure to create a matching `migration.sql` file in the `app/prisma/migrations` folder. Also, make sure to mirror the schema changes between `app/prisma` and `pnpm-monorepo/packages/database/prisma`.
- The system log should be handled like it's immutable. When making changes to an AuditEventType, introduce a V2, V3, etc. version of the type and update the code to use the new version. Do not modify existing versions of the type. For fully new events, introduce a new AuditEventType with a new name.
- Run `npx prettier --write .` inside the `app` directory when finished and changes inside the `app` directory were made. Change the working directory to `app` before running the command.
- Follow the [coding guidelines](./docs/coding-guidelines.md) for any new code you write or review.
