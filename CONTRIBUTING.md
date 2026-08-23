# Contributing

## Local development setup

See [Set up the local machine](./docs/setup-local-machine.md)

## Production setup

See [Set up test and production](./docs/setup-test-and-production.md)

## Releases

See [Releases](./docs/releasing.md)

## Embedded app authentication

The contract for external apps embedded under `/app/external/…`. Give it to
the teams that implement the verification on their side: see
[Embedded App Authentication](./docs/embedded-app-authentication.md)

## Run the tests

Unit tests (run them from `pnpm-monorepo`):

```sh
pnpm --filter @sam-monorepo/app run test
pnpm --filter @sam-monorepo/lambda run test
pnpm --filter @sam-monorepo/permissions run test
pnpm --filter @sam-monorepo/wiki-editor run test
```

Playwright end-to-end tests (they require Docker and the Playwright browsers, see [pnpm-monorepo/apps/playwright/README.md](./pnpm-monorepo/apps/playwright/README.md)):

```sh
cd pnpm-monorepo/apps/playwright
pnpm test
```

## Format the code

Prettier formats the `pnpm-monorepo` directory. Run `pnpm run format` from `pnpm-monorepo` before you commit — CI fails on files that are not formatted.

## Commit messages

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/). The "Validate commit messages" workflow can enforce this on pull requests, but it is currently disabled.

## CI workflows

- **Validate app**: lint, Prettier check, unit tests (app, Lambda functions and packages) and typecheck (app, packages and scripts). Runs on pull requests and pushes that change the monorepo. All jobs are blocking.
- **Playwright tests**: the full end-to-end suite against a self-contained stack. Runs on changes to the app, the collab server, the workspace packages or the workspace plumbing.
- **Validate commit messages**: enforces Conventional Commits on pull request commits (currently disabled)
- **CodeQL**: static security analysis
- **Build collab server**: builds and pushes the collab server image on pushes to `main` (see [docs/releasing.md](./docs/releasing.md))
- **terraform validate / plan / apply**: infrastructure changes (see [docs/setup-test-and-production.md](./docs/setup-test-and-production.md))
- **Renovate**: automated dependency updates
- **Release**, **Deploy Lambda functions**: production deployments (see [docs/releasing.md](./docs/releasing.md))
- **Production database migrations**: production database migrations (currently disabled, see [docs/changing-database-schema.md](./docs/changing-database-schema.md))
- **Build Lambda functions**, **Send release event**: reusable helper workflows; Deploy Lambda functions and Release call them
