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

export interface CreateCouponTransactionRequest {
  masterAddress: string;
  fiatCode: string;
  senderAddress: string;
  recipientAddress: string;
  couponList: Array<{ couponCode: string; amount: string }>;
  estimatedFee: string;
  feeInDollar: string;
  opswalletfeeInDollar: string;
  signedTransaction: string;
  signature: string;
  nonce: string;
  memo?: string;
}

export interface CreateCouponTransactionResponse {
  transactionId: string;
  status: string;
  couponList: Array<{ couponCode: string; usedAmount: string }>;
}