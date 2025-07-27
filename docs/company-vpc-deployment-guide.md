# 회사 VPC를 이용한 Nest-Wallet 배포 가이드

## 📋 목차

- [1. 사전 준비사항](#1-사전-준비사항)
- [2. 회사 AWS 관리자에게 요청할 사항](#2-회사-aws-관리자에게-요청할-사항)
- [3. Terraform 설정 및 배포](#3-terraform-설정-및-배포)
- [4. GitHub Actions CI/CD 설정](#4-github-actions-cicd-설정)
- [5. 배포 및 확인](#5-배포-및-확인)

---

## 1. 사전 준비사항

### 1.1 필수 도구 설치
```bash
# AWS CLI 설치
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Terraform 설치
brew install terraform

# jq 설치 (JSON 파싱용)
brew install jq
```

### 1.2 AWS 자격증명 설정
```bash
# AWS 자격증명 설정
aws configure

# 입력할 정보:
# AWS Access Key ID: [회사에서 제공받은 액세스 키]
# AWS Secret Access Key: [회사에서 제공받은 시크릿 키]
# Default region name: ap-northeast-2
# Default output format: json

# 자격증명 확인
aws sts get-caller-identity
```

---

## 2. 회사 AWS 관리자에게 요청할 사항

### 2.1 IAM 사용자 생성 요청

**요청 내용:**
```
제목: Nest-Wallet 프로젝트용 IAM 사용자 생성 요청

내용:
1. IAM 사용자명: nest-wallet-github-actions
2. 필요한 권한:
   - AmazonEC2ContainerRegistryPowerUser (ECR 접근용)
   - AmazonECS-FullAccess (ECS 배포용)
   - SecretsManagerReadWrite (환경변수 관리용)
   - CloudWatchLogsFullAccess (로그 확인용)

3. 액세스 키 생성 요청
4. 시크릿 키 생성 요청

사용 목적: GitHub Actions를 통한 자동 배포
```

### 2.2 VPC 정보 요청

**요청 내용:**
```
제목: Dev/Prod VPC 정보 요청

내용:
Nest-Wallet 프로젝트 배포를 위해 다음 정보가 필요합니다:

Dev 환경:
- VPC ID
- Public Subnet IDs (2개)
- Private Subnet IDs (2개)
- ALB용 Security Group ID
- ECS용 Security Group ID

Prod 환경:
- VPC ID
- Public Subnet IDs (2개)
- Private Subnet IDs (2개)
- ALB용 Security Group ID
- ECS용 Security Group ID

추가 요청사항:
- ALB Security Group: HTTP(80), HTTPS(443) 인바운드 허용
- ECS Security Group: ALB에서 오는 트래픽(포트 3000) 허용
```

### 2.3 Security Group 규칙 요청

**요청 내용:**
```
제목: Security Group 규칙 추가 요청

내용:
Nest-Wallet 애플리케이션 배포를 위해 다음 규칙을 추가해주세요:

ALB Security Group (Dev/Prod):
- 인바운드: HTTP(80) from 0.0.0.0/0
- 인바운드: HTTPS(443) from 0.0.0.0/0

ECS Security Group (Dev/Prod):
- 인바운드: TCP(3000) from ALB Security Group
- 아웃바운드: All traffic to 0.0.0.0/0
```

---

## 3. Terraform 설정 및 배포

### 3.1 회사 VPC 정보 설정

회사 AWS 관리자로부터 받은 정보를 `terraform/company-vpc.tfvars` 파일에 입력:

```hcl
# terraform/company-vpc.tfvars
company_vpc_info = {
  dev = {
    vpc_id              = "vpc-dev-xxxxxxxxx"  # 실제 Dev VPC ID
    public_subnet_ids   = ["subnet-dev-public-1", "subnet-dev-public-2"]
    private_subnet_ids  = ["subnet-dev-private-1", "subnet-dev-private-2"]
    alb_security_group_id = "sg-dev-alb-xxxxxxxxx"
    ecs_security_group_id = "sg-dev-ecs-yyyyyyyyy"
  }
  prod = {
    vpc_id              = "vpc-prod-yyyyyyyyy"  # 실제 Prod VPC ID
    public_subnet_ids   = ["subnet-prod-public-1", "subnet-prod-public-2"]
    private_subnet_ids  = ["subnet-prod-private-1", "subnet-prod-private-2"]
    alb_security_group_id = "sg-prod-alb-xxxxxxxxx"
    ecs_security_group_id = "sg-prod-ecs-yyyyyyyyy"
  }
}
```

### 3.2 회사 VPC용 Terraform 설정

`terraform/main-company.tf` 파일 생성:

```hcl
# 회사 VPC를 이용한 ECS 배포 설정

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "nest-wallet"
      ManagedBy   = "terraform"
    }
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

# 환경별 Application Load Balancer
resource "aws_lb" "environments" {
  for_each = var.company_vpc_info
  
  name               = "${var.project_name}-${each.key}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [each.value.alb_security_group_id]
  subnets            = each.value.public_subnet_ids

  enable_deletion_protection = false

  tags = {
    Name = "${var.project_name}-${each.key}-alb"
    Environment = each.key
  }
}

# 환경별 Target Groups
resource "aws_lb_target_group" "environments" {
  for_each = var.company_vpc_info
  
  name        = "${var.project_name}-${each.key}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = each.value.vpc_id
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
  for_each = var.company_vpc_info
  
  load_balancer_arn = aws_lb.environments[each.key].arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.environments[each.key].arn
  }
}

# 환경별 ECS Clusters
resource "aws_ecs_cluster" "environments" {
  for_each = var.company_vpc_info
  
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
  for_each = var.company_vpc_info
  
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
  for_each = var.company_vpc_info
  
  name            = "${var.project_name}-${each.key}-service"
  cluster         = aws_ecs_cluster.environments[each.key].id
  task_definition = aws_ecs_task_definition.environments[each.key].arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = each.value.private_subnet_ids
    security_groups  = [each.value.ecs_security_group_id]
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
  for_each = var.company_vpc_info
  
  name              = "/ecs/${var.project_name}-${each.key}"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-${each.key}-log-group"
    Environment = each.key
  }
}

# IAM Role for ECS Execution
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

# IAM Role for ECS Task
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

# Secrets Manager for Environment Variables
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
    NEXT_PUBLIC_API_URL      = "https://dev-api.blockbit.com"
    NEXT_PUBLIC_API_BASE_URL = "https://dev-api.blockbit.com/api"
  })
}

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
    NEXT_PUBLIC_API_URL      = "https://api.blockbit.com"
    NEXT_PUBLIC_API_BASE_URL = "https://api.blockbit.com/api"
  })
}

# Auto Scaling
resource "aws_appautoscaling_target" "ecs_targets" {
  for_each = var.company_vpc_info
  
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.environments[each.key].name}/${aws_ecs_service.environments[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_policy_up" {
  for_each = var.company_vpc_info
  
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

resource "aws_appautoscaling_policy" "ecs_policy_down" {
  for_each = var.company_vpc_info
  
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
```

### 3.3 배포 실행

```bash
# Terraform 초기화
cd terraform
terraform init

# 배포 계획 확인
terraform plan -var-file="company-vpc.tfvars"

# 배포 실행
terraform apply -var-file="company-vpc.tfvars" -auto-approve
```

---

## 4. GitHub Actions CI/CD 설정

### 4.1 GitHub Secrets 설정

1. **GitHub Repository 접속**: https://github.com/[username]/nest-wallet
2. **Settings 탭 이동**: Settings → Secrets and variables → Actions
3. **New repository secret 추가**:

| Secret 이름 | 설명 | 값 |
|-------------|------|-----|
| `AWS_ACCESS_KEY_ID` | AWS 액세스 키 ID | 회사에서 제공받은 액세스 키 |
| `AWS_SECRET_ACCESS_KEY` | AWS 시크릿 액세스 키 | 회사에서 제공받은 시크릿 키 |

### 4.2 GitHub Actions 워크플로우 확인

기존 워크플로우 파일들이 회사 VPC 환경에 맞게 설정되어 있는지 확인:

- `.github/workflows/deploy-dev.yml` (develop 브랜치 → dev 환경)
- `.github/workflows/deploy.yml` (main 브랜치 → prod 환경)

---

## 5. 배포 및 확인

### 5.1 개발 환경 배포

```bash
# develop 브랜치로 전환
git checkout develop

# 코드 수정 후 커밋
git add .
git commit -m "feat: development update"

# develop 브랜치 푸시 (자동 배포 트리거)
git push origin develop
```

### 5.2 프로덕션 환경 배포

```bash
# main 브랜치로 전환
git checkout main

# develop 브랜치 머지
git merge develop

# main 브랜치 푸시 (자동 배포 트리거)
git push origin main
```

### 5.3 배포 확인

#### 5.3.1 GitHub Actions에서 확인
1. **GitHub Repository 접속**: https://github.com/[username]/nest-wallet
2. **Actions 탭 이동**: Actions
3. **워크플로우 실행 상태 확인**

#### 5.3.2 AWS 콘솔에서 확인
1. **ECS 서비스 확인**:
   - `nest-wallet-dev-cluster` → `nest-wallet-dev-service`
   - `nest-wallet-prod-cluster` → `nest-wallet-prod-service`

2. **ALB DNS 주소 확인**:
   - `nest-wallet-dev-alb`
   - `nest-wallet-prod-alb`

#### 5.3.3 브라우저에서 접속 확인

```bash
# ALB DNS 주소 확인
aws elbv2 describe-load-balancers \
  --names nest-wallet-dev-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text

aws elbv2 describe-load-balancers \
  --names nest-wallet-prod-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

**브라우저 접속**:
- 개발 환경: `http://[dev-alb-dns-name]`
- 프로덕션 환경: `http://[prod-alb-dns-name]`
- 헬스체크: `http://[alb-dns-name]/api/health`

### 5.4 모니터링 및 로그 확인

```bash
# ECS 서비스 상태 확인
aws ecs describe-services \
  --cluster nest-wallet-dev-cluster \
  --services nest-wallet-dev-service

# CloudWatch 로그 확인
aws logs tail /ecs/nest-wallet-dev --follow
aws logs tail /ecs/nest-wallet-prod --follow
```

---

## 📋 체크리스트

### 사전 준비
- [ ] AWS CLI 설치 및 자격증명 설정
- [ ] Terraform 설치
- [ ] 회사 AWS 관리자에게 IAM 사용자 생성 요청
- [ ] 회사 AWS 관리자에게 VPC 정보 요청
- [ ] 회사 AWS 관리자에게 Security Group 규칙 추가 요청

### Terraform 배포
- [ ] `company-vpc.tfvars` 파일에 실제 VPC 정보 입력
- [ ] `terraform init` 실행
- [ ] `terraform plan` 실행 및 검토
- [ ] `terraform apply` 실행

### GitHub Actions 설정
- [ ] GitHub Secrets 설정 (AWS 자격증명)
- [ ] 워크플로우 파일 확인

### 배포 테스트
- [ ] develop 브랜치 푸시 및 dev 환경 배포 확인
- [ ] main 브랜치 푸시 및 prod 환경 배포 확인
- [ ] 브라우저에서 애플리케이션 접속 확인
- [ ] 헬스체크 엔드포인트 확인

---

## 🎯 요약

이 가이드를 통해 회사 VPC를 이용한 Nest-Wallet 배포를 완료할 수 있습니다:

1. **회사 AWS 관리자와 협력하여 필요한 권한 및 리소스 정보 확보**
2. **Terraform으로 ECS, ECR, ALB 등 애플리케이션 리소스만 배포**
3. **GitHub Actions를 통한 자동 CI/CD 파이프라인 구축**
4. **환경별 분리된 배포 및 모니터링**

모든 과정이 완료되면 코드 푸시만으로 자동 배포가 가능합니다! 🚀 