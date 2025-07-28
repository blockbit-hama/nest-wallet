variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "nest-wallet"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# 환경별 네트워크 설정
variable "environments" {
  description = "Environment configurations"
  type = map(object({
    vpc_cidr         = string
    public_subnets   = list(string)
    private_subnets  = list(string)
    availability_zones = list(string)
  }))
  default = {
    dev = {
      vpc_cidr         = "10.0.0.0/16"
      public_subnets   = ["10.0.1.0/24", "10.0.2.0/24"]
      private_subnets  = ["10.0.11.0/24", "10.0.12.0/24"]
      availability_zones = ["ap-northeast-2a", "ap-northeast-2c"]
    }
    prod = {
      vpc_cidr         = "10.1.0.0/16"
      public_subnets   = ["10.1.1.0/24", "10.1.2.0/24"]
      private_subnets  = ["10.1.11.0/24", "10.1.12.0/24"]
      availability_zones = ["ap-northeast-2a", "ap-northeast-2c"]
    }
  }
}

# 기존 변수들 (하위 호환성을 위해 유지)
variable "vpc_cidr" {
  description = "CIDR block for VPC (deprecated - use environments variable)"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones (deprecated - use environments variable)"
  type        = list(string)
  default     = ["ap-northeast-2a", "ap-northeast-2c"]
}

variable "public_subnets" {
  description = "CIDR blocks for public subnets (deprecated - use environments variable)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets (deprecated - use environments variable)"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

# ECS 설정
variable "task_cpu" {
  description = "CPU units for ECS task"
  type        = number
  default     = 256  # 128 → 256으로 변경 (Fargate 최소 요구사항)
}

variable "task_memory" {
  description = "Memory for ECS task"
  type        = number
  default     = 512  # 512MB 유지 (Fargate 최소 요구사항)
}

variable "service_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1  # 2개 → 1개로 줄임
}

variable "service_min_count" {
  description = "Minimum number of ECS tasks"
  type        = number
  default     = 1  # 2개 → 1개로 줄임
}

variable "service_max_count" {
  description = "Maximum number of ECS tasks"
  type        = number
  default     = 3  # 10개 → 3개로 줄임
}

variable "scale_up_threshold" {
  description = "CPU threshold for scaling up"
  type        = number
  default     = 70
}

variable "scale_down_threshold" {
  description = "CPU threshold for scaling down"
  type        = number
  default     = 30
}

# 환경별 설정
variable "dev_environment_vars" {
  description = "Development environment variables"
  type        = map(string)
  default = {
    NODE_ENV                           = "development"
    PORT                               = "9002"
    NEXT_PUBLIC_INFURA_API_KEY         = "9366572d83da40e4b827a664e6194e06"
    NEXT_PUBLIC_BLOCKCYPHER_TOKEN      = "your-dev-blockcypher-token"
    NEXT_PUBLIC_ETHERSCAN_API_KEY      = "4EM3ICECJSNWCH36FZZMV54IDIYNPE395X"
    NEXT_PUBLIC_COINGECKO_API_BASE     = "https://api.coingecko.com/api/v3"
    NEXT_PUBLIC_DEBUG                  = "true"
    NEXT_PUBLIC_LOG_LEVEL              = "debug"
  }
}

variable "prod_environment_vars" {
  description = "Production environment variables"
  type        = map(string)
  default = {
    NODE_ENV                           = "production"
    PORT                               = "9002"
    NEXT_PUBLIC_INFURA_API_KEY         = "9366572d83da40e4b827a664e6194e06"
    NEXT_PUBLIC_BLOCKCYPHER_TOKEN      = "your-blockcypher-token-here"
    NEXT_PUBLIC_ETHERSCAN_API_KEY      = "4EM3ICECJSNWCH36FZZMV54IDIYNPE395X"
    NEXT_PUBLIC_COINGECKO_API_BASE     = "https://api.coingecko.com/api/v3"
    NEXT_PUBLIC_DEBUG                  = "false"
    NEXT_PUBLIC_LOG_LEVEL              = "error"
  }
}
