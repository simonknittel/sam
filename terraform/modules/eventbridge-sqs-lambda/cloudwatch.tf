# https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best_Practice_Recommended_Alarms_AWS_Services.html

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name = "${var.function_name}-lambda-throttles"

  namespace   = "AWS/Lambda"
  metric_name = "Throttles"
  dimensions = {
    FunctionName = var.function_name
  }

  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  period              = 60
  alarm_description   = "This alarm detects a high number of throttled invocation requests for this Lambda function."
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name = "${var.function_name}-lambda-errors"

  namespace   = "AWS/Lambda"
  metric_name = "Errors"
  dimensions = {
    FunctionName = var.function_name
  }

  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  period              = 60
  alarm_description   = "This alarm detects a high number of errors for this Lambda function."
}

resource "aws_cloudwatch_metric_alarm" "deadletter_message_count" {
  alarm_name = "deadletter-message-count-${var.function_name}"

  namespace   = "AWS/SQS"
  metric_name = "ApproximateNumberOfMessagesVisible"

  dimensions = {
    QueueName = aws_sqs_queue.main_deadletter.name
  }

  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  period              = 60
  alarm_description   = "This alarm detects if there are messages in the dead letter queue."

  alarm_actions = []
}
