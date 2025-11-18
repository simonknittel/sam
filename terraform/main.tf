terraform {
  required_version = "1.13.5"

  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.100.0"
    }

    external = {
      source  = "hashicorp/external"
      version = "2.3.5"
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
