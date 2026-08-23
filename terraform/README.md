# Terraform

Infrastructure for the AWS-hosted parts of the project: the Lambda functions with their triggers, and account-level monitoring and security services.

> [!NOTE]
> Everything deploys to the test AWS account only — a production AWS account does not exist (yet), so the test environment intentionally doubles as production. See [docs/setup-test-and-production.md](../docs/setup-test-and-production.md) and [docs/releasing.md](../docs/releasing.md).

## Layout

- One `.tf` file per concern in the root module (e.g. `midnight-automations.tf`, `notification-router.tf`, `guardduty.tf`, `budgets.tf`)
- `modules/scheduled-lambda`: a Lambda function triggered by an EventBridge schedule (used by `midnight-automations`, `frequent-automations` and `scrape-discord-events-function`)
- `modules/eventbridge-sqs-lambda`: a Lambda function consuming EventBridge events through an SQS queue (used by `notification-router` and `email-function`)

The Lambda function code lives in `pnpm-monorepo/apps/lambda` and is deployed by the GitHub workflows ([docs/releasing.md](../docs/releasing.md)) — Terraform only provisions the functions with a placeholder and ignores subsequent code changes.

## Usage

See [docs/setup-test-and-production.md](../docs/setup-test-and-production.md) for the backend and variable setup. Changes are validated, planned and applied through the terraform-validate, terraform-plan and terraform-apply GitHub workflows.
