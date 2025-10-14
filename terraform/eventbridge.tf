data "aws_cloudwatch_event_bus" "default" {
  name = "default"
}

resource "aws_schemas_discoverer" "default" {
  source_arn = data.aws_cloudwatch_event_bus.default.arn
}
