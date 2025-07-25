# Production Environment Outputs
output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "Kubernetes Cluster Name"
  value       = module.eks.cluster_name
}

output "cluster_arn" {
  description = "The Amazon Resource Name (ARN) of the cluster"
  value       = module.eks.cluster_arn
}

output "vpc_id" {
  description = "ID of the VPC where the cluster is deployed"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnet_ids
}

output "alb_controller_role_arn" {
  description = "The Amazon Resource Name (ARN) specifying the ALB controller role"
  value       = module.addons.alb_controller_role_arn
}

# output "secrets_manager_secret_name" {
#   description = "Name of the Secrets Manager secret"
#   value       = module.addons.secrets_manager_secret_name
# }

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "environment" {
  description = "Environment name"
  value       = "prod"
}

# Instructions for accessing ArgoCD
output "argocd_access_instructions" {
  description = "Instructions for accessing ArgoCD"
  value = <<-EOT
    To access ArgoCD (Production Environment):
    1. Get the admin password:
       kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
    
    2. Get the LoadBalancer URL:
       kubectl get svc argocd-server -n argocd
    
    3. Access ArgoCD at the LoadBalancer URL
       Username: admin
       Password: [from step 1]
  EOT
}

# Kubeconfig update command
output "configure_kubectl" {
  description = "Configure kubectl command"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}
