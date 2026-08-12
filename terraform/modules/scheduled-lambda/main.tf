terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.58.0"
    }

    external = {
      source  = "hashicorp/external"
      version = "2.4.0"
    }
  }
}
