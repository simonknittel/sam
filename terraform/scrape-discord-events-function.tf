module "scrape_discord_events_function" {
  source = "./modules/scheduled-lambda"

  function_name         = "scrape-discord-events-function"
  account_id            = data.aws_caller_identity.current.account_id
  timeout               = 60
  environment_variables = var.scrape_discord_events_function_environment_variables
}
