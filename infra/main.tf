data "aws_caller_identity" "current" {}

locals {
  bucket_name         = coalesce(var.bucket_name, "${var.project_name}-data-${data.aws_caller_identity.current.account_id}")
  primary_cors_origin = length(var.allowed_origins) > 0 ? var.allowed_origins[0] : "*"
}

# ------------------------------------------------------------------------------
# S3 Bucket for Season JSON Files (Public Read for seasons/*, Private Write)
# ------------------------------------------------------------------------------

resource "aws_s3_bucket" "pool_data" {
  bucket = local.bucket_name
}

resource "aws_s3_bucket_public_access_block" "pool_data" {
  bucket = aws_s3_bucket.pool_data.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "pool_data_public_read" {
  bucket = aws_s3_bucket.pool_data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadSeasonsJson"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.pool_data.arn}/seasons/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.pool_data]
}

resource "aws_s3_bucket_cors_configuration" "pool_data" {
  bucket = aws_s3_bucket.pool_data.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.allowed_origins
    max_age_seconds = 3000
  }
}

# ------------------------------------------------------------------------------
# Lambda Function: Writes Season JSON & Updates seasons/index.json in S3
# ------------------------------------------------------------------------------

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/index.mjs"
  output_path = "${path.module}/.build/season-writer.zip"
}

resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_s3_and_logs" {
  name = "${var.project_name}-lambda-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.pool_data.arn}/seasons/*"
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-season-writer"
  retention_in_days = 14
}

resource "aws_lambda_function" "season_writer" {
  function_name    = "${var.project_name}-season-writer"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      BUCKET_NAME    = aws_s3_bucket.pool_data.bucket
      ALLOWED_ORIGIN = local.primary_cors_origin
      ADMIN_PASSWORD = var.admin_password
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_s3_and_logs,
    aws_cloudwatch_log_group.lambda_logs
  ]
}

# ------------------------------------------------------------------------------
# API Gateway REST API (API Key Protected) -> Lambda
# ------------------------------------------------------------------------------

resource "aws_api_gateway_rest_api" "pool_api" {
  name        = "${var.project_name}-api"
  description = "API Gateway for writing March Madness pool season JSON to S3"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "seasons" {
  rest_api_id = aws_api_gateway_rest_api.pool_api.id
  parent_id   = aws_api_gateway_rest_api.pool_api.root_resource_id
  path_part   = "seasons"
}

resource "aws_api_gateway_resource" "season_year" {
  rest_api_id = aws_api_gateway_rest_api.pool_api.id
  parent_id   = aws_api_gateway_resource.seasons.id
  path_part   = "{year}"
}

# PUT /seasons/{year} (Requires API Key)
resource "aws_api_gateway_method" "put_season" {
  rest_api_id      = aws_api_gateway_rest_api.pool_api.id
  resource_id      = aws_api_gateway_resource.season_year.id
  http_method      = "PUT"
  authorization    = "NONE"
  api_key_required = true
}

resource "aws_api_gateway_integration" "put_season_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.pool_api.id
  resource_id             = aws_api_gateway_resource.season_year.id
  http_method             = aws_api_gateway_method.put_season.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.season_writer.invoke_arn
}

# OPTIONS /seasons/{year} (CORS Preflight)
resource "aws_api_gateway_method" "options_season" {
  rest_api_id      = aws_api_gateway_rest_api.pool_api.id
  resource_id      = aws_api_gateway_resource.season_year.id
  http_method      = "OPTIONS"
  authorization    = "NONE"
  api_key_required = false
}

resource "aws_api_gateway_integration" "options_season_mock" {
  rest_api_id = aws_api_gateway_rest_api.pool_api.id
  resource_id = aws_api_gateway_resource.season_year.id
  http_method = aws_api_gateway_method.options_season.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_season_200" {
  rest_api_id = aws_api_gateway_rest_api.pool_api.id
  resource_id = aws_api_gateway_resource.season_year.id
  http_method = aws_api_gateway_method.options_season.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_season_200" {
  rest_api_id = aws_api_gateway_rest_api.pool_api.id
  resource_id = aws_api_gateway_resource.season_year.id
  http_method = aws_api_gateway_method.options_season.http_method
  status_code = aws_api_gateway_method_response.options_season_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Api-Key,X-Admin-Password'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.primary_cors_origin}'"
  }
}

# Ensure 4xx/5xx gateway responses (e.g. 403 Invalid API Key) include CORS headers
resource "aws_api_gateway_gateway_response" "cors_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.pool_api.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'${local.primary_cors_origin}'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Api-Key,X-Admin-Password'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'PUT,OPTIONS'"
  }
}

resource "aws_api_gateway_gateway_response" "cors_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.pool_api.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'${local.primary_cors_origin}'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Api-Key,X-Admin-Password'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'PUT,OPTIONS'"
  }
}

resource "aws_api_gateway_deployment" "pool_api" {
  rest_api_id = aws_api_gateway_rest_api.pool_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.seasons.id,
      aws_api_gateway_resource.season_year.id,
      aws_api_gateway_method.put_season.id,
      aws_api_gateway_integration.put_season_lambda.id,
      aws_api_gateway_method.options_season.id,
      aws_api_gateway_integration.options_season_mock.id,
      aws_api_gateway_gateway_response.cors_4xx.id,
      aws_api_gateway_gateway_response.cors_5xx.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "pool_api" {
  deployment_id = aws_api_gateway_deployment.pool_api.id
  rest_api_id   = aws_api_gateway_rest_api.pool_api.id
  stage_name    = var.api_stage_name
}

resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.season_writer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.pool_api.execution_arn}/*/*"
}

# API Key + Usage Plan for Amplify Environment Variables
resource "aws_api_gateway_api_key" "pool_admin_key" {
  name    = "${var.project_name}-admin-key"
  enabled = true
}

resource "aws_api_gateway_usage_plan" "pool_usage_plan" {
  name = "${var.project_name}-usage-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.pool_api.id
    stage  = aws_api_gateway_stage.pool_api.stage_name
  }

  throttle_settings {
    burst_limit = 20
    rate_limit  = 10
  }

  quota_settings {
    limit  = 1000
    period = "MONTH"
  }
}

resource "aws_api_gateway_usage_plan_key" "pool_usage_plan_key" {
  key_id        = aws_api_gateway_api_key.pool_admin_key.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.pool_usage_plan.id
}
