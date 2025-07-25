// Nonce API 관련 함수들

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface NonceRequest {
  masterAddress: string;
}

export interface NonceResponse {
  nonce: string;
  message?: string;
}

/**
 * masterAddress에 대한 nonce를 요청합니다.
 * @param masterAddress - 마스터 주소
 * @returns nonce 응답
 */
export async function requestNonce(masterAddress: string): Promise<NonceResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/nonce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ masterAddress }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Nonce 요청 실패: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Nonce 요청 실패:', error);
    throw error;
  }
}