# 환경별 VPC 정보
output "vpc_ids" {
  description = "VPC IDs for each environment"
  value = {
    for env, vpc in aws_vpc.environments : env => vpc.id
  }
}

# 환경별 서브넷 정보
output "public_subnet_ids" {
  description = "Public subnet IDs for each environment"
  value = {
    for env in keys(var.environments) : env => [
      for i in range(length(var.environments[env].public_subnets)) : 
      aws_subnet.public["${env}-${i}"].id
    ]
  }
}

output "private_subnet_ids" {
  description = "Private subnet IDs for each environment"
  value = {
    for env in keys(var.environments) : env => [
      for i in range(length(var.environments[env].private_subnets)) : 
      aws_subnet.private["${env}-${i}"].id
    ]
  }
}

# 환경별 ALB 정보
output "alb_dns_names" {
  description = "ALB DNS names for each environment"
  value = {
    for env, alb in aws_lb.environments : env => alb.dns_name
  }
}

# ECR 정보 (공유)
output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.main.repository_url
}

# 환경별 ECS 정보
output "ecs_cluster_names" {
  description = "ECS cluster names for each environment"
  value = {
    for env, cluster in aws_ecs_cluster.environments : env => cluster.name
  }
}

output "ecs_service_names" {
  description = "ECS service names for each environment"
  value = {
    for env, service in aws_ecs_service.environments : env => service.name
  }
}

# 환경별 CloudWatch Log Groups
output "cloudwatch_log_group_names" {
  description = "CloudWatch log group names for each environment"
  value = {
    for env, log_group in aws_cloudwatch_log_group.environments : env => log_group.name
  }
}

# 환경별 배포 정보 요약
output "deployment_summary" {
  description = "Deployment summary for each environment"
  value = {
    for env in keys(var.environments) : env => {
      vpc_id = aws_vpc.environments[env].id
      vpc_cidr = var.environments[env].vpc_cidr
      alb_dns_name = aws_lb.environments[env].dns_name
      ecs_cluster = aws_ecs_cluster.environments[env].name
      ecs_service = aws_ecs_service.environments[env].name
      public_subnets = [
        for i in range(length(var.environments[env].public_subnets)) : 
        aws_subnet.public["${env}-${i}"].id
      ]
      private_subnets = [
        for i in range(length(var.environments[env].private_subnets)) : 
        aws_subnet.private["${env}-${i}"].id
      ]
    }
  }
}

# 공유 리소스 정보
output "shared_resources" {
  description = "Shared resources information"
  value = {
    ecr_repository = aws_ecr_repository.main.repository_url
    terraform_state_bucket = aws_s3_bucket.terraform_state.bucket
    terraform_locks_table = aws_dynamodb_table.terraform_locks.name
    github_actions_user = aws_iam_user.github_actions.name
  }
} 