# ECS Rolling Deployment 관리 가이드

## 📋 개요

이 문서는 AWS ECS에서 Rolling Deployment를 관리하는 방법에 대한 가이드입니다. 현재 시스템은 다음과 같이 구성되어 있습니다:

- **로컬 환경**: `.env.local` 파일 사용 (`npm run setup:local`)
- **개발 환경**: ECS Task Definition (`nest-wallet-task-dev`) + AWS Secrets Manager
- **프로덕션 환경**: ECS Task Definition (`nest-wallet-task`) + AWS Secrets Manager

## 🏗️ 아키텍처

### 배포 구조

```
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Local Dev     │    │   Development       │    │   Production        │
│                 │    │                     │    │                     │
│ .env.local      │    │ ECS Task Definition │    │ ECS Task Definition │
│ (npm run        │    │ nest-wallet-task-   │    │ nest-wallet-task    │
│  setup:local)   │    │ dev + Secrets       │    │ + Secrets Manager   │
│                 │    │ Manager             │    │                     │
└─────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### Rolling Deployment 설정

```hcl
# ECS Service 설정
resource "aws_ecs_service" "main" {
  # Rolling 배포 설정
  deployment_controller {
    type = "ECS"
  }

  # 롤링 배포 설정
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
}
```

## 🔧 환경별 Task Definition

### 프로덕션 환경 (`nest-wallet-task`)

```hcl
resource "aws_ecs_task_definition" "main" {
  family = "${var.project_name}-task"
  
  container_definitions = jsonencode([
    {
      name  = "${var.project_name}-container"
      image = "${aws_ecr_repository.main.repository_url}:latest"
      
      # 환경 변수 (Terraform 변수에서)
      environment = [
        for key, value in var.prod_environment_vars : {
          name  = key
          value = value
        }
      ]

      # Secrets Manager에서 가져오는 변수
      secrets = [
        {
          name      = "NEXT_PUBLIC_API_URL"
          valueFrom = "${aws_secretsmanager_secret.prod.arn}:NEXT_PUBLIC_API_URL::"
        },
        {
          name      = "NEXT_PUBLIC_API_BASE_URL"
          valueFrom = "${aws_secretsmanager_secret.prod.arn}:NEXT_PUBLIC_API_BASE_URL::"
        }
      ]
    }
  ])
}
```

### 개발 환경 (`nest-wallet-task-dev`)

```hcl
resource "aws_ecs_task_definition" "dev" {
  family = "${var.project_name}-task-dev"
  
  container_definitions = jsonencode([
    {
      name  = "${var.project_name}-container"
      image = "${aws_ecr_repository.main.repository_url}:latest"
      
      # 환경 변수 (Terraform 변수에서)
      environment = [
        for key, value in var.dev_environment_vars : {
          name  = key
          value = value
        }
      ]

      # Secrets Manager에서 가져오는 변수
      secrets = [
        {
          name      = "NEXT_PUBLIC_API_URL"
          valueFrom = "${aws_secretsmanager_secret.dev.arn}:NEXT_PUBLIC_API_URL::"
        },
        {
          name      = "NEXT_PUBLIC_API_BASE_URL"
          valueFrom = "${aws_secretsmanager_secret.dev.arn}:NEXT_PUBLIC_API_BASE_URL::"
        }
      ]
    }
  ])
}
```

## 🚀 배포 프로세스

### 1. 자동 배포

**프로덕션 배포 (main 브랜치):**
```bash
git push origin main
# 자동으로 .github/workflows/deploy.yml 실행
# nest-wallet-task + 프로덕션 시크릿 사용
```

**개발 배포 (develop 브랜치):**
```bash
git push origin develop
# 자동으로 .github/workflows/deploy-dev.yml 실행
# nest-wallet-task-dev + 개발 시크릿 사용
```

### 2. 수동 배포

**GitHub Actions 수동 실행:**
1. GitHub → Actions → ECS Rolling Deployment
2. "Run workflow" 클릭
3. 실행

**개발 환경 수동 배포:**
1. GitHub → Actions → ECS Development Deployment
2. "Run workflow" 클릭
3. 환경 선택 (dev/local)
4. 실행

## 📊 모니터링 및 관리

### 1. 배포 상태 확인

**ECS 서비스 상태 확인:**
```bash
# 서비스 상태 확인
aws ecs describe-services \
  --cluster nest-wallet-cluster \
  --services nest-wallet-service

# 배포 상태 확인
aws ecs describe-services \
  --cluster nest-wallet-cluster \
  --services nest-wallet-service \
  --query 'services[0].deployments'
```

**Task 상태 확인:**
```bash
# 실행 중인 태스크 확인
aws ecs list-tasks \
  --cluster nest-wallet-cluster \
  --service nest-wallet-service

# 태스크 상세 정보 확인
aws ecs describe-tasks \
  --cluster nest-wallet-cluster \
  --tasks $(aws ecs list-tasks --cluster nest-wallet-cluster --service nest-wallet-service --query 'taskArns[]' --output text)
```

### 2. 로그 확인

**CloudWatch 로그 확인:**
```bash
# 로그 그룹 확인
aws logs describe-log-groups --log-group-name-prefix "/ecs/nest-wallet"

# 최근 로그 확인
aws logs tail /ecs/nest-wallet --follow
```

### 3. Auto Scaling 모니터링

**Auto Scaling 설정 확인:**
```bash
# Auto Scaling 타겟 확인
aws application-autoscaling describe-scalable-targets \
  --service-namespace ecs \
  --resource-id service/nest-wallet-cluster/nest-wallet-service

# Auto Scaling 정책 확인
aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs \
  --resource-id service/nest-wallet-cluster/nest-wallet-service
```

## 🔧 문제 해결

### 1. 배포 실패

**일반적인 원인:**
- Task Definition 오류
- 컨테이너 헬스체크 실패
- 환경 변수 오류
- Secrets Manager 접근 권한 문제

**해결 방법:**
```bash
# 서비스 이벤트 확인
aws ecs describe-services \
  --cluster nest-wallet-cluster \
  --services nest-wallet-service \
  --query 'services[0].events'

# 태스크 로그 확인
aws logs tail /ecs/nest-wallet --follow
```

### 2. 롤백 방법

**이전 버전으로 롤백:**
```bash
# 이전 Task Definition 확인
aws ecs describe-task-definition \
  --task-definition nest-wallet-task

# 이전 버전으로 서비스 업데이트
aws ecs update-service \
  --cluster nest-wallet-cluster \
  --service nest-wallet-service \
  --task-definition nest-wallet-task:이전_리비전_번호
```

### 3. 환경 변수 문제

**환경 변수 확인:**
```bash
# Task Definition의 환경 변수 확인
aws ecs describe-task-definition \
  --task-definition nest-wallet-task \
  --query 'taskDefinition.containerDefinitions[0].environment'

# Secrets Manager 값 확인
aws secretsmanager get-secret-value \
  --secret-id nest-wallet-prod-secrets \
  --query SecretString \
  --output text | jq .
```

## 🛠️ 운영 가이드

### 1. 환경 변수 변경

**API 키 변경:**
```bash
# Terraform 변수 수정
cd terraform
# variables.tf 파일에서 값 수정

# Terraform 적용
terraform apply -auto-approve

# 서비스 재배포
aws ecs update-service \
  --cluster nest-wallet-cluster \
  --service nest-wallet-service \
  --force-new-deployment
```

**API URL 변경:**
```bash
# Secrets Manager 업데이트
aws secretsmanager update-secret \
  --secret-id nest-wallet-prod-secrets \
  --secret-string '{
    "NEXT_PUBLIC_API_URL": "https://new-api.blockbit.com",
    "NEXT_PUBLIC_API_BASE_URL": "https://new-api.blockbit.com/api"
  }'

# 서비스 재배포
aws ecs update-service \
  --cluster nest-wallet-cluster \
  --service nest-wallet-service \
  --force-new-deployment
```

### 2. Auto Scaling 조정

**Auto Scaling 설정 변경:**
```bash
# 최소/최대 태스크 수 변경
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/nest-wallet-cluster/nest-wallet-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# CPU 임계값 변경
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/nest-wallet-cluster/nest-wallet-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name nest-wallet-scale-up \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    }
  }'
```

### 3. 성능 최적화

**리소스 조정:**
```bash
# CPU/메모리 조정
# terraform/variables.tf에서 수정
variable "task_cpu" {
  default = 512  # 256 → 512로 증가
}

variable "task_memory" {
  default = 1024  # 512 → 1024로 증가
}
```

## 📈 모니터링 대시보드

### 1. CloudWatch 대시보드

**주요 메트릭:**
- CPU 사용률
- 메모리 사용률
- 요청 수
- 응답 시간
- 오류율

**대시보드 생성:**
```bash
# CloudWatch 대시보드 생성
aws cloudwatch put-dashboard \
  --dashboard-name nest-wallet-monitoring \
  --dashboard-body file://dashboard.json
```

### 2. 알림 설정

**CloudWatch 알림:**
```bash
# CPU 사용률 알림
aws cloudwatch put-metric-alarm \
  --alarm-name nest-wallet-cpu-high \
  --alarm-description "CPU usage is high" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## 🔒 보안 고려사항

### 1. IAM 권한 관리

**최소 권한 원칙:**
- ECS 서비스에 필요한 최소 권한만 부여
- Secrets Manager 접근 권한 제한
- Auto Scaling 권한 제한

### 2. 네트워크 보안

**Security Group 설정:**
- ALB에서 ECS로의 트래픽만 허용
- ECS에서 외부로의 아웃바운드 트래픽 제한

## 📞 지원 및 연락처

**문제 발생 시:**
1. CloudWatch 로그 확인
2. ECS 서비스 이벤트 확인
3. 개발팀에 문의

**유용한 링크:**
- [ECS Rolling Deployment 공식 문서](https://docs.aws.amazon.com/ecs/latest/userguide/deployment-type-ecs.html)
- [Auto Scaling 가이드](https://docs.aws.amazon.com/ecs/latest/userguide/service-auto-scaling.html)
- [CloudWatch 모니터링](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/)

---

**마지막 업데이트**: 2025년 7월 22일
**버전**: 2.0 