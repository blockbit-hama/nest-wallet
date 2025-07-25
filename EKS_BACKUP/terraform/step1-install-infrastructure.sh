#!/bin/bash

echo "=== 1단계: 기본 인프라 설치 (VPC, EKS, ECR) ==="

set -e  # 에러시 중단

REGION="ap-northeast-2"
PROJECT_NAME="nest-wallet"
CLUSTER_NAME="${PROJECT_NAME}-cluster"

echo "🎯 설치할 리소스:"
echo "- VPC 및 네트워킹 (서브넷, 라우팅 테이블, NAT 게이트웨이)"
echo "- EKS 클러스터"
echo "- EKS 노드그룹 (시스템용)"
echo "- ECR 리포지토리"
echo "- IAM 역할들 (클러스터, 노드, ALB Controller용)"
echo "- 보안그룹들"

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

# kubectl 설치 확인
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl이 설치되지 않았습니다."
    echo "설치 방법:"
    echo "  macOS: brew install kubectl"
    echo "  Linux: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/"
    exit 1
fi

echo "✅ kubectl 설치 확인됨"

echo -e "\n📊 현재 AWS 계정 정보:"
aws sts get-caller-identity

echo -e "\n⚠️  주의사항:"
echo "- 이 스크립트는 AWS 리소스를 생성하며 비용이 발생할 수 있습니다"
echo "- EKS 클러스터: 시간당 약 $0.10"
echo "- EC2 인스턴스 (t4g.medium x2): 시간당 약 $0.08"
echo "- NAT 게이트웨이: 시간당 약 $0.045"

read -p "계속 진행하시겠습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 설치가 취소되었습니다."
    exit 1
fi

echo -e "\n🚀 1단계 인프라 설치 시작..."

# Terraform 초기화
echo "📦 Terraform 초기화 중..."
terraform init

# Terraform 플랜 확인
echo "📋 Terraform 실행 계획 생성 중..."
terraform plan -out=step1.tfplan

echo -e "\n📋 Terraform 플랜이 생성되었습니다."
echo "주요 생성될 리소스:"
echo "- aws_vpc.main"
echo "- aws_eks_cluster.main"
echo "- aws_eks_node_group.system"
echo "- aws_ecr_repository.nest_wallet"
echo "- aws_iam_role 등"

read -p "Terraform을 실행하시겠습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Terraform 실행이 취소되었습니다."
    exit 1
fi

# 기본 인프라만 배포 (Helm 릴리스 제외)
echo "🏗️  기본 인프라 배포 중... (약 15-20분 소요)"
terraform apply \
  -target=aws_vpc.main \
  -target=aws_internet_gateway.main \
  -target=aws_eip.nat \
  -target=aws_nat_gateway.main \
  -target=aws_subnet.public \
  -target=aws_subnet.private \
  -target=aws_subnet.database \
  -target=aws_route_table.public \
  -target=aws_route_table.private \
  -target=aws_route_table.database \
  -target=aws_route_table_association.public \
  -target=aws_route_table_association.private \
  -target=aws_route_table_association.database \
  -target=aws_route.public_internet_gateway \
  -target=aws_route.private_nat_gateway \
  -target=aws_security_group.cluster \
  -target=aws_security_group.node_group \
  -target=aws_security_group.additional \
  -target=aws_iam_role.cluster \
  -target=aws_iam_role.node_group \
  -target=aws_iam_role.alb_controller \
  -target=aws_iam_role_policy_attachment.cluster_policy \
  -target=aws_iam_role_policy_attachment.node_policy \
  -target=aws_iam_role_policy_attachment.node_cni_policy \
  -target=aws_iam_role_policy_attachment.node_registry_policy \
  -target=aws_iam_role_policy_attachment.alb_controller_admin \
  -target=aws_iam_instance_profile.node_group \
  -target=aws_iam_openid_connect_provider.cluster \
  -target=aws_eks_cluster.main \
  -target=aws_eks_node_group.system \
  -target=aws_eks_addon.vpc_cni \
  -target=aws_eks_addon.coredns \
  -target=aws_eks_addon.kube_proxy \
  -target=aws_eks_addon.ebs_csi_driver \
  -target=aws_ecr_repository.nest_wallet \
  -auto-approve

echo -e "\n✅ 1단계 완료!"

# kubectl 설정
echo -e "\n🔧 kubectl 설정 중..."
aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME

# 클러스터 상태 확인
echo -e "\n📊 EKS 클러스터 상태 확인:"
echo "클러스터 정보:"
kubectl cluster-info

echo -e "\n노드 상태:"
kubectl get nodes -o wide

echo -e "\n시스템 파드 상태:"
kubectl get pods -n kube-system

# ECR 정보 출력
echo -e "\n📦 ECR 리포지토리 정보:"
ECR_URI=$(aws ecr describe-repositories --repository-names $PROJECT_NAME --region $REGION --query 'repositories[0].repositoryUri' --output text)
echo "ECR URI: $ECR_URI"

# 출력 정보 저장
cat > step1-outputs.txt << EOF
=== 1단계 완료 정보 ===
날짜: $(date)
리전: $REGION
클러스터 이름: $CLUSTER_NAME
ECR URI: $ECR_URI

kubectl 설정 명령어:
aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME

다음 단계:
./step2-install-controllers.sh
EOF

echo -e "\n📄 설치 정보가 step1-outputs.txt에 저장되었습니다."

echo -e "\n🎉 1단계 인프라 설치 완료!"
echo "다음 단계를 실행하세요:"
echo "  ./step2-install-controllers.sh"
