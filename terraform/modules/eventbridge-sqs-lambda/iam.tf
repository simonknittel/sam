resource "aws_iam_role" "main" {
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = var.account_id
          }
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "main_aws_lambda_basic_execution_role" {
  role       = aws_iam_role.main.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "main_aws_xray_daemon_write_access" {
  role       = aws_iam_role.main.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy_attachment" "main_cloudwatch_lambda_insights_execution_role_policy" {
  role       = aws_iam_role.main.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy"
}

resource "aws_iam_role_policy" "main_parameter_store" {
  role = aws_iam_role.main.id
  name = "parameter-store"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "kms:Decrypt",
          "ssm:GetParameter",
        ]
        Effect = "Allow"
        Resource = concat(
          [
            data.aws_kms_alias.ssm.target_key_arn,
          ],
          [for param in var.parameters : "arn:aws:ssm:eu-central-1:${var.account_id}:parameter${param}"]
        )
      }
    ]
  })
}

resource "aws_iam_role_policy" "main_sqs" {
  role = aws_iam_role.main.id
  name = "sqs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-lambda-function-trigger.html#configure-lambda-function-trigger-prerequisites
        Action = [
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ReceiveMessage"
        ]
        Effect = "Allow"
        Resource = [
          aws_sqs_queue.main.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "main_dynamodb" {
  role = aws_iam_role.main.id
  name = "dynamodb"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
        ]
        Effect = "Allow"
        Resource = [
          var.dynamodb.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "main_eventbridge" {
  role = aws_iam_role.main.id
  name = "eventbridge"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "events:PutEvents"
        ]
        Effect = "Allow"
        Resource = [
          var.event_bus.arn
        ]
      }
    ]
  })
}

data "aws_kms_alias" "ssm" {
  name = "alias/aws/ssm"
}
