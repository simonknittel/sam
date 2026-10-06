resource "aws_lambda_function" "main" {
  filename         = "${path.module}/placeholder.zip" # cd placeholder && zip -r ../placeholder.zip .
  function_name    = var.function_name
  role             = aws_iam_role.main.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/placeholder.zip")
  runtime          = var.runtime
  timeout          = var.timeout
  memory_size      = var.memory_size
  architectures    = ["arm64"]

  # https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html
  # https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
  reserved_concurrent_executions = 1

  tracing_config {
    mode = "Active"
  }

  # With JSON, the Lambda runtime adds the timestamp, the level and the request
  # ID to each console call (see pnpm-monorepo/apps/lambda/src/common/logger.ts).
  # INFO is the lowest level that the code uses. The system log level INFO
  # keeps the "start" and "report" lines of each invocation.
  logging_config {
    log_format            = "JSON"
    application_log_level = "INFO"
    system_log_level      = "INFO"
  }

  layers = [
    "arn:aws:lambda:eu-central-1:580247275435:layer:LambdaInsightsExtension-Arm64:25" # https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versionsARM.html
  ]

  lifecycle {
    # Changes to the function's source code are deployed using `.github/workflows/deploy-lambda-functions.yml`
    ignore_changes = [
      filename,
      source_code_hash
    ]
  }

  environment {
    variables = merge(
      {
        TZ           = "Europe/Berlin",
        NODE_ENV     = "production",
        NODE_OPTIONS = "--enable-source-maps"
      },
      var.environment_variables
    )
  }
}
