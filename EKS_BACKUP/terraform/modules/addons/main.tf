# Addons Module Variables
variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment (dev/prod)"
  type        = string
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "cluster_endpoint" {
  description = "EKS cluster endpoint"
  type        = string
}

variable "cluster_certificate_authority_data" {
  description = "EKS cluster certificate authority data"
  type        = string
}

variable "oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  type        = string
}

variable "oidc_provider_url" {
  description = "EKS OIDC provider URL"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Get current AWS account ID and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
}

# ECR Repository (shared across environments)
resource "aws_ecr_repository" "nest_wallet" {
  count = var.environment == "dev" ? 1 : 0  # Only create in dev environment
  
  name                 = var.project_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true  # Force delete even if images exist

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-ecr"
    Environment = "shared"
  })
}

resource "aws_ecr_lifecycle_policy" "nest_wallet" {
  count = var.environment == "dev" ? 1 : 0
  
  repository = aws_ecr_repository.nest_wallet[0].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["main-", "develop-"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ALB Controller IAM Role
resource "aws_iam_role" "alb_controller" {
  name = "${var.project_name}-alb-controller-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(var.oidc_provider_url, "https://", "")}:sub": "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${replace(var.oidc_provider_url, "https://", "")}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-alb-controller-${var.environment}"
    Environment = var.environment
  })
}

# ALB Controller Policy
resource "aws_iam_role_policy_attachment" "alb_controller" {
  policy_arn = "arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess"
  role       = aws_iam_role.alb_controller.name
}

resource "aws_iam_role_policy_attachment" "alb_controller_ec2" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess"
  role       = aws_iam_role.alb_controller.name
}

# ALB Controller Administrator Access (간소화를 위해)
resource "aws_iam_role_policy_attachment" "alb_controller_admin" {
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  role       = aws_iam_role.alb_controller.name
}

# EBS CSI Driver IAM Role
resource "aws_iam_role" "ebs_csi_driver" {
  name = "${var.project_name}-ebs-csi-driver-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(var.oidc_provider_url, "https://", "")}:sub": "system:serviceaccount:kube-system:ebs-csi-controller-sa"
            "${replace(var.oidc_provider_url, "https://", "")}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-ebs-csi-driver-${var.environment}"
    Environment = var.environment
  })
}

resource "aws_iam_role_policy_attachment" "ebs_csi_driver" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
  role       = aws_iam_role.ebs_csi_driver.name
}

# Karpenter IAM Role
resource "aws_iam_role" "karpenter" {
  name = "${var.project_name}-karpenter-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(var.oidc_provider_url, "https://", "")}:sub": "system:serviceaccount:karpenter:karpenter"
            "${replace(var.oidc_provider_url, "https://", "")}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-karpenter-${var.environment}"
    Environment = var.environment
  })
}

# Karpenter Administrator Access (간소화를 위해)
resource "aws_iam_role_policy_attachment" "karpenter_admin" {
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  role       = aws_iam_role.karpenter.name
}

# Secrets Manager Secrets (사용하지 않으므로 주석 처리)
# resource "aws_secretsmanager_secret" "app_secrets" {
#   name        = "${var.project_name}-${var.environment}-secrets"
#   description = "Application secrets for ${var.project_name} ${var.environment} environment"
#
#   tags = merge(var.tags, {
#     Name = "${var.project_name}-${var.environment}-secrets"
#     Environment = var.environment
#   })
# }
#
# resource "aws_secretsmanager_secret_version" "app_secrets" {
#   secret_id = aws_secretsmanager_secret.app_secrets.id
#   secret_string = jsonencode({
#     DATABASE_URL = var.environment == "prod" ? "postgresql://prod-user:password@prod-db:5432/nestdb" : "postgresql://dev-user:password@dev-db:5432/nestdb"
#     JWT_SECRET   = var.environment == "prod" ? "production-jwt-secret-CHANGE-THIS" : "dev-jwt-secret-CHANGE-THIS"
#     API_KEY      = var.environment == "prod" ? "prod-api-key" : "dev-api-key"
#     REDIS_URL    = var.environment == "prod" ? "redis://prod-redis:6379" : "redis://dev-redis:6379"
#   })
# }
