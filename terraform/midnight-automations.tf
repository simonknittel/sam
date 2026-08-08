module "midnight_automations" {
  source = "./modules/scheduled-lambda"

  function_name = "midnight-automations"
  environment   = var.environment
  account_id    = data.aws_caller_identity.current.account_id
  timeout       = 180
  environment_variables = merge(
    {
      AWS_EVENT_BUS_ARN = data.aws_cloudwatch_event_bus.default.arn
    },
    var.midnight_automations_environment_variables
  )
  schedule_expression = "cron(0 0 * * ? *)"
  scheduler_state     = "ENABLED"
  event_bus           = data.aws_cloudwatch_event_bus.default
  runtime             = "nodejs24.x"
  memory_size         = 512
  parameters = [
    "/database/connection_string",
    "/s3/access_key_id",
    "/s3/account_id",
    "/s3/bucket_name",
    "/s3/secret_access_key",
  ]
}
