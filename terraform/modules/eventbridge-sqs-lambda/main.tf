terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.46.0"
    }

    external = {
      source  = "hashicorp/external"
      version = "2.4.0"
    }
  }
}
