#!/bin/bash

echo "=== Nest Wallet EKS 배포 상태 확인 ==="

REGION="ap-northeast-2"
PROJECT_NAME="nest-wallet"
CLUSTER_NAME="${PROJECT_NAME}-cluster"

echo "🔍 전체 인프라 상태를 확인합니다..."

# AWS 연결 확인
echo -e "\n📡 AWS 연결 상태:"
if aws sts get-caller-identity &> /dev/null; then
    echo "✅ AWS CLI 연결됨"
    aws sts get-caller-identity --query '[Account,Arn]' --output table
else
    echo "❌ AWS CLI 연결 실패"
    exit 1
fi

# EKS 클러스터 확인
echo -e "\n🎯 EKS 클러스터 상태:"
if aws eks describe-cluster --name $CLUSTER_NAME --region $REGION &> /dev/null; then
    CLUSTER_STATUS=$(aws eks describe-cluster --name $CLUSTER_NAME --region $REGION --query 'cluster.status' --output text)
    echo "✅ EKS 클러스터: $CLUSTER_STATUS"
    
    # kubectl 연결 테스트
    if kubectl get nodes &> /dev/null; then
        echo "✅ kubectl 연결됨"
        echo -e "\n📊 노드 상태:"
        kubectl get nodes -o wide
    else
        echo "⚠️  kubectl 연결 안됨. 다음 명령어로 설정하세요:"
        echo "aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME"


# ECR 리포지토리 확인
echo -e "\n📦 ECR 리포지토리 상태:"
if aws ecr describe-repositories --repository-names $PROJECT_NAME --region $REGION &> /dev/null; then
    ECR_URI=$(aws ecr describe-repositories --repository-names $PROJECT_NAME --region $REGION --query 'repositories[0].repositoryUri' --output text)
    echo "✅ ECR 리포지토리: $ECR_URI"
    
    # ECR 이미지 확인
    IMAGE_COUNT=$(aws ecr list-images --repository-name $PROJECT_NAME --region $REGION --query 'length(imageIds)' --output text)
    echo "📊 저장된 이미지: $IMAGE_COUNT개"
else
    echo "❌ ECR 리포지토리 없음"
fi

# Kubernetes 리소스 상태 확인 (kubectl 연결시만)
if kubectl get nodes &> /dev/null; then
    echo -e "\n⎈ Kubernetes 리소스 상태:"
    
    # 시스템 파드
    echo "🔧 시스템 파드 (kube-system):"
    kubectl get pods -n kube-system --no-headers | awk '{print "  " $1 " - " $3}'
    
    # ALB Controller 확인
    if kubectl get deployment -n kube-system aws-load-balancer-controller &> /dev/null; then
        ALB_STATUS=$(kubectl get deployment -n kube-system aws-load-balancer-controller -o jsonpath='{.status.readyReplicas}/{.status.replicas}')
        echo "✅ ALB Controller: $ALB_STATUS 준비됨"
    else
        echo "❌ ALB Controller 없음"
    fi
    
    # Karpenter 확인
    if kubectl get deployment -n karpenter karpenter &> /dev/null; then
        KARPENTER_STATUS=$(kubectl get deployment -n karpenter karpenter -o jsonpath='{.status.readyReplicas}/{.status.replicas}')
        echo "✅ Karpenter: $KARPENTER_STATUS 준비됨"
        
        # NodeClass 및 NodePool 확인
        NODECLASS_COUNT=$(kubectl get nodeclass --no-headers 2>/dev/null | wc -l || echo 0)
        NODEPOOL_COUNT=$(kubectl get nodepool --no-headers 2>/dev/null | wc -l || echo 0)
        echo "  NodeClass: ${NODECLASS_COUNT}개, NodePool: ${NODEPOOL_COUNT}개"
    else
        echo "❌ Karpenter 없음"
    fi
    
    # ArgoCD 확인
    if kubectl get deployment -n argocd argocd-server &> /dev/null; then
        ARGOCD_STATUS=$(kubectl get deployment -n argocd argocd-server -o jsonpath='{.status.readyReplicas}/{.status.replicas}')
        echo "✅ ArgoCD: $ARGOCD_STATUS 준비됨"
        
        # ArgoCD Applications 확인
        APP_COUNT=$(kubectl get applications -n argocd --no-headers 2>/dev/null | wc -l || echo 0)
        echo "  Applications: ${APP_COUNT}개"
        
        # ArgoCD 서버 URL 확인
        ARGOCD_URL=$(kubectl get ingress -n argocd argocd-server -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "생성 중...")
        echo "  URL: http://$ARGOCD_URL"
    else
        echo "❌ ArgoCD 없음"
    fi
    
    # 애플리케이션 상태
    echo -e "\n🚀 애플리케이션 상태:"
    if kubectl get deployment $PROJECT_NAME &> /dev/null; then
        APP_STATUS=$(kubectl get deployment $PROJECT_NAME -o jsonpath='{.status.readyReplicas}/{.status.replicas}')
        echo "✅ nest-wallet 앱: $APP_STATUS 준비됨"
        
        # 파드 상세 정보
        echo "📊 파드 상태:"
        kubectl get pods -l app.kubernetes.io/name=$PROJECT_NAME -o wide
        
        # 서비스 상태
        echo -e "\n🌐 서비스 상태:"
        kubectl get svc -l app.kubernetes.io/name=$PROJECT_NAME
        
        # Ingress 및 ALB 상태  
        echo -e "\n🔗 Ingress 상태:"
        if kubectl get ingress $PROJECT_NAME &> /dev/null; then
            ALB_HOSTNAME=$(kubectl get ingress $PROJECT_NAME -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "생성중...")
            echo "ALB 주소: $ALB_HOSTNAME"
            
            if [ "$ALB_HOSTNAME" != "생성중..." ] && [ -n "$ALB_HOSTNAME" ]; then
                echo -e "\n🧪 애플리케이션 접속 테스트:"
                if curl -s --connect-timeout 5 http://$ALB_HOSTNAME/api/health &> /dev/null; then
                    echo "✅ 헬스체크 성공: http://$ALB_HOSTNAME/api/health"
                else
                    echo "⚠️  헬스체크 실패 또는 타임아웃"
                fi
            fi
        else
            echo "❌ Ingress 없음"
        fi
        
    else
        echo "❌ nest-wallet 앱 배포되지 않음"
    fi
    
    # 전체 리소스 요약
    echo -e "\n📊 전체 리소스 요약:"
    echo "Nodes: $(kubectl get nodes --no-headers | wc -l)개"
    echo "Pods (전체): $(kubectl get pods --all-namespaces --no-headers | wc -l)개"
    echo "Services: $(kubectl get svc --all-namespaces --no-headers | wc -l)개"
    echo "Ingresses: $(kubectl get ingress --all-namespaces --no-headers | wc -l)개"
fi

# Terraform 상태 확인
echo -e "\n🏗️  Terraform 상태:"
if [ -f "terraform.tfstate" ]; then
    RESOURCE_COUNT=$(terraform show -json 2>/dev/null | jq '.values.root_module.resources | length' 2>/dev/null || echo "알 수 없음")
    echo "✅ Terraform state 파일 존재 ($RESOURCE_COUNT개 리소스)"
else
    echo "❌ Terraform state 파일 없음"
fi

# GitHub Actions 워크플로우 확인
echo -e "\n🔄 GitHub Actions 설정:"
if [ -f "../.github/workflows/deploy.yml" ]; then
    echo "✅ GitHub Actions 워크플로우 파일 존재"
else
    echo "❌ GitHub Actions 워크플로우 파일 없음"
fi

# 최종 요약
echo -e "\n🎯 배포 단계별 완료 상태:"
if aws eks describe-cluster --name $CLUSTER_NAME --region $REGION &> /dev/null; then
    echo "✅ 1단계: 기본 인프라 설치 완료"
else
    echo "❌ 1단계: 기본 인프라 설치 미완료"
fi

if kubectl get deployment -n kube-system aws-load-balancer-controller &> /dev/null 2>&1 && kubectl get deployment -n karpenter karpenter &> /dev/null 2>&1; then
    echo "✅ 2단계: 컴트롤러 설치 완료 (ALB Controller + Karpenter)"
else
    echo "❌ 2단계: 컴트롤러 설치 미완료"
fi

if kubectl get deployment $PROJECT_NAME &> /dev/null 2>&1; then
    echo "✅ 3단계: 애플리케이션 배포 완료"
else
    echo "❌ 3단계: 애플리케이션 배포 미완료"
fi

if kubectl get deployment -n kube-system aws-load-balancer-controller &> /dev/null 2>&1; then
    echo "✅ 2단계: 컨트롤러 설치 완료"
else
    echo "❌ 2단계: 컨트롤러 설치 미완료"
fi

if kubectl get deployment $PROJECT_NAME &> /dev/null 2>&1; then
    echo "✅ 3단계: 애플리케이션 배포 완료"
else
    echo "❌ 3단계: 애플리케이션 배포 미완료"
fi

echo -e "\n📝 다음 단계 제안:"
if ! aws eks describe-cluster --name $CLUSTER_NAME --region $REGION &> /dev/null; then
    echo "👉 ./step1-install-infrastructure.sh 실행하세요"
elif ! kubectl get deployment -n kube-system aws-load-balancer-controller &> /dev/null 2>&1 || ! kubectl get deployment -n karpenter karpenter &> /dev/null 2>&1 || ! kubectl get deployment -n argocd argocd-server &> /dev/null 2>&1; then
    echo "👉 ./step2-install-controllers.sh 실행하세요"
elif ! kubectl get deployment $PROJECT_NAME &> /dev/null 2>&1; then
    echo "👉 ./step3-setup-cicd.sh 실행하세요"
else
    echo "🎉 모든 단계가 완료되었습니다!"
    if kubectl get ingress $PROJECT_NAME &> /dev/null; then
        ALB_HOSTNAME=$(kubectl get ingress $PROJECT_NAME -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
        if [ -n "$ALB_HOSTNAME" ]; then
            echo "🌐 애플리케이션 URL: http://$ALB_HOSTNAME"
        fi
    fi
fi

echo -e "\n✨ 상태 확인 완료!"
