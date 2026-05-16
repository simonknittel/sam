# AGENTS.md

- Use Conventional Commits for commit messages
- Add a changelog entry to `app/src/app/app/changelog/page.tsx` for any user-facing changes
- When changing the database Prisma schema, make sure to create a matching `migration.sql` file in the `app/prisma/migrations` folder. Also, make sure to mirror the schema changes between `app/prisma` and `pnpm-monorepo/packages/database/prisma`.
- The system log should be handled like it's immutable. When making changes to an AuditEventType, introduce a V2, V3, etc. version of the type and update the code to use the new version. Do not modify existing versions of the type. For fully new events, introduce a new AuditEventType with a new name.
- The directory `app` and `pnpm-monorepo` require Prettier formatting.
	- When making changes to files in the `app` directory, change the current working directory to `app` and run `npm run format` after making your changes.
	- When making changes to files in the `pnpm-monorepo` directory, change the current working directory to `pnpm-monorepo` and run `pnpm run format`.
- Follow the [coding guidelines](./docs/coding-guidelines.md) for any new code you write or review.
- Use the GitHub CLI when communicating with GitHub. Example (for viewing issue details incl. comments): `gh issue view <issue-number> --repo <owner/repo> --json title,body,labels,number,url,comments`.
- Never create a `migration.sql` file for Prisma schema changes on your own. Notify me, the user, about the changes and the requirement to manually run `prisma migrate dev` to generate the migration file.
