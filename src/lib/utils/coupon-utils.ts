// 쿠폰 등록을 위한 유틸리티 함수들

import { createNonce } from '../app/api/nonces';
import { registerCoupon } from '../app/api/coupons';
import { CreateNonceRequest, RegisterCouponRequest } from '../types/coupon';

// 서명 생성을 위한 타입 (실제 구현에서는 적절한 암호화 라이브러리 사용)
export interface SignatureGenerator {
  sign(message: string): string;
}

// 쿠폰 등록 프로세스
export async function registerCouponWithSignature(
  masterAddress: string,
  voucherCode: string,
  signatureGenerator: SignatureGenerator
) {
  try {
    // 1. Nonce 생성
    const nonceResponse = await createNonce({ masterAddress });
    const { nonce } = nonceResponse;

    // 2. 서명 생성
    const message = `${masterAddress}${nonce}`;
    const signature = signatureGenerator.sign(message);

    // 3. 쿠폰 등록
    const registerData: RegisterCouponRequest = {
      masterAddress,
      nonce,
      voucherCode,
      signature,
    };

    const result = await registerCoupon(registerData);
    return result;
  } catch (error) {
    console.error('쿠폰 등록 실패:', error);
    throw error;
  }
}

// 서명 검증을 위한 유틸리티 (클라이언트 측에서 사용)
export function createMessageForSignature(masterAddress: string, nonce: string): string {
  return `${masterAddress}${nonce}`;
}

// 에러 메시지 포맷팅
export function formatCouponError(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '알 수 없는 오류가 발생했습니다.';
}

// 쿠폰 상태에 따른 스타일 클래스 반환
export function getCouponStatusClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'text-green-600 bg-green-100';
    case 'EXPIRED':
      return 'text-red-600 bg-red-100';
    case 'DEPLETED':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

// 쿠폰 상태 텍스트 반환
export function getCouponStatusText(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return '사용 가능';
    case 'EXPIRED':
      return '만료됨';
    case 'DEPLETED':
      return '사용 완료';
    default:
      return '알 수 없음';
  }
}

// 날짜 포맷팅
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 금액 포맷팅
export function formatAmount(amount: string, currency: string = 'KRW'): string {
  const numAmount = parseFloat(amount);
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency,
  }).format(numAmount);
}