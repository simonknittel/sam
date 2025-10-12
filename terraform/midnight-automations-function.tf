module "midnight_automations" {
  source = "./modules/scheduled-lambda"

  function_name         = "midnight-automations"
  account_id            = data.aws_caller_identity.current.account_id
  timeout               = 180
  schedule_expression   = "cron(0 0 * * ? *)"
  scheduler_state       = "DISABLED"
}
