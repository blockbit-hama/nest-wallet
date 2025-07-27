#!/bin/bash

echo "=== 환경별 배포 스크립트 ==="

set -e  # 에러시 중단

REGION="ap-northeast-2"
PROJECT_NAME="nest-wallet"

echo "🎯 배포할 환경을 선택하세요:"
echo "1. Development 환경 (dev)"
echo "2. Production 환경 (prod)"
echo "3. 모든 환경 (all)"

read -p "선택 (1/2/3): " -n 1 -r
echo

case $REPLY in
  1)
    ENVIRONMENTS=("dev")
    echo "✅ Development 환경 배포를 시작합니다."
    ;;
  2)
    ENVIRONMENTS=("prod")
    echo "✅ Production 환경 배포를 시작합니다."
    ;;
  3)
    ENVIRONMENTS=("dev" "prod")
    echo "✅ 모든 환경 배포를 시작합니다."
    ;;
  *)
    echo "❌ 잘못된 선택입니다. 1, 2, 또는 3을 입력하세요."
    exit 1
    ;;
esac

echo -e "\n📋 사전 요구사항 확인:"

# AWS CLI 설치 확인
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI가 설치되지 않았습니다."
    echo "설치 방법: https://aws.amazon.com/cli/"
    exit 1
fi

# AWS 자격증명 확인
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS 자격증명이 설정되지 않았습니다."
    echo "설정 방법: aws configure"
    exit 1
fi

echo "✅ AWS CLI 및 자격증명 확인됨"

# Terraform 설치 확인
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform이 설치되지 않았습니다."
    echo "설치 방법: https://terraform.io/downloads"
    exit 1
fi

echo "✅ Terraform 설치 확인됨"

echo -e "\n📊 현재 AWS 계정 정보:"
aws sts get-caller-identity --output table

echo -e "\n⚠️  주의사항:"
echo "- 선택한 환경: ${ENVIRONMENTS[@]}"
echo "- VPC: 환경당 시간당 약 \$0.01"
echo "- NAT Gateway: 환경당 시간당 약 \$0.045"
echo "- ALB: 환경당 시간당 약 \$0.0225"
echo "- ECS Fargate: vCPU당 시간당 약 \$0.04048, 메모리당 시간당 약 \$0.004445"

read -p "계속 진행하시겠습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 배포가 취소되었습니다."
    exit 1
fi

echo -e "\n🚀 환경별 배포 시작..."

# Terraform 초기화
echo "📦 Terraform 초기화 중..."
terraform init

# Terraform 플랜 확인
echo "📋 Terraform 실행 계획 생성 중..."
terraform plan -out=environments.tfplan

echo -e "\n📋 Terraform 플랜이 생성되었습니다."
echo "주요 생성될 리소스:"

for env in "${ENVIRONMENTS[@]}"; do
    echo "=== $env 환경 ==="
    echo "- aws_vpc.environments[\"$env\"]"
    echo "- aws_lb.environments[\"$env\"]"
    echo "- aws_ecs_cluster.environments[\"$env\"]"
    echo "- aws_ecs_service.environments[\"$env\"]"
    echo ""
done

echo "=== 공유 리소스 ==="
echo "- aws_ecr_repository.main"
echo "- aws_iam_role.ecs_execution_role"
echo "- aws_iam_role.ecs_task_role"
echo "- aws_s3_bucket.terraform_state"
echo "- aws_dynamodb_table.terraform_locks"

read -p "Terraform을 실행하시겠습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Terraform 실행이 취소되었습니다."
    exit 1
fi

# 배포 실행
echo -e "\n🏗️ 리소스 배포 중... (약 15-20분 소요)"

terraform apply -auto-approve

echo "✅ 배포 완료!"

# 배포 결과 확인
echo -e "\n📊 배포 결과 확인:"

for env in "${ENVIRONMENTS[@]}"; do
    echo -e "\n=== $env 환경 상태 ==="
    
    # VPC 확인
    VPC_ID=$(terraform output -json vpc_ids | jq -r ".$env")
    echo "VPC ID: $VPC_ID"
    
    # ALB DNS 확인
    ALB_DNS=$(terraform output -json alb_dns_names | jq -r ".$env")
    echo "ALB DNS: $ALB_DNS"
    
    # ECS 클러스터 확인
    CLUSTER_NAME=$(terraform output -json ecs_cluster_names | jq -r ".$env")
    echo "ECS Cluster: $CLUSTER_NAME"
    
    # ECS 서비스 확인
    SERVICE_NAME=$(terraform output -json ecs_service_names | jq -r ".$env")
    echo "ECS Service: $SERVICE_NAME"
    
    # 서비스 상태 확인
    echo "서비스 상태:"
    aws ecs describe-services \
      --cluster $CLUSTER_NAME \
      --services $SERVICE_NAME \
      --query 'services[0].{Status:status,DesiredCount:desiredCount,RunningCount:runningCount,PendingCount:pendingCount}' \
      --output table
done

# ECR 정보 출력
echo -e "\n📦 ECR 리포지토리 정보:"
ECR_URI=$(terraform output -raw ecr_repository_url)
echo "ECR URI: $ECR_URI"

# 공유 리소스 정보
echo -e "\n🔧 공유 리소스 정보:"
SHARED_RESOURCES=$(terraform output -json shared_resources)
echo "Terraform State Bucket: $(echo $SHARED_RESOURCES | jq -r '.terraform_state_bucket')"
echo "Terraform Locks Table: $(echo $SHARED_RESOURCES | jq -r '.terraform_locks_table')"
echo "GitHub Actions User: $(echo $SHARED_RESOURCES | jq -r '.github_actions_user')"

# 출력 정보 저장
cat > environments-deployment-outputs.txt << EOF
=== 환경별 배포 완료 정보 ===
날짜: $(date)
리전: $REGION
배포된 환경: ${ENVIRONMENTS[@]}

환경별 정보:
$(for env in "${ENVIRONMENTS[@]}"; do
    echo "$env:"
    echo "  VPC: $(terraform output -json vpc_ids | jq -r ".$env")"
    echo "  ALB: $(terraform output -json alb_dns_names | jq -r ".$env")"
    echo "  ECS Cluster: $(terraform output -json ecs_cluster_names | jq -r ".$env")"
    echo "  ECS Service: $(terraform output -json ecs_service_names | jq -r ".$env")"
done)

ECR URI: $ECR_URI

GitHub Actions 설정:
- Production: main 브랜치 → nest-wallet-prod-cluster (nest-wallet-task)
- Development: develop 브랜치 → nest-wallet-dev-cluster (nest-wallet-task-dev)

확인 명령어:
$(for env in "${ENVIRONMENTS[@]}"; do
    CLUSTER=$(terraform output -json ecs_cluster_names | jq -r ".$env")
    SERVICE=$(terraform output -json ecs_service_names | jq -r ".$env")
    echo "aws ecs describe-services --cluster $CLUSTER --services $SERVICE"
done)
EOF

echo -e "\n📄 배포 정보가 environments-deployment-outputs.txt에 저장되었습니다."

echo -e "\n🎉 환경별 배포 완료!"
echo ""
echo "🌐 접속 정보:"
for env in "${ENVIRONMENTS[@]}"; do
    ALB_DNS=$(terraform output -json alb_dns_names | jq -r ".$env")
    echo "$env 환경: http://$ALB_DNS"
done

# IAM 사용자 보존 안내
echo -e "\n🔑 GitHub Actions IAM 사용자 정보:"
echo "✅ IAM 사용자 'github-actions-nest-wallet'가 보존됩니다"
echo "✅ 기존 액세스 키가 유지됩니다 (prevent_destroy 설정)"
echo ""
echo "🔧 액세스 키가 없다면 수동으로 생성하세요:"
echo "aws iam create-access-key --user-name github-actions-nest-wallet"
echo ""
echo "📋 GitHub Secrets 확인:"
echo "GitHub Repository → Settings → Secrets and variables → Actions"
echo "- AWS_ACCESS_KEY_ID"
echo "- AWS_SECRET_ACCESS_KEY"

echo -e "\n📝 다음 단계:"
echo "1. GitHub Actions 워크플로우가 환경별로 설정되었습니다"
echo "2. main 브랜치 푸시 → Production 환경 배포"
echo "3. develop 브랜치 푸시 → Development 환경 배포"
echo ""
echo "🔧 모니터링:"
echo "aws ecs list-clusters"
echo "aws ecs list-services --cluster nest-wallet-dev-cluster"
echo "aws ecs list-services --cluster nest-wallet-prod-cluster" 