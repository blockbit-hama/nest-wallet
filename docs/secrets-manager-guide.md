# AWS Secrets Manager 가이드

## 📋 목차

- [1. Secrets Manager 개요](#1-secrets-manager-개요)
- [2. 연결 방식 (기술 설명)](#2-연결-방식-기술-설명)
- [3. 관리 문서](#3-관리-문서)
- [4. 모니터링 및 로깅](#4-모니터링-및-로깅)

---

## 1. Secrets Manager 개요!

### 1.1 Nest-Wallet에서 사용하는 Secrets

| 환경 | Secret 이름 | 설명 | 포함된 값 |
|------|-------------|------|-----------|
| **Development** | `nest-wallet-dev-secrets` | 개발 환경 시크릿 | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE_URL` |
| **Production** | `nest-wallet-prod-secrets` | 프로덕션 환경 시크릿 | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE_URL` |

### 1.2 현재 설정된 값

**개발 환경**:
```json
{
  "NEXT_PUBLIC_API_URL": "https://dev-api.blockbit.com",
  "NEXT_PUBLIC_API_BASE_URL": "https://dev-api.blockbit.com/api"
}
```

**프로덕션 환경**:
```json
{
  "NEXT_PUBLIC_API_URL": "https://api.blockbit.com",
  "NEXT_PUBLIC_API_BASE_URL": "https://api.blockbit.com/api"
}
```

---

## 2. 연결 방식 (기술 설명)

### 2.1 ECS Task Definition에서의 연결

#### 2.1.1 Terraform 설정
```hcl
# ECS Task Definition에서 Secrets Manager 연결
resource "aws_ecs_task_definition" "environments" {
  # ... 기타 설정 ...

  container_definitions = jsonencode([
    {
      name = "${var.project_name}-${each.key}-container"
      # ... 기타 설정 ...

      # Secrets Manager에서 환경변수 가져오기
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
    }
  ])
}
```

#### 2.1.2 연결 구조 설명
```
ECS Task Definition
    ↓
Container Definition
    ↓
Secrets Array
    ↓
valueFrom: "arn:aws:secretsmanager:region:account:secret:secret-name:key::"
    ↓
AWS Secrets Manager
    ↓
JSON 형태의 시크릿 값
    ↓
컨테이너 환경변수로 주입
```

### 2.2 IAM 권한 설정

#### 2.2.1 ECS 실행 역할 권한
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:ap-northeast-2:*:secret:nest-wallet-dev-secrets-*",
        "arn:aws:secretsmanager:ap-northeast-2:*:secret:nest-wallet-prod-secrets-*"
      ]
    }
  ]
}
```

#### 2.2.2 Terraform으로 권한 설정
```hcl
# ECS 실행 역할에 Secrets Manager 접근 권한 추가
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
```

### 2.3 애플리케이션에서의 사용

#### 2.3.1 Next.js에서 환경변수 접근
```javascript
// pages/api/example.js
export default function handler(req, res) {
  // Secrets Manager에서 주입된 환경변수 사용
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  console.log('API URL:', apiUrl);
  console.log('API Base URL:', apiBaseUrl);
  
  res.status(200).json({ 
    apiUrl, 
    apiBaseUrl 
  });
}
```

#### 2.3.2 환경변수 타입
```typescript
// types/environment.d.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_API_URL: string;
      NEXT_PUBLIC_API_BASE_URL: string;
      NODE_ENV: 'development' | 'production';
      PORT: string;
      // ... 기타 환경변수
    }
  }
}

export {};
```

---

## 3. 관리 문서

### 3.1 Secrets Manager 수정하는 법

#### 3.1.1 AWS 콘솔에서 수정

**1단계: AWS 콘솔 접속**
1. AWS 콘솔 접속: https://console.aws.amazon.com
2. **Secrets Manager** 서비스 이동
3. 해당 시크릿 선택 (예: `nest-wallet-dev-secrets`)

**2단계: 새 버전 생성**
1. **Edit** 버튼 클릭
2. **Plaintext** 탭에서 JSON 수정:

```json
{
  "NEXT_PUBLIC_API_URL": "https://new-dev-api.blockbit.com",
  "NEXT_PUBLIC_API_BASE_URL": "https://new-dev-api.blockbit.com/api",
  "NEW_SECRET_KEY": "new-secret-value"
}
```

**3단계: 저장 및 배포**
1. **Save** 버튼 클릭
2. ECS 서비스 재배포 필요

#### 3.1.2 AWS CLI로 수정

```bash
# 개발 환경 시크릿 수정
aws secretsmanager update-secret \
  --secret-id nest-wallet-dev-secrets \
  --secret-string '{
    "NEXT_PUBLIC_API_URL": "https://new-dev-api.blockbit.com",
    "NEXT_PUBLIC_API_BASE_URL": "https://new-dev-api.blockbit.com/api",
    "NEW_SECRET_KEY": "new-secret-value"
  }'

# 프로덕션 환경 시크릿 수정
aws secretsmanager update-secret \
  --secret-id nest-wallet-prod-secrets \
  --secret-string '{
    "NEXT_PUBLIC_API_URL": "https://new-api.blockbit.com",
    "NEXT_PUBLIC_API_BASE_URL": "https://new-api.blockbit.com/api",
    "NEW_SECRET_KEY": "new-secret-value"
  }'
```

#### 3.1.3 Terraform으로 수정

```hcl
# terraform/secrets.tf 수정
resource "aws_secretsmanager_secret_version" "dev" {
  secret_id = aws_secretsmanager_secret.dev.id
  secret_string = jsonencode({
    NEXT_PUBLIC_API_URL      = "https://new-dev-api.blockbit.com"
    NEXT_PUBLIC_API_BASE_URL = "https://new-dev-api.blockbit.com/api"
    NEW_SECRET_KEY           = "new-secret-value"
  })
}

resource "aws_secretsmanager_secret_version" "prod" {
  secret_id = aws_secretsmanager_secret.prod.id
  secret_string = jsonencode({
    NEXT_PUBLIC_API_URL      = "https://new-api.blockbit.com"
    NEXT_PUBLIC_API_BASE_URL = "https://new-api.blockbit.com/api"
    NEW_SECRET_KEY           = "new-secret-value"
  })
}
```

```bash
# Terraform 적용
terraform apply
```

### 3.2 Secrets Manager 추가하는 법

#### 3.2.1 새 시크릿 키 추가

**1단계: Secret 값에 새 키 추가**
```json
{
  "NEXT_PUBLIC_API_URL": "https://dev-api.blockbit.com",
  "NEXT_PUBLIC_API_BASE_URL": "https://dev-api.blockbit.com/api",
  "DATABASE_URL": "postgresql://user:password@host:port/db",
  "REDIS_URL": "redis://host:port",
  "JWT_SECRET": "your-jwt-secret-key"
}
```

**2단계: ECS Task Definition에 새 시크릿 추가**
```hcl
# terraform/main.tf 수정
secrets = [
  {
    name      = "NEXT_PUBLIC_API_URL"
    valueFrom = "${each.key == "dev" ? aws_secretsmanager_secret.dev.arn : aws_secretsmanager_secret.prod.arn}:NEXT_PUBLIC_API_URL::"
  },
  {
    name      = "NEXT_PUBLIC_API_BASE_URL"
    valueFrom = "${each.key == "dev" ? aws_secretsmanager_secret.dev.arn : aws_secretsmanager_secret.prod.arn}:NEXT_PUBLIC_API_BASE_URL::"
  },
  {
    name      = "DATABASE_URL"
    valueFrom = "${each.key == "dev" ? aws_secretsmanager_secret.dev.arn : aws_secretsmanager_secret.prod.arn}:DATABASE_URL::"
  },
  {
    name      = "REDIS_URL"
    valueFrom = "${each.key == "dev" ? aws_secretsmanager_secret.dev.arn : aws_secretsmanager_secret.prod.arn}:REDIS_URL::"
  },
  {
    name      = "JWT_SECRET"
    valueFrom = "${each.key == "dev" ? aws_secretsmanager_secret.dev.arn : aws_secretsmanager_secret.prod.arn}:JWT_SECRET::"
  }
]
```

**3단계: 애플리케이션에서 사용**
```javascript
// 새 환경변수 사용
const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
const jwtSecret = process.env.JWT_SECRET;
```

#### 3.2.2 새 환경 추가 (예: staging)

**1단계: Terraform 변수에 staging 환경 추가**
```hcl
# terraform/variables.tf
variable "company_vpc_info" {
  default = {
    dev = { /* ... */ }
    staging = {
      vpc_id              = "vpc-staging-xxxxxxxxx"
      public_subnet_ids   = ["subnet-staging-public-1", "subnet-staging-public-2"]
      private_subnet_ids  = ["subnet-staging-private-1", "subnet-staging-private-2"]
      alb_security_group_id = "sg-staging-alb-xxxxxxxxx"
      ecs_security_group_id = "sg-staging-ecs-yyyyyyyyy"
    }
    prod = { /* ... */ }
  }
}
```

**2단계: Staging Secrets Manager 생성**
```hcl
# terraform/secrets.tf
resource "aws_secretsmanager_secret" "staging" {
  name        = "${var.project_name}-staging-secrets"
  description = "Staging environment secrets for ${var.project_name}"

  tags = {
    Name        = "${var.project_name}-staging-secrets"
    Environment = "staging"
  }
}

resource "aws_secretsmanager_secret_version" "staging" {
  secret_id = aws_secretsmanager_secret.staging.id
  secret_string = jsonencode({
    NEXT_PUBLIC_API_URL      = "https://staging-api.blockbit.com"
    NEXT_PUBLIC_API_BASE_URL = "https://staging-api.blockbit.com/api"
  })
}
```

**3단계: ECS Task Definition에 staging 환경 추가**
```hcl
# main.tf의 for_each 루프에 자동으로 포함됨
# family = each.key == "dev" ? "${var.project_name}-task-dev" : 
#          each.key == "staging" ? "${var.project_name}-task-staging" : 
#          "${var.project_name}-task"
```

### 3.3 Secrets Manager 삭제하는 법

#### 3.3.1 특정 키 삭제

**1단계: Secret 값에서 키 제거**
```json
// 기존
{
  "NEXT_PUBLIC_API_URL": "https://dev-api.blockbit.com",
  "NEXT_PUBLIC_API_BASE_URL": "https://dev-api.blockbit.com/api",
  "OLD_SECRET_KEY": "old-value"
}

// 수정 후
{
  "NEXT_PUBLIC_API_URL": "https://dev-api.blockbit.com",
  "NEXT_PUBLIC_API_BASE_URL": "https://dev-api.blockbit.com/api"
}
```

**2단계: ECS Task Definition에서 제거**
```hcl
# terraform/main.tf에서 해당 secrets 항목 제거
secrets = [
  {
    name      = "NEXT_PUBLIC_API_URL"
    valueFrom = "${each.key == "dev" ? aws_secretsmanager_secret.dev.arn : aws_secretsmanager_secret.prod.arn}:NEXT_PUBLIC_API_URL::"
  },
  {
    name      = "NEXT_PUBLIC_API_BASE_URL"
    valueFrom = "${each.key == "dev" ? aws_secretsmanager_secret.dev.arn : aws_secretsmanager_secret.prod.arn}:NEXT_PUBLIC_API_BASE_URL::"
  }
  // OLD_SECRET_KEY 항목 제거
]
```

#### 3.3.2 전체 Secret 삭제

**1단계: Terraform에서 Secret 제거**
```hcl
# terraform/secrets.tf에서 해당 리소스 제거
# resource "aws_secretsmanager_secret" "dev" { ... } 제거
# resource "aws_secretsmanager_secret_version" "dev" { ... } 제거
```

**2단계: IAM 정책에서 ARN 제거**
```hcl
# terraform/main.tf의 IAM 정책에서 해당 ARN 제거
Resource = [
  # aws_secretsmanager_secret.dev.arn 제거
  aws_secretsmanager_secret.prod.arn
]
```

**3단계: Terraform 적용**
```bash
terraform apply
```

#### 3.3.3 AWS CLI로 강제 삭제
```bash
# 즉시 삭제 (복구 불가)
aws secretsmanager delete-secret \
  --secret-id nest-wallet-dev-secrets \
  --force-delete-without-recovery

# 복구 기간 설정 후 삭제 (기본 30일)
aws secretsmanager delete-secret \
  --secret-id nest-wallet-dev-secrets \
  --recovery-window-in-days 7
```

### 3.4 시크릿 값 확인하는 법

#### 3.4.1 AWS 콘솔에서 확인
1. AWS 콘솔 → Secrets Manager
2. 해당 시크릿 선택
3. **Retrieve secret value** 클릭

#### 3.4.2 AWS CLI로 확인
```bash
# 개발 환경 시크릿 확인
aws secretsmanager get-secret-value \
  --secret-id nest-wallet-dev-secrets \
  --query 'SecretString' \
  --output text | jq '.'

# 프로덕션 환경 시크릿 확인
aws secretsmanager get-secret-value \
  --secret-id nest-wallet-prod-secrets \
  --query 'SecretString' \
  --output text | jq '.'
```

#### 3.4.3 Terraform으로 확인
```bash
# Terraform 출력으로 확인
terraform output secrets_manager_arns

# 특정 시크릿 값 확인
terraform output -json deployment_summary
```

---

## 4. 모니터링 및 로깅

### 4.1 CloudWatch 로그에서 확인

#### 4.1.1 ECS 태스크 로그 확인
```bash
# 개발 환경 로그 확인
aws logs tail /ecs/nest-wallet-dev --follow

# 프로덕션 환경 로그 확인
aws logs tail /ecs/nest-wallet-prod --follow
```

#### 4.1.2 환경변수 주입 확인
```bash
# ECS 태스크에서 환경변수 확인
aws ecs describe-tasks \
  --cluster nest-wallet-dev-cluster \
  --tasks $(aws ecs list-tasks --cluster nest-wallet-dev-cluster --query 'taskArns[0]' --output text) \
  --query 'tasks[0].overrides.containerOverrides[0].environment'
```

### 4.2 Secrets Manager 모니터링

#### 4.2.1 CloudWatch 메트릭 확인
```bash
# Secrets Manager 메트릭 확인
aws cloudwatch get-metric-statistics \
  --namespace AWS/SecretsManager \
  --metric-name SecretCount \
  --dimensions Name=SecretName,Value=nest-wallet-dev-secrets \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

#### 4.2.2 시크릿 접근 로그 확인
```bash
# CloudTrail에서 Secrets Manager 접근 로그 확인
aws logs filter-log-events \
  --log-group-name CloudTrail/DefaultLogGroup \
  --filter-pattern '{ $.eventName = "GetSecretValue" }' \
  --start-time $(date -u -d '1 day ago' +%s)000
```

### 4.3 문제 해결

#### 4.3.1 일반적인 문제들

**1. 권한 오류**
```
Error: User: arn:aws:sts::123456789012:assumed-role/ecsTaskExecutionRole/1234567890123456789012 is not authorized to perform: secretsmanager:GetSecretValue
```
**해결방법**: ECS 실행 역할에 Secrets Manager 접근 권한 추가

**2. 시크릿을 찾을 수 없음**
```
Error: ResourceNotFoundException: Secrets Manager can't find the specified secret
```
**해결방법**: Secret 이름과 ARN 확인, 리전 확인

**3. 잘못된 JSON 형식**
```
Error: InvalidParameterException: Invalid JSON in secret value
```
**해결방법**: Secret 값의 JSON 형식 검증

#### 4.3.2 디버깅 명령어
```bash
# ECS 태스크 상태 확인
aws ecs describe-services \
  --cluster nest-wallet-dev-cluster \
  --services nest-wallet-dev-service

# Secret ARN 확인
aws secretsmanager describe-secret \
  --secret-id nest-wallet-dev-secrets

# IAM 역할 권한 확인
aws iam get-role-policy \
  --role-name nest-wallet-ecs-execution-role \
  --policy-name nest-wallet-ecs-execution-secrets-policy
```

---

## 📋 체크리스트

### 시크릿 관리
- [ ] Secret 값이 올바른 JSON 형식인지 확인
- [ ] ECS 실행 역할에 Secrets Manager 접근 권한이 있는지 확인
- [ ] Secret ARN이 올바른지 확인
- [ ] 환경변수 이름이 애플리케이션에서 사용하는 이름과 일치하는지 확인

### 보안
- [ ] Secret 값이 로그에 노출되지 않는지 확인
- [ ] 불필요한 Secret은 삭제했는지 확인
- [ ] Secret 접근 로그를 모니터링하고 있는지 확인

### 배포 후 확인
- [ ] ECS 태스크가 정상적으로 시작되는지 확인
- [ ] 환경변수가 올바르게 주입되는지 확인
- [ ] 애플리케이션이 Secret 값을 올바르게 사용하는지 확인

---

## 🎯 요약

Secrets Manager를 통해 안전하고 효율적으로 환경변수를 관리할 수 있습니다:

1. **보안**: 민감한 정보를 코드에서 분리
2. **중앙 관리**: 모든 환경변수를 한 곳에서 관리
3. **버전 관리**: Secret 값의 변경 이력 추적
4. **자동화**: ECS 배포 시 자동으로 환경변수 주입

올바른 설정과 관리로 안전한 애플리케이션 배포가 가능합니다! 🔐 