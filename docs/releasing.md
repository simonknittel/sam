# Releasing

There is a single branch (`main`). Pushes to `main` never deploy to production on their own:

- Vercel only creates _preview_ deployments for pushes (the project's Production Branch points to `production-gate`, a frozen branch whose ruleset blocks all pushes — Vercel requires the Production Branch to exist in the repository)
- The Lambda functions are only deployed by the [Release workflow](../.github/workflows/release.yml) (or manually via the [Deploy Lambda functions workflow](../.github/workflows/deploy-lambda-functions.yml))

## Release workflow

The [Release workflow](../.github/workflows/release.yml) is the only path to production. It runs three jobs in parallel:

- Sends the `deploying` event to the `releases` channel of Soketi
- Deploys the Lambda functions to AWS
- Deploys the app to Vercel (via `vercel deploy --prod`, built on Vercel's infrastructure with production environment variables)

Once both deployments have finished, it sends the `new` event to the `releases` channel of Soketi.

The Lambda functions deploy to the **test** AWS environment: there is no production AWS account (yet), so the test environment intentionally doubles as production (see [setup-test-and-production.md](./setup-test-and-production.md)).

The workflow runs automatically every Tuesday at 8am UTC and can be triggered manually via `Actions > Release > Run workflow`.

## Collab server

The wiki collaboration server is not part of the Release workflow. The [Build collab server workflow](../.github/workflows/build-collab-server.yml) builds and pushes the `ghcr.io/simonknittel/sam-collab` image on every push to `main` that touches the collab server or its workspace dependencies (it can also be triggered manually). Production runs on an externally managed host which pulls this image.

## Ad-hoc releases and rollbacks

Trigger the Release workflow manually. The `git_ref` input selects what gets deployed:

- Leave it empty to release the latest commit of `main`
- Pass an older commit SHA to roll back

Database migrations are not part of the Release workflow and are triggered manually via the [Production database migrations workflow](../.github/workflows/production-database-migrations.yml).
