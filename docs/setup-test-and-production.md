# Setup Test and Production

## 1. Set up a PostgreSQL database

## 2. Set up Cloudflare R2

## 3. Set up Mailgun

1. Create API keys for sending

   1. `sinister-incorporated-aws-test`
   2. `sinister-incorporated-aws-prod`

## 4. Set up GitHub

1. Create environments
   1. `terraform-test`
   2. `terraform-prod`
2. Create environment variables
   - `IAM_ROLE`
3. Enable "Allow GitHub Actions to create and approve pull requests" in Settings/Actions/General/Workflow permissions

## 5. Set up AWS

1. Create AWS accounts

   1. `sam-test`
   2. `sam-prod`

2. Prepare AWS CLI

   ```ini
   # ~/.aws/config

   # SAM
   [profile sam-test]
   sso_session = sam-sso
   sso_account_id = 220746603587
   sso_role_name = AdministratorAccess

   [profile sam-prod]
   sso_session = sam-sso
   sso_account_id =
   sso_role_name = AdministratorAccess

   [sso-session sam-sso]
   sso_region = eu-central-1
   sso_start_url = https://simonknittel.awsapps.com/start
   ```

3. Create and deploy setup stack with AWS CloudFormation

   1. Create and populate `test-parameters.json` and `prod-parameters.json`
   1. `AWS_PROFILE=sam-test aws sso login`
   2. `AWS_PROFILE=sam-test aws --region eu-central-1 cloudformation deploy --template-file setup.yaml --stack-name setup --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM --tags ManagedBy=CloudFormation Repository=simonknittel/sam --parameter-override file://test-parameters.json`

4. Set up AWS User Notifications

   1. The notification hub, the email contact, and the notification configurations for CloudWatch alarms and GuardDuty findings (incl. their email delivery) are managed with Terraform (see `terraform/user-notifications.tf`)
   2. After the first apply, activate the email contact through the activation mail AWS sends
   3. Manually through the console:
      1. Create the notification configuration for Health (quick setup)
      2. Optionally add the AWS Console Mobile App as an additional delivery channel to the Terraform-managed notification configurations (personal devices are intentionally not managed with Terraform)

### Related

- https://stackoverflow.com/questions/51273227/whats-the-most-efficient-way-to-determine-the-minimum-aws-permissions-necessary
- https://github.com/iann0036/iamlive
  - `iamlive --mode proxy --force-wildcard-resource --output-file policy.json --sort-alphabetical`
  - `HTTP_PROXY=http://127.0.0.1:10080 HTTPS_PROXY=http://127.0.0.1:10080 AWS_CA_BUNDLE=~/.iamlive/ca.pem AWS_CSM_ENABLED=true AWS_PROFILE=sam-test terraform plan -var-file="test.tfvars"`

## 6. Set up Terraform

1. Create and populate `test.s3.tfbackend`, `prod.s3.tfbackend`, `test.tfvars` and `prod.tfvars`
2. Create Terraform resources

   1. `AWS_PROFILE=sam-test aws sso login`
   2. `AWS_PROFILE=sam-test terraform init -backend-config=test.s3.tfbackend -reconfigure`
   3. `AWS_PROFILE=sam-test terraform apply -var-file="test.tfvars"`

## 7. Set up Vercel

1. Set `Root Directory` to `pnpm-monorepo/apps/app` and keep "Include source files outside of the Root Directory in the Build Step" enabled (required for the workspace lockfile and `pnpm-workspace.yaml` at the `pnpm-monorepo` root)
2. Add the environment variable `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel uses the pinned pnpm version. Vercel reads the `packageManager` field from the package.json at the repository root (not the Root Directory), so the pin lives in `/package.json` (kept in sync with `pnpm-monorepo/package.json`)
3. The `Ignored Build Step` is configured in code via `pnpm-monorepo/apps/app/vercel.json` (it runs `.vercel/ignore-step.sh` from the repository root); remove any `Ignored Build Step` override in the dashboard
4. Create the frozen `production-gate` branch and a ruleset that blocks all pushes to it (no bypass actors). Vercel requires the Production Branch to exist in the repository, but this branch must never move: an accidental push to it would trigger a git-driven production deployment
5. Set `Production Branch` (Settings > Environments > Production) to `production-gate`: pushes to `main` then only create preview deployments, and production deployments are only created by the [Release workflow](./releasing.md)
6. Create an access token (Account Settings > Tokens) and store it together with the IDs from the project's settings as the `VERCEL_TOKEN`, `VERCEL_ORG_ID` (team ID) and `VERCEL_PROJECT_ID` secrets of the `Production` GitHub environment

## 8. Left over

1. Manually enable we monthly budget report on AWS
   - Budget report name: `Total monthly costs`
   - Select budgets: `Total monthly budget`
   - Report frequency: `Monthly`
   - Day of month: `1`
