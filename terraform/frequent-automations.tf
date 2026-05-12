module "frequent_automations" {
  source = "./modules/scheduled-lambda"

  function_name = "frequent-automations"
  account_id    = data.aws_caller_identity.current.account_id
  timeout       = 90
  memory_size   = 256
  environment_variables = merge(
    {
      AWS_EVENT_BUS_ARN = data.aws_cloudwatch_event_bus.default.arn
    },
    var.frequent_automations_environment_variables
  )
  schedule_expression = "cron(*/15 * * * ? *)"
  event_bus           = data.aws_cloudwatch_event_bus.default
  runtime             = "nodejs22.x"
  parameters = [
    "/database/connection_string",
  ]
}
