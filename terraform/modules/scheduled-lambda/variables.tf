variable "function_name" {
  type = string
}

variable "environment_variables" {
  type      = map(string)
  sensitive = true
  default = {}
}

variable "account_id" {
  type = string
}

variable "timeout" {
  type    = number
  default = 15
}

variable "memory_size" {
  type    = number
  default = 192
}

variable "schedule_expression" {
  type    = string
}

variable "scheduler_state" {
  type    = string
  default = "ENABLED"
}

variable "event_bus" {
  type = object({
    arn = string
  })
}
