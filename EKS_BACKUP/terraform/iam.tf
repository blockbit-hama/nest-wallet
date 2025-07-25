# 간소화 배포를 위한 필수 IAM 설정
# ALB Controller는 EKS 서비스 계정에서 AWS API 호출이 필요하므로 OIDC 연결 필수

# ALB Controller IAM Role
resource "aws_iam_role" "alb_controller" {
  name = "${var.project_name}-alb-controller"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.cluster.arn
        }
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:sub": "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = var.tags
}

# ALB Controller에 AdministratorAccess 부여 (간소화를 위해)
resource "aws_iam_role_policy_attachment" "alb_controller_admin" {
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  role       = aws_iam_role.alb_controller.name
}

# 주석:
# - ALB Controller: LoadBalancer 생성/관리용 IRSA
# - Karpenter 제거로 간소화: 고정 노드그룹 사용
# - 간소화를 위해 AdministratorAccess 부여
