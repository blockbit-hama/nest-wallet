// Nonce 관련 API 클라이언트
import { CreateNonceRequest, CreateNonceResponse } from '../../types/coupon';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9001/api';

// Nonce 생성
export async function createNonce(data: CreateNonceRequest): Promise<CreateNonceResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/nonce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Nonce 생성 실패: ${response.status}`);
  }

  return response.json();
}

// 마스터 주소로 Nonce 조회
export async function getNonceByMasterAddress(masterAddress: string): Promise<CreateNonceResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/nonce/${encodeURIComponent(masterAddress)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Nonce 조회 실패: ${response.status}`);
  }

  return response.json();
}