# TF_VAR_scrape_discord_events_function_environment_variables = {"VAR_1":"value","VAR_2":"value"}
variable "scrape_discord_events_function_environment_variables" {
  type      = map(string)
  sensitive = true
}

# TF_VAR_midnight_automations_environment_variables = {"VAR_1":"value","VAR_2":"value"}
variable "midnight_automations_environment_variables" {
  type      = map(string)
  sensitive = true
}

# TF_VAR_notification_router_environment_variables = {"VAR_1":"value","VAR_2":"value"}
variable "notification_router_environment_variables" {
  type      = map(string)
  sensitive = true
}

# TF_VAR_frequent_automations_environment_variables = {"VAR_1":"value","VAR_2":"value"}
variable "frequent_automations_environment_variables" {
  type      = map(string)
  sensitive = true
}

# TF_VAR_email_function_environment_variables = {"VAR_1":"value","VAR_2":"value"}
variable "email_function_environment_variables" {
  type      = map(string)
  sensitive = true
}

# TF_VAR_cloudtrail_s3_bucket_name = "aws-cloudtrail-logs-<account id>-<random suffix>"
variable "cloudtrail_s3_bucket_name" {
  type = string
}

# TF_VAR_environment = "Test"
variable "environment" {
  type = string

  validation {
    condition     = contains(["Test", "Prod"], var.environment)
    error_message = "The environment must be either \"Test\" or \"Prod\"."
  }
}
