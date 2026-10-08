# Releases

There is a single branch (`main`). A push to `main` alone never deploys to production:

- Vercel only creates _preview_ deployments for pushes. The Production Branch of the project points to `production-gate`, a frozen branch with a ruleset that blocks all pushes. Vercel requires that the Production Branch exists in the repository.
- Only the [Release workflow](../.github/workflows/release.yml) deploys the Lambda functions. As an alternative, start the [Deploy Lambda functions workflow](../.github/workflows/deploy-lambda-functions.yml) manually.

## Release workflow

The [Release workflow](../.github/workflows/release.yml) is the only procedure that deploys to production. First, it gives the release the next release number and creates the Git tag and the GitHub release `release-<number>` on the commit. The app shows the number in the footer of the dashboard. If this job fails, the workflow stops before it changes production. Then it runs three jobs in parallel:

- Send the `deploying` event to the `releases` channel of Soketi
- Deploy the Lambda functions to AWS
- Deploy the app to Vercel (through `vercel deploy --prod`; Vercel builds the app on its infrastructure with the production environment variables)

When the two deployments are complete, the workflow sends the `new` event to the `releases` channel of Soketi.

The two deployments do not depend on each other. If the Lambda job fails, the app deployment can still succeed. Thus examine each job, not only the status of the run.

The workflow deploys the Lambda functions to the **test** AWS environment. A production AWS account does not exist yet, thus the test environment intentionally also operates as production (see [setup-test-and-production.md](./setup-test-and-production.md)).

The workflow starts automatically each Tuesday at 8am UTC. You can also start it manually through `Actions > Release > Run workflow`.

### Release numbers

Each release gets a new number: the highest number of the `release-<number>` tags plus 1. Thus also a failed release, a rollback, and a second release of the same commit get their own number and tag. "Re-run all jobs" gives a new number. "Re-run failed jobs" keeps the number, because it does not run the first job again.

Do not delete the tag with the highest number: the next release then uses its number again.

## Collab server

The wiki collaboration server is not part of the Release workflow. The [Build collab server workflow](../.github/workflows/build-collab-server.yml) builds and pushes the `ghcr.io/simonknittel/sam-collab` image on each push to `main` that changes the collab server or its workspace dependencies. You can also start this workflow manually. In production, an externally managed host pulls this image and runs the server.

## Ad-hoc releases and rollbacks

Start the Release workflow manually. The `git_ref` input selects the commit that the workflow deploys:

- Keep the input empty to release the latest commit of `main`
- Enter an older commit SHA to roll back

Database migrations are not part of the Release workflow. The [Production database migrations workflow](../.github/workflows/production-database-migrations.yml) is currently disabled, because GitHub runners cannot connect to the production database. Apply migrations manually (see [Change the database schema](./changing-database-schema.md)).

Apply the migration before the release if a layout reads the new schema. Example: `app/app/layout.tsx` runs on each page under `/app`, thus a missing column breaks all these pages.
