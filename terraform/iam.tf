resource "aws_iam_user" "app_vercel" {
  name = "app_vercel"
}

resource "aws_iam_user_policy" "app_vercel" {
  user = aws_iam_user.app_vercel.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "events:PutEvents"
        Resource = data.aws_cloudwatch_event_bus.default.arn
      },
    ]
  })
}

resource "aws_iam_access_key" "app_vercel" {
  user = aws_iam_user.app_vercel.name
}
