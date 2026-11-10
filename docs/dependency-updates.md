# Dependency updates

Renovate opens the update pull requests (see [renovate.json](../renovate.json)). pnpm installs a version only when it is 7 days old or older (see the comments in [pnpm-workspace.yaml](../pnpm-monorepo/pnpm-workspace.yaml)).

## Repair a failed Renovate pull request

1. Check out the Renovate branch in a worktree.
2. Push the fix commits to the same branch. Renovate does not change a branch that has a commit from a different author.
3. Merge the pull request when CI passes.

## Known problems

- **The `pnpm audit guard` step fails.** This step runs before all other steps of a job. Thus it can hide other failures. After you repair it, look for more failures.
- **Two versions of `@tiptap/core`.** The tiptap packages require exact versions of each other. Update all `@tiptap/*` packages to the same version. Otherwise the postinstall script of `packages/wiki-editor` fails with "Two different types with this name exist".
- **Two versions of `prosemirror-view` after a tiptap update.** The postinstall script of `packages/wiki-editor` fails with `TS2322` for `DecorationSet`. Run `pnpm dedupe` in `pnpm-monorepo`.
- **An update passes CI, but the app fails on Vercel with `Cannot find module`.** The Playwright stack runs `next start` with the full `node_modules`. A function on Vercel has only the files that the build traced. Thus the tests cannot find a server package that loads a dependency in a manner that the build cannot trace. Example: the ESM build of `@opentelemetry/instrumentation-http` 0.300.0 loaded `forwarded-parse` through `createRequire`, and each request failed in production. When the release notes of a server package tell about a new build or module format, push the update to a `feature/*` branch and open the preview deployment before the release. If the package has the defect, hold its version with a rule in `renovate.json` until a release corrects it.

`pnpm why -r <package>` shows all versions of a package.

## Manual steps

- pnpm and Renovate add entries to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`, but they do not remove them. Remove an entry when its version is older than 7 days.
