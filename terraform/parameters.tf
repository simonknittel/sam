# SSM parameters read by the Lambda functions at cold start (see the
# parameter maps in apps/lambda/src/*/setup.ts).
#
# Values are intentionally not managed here: parameters are created with a
# placeholder and populated manually via the AWS Console; `ignore_changes`
# keeps Terraform from ever writing them again. Note that Terraform still
# mirrors the current values into its (S3) state on refresh — that is
# inherent to aws_ssm_parameter.
#
# The import blocks adopt the parameters which already existed before this
# file; they are no-ops once the resources are in the state. The `type` of
# each imported parameter mirrors what the account showed at import time —
# a plan proposing a REPLACE for one of them means the type diverges and
# must be corrected here first (a replace would wipe the value).

import {
  to = aws_ssm_parameter.database_connection_string
  id = "/database/connection_string"
}

resource "aws_ssm_parameter" "database_connection_string" {
  name  = "/database/connection_string"
  type  = "SecureString"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

import {
  to = aws_ssm_parameter.discord_bot_token
  id = "/discord/bot_token"
}

resource "aws_ssm_parameter" "discord_bot_token" {
  name = "/discord/bot_token"
  # Deliberately diverges from the pre-import state (String): the token is a
  # secret and gets re-encrypted on first apply — an in-place update that
  # rewrites the imported (real) value, not the placeholder.
  type  = "SecureString"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

import {
  to = aws_ssm_parameter.mailgun_api_key
  id = "/mailgun/api_key"
}

resource "aws_ssm_parameter" "mailgun_api_key" {
  name  = "/mailgun/api_key"
  type  = "SecureString"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

import {
  to = aws_ssm_parameter.s3_access_key_id
  id = "/s3/access_key_id"
}

resource "aws_ssm_parameter" "s3_access_key_id" {
  name  = "/s3/access_key_id"
  type  = "String"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

import {
  to = aws_ssm_parameter.s3_account_id
  id = "/s3/account_id"
}

resource "aws_ssm_parameter" "s3_account_id" {
  name  = "/s3/account_id"
  type  = "String"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

import {
  to = aws_ssm_parameter.s3_bucket_name
  id = "/s3/bucket_name"
}

resource "aws_ssm_parameter" "s3_bucket_name" {
  name  = "/s3/bucket_name"
  type  = "String"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

import {
  to = aws_ssm_parameter.s3_secret_access_key
  id = "/s3/secret_access_key"
}

resource "aws_ssm_parameter" "s3_secret_access_key" {
  name  = "/s3/secret_access_key"
  type  = "SecureString"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

import {
  to = aws_ssm_parameter.web_push_public_vapid_key
  id = "/web_push/public_vapid_key"
}

resource "aws_ssm_parameter" "web_push_public_vapid_key" {
  name  = "/web_push/public_vapid_key"
  type  = "String"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

import {
  to = aws_ssm_parameter.web_push_private_vapid_key
  id = "/web_push/private_vapid_key"
}

resource "aws_ssm_parameter" "web_push_private_vapid_key" {
  name  = "/web_push/private_vapid_key"
  type  = "SecureString"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

# Soketi connection for realtime on-site notifications. New parameters (no
# import) and optional for the notification-router Lambda: placeholder
# values are treated as unset and realtime publishing is skipped.

resource "aws_ssm_parameter" "soketi_app_id" {
  name  = "/soketi/app_id"
  type  = "String"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "soketi_app_key" {
  name  = "/soketi/app_key"
  type  = "String"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "soketi_app_secret" {
  name  = "/soketi/app_secret"
  type  = "SecureString"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "soketi_host" {
  name  = "/soketi/host"
  type  = "String"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "soketi_port" {
  name  = "/soketi/port"
  type  = "String"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "soketi_secure_port" {
  name  = "/soketi/secure_port"
  type  = "String"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}
