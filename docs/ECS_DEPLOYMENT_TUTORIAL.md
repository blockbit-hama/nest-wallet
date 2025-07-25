# 🚀 새로운 프로젝트를 회사 AWS VPC DEV, PROD에 ECS로 Rolling CI/CD 튜토리얼

## 📋 개요

이 튜토리얼은 새로운 프로젝트를 회사 AWS VPC의 Dev/Prod 환경에 ECS로 Rolling CI/CD 배포하는 방법을 단계별로 설명합니다.

## 🎯 목표

- ✅ 회사 기존 VPC에 새로운 ECS 클러스터 구축
- ✅ Rolling Deployment로 무중단 배포
- ✅ GitHub Actions를 통한 자동화된 CI/CD
- ✅ Dev/Prod 환경 분리
- ✅ AWS Secrets Manager를 통한 민감한 설정 관리

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub        │    │   AWS ECR       │    │   AWS ECS       │
│   Repository    │    │   Repository    │    │   Cluster       │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │   Code    │  │    │  │   Image   │  │    │  │   Task    │  │
│  │   Push    │──┼───▶│   Storage  │──┼───▶│ Definition │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ GitHub Actions  │    │ AWS Secrets     │    │ Application     │
│   Workflow      │    │ Manager         │    │ Load Balancer   │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │   Build   │  │    │  │  Secrets  │  │    │  │   ALB     │  │
│  │   Test    │  │    │  │  Storage  │  │    │  │   HTTPS   │  │
│  │  Deploy   │  │    │  │  Access   │  │    │  │   Route   │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 사전 준비사항

### 1. AWS 계정 권한 요청

회사 AWS 관리자에게 다음 권한을 요청하세요:

#### 필수 IAM 정책:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:*",
        "ecr:*",
        "secretsmanager:*",
        "iam:PassRole",
        "iam:GetRole",
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy",
        "logs:*",
        "elasticloadbalancing:*",
        "autoscaling:*",
        "cloudwatch:*",
        "s3:*",
        "dynamodb:*"
      ],
      "Resource": "*"
    }
  ]
}
```

#### 권장 IAM 사용자 생성:
```bash
# AWS 관리자가 생성해야 할 사용자
aws iam create-user --user-name nest-wallet-deployer
aws iam attach-user-policy --user-name nest-wallet-deployer --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
aws iam create-access-key --user-name nest-wallet-deployer
```

### 2. GitHub Repository 설정

#### Repository Secrets 설정:
GitHub Repository → Settings → Secrets and variables → Actions에서 다음 시크릿을 추가:

```bash
# AWS 인증 정보
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=ap-northeast-2

# ECS 설정
ECR_REPOSITORY=nest-wallet-repo
ECS_CLUSTER=nest-wallet-cluster
ECS_SERVICE_DEV=nest-wallet-service-dev
ECS_SERVICE_PROD=nest-wallet-service-prod
ECS_TASK_DEFINITION_DEV=nest-wallet-task-dev
ECS_TASK_DEFINITION_PROD=nest-wallet-task

# Secrets Manager ARN
SECRETS_MANAGER_DEV_ARN=arn:aws:secretsmanager:ap-northeast-2:ACCOUNT:secret:nest-wallet-dev-secrets
SECRETS_MANAGER_PROD_ARN=arn:aws:secretsmanager:ap-northeast-2:ACCOUNT:secret:nest-wallet-prod-secrets
```

## 🚀 단계별 배포 가이드

### Step 1: 프로젝트 구조 설정

#### 1.1 ECS_BACKUP 폴더 복사
```bash
# 현재 프로젝트에 ECS 설정 복사
cp -r ECS_BACKUP/terraform ./terraform-ecs
cp -r ECS_BACKUP/.github/workflows ./.github/workflows
cp ECS_BACKUP/Dockerfile ./
```

#### 1.2 프로젝트 구조 확인
```
nest-wallet/
├── terraform-ecs/           # ECS 인프라 코드
├── .github/
│   └── workflows/
│       ├── deploy-dev.yml   # Dev 배포 워크플로우
│       └── deploy-prod.yml  # Prod 배포 워크플로우
├── Dockerfile              # ECS용 Dockerfile
├── src/                    # 애플리케이션 코드
└── docs/                   # 문서
```

### Step 2: Terraform 인프라 설정

#### 2.1 Terraform 변수 설정
```bash
cd terraform-ecs
```

`terraform.tfvars` 파일 생성:
```hcl
# terraform-ecs/terraform.tfvars
aws_region = "ap-northeast-2"
project_name = "nest-wallet"
environment = "production"

# VPC 설정 (기존 VPC 사용 시 주석 처리)
# vpc_cidr = "10.0.0.0/16"
# availability_zones = ["ap-northeast-2a", "ap-northeast-2c"]
# public_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
# private_subnets = ["10.0.11.0/24", "10.0.12.0/24"]

# 기존 VPC 정보 (회사 VPC 사용)
existing_vpc_id = "vpc-xxxxxxxxx"
existing_public_subnets = ["subnet-xxxxxxxxx", "subnet-xxxxxxxxx"]
existing_private_subnets = ["subnet-xxxxxxxxx", "subnet-xxxxxxxxx"]

# ECS 설정
task_cpu = 256
task_memory = 512
service_desired_count = 2
service_min_count = 2
service_max_count = 10
scale_up_threshold = 70
scale_down_threshold = 30
```

#### 2.2 기존 VPC 사용을 위한 Terraform 수정
`main.tf`에서 VPC 생성 부분을 기존 VPC 사용으로 수정:

```hcl
# terraform-ecs/main.tf (수정된 부분)

# 기존 VPC 사용
data "aws_vpc" "existing" {
  id = var.existing_vpc_id
}

# 기존 서브넷 사용
data "aws_subnet" "public" {
  count = length(var.existing_public_subnets)
  id    = var.existing_public_subnets[count.index]
}

data "aws_subnet" "private" {
  count = length(var.existing_private_subnets)
  id    = var.existing_private_subnets[count.index]
}

# 기존 VPC의 라우팅 테이블 사용
data "aws_route_tables" "existing" {
  vpc_id = data.aws_vpc.existing.id
}
```

### Step 3: AWS Secrets Manager 설정

#### 3.1 Dev 환경 시크릿 생성
```bash
# Dev 환경 시크릿 생성
aws secretsmanager create-secret \
  --name nest-wallet-dev-secrets \
  --description "Nest Wallet Dev Environment Secrets" \
  --secret-string '{
    "NEXT_PUBLIC_API_URL": "https://api-dev.nest-wallet.com",
    "NEXT_PUBLIC_API_BASE_URL": "https://api-dev.nest-wallet.com/api",
    "NEXT_PUBLIC_INFURA_API_KEY": "your-dev-infura-key",
    "NEXT_PUBLIC_BLOCKCYPHER_TOKEN": "your-dev-blockcypher-token",
    "NEXT_PUBLIC_ETHERSCAN_API_KEY": "your-dev-etherscan-key",
    "DATABASE_URL": "postgresql://dev-user:password@dev-db:5432/nestdb",
    "JWT_SECRET": "dev-jwt-secret-CHANGE-THIS",
    "API_KEY": "dev-api-key",
    "REDIS_URL": "redis://dev-redis:6379"
  }' \
  --region ap-northeast-2
```

#### 3.2 Prod 환경 시크릿 생성
```bash
# Prod 환경 시크릿 생성
aws secretsmanager create-secret \
  --name nest-wallet-prod-secrets \
  --description "Nest Wallet Production Environment Secrets" \
  --secret-string '{
    "NEXT_PUBLIC_API_URL": "https://api.nest-wallet.com",
    "NEXT_PUBLIC_API_BASE_URL": "https://api.nest-wallet.com/api",
    "NEXT_PUBLIC_INFURA_API_KEY": "your-prod-infura-key",
    "NEXT_PUBLIC_BLOCKCYPHER_TOKEN": "your-prod-blockcypher-token",
    "NEXT_PUBLIC_ETHERSCAN_API_KEY": "your-prod-etherscan-key",
    "DATABASE_URL": "postgresql://prod-user:password@prod-db:5432/nestdb",
    "JWT_SECRET": "prod-jwt-secret-CHANGE-THIS",
    "API_KEY": "prod-api-key",
    "REDIS_URL": "redis://prod-redis:6379"
  }' \
  --region ap-northeast-2
```

### Step 4: Dockerfile 최적화

#### 4.1 ECS용 Dockerfile 생성

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ../ECS_BACKUP .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Step 5: GitHub Actions 워크플로우 설정

#### 5.1 Dev 환경 워크플로우
`.github/workflows/deploy-dev.yml`:

```yaml
name: ECS Development Deployment

on:
  push:
    branches: [ develop ]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'dev'
        type: choice
        options:
        - dev
        - local

env:
  AWS_REGION: ap-northeast-2
  ECR_REPOSITORY: nest-wallet-repo
  ECS_CLUSTER: nest-wallet-cluster
  ECS_SERVICE: nest-wallet-service-dev
  ECS_TASK_DEFINITION: nest-wallet-task-dev

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

  deploy:
    needs: lint
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop' || github.event_name == 'workflow_dispatch'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG-dev .
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:latest-dev .
          
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG-dev
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest-dev
          
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG-dev" >> $GITHUB_OUTPUT

      - name: Download current task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition ${{ env.ECS_TASK_DEFINITION }} \
            --query taskDefinition > task-definition.json

      - name: Update task definition
        run: |
          jq '.containerDefinitions[0].image = "${{ steps.build-image.outputs.image }}"' task-definition.json > new-task-definition.json

      - name: Register new task definition
        run: |
          aws ecs register-task-definition --cli-input-json file://new-task-definition.json

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --task-definition ${{ env.ECS_TASK_DEFINITION }}

      - name: Wait for deployment to complete
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }} \
            --services ${{ env.ECS_SERVICE }}

      - name: Deployment status
        run: |
          echo "✅ Deployment completed successfully!"
          echo "🔗 Service URL: https://dev.nest-wallet.example.com"
```

#### 5.2 Prod 환경 워크플로우
`.github/workflows/deploy-prod.yml`:

```yaml
name: ECS Production Deployment

on:
  push:
    branches: [ main ]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'prod'
        type: choice
        options:
        - prod

env:
  AWS_REGION: ap-northeast-2
  ECR_REPOSITORY: nest-wallet-repo
  ECS_CLUSTER: nest-wallet-cluster
  ECS_SERVICE: nest-wallet-service-prod
  ECS_TASK_DEFINITION: nest-wallet-task

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG-prod .
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:latest-prod .
          
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG-prod
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest-prod
          
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG-prod" >> $GITHUB_OUTPUT

      - name: Download current task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition ${{ env.ECS_TASK_DEFINITION }} \
            --query taskDefinition > task-definition.json

      - name: Update task definition
        run: |
          jq '.containerDefinitions[0].image = "${{ steps.build-image.outputs.image }}"' task-definition.json > new-task-definition.json

      - name: Register new task definition
        run: |
          aws ecs register-task-definition --cli-input-json file://new-task-definition.json

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --task-definition ${{ env.ECS_TASK_DEFINITION }}

      - name: Wait for deployment to complete
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }} \
            --services ${{ env.ECS_SERVICE }}

      - name: Deployment status
        run: |
          echo "✅ Production deployment completed successfully!"
          echo "🔗 Service URL: https://nest-wallet.example.com"
```

### Step 6: Terraform 인프라 배포

#### 6.1 Terraform 초기화 및 배포
```bash
cd terraform-ecs

# Terraform 초기화
terraform init

# 계획 확인
terraform plan

# 인프라 배포
terraform apply
```

#### 6.2 배포 확인
```bash
# ECS 클러스터 확인
aws ecs describe-clusters --clusters nest-wallet-cluster

# ECS 서비스 확인
aws ecs describe-services \
  --cluster nest-wallet-cluster \
  --services nest-wallet-service-dev nest-wallet-service-prod

# 로드 밸런서 확인
aws elbv2 describe-load-balancers --names nest-wallet-alb
```

### Step 7: 첫 번째 배포 실행

#### 7.1 Dev 환경 배포
```bash
# develop 브랜치에 푸시
git checkout -b develop
git add .
git commit -m "feat: initial ECS deployment setup"
git push origin develop
```

#### 7.2 GitHub Actions 모니터링
1. GitHub Repository → Actions 탭 확인
2. "ECS Development Deployment" 워크플로우 실행 상태 모니터링
3. 각 단계별 로그 확인

#### 7.3 배포 완료 확인
```bash
# ECS 태스크 상태 확인
aws ecs describe-tasks \
  --cluster nest-wallet-cluster \
  --tasks $(aws ecs list-tasks --cluster nest-wallet-cluster --service-name nest-wallet-service-dev --query 'taskArns' --output text)

# 애플리케이션 헬스체크
curl https://dev.nest-wallet.example.com/api/health
```

### Step 8: Prod 환경 배포

#### 8.1 Main 브랜치 배포
```bash
# main 브랜치에 머지
git checkout main
git merge develop
git push origin main
```

#### 8.2 Prod 배포 모니터링
1. GitHub Actions에서 "ECS Production Deployment" 워크플로우 실행
2. Rolling Deployment 진행 상황 확인
3. 무중단 배포 확인

## 🔧 설정 관리

### 환경변수 관리

#### 비민감한 설정 (Terraform 변수)
```hcl
# terraform-ecs/variables.tf
variable "dev_environment_vars" {
  description = "Development environment variables"
  type        = map(string)
  default = {
    NODE_ENV                           = "development"
    PORT                               = "3000"
    NEXT_PUBLIC_DEBUG                  = "true"
    NEXT_PUBLIC_LOG_LEVEL              = "debug"
  }
}
```

#### 민감한 설정 (Secrets Manager)
```bash
# 시크릿 업데이트
aws secretsmanager update-secret \
  --secret-id nest-wallet-dev-secrets \
  --secret-string '{"NEW_SECRET": "new-value"}' \
  --region ap-northeast-2
```

## 🚨 문제 해결

### 1. ECS 서비스 배포 실패
```bash
# 서비스 이벤트 확인
aws ecs describe-services \
  --cluster nest-wallet-cluster \
  --services nest-wallet-service-dev \
  --query 'services[0].events'

# 태스크 로그 확인
aws logs describe-log-groups --log-group-name-prefix /ecs/nest-wallet
```

### 2. 이미지 빌드 실패
```bash
# 로컬에서 Docker 빌드 테스트
docker build -t nest-wallet:test .
docker run -p 3000:3000 nest-wallet:test
```

### 3. Secrets Manager 접근 실패
```bash
# IAM 역할 권한 확인
aws iam get-role --role-name ecsTaskExecutionRole
aws iam list-attached-role-policies --role-name ecsTaskExecutionRole
```

## 📊 모니터링 및 로깅

### CloudWatch 로그 확인
```bash
# 애플리케이션 로그 확인
aws logs tail /ecs/nest-wallet --follow

# 특정 시간대 로그 확인
aws logs filter-log-events \
  --log-group-name /ecs/nest-wallet \
  --start-time $(date -d '1 hour ago' +%s)000
```

### ECS 메트릭 확인
```bash
# CPU/메모리 사용률 확인
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=nest-wallet-service-dev \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

## 🔒 보안 모범 사례

### 1. IAM 최소 권한 원칙
- 필요한 권한만 부여
- 정기적인 권한 검토
- 임시 권한 사용

### 2. Secrets Manager 보안
- 시크릿 값 정기적 로테이션
- 접근 로그 모니터링
- 암호화 키 관리

### 3. 네트워크 보안
- 보안 그룹 최소 권한 설정
- VPC 엔드포인트 사용
- HTTPS 강제 적용

## 📚 추가 자료

- [AWS ECS 문서](https://docs.aws.amazon.com/ecs/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Secrets Manager 문서](https://docs.aws.amazon.com/secretsmanager/)

## 🎉 완료!

이제 회사 AWS VPC에 ECS 기반 Rolling CI/CD 파이프라인이 구축되었습니다! 

### 다음 단계:
1. 실제 도메인 설정
2. SSL 인증서 적용
3. 모니터링 대시보드 구축
4. 백업 및 재해 복구 계획 수립 