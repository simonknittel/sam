# Set up test and production

## 1. Set up a PostgreSQL database

Create a database for each environment. The server must have:

1. PostgreSQL 18 with TimescaleDB in the community edition, like the image of the `psql` service in [compose.yml](../compose.yml). The Apache 2 edition (the image tags with `-oss`) has no compression and no continuous aggregates.
2. `timescaledb` in `shared_preload_libraries` (a change needs a restart of the server), and `timescaledb.telemetry_level = off`.
3. The extension in each database of SAM, before the first `prisma migrate deploy`. Only a superuser can create it: `CREATE EXTENSION IF NOT EXISTS timescaledb;`.
4. The user of the app as the owner of the database. With this user, the migrations create the extensions `pg_trgm` and `citext`.

## 2. Set up Cloudflare R2

## 3. Set up Mailgun

1. Create two API keys for outgoing email
   1. `sinister-incorporated-aws-test`
   2. `sinister-incorporated-aws-prod`

## 4. Set up GitHub

1. Create the environments with their variables and secrets

   | Environment             | Variables                                                                                                            | Secrets                                                                                                                                                    |
   | ----------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `terraform-test`        | `IAM_ROLE_ARN`, `TFVARS`                                                                                             |                                                                                                                                                            |
   | `terraform-prod`        | `IAM_ROLE_ARN`, `TFVARS` (prepared for later use; no workflow can target it yet, see [5. Set up AWS](#5-set-up-aws)) |                                                                                                                                                            |
   | `lambda-functions-test` | `IAM_ROLE_ARN`                                                                                                       |                                                                                                                                                            |
   | `Production`            | `SOKETI_APP_ID`, `SOKETI_APP_KEY`, `SOKETI_HOST`                                                                     | `DATABASE_URL`, `SOKETI_APP_SECRET`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (for the Vercel values see [7. Set up Vercel](#7-set-up-vercel)) |

2. Enable "Allow GitHub Actions to create and approve pull requests" in Settings/Actions/General/Workflow permissions

## 5. Set up AWS

> [!NOTE]
> A production AWS account does not exist yet. Only `sam-test` is set up, and it intentionally also operates as production: the weekly [Release workflow](./releasing.md) deploys the Lambda functions to the test environment.

1. Create the AWS accounts
   1. `sam-test`
   2. `sam-prod` (not set up yet, see above)

2. Prepare the AWS CLI

   ```ini
   # ~/.aws/config

   # SAM
   [profile sam-test]
   sso_session = sam-sso
   sso_account_id = 220746603587
   sso_role_name = AdministratorAccess

   # [profile sam-prod]
   # sso_session = sam-sso
   # sso_account_id =
   # sso_role_name = AdministratorAccess

   [sso-session sam-sso]
   sso_region = eu-central-1
   sso_start_url = https://simonknittel.awsapps.com/start
   ```

3. Create and deploy the setup stack with AWS CloudFormation
   1. `cd cloudformation`
   2. Create `test-parameters.json` and `prod-parameters.json` and set their values
   3. `AWS_PROFILE=sam-test aws sso login`
   4. `AWS_PROFILE=sam-test aws --region eu-central-1 cloudformation deploy --template-file setup.yaml --stack-name setup --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM --tags ManagedBy=CloudFormation Repository=simonknittel/sam --parameter-overrides file://test-parameters.json`

### Related

- https://stackoverflow.com/questions/51273227/whats-the-most-efficient-way-to-determine-the-minimum-aws-permissions-necessary
- https://github.com/iann0036/iamlive
  - `iamlive --mode proxy --force-wildcard-resource --output-file policy.json --sort-alphabetical`
  - `HTTP_PROXY=http://127.0.0.1:10080 HTTPS_PROXY=http://127.0.0.1:10080 AWS_CA_BUNDLE=~/.iamlive/ca.pem AWS_CSM_ENABLED=true AWS_PROFILE=sam-test terraform plan -var-file="test.tfvars"`

## 6. Set up Terraform

1. `cd terraform`
2. Create `test.tfvars` and `prod.tfvars` and set their values (gitignored; the `test.s3.tfbackend` and `prod.s3.tfbackend` backend configurations are already committed in this directory)
3. Create the Terraform resources
   1. `AWS_PROFILE=sam-test aws sso login`
   2. `AWS_PROFILE=sam-test terraform init -backend-config=test.s3.tfbackend -reconfigure`
   3. `AWS_PROFILE=sam-test terraform apply -var-file="test.tfvars"`

## 7. Set up Vercel

1. Set `Root Directory` to `pnpm-monorepo/apps/app`. Keep "Include source files outside of the Root Directory in the Build Step" enabled. The build needs the workspace lockfile and `pnpm-workspace.yaml` at the `pnpm-monorepo` root.
2. Add the environment variable `ENABLE_EXPERIMENTAL_COREPACK=1`, so that Vercel uses the pinned pnpm version. Vercel reads the `packageManager` field from the package.json at the repository root, not from the Root Directory. Thus the pin is in `/package.json`. Keep it identical to the pin in `pnpm-monorepo/package.json`.
3. The file `pnpm-monorepo/apps/app/vercel.json` configures the `Ignored Build Step` in code. It runs `.vercel/ignore-step.sh` from the repository root. Remove each `Ignored Build Step` override from the dashboard.
4. Create the frozen `production-gate` branch. Create a ruleset that blocks all pushes to this branch, with no bypass actors. Vercel requires that the Production Branch exists in the repository, but this branch must never move: an accidental push to it would start a git-driven production deployment.
5. Set `Production Branch` (Settings > Environments > Production) to `production-gate`. Then pushes to `main` only create preview deployments, and only the [Release workflow](./releasing.md) creates production deployments.
6. Create an access token (Account Settings > Tokens). Store the token and the IDs from the project settings as the `VERCEL_TOKEN`, `VERCEL_ORG_ID` (team ID) and `VERCEL_PROJECT_ID` secrets of the `Production` GitHub environment.
7. Generate a **separate** `EMBED_JWT_PRIVATE_KEY` for the Production environment and for the Preview environment (see [Embedded App Authentication](./embedded-app-authentication.md) and the generation command in [Set up the local machine](./setup-local-machine.md#embedded-app-authentication)). With one shared key, a token from a preview deployment can verify as a production token. If the variable is not set, the feature is disabled for that environment.

## 8. Remaining manual steps

1. Enable the monthly budget report on AWS manually
   - Budget report name: `Total monthly costs`
   - Select budgets: `Total monthly budget`
   - Report frequency: `Monthly`
   - Day of month: `1`

## 9. Optional: Set up a Grafana for the statistics dashboard

The statistics page shows a Grafana dashboard in a frame. Without a Grafana,
the page shows a note. A Grafana that shows the dashboard must have:

1. The settings of [grafana/grafana.ini](../grafana/grafana.ini), and the
   Grafana version of the `grafana` service in [compose.yml](../compose.yml).
   Replace the `$__env{...}` values: `root_url` is the public HTTPS URL of
   the Grafana, `SAM_GRAFANA_APP_ORIGIN` is the origin of SAM, and
   `SAM_GRAFANA_APP_BASE_URL` is the base URL of SAM (`NEXT_PUBLIC_BASE_URL`,
   the issuer of the tokens). Replace `jwk_set_value` with
   `jwk_set_url = <base URL of SAM>/.well-known/jwks.json`: Grafana then
   loads the public key from SAM over HTTPS. The Grafana has no admin, no
   login form and no anonymous access. Each citizen gets an account with the
   role Viewer at the first visit.
2. The database role `sam_statistics_grafana`. Run
   [statistics-reader-role.sql](../pnpm-monorepo/packages/database/prisma/statistics-reader-role.sql)
   as a superuser in the database of SAM (its comments give the conditions:
   the role of the app owns the schema `statistics`, and the extension
   `timescaledb` exists), and set a password of this environment:
   `ALTER ROLE sam_statistics_grafana PASSWORD '<password>'`.
   Each viewer can send any SQL to the data source. The role can only read
   the views of the schema `statistics`. The file also removes rights that
   PostgreSQL and TimescaleDB give to PUBLIC (advisory locks, WAL messages,
   large objects, temporary tables, and the functions that make, change or
   run a job or a policy of TimescaleDB) and gives them to the role of the
   app. A different role that needs them needs its own `GRANT`.
   - A viewer can change the role defaults and the password of the role.
     Therefore, run the file again at each deploy, and set the password
     again. The file removes the role defaults that a viewer changed.
     Also run it again after an update of the extension `timescaledb`.
   - Let the role log in only from the network of the Grafana: a
     `pg_hba.conf` rule with the address range of that network. A changed
     password is then useless outside this network.
   - PostgreSQL has no memory limit for each role. Therefore, one query of a
     viewer can make a backend allocate much memory. Isolate the data source
     (a separate PostgreSQL), limit the memory of a backend, or accept the
     risk.
3. A PostgreSQL data source with the UID `sam-statistics-postgres` that
   logs in with this role and that a user cannot edit (example:
   [grafana/provisioning/datasources/statistics.yaml](../grafana/provisioning/datasources/statistics.yaml)).
   It opens at most the connection limit of the role (`maxOpenConns`, 10 or
   less), and it closes a connection after 60 seconds
   (`connMaxLifetime: 60`). This ends the session settings that a viewer can
   change with `SET`.
4. The dashboard file
   [grafana/dashboards/statistics.json](../grafana/dashboards/statistics.json)
   (UID `sam-statistics`) from a fixed commit of this repository, through a
   file provider that does not permit changes in the user interface
   (example:
   [grafana/provisioning/dashboards/statistics.yaml](../grafana/provisioning/dashboards/statistics.yaml)).
   A change of the dashboard goes live when you update the file.

Then set `STATISTICS_GRAFANA_URL` for the environment in Vercel. The value
is the origin of the Grafana (scheme, host and port, for example
`https://statistics.example.com`), without a path and without a user name
or password. The page also needs `EMBED_JWT_PRIVATE_KEY` (see
[7. Set up Vercel](#7-set-up-vercel)).
