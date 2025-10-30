resource "aws_sqs_queue" "main" {
  visibility_timeout_seconds = var.timeout * 6 # https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.main_deadletter.arn
    maxReceiveCount     = 5 # https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig
  })
}

resource "aws_sqs_queue" "main_deadletter" {}

resource "aws_sqs_queue_redrive_allow_policy" "main_deadletter" {
  queue_url = aws_sqs_queue.main_deadletter.id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue",
    sourceQueueArns   = [aws_sqs_queue.main.arn]
  })
}

resource "aws_sqs_queue_policy" "main" {
  queue_url = aws_sqs_queue.main.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = ["events.amazonaws.com"]
        },
        Action   = ["sqs:SendMessage"],
        Resource = aws_sqs_queue.main.arn
      }
    ]
  })
}

resource "aws_lambda_permission" "sqs" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "sqs.amazonaws.com"
  source_arn    = aws_sqs_queue.main.arn
}

resource "aws_lambda_event_source_mapping" "main" {
  event_source_arn        = aws_sqs_queue.main.arn
  function_name           = aws_lambda_function.main.arn
  function_response_types = ["ReportBatchItemFailures"] # https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting
  batch_size              = var.batch_size
  maximum_batching_window_in_seconds = var.batch_window

  scaling_config {
    maximum_concurrency = var.reserved_concurrent_executions
  }
}
