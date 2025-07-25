variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "nest-wallet"
}

variable "github_org" {
  description = "GitHub organization name"
  type        = string
  default     = "blockbit-hama"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "nest-wallet"
}

variable "cluster_version" {
  description = "Kubernetes cluster version"
  type        = string
  default     = "1.31"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["ap-northeast-2a", "ap-northeast-2b", "ap-northeast-2c"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "node_desired_capacity" {
  description = "Desired number of nodes"
  type        = number
  default     = 2
}

variable "node_max_capacity" {
  description = "Maximum number of nodes"
  type        = number
  default     = 10
}

variable "node_min_capacity" {
  description = "Minimum number of nodes"
  type        = number
  default     = 1
}

variable "instance_types" {
  description = "EC2 instance types for spot instances"
  type        = list(string)
  default     = ["m6g.large", "m6g.xlarge", "m7g.large", "m7g.xlarge", "c6g.large", "c6g.xlarge", "c7g.large", "c7g.xlarge"]
}

variable "spot_allocation_strategy" {
  description = "Spot allocation strategy"
  type        = string
  default     = "price-capacity-optimized"
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default = {
    Project     = "nest-wallet"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
