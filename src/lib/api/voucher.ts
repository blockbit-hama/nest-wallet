import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface RegisterCouponRequest {
  masterAddress: string;
  nonce: string;
  voucherCode: string;
  signature: string;
}

export interface RegisterCouponResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface GetCouponsResponse {
  success: boolean;
  message: string;
  coupons?: any[];
  error?: string;
}

export interface CouponTransferRequest {
  masterAddress: string;
  currencyId: string;
  sender_address: string;
  recipientAddress: string;
  couponList: Array<{
    couponCode: string;
    amount: string;
  }>;
  estimatedFee: string;
  feeInDollar: string;
  opswalletfeeInDollar: string;
  signedTransaction: string;
  signature: string;
  nonce: string;
  memo: string;
}

export interface CouponTransferResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Nonce 생성 API
 * @param data - Nonce 생성 요청 데이터
 * @returns Nonce 응답
 */
export const createNonce = async (data: { masterAddress: string }): Promise<{ nonce: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/nonce`, {
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
  } catch (error) {
    console.error('Nonce 생성 실패:', error);
    throw error;
  }
};

/**
 * 쿠폰 등록 API
 * @param masterAddress - 마스터 주소
 * @param voucherCode - 바우처 코드
 * @param signMessageForCouponAuth - 쿠폰 서버 인증용 서명 함수
 * @returns 등록 결과
 */
export const registerCoupon = async (
  masterAddress: string,
  voucherCode: string,
  signMessageForCouponAuth: (message: string) => Promise<string>,
): Promise<RegisterCouponResponse> => {
  try {
    console.log('1. Starting registerCoupon with:', { masterAddress, voucherCode });
    console.log('1-1. API_BASE_URL:', API_BASE_URL);
    
    // 1. nonce 가져오기
    const nonceResponse = await createNonce({ masterAddress });
    console.log('2. Got nonce response:', nonceResponse);

    // 2. 메시지 생성: masterAddress + nonce (백엔드와 일치)
    const message = `${masterAddress}${nonceResponse.nonce}`;
    console.log('3. Message to sign:', message);
    console.log('3-1. Message length:', message.length);
    
    // 3. 쿠폰 서버 인증용 서명 생성 (1번 방식)
    console.log('4. Calling signMessageForCouponAuth with original message...');
    const signature = await signMessageForCouponAuth(message);
    console.log('4-1. Generated signature:', signature);
    console.log('4-2. Signature length:', signature.length);

    // 4. 쿠폰 등록
    const requestUrl = `${API_BASE_URL}/api/v1/coupons/register`;
    const requestData = {
      masterAddress,
      nonce: nonceResponse.nonce,
      voucherCode,
      signature,
    };
    
    console.log('5. Sending register request to:', requestUrl);
    console.log('5-1. Request data:', requestData);
    
    const response = await axios.post(requestUrl, requestData);
    console.log('6. Got register response:', response.data);
    
    // 서버 응답에 couponCode가 있으면 성공으로 처리
    if (response.data && response.data.couponCode) {
      return {
        success: true,
        message: '쿠폰이 성공적으로 등록되었습니다.',
        data: response.data,
      };
    } else {
      return {
        success: false,
        message: response.data.message || '쿠폰 등록에 실패했습니다.',
        error: response.data.error || 'Unknown error',
      };
    }
  } catch (error) {
    console.error('쿠폰 등록 실패:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * 마스터 주소로 쿠폰 목록 조회
 * @param masterAddress - 마스터 주소
 * @returns 쿠폰 목록
 */
export const getCouponsByMasterAddress = async (masterAddress: string): Promise<GetCouponsResponse> => {
  try {
    console.log('쿠폰 목록 조회 시작, masterAddress:', masterAddress);
    const response = await axios.get(`${API_BASE_URL}/api/v1/coupons/couponlist/${encodeURIComponent(masterAddress)}`);
    console.log('쿠폰 목록 조회 응답:', response.data);
    
    // 서버 응답에 coupons 배열이 있으면 성공으로 처리
    if (response.data && Array.isArray(response.data.coupons)) {
      return {
        success: true,
        message: '쿠폰 목록을 성공적으로 가져왔습니다.',
        coupons: response.data.coupons,
      };
    } else {
      return {
        success: false,
        message: response.data.message || '쿠폰 목록 조회에 실패했습니다.',
        error: response.data.error || 'Unknown error',
      };
    }
  } catch (error) {
    console.error('쿠폰 목록 조회 실패:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '쿠폰 목록 조회에 실패했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * 쿠폰 전송 API
 * @param transferData - 전송 데이터
 * @returns 전송 결과
 */
export const createCouponTransfer = async (transferData: CouponTransferRequest): Promise<CouponTransferResponse> => {
  try {
    console.log('쿠폰 전송 시작:', transferData);
    
    const requestUrl = `${API_BASE_URL}/api/v1/coupons/transfer`;
    const response = await axios.post(requestUrl, transferData);
    
    console.log('쿠폰 전송 응답:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('쿠폰 전송 실패:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '쿠폰 전송에 실패했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};