# Set up test and production

## 1. Set up a PostgreSQL database

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
4. Create the frozen `production-gate` branch. Create a ruleset that blocks all pushes to this branch, with no bypass actors. Vercel requires that the Production Branch exists in the repository, but this branch must never move: a push to it would start a git-driven production deployment.
5. Set `Production Branch` (Settings > Environments > Production) to `production-gate`. Then pushes to `main` only create preview deployments, and only the [Release workflow](./releasing.md) creates production deployments.
6. Create an access token (Account Settings > Tokens). Store the token and the IDs from the project settings as the `VERCEL_TOKEN`, `VERCEL_ORG_ID` (team ID) and `VERCEL_PROJECT_ID` secrets of the `Production` GitHub environment.
7. Generate a **separate** `EMBED_JWT_PRIVATE_KEY` for the Production environment and for the Preview environment (see [Embedded App Authentication](./embedded-app-authentication.md) and the generation command in [Set up the local machine](./setup-local-machine.md#embedded-app-authentication)). With one shared key, a token from a preview deployment can verify as a production token. If the variable is not set, the feature is disabled for that environment.

## 8. Remaining manual steps

1. Enable the monthly budget report on AWS manually
   - Budget report name: `Total monthly costs`
   - Select budgets: `Total monthly budget`
   - Report frequency: `Monthly`
   - Day of month: `1`
