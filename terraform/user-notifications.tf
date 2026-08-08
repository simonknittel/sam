# AWS User Notifications delivers CloudWatch alarms (and GuardDuty findings)
# via email. The service API is global and lives in us-east-1; the provider
# handles the endpoint region itself.

resource "aws_notifications_notification_hub" "eu_central_1" {
  notification_hub_region = "eu-central-1"
}

resource "aws_notificationscontacts_email_contact" "simon_knittel" {
  name          = "Simon Knittel"
  email_address = "hallo@simonknittel.de"
}

resource "aws_notifications_notification_configuration" "cloudwatch_alarms" {
  name        = "cloudwatch-alarms"
  description = ""

  aggregation_duration = "NONE"
}

resource "aws_notifications_event_rule" "cloudwatch_alarms" {
  notification_configuration_arn = aws_notifications_notification_configuration.cloudwatch_alarms.arn
  source                         = "aws.cloudwatch"
  event_type                     = "CloudWatch Alarm State Change"
  regions                        = ["eu-central-1"]

  event_pattern = jsonencode({
    detail = {
      previousState = {
        value = ["OK", "INSUFFICIENT_DATA"]
      }
      state = {
        value = ["ALARM"]
      }
    }
  })
}

# The AWS Console Mobile App channel of this notification configuration is
# intentionally not managed here — it is tied to a personal device and SSO
# identity, not to infrastructure.
resource "aws_notifications_channel_association" "cloudwatch_alarms_email" {
  arn                            = aws_notificationscontacts_email_contact.simon_knittel.arn
  notification_configuration_arn = aws_notifications_notification_configuration.cloudwatch_alarms.arn
}
