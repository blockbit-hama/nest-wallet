export interface WalletBalance {
  ethBalance: string;
  couponBalance: number;
  address: string;
}

export interface TransferEstimate {
  estimatedCoupon: string;
}

export interface WalletInfo {
  id: string;
  name: string;
  address: string;
}