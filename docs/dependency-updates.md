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

`pnpm why -r <package>` shows all versions of a package.

## Manual steps

- Keep `runtimeVersion` in `pnpm-monorepo/apps/app/.vscode/launch.json` equal to `pnpm-monorepo/.nvmrc`. Renovate does not update this file.
- pnpm and Renovate add entries to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`, but they do not remove them. Remove an entry when its version is older than 7 days.
