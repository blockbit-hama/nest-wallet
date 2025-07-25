#!/bin/bash

echo "=== EKS 개별 리소스 관리 스크립트 ==="

REGION="ap-northeast-2"
PROJECT_NAME="nest-wallet"
CLUSTER_NAME="${PROJECT_NAME}-cluster"

show_menu() {
    echo -e "\n🎯 EKS 리소스 개별 관리 옵션:"
    echo "1) EKS 클러스터만 재생성 (노드그룹 제외)"
    echo "2) EKS 노드그룹만 재생성"
    echo "3) ALB Controller만 재설치"
    echo "4) EKS 애드온만 재설치"
    echo "5) OIDC Provider만 재생성"
    echo "6) 전체 EKS 스택 재생성 (VPC 제외)"
    echo "7) 현재 상태 확인"
    echo "8) 종료"
    echo ""
}

recreate_cluster_only() {
    echo "🔄 EKS 클러스터만 재생성..."
    
    # 클러스터 삭제 (노드그룹은 자동으로 함께 삭제됨)
    terraform destroy -target=aws_eks_cluster.main -auto-approve
    
    # 클러스터 재생성
    terraform apply -target=aws_eks_cluster.main -auto-approve
    
    # OIDC Provider도 재생성 필요
    terraform apply -target=aws_iam_openid_connect_provider.cluster -auto-approve
    
    echo "✅ EKS 클러스터 재생성 완료"
    echo "⚠️  노드그룹도 다시 생성해야 합니다 (옵션 2 선택)"
}

recreate_nodegroup() {
    echo "🔄 EKS 노드그룹 재생성..."
    
    terraform destroy -target=aws_eks_node_group.system -auto-approve
    terraform apply -target=aws_eks_node_group.system -auto-approve
    
    echo "✅ EKS 노드그룹 재생성 완료"
    
    # kubectl 설정 업데이트
    aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME
    
    echo "📊 노드 상태:"
    kubectl get nodes
}

reinstall_alb_controller() {
    echo "🔄 ALB Controller 재설치..."
    
    # ALB Controller 삭제
    terraform destroy -target=helm_release.alb_controller -auto-approve
    
    # Helm repo 업데이트
    helm repo add eks https://aws.github.io/eks-charts 2>/dev/null || true
    helm repo update
    
    # ALB Controller 재설치
    terraform apply -target=helm_release.alb_controller -auto-approve
    
    echo "✅ ALB Controller 재설치 완료"
    
    echo "📊 ALB Controller 상태:"
    kubectl get pods -n kube-system | grep aws-load-balancer-controller
}

reinstall_addons() {
    echo "🔄 EKS 애드온 재설치..."
    
    terraform destroy \
      -target=aws_eks_addon.vpc_cni \
      -target=aws_eks_addon.coredns \
      -target=aws_eks_addon.kube_proxy \
      -auto-approve
    
    terraform apply \
      -target=aws_eks_addon.vpc_cni \
      -target=aws_eks_addon.coredns \
      -target=aws_eks_addon.kube_proxy \
      -auto-approve
    
    echo "✅ EKS 애드온 재설치 완료"
    
    echo "📊 시스템 파드 상태:"
    kubectl get pods -n kube-system
}

recreate_oidc() {
    echo "🔄 OIDC Provider 재생성..."
    
    terraform destroy -target=aws_iam_openid_connect_provider.cluster -auto-approve
    terraform apply -target=aws_iam_openid_connect_provider.cluster -auto-approve
    
    echo "✅ OIDC Provider 재생성 완료"
    echo "⚠️  ALB Controller도 재설치가 필요할 수 있습니다"
}

recreate_full_eks() {
    echo "🔄 전체 EKS 스택 재생성 (VPC 제외)..."
    
    # 전체 EKS 리소스 삭제
    terraform destroy \
      -target=helm_release.alb_controller \
      -target=aws_eks_addon.vpc_cni \
      -target=aws_eks_addon.coredns \
      -target=aws_eks_addon.kube_proxy \
      -target=aws_eks_node_group.system \
      -target=aws_eks_cluster.main \
      -target=aws_iam_openid_connect_provider.cluster \
      -auto-approve
    
    # 전체 EKS 리소스 재생성
    terraform apply \
      -target=aws_eks_cluster.main \
      -target=aws_iam_openid_connect_provider.cluster \
      -target=aws_eks_node_group.system \
      -target=aws_eks_addon.vpc_cni \
      -target=aws_eks_addon.coredns \
      -target=aws_eks_addon.kube_proxy \
      -auto-approve
    
    # kubectl 설정
    aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME
    
    # 클러스터 준비 대기
    echo "⏳ 클러스터 준비 대기..."
    sleep 30
    
    # ALB Controller 설치
    helm repo add eks https://aws.github.io/eks-charts 2>/dev/null || true
    helm repo update
    terraform apply -target=helm_release.alb_controller -auto-approve
    
    echo "✅ 전체 EKS 스택 재생성 완료"
}

check_status() {
    echo "📊 현재 EKS 상태 확인..."
    
    # EKS 클러스터 상태
    if aws eks describe-cluster --name $CLUSTER_NAME --region $REGION &> /dev/null; then
        CLUSTER_STATUS=$(aws eks describe-cluster --name $CLUSTER_NAME --region $REGION --query 'cluster.status' --output text)
        echo "✅ EKS 클러스터: $CLUSTER_STATUS"
    else
        echo "❌ EKS 클러스터: 없음"
        return
    fi
    
    # kubectl 연결 확인
    if kubectl get nodes &> /dev/null; then
        echo "✅ kubectl 연결됨"
        echo -e "\n📊 노드 상태:"
        kubectl get nodes
    else
        echo "⚠️  kubectl 연결 안됨"
        echo "설정 명령어: aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME"
    fi
    
    # ALB Controller 확인
    if kubectl get deployment -n kube-system aws-load-balancer-controller &> /dev/null; then
        ALB_STATUS=$(kubectl get deployment -n kube-system aws-load-balancer-controller -o jsonpath='{.status.readyReplicas}/{.status.replicas}')
        echo "✅ ALB Controller: $ALB_STATUS 준비됨"
    else
        echo "❌ ALB Controller: 없음"
    fi
    
    # 시스템 파드 확인
    echo -e "\n📊 시스템 파드 상태:"
    kubectl get pods -n kube-system --no-headers | head -10
}

# 메인 루프
while true; do
    show_menu
    read -p "옵션을 선택하세요 (1-8): " choice
    
    case $choice in
        1)
            recreate_cluster_only
            ;;
        2)
            recreate_nodegroup
            ;;
        3)
            reinstall_alb_controller
            ;;
        4)
            reinstall_addons
            ;;
        5)
            recreate_oidc
            ;;
        6)
            recreate_full_eks
            ;;
        7)
            check_status
            ;;
        8)
            echo "👋 종료합니다."
            exit 0
            ;;
        *)
            echo "❌ 잘못된 선택입니다. 1-8 중에서 선택하세요."
            ;;
    esac
    
    echo -e "\n" 
    read -p "계속하려면 Enter를 누르세요..."
done
