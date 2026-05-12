module "notification_router" {
  source = "./modules/eventbridge-sqs-lambda"

  function_name                  = "notification-router"
  reserved_concurrent_executions = 2
  account_id                     = data.aws_caller_identity.current.account_id
  timeout                        = 180
  event_bus                      = data.aws_cloudwatch_event_bus.default
  event_bus_detail_type          = "NotificationRequested"
  dynamodb                       = aws_dynamodb_table.sqs_processed_requests
  runtime                        = "nodejs22.x"
  environment_variables          = var.notification_router_environment_variables
  batch_size                     = 10
  batch_window                   = 30
  parameters = [
    "/database/connection_string",
    "/web_push/private_vapid_key",
    "/web_push/public_vapid_key",
  ]
}
