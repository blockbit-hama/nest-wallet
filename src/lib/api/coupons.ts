// 쿠폰 관련 API 클라이언트
import { 
  RegisterCouponRequest, 
  RegisterCouponResponse, 
  CouponListResponse,
  CreateCouponTransactionRequest,
  CreateCouponTransactionResponse
} from '../../types/coupon';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

// 쿠폰 등록
export async function registerCoupon(data: RegisterCouponRequest): Promise<RegisterCouponResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/coupons/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `쿠폰 등록 실패: ${response.status}`);
  }

  return response.json();
}

// 마스터 주소로 쿠폰 목록 조회
export async function getCouponsByMasterAddress(
  masterAddress: string,
  options?: {
    status?: 'ACTIVE' | 'EXPIRED' | 'DEPLETED';
    page?: number;
    limit?: number;
  }
): Promise<CouponListResponse> {
  const params = new URLSearchParams();
  
  if (options?.status) {
    params.append('status', options.status);
  }
  if (options?.page) {
    params.append('page', options.page.toString());
  }
  if (options?.limit) {
    params.append('limit', options.limit.toString());
  }

  const url = `${API_BASE_URL}/v1/coupons/couponlist/${encodeURIComponent(masterAddress)}?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `쿠폰 목록 조회 실패: ${response.status}`);
  }

  return response.json();
}

// 쿠폰 트랜잭션 생성 (쿠폰 사용)
export async function createCouponTransaction(data: CreateCouponTransactionRequest): Promise<CreateCouponTransactionResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/coupons/transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `쿠폰 트랜잭션 생성 실패: ${response.status}`);
  }

  return response.json();
}