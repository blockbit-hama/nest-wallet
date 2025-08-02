// 쿠폰 관련 공통 타입들

export interface Coupon {
  id: number;
  code: string;
  amount: string;
  amountRemaining: string;
  fiatCode: string;
  masterAddress: string;
  walletGroupId: string;
  voucherCode: string;
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED';
  createDate: string;
  expireDate: string;
  redeemDate: string | null;
  usedCount: number;
}

export interface Voucher {
  id: number;
  code: string;
  amount: string;
  fiatCode: string;
  status: 'ISSUED' | 'EXPIRED' | 'REDEEMED';
  totalCouponsIssued: number;
  maxTotalCoupons?: number;
  createDate: string;
  expireDate: string;
  redeemDate: string | null;
  couponExpireDate: string;
}

export interface CouponSummary {
  totalCount: number;
  activeCount: number;
  expiredCount: number;
  depletedCount: number;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  hasMore: boolean;
}

export interface CouponListResponse {
  masterAddress: string;
  coupons: Coupon[];
  summary: CouponSummary;
  pagination: Pagination;
}

export interface RegisterCouponRequest {
  masterAddress: string;
  nonce: string;
  voucherCode: string;
  signature: string;
}

export interface RegisterCouponResponse {
  masterAddress: string;
  voucherCode: string;
  couponCode: string;
  amount: string;
  fiatCode: string;
  createDate: string;
  expireDate: string;
  status: string;
}

export interface CreateNonceRequest {
  masterAddress: string;
}

export interface CreateNonceResponse {
  nonce: string;
  expiresAt: string;
}

export interface SponsorTransactionRequest {
  masterAddress: string; // 앱고유주소
  signature: string; // masterAddress + nonce의 서명
  nonce: string; // 서버에서 보낸 인증용 인자
  
  currencyId: string; // 송금(스왑) 코인 종류 (필수)
  estimatedFee: string; // 고객 송금시 필요한 예상 수수료 * 1.5
  feeInDollar: string; // estimatedFee의 달러 환산
  opswalletFeeInDollar?: string; // optional - 우리가 독립적으로 먼저 보내 줄 때 필요한 예상 수수료
  
  couponList: Array<{ // 사용할 쿠폰 리스트 (amount 총량은 feeInDollar + opswalletFeeInDollar 보다 커야한다)
    couponCode: string;
    amount: number;
  }>;
  
  senderAddress?: string; // optional - 우리가 독립적으로 고객에게 보내 줄 때 고객 주소
  
  transaction?: { // 고객이 만든 트랜잭션 (이더리움,솔라나 아무거나)
    serializedTransaction: string; // 이더리움은 이것만 필요
    userSignature?: string; // optional
    userPublicKey?: string; // optional
  };
  
  memo?: string;
}

export interface SponsorTransactionResponse {
  uuid: string; // 쿠폰서버에 보낸 행위 대한 대표 ID (transactionId)
  status: string; // 현재 상태 (INIT, PENDING, CONFIRMED, ERROR, RETRY)
}

export interface TransactionStatusResponse {
  id: string; // transactionId
  txid: string | null; // 고객송금트랜잭션의 txid
  currencyId: string;
  status: string; // 현재 상태 (INIT, PENDING, CONFIRMED, ERROR, RETRY, COMPLETED)
}