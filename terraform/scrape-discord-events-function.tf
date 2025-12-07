module "scrape_discord_events_function" {
  source = "./modules/scheduled-lambda"

  function_name         = "scrape-discord-events-function"
  account_id            = data.aws_caller_identity.current.account_id
  timeout               = 180
  memory_size           = 256
  environment_variables = merge(
    {
      AWS_EVENT_BUS_ARN = data.aws_cloudwatch_event_bus.default.arn
    },
    var.scrape_discord_events_function_environment_variables
  )
  schedule_expression   = "rate(4 minutes)"
  event_bus             = data.aws_cloudwatch_event_bus.default
  runtime               = "nodejs22.x"
  parameters = [
    "/database/connection_string",
    "/discord/bot_token",
  ]
}
