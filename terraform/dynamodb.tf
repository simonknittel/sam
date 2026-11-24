# apps/lambda/src/common/dynamodb.ts repeats the names of the table and of its
# attributes
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
