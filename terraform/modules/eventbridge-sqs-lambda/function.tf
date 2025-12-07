resource "aws_lambda_function" "main" {
  filename         = "${path.module}/placeholder.zip" # cd placeholder && zip -r ../placeholder.zip .
  function_name    = var.function_name
  role             = aws_iam_role.main.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/placeholder.zip")
  runtime          = var.runtime
  timeout          = var.timeout
  memory_size      = 256
  architectures    = ["arm64"]

  # https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html
  # https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
  reserved_concurrent_executions = var.reserved_concurrent_executions

  tracing_config {
    mode = "Active"
  }

  layers = [
    "arn:aws:lambda:eu-central-1:187925254637:layer:AWS-Parameters-and-Secrets-Lambda-Extension-Arm64:21", # https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html#ps-integration-lambda-extensions-add
    "arn:aws:lambda:eu-central-1:580247275435:layer:LambdaInsightsExtension-Arm64:25" # https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versionsARM.html
  ]

  lifecycle {
    # Changes to the function's source code are deployed using `.github/workflows/deploy-email-function.yml`
    ignore_changes = [
      filename,
      source_code_hash
    ]
  }

  environment {
    variables = merge(
      {
        TZ = "Europe/Berlin",
        NODE_ENV = "production",
        NODE_OPTIONS = "--enable-source-maps"
      },
      var.environment_variables
    )
  }
}

resource "aws_lambda_provisioned_concurrency_config" "main" {
  count = var.provisioned_concurrent_executions > 0 ? 1 : 0

  function_name                     = aws_lambda_function.main.function_name
  provisioned_concurrent_executions = var.provisioned_concurrent_executions
  qualifier                         = aws_lambda_function.main.version
}
