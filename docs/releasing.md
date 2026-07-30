# Releasing

There is a single branch (`main`). Pushes to `main` never deploy to production on their own:

- Vercel only creates _preview_ deployments for pushes (the project's Production Branch points to `production-gate`, a branch that intentionally doesn't exist)
- The Lambda functions are only deployed by the [Release workflow](../.github/workflows/release.yml) (or manually via the [Deploy Lambda functions workflow](../.github/workflows/deploy-lambda-functions.yml))

## Release workflow

The [Release workflow](../.github/workflows/release.yml) is the only path to production. It:

1. Sends the `deploying` event to the `releases` channel of Soketi
2. Deploys the Lambda functions to AWS and the app to Vercel (via `vercel deploy --prod`, built on Vercel's infrastructure with production environment variables)
3. Sends the `new` event to the `releases` channel of Soketi
4. Runs the Playwright smoke tests against production

It runs automatically every Tuesday at 8am UTC and can be triggered manually via `Actions > Release > Run workflow`.

## Ad-hoc releases and rollbacks

Trigger the Release workflow manually. The `git_ref` input selects what gets deployed:

- Leave it empty to release the latest commit of `main`
- Pass an older commit SHA to roll back

Database migrations are not part of the Release workflow and are triggered manually via the [Production database migrations workflow](../.github/workflows/production-database-migrations.yml).
