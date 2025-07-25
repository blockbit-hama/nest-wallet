# Nest Wallet 🪺

> 차세대 블록체인 지갑 플랫폼

[![CI/CD Pipeline](https://github.com/your-org/nest-wallet/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/your-org/nest-wallet/actions/workflows/ci-cd.yml)
[![Infrastructure](https://github.com/your-org/nest-wallet/actions/workflows/infrastructure.yml/badge.svg)](https://github.com/your-org/nest-wallet/actions/workflows/infrastructure.yml)
[![Security Scan](https://img.shields.io/badge/security-scanned-green.svg)](https://github.com/your-org/nest-wallet)

## 🚀 빠른 시작

### 개발 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:3000 접속
```

### 프로덕션 배포

```bash
# 인프라 설정
cd terraform
./setup-backend.sh
terraform apply

# 애플리케이션 배포
./scripts/deploy.sh setup
./scripts/deploy.sh deploy production latest
```

## 🏗️ 아키텍처

### 기술 스택

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Infrastructure**: AWS EKS, Karpenter, Spot Instances, Graviton
- **CI/CD**: GitHub Actions, ArgoCD, Argo Rollouts
- **Deployment**: Helm, Blue/Green Strategy
- **Monitoring**: Prometheus, Grafana, CloudWatch

### 배포 전략

- **블루/그린 배포**: 무중단 서비스 제공
- **스팟 인스턴스**: 최대 90% 비용 절감
- **자동 스케일링**: Karpenter 기반 동적 스케일링
- **ARM64 최적화**: Graviton 프로세서 활용

## 📁 프로젝트 구조

```
```
nest-wallet/
├── src/                    # Next.js 애플리케이션 소스
│   ├── app/               # App Router (Next.js 13+)
│   ├── components/        # React 컴포넌트
│   └── lib/              # 유틸리티 및 라이브러리
├── terraform/             # 인프라 as Code
│   ├── main.tf           # Provider 설정
│   ├── vpc.tf            # VPC 및 네트워킹
│   ├── eks.tf            # EKS 클러스터 및 노드그룹
│   ├── iam.tf            # IAM 역할 (IRSA 포함)
│   ├── helm-releases.tf  # ALB Controller, Karpenter
│   ├── karpenter.tf      # Karpenter NodeClass/NodePool
│   ├── step1-install-infrastructure.sh
│   ├── step2-install-controllers.sh
│   └── step3-setup-cicd.sh
├── helm-charts/           # Helm 차트
│   └── nest-wallet/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
├── .github/workflows/     # GitHub Actions
│   └── deploy.yml        # 자동 생성되는 CI/CD
├── docs/                  # 문서
│   ├── Deployment_guide.md
│   └── simple_infra_guide.md
└── Dockerfile            # 컨테이너 이미지
```

## 🎯 특징

### ✅ 간소화된 설계
- **복잡한 GitOps 제거**: ArgoCD 없이 GitHub Actions로 직접 배포
- **최소한의 IAM 설정**: AdministratorAccess로 권한 간소화
- **External Secrets 제거**: Helm values로 환경변수 주입
- **단순한 배포 전략**: Blue/Green 대신 Rolling Update

### ⚡ 자동화 완료
- **3단계 배포**: 스크립트 실행만으로 전체 인프라 구축
- **IRSA 자동 설정**: ALB Controller, Karpenter 권한 자동 구성
- **GitHub Actions**: 코드 푸시시 자동 빌드/배포
- **Karpenter**: 워크로드 기반 노드 자동 스케일링

### 💰 비용 최적화
- **Spot 인스턴스**: 최대 90% 비용 절약
- **ARM64 Graviton**: 20% 성능 향상 + 비용 절약
- **자동 스케일링**: 사용량에 따른 리소스 조절
- **예상 비용**: ~$174/월 (기본 구성)

## 🛠️ 배포 가이드

### 사전 요구사항
```bash
# macOS
brew install awscli terraform kubectl helm

# AWS 자격증명 설정
aws configure
```

### 단계별 배포

#### 1단계: 기본 인프라 (15-20분)
```bash
cd terraform
./step1-install-infrastructure.sh
```
**설치되는 것**: VPC, EKS 클러스터, 노드그룹, ECR, IAM 역할

#### 2단계: 컨트롤러 (8-12분)
```bash
./step2-install-controllers.sh
```
**설치되는 것**: ALB Controller, Karpenter, EKS 애드온

#### 3단계: CI/CD 및 앱 배포 (10-15분)
```bash
./step3-setup-cicd.sh
```
**설치되는 것**: Docker 이미지 빌드, ECR 푸시, Helm 배포, GitHub Actions 설정

### 배포 확인
```bash
# 상태 확인
./check-status.sh

# 애플리케이션 접속
kubectl get ingress nest-wallet -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

## 🔧 개발 워크플로우

### 로컬 개발
```bash
# 개발 서버 실행
npm run dev

# 테스트
npm test

# Docker 빌드 테스트
npm run docker:build
npm run docker:run
```

### 자동 배포
```bash
# 코드 변경 후 푸시하면 자동 배포
git add .
git commit -m "feat: new feature"
git push origin main

# GitHub Actions에서 자동으로:
# 1. Docker 이미지 빌드
# 2. ECR에 푸시  
# 3. Helm으로 EKS 배포
# 4. 배포 검증
```

## 📊 모니터링 및 관리

### 상태 확인
```bash
# 전체 인프라 상태
./terraform/check-status.sh

# 애플리케이션 상태
kubectl get pods -l app.kubernetes.io/name=nest-wallet
kubectl get ingress nest-wallet

# ALB Controller 상태
kubectl get pods -n kube-system | grep aws-load-balancer-controller

# Karpenter 상태
kubectl get pods -n karpenter
kubectl get nodeclass,nodepool
```

### 로그 확인
```bash
# 애플리케이션 로그
kubectl logs -l app.kubernetes.io/name=nest-wallet -f

# ALB Controller 로그
kubectl logs -n kube-system deployment/aws-load-balancer-controller --tail=50

# Karpenter 로그
kubectl logs -n karpenter deployment/karpenter --tail=50
```

## 🔍 AWS 콘솔 확인

### EKS 클러스터
1. **AWS Console** → **EKS** → **nest-wallet-cluster**
2. **Compute** 탭: 노드그룹 상태
3. **Add-ons** 탭: vpc-cni, coredns, kube-proxy

### ALB 확인
1. **EC2** → **Load Balancers**
2. 이름: `k8s-default-nestwallet-*`
3. 상태: Active

### IAM IRSA 확인
1. **IAM** → **Roles**
2. 역할들: `nest-wallet-alb-controller`, `nest-wallet-karpenter-controller`
3. **Trust relationships**에서 OIDC 연결 확인

## 🐛 문제 해결

### 일반적인 문제

#### kubectl 연결 실패
```bash
aws eks update-kubeconfig --region ap-northeast-2 --name nest-wallet-cluster
aws sts get-caller-identity
```

#### ALB Controller 실패
```bash
# IRSA 연결 확인
kubectl get serviceaccount -n kube-system aws-load-balancer-controller -o yaml | grep role-arn

# 로그 확인
kubectl logs -n kube-system deployment/aws-load-balancer-controller
```

#### Karpenter 노드 생성 실패
```bash
# Karpenter 로그 확인
kubectl logs -n karpenter deployment/karpenter

# NodeClass/NodePool 상태
kubectl describe nodeclass nest-wallet-nodeclass
kubectl describe nodepool nest-wallet-nodepool
```

#### ALB 생성 안됨
```bash
# Ingress 상태 확인
kubectl describe ingress nest-wallet

# 이벤트 확인
kubectl get events --sort-by=.metadata.creationTimestamp | grep LoadBalancer
```

## 💰 비용 정보

### 월간 예상 비용
- **EKS 클러스터**: $72 (컨트롤 플레인)
- **EC2 인스턴스**: $48 (t4g.medium x2)
- **NAT 게이트웨이**: $32
- **ALB**: $22 (생성시)
- **총 예상**: ~$174/월

### 비용 최적화 팁
- **Spot 인스턴스**: Karpenter가 자동으로 Spot 사용
- **ARM64 인스턴스**: Graviton 프로세서 활용
- **자동 스케일링**: 사용량에 따른 노드 자동 조절

## 🔒 보안

### IRSA (IAM Roles for Service Accounts)
- **ALB Controller**: `system:serviceaccount:kube-system:aws-load-balancer-controller`
- **Karpenter**: `system:serviceaccount:karpenter:karpenter`
- **권한**: AdministratorAccess (간소화를 위해)

### 보안 설정
- Pod Security Context 적용
- 비루트 사용자로 실행
- 읽기 전용 파일시스템
- 최소 권한 원칙

## 📚 문서

- **[배포 가이드](./docs/Deployment_guide.md)**: 상세한 단계별 배포 가이드
- **[인프라 요약](./docs/simple_infra_guide.md)**: 50줄 이내 간단 요약
- **[API 문서](/api/health)**: 헬스체크 엔드포인트

## 🚀 다음 단계

### 운영 환경 강화
1. **모니터링**: Prometheus + Grafana 추가
2. **보안**: IAM 권한 최소화, Network Policy
3. **고가용성**: Multi-AZ 배포, 백업 전략
4. **도메인**: Route53 + SSL 인증서

### 개발 환경 개선
1. **테스트**: E2E 테스트 추가
2. **코드 품질**: ESLint, Prettier 강화
3. **타입 안전성**: TypeScript strict 모드

## 🤝 기여하기

1. 이슈 생성 또는 기능 요청
2. 포크 및 기능 브랜치 생성
3. 개발 및 테스트
4. Pull Request 생성

## 📄 라이선스

MIT License - [LICENSE](LICENSE) 파일 참조

## 📞 지원

- **GitHub Issues**: 버그 리포트 및 기능 요청
- **GitHub Discussions**: 질문 및 토론
- **이메일**: support@nest-wallet.com

---

**Nest Wallet**은 현대적인 클라우드 네이티브 기술을 활용하여 **간소하면서도 강력한** EKS 기반 블록체인 지갑 플랫폼입니다.

**3단계 스크립트 실행만으로** 완전 자동화된 인프라와 CI/CD 파이프라인을 구축할 수 있으며, **비용 효율적이고 확장 가능한** 서비스를 제공합니다. 애플리케이션 소스
├── terraform/              # 인프라 as Code
│   ├── main.tf
│   ├── variables.tf
│   ├── vpc.tf
│   ├── eks.tf
│   ├── karpenter.tf
│   └── helm-releases.tf
├── helm-charts/            # Helm 차트
│   └── nest-wallet/
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── templates/
│       └── values/
├── .github/workflows/      # GitHub Actions
│   ├── ci-cd.yml
│   └── infrastructure.yml
├── argocd/                # ArgoCD 설정
│   ├── applications.yaml
│   └── project.yaml
└── scripts/               # 배포 스크립트
    ├── deploy.sh
    └── monitor.sh
```

## 🔧 개발 가이드

### 환경 변수

```bash
# .env.local 파일 생성
cp .env.example .env.local
```

### 테스트 실행

```bash
# 단위 테스트
npm test

# E2E 테스트
npm run test:e2e

# 커버리지 확인
npm run test:coverage
```

### 코드 품질

```bash
# 린팅
npm run lint

# 타입 체크
npm run type-check

# 포맷팅
npm run format
```

## 🚀 배포 가이드

### 스테이징 배포

```bash
# develop 브랜치에 푸시하면 자동 배포
git push origin develop
```

### 프로덕션 배포

```bash
# main 브랜치에 푸시 후 GitHub Actions에서 수동 승인
git push origin main

# 또는 스크립트 사용
./scripts/deploy.sh deploy production v1.0.0
```

### 롤백

```bash
# 긴급 롤백
./scripts/deploy.sh rollback production

# 특정 버전으로 롤백
helm rollback nest-wallet 2 -n production
```

## 📊 모니터링

### 상태 확인

```bash
# 전체 상태
./scripts/deploy.sh status

# 헬스 체크
./scripts/deploy.sh health production

# 로그 확인
./scripts/deploy.sh logs production 100
```

### 메트릭 및 대시보드

- **Grafana**: http://grafana.your-domain.com
- **ArgoCD**: http://argocd.your-domain.com
- **Prometheus**: http://prometheus.your-domain.com

## 🔒 보안

### 보안 스캔

- **Trivy**: 컨테이너 취약점 스캔
- **CodeQL**: 코드 보안 분석
- **Dependabot**: 의존성 취약점 모니터링

### 보안 설정

- Pod Security Standards 적용
- Network Policy 설정
- RBAC 권한 관리
- 시크릿 암호화

## 🛠️ 인프라 관리

### Terraform 명령어

```bash
# 인프라 계획 확인
terraform plan

# 인프라 적용
terraform apply

# 인프라 제거
terraform destroy
```

### Karpenter 관리

```bash
# 노드 상태 확인
kubectl get nodes -l karpenter.sh/nodepool

# 스팟 인스턴스 확인
kubectl get nodes -o custom-columns=NAME:.metadata.name,INSTANCE:.metadata.labels.node\\.kubernetes\\.io/instance-type
```

## 💰 비용 최적화

### 주요 전략

1. **스팟 인스턴스**: 최대 90% 비용 절감
2. **Graviton 프로세서**: 40% 성능 향상
3. **자동 스케일링**: 리소스 사용량 최적화
4. **예약 인스턴스**: 안정적인 워크로드용

### 비용 모니터링

```bash
# 리소스 사용량 확인
kubectl top nodes
kubectl top pods -n production

# AWS 비용 확인
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31
```

## 🐛 트러블슈팅

### 일반적인 문제

1. **스팟 인스턴스 인터럽션**
   - 자동 드레이닝 및 재시작
   - SQS 기반 알림 시스템

2. **배포 실패**
   - ArgoCD 동기화 확인
   - Rollout 상태 분석

3. **성능 이슈**
   - HPA 설정 확인
   - 리소스 제한 조정

### 로그 분석

```bash
# 애플리케이션 로그
kubectl logs -l app.kubernetes.io/name=nest-wallet -n production

# ArgoCD 로그
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-server

# Karpenter 로그
kubectl logs -n karpenter -l app.kubernetes.io/name=karpenter
```

## 📚 문서

- [배포 가이드](./docs/deployment-guide.md)
- [아키텍처 문서](./docs/architecture.md)
- [API 문서](./docs/api.md)
- [기여 가이드](./CONTRIBUTING.md)

## 🤝 기여하기

1. **이슈 생성**: 버그 리포트나 기능 요청
2. **포크 및 브랜치**: 새로운 기능 개발
3. **풀 리퀘스트**: 코드 리뷰 및 머지
4. **문서 개선**: 가이드 및 API 문서

### 개발 프로세스

```bash
# 1. 포크 및 클론
git clone https://github.com/your-username/nest-wallet.git

# 2. 기능 브랜치 생성
git checkout -b feature/new-feature

# 3. 개발 및 테스트
npm run dev
npm test

# 4. 커밋 및 푸시
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 5. 풀 리퀘스트 생성
```

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

- **이슈 트래커**: [GitHub Issues](https://github.com/your-org/nest-wallet/issues)
- **디스커션**: [GitHub Discussions](https://github.com/your-org/nest-wallet/discussions)
- **이메일**: support@nest-wallet.com

## 🏆 기여자

특별히 감사드리는 기여자들:

- [@contributor1](https://github.com/contributor1) - 초기 아키텍처 설계
- [@contributor2](https://github.com/contributor2) - CI/CD 파이프라인 구축
- [@contributor3](https://github.com/contributor3) - 보안 강화

---

**Nest Wallet**은 현대적인 DevOps 실천과 클라우드 네이티브 기술을 활용하여 구축된 차세대 블록체인 지갑 플랫폼입니다. 

비용 효율성과 확장성을 동시에 만족하는 완전 자동화된 CI/CD 파이프라인을 통해 안정적이고 빠른 서비스를 제공합니다.
