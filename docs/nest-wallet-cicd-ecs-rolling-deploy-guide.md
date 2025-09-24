# Nest-Wallet CI/CD ECS 롤링 배포 가이드

## 📋 목차

- [Part 1. Terraform으로 AWS 환경 설치하기](#part-1-terraform으로-aws-환경-설치하기)
- [Part 2. Nest-wallet GitHub Action을 통해 롤링배포하기](#part-2-nest-wallet-github-action을-통해-롤링배포하기)

---

## Part 1. Terraform으로 AWS 환경 설치하기

### 1.1 사전 요구사항

#### 1.1.1 필수 도구 설치
```bash
# AWS CLI 설치
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Terraform 설치
brew install terraform

# jq 설치 (JSON 파싱용)
brew install jq
```

#### 1.1.2 AWS 자격증명 설정
```bash
# AWS 자격증명 설정
aws configure

# 입력할 정보:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region name: ap-northeast-2
# Default output format: json

# 자격증명 확인
aws sts get-caller-identity
```

### 1.2 deploy-environments.sh 스크립트 사용법

#### 1.2.1 스크립트 실행
```bash
cd terraform
chmod +x deploy-environments.sh
./deploy-environments.sh
```

#### 1.2.2 환경 선택 메뉴
```
🎯 배포할 환경을 선택하세요:
1. Development 환경 (dev)
2. Production 환경 (prod)
3. 모든 환경 (all)

선택 (1/2/3):
```

#### 1.2.3 배포 과정
1. **사전 요구사항 확인**
   - AWS CLI 설치 확인
   - AWS 자격증명 확인
   - Terraform 설치 확인

2. **비용 안내**
   ```
   ⚠️ 주의사항:
   - NAT Gateway: 환경당 시간당 약 $0.045
   - ALB: 환경당 시간당 약 $0.0225
   ```

3. **Terraform 실행**
   - `terraform init`
   - `terraform plan`
   - `terraform apply` (환경별 리소스 생성)

### 1.3 설치되는 AWS 리소스 목록

#### 1.3.1 네트워킹 리소스
| 리소스 | 설명 | 환경별 분리 |
|--------|------|-------------|
| VPC | 가상 프라이빗 클라우드 | ✅ dev/prod |
| Internet Gateway | 인터넷 연결 | ✅ dev/prod |
| NAT Gateway | 프라이빗 서브넷 인터넷 연결 | ✅ dev/prod |
| Public Subnets | 퍼블릭 서브넷 (2개 AZ) | ✅ dev/prod |
| Private Subnets | 프라이빗 서브넷 (2개 AZ) | ✅ dev/prod |
| Route Tables | 라우팅 테이블 | ✅ dev/prod |
| Security Groups | 보안 그룹 | ✅ dev/prod |

#### 1.3.2 컴퓨팅 리소스
| 리소스 | 설명 | 환경별 분리 |
|--------|------|-------------|
| ECS Cluster | 컨테이너 클러스터 | ✅ dev/prod |
| ECS Task Definition | 태스크 정의 | ✅ dev/prod |
| ECS Service | 서비스 | ✅ dev/prod |
| Application Load Balancer | 로드 밸런서 | ✅ dev/prod |
| Target Group | 타겟 그룹 | ✅ dev/prod |

#### 1.3.3 공유 리소스
| 리소스 | 설명 | 공유 여부 |
|--------|------|-----------|
| ECR Repository | 컨테이너 이미지 저장소 | ✅ 공유 |
| IAM Roles | 실행/태스크 역할 | ✅ 공유 |
| S3 Bucket | Terraform 상태 저장 | ✅ 공유 |
| DynamoDB Table | Terraform 상태 락 | ✅ 공유 |

#### 1.3.4 모니터링 및 보안
| 리소스 | 설명 | 환경별 분리 |
|--------|------|-------------|
| CloudWatch Log Groups | 로그 그룹 | ✅ dev/prod |
| Auto Scaling Policies | 자동 스케일링 정책 | ✅ dev/prod |
| Secrets Manager | 환경 변수 저장 | ✅ dev/prod |

### 1.4 AWS 콘솔에서 확인하는 방법

#### 1.4.1 VPC 확인
1. **AWS 콘솔 접속**: https://console.aws.amazon.com
2. **VPC 서비스 이동**: Services → VPC
3. **VPC 목록 확인**:
   - `nest-wallet-dev-vpc` (10.0.0.0/16)
   - `nest-wallet-prod-vpc` (10.1.0.0/16)

#### 1.4.2 ECS 확인
1. **ECS 서비스 이동**: Services → ECS
2. **클러스터 확인**:
   - `nest-wallet-dev-cluster`
   - `nest-wallet-prod-cluster`
3. **서비스 확인**:
   - `nest-wallet-dev-service`
   - `nest-wallet-prod-service`
4. **태스크 정의 확인**:
   - `nest-wallet-task-dev`
   - `nest-wallet-task`

#### 1.4.3 ALB 확인
1. **EC2 서비스 이동**: Services → EC2 → Load Balancers
2. **로드 밸런서 확인**:
   - `nest-wallet-dev-alb`
   - `nest-wallet-prod-alb`
3. **DNS 이름 복사**: 브라우저 접속용

#### 1.4.4 ECR 확인
1. **ECR 서비스 이동**: Services → ECR
2. **리포지토리 확인**: `nest-wallet-repo`

### 1.5 Terraform 디렉토리 구성 및 내용

```
terraform/
├── main.tf                 # 메인 Terraform 설정
├── variables.tf            # 변수 정의
├── outputs.tf              # 출력 값 정의
├── secrets.tf              # Secrets Manager 설정
├── iam.tf                  # IAM 역할 및 정책
├── deploy-environments.sh  # 배포 스크립트
└── README.md               # 문서
```

#### 1.5.1 main.tf 주요 내용
```hcl
# 환경별 VPC 생성
resource "aws_vpc" "environments" {
  for_each = var.environments
  
  cidr_block           = each.value.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
}

# 환경별 ECS 클러스터
resource "aws_ecs_cluster" "environments" {
  for_each = var.environments
  
  name = "${var.project_name}-${each.key}-cluster"
}

# 환경별 ECS 태스크 정의
resource "aws_ecs_task_definition" "environments" {
  for_each = var.environments
  
  family = each.key == "dev" ? "${var.project_name}-task-dev" : "${var.project_name}-task"
  # ... 기타 설정
}
```

#### 1.5.2 variables.tf 주요 내용
```hcl
# 환경별 네트워크 설정
variable "environments" {
  default = {
    dev = {
      vpc_cidr         = "10.0.0.0/16"
      public_subnets   = ["10.0.1.0/24", "10.0.2.0/24"]
      private_subnets  = ["10.0.11.0/24", "10.0.12.0/24"]
    }
    prod = {
      vpc_cidr         = "10.1.0.0/16"
      public_subnets   = ["10.1.1.0/24", "10.1.2.0/24"]
      private_subnets  = ["10.1.11.0/24", "10.1.12.0/24"]
    }
  }
}

# 환경별 환경 변수
variable "dev_environment_vars" {
  default = {
    NODE_ENV = "development"
    PORT     = "3001"
    # ... 기타 설정
  }
}
```

---

## Part 2. Nest-wallet GitHub Action을 통해 롤링배포하기

### 2.1 배포하기 전에 해야 할 것

#### 2.1.1 GitHub Repository 설정
1. **Repository 접속**: https://github.com/[username]/nest-wallet
2. **Settings 탭 이동**: Settings → Secrets and variables → Actions

#### 2.1.2 GitHub Secrets 설정
다음 시크릿들을 추가해야 합니다:

| Secret 이름 | 설명 | 값 |
|-------------|------|-----|
| `AWS_ACCESS_KEY_ID` | AWS 액세스 키 ID | Terraform으로 생성된 IAM 사용자의 액세스 키 |
| `AWS_SECRET_ACCESS_KEY` | AWS 시크릿 액세스 키 | Terraform으로 생성된 IAM 사용자의 시크릿 키 |

#### 2.1.3 IAM 사용자 생성 및 권한 설정
```bash
# AWS CLI로 IAM 사용자 생성
aws iam create-user --user-name nest-wallet-github-actions

# 액세스 키 생성
aws iam create-access-key --user-name nest-wallet-github-actions

# 정책 연결 (terraform/iam.tf에서 자동 생성됨)
aws iam attach-user-policy \
  --user-name nest-wallet-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

aws iam attach-user-policy \
  --user-name nest-wallet-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS-FullAccess
```

### 2.2 관련 IAM 권한 요약

#### 2.2.1 GitHub Actions 사용자 권한
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService"
      ],
      "Resource": "*"
    }
  ]
}
```

#### 2.2.2 ECS 실행 역할 권한
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

### 2.3 AWS Dev, Prod 별 속성(환경변수) 설정하는 메뉴얼

#### 2.3.1 Secrets Manager 설정 확인
```bash
# 개발 환경 시크릿 확인
aws secretsmanager describe-secret --secret-id nest-wallet-dev-secrets

# 프로덕션 환경 시크릿 확인
aws secretsmanager describe-secret --secret-id nest-wallet-prod-secrets
```

#### 2.3.2 환경별 환경변수 설정
**개발 환경** (`nest-wallet-dev-secrets`):
```json
{
  "GAS_COUPON_API_URL": "https://dev-api.blockbit.com"
}
```

**프로덕션 환경** (`nest-wallet-prod-secrets`):
```json
{
  "GAS_COUPON_API_URL": "https://api.blockbit.com"
}
```

#### 2.3.3 ECS 태스크 정의 환경변수
**개발 환경**:
```hcl
environment = [
  {
    name  = "NODE_ENV"
    value = "development"
  },
  {
    name  = "PORT"
    value = "3001"
  },
  {
    name  = "NEXT_PUBLIC_DEBUG"
    value = "true"
  }
]
```

**프로덕션 환경**:
```hcl
environment = [
  {
    name  = "NODE_ENV"
    value = "production"
  },
  {
    name  = "PORT"
    value = "3000"
  },
  {
    name  = "NEXT_PUBLIC_DEBUG"
    value = "false"
  }
]
```

### 2.4 롤링배포하기 및 배포되는 거 GitHub Actions에서 확인하기

#### 2.4.1 개발 환경 배포
```bash
# develop 브랜치로 전환
git checkout develop

# 코드 수정 후 커밋
git add .
git commit -m "feat: development update"

# develop 브랜치 푸시 (자동 배포 트리거)
git push origin develop
```

#### 2.4.2 프로덕션 환경 배포
```bash
# main 브랜치로 전환
git checkout main

# develop 브랜치 머지
git merge develop

# main 브랜치 푸시 (자동 배포 트리거)
git push origin main
```

#### 2.4.3 GitHub Actions에서 배포 확인
1. **GitHub Repository 접속**: https://github.com/[username]/nest-wallet
2. **Actions 탭 이동**: Actions
3. **워크플로우 확인**:
   - `ECS Development Deployment` (develop 브랜치)
   - `ECS Production Deployment` (main 브랜치)

#### 2.4.4 배포 과정 상세 확인
```
1. lint - 코드 린팅
2. deploy - 배포 실행
   ├── Configure AWS credentials
   ├── Login to Amazon ECR
   ├── Build, tag, and push image
   ├── Download current task definition
   ├── Update task definition
   ├── Register new task definition
   ├── Deploy to ECS
   ├── Wait for deployment to complete
   ├── Get service status
   └── Get ALB DNS name
```

### 2.5 최종 배포된것 브라우저에서 확인하기

#### 2.5.1 ALB DNS 주소 확인
```bash
# 개발 환경 ALB DNS 확인
aws elbv2 describe-load-balancers \
  --names nest-wallet-dev-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text

# 프로덕션 환경 ALB DNS 확인
aws elbv2 describe-load-balancers \
  --names nest-wallet-prod-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

#### 2.5.2 브라우저에서 접속 확인
**개발 환경**:
```
http://[dev-alb-dns-name]
예: http://nest-wallet-dev-alb-123456789.ap-northeast-2.elb.amazonaws.com
```

**프로덕션 환경**:
```
http://[prod-alb-dns-name]
예: http://nest-wallet-prod-alb-123456789.ap-northeast-2.elb.amazonaws.com
```

#### 2.5.3 헬스체크 엔드포인트 확인
```
# 개발 환경
http://[dev-alb-dns-name]/api/health

# 프로덕션 환경
http://[prod-alb-dns-name]/api/health
```

#### 2.5.4 배포 상태 모니터링
```bash
# ECS 서비스 상태 확인
aws ecs describe-services \
  --cluster nest-wallet-dev-cluster \
  --services nest-wallet-dev-service

aws ecs describe-services \
  --cluster nest-wallet-prod-cluster \
  --services nest-wallet-prod-service

# 태스크 상태 확인
aws ecs list-tasks \
  --cluster nest-wallet-dev-cluster \
  --service-name nest-wallet-dev-service

aws ecs list-tasks \
  --cluster nest-wallet-prod-cluster \
  --service-name nest-wallet-prod-service
```

### 2.6 문제 해결 및 디버깅

#### 2.6.1 배포 실패 시 확인사항
1. **GitHub Secrets 확인**: AWS 자격증명이 올바른지 확인
2. **IAM 권한 확인**: ECR 및 ECS 권한이 충분한지 확인
3. **ECS 서비스 로그 확인**: CloudWatch Logs에서 애플리케이션 로그 확인
4. **ALB 헬스체크 확인**: 타겟 그룹의 헬스체크 상태 확인

#### 2.6.2 로그 확인 방법
```bash
# CloudWatch 로그 그룹 확인
aws logs describe-log-groups --log-group-name-prefix "/ecs/nest-wallet"

# 최근 로그 확인
aws logs tail /ecs/nest-wallet-dev --follow
aws logs tail /ecs/nest-wallet-prod --follow
```

---

## 📚 추가 참고 자료

- [AWS ECS 공식 문서](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider 문서](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
- [Docker 컨테이너 배포 가이드](https://docs.docker.com/get-started/)

---

## 🎯 요약

이 가이드를 통해 다음과 같은 완전한 CI/CD 파이프라인을 구축할 수 있습니다:

1. **Terraform으로 AWS 인프라 자동화**
2. **환경별 분리된 VPC 및 ECS 클러스터**
3. **GitHub Actions를 통한 자동 롤링 배포**
4. **Secrets Manager를 통한 환경변수 관리**
5. **ALB를 통한 로드 밸런싱 및 헬스체크**

모든 과정이 자동화되어 있어 개발자는 코드만 푸시하면 자동으로 배포됩니다! 🚀 