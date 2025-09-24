// 쿠폰 관련 API 클라이언트
import { 
  RegisterCouponRequest, 
  RegisterCouponResponse, 
  CouponListResponse,
  SponsorTransactionRequest,
  SponsorTransactionResponse,
  TransactionStatusResponse
} from '../../types/coupon';

const API_BASE_URL = process.env.GAS_COUPON_API_URL || 'http://localhost:9001';

// Front 표준 응답 타입
export interface FrontStandardResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// 쿠폰 등록
export async function registerCoupon(data: RegisterCouponRequest): Promise<FrontStandardResponse<RegisterCouponResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/coupons/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: responseData.message || `쿠폰 등록 실패: ${response.status}`,
        error: responseData.error || 'Unknown error',
        data: responseData,
      };
    }

    return {
      success: true,
      message: '쿠폰이 성공적으로 등록되었습니다.',
      data: responseData,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '쿠폰 등록 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 마스터 주소로 쿠폰 목록 조회
export async function getCouponsByMasterAddress(
  masterAddress: string,
  options?: {
    status?: 'ACTIVE' | 'EXPIRED' | 'DEPLETED';
    page?: number;
    limit?: number;
  }
): Promise<FrontStandardResponse<CouponListResponse>> {
  try {
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

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: responseData.message || `쿠폰 목록 조회 실패: ${response.status}`,
        error: responseData.error || 'Unknown error',
        data: responseData,
      };
    }

    return {
      success: true,
      message: '쿠폰 목록을 성공적으로 조회했습니다.',
      data: responseData,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '쿠폰 목록 조회 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 스폰서 트랜잭션 생성 (쿠폰 사용)
export async function sponsorTransaction(data: SponsorTransactionRequest): Promise<FrontStandardResponse<SponsorTransactionResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/transaction/sponsor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: responseData.message || `스폰서 트랜잭션 생성 실패: ${response.status}`,
        error: responseData.error || 'Unknown error',
        data: responseData,
      };
    }

    return {
      success: true,
      message: '스폰서 트랜잭션이 성공적으로 생성되었습니다.',
      data: responseData,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '스폰서 트랜잭션 생성 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 트랜잭션 상태 조회
export async function getTransactionStatus(transactionId: string): Promise<FrontStandardResponse<TransactionStatusResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/transaction/status/${transactionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: responseData.message || `트랜잭션 상태 조회 실패: ${response.status}`,
        error: responseData.error || 'Unknown error',
        data: responseData,
      };
    }

    return {
      success: true,
      message: '트랜잭션 상태를 성공적으로 조회했습니다.',
      data: responseData,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '트랜잭션 상태 조회 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}