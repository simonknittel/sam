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

resource "aws_cloudwatch_query_definition" "max_memory_used" {
  name = "Max Memory Used (${var.function_name})"

  log_group_names = [
    "/aws/lambda/${var.function_name}",
  ]

  query_string = <<EOF
fields @timestamp, @message
| sort @timestamp desc
| limit 1000
| filter @message like "Max Memory Used"
| parse @message "Max Memory Used: * MB" as maxMemoryUsedMB
EOF
}

resource "aws_cloudwatch_log_metric_filter" "max_memory_used" {
  depends_on = [ aws_lambda_function.main ]

  name           = "Max Memory Used"
  log_group_name = "/aws/lambda/${var.function_name}"
  pattern        = "[report_name=\"REPORT\", request_id_name=\"RequestId:\", request_id_value, duration_name=\"Duration:\", duration_value, duration_unit=\"ms\", billed_duration_name_1=\"Billed\", bill_duration_name_2=\"Duration:\", billed_duration_value, billed_duration_unit=\"ms\", memory_size_name_1=\"Memory\", memory_size_name_2=\"Size:\", memory_size_value, memory_size_unit=\"MB\", max_memory_used_name_1=\"Max\", max_memory_used_name_2=\"Memory\", max_memory_used_name_3=\"Used:\", max_memory_used_value, max_memory_used_unit=\"MB\", ...]"

  metric_transformation {
    name      = "MaxMemoryUsedMB"
    namespace = var.function_name
    value     = "$max_memory_used_value"
    unit      = "Megabytes"
  }
}

resource "aws_cloudwatch_metric_alarm" "max_memory_used" {
  alarm_name = "${var.function_name}-max-memory-used"

  namespace   = var.function_name
  metric_name = "MaxMemoryUsedMB"

  statistic           = "Maximum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = (aws_lambda_function.main.memory_size * 0.9)
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  period              = 60
  alarm_description   = "This alarm detects when this Lambda function is using a high amount of memory."
}
