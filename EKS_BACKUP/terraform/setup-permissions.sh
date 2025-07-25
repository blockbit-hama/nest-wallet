#!/bin/bash

echo "=== Nest Wallet EKS 배포 스크립트 권한 설정 ==="

# 스크립트 파일들에 실행 권한 부여
chmod +x step1-install-infrastructure.sh
chmod +x step2-install-controllers.sh
chmod +x step3-setup-cicd.sh
chmod +x check-status.sh

echo "✅ 모든 스크립트에 실행 권한이 부여되었습니다."

echo -e "\n📋 배포 순서:"
echo "1️⃣ ./step1-install-infrastructure.sh  # 기본 인프라 설치 (VPC, EKS, ECR)"
echo "2️⃣ ./step2-install-controllers.sh     # 컨트롤러 설치 (ALB, Karpenter)"
echo "3️⃣ ./step3-setup-cicd.sh             # CI/CD 설정 및 앱 배포"

echo -e "\n🎯 간단 실행 방법:"
echo "./step1-install-infrastructure.sh && ./step2-install-controllers.sh && ./step3-setup-cicd.sh"

echo -e "\n📊 예상 소요 시간:"
echo "- 1단계: 15-20분"
echo "- 2단계: 8-12분" 
echo "- 3단계: 10-15분"
echo "- 총 시간: 35-45분"

echo -e "\n💰 예상 비용 (월간):"
echo "- EKS 클러스터: $72"
echo "- EC2 인스턴스: $48 (t4g.medium x2)"
echo "- NAT 게이트웨이: $32"
echo "- ALB: $22 (생성시)"
echo "- 총 예상: ~$174/월"

echo -e "\n🚀 시작하려면 1단계부터 실행하세요:"
echo "./step1-install-infrastructure.sh"
