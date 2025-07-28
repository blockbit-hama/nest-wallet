// 쿠폰 트랜잭션 API 관련 함수들

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001';

export interface CreateCouponTransactionDto {
  masterAddress: string;
  currencyId: string;
  senderAddress: string;
  recipientAddress: string;
  couponList: Array<{
    couponCode: string;
    amount: string;
  }>;
  estimatedFee: string;
  feeInDollar: string;
  opswalletFeeInDollar: string;
  signedTransaction: string;
  signature: string;
  nonce: string;
  memo?: string;
}

export interface CouponTransactionResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * 쿠폰 트랜잭션을 생성합니다.
 * @param transactionData - 트랜잭션 데이터
 * @returns API 응답
 */
export async function createCouponTransaction(
  transactionData: CreateCouponTransactionDto
): Promise<CouponTransactionResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/coupons/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API 호출 실패: ${response.status}`);
    }

    return {
      success: true,
      message: '트랜잭션이 성공적으로 생성되었습니다.',
      data: data,
    };
  } catch (error) {
    console.error('쿠폰 트랜잭션 생성 실패:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}