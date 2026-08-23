# Terraform

Infrastructure for the AWS-hosted parts of the project: the Lambda functions with their triggers, and account-level monitoring and security services.

> [!NOTE]
> Everything deploys to the test AWS account only. A production AWS account does not exist yet, thus the test environment intentionally also operates as production. See [docs/setup-test-and-production.md](../docs/setup-test-and-production.md) and [docs/releasing.md](../docs/releasing.md).

## Layout

- The root module has one `.tf` file for each concern (for example `midnight-automations.tf`, `notification-router.tf`, `guardduty.tf`, `budgets.tf`)
- `modules/scheduled-lambda`: a Lambda function that an EventBridge schedule triggers (`midnight-automations`, `frequent-automations` and `scrape-discord-events-function` use it)
- `modules/eventbridge-sqs-lambda`: a Lambda function that consumes EventBridge events through an SQS queue (`notification-router` and `email-function` use it)

The code of the Lambda functions is in `pnpm-monorepo/apps/lambda`, and the GitHub workflows deploy it ([docs/releasing.md](../docs/releasing.md)). Terraform only provisions the functions with a placeholder and ignores subsequent code changes.

## Usage

See [docs/setup-test-and-production.md](../docs/setup-test-and-production.md) for the backend and variable setup. The terraform-validate, terraform-plan and terraform-apply GitHub workflows validate, plan and apply changes.
