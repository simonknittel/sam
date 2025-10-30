variable "function_name" {
  type = string
}

variable "reserved_concurrent_executions" {
  type    = number
  default = -1
}

variable "provisioned_concurrent_executions" {
  type    = number
  default = 0
}

variable "parameters" {
  type = list(object({
    name  = string
    value = string
  }))
  default   = []
  sensitive = true
}

variable "account_id" {
  type = string
}

variable "timeout" {
  type    = number
  default = 15
}

variable "event_bus" {
  type = object({
    arn = string
  })
}

variable "event_bus_detail_type" {
  type = string
}

variable "dynamodb" {
  type = object({
    arn = string
  })
}

variable "runtime" {
  type    = string
}
