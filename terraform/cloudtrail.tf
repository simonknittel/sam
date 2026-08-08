locals {
  cloudtrail_trail_name = "management-events"
  cloudtrail_trail_arn  = "arn:aws:cloudtrail:eu-central-1:${data.aws_caller_identity.current.account_id}:trail/${local.cloudtrail_trail_name}"
}

resource "aws_cloudtrail" "management_events" {
  name                          = local.cloudtrail_trail_name
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  # The log group only exists to drive the metric filters in
  # cloudtrail-alarms.tf — the S3 bucket is the long-term archive. CloudTrail
  # requires the ":*" suffix on the log group ARN.
  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_cloudwatch_logs.arn

  advanced_event_selector {
    name = "Management events selector"

    field_selector {
      field  = "eventCategory"
      equals = ["Management"]
    }
  }

  depends_on = [aws_s3_bucket_policy.cloudtrail]
}

resource "aws_cloudwatch_log_group" "cloudtrail" {
  name = "cloudtrail-management-events"

  retention_in_days = 90
}

resource "aws_iam_role" "cloudtrail_cloudwatch_logs" {
  name = "cloudtrail-cloudwatch-logs"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Condition = {
          StringEquals = {
            "aws:SourceArn" = local.cloudtrail_trail_arn
          }
        }
      },
    ]
  })
}

resource "aws_iam_role_policy" "cloudtrail_cloudwatch_logs" {
  role = aws_iam_role.cloudtrail_cloudwatch_logs.id
  name = "cloudwatch-logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Effect = "Allow"
        Resource = [
          "${aws_cloudwatch_log_group.cloudtrail.arn}:log-stream:*"
        ]
      }
    ]
  })
}

resource "aws_s3_bucket" "cloudtrail" {
  bucket = var.cloudtrail_s3_bucket_name
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  rule {
    # 400 days keeps a good year of history for investigations while capping
    # storage costs. CloudWatch Logs only retains 90 days, so this bucket is
    # the long-term archive.
    id     = "expire-old-logs"
    status = "Enabled"

    filter {}

    expiration {
      days = 400
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  policy = data.aws_iam_policy_document.cloudtrail_bucket.json
}

# The statement IDs match the ones the AWS console generated when the trail was
# created so the imported policy produces no diff.
data "aws_iam_policy_document" "cloudtrail_bucket" {
  statement {
    sid    = "AWSCloudTrailAclCheck20150319-1d417618-5896-4bb9-bb05-f486c4ac2061"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions   = ["s3:GetBucketAcl"]
    resources = [aws_s3_bucket.cloudtrail.arn]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [local.cloudtrail_trail_arn]
    }
  }

  statement {
    sid    = "AWSCloudTrailWrite20150319-a14f6971-092b-4450-8ea0-fd5cd2cb68d1"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.cloudtrail.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [local.cloudtrail_trail_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
  }
}
