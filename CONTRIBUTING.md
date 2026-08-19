# Contributing

## Local development setup

See [Local Machine](./docs/setup-local-machine.md)

## Production setup

See [Test and Production](./docs/setup-test-and-production.md)

## Releasing

See [Releasing](./docs/releasing.md)

## Embedded app authentication

The contract for external apps embedded under `/app/external/…`, to hand to
the teams implementing verification on their side: see
[Embedded App Authentication](./docs/embedded-app-authentication.md)

## Running tests

Unit tests (run from `pnpm-monorepo`):

```sh
pnpm --filter @sam-monorepo/app run test
pnpm --filter @sam-monorepo/permissions run test
pnpm --filter @sam-monorepo/wiki-editor run test
```

Playwright end-to-end tests (requires Docker and Playwright browsers, see [pnpm-monorepo/apps/playwright/README.md](./pnpm-monorepo/apps/playwright/README.md)):

```sh
cd pnpm-monorepo/apps/playwright
pnpm test
```

## Formatting

The `pnpm-monorepo` directory is formatted with Prettier. Run `pnpm run format` from `pnpm-monorepo` before committing — CI fails on unformatted files.

## Commit messages

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/). This is enforced on pull requests by the commitlint workflow.

## CI workflows

- **Validate app**: lint, Prettier check, unit tests (app and packages) and typecheck (app, packages and scripts) — runs on pull requests and pushes touching the monorepo, all jobs blocking
- **Playwright tests**: the full end-to-end suite against a self-contained stack — runs on changes to the app, the collab server, the workspace packages or the workspace plumbing
- **commitlint**: enforces Conventional Commits on pull request commits
- **CodeQL**: static security analysis
- **Build collab server**: builds and pushes the collab server image on pushes to `main` (see [docs/releasing.md](./docs/releasing.md))
- **terraform validate / plan / apply**: infrastructure changes (see [docs/setup-test-and-production.md](./docs/setup-test-and-production.md))
- **Renovate**: automated dependency updates
- **Release**, **Deploy Lambda functions**, **Production database migrations**: production deployments (see [docs/releasing.md](./docs/releasing.md))
