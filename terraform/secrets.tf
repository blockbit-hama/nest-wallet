# AWS Secrets Manager for Environment Variables

# Development Environment Secrets
resource "aws_secretsmanager_secret" "dev" {
  name        = "${var.project_name}-dev-secrets"
  description = "Development environment secrets for ${var.project_name}"

  tags = {
    Name        = "${var.project_name}-dev-secrets"
    Environment = "development"
  }
}

resource "aws_secretsmanager_secret_version" "dev" {
  secret_id = aws_secretsmanager_secret.dev.id
  secret_string = jsonencode({
    GAS_COUPON_API_URL = "https://dev-api.blockbit.com"
  })
}

# Production Environment Secrets
resource "aws_secretsmanager_secret" "prod" {
  name        = "${var.project_name}-prod-secrets"
  description = "Production environment secrets for ${var.project_name}"

  tags = {
    Name        = "${var.project_name}-prod-secrets"
    Environment = "production"
  }
}

resource "aws_secretsmanager_secret_version" "prod" {
  secret_id = aws_secretsmanager_secret.prod.id
  secret_string = jsonencode({
    GAS_COUPON_API_URL = "https://api.blockbit.com"
  })
}

# Outputs for reference
output "dev_secret_arn" {
  description = "ARN of the development secrets"
  value       = aws_secretsmanager_secret.dev.arn
}

output "prod_secret_arn" {
  description = "ARN of the production secrets"
  value       = aws_secretsmanager_secret.prod.arn
} 