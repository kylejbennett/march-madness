output "s3_bucket_name" {
  description = "Name of the S3 bucket storing season JSON files."
  value       = aws_s3_bucket.pool_data.bucket
}

output "s3_seasons_base_url" {
  description = "Public base URL for reading season JSON files (set as VITE_SEASONS_BASE_URL in Amplify)."
  value       = "https://${aws_s3_bucket.pool_data.bucket_regional_domain_name}/seasons"
}

output "api_gateway_invoke_url" {
  description = "Base API Gateway invoke URL for writing season JSON (set as VITE_POOL_API_URL in Amplify)."
  value       = aws_api_gateway_stage.pool_api.invoke_url
}

output "api_gateway_api_key" {
  description = "API Gateway API Key value (set as VITE_POOL_API_KEY in Amplify)."
  value       = aws_api_gateway_api_key.pool_admin_key.value
  sensitive   = true
}
