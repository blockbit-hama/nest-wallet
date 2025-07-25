# Dev Environment Configuration
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket = "hama-nest-wallet-terraform-state"
    key    = "dev/terraform.tfstate"
    region = "ap-northeast-2"
    # dynamodb_table = "nest-wallet-terraform-locks"  # 필요시 DynamoDB 테이블
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = var.tags
  }
}

# Local values
locals {
  environment = "dev"
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"
  
  project_name            = var.project_name
  environment             = local.environment
  vpc_cidr                = var.vpc_cidr
  availability_zones      = var.availability_zones
  private_subnet_cidrs    = var.private_subnet_cidrs
  public_subnet_cidrs     = var.public_subnet_cidrs
  tags                    = var.tags
}

# EKS Module
module "eks" {
  source = "../../modules/eks"
  
  project_name        = var.project_name
  environment         = local.environment
  cluster_version     = var.cluster_version
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  public_subnet_ids   = module.vpc.public_subnet_ids
  node_groups         = var.node_groups
  tags                = var.tags
}

# Addons Module
module "addons" {
  source = "../../modules/addons"
  
  project_name                        = var.project_name
  environment                         = local.environment
  cluster_name                        = module.eks.cluster_name
  cluster_endpoint                    = module.eks.cluster_endpoint
  cluster_certificate_authority_data = module.eks.cluster_certificate_authority_data
  oidc_provider_arn                   = module.eks.oidc_provider_arn
  oidc_provider_url                   = module.eks.cluster_oidc_issuer_url
  vpc_id                              = module.vpc.vpc_id
  private_subnet_ids                  = module.vpc.private_subnet_ids
  tags                                = var.tags
  
  depends_on = [module.eks]
}

# Data sources for EKS configuration (after EKS is created)
data "aws_eks_cluster" "main" {
  name = module.eks.cluster_name
  depends_on = [module.eks]
}

data "aws_eks_cluster_auth" "main" {
  name = module.eks.cluster_name
  depends_on = [module.eks]
}

# Configure Kubernetes provider (after EKS is created)
provider "kubernetes" {
  host                   = data.aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}

# Configure Helm provider (after EKS is created)
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.main.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.main.token
  }
}

# Helm releases for dev environment
resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  version    = "1.8.2"
  namespace  = "kube-system"

  values = [
    yamlencode({
      clusterName = module.eks.cluster_name
      serviceAccount = {
        create = true
        name   = "aws-load-balancer-controller"
        annotations = {
          "eks.amazonaws.com/role-arn" = module.addons.alb_controller_role_arn
        }
      }
      tolerations = [
        {
          key      = "CriticalAddonsOnly"
          operator = "Exists"
          effect   = "NoSchedule"
        }
      ]
    })
  ]

  depends_on = [module.addons]
}

resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = "7.6.12"
  namespace  = "argocd"
  create_namespace = true

  values = [
    yamlencode({
      global = {
        domain = "argocd-dev.${var.project_name}.local"
      }
      server = {
        service = {
          type = "LoadBalancer"
          annotations = {
            "service.beta.kubernetes.io/aws-load-balancer-type" = "nlb"
            "service.beta.kubernetes.io/aws-load-balancer-scheme" = "internet-facing"
          }
        }
      }
    })
  ]

  depends_on = [helm_release.aws_load_balancer_controller]
}

# Karpenter Helm 설치
resource "helm_release" "karpenter" {
  name       = "karpenter"
  repository = "https://charts.karpenter.sh"
  chart      = "karpenter"
  version    = "0.16.3"
  namespace  = "karpenter"
  create_namespace = true

  values = [
    yamlencode({
      settings = {
        clusterName = module.eks.cluster_name
        clusterEndpoint = module.eks.cluster_endpoint
        defaultInstanceProfile = "eks-application-dev-c2cc1d75-80e7-fe4d-52d5-b168ddee791c"
      }
      serviceAccount = {
        annotations = {
          "eks.amazonaws.com/role-arn" = module.addons.karpenter_role_arn
        }
      }
      tolerations = [
        {
          key      = "CriticalAddonsOnly"
          operator = "Exists"
          effect   = "NoSchedule"
        }
      ]
    })
  ]

  depends_on = [module.addons]
}
