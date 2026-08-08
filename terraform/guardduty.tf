# GuardDuty complements the CloudTrail alarms: those only catch a leaked key
# which lacks permissions (AccessDenied bursts), while GuardDuty also detects
# anomalous successful API usage. A detector runs in every enabled region
# because each one only analyzes its own region's events — idle regions
# produce almost no analyzed events and therefore almost no cost.

data "aws_regions" "enabled" {}

locals {
  # ap-south-1 is unreachable from the network the applies run on (the
  # firewall blocks India traffic), so Terraform can neither create nor
  # refresh resources there. The multi-region CloudTrail trail still records
  # ap-south-1 activity server-side, so the CloudTrail alarms cover that
  # region.
  guardduty_unreachable_regions = ["ap-south-1"]

  guardduty_regions = setsubtract(
    toset(data.aws_regions.enabled.names),
    toset(local.guardduty_unreachable_regions),
  )

  # CreateDetector enables these paid protection plans by default. The
  # foundational sources (CLOUD_TRAIL, DNS_LOGS, FLOW_LOGS) are all this setup
  # needs, so everything else is explicitly disabled to keep costs down.
  guardduty_disabled_features = [
    "S3_DATA_EVENTS",
    "EKS_AUDIT_LOGS",
    "EBS_MALWARE_PROTECTION",
    "RDS_LOGIN_EVENTS",
    "LAMBDA_NETWORK_LOGS",
    "RUNTIME_MONITORING",
  ]
}

resource "aws_guardduty_detector" "all_regions" {
  for_each = local.guardduty_regions

  region = each.value
  enable = true

  finding_publishing_frequency = "FIFTEEN_MINUTES"
}

resource "aws_guardduty_detector_feature" "disabled" {
  for_each = {
    for pair in setproduct(tolist(local.guardduty_regions), local.guardduty_disabled_features) :
    "${pair[0]}/${pair[1]}" => pair
  }

  region      = each.value[0]
  detector_id = aws_guardduty_detector.all_regions[each.value[0]].id
  name        = each.value[1]
  status      = "DISABLED"
}

resource "aws_notifications_notification_configuration" "guardduty_findings" {
  name        = "guardduty-findings"
  description = "GuardDuty findings of all severities"

  aggregation_duration = "NONE"
}

resource "aws_notifications_event_rule" "guardduty_findings" {
  notification_configuration_arn = aws_notifications_notification_configuration.guardduty_findings.arn
  source                         = "aws.guardduty"
  event_type                     = "GuardDuty Finding"
  regions                        = local.guardduty_regions
}

resource "aws_notifications_channel_association" "guardduty_findings_email" {
  arn                            = aws_notificationscontacts_email_contact.simon_knittel.arn
  notification_configuration_arn = aws_notifications_notification_configuration.guardduty_findings.arn
}
