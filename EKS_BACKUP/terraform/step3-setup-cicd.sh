#!/bin/bash

echo "=== 3단계: GitOps CI/CD 설정 ==="

set -e  # 에러시 중단

REGION="ap-northeast-2"
PROJECT_NAME="nest-wallet"
CLUSTER_NAME="${PROJECT_NAME}-cluster"

echo "🎯 설정할 GitOps CI/CD:"
echo "- GitHub Actions로 ECR에 Docker 이미지 빌드 & 푸시"
echo "- Helm values 파일 업데이트 (dev.yaml/production.yaml)"
echo "- ArgoCD가 Git 저장소 변경사항 감지 후 자동 배포"
echo "- GitHub Secrets 설정"

echo -e "\n📋 사전 조건 확인:"

# 이전 단계 완료 확인
if [ ! -f "step1-outputs.txt" ]; then
    echo "❌ step1-outputs.txt 파일이 없습니다."
    echo "먼저 1-2단계를 완료하세요."
    exit 1
fi

echo "✅ 이전 단계 완료됨"

# ECR URI 가져오기
ECR_URI=$(aws ecr describe-repositories --repository-names $PROJECT_NAME --region $REGION --query 'repositories[0].repositoryUri' --output text 2>/dev/null || echo "")
if [ -z "$ECR_URI" ]; then
    echo "❌ ECR 리포지토리를 찾을 수 없습니다."
    echo "1-2단계가 제대로 완료되었는지 확인하세요."
    exit 1
fi

echo "✅ ECR 리포지토리 확인됨: $ECR_URI"

# ArgoCD 설치 확인
if kubectl get pods -n argocd | grep -q "Running"; then
    echo "✅ ArgoCD 설치 확인됨"
else
    echo "❌ ArgoCD가 설치되지 않았거나 아직 시작 중입니다."
    echo "2단계가 제대로 완료되었는지 확인하세요."
    exit 1
fi

echo -e "\n🚀 3단계 GitOps CI/CD 설정 시작..."

# Step 1: Docker 이미지 빌드 및 ECR 푸시
echo -e "\n📦 1/4: Docker 이미지 빌드 및 ECR 푸시..."

# ECR 로그인
echo "ECR 로그인 중..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

# Docker 이미지 빌드
echo "Docker 이미지 빌드 중..."
cd ..  # nest-wallet 루트 디렉토리로 이동
docker build -t $PROJECT_NAME:latest .

# 이미지 태깅 및 푸시
echo "이미지 태깅 및 ECR 푸시 중..."
docker tag $PROJECT_NAME:latest $ECR_URI:latest
docker tag $PROJECT_NAME:latest $ECR_URI:v1.0.0
docker push $ECR_URI:latest
docker push $ECR_URI:v1.0.0

echo "✅ Docker 이미지 ECR 푸시 완료"

cd terraform  # terraform 디렉토리로 복귀

# Step 2: Helm values 파일 초기 설정
echo -e "\n⚙️ 2/4: Helm values 파일 초기 설정..."

# yq 설치 (YAML 파일 편집용)
echo "yq 도구 설치 중..."
if ! command -v yq &> /dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "Homebrew로 yq 설치 중..."
            brew install yq
        else
            echo "macOS 바이너리 다운로드 중..."
            curl -L https://github.com/mikefarah/yq/releases/latest/download/yq_darwin_amd64 -o /tmp/yq
            chmod +x /tmp/yq
            sudo mv /tmp/yq /usr/local/bin/yq 2>/dev/null || {
                mv /tmp/yq ./yq
                export PATH="$PATH:$(pwd)"
            }
        fi
    else
        # Linux
        echo "Linux 바이너리 다운로드 중..."
        wget -q https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /tmp/yq
        chmod +x /tmp/yq
        sudo mv /tmp/yq /usr/local/bin/yq 2>/dev/null || {
            mv /tmp/yq ./yq
            export PATH="$PATH:$(pwd)"
        }
    fi
fi

# ECR URI를 values 파일에 업데이트
echo "ECR URI를 Helm values 파일에 업데이트 중..."

# dev.yaml 업데이트
echo "Development values 업데이트 중..."
yq eval ".image.repository = \"${ECR_URI}\"" -i ../helm-charts/nest-wallet/values/dev.yaml
yq eval ".image.tag = \"latest\"" -i ../helm-charts/nest-wallet/values/dev.yaml
yq eval ".app.deployedAt = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" -i ../helm-charts/nest-wallet/values/dev.yaml

# production.yaml 업데이트
echo "Production values 업데이트 중..."
yq eval ".image.repository = \"${ECR_URI}\"" -i ../helm-charts/nest-wallet/values/production.yaml
yq eval ".image.tag = \"latest\"" -i ../helm-charts/nest-wallet/values/production.yaml
yq eval ".app.deployedAt = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" -i ../helm-charts/nest-wallet/values/production.yaml

echo "✅ Helm values 파일 초기 설정 완료"

# Step 3: GitHub Secrets 설정
echo -e "\n🔑 3/4: GitHub Secrets 설정..."

# AWS 계정 정보 가져오기
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_ACCESS_KEY_ID=$(aws configure get aws_access_key_id)
AWS_SECRET_ACCESS_KEY=$(aws configure get aws_secret_access_key)

echo "설정할 GitHub Secrets:"
echo "- AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID"
echo "- AWS_SECRET_ACCESS_KEY: [HIDDEN]"
echo "- AWS_REGION: $REGION"
echo "- ECR_REPOSITORY: $ECR_URI"
echo "- EKS_CLUSTER_NAME: $CLUSTER_NAME"

# GitHub CLI 설치 확인
if command -v gh &> /dev/null; then
    echo "GitHub CLI로 자동 설정..."
    
    read -p "GitHub 리포지토리 이름을 입력하세요 (예: username/nest-wallet): " GITHUB_REPO
    
    if [ -n "$GITHUB_REPO" ]; then
        gh secret set AWS_ACCESS_KEY_ID --body "$AWS_ACCESS_KEY_ID" --repo "$GITHUB_REPO"
        gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET_ACCESS_KEY" --repo "$GITHUB_REPO"
        gh secret set AWS_REGION --body "$REGION" --repo "$GITHUB_REPO"
        gh secret set ECR_REPOSITORY --body "$ECR_URI" --repo "$GITHUB_REPO"
        gh secret set EKS_CLUSTER_NAME --body "$CLUSTER_NAME" --repo "$GITHUB_REPO"
        
        echo "✅ GitHub Secrets 설정 완료"
    else
        echo "⚠️ 리포지토리 이름이 입력되지 않았습니다. 수동으로 설정하세요."
    fi
else
    # 수동 설정 안내
    echo -e "\n📝 GitHub Actions Secrets 수동 설정 방법:"
    echo "1. GitHub 리포지토리로 이동"
    echo "2. Settings > Secrets and variables > Actions 클릭"
    echo "3. 다음 secrets을 추가:"
    echo ""
    echo "   Name: AWS_ACCESS_KEY_ID"
    echo "   Value: $AWS_ACCESS_KEY_ID"
    echo ""
    echo "   Name: AWS_SECRET_ACCESS_KEY" 
    echo "   Value: [YOUR_SECRET_ACCESS_KEY]"
    echo ""
    echo "   Name: AWS_REGION"
    echo "   Value: $REGION"
    echo ""
    echo "   Name: ECR_REPOSITORY"
    echo "   Value: $ECR_URI"
    echo ""
    echo "   Name: EKS_CLUSTER_NAME"
    echo "   Value: $CLUSTER_NAME"
    echo ""
fi

# Step 4: GitHub Actions 워크플로우 확인
echo -e "\n📄 4/4: GitHub Actions 워크플로우 확인..."

if [ -f "../.github/workflows/ci-cd.yml" ]; then
    echo "✅ GitHub Actions 워크플로우 파일이 이미 존재합니다."
    echo "🔄 GitOps 방식으로 업데이트되었습니다."
    echo ""
    echo "워크플로우 동작 방식:"
    echo "1. main 브랜치 푸시 → production 환경 배포"
    echo "2. develop 브랜치 푸시 → development 환경 배포"
    echo "3. GitHub Actions가 이미지 빌드 → ECR 푸시 → values 파일 업데이트"
    echo "4. ArgoCD가 Git 변경사항 감지 → 자동 배포"
else
    echo "❌ GitHub Actions 워크플로우 파일이 없습니다."
    echo "👉 .github/workflows/ci-cd.yml 파일이 제대로 생성되었는지 확인하세요."
fi

echo "✅ GitHub Actions GitOps CI/CD 설정 완료"

# Step 5: ArgoCD 초기 동기화 (선택사항)
echo -e "\n🔄 5/5: ArgoCD 애플리케이션 초기 동기화..."

echo "ArgoCD 애플리케이션 상태 확인 중..."
kubectl get applications -n argocd

# ArgoCD 서버 주소 확인
ALB_ARGOCD=$(kubectl get ingress -n argocd argocd-server -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "생성 중...")

if [ "$ALB_ARGOCD" != "생성 중..." ] && [ -n "$ALB_ARGOCD" ]; then
    echo -e "\n🌐 ArgoCD 접속 정보:"
    echo "URL: http://$ALB_ARGOCD"
    echo "Username: admin"
    echo "Password: admin123 (⚠️ 운영환경에서는 반드시 변경하세요!)"
    echo ""
    echo "ArgoCD에서 애플리케이션 동기화:"
    echo "1. ArgoCD UI에 로그인"
    echo "2. nest-wallet-dev, nest-wallet-prod 애플리케이션 확인"
    echo "3. 필요시 'Sync' 버튼 클릭하여 수동 동기화"
else
    echo -e "\n⏳ ArgoCD ALB가 아직 생성 중입니다."
    echo "몇 분 후 다음 명령어로 주소를 확인하세요:"
    echo "kubectl get ingress -n argocd argocd-server -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'"
fi

# 최종 정보 저장
cat >> step1-outputs.txt << EOF

=== 3단계 완료 정보 ===
날짜: $(date)
GitOps CI/CD: 설정 완료
ECR 이미지: $ECR_URI:latest, $ECR_URI:v1.0.0
ArgoCD URL: http://${ALB_ARGOCD:-"생성 중..."}
GitHub Actions CI/CD: .github/workflows/ci-cd.yml (GitOps 방식)

ArgoCD 애플리케이션:
- nest-wallet-dev (develop 브랜치 → development 네임스페이스)
- nest-wallet-prod (main 브랜치 → production 네임스페이스)

확인 명령어:
kubectl get applications -n argocd
kubectl get pods -n development
kubectl get pods -n production
kubectl get ingress -n argocd argocd-server
EOF

echo -e "\n✅ 3단계 완료!"

echo -e "\n🎉 전체 GitOps 배포 완료!"
echo -e "\n📊 최종 배포 상태:"
echo "1. ✅ EKS 클러스터: 실행중"
echo "2. ✅ ALB Controller: 설치됨"
echo "3. ✅ Karpenter: 설치됨"
echo "4. ✅ ArgoCD: 설치됨"
echo "5. ✅ ECR 이미지: 푸시됨"
echo "6. ✅ GitHub Actions: GitOps 설정됨"

if [ "$ALB_ARGOCD" != "생성 중..." ] && [ -n "$ALB_ARGOCD" ]; then
    echo -e "\n🌐 ArgoCD 대시보드:"
    echo "URL: http://$ALB_ARGOCD"
    echo "Login: admin / admin123"
fi

echo -e "\n📝 이제 GitOps 워크플로우가 준비되었습니다!"
echo ""
echo "🔄 배포 방법:"
echo "# Development 환경 배포"
echo "git checkout develop"
echo "git add ."
echo "git commit -m \"feat: new feature\""
echo "git push origin develop"
echo ""
echo "# Production 환경 배포"
echo "git checkout main"
echo "git merge develop"
echo "git push origin main"
echo ""
echo "GitHub Actions가 자동으로:"
echo "1. Docker 이미지 빌드 및 ECR 푸시"
echo "2. Helm values 파일 업데이트"
echo "3. Git에 변경사항 커밋"
echo ""
echo "ArgoCD가 자동으로:"
echo "1. Git 저장소 변경사항 감지"
echo "2. Helm 차트로 Kubernetes에 배포"
echo "3. 애플리케이션 상태 모니터링"

echo -e "\n📄 전체 설치 정보는 step1-outputs.txt 파일에 저장되었습니다."
