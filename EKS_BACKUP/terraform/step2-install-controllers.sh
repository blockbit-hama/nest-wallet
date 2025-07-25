#!/bin/bash

echo "=== 2단계: 컨트롤러 설치 (ALB Controller, ArgoCD) ==="

set -e  # 에러시 중단

REGION="ap-northeast-2"
PROJECT_NAME="nest-wallet"
CLUSTER_NAME="${PROJECT_NAME}-cluster"

echo "🎯 설치할 컨트롤러:"
echo "- EKS 애드온 (VPC-CNI, CoreDNS, kube-proxy)"
echo "- AWS Load Balancer Controller (ALB 관리)"
echo "- ArgoCD (GitOps 배포)"

echo -e "\n📋 사전 조건 확인:"

# 1단계 완료 확인
if [ ! -f "step1-outputs.txt" ]; then
    echo "❌ step1-outputs.txt 파일이 없습니다."
    echo "먼저 1단계를 완료하세요: ./step1-install-infrastructure.sh"
    exit 1
fi

echo "✅ 1단계 완료됨"

# kubectl 연결 확인
if ! kubectl get nodes &> /dev/null; then
    echo "❌ kubectl이 EKS 클러스터에 연결되지 않았습니다."
    echo "kubectl 설정을 다시 실행하세요:"
    echo "  aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME"
    exit 1
fi

echo "✅ kubectl 연결 확인됨"

# Helm 설치 확인
if ! command -v helm &> /dev/null; then
    echo "❌ Helm이 설치되지 않았습니다."
    echo "설치 방법:"
    echo "  macOS: brew install helm"
    echo "  Linux: https://helm.sh/docs/intro/install/"
    exit 1
fi

echo "✅ Helm 설치 확인됨"

# 노드 상태 확인
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
if [ "$NODE_COUNT" -lt 2 ]; then
    echo "❌ EKS 노드가 충분하지 않습니다. (현재: $NODE_COUNT, 필요: 2개 이상)"
    echo "노드 상태를 확인하세요:"
    kubectl get nodes
    exit 1
fi

echo "✅ EKS 노드 상태 정상 ($NODE_COUNT개)"

echo -e "\n🚀 2단계 컨트롤러 설치 시작..."

# Step 1: EKS 애드온 설치
echo -e "\n📦 1/2: EKS 애드온 설치 중..."
echo "설치 대상: VPC-CNI, CoreDNS, kube-proxy"

terraform apply \
  -target=aws_eks_addon.vpc_cni \
  -target=aws_eks_addon.coredns \
  -target=aws_eks_addon.kube_proxy \
  -auto-approve

echo "✅ EKS 애드온 설치 완료"

# 애드온 상태 확인
echo -e "\n📊 EKS 애드온 상태 확인:"
kubectl get pods -n kube-system | grep -E "(coredns|aws-node|kube-proxy)"

# Step 2: Helm repositories 추가
echo -e "\n📦 2/2: Helm repositories 추가..."
echo "필요한 Helm repositories 추가 중..."

# 필요한 Helm repositories 추가
helm repo add eks https://aws.github.io/eks-charts
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

echo "✅ Helm repositories 추가 완료"

# 컨트롤러들 전체 설치
echo -e "\n🔧 컨트롤러들 전체 설치 중... (약 8-12분 소요)"
echo "설치 대상: ALB Controller, ArgoCD"

# 전체 Terraform 적용 (의존성 순서대로 설치)
terraform apply -auto-approve

echo "✅ 모든 컨트롤러 설치 완료 (ALB Controller, ArgoCD)"

# ALB Controller 상태 확인
echo -e "\n📊 ALB Controller 상태 확인:"
echo "Pod 상태:"
kubectl get pods -n kube-system | grep aws-load-balancer-controller

echo -e "\nDeployment 상태:"
kubectl get deployment -n kube-system aws-load-balancer-controller

# CRD 확인
echo -e "\nALB Controller CRD 확인:"
kubectl get crd | grep elbv2

# ServiceAccount 확인 (IRSA 연결 확인)
echo -e "\nServiceAccount 확인 (IAM 역할 연결):"
kubectl get serviceaccount -n kube-system aws-load-balancer-controller -o yaml | grep eks.amazonaws.com/role-arn

# ALB Controller 로그 확인 (문제 발생시 디버깅용)
echo -e "\nALB Controller 로그 (최근 10줄):"
kubectl logs -n kube-system deployment/aws-load-balancer-controller --tail=10

# ArgoCD 상태 확인
echo -e "\n📊 ArgoCD 상태 확인:"
echo "Pod 상태:"
kubectl get pods -n argocd

echo -e "\nArgoCD Applications:"
kubectl get applications -n argocd

echo -e "\nArgoCD 서버 접속 주소 (몇 분 후 생성됨):"
ALB_ARGOCD=$(kubectl get ingress -n argocd argocd-server -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "생성 중...")
echo "ArgoCD URL: http://$ALB_ARGOCD"
echo "ArgoCD 초기 비밀번호: admin123 (운영환경에서 변경 필수!)"

# 상태 확인을 위한 잠시 대기
echo -e "\n⏳ 컨트롤러들이 시작될 때까지 30초 대기..."
sleep 30

echo -e "\n✅ 2단계 완료!"

# 출력 정보 저장
cat >> step1-outputs.txt << EOF

=== 2단계 완료 정보 ===
날짜: $(date)
ALB Controller: 설치 완료
ArgoCD: 설치 완료
EKS 애드온: VPC-CNI, CoreDNS, kube-proxy 설치 완료

ALB Controller 확인 명령어:
kubectl get pods -n kube-system | grep aws-load-balancer-controller
kubectl logs -n kube-system deployment/aws-load-balancer-controller

ArgoCD 확인 명령어:
kubectl get pods -n argocd
kubectl get applications -n argocd

다음 단계:
./step3-setup-cicd.sh
EOF

echo -e "\n📊 현재 인프라 상태:"
echo "1. EKS 클러스터: ✅ 실행중"
echo "2. EKS 노드그룹: ✅ $NODE_COUNT개 노드 활성"
echo "3. EKS 애드온: ✅ 설치 완료"
echo "4. ALB Controller: ✅ 설치 완료"
echo "5. ArgoCD: ✅ 설치 완료"
echo "6. ECR 리포지토리: ✅ 준비됨"

echo -e "\n🎉 2단계 컨트롤러 설치 완료!"
echo "이제 GitOps CI/CD를 설정할 준비가 되었습니다."
echo ""
echo "다음 단계를 실행하세요:"
echo "  ./step3-setup-cicd.sh"
