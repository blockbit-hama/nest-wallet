#!/bin/bash

echo "=== EKS 클러스터만 재배포 스크립트 ==="

set -e

REGION="ap-northeast-2"
PROJECT_NAME="nest-wallet"
CLUSTER_NAME="${PROJECT_NAME}-dev"

echo "🎯 재배포 대상:"
echo "- EKS 클러스터"
echo "- EKS 노드그룹"
echo "- EKS 애드온 (VPC-CNI, CoreDNS, kube-proxy)"
echo "- ALB Controller"
echo "- OIDC Identity Provider"
echo ""
echo "🔒 유지되는 리소스:"
echo "- VPC 및 네트워킹 (서브넷, 라우팅, NAT 게이트웨이)"
echo "- ECR 리포지토리"
echo "- 보안그룹"
echo "- IAM 역할들"

echo -e "\n⚠️  주의사항:"
echo "- 기존 EKS 클러스터가 삭제됩니다"
echo "- 클러스터 내 모든 애플리케이션이 삭제됩니다"
echo "- kubectl 설정을 다시 해야 합니다"

read -p "계속 진행하시겠습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 재배포가 취소되었습니다."
    exit 1
fi

echo -e "\n🚀 EKS 클러스터 재배포 시작..."

# DEV 환경으로 이동
cd environments/dev

# 1단계: EKS 관련 리소스만 삭제
echo -e "\n🗑️  1/3: 기존 EKS 클러스터 삭제..."
echo "삭제 대상: ALB Controller, EKS 노드그룹, 클러스터, OIDC"

terraform destroy \
  -target=helm_release.aws_load_balancer_controller \
  -target=module.eks.aws_eks_node_group.main \
  -target=module.eks.aws_eks_cluster.main \
  -target=module.eks.aws_iam_openid_connect_provider.cluster \
  -auto-approve

echo "✅ 기존 EKS 클러스터 삭제 완료"

# 2단계: EKS 클러스터 다시 생성
echo -e "\n🏗️  2/3: EKS 클러스터 재생성..."
echo "생성 대상: 클러스터, OIDC, 노드그룹"

terraform apply \
  -target=module.eks.aws_eks_cluster.main \
  -target=module.eks.aws_iam_openid_connect_provider.cluster \
  -target=module.eks.aws_eks_node_group.main \
  -auto-approve

echo "✅ EKS 클러스터 재생성 완료"

# kubectl 설정
echo -e "\n🔧 kubectl 설정 업데이트..."
aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME

# 클러스터 준비 대기
echo -e "\n⏳ 클러스터 준비 대기... (약 2-3분)"
for i in {1..30}; do
    if kubectl get nodes &> /dev/null; then
        echo "✅ 클러스터 준비 완료"
        break
    fi
    echo "대기 중... ($i/30)"
    sleep 10
done

# 노드 상태 확인
echo -e "\n📊 노드 상태 확인:"
kubectl get nodes -o wide

# 3단계: ALB Controller 설치
echo -e "\n⎈ 3/3: ALB Controller 설치..."

# Helm repo 업데이트
helm repo add aws https://aws.github.io/eks-charts 2>/dev/null || true
helm repo update

terraform apply \
  -target=helm_release.aws_load_balancer_controller \
  -auto-approve

echo "✅ ALB Controller 설치 완료"

# ALB Controller 상태 확인
echo -e "\n📊 ALB Controller 상태 확인:"
kubectl get pods -n kube-system | grep aws-load-balancer-controller

echo -e "\n🎉 EKS 클러스터 재배포 완료!"

echo -e "\n📊 최종 상태:"
echo "1. ✅ EKS 클러스터: 재생성 완료"
echo "2. ✅ EKS 노드그룹: 재생성 완료"
echo "3. ✅ ALB Controller: 설치 완료"
echo "4. ✅ OIDC Provider: 재생성 완료"

echo -e "\n🔧 다음 단계:"
echo "- 기존 애플리케이션을 다시 배포해야 합니다"
echo "- Helm으로 nest-wallet 재배포:"
echo "  helm upgrade --install nest-wallet ../../helm-charts/nest-wallet --set image.repository=ECR_URI --set image.tag=latest"

echo -e "\n📄 상태 확인:"
echo "- kubectl get nodes"
echo "- kubectl get pods -n kube-system"
echo "- kubectl get all --all-namespaces"
