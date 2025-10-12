resource "aws_scheduler_schedule" "schedule" {
  name = "${var.function_name}-schedule"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = var.schedule_expression
  schedule_expression_timezone = "Europe/Berlin"
  state                        = var.scheduler_state

  target {
    arn      = aws_lambda_function.main.arn
    role_arn = aws_iam_role.main.arn

    retry_policy {
      maximum_retry_attempts = 0
    }
  }
}
