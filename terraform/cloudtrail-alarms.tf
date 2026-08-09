# Alerting on suspicious activity recorded by CloudTrail, based on the CIS AWS
# Foundations Benchmark monitoring controls. The alarms have no alarm_actions —
# AWS User Notifications (user-notifications.tf) picks up every alarm state
# change in eu-central-1 and delivers it via email.

resource "aws_cloudwatch_log_metric_filter" "unauthorized_api_calls" {
  name           = "unauthorized-api-calls"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name

  # AccessDenied errors are the typical trace of a leaked access key being
  # probed for permissions.
  pattern = "{ ($.errorCode = \"*UnauthorizedOperation\") || ($.errorCode = \"AccessDenied*\") }"

  metric_transformation {
    name      = "UnauthorizedApiCalls"
    namespace = "CloudTrail"
    value     = "1"
    # Emitting 0 for non-matching events keeps the metric populated so the
    # alarm can settle back to OK between incidents.
    default_value = "0"
  }
}

# The following filters all feed one shared metric: each single occurrence is
# critical, so one alarm with a threshold of 1 covers them together.

resource "aws_cloudwatch_log_metric_filter" "root_account_usage" {
  name           = "root-account-usage"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name

  pattern = "{ $.userIdentity.type = \"Root\" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != \"AwsServiceEvent\" }"

  metric_transformation {
    name          = "CriticalAccountActivity"
    namespace     = "CloudTrail"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "console_signin_failures" {
  name           = "console-signin-failures"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name

  pattern = "{ ($.eventName = \"ConsoleLogin\") && ($.errorMessage = \"Failed authentication\") }"

  metric_transformation {
    name          = "CriticalAccountActivity"
    namespace     = "CloudTrail"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "iam_policy_changes" {
  name           = "iam-policy-changes"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name

  # Also triggered by our own Terraform applies which touch IAM — that noise is
  # accepted as a confirmation the detection works.
  pattern = "{ ($.eventName = \"DeleteGroupPolicy\") || ($.eventName = \"DeleteRolePolicy\") || ($.eventName = \"DeleteUserPolicy\") || ($.eventName = \"PutGroupPolicy\") || ($.eventName = \"PutRolePolicy\") || ($.eventName = \"PutUserPolicy\") || ($.eventName = \"CreatePolicy\") || ($.eventName = \"DeletePolicy\") || ($.eventName = \"CreatePolicyVersion\") || ($.eventName = \"DeletePolicyVersion\") || ($.eventName = \"AttachRolePolicy\") || ($.eventName = \"DetachRolePolicy\") || ($.eventName = \"AttachUserPolicy\") || ($.eventName = \"DetachUserPolicy\") || ($.eventName = \"AttachGroupPolicy\") || ($.eventName = \"DetachGroupPolicy\") }"

  metric_transformation {
    name          = "CriticalAccountActivity"
    namespace     = "CloudTrail"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "cloudtrail_configuration_changes" {
  name           = "cloudtrail-configuration-changes"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name

  # Disabling or blinding the trail is a typical first move of an attacker
  # hiding their tracks.
  pattern = "{ ($.eventName = \"CreateTrail\") || ($.eventName = \"UpdateTrail\") || ($.eventName = \"DeleteTrail\") || ($.eventName = \"StartLogging\") || ($.eventName = \"StopLogging\") || ($.eventName = \"PutEventSelectors\") }"

  metric_transformation {
    name          = "CriticalAccountActivity"
    namespace     = "CloudTrail"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "unauthorized_api_calls" {
  alarm_name = "Unauthorized API calls | cloudtrail [SAM] (${var.environment})"

  namespace   = "CloudTrail"
  metric_name = "UnauthorizedApiCalls"

  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  # Benign AccessDenied events happen occasionally (the AWS console probes
  # permissions in the background), so a single event must not alert. Tune
  # after observing real-world noise.
  threshold           = 3
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  period              = 300
  treat_missing_data  = "notBreaching"
  alarm_description   = "This alarm detects a burst of AccessDenied/UnauthorizedOperation API calls, which may indicate a leaked access key being probed for permissions."
}

resource "aws_cloudwatch_metric_alarm" "critical_account_activity" {
  alarm_name = "Critical account activity | cloudtrail [SAM] (${var.environment})"

  namespace   = "CloudTrail"
  metric_name = "CriticalAccountActivity"

  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  period              = 300
  treat_missing_data  = "notBreaching"
  alarm_description   = "This alarm detects critical account activity: root account usage, console sign-in failures, IAM policy changes or CloudTrail configuration changes. Check the cloudtrail-management-events log group for the matching event."
}

# Saved Logs Insights queries, one per alarm, named after the alarm they belong
# to. When an alarm fires, run the matching query over the alarm's time range to
# see the exact events which triggered it. The filter expressions must stay in
# sync with the metric filter patterns above — Logs Insights has no way to reuse
# them.

resource "aws_cloudwatch_query_definition" "unauthorized_api_calls" {
  name = "cloudtrail-alarms/${aws_cloudwatch_metric_alarm.unauthorized_api_calls.alarm_name}"

  log_group_names = [aws_cloudwatch_log_group.cloudtrail.name]

  query_string = <<-EOT
    fields @timestamp, eventSource, eventName, errorCode, errorMessage, userIdentity.arn, userIdentity.accessKeyId, sourceIPAddress, userAgent
    | filter errorCode like /UnauthorizedOperation$/ or errorCode like /^AccessDenied/
    | sort @timestamp desc
  EOT
}

resource "aws_cloudwatch_query_definition" "critical_account_activity" {
  name = "cloudtrail-alarms/${aws_cloudwatch_metric_alarm.critical_account_activity.alarm_name}"

  log_group_names = [aws_cloudwatch_log_group.cloudtrail.name]

  # One clause per metric filter feeding the CriticalAccountActivity metric.
  # The eventName and userIdentity.type columns show which category matched.
  query_string = <<-EOT
    fields @timestamp, eventSource, eventName, userIdentity.type, userIdentity.arn, sourceIPAddress, errorMessage
    | filter (userIdentity.type = "Root" and not ispresent(userIdentity.invokedBy) and eventType != "AwsServiceEvent")
      or (eventName = "ConsoleLogin" and errorMessage = "Failed authentication")
      or eventName in ["DeleteGroupPolicy", "DeleteRolePolicy", "DeleteUserPolicy", "PutGroupPolicy", "PutRolePolicy", "PutUserPolicy", "CreatePolicy", "DeletePolicy", "CreatePolicyVersion", "DeletePolicyVersion", "AttachRolePolicy", "DetachRolePolicy", "AttachUserPolicy", "DetachUserPolicy", "AttachGroupPolicy", "DetachGroupPolicy"]
      or eventName in ["CreateTrail", "UpdateTrail", "DeleteTrail", "StartLogging", "StopLogging", "PutEventSelectors"]
    | sort @timestamp desc
  EOT
}
