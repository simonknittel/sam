terraform {
  required_version = "1.16.0"

  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.62.0"
    }

    external = {
      source  = "hashicorp/external"
      version = "2.4.1"
    }
  }
}

provider "aws" {
  region = "eu-central-1"

  default_tags {
    tags = {
      ManagedBy  = "Terraform"
      Repository = "simonknittel/sam"
    }
  }
}

data "aws_caller_identity" "current" {}
