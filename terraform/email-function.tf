module "email_function" {
  source = "./modules/eventbridge-sqs-lambda"

  function_name                  = "email-function"
  reserved_concurrent_executions = 2
  account_id                     = data.aws_caller_identity.current.account_id
  timeout                        = 15
  event_bus                      = data.aws_cloudwatch_event_bus.default
  event_bus_detail_type          = "EmailRequested"
  dynamodb                       = aws_dynamodb_table.sqs_processed_requests
  runtime                        = "nodejs20.x"
  parameters                     = var.email_function_parameters
  batch_size                     = 10
  batch_window                   = 30
}
