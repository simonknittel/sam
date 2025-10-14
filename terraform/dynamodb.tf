resource "aws_dynamodb_table" "sqs_processed_requests" {
  name         = "SqsProcessedRequests"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "RequestId"

  attribute {
    name = "RequestId"
    type = "S"
  }

  ttl {
    attribute_name = "ExpiresAt"
    enabled        = true
  }
}
