output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_security_group_id" {
  description = "Security group ids attached to the cluster control plane"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "cluster_name" {
  description = "Kubernetes Cluster Name"
  value       = aws_eks_cluster.main.name
}

output "cluster_arn" {
  description = "The Amazon Resource Name (ARN) of the cluster"
  value       = aws_eks_cluster.main.arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "vpc_id" {
  description = "ID of the VPC where the cluster is deployed"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.nest_wallet.repository_url
}

output "alb_controller_role_arn" {
  description = "The Amazon Resource Name (ARN) specifying the ALB controller role"
  value       = aws_iam_role.alb_controller.arn
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "account_id" {
  description = "AWS Account ID"
  value       = local.account_id
}

# Kubeconfig update command
output "configure_kubectl" {
  description = "Configure kubectl command"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}"
}

# 간소화된 배포 가이드
output "simple_deployment_guide" {
  description = "간소화된 배포 가이드"
  value = <<-EOT
    🚀 간소화된 EKS 배포 가이드:
    
    1. 📋 kubectl 설정:
       ${local.configure_kubectl}
    
    2. 🐳 Docker 이미지 빌드 & ECR 푸시:
       # ECR 로그인
       aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.nest_wallet.repository_url}
       
       # 이미지 빌드 & 푸시
       docker build -t nest-wallet:latest .
       docker tag nest-wallet:latest ${aws_ecr_repository.nest_wallet.repository_url}:latest
       docker push ${aws_ecr_repository.nest_wallet.repository_url}:latest
    
    3. ⎈ Helm 배포:
       helm upgrade --install nest-wallet ./helm-charts/nest-wallet \\
         --set image.repository=${aws_ecr_repository.nest_wallet.repository_url} \\
         --set image.tag=latest \\
         --namespace default
    
    4. 🔍 배포 확인:
       kubectl get pods
       kubectl get ingress
       kubectl get svc
    
    5. 🌐 ALB 주소 확인:
       kubectl get ingress nest-wallet -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
    
    ✅ ALB Controller가 자동으로 설치되어 LoadBalancer 생성 문제가 해결됩니다!
  EOT
}

# 현재 설정된 리소스 요약
output "deployed_resources" {
  description = "배포된 리소스 요약"
  value = <<-EOT
    📊 배포된 AWS 리소스:
    - ✅ EKS 클러스터: ${aws_eks_cluster.main.name}
    - ✅ ECR 리포지토리: ${aws_ecr_repository.nest_wallet.repository_url}
    - ✅ ALB Controller IAM 역할: ${aws_iam_role.alb_controller.arn}
    - ✅ VPC 및 서브넷: ${aws_vpc.main.id}
    - ✅ 시스템 노드 그룹: 2개 인스턴스 (t4g.medium)
    - ✅ ArgoCD: GitOps 배포 도구
    
    ✅ 간소화된 안정적 구성:
    - 고정 노드그룹 사용 (자동 스케일링 없음)
    - ALB Controller로 LoadBalancer 생성 가능
    - ArgoCD로 GitOps CI/CD 지원
  EOT
}
