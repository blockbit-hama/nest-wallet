#!/bin/bash

# IRSA 문제 진단 및 해결 스크립트
# nest-wallet EKS 클러스터의 ALB Controller IRSA 문제 해결

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수들
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 변수 설정
CLUSTER_NAME="nest-wallet-cluster"
AWS_REGION="ap-northeast-2"
PROJECT_NAME="nest-wallet"
ALB_ROLE_NAME="${PROJECT_NAME}-alb-controller"
KARPENTER_ROLE_NAME="${PROJECT_NAME}-karpenter-controller"

log_info "=== IRSA 문제 진단 및 해결 시작 ==="

# 1. 기본 설정 확인
log_info "1. 기본 설정 확인 중..."

# AWS CLI 설정 확인
if ! aws sts get-caller-identity &>/dev/null; then
    log_error "AWS CLI가 설정되지 않았습니다. 'aws configure'를 실행하세요."
    exit 1
fi

# kubectl 설정 확인
if ! kubectl cluster-info &>/dev/null; then
    log_warning "kubectl이 클러스터에 연결되지 않았습니다. kubeconfig를 업데이트합니다..."
    aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}
fi

log_success "기본 설정 확인 완료"

# 2. EKS 클러스터 및 OIDC Provider 확인
log_info "2. EKS 클러스터 및 OIDC Provider 확인 중..."

# 클러스터 존재 확인
if ! aws eks describe-cluster --name ${CLUSTER_NAME} --region ${AWS_REGION} &>/dev/null; then
    log_error "EKS 클러스터 '${CLUSTER_NAME}'이 존재하지 않습니다."
    exit 1
fi

# OIDC Issuer URL 가져오기
OIDC_ISSUER=$(aws eks describe-cluster --name ${CLUSTER_NAME} --region ${AWS_REGION} --query "cluster.identity.oidc.issuer" --output text)
if [ "$OIDC_ISSUER" == "None" ] || [ -z "$OIDC_ISSUER" ]; then
    log_error "OIDC Provider가 EKS 클러스터에 연결되지 않았습니다."
    exit 1
fi

OIDC_ID=$(echo $OIDC_ISSUER | cut -d '/' -f 5)
OIDC_PROVIDER_ARN="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/${OIDC_ISSUER#https://}"

log_success "OIDC Issuer: $OIDC_ISSUER"
log_success "OIDC Provider ARN: $OIDC_PROVIDER_ARN"

# OIDC Provider 존재 확인
if ! aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" &>/dev/null; then
    log_error "IAM OIDC Provider가 존재하지 않습니다: $OIDC_PROVIDER_ARN"
    log_info "Terraform을 다시 실행하여 OIDC Provider를 생성하세요."
    exit 1
fi

# OIDC Provider Audience 확인
AUDIENCE=$(aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" --query "ClientIDList[0]" --output text)
if [ "$AUDIENCE" != "sts.amazonaws.com" ]; then
    log_error "OIDC Provider Audience가 올바르지 않습니다. 예상: sts.amazonaws.com, 실제: $AUDIENCE"
    exit 1
fi

log_success "OIDC Provider 설정 확인 완료"

# 3. IAM Role Trust Policy 확인 및 수정
log_info "3. IAM Role Trust Policy 확인 및 수정..."

fix_trust_policy() {
    local role_name=$1
    local service_account_namespace=$2
    local service_account_name=$3
    
    log_info "Role '$role_name'의 Trust Policy 확인 중..."
    
    # 현재 Trust Policy 가져오기
    if ! aws iam get-role --role-name "$role_name" &>/dev/null; then
        log_error "IAM Role '$role_name'이 존재하지 않습니다."
        return 1
    fi
    
    # 올바른 Trust Policy 생성
    cat > /tmp/trust-policy-${role_name}.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "$OIDC_PROVIDER_ARN"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_ISSUER#https://}:aud": "sts.amazonaws.com",
          "${OIDC_ISSUER#https://}:sub": "system:serviceaccount:${service_account_namespace}:${service_account_name}"
        }
      }
    }
  ]
}
EOF
    
    # Trust Policy 업데이트
    log_info "Role '$role_name'의 Trust Policy 업데이트 중..."
    if aws iam update-assume-role-policy --role-name "$role_name" --policy-document file:///tmp/trust-policy-${role_name}.json; then
        log_success "Role '$role_name'의 Trust Policy 업데이트 완료"
    else
        log_error "Role '$role_name'의 Trust Policy 업데이트 실패"
        return 1
    fi
    
    # 임시 파일 삭제
    rm -f /tmp/trust-policy-${role_name}.json
}

# ALB Controller Role Trust Policy 수정
fix_trust_policy "$ALB_ROLE_NAME" "kube-system" "aws-load-balancer-controller"

# Karpenter Controller Role Trust Policy 수정
fix_trust_policy "$KARPENTER_ROLE_NAME" "karpenter" "karpenter"

# 4. ServiceAccount 확인
log_info "4. ServiceAccount 확인 중..."

check_service_account() {
    local namespace=$1
    local service_account_name=$2
    local expected_role_arn=$3
    
    log_info "ServiceAccount '$service_account_name'을 확인 중... (namespace: $namespace)"
    
    if kubectl get serviceaccount "$service_account_name" -n "$namespace" &>/dev/null; then
        local current_role_arn=$(kubectl get serviceaccount "$service_account_name" -n "$namespace" -o jsonpath='{.metadata.annotations.eks\.amazonaws\.com/role-arn}' 2>/dev/null || echo "")
        
        if [ "$current_role_arn" == "$expected_role_arn" ]; then
            log_success "ServiceAccount '$service_account_name' 설정이 올바릅니다"
            return 0
        else
            log_warning "ServiceAccount '$service_account_name'의 role-arn이 올바르지 않습니다"
            log_info "예상: $expected_role_arn"
            log_info "실제: $current_role_arn"
            
            # ServiceAccount annotation 업데이트
            log_info "ServiceAccount annotation 업데이트 중..."
            kubectl annotate serviceaccount "$service_account_name" -n "$namespace" \
                eks.amazonaws.com/role-arn="$expected_role_arn" --overwrite
            log_success "ServiceAccount annotation 업데이트 완료"
        fi
    else
        log_warning "ServiceAccount '$service_account_name'이 존재하지 않습니다. Helm이 생성할 것입니다."
    fi
}

# ALB Controller ServiceAccount 확인
ALB_ROLE_ARN="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/$ALB_ROLE_NAME"
check_service_account "kube-system" "aws-load-balancer-controller" "$ALB_ROLE_ARN"

# Karpenter ServiceAccount 확인
KARPENTER_ROLE_ARN="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/$KARPENTER_ROLE_NAME"
check_service_account "karpenter" "karpenter" "$KARPENTER_ROLE_ARN"

# 5. Pod Identity Webhook 확인
log_info "5. Pod Identity Webhook 확인 중..."

if kubectl get mutatingwebhookconfiguration pod-identity-webhook &>/dev/null; then
    log_success "Pod Identity Webhook이 존재합니다"
else
    log_warning "Pod Identity Webhook이 존재하지 않습니다. (EKS에서 자동 관리됨)"
fi

# 6. ALB Controller Pod 재시작
log_info "6. ALB Controller Pod 재시작 중..."

if kubectl get deployment aws-load-balancer-controller -n kube-system &>/dev/null; then
    kubectl rollout restart deployment/aws-load-balancer-controller -n kube-system
    log_info "ALB Controller 재시작 대기 중..."
    kubectl rollout status deployment/aws-load-balancer-controller -n kube-system --timeout=300s
    log_success "ALB Controller 재시작 완료"
else
    log_info "ALB Controller가 아직 배포되지 않았습니다. Helm 배포를 기다립니다."
fi

# 7. Karpenter Pod 재시작
log_info "7. Karpenter Pod 재시작 중..."

if kubectl get deployment karpenter -n karpenter &>/dev/null; then
    kubectl rollout restart deployment/karpenter -n karpenter
    log_info "Karpenter 재시작 대기 중..."
    kubectl rollout status deployment/karpenter -n karpenter --timeout=300s
    log_success "Karpenter 재시작 완료"
else
    log_info "Karpenter가 아직 배포되지 않았습니다. Helm 배포를 기다립니다."
fi

# 8. 최종 상태 확인
log_info "8. 최종 상태 확인 중..."

# ALB Controller 로그 확인
log_info "ALB Controller 로그 확인 중..."
if kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller &>/dev/null; then
    ALB_POD=$(kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$ALB_POD" ]; then
        log_info "ALB Controller Pod: $ALB_POD"
        # 최근 30줄의 로그 확인
        if kubectl logs $ALB_POD -n kube-system --tail=30 | grep -i "error\|failed\|denied" | head -5; then
            log_warning "ALB Controller에서 일부 오류가 발견되었습니다. 위 로그를 확인하세요."
        else
            log_success "ALB Controller가 정상적으로 실행 중입니다"
        fi
    fi
fi

# Karpenter 로그 확인
log_info "Karpenter 로그 확인 중..."
if kubectl get pods -n karpenter -l app.kubernetes.io/name=karpenter &>/dev/null; then
    KARPENTER_POD=$(kubectl get pods -n karpenter -l app.kubernetes.io/name=karpenter -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$KARPENTER_POD" ]; then
        log_info "Karpenter Pod: $KARPENTER_POD"
        # 최근 30줄의 로그 확인
        if kubectl logs $KARPENTER_POD -n karpenter --tail=30 | grep -i "error\|failed\|denied" | head -5; then
            log_warning "Karpenter에서 일부 오류가 발견되었습니다. 위 로그를 확인하세요."
        else
            log_success "Karpenter가 정상적으로 실행 중입니다"
        fi
    fi
fi

# 9. 다음 단계 안내
log_info "9. 다음 단계 안내"
echo
log_success "=== IRSA 문제 해결 완료 ==="
echo
log_info "이제 다음 명령어로 상태를 확인할 수 있습니다:"
echo
echo "  # ALB Controller 상태 확인"
echo "  kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller"
echo "  kubectl logs -n kube-system deployment/aws-load-balancer-controller"
echo
echo "  # Karpenter 상태 확인"
echo "  kubectl get pods -n karpenter -l app.kubernetes.io/name=karpenter"
echo "  kubectl logs -n karpenter deployment/karpenter"
echo
echo "  # ArgoCD Ingress 상태 확인 (ALB 생성 확인)"
echo "  kubectl get ingress -n argocd"
echo "  kubectl describe ingress argocd-server -n argocd"
echo
log_info "문제가 지속되면 다음을 확인하세요:"
echo "  1. AWS 권한 (AdministratorAccess 확인)"
echo "  2. VPC/서브넷 태그 확인"
echo "  3. Security Group 설정"
echo "  4. Terraform apply로 전체 재배포"
echo

log_success "스크립트 실행 완료!"
