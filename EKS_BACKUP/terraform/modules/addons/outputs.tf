# Addons Module Outputs
output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = var.environment == "dev" ? aws_ecr_repository.nest_wallet[0].repository_url : null
}

output "ecr_repository_name" {
  description = "ECR repository name"
  value       = var.environment == "dev" ? aws_ecr_repository.nest_wallet[0].name : var.project_name
}

output "alb_controller_role_arn" {
  description = "ALB Controller IAM role ARN"
  value       = aws_iam_role.alb_controller.arn
}

output "karpenter_role_arn" {
  description = "Karpenter IAM role ARN"
  value       = aws_iam_role.karpenter.arn
}

output "ebs_csi_driver_role_arn" {
  description = "EBS CSI Driver IAM role ARN"
  value       = aws_iam_role.ebs_csi_driver.arn
}

# output "secrets_manager_secret_arn" {
#   description = "Secrets Manager secret ARN"
#   value       = aws_secretsmanager_secret.app_secrets.arn
# }

# output "secrets_manager_secret_name" {
#   description = "Secrets Manager secret name"
#   value       = aws_secretsmanager_secret.app_secrets.name
# }
