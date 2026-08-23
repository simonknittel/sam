# AGENTS.md

- Use Conventional Commits for commit messages
- After a change that modifies user-facing behavior, adds a feature, fixes a bug, or removes functionality, ask the user if a changelog entry in `pnpm-monorepo/apps/app/src/modules/changelog/entries.tsx` is necessary. Do not ask for changes that only contain formatting, refactoring without a change in behavior, or dependency upgrades without an API impact.
- Handle the system log as immutable data. To change an AuditEventType, introduce a new version of the type (for example V2 or V3) and update the code to use the new version. Do not modify existing versions of the type. For fully new events, introduce a new AuditEventType with a new name. Never delete an existing AuditEventType. If a type is no longer necessary, mark it as deprecated in a code comment, but keep the definition in place, so that historical log entries stay valid.
- The `pnpm-monorepo` directory requires Prettier formatting. After changes to files in the `pnpm-monorepo` directory, go to the `pnpm-monorepo` directory and run `pnpm run format`.
- Obey the [coding guidelines](./docs/coding-guidelines.md) for all new code that you write or review.
- Use the GitHub CLI to communicate with GitHub. Example (show the details of an issue together with its comments): `gh issue view <issue-number> --repo <owner/repo> --json title,body,labels,number,url,comments`. If `gh` is not available or returns an authentication error, stop and tell the user. Do not fall back to a different method.
- Reuse code (especially components) from the local `common` module (`pnpm-monorepo/apps/app/src/modules/common`) when possible.
- Use `createAuthenticatedAction` (server-side) and `useAction` or `runAction` (in client components) from the local `actions` module (`pnpm-monorepo/apps/app/src/modules/actions`) for each server action in Next.js/React.
- You can try to run the Docker containers and the Next.js app yourself. The Next.js app requires a login with Discord for access to the app itself. To get access, seed the database from the Docker containers with a session for my user (id: `clhaw95yi0000jr08ybuvy137`). Use that session as a cookie to log in (cookie name: `next-auth.session-token`).
- This repository is optimized for Git worktrees. Use a separate worktree for the changes that you work on.
