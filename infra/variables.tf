variable "aws_region" {
  description = "AWS region to deploy the March Madness pool data infrastructure."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix used for naming AWS resources."
  type        = string
  default     = "march-madness-pool"
}

variable "bucket_name" {
  description = "Globally unique S3 bucket name for storing season JSON files. Leave null to auto-generate with account ID."
  type        = string
  default     = null
}

variable "allowed_origins" {
  description = "Allowed CORS origins for S3 reads and API Gateway writes (e.g. your Amplify app URL and localhost)."
  type        = list(string)
  default     = ["*"]
}

variable "api_stage_name" {
  description = "API Gateway deployment stage name."
  type        = string
  default     = "prod"
}

variable "admin_password" {
  description = "Admin password required in the x-admin-password header to write season data to S3."
  type        = string
  sensitive   = true
}
