variable "function_name" {
  type = string
}

variable "environment_variables" {
  type      = map(string)
  sensitive = true
}

variable "account_id" {
  type = string
}

variable "timeout" {
  type    = number
  default = 15
}

variable "schedule_expression" {
  type    = string
}
