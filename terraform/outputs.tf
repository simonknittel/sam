output "care_bear_shooter_build_url" {
  value = aws_cloudfront_distribution.care_bear_shooter_build.domain_name
}

output "event_bus_arn" {
  value = data.aws_cloudwatch_event_bus.default.arn
}

output "access_key_app_vercel" {
  value     = aws_iam_access_key.app_vercel.id
  sensitive = true
}

output "secret_access_key_app_vercel" {
  value     = aws_iam_access_key.app_vercel.secret
  sensitive = true
}
