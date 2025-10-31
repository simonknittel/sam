module "midnight_automations" {
  source = "./modules/scheduled-lambda"

  function_name         = "midnight-automations"
  account_id            = data.aws_caller_identity.current.account_id
  timeout               = 180
  environment_variables = var.midnight_automations_environment_variables
  schedule_expression   = "cron(0 0 * * ? *)"
  scheduler_state       = "ENABLED"
  event_bus             = data.aws_cloudwatch_event_bus.default
}
