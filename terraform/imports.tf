# Import blocks for resources which were created manually through the AWS
# console. Remove this file once the imports have been applied to the test
# account's state. The identifiers are specific to the test account — a future
# prod account must be applied without this file so the resources get created
# fresh.

import {
  to = aws_cloudtrail.management_events
  id = "arn:aws:cloudtrail:eu-central-1:220746603587:trail/management-events"
}

import {
  to = aws_s3_bucket.cloudtrail
  id = "aws-cloudtrail-logs-220746603587-6f2d1bf9"
}

import {
  to = aws_s3_bucket_policy.cloudtrail
  id = "aws-cloudtrail-logs-220746603587-6f2d1bf9"
}

import {
  to = aws_s3_bucket_public_access_block.cloudtrail
  id = "aws-cloudtrail-logs-220746603587-6f2d1bf9"
}

import {
  to = aws_notifications_notification_hub.eu_central_1
  id = "eu-central-1"
}

import {
  to = aws_notificationscontacts_email_contact.simon_knittel
  id = "arn:aws:notifications-contacts::220746603587:emailcontact/a01hhsbt41vkzvna6n5vc0x1bcy"
}

import {
  to = aws_notifications_notification_configuration.cloudwatch_alarms
  id = "arn:aws:notifications::220746603587:configuration/a01hhsbt51hcth28h753cdqq9m8"
}

import {
  to = aws_notifications_event_rule.cloudwatch_alarms
  id = "arn:aws:notifications::220746603587:configuration/a01hhsbt51hcth28h753cdqq9m8/rule/a01hhsbt58qn5aadqrtaxqyknnp"
}

import {
  to = aws_notifications_channel_association.cloudwatch_alarms_email
  id = "arn:aws:notifications::220746603587:configuration/a01hhsbt51hcth28h753cdqq9m8,arn:aws:notifications-contacts::220746603587:emailcontact/a01hhsbt41vkzvna6n5vc0x1bcy"
}
