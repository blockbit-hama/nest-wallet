# AWS Secrets Manager 환경 변수 관리 가이드

## 📋 개요

이 문서는 AWS Secrets Manager를 사용하여 환경 변수를 관리하는 방법에 대한 가이드입니다. 현재 시스템은 다음과 같이 구성되어 있습니다:

- **로컬 환경**: `.env.local` 파일 사용 (`npm run setup:local`)
- **개발 환경**: ECS Task Definition (`nest-wallet-task-dev`) + AWS Secrets Manager
- **프로덕션 환경**: ECS Task Definition (`nest-wallet-task`) + AWS Secrets Manager

## 🏗️ 아키텍처

### 환경 변수 관리 구조

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

### Secrets Manager에서 관리하는 변수

**개발 환경 시크릿 (`nest-wallet-dev-secrets`):**
```json
{
  "NEXT_PUBLIC_API_URL": "https://dev-api.blockbit.com",
  "NEXT_PUBLIC_API_BASE_URL": "https://dev-api.blockbit.com/api"
}
```

**프로덕션 환경 시크릿 (`nest-wallet-prod-secrets`):**
```json
{
  "NEXT_PUBLIC_API_URL": "https://api.blockbit.com",
  "NEXT_PUBLIC_API_BASE_URL": "https://api.blockbit.com/api"
}
```

### ECS Task Definition에서의 참조

**프로덕션 Task Definition:**
```hcl
# 환경 변수 (Terraform 변수에서)
environment = [
  for key, value in var.prod_environment_vars : {
    name  = key
    value = value
  }
]

# Secrets Manager에서 가져오는 변수 (API URL만)
secrets = [
  {
    name      = "NEXT_PUBLIC_API_URL"
    valueFrom = "arn:aws:secretsmanager:...:NEXT_PUBLIC_API_URL::"
  },
  {
    name      = "NEXT_PUBLIC_API_BASE_URL"
    valueFrom = "arn:aws:secretsmanager:...:NEXT_PUBLIC_API_BASE_URL::"
  }
]
```

**개발 Task Definition:**
```hcl
# 환경 변수 (Terraform 변수에서)
environment = [
  for key, value in var.dev_environment_vars : {
    name  = key
    value = value
  }
]

# Secrets Manager에서 가져오는 변수 (API URL만)
secrets = [
  {
    name      = "NEXT_PUBLIC_API_URL"
    valueFrom = "arn:aws:secretsmanager:...:NEXT_PUBLIC_API_URL::"
  },
  {
    name      = "NEXT_PUBLIC_API_BASE_URL"
    valueFrom = "arn:aws:secretsmanager:...:NEXT_PUBLIC_API_BASE_URL::"
  }
]
```

## 🔧 설정 방법

### 1. 로컬 개발 환경

**로컬 환경 설정:**
```bash
# 로컬 개발 시작
npm run setup:local
npm run dev
```

**`.env.local` 파일 예시:**
```bash
# 로컬 환경 설정
NODE_ENV=development
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_INFURA_API_KEY=your-local-infura-key
# ... 기타 설정
```

### 2. AWS Secrets Manager 시크릿 생성

**Terraform으로 자동 생성:**
```bash
# Terraform 적용
cd terraform
terraform apply -auto-approve
```

**수동으로 생성 (AWS 콘솔):**
1. AWS Secrets Manager 콘솔 접속
2. "Store a new secret" 클릭
3. Secret type: "Other type of secret"
4. Key/value pairs 입력:

**개발 환경 시크릿 (`nest-wallet-dev-secrets`):**
```json
{
  "NEXT_PUBLIC_API_URL": "https://dev-api.blockbit.com",
  "NEXT_PUBLIC_API_BASE_URL": "https://dev-api.blockbit.com/api"
}
```

**프로덕션 환경 시크릿 (`nest-wallet-prod-secrets`):**
```json
{
  "NEXT_PUBLIC_API_URL": "https://api.blockbit.com",
  "NEXT_PUBLIC_API_BASE_URL": "https://api.blockbit.com/api"
}
```

### 3. 시크릿 값 업데이트

**AWS CLI로 업데이트:**
```bash
# 개발 환경 API URL 업데이트
aws secretsmanager update-secret \
  --secret-id nest-wallet-dev-secrets \
  --secret-string '{
    "NEXT_PUBLIC_API_URL": "https://new-dev-api.blockbit.com",
    "NEXT_PUBLIC_API_BASE_URL": "https://new-dev-api.blockbit.com/api"
  }'

# 프로덕션 환경 API URL 업데이트
aws secretsmanager update-secret \
  --secret-id nest-wallet-prod-secrets \
  --secret-string '{
    "NEXT_PUBLIC_API_URL": "https://new-api.blockbit.com",
    "NEXT_PUBLIC_API_BASE_URL": "https://new-api.blockbit.com/api"
  }'
```

## 🚀 배포 프로세스

### 1. 환경별 배포

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

### 2. 환경 변수 적용 확인

**ECS 태스크에서 환경 변수 확인:**
```bash
# 실행 중인 태스크 확인
aws ecs list-tasks --cluster nest-wallet-cluster --service nest-wallet-service

# 태스크 상세 정보 확인
aws ecs describe-tasks \
  --cluster nest-wallet-cluster \
  --tasks task-arn-here

# 환경 변수와 시크릿 확인
aws ecs describe-tasks \
  --cluster nest-wallet-cluster \
  --tasks $(aws ecs list-tasks --cluster nest-wallet-cluster --service nest-wallet-service --query 'taskArns[]' --output text) \
  --query 'tasks[0].overrides.containerOverrides[0]'
```

## 📊 모니터링 및 관리

### 1. 시크릿 상태 확인

**AWS CLI로 확인:**
```bash
# 시크릿 목록 확인
aws secretsmanager list-secrets

# 특정 시크릿 정보 확인
aws secretsmanager describe-secret --secret-id nest-wallet-prod-secrets

# 시크릿 값 확인 (주의: 민감한 정보 포함)
aws secretsmanager get-secret-value --secret-id nest-wallet-prod-secrets
```

### 2. Task Definition 확인

**Task Definition 목록 확인:**
```bash
# Task Definition 목록
aws ecs list-task-definitions --family-prefix nest-wallet

# 특정 Task Definition 상세 정보
aws ecs describe-task-definition --task-definition nest-wallet-task
aws ecs describe-task-definition --task-definition nest-wallet-task-dev
```

## 🔒 보안 고려사항

### 1. 접근 권한 관리

**IAM 정책 예시:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:region:account:secret:nest-wallet-dev-secrets*",
        "arn:aws:secretsmanager:region:account:secret:nest-wallet-prod-secrets*"
      ]
    }
  ]
}
```

### 2. 환경 변수 분리 전략

**Secrets Manager에서 관리:**
- `NEXT_PUBLIC_API_URL`: API 엔드포인트 URL
- `NEXT_PUBLIC_API_BASE_URL`: API 베이스 URL

**ECS Task Definition에서 관리:**
- API 키들 (Infura, BlockCypher, Etherscan)
- 포트 설정
- 로깅 설정
- 기타 비민감 설정

## 🔧 문제 해결

### 1. 일반적인 문제

**시크릿 접근 권한 오류:**
```
Error: User: arn:aws:sts::account:assumed-role/ecsTaskExecutionRole/task-id is not authorized to perform: secretsmanager:GetSecretValue
```

**해결 방법:**
1. ECS Execution Role에 Secrets Manager 권한 확인
2. 시크릿 ARN이 올바른지 확인
3. IAM 정책 업데이트

**환경 변수 우선순위 문제:**
```
Error: Environment variable conflict
```

**해결 방법:**
1. Secrets Manager 값이 환경 변수를 오버라이드하는지 확인
2. Task Definition에서 중복 설정 확인

### 2. 디버깅 명령어

**시크릿 값 확인:**
```bash
# 시크릿 값 확인 (JSON 형식)
aws secretsmanager get-secret-value \
  --secret-id nest-wallet-prod-secrets \
  --query SecretString \
  --output text | jq .

# 특정 키 값만 확인
aws secretsmanager get-secret-value \
  --secret-id nest-wallet-prod-secrets \
  --query SecretString \
  --output text | jq -r '.NEXT_PUBLIC_API_URL'
```

**환경 변수 확인:**
```bash
# Terraform 변수 확인
cd terraform
terraform output prod_environment_vars
terraform output dev_environment_vars
```

## 📈 성능 최적화

### 1. 시크릿 캐싱

**ECS에서의 캐싱:**
- ECS는 시크릿 값을 메모리에 캐싱
- 컨테이너 재시작 시에만 새로 가져옴

### 2. 환경 변수 최적화

**권장사항:**
- 자주 변경되지 않는 값은 ECS Task Definition에 저장
- 민감하거나 자주 변경되는 값만 Secrets Manager 사용
- 환경별 Task Definition으로 명확한 분리

## 🛠️ 운영 가이드

### 1. API URL 변경

**개발 환경:**
```bash
# 시크릿 업데이트
aws secretsmanager update-secret \
  --secret-id nest-wallet-dev-secrets \
  --secret-string '{
    "NEXT_PUBLIC_API_URL": "https://new-dev-api.blockbit.com",
    "NEXT_PUBLIC_API_BASE_URL": "https://new-dev-api.blockbit.com/api"
  }'

# ECS 서비스 재배포
aws ecs update-service \
  --cluster nest-wallet-cluster \
  --service nest-wallet-service \
  --force-new-deployment
```

**프로덕션 환경:**
```bash
# 시크릿 업데이트
aws secretsmanager update-secret \
  --secret-id nest-wallet-prod-secrets \
  --secret-string '{
    "NEXT_PUBLIC_API_URL": "https://new-api.blockbit.com",
    "NEXT_PUBLIC_API_BASE_URL": "https://new-api.blockbit.com/api"
  }'

# ECS 서비스 재배포
aws ecs update-service \
  --cluster nest-wallet-cluster \
  --service nest-wallet-service \
  --force-new-deployment
```

### 2. 환경 변수 변경

**API 키 변경:**
1. Terraform 변수 수정 (`terraform/variables.tf`)
2. `terraform apply` 실행
3. ECS 서비스 재배포

**개발 환경 변수 수정:**
```hcl
# terraform/variables.tf
variable "dev_environment_vars" {
  default = {
    NODE_ENV = "development"
    PORT = "3001"
    NEXT_PUBLIC_INFURA_API_KEY = "new-dev-key"
    # ... 기타 설정
  }
}
```

## 📞 지원 및 연락처

**문제 발생 시:**
1. AWS Secrets Manager 문서 확인
2. CloudWatch 로그 확인
3. 개발팀에 문의

**유용한 링크:**
- [AWS Secrets Manager 공식 문서](https://docs.aws.amazon.com/secretsmanager/)
- [ECS에서 Secrets Manager 사용](https://docs.aws.amazon.com/ecs/latest/userguide/specifying-sensitive-data.html)
- [IAM 권한 설정](https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html)

---

**마지막 업데이트**: 2025년 7월 22일
**버전**: 3.0 