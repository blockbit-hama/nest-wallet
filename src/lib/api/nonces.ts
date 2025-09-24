// Nonce 관련 API 클라이언트
import { CreateNonceRequest, CreateNonceResponse } from '../../types/coupon';

const API_BASE_URL = process.env.GAS_COUPON_API_URL || 'http://localhost:9001';

// Front 표준 응답 타입
export interface FrontStandardResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Nonce 생성
export async function createNonce(data: CreateNonceRequest): Promise<FrontStandardResponse<CreateNonceResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/auth/nonce`, {
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
        message: responseData.message || `Nonce 생성 실패: ${response.status}`,
        error: responseData.error || 'Unknown error',
        data: responseData,
      };
    }

    return {
      success: true,
      message: 'Nonce가 성공적으로 생성되었습니다.',
      data: responseData,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Nonce 생성 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 마스터 주소로 Nonce 조회
export async function getNonceByMasterAddress(masterAddress: string): Promise<FrontStandardResponse<CreateNonceResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/auth/nonce/${encodeURIComponent(masterAddress)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: responseData.message || `Nonce 조회 실패: ${response.status}`,
        error: responseData.error || 'Unknown error',
        data: responseData,
      };
    }

    return {
      success: true,
      message: 'Nonce를 성공적으로 조회했습니다.',
      data: responseData,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Nonce 조회 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}