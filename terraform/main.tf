terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # S3 backend 설정 (인프라 생성 후 활성화)
  # backend "s3" {
  #   bucket = "nest-wallet-terraform-state"
  #   key    = "terraform.tfstate"
  #   region = "ap-northeast-2"
  # }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "nest-wallet"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# 환경별 VPC 생성
resource "aws_vpc" "environments" {
  for_each = var.environments
  
  cidr_block           = each.value.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-${each.key}-vpc"
    Environment = each.key
  }
}

# 환경별 Internet Gateway
resource "aws_internet_gateway" "environments" {
  for_each = var.environments
  
  vpc_id = aws_vpc.environments[each.key].id

  tags = {
    Name = "${var.project_name}-${each.key}-igw"
    Environment = each.key
  }
}

# 환경별 Public Subnets
resource "aws_subnet" "public" {
  for_each = {
    for pair in setproduct(keys(var.environments), range(length(var.environments[keys(var.environments)[0]].public_subnets))) : 
    "${pair[0]}-${pair[1]}" => {
      env = pair[0]
      idx = pair[1]
    }
  }
  
  vpc_id            = aws_vpc.environments[each.value.env].id
  cidr_block        = var.environments[each.value.env].public_subnets[each.value.idx]
  availability_zone = var.environments[each.value.env].availability_zones[each.value.idx]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-${each.value.env}-public-subnet-${each.value.idx + 1}"
    Environment = each.value.env
  }
}

# 환경별 Private Subnets
resource "aws_subnet" "private" {
  for_each = {
    for pair in setproduct(keys(var.environments), range(length(var.environments[keys(var.environments)[0]].private_subnets))) : 
    "${pair[0]}-${pair[1]}" => {
      env = pair[0]
      idx = pair[1]
    }
  }
  
  vpc_id            = aws_vpc.environments[each.value.env].id
  cidr_block        = var.environments[each.value.env].private_subnets[each.value.idx]
  availability_zone = var.environments[each.value.env].availability_zones[each.value.idx]

  tags = {
    Name = "${var.project_name}-${each.value.env}-private-subnet-${each.value.idx + 1}"
    Environment = each.value.env
  }
}

# 환경별 Route Tables for Public Subnets
resource "aws_route_table" "public" {
  for_each = var.environments
  
  vpc_id = aws_vpc.environments[each.key].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.environments[each.key].id
  }

  tags = {
    Name = "${var.project_name}-${each.key}-public-rt"
    Environment = each.key
  }
}

# 환경별 Route Table Associations for Public Subnets
resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public
  
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public[split("-", each.key)[0]].id
}

# 환경별 NAT Gateway EIP
resource "aws_eip" "nat" {
  for_each = var.environments
  
  domain = "vpc"
  
  tags = {
    Name = "${var.project_name}-${each.key}-nat-eip"
    Environment = each.key
  }
}

# 환경별 NAT Gateway
resource "aws_nat_gateway" "environments" {
  for_each = var.environments
  
  allocation_id = aws_eip.nat[each.key].id
  subnet_id     = aws_subnet.public["${each.key}-0"].id

  tags = {
    Name = "${var.project_name}-${each.key}-nat-gateway"
    Environment = each.key
  }

  depends_on = [aws_internet_gateway.environments]
}

# 환경별 Route Tables for Private Subnets
resource "aws_route_table" "private" {
  for_each = var.environments
  
  vpc_id = aws_vpc.environments[each.key].id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.environments[each.key].id
  }

  tags = {
    Name = "${var.project_name}-${each.key}-private-rt"
    Environment = each.key
  }
}

# 환경별 Route Table Associations for Private Subnets
resource "aws_route_table_association" "private" {
  for_each = aws_subnet.private
  
  subnet_id      = each.value.id
  route_table_id = aws_route_table.private[split("-", each.key)[0]].id
}

# 환경별 Security Groups
resource "aws_security_group" "alb" {
  for_each = var.environments
  
  name        = "${var.project_name}-${each.key}-alb-sg"
  description = "Security group for ALB in ${each.key} environment"
  vpc_id      = aws_vpc.environments[each.key].id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${each.key}-alb-sg"
    Environment = each.key
  }
}

resource "aws_security_group" "ecs" {
  for_each = var.environments
  
  name        = "${var.project_name}-${each.key}-ecs-sg"
  description = "Security group for ECS tasks in ${each.key} environment"
  vpc_id      = aws_vpc.environments[each.key].id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb[each.key].id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${each.key}-ecs-sg"
    Environment = each.key
  }
}

# 환경별 Application Load Balancer
resource "aws_lb" "environments" {
  for_each = var.environments
  
  name               = "${var.project_name}-${each.key}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb[each.key].id]
  subnets            = [for i in range(length(each.value.public_subnets)) : aws_subnet.public["${each.key}-${i}"].id]

  enable_deletion_protection = false

  tags = {
    Name = "${var.project_name}-${each.key}-alb"
    Environment = each.key
  }
}

# 환경별 Target Groups
resource "aws_lb_target_group" "environments" {
  for_each = var.environments
  
  name        = "${var.project_name}-${each.key}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.environments[each.key].id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${var.project_name}-${each.key}-tg"
    Environment = each.key
  }
}

# 환경별 ALB Listeners
resource "aws_lb_listener" "environments" {
  for_each = var.environments
  
  load_balancer_arn = aws_lb.environments[each.key].arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.environments[each.key].arn
  }
}

# ECR Repository (공유)
resource "aws_ecr_repository" "main" {
  name                 = "${var.project_name}-repo"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-ecr"
  }
}

# ECR Lifecycle Policy
resource "aws_ecr_lifecycle_policy" "main" {
  repository = aws_ecr_repository.main.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus     = "tagged"
        tagPrefixList = ["v"]
        countType     = "imageCountMoreThan"
        countNumber   = 5
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# 환경별 ECS Clusters
resource "aws_ecs_cluster" "environments" {
  for_each = var.environments
  
  name = "${var.project_name}-${each.key}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-${each.key}-cluster"
    Environment = each.key
  }
}

# 환경별 ECS Task Definitions
resource "aws_ecs_task_definition" "environments" {
  for_each = var.environments
  
  family                   = each.key == "dev" ? "${var.project_name}-task-dev" : "${var.project_name}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "${var.project_name}-${each.key}-container"
      image = "${aws_ecr_repository.main.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        for key, value in (each.key == "dev" ? var.dev_environment_vars : var.prod_environment_vars) : {
          name  = key
          value = value
        }
      ]

      secrets = [
        {
          name      = "NEXT_PUBLIC_API_URL"
          valueFrom = "${each.key == "dev" ? aws_secretsmanager_secret.dev.arn : aws_secretsmanager_secret.prod.arn}:NEXT_PUBLIC_API_URL::"
        },
        {
          name      = "NEXT_PUBLIC_API_BASE_URL"
          valueFrom = "${each.key == "dev" ? aws_secretsmanager_secret.dev.arn : aws_secretsmanager_secret.prod.arn}:NEXT_PUBLIC_API_BASE_URL::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.environments[each.key].name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-${each.key}-task-definition"
    Environment = each.key
  }
}

# 환경별 ECS Services
resource "aws_ecs_service" "environments" {
  for_each = var.environments
  
  name            = "${var.project_name}-${each.key}-service"
  cluster         = aws_ecs_cluster.environments[each.key].id
  task_definition = aws_ecs_task_definition.environments[each.key].arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [for i in range(length(each.value.private_subnets)) : aws_subnet.private["${each.key}-${i}"].id]
    security_groups  = [aws_security_group.ecs[each.key].id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.environments[each.key].arn
    container_name   = "${var.project_name}-${each.key}-container"
    container_port   = 3000
  }

  deployment_controller {
    type = "ECS"
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  tags = {
    Name = "${var.project_name}-${each.key}-service"
    Environment = each.key
  }
}

# 환경별 CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "environments" {
  for_each = var.environments
  
  name              = "/ecs/${var.project_name}-${each.key}"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-${each.key}-log-group"
    Environment = each.key
  }
}

# IAM Role for ECS Execution (공유)
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy for Secrets Manager access
resource "aws_iam_role_policy" "ecs_execution_secrets_policy" {
  name = "${var.project_name}-ecs-execution-secrets-policy"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.dev.arn,
          aws_secretsmanager_secret.prod.arn
        ]
      }
    ]
  })
}

# IAM Role for ECS Task (공유)
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# S3 Bucket for Terraform State (공유)
resource "aws_s3_bucket" "terraform_state" {
  bucket = "nest-wallet-terraform-state"

  tags = {
    Name = "Terraform State Bucket"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls       = true
  restrict_public_buckets = true
}

# DynamoDB Table for Terraform State Locking (공유)
resource "aws_dynamodb_table" "terraform_locks" {
  name           = "nest-wallet-terraform-locks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name = "Terraform State Locking"
  }
}

# 환경별 Auto Scaling Targets
resource "aws_appautoscaling_target" "ecs_targets" {
  for_each = var.environments
  
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.environments[each.key].name}/${aws_ecs_service.environments[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# 환경별 CPU 기반 Scale Up Policies
resource "aws_appautoscaling_policy" "ecs_policy_up" {
  for_each = var.environments
  
  name               = "${var.project_name}-${each.key}-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_targets[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_targets[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_targets[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# 환경별 CPU 기반 Scale Down Policies
resource "aws_appautoscaling_policy" "ecs_policy_down" {
  for_each = var.environments
  
  name               = "${var.project_name}-${each.key}-scale-down"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_targets[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_targets[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_targets[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 30.0
  }
}
