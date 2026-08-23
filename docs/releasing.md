# Releases

There is a single branch (`main`). A push to `main` alone never deploys to production:

- Vercel only creates _preview_ deployments for pushes. The Production Branch of the project points to `production-gate`, a frozen branch with a ruleset that blocks all pushes. Vercel requires that the Production Branch exists in the repository.
- Only the [Release workflow](../.github/workflows/release.yml) deploys the Lambda functions. As an alternative, start the [Deploy Lambda functions workflow](../.github/workflows/deploy-lambda-functions.yml) manually.

## Release workflow

The [Release workflow](../.github/workflows/release.yml) is the only procedure that deploys to production. It runs three jobs in parallel:

- Send the `deploying` event to the `releases` channel of Soketi
- Deploy the Lambda functions to AWS
- Deploy the app to Vercel (through `vercel deploy --prod`; Vercel builds the app on its infrastructure with the production environment variables)

When the two deployments are complete, the workflow sends the `new` event to the `releases` channel of Soketi.

The workflow deploys the Lambda functions to the **test** AWS environment. A production AWS account does not exist yet, thus the test environment intentionally also operates as production (see [setup-test-and-production.md](./setup-test-and-production.md)).

The workflow starts automatically each Tuesday at 8am UTC. You can also start it manually through `Actions > Release > Run workflow`.

## Collab server

The wiki collaboration server is not part of the Release workflow. The [Build collab server workflow](../.github/workflows/build-collab-server.yml) builds and pushes the `ghcr.io/simonknittel/sam-collab` image on each push to `main` that changes the collab server or its workspace dependencies. You can also start this workflow manually. In production, an externally managed host pulls this image and runs the server.

## Ad-hoc releases and rollbacks

Start the Release workflow manually. The `git_ref` input selects the commit that the workflow deploys:

- Keep the input empty to release the latest commit of `main`
- Enter an older commit SHA to roll back

Database migrations are not part of the Release workflow. The [Production database migrations workflow](../.github/workflows/production-database-migrations.yml) is currently disabled. Apply migrations manually (see [Change the database schema](./changing-database-schema.md)).
