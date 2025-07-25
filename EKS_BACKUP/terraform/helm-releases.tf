# 간소화 배포를 위한 필수 Helm 릴리스들
# Karpenter 제거로 더욱 간단한 구성

# AWS Load Balancer Controller (ALB를 위해 필수)
resource "helm_release" "alb_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  version    = "1.8.2"
  namespace  = "kube-system"

  values = [
    yamlencode({
      clusterName = aws_eks_cluster.main.name
      serviceAccount = {
        create = true
        name   = "aws-load-balancer-controller"
        annotations = {
          "eks.amazonaws.com/role-arn" = aws_iam_role.alb_controller.arn
        }
      }
      # 시스템 노드에만 배포 (taint 무시)
      tolerations = [
        {
          key      = "CriticalAddonsOnly"
          operator = "Exists"
          effect   = "NoSchedule"
        }
      ]
      nodeSelector = {
        role = "system"
      }
      # ALB Controller 특정 설정
      region = var.aws_region
      vpcId = aws_vpc.main.id
      # 로그 레벨 증가 (디버깅용)
      logLevel = "info"
      # 리소스 제한
      resources = {
        limits = {
          cpu    = "200m"
          memory = "500Mi"
        }
        requests = {
          cpu    = "100m"
          memory = "200Mi"
        }
      }
    })
  ]

  # 명확한 의존성 설정 - EKS 애드온 후에 설치
  depends_on = [
    aws_eks_cluster.main,
    aws_eks_node_group.system,
    aws_eks_addon.vpc_cni,
    aws_eks_addon.coredns,
    aws_eks_addon.kube_proxy,
    aws_iam_role_policy_attachment.alb_controller_admin,
    aws_iam_openid_connect_provider.cluster
  ]

  # Helm 설치 타임아웃 증가
  timeout = 600
  
  # 설치 실패시 재시도하지 않음 (디버깅 용이)
  atomic = true
  
  # 기존 설치가 있다면 재설치
  replace = true
}

# ArgoCD (GitOps 배포용) - 경량화 설정
resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = "5.51.6"  # 안정적인 버전 사용
  namespace  = "argocd"
  create_namespace = true

  values = [
    yamlencode({
      global = {
        image = {
          tag = "v2.8.7"  # 안정적인 ArgoCD 버전
        }
      }
      
      configs = {
        secret = {
          # ArgoCD admin 초기 비밀번호: admin123!
          argocdServerAdminPassword = "$2a$10$rRyBsGSHK6.uc8fntPwVIuLVHgsAhAX7TcdrqW/RADU9TpY4.BN4W"
        }
        cm = {
          # 기본 설정 - 간소화
          "server.insecure" = "true"
          "application.instanceLabelKey" = "argocd.argoproj.io/instance"
        }
        params = {
          "server.insecure" = true
        }
      }
      
      server = {
        # ArgoCD 서버 - 경량화 설정
        service = {
          type = "LoadBalancer"  # 간단한 LoadBalancer 사용
        }
        
        # 리소스 요구사항 최소화
        resources = {
          limits = {
            cpu    = "500m"
            memory = "512Mi"
          }
          requests = {
            cpu    = "100m"
            memory = "128Mi"
          }
        }

        # 시스템 노드에만 배포
        tolerations = [
          {
            key      = "CriticalAddonsOnly"
            operator = "Exists"
            effect   = "NoSchedule"
          }
        ]
        nodeSelector = {
          role = "system"
        }
      }
      
      controller = {
        # Application Controller - 경량화
        resources = {
          limits = {
            cpu    = "1000m"
            memory = "1Gi"
          }
          requests = {
            cpu    = "250m"
            memory = "256Mi"
          }
        }

        tolerations = [
          {
            key      = "CriticalAddonsOnly"
            operator = "Exists"
            effect   = "NoSchedule"
          }
        ]
        nodeSelector = {
          role = "system"
        }
      }
      
      repoServer = {
        # Repository Server - 경량화
        resources = {
          limits = {
            cpu    = "500m"
            memory = "512Mi"
          }
          requests = {
            cpu    = "100m"
            memory = "128Mi"
          }
        }

        tolerations = [
          {
            key      = "CriticalAddonsOnly"
            operator = "Exists"
            effect   = "NoSchedule"
          }
        ]
        nodeSelector = {
          role = "system"
        }
      }

      redis = {
        # Redis - 경량화
        resources = {
          limits = {
            cpu    = "200m"
            memory = "256Mi"
          }
          requests = {
            cpu    = "100m"
            memory = "64Mi"
          }
        }

        tolerations = [
          {
            key      = "CriticalAddonsOnly"
            operator = "Exists"
            effect   = "NoSchedule"
          }
        ]
        nodeSelector = {
          role = "system"
        }
      }

      dex = {
        # Dex 서버 - 경량화
        resources = {
          limits = {
            cpu    = "200m"
            memory = "256Mi"
          }
          requests = {
            cpu    = "50m"
            memory = "64Mi"
          }
        }

        tolerations = [
          {
            key      = "CriticalAddonsOnly"
            operator = "Exists"
            effect   = "NoSchedule"
          }
        ]
        nodeSelector = {
          role = "system"
        }
      }

      # ApplicationSet Controller - toleration 추가
      applicationSet = {
        resources = {
          limits = {
            cpu    = "200m"
            memory = "256Mi"
          }
          requests = {
            cpu    = "50m"
            memory = "64Mi"
          }
        }

        tolerations = [
          {
            key      = "CriticalAddonsOnly"
            operator = "Exists"
            effect   = "NoSchedule"
          }
        ]
        nodeSelector = {
          role = "system"
        }
      }

      # Notifications Controller - toleration 추가
      notifications = {
        resources = {
          limits = {
            cpu    = "200m"
            memory = "256Mi"
          }
          requests = {
            cpu    = "50m"
            memory = "64Mi"
          }
        }

        tolerations = [
          {
            key      = "CriticalAddonsOnly"
            operator = "Exists"
            effect   = "NoSchedule"
          }
        ]
        nodeSelector = {
          role = "system"
        }
      }
    })
  ]

  # 명확한 의존성 설정 - ALB Controller 후에 설치
  depends_on = [
    aws_eks_cluster.main,
    aws_eks_node_group.system,
    aws_eks_addon.vpc_cni,
    aws_eks_addon.coredns,
    aws_eks_addon.kube_proxy,
    helm_release.alb_controller
  ]

  # Helm 설치 타임아웃 증가
  timeout = 900  # 15분
  
  # 설치 실패시 자동 정리
  atomic = true
  cleanup_on_fail = true
  
  # 기존 설치가 있다면 재설치
  replace = true
}

# 주석:
# - ALB Controller: LoadBalancer 생성 및 관리  
# - ArgoCD: GitOps 배포 도구 (경량화 설정)
# - 모든 리소스 요구사항을 최소화하여 안정성 향상
# - Ingress 설정 제거하고 간단한 LoadBalancer 사용
# - 안정적인 버전으로 고정
