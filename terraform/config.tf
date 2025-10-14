# resource "aws_config_configuration_recorder" "default" {
#   role_arn = aws_iam_role.aws_config.arn

#   recording_group {
#     all_supported = false

#     # https://docs.aws.amazon.com/config/latest/developerguide/resource-config-reference.html
#     resource_types = [
#       "AWS::CloudFormation::Stack",
#       "AWS::KMS::Key",
#       "AWS::KMS::Alias",
#       "AWS::Lambda::Function",
#       "AWS::S3::Bucket",
#       "AWS::IAM::Role",
#       "AWS::CloudWatch::Alarm",
#       "AWS::Events::EventBus",
#       "AWS::Events::Rule",
#       "AWS::SQS::Queue",
#       "AWS::ACM::Certificate",
#       "AWS::DynamoDB::Table"
#     ]

#     recording_strategy {
#       use_only = "INCLUSION_BY_RESOURCE_TYPES"
#     }
#   }
# }

# resource "aws_config_configuration_recorder_status" "default" {
#   depends_on = [aws_config_delivery_channel.default]
#   name       = aws_config_configuration_recorder.default.name
#   is_enabled = true
# }

# resource "aws_iam_role" "aws_config" {
#   name = "aws-config"

#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#           Service = "config.amazonaws.com"
#         }
#         Condition = {
#           StringEquals = {
#             "aws:SourceAccount" = data.aws_caller_identity.current.account_id
#           }
#         }
#       }
#     ]
#   })

#   managed_policy_arns = [
#     "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
#   ]

#   inline_policy {
#     name = "s3"

#     policy = jsonencode({
#       Version = "2012-10-17"
#       Statement = [
#         {
#           Action = [
#             "s3:*",
#           ]
#           Effect = "Allow"
#           Resource = [
#             aws_s3_bucket.aws_config.arn,
#             "${aws_s3_bucket.aws_config.arn}/*",
#           ]
#         },
#       ]
#     })
#   }
# }

# resource "aws_config_delivery_channel" "default" {
#   depends_on     = [aws_config_configuration_recorder.default]
#   s3_bucket_name = aws_s3_bucket.aws_config.bucket

#   snapshot_delivery_properties {
#     delivery_frequency = "TwentyFour_Hours"
#   }
# }

# resource "aws_s3_bucket" "aws_config" {
#   bucket        = "config-bucket-${data.aws_caller_identity.current.account_id}"
#   force_destroy = true
# }

# resource "aws_s3_bucket_lifecycle_configuration" "aws_config" {
#   bucket = aws_s3_bucket.aws_config.id
#   rule {
#     id = "expiration"

#     expiration {
#       days = 90
#     }

#     status = "Enabled"
#   }
# }
