#!/bin/bash

echo "=== 단계별 EKS 배포 스크립트 (Helm 실패 방지) ==="

set -e  # 에러 발생시 스크립트 중단

REGION="ap-northeast-2"
CLUSTER_NAME="nest-wallet-cluster"

echo "🎯 단계별 배포로 Helm 릴리스 실패 방지"

# 1단계: 기본 인프라만 배포
echo -e "\n📋 1단계: 기본 인프라 배포 (VPC, EKS, 노드그룹)"
echo "대상: VPC, EKS 클러스터, 노드그룹, ECR, IAM 역할"

read -p "1단계를 시작하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Helm 릴리스를 제외한 기본 인프라만 배포
    terraform apply -target=aws_vpc.main \
                   -target=aws_internet_gateway.main \
                   -target=aws_subnet.public \
                   -target=aws_subnet.private \
                   -target=aws_route_table.public \
                   -target=aws_route_table.private \
                   -target=aws_route_table_association.public \
                   -target=aws_route_table_association.private \
                   -target=aws_nat_gateway.main \
                   -target=aws_eip.nat \
                   -target=aws_security_group.cluster \
                   -target=aws_security_group.node \
                   -target=aws_security_group.alb \
                   -target=aws_iam_role.cluster \
                   -target=aws_iam_role.node \
                   -target=aws_iam_role.alb_controller \
                   -target=aws_iam_role_policy_attachment.cluster_amazon_eks_cluster_policy \
                   -target=aws_iam_role_policy_attachment.node_amazon_eks_worker_node_policy \
                   -target=aws_iam_role_policy_attachment.node_amazon_eks_cni_policy \
                   -target=aws_iam_role_policy_attachment.node_amazon_ec2_container_registry_read_only \
                   -target=aws_iam_role_policy_attachment.node_ssm_managed_instance_core \
                   -target=aws_iam_role_policy_attachment.alb_controller_admin \
                   -target=aws_eks_cluster.main \
                   -target=aws_iam_openid_connect_provider.cluster \
                   -target=aws_eks_node_group.system \
                   -target=aws_ecr_repository.nest_wallet \
                   -target=aws_ecr_lifecycle_policy.nest_wallet \
                   -auto-approve
    
    echo "✅ 1단계 완료: 기본 인프라 배포 성공"
else
    echo "❌ 1단계 건너뜀"
fi

# kubectl 설정 확인
echo -e "\n📋 kubectl 설정 확인"
aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME
echo "클러스터 연결 상태:"
kubectl get nodes

# 2단계: EKS 애드온 배포
echo -e "\n📋 2단계: EKS 애드온 배포"
echo "대상: VPC-CNI, CoreDNS, kube-proxy"

read -p "2단계를 시작하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    terraform apply -target=aws_eks_addon.vpc_cni \
                   -target=aws_eks_addon.coredns \
                   -target=aws_eks_addon.kube_proxy \
                   -auto-approve
    
    echo "✅ 2단계 완료: EKS 애드온 배포 성공"
    
    echo "애드온 상태 확인:"
    kubectl get pods -n kube-system
else
    echo "❌ 2단계 건너뜀"
fi

# 3단계: ALB Controller 배포 (가장 실패하기 쉬운 부분)
echo -e "\n📋 3단계: ALB Controller 배포"
echo "대상: AWS Load Balancer Controller Helm 차트"

read -p "3단계를 시작하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Helm repo 수동 추가 (안정성 증대)
    echo "Helm repository 추가..."
    helm repo add eks https://aws.github.io/eks-charts
    helm repo update
    
    # Terraform으로 ALB Controller 배포
    terraform apply -target=helm_release.alb_controller -auto-approve
    
    echo "✅ 3단계 완료: ALB Controller 배포 성공"
    
    echo "ALB Controller 상태 확인:"
    kubectl get pods -n kube-system | grep aws-load-balancer-controller
    kubectl get deployment -n kube-system aws-load-balancer-controller
else
    echo "❌ 3단계 건너뜀"
fi

# 4단계: 최종 검증
echo -e "\n📋 4단계: 최종 인프라 검증"

echo "📊 배포된 리소스 확인:"
echo "1. EKS 클러스터:"
kubectl get nodes

echo -e "\n2. 시스템 파드 상태:"
kubectl get pods -n kube-system

echo -e "\n3. ALB Controller 로그 (최근 10줄):"
kubectl logs -n kube-system deployment/aws-load-balancer-controller --tail=10

echo -e "\n4. ECR 리포지토리:"
aws ecr describe-repositories --repository-names nest-wallet --region $REGION

echo -e "\n✅ 모든 단계 완료!"
echo "🎯 이제 애플리케이션을 배포할 수 있습니다:"
echo ""
echo "# Docker 이미지 빌드 & ECR 푸시"
echo "docker build -t nest-wallet:latest ."
echo "aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin [ECR_URI]"
echo "docker tag nest-wallet:latest [ECR_URI]:latest"
echo "docker push [ECR_URI]:latest"
echo ""
echo "# Helm으로 애플리케이션 배포"
echo "helm upgrade --install nest-wallet ./helm-charts/nest-wallet \\"
echo "  --set image.repository=[ECR_URI] \\"
echo "  --set image.tag=latest \\"
echo "  --namespace default"
