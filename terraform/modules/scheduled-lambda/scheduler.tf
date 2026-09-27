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

# The scheduler invokes the function asynchronously, and Lambda retries a
# failed asynchronous invocation two times by default. A retry runs every job
# of the invocation again, also the ones that succeeded.
resource "aws_lambda_function_event_invoke_config" "main" {
  function_name          = aws_lambda_function.main.function_name
  maximum_retry_attempts = 0
}
