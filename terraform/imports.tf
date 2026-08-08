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
