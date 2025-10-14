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

resource "aws_cloudwatch_metric_alarm" "memory_utilization" {
  alarm_name = "${var.function_name}-memory-utilization"

  namespace   = "LambdaInsights"
  metric_name = "memory_utilization"
  dimensions = {
    function_name = var.function_name
  }

  statistic           = "Maximum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 90
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  period              = 60
  alarm_description   = "This alarm detects when this Lambda function is using a high amount of memory."
}
