terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.60.0"
    }

    external = {
      source  = "hashicorp/external"
      version = "2.4.1"
    }
  }
}
