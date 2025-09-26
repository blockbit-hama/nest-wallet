import axios from 'axios';
import { API_ENDPOINTS } from '../../config/constants';

// Purchase API 타입 정의 (백엔드 응답 구조에 맞게 수정)
export interface SupportedCurrency {
  id: string;
  name: string;
  symbol: string;
  providers: {
    [key: string]: ProviderCurrencyInfo;
  };
}

export interface ProviderCurrencyInfo {
  available: boolean;
  minAmount: number;
  maxAmount: number;
  fees: FeeStructure;
  networks?: string[];
}

export interface FeeStructure {
  fixed?: number;
  percentage?: number;
  total?: number;
}

export interface QuoteRequest {
  currency: string;
  amount: number;
  fiatCurrency?: string;
  prioritizeCost?: boolean;
  prioritizeSpeed?: boolean;
  preferredProvider?: string;
  userWalletAddress?: string;
}

export interface QuoteResponse {
  providerId: 'moonpay' | 'topperpay';
  currency: string;
  cryptoAmount: number;
  fiatAmount: number;
  totalCost: number;
  baseFee: number;
  exchangeRate: number;
  processingTime: string;
  successRate: number;
  userRating: number;
  score?: number;
  paymentMethods: string[];
  additionalInfo: any;
  expiresAt: Date;
}

export interface OptimizationResult {
  recommended: QuoteResponse;
  alternatives: QuoteResponse[];
  reasons: string[];
  timestamp: Date;
}

export interface CreateTransactionRequest {
  providerId: string;
  currency: string;
  amount: number;
  userWalletAddress: string;
  userEmail: string;
  returnUrl: string;
  webhookUrl?: string;
  masterAddress?: string; // 🔥 지갑앱의 고유 ID (masterAddress)
  externalCustomerId?: string; // 🔥 외부 고객 ID (masterAddress와 동일)
  externalTransactionId?: string; // 🔥 외부 트랜잭션 ID (로컬 추적용)
}

export interface TransactionResponse {
  transactionId: string;
  providerId: string;
  status: string;
  paymentUrl?: string;
  paymentId?: string;
  cryptoAmount: number;
  fiatAmount: number;
  currency: string;
  userWalletAddress: string;
  userEmail?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  txHash?: string;
  metadata?: any;
  kycData?: any;
  events?: any[];
}

export interface ProviderStatus {
  status: string;
  providers: Record<string, {
    available: boolean;
    lastChecked: string;
    error?: string;
  }>;
  timestamp: string;
}

// 🔥 Customer Limits 타입 정의 (MoonPay API 응답 구조)
export interface CustomerLimits {
  customerId: string;
  externalCustomerId: string;
  kycStatus: string;
  kycLevel: number;
  limits: PurchaseLimit[];
  createdAt?: string;
  updatedAt?: string;
  liveMode?: boolean;
}

export interface PurchaseLimit {
  type: string; // 예: 'buy_credit_debit_card', 'buy_bank_transfer', 'sell_credit_debit_card'
  dailyLimit: number;
  dailyLimitRemaining: number;
  monthlyLimit: number;
  monthlyLimitRemaining: number;
  yearlyLimit: number;
  yearlyLimitRemaining: number;
}

// 🔥 Customer KYC Status 타입 정의
export interface CustomerKycStatus {
  customerId: string;
  externalCustomerId: string;
  kycStatus: string;
  kycLevel: number;
  limits: PurchaseLimit[];
  createdAt?: string;
  updatedAt?: string;
  liveMode?: boolean;
  fallback?: boolean;
  transactionId?: string;
  message?: string;
}

// 🔥 Purchase History 타입 정의 (MoonPay 트랜잭션 응답 구조)
export interface PurchaseHistoryItem {
  id: string;
  status: string;
  customerId?: string;
  externalCustomerId?: string;
  currency: string;
  amount: number;
  cryptoAmount?: number;
  fiatAmount?: number;
  fiatCurrency: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  failedAt?: string;
  kycStatus?: string;
  kycLevel?: number;
  walletAddress?: string;
  txHash?: string;
  metadata?: any;
}


// Purchase API 클라이언트
const purchaseApi = axios.create({
  baseURL: API_ENDPOINTS.PURCHASE_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 응답 인터셉터
purchaseApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED') {
      console.error('Purchase API Error: Connection refused - Backend server is not running');
      throw new Error('구매 서비스가 현재 사용할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } else if (error.response?.status >= 500) {
      console.error('Purchase API Error: Server error -', error.response?.data || error.message);
      throw new Error('구매 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } else if (error.response?.status === 404) {
      console.error('Purchase API Error: Endpoint not found -', error.config?.url);
      throw new Error('요청한 기능을 찾을 수 없습니다.');
    } else {
      console.error('Purchase API Error:', error.response?.data || error.message);
      throw error;
    }
  }
);

// Purchase API 함수들
export const purchaseService = {
  // 헬스 체크
  async getHealth() {
    const response = await purchaseApi.get(API_ENDPOINTS.PURCHASE.HEALTH);
    return response.data;
  },

  // 지원 통화 조회
  async getSupportedCurrencies(): Promise<Record<string, SupportedCurrency>> {
    const response = await purchaseApi.get(API_ENDPOINTS.PURCHASE.CURRENCIES);
    return response.data;
  },

  // 🔥 지원 국가 조회
  async getSupportedCountries(): Promise<any[]> {
    const response = await purchaseApi.get(API_ENDPOINTS.PURCHASE.COUNTRIES);
    return response.data;
  },

  // 🔥 네트워크 수수료 조회
  async getNetworkFees(): Promise<any> {
    const response = await purchaseApi.get(API_ENDPOINTS.PURCHASE.NETWORK_FEES);
    return response.data;
  },

  // 견적 조회 (다중 프로바이더)
  async getQuotes(quoteRequest: QuoteRequest): Promise<OptimizationResult> {
    const response = await purchaseApi.post(API_ENDPOINTS.PURCHASE.QUOTES, quoteRequest);
    return response.data;
  },

  // 특정 프로바이더 견적 조회
  async getQuoteFromProvider(
    providerId: string,
    currency: string,
    amount: number,
    fiatCurrency: string = 'USD'
  ): Promise<QuoteResponse> {
    const response = await purchaseApi.get(
      `${API_ENDPOINTS.PURCHASE.QUOTES_PROVIDER}/${providerId}`,
      {
        params: {
          currency,
          amount,
          fiatCurrency
        }
      }
    );
    return response.data.quote;
  },

  // 트랜잭션 생성 (Widget URL 방식)
  async createTransaction(request: CreateTransactionRequest): Promise<TransactionResponse> {
    const response = await purchaseApi.post(API_ENDPOINTS.PURCHASE.TRANSACTIONS, request);
    return response.data;
  },

  // 트랜잭션 상태 조회 (providerId 파라미터 추가)
  async getTransactionStatus(transactionId: string, providerId: string): Promise<TransactionResponse | null> {
    try {
      const response = await purchaseApi.get(`${API_ENDPOINTS.PURCHASE.TRANSACTIONS}/${transactionId}?providerId=${providerId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  // 프로바이더 상태 조회
  async getProviderStatus(): Promise<ProviderStatus> {
    const response = await purchaseApi.get(API_ENDPOINTS.PURCHASE.PROVIDERS_STATUS);
    return response.data;
  },

  // 🔥 고객 구매 한도 조회 (MasterAddress = externalCustomerId)
  async getCustomerLimits(customerId: string): Promise<CustomerLimits> {
    const response = await purchaseApi.get(API_ENDPOINTS.PURCHASE.CUSTOMER_LIMITS(customerId));
    return response.data;
  },

  // 🔥 고객 KYC 상태 조회 (MasterAddress = externalCustomerId)
  async getCustomerKycStatus(customerId: string): Promise<CustomerKycStatus> {
    const response = await purchaseApi.get(API_ENDPOINTS.PURCHASE.CUSTOMER_KYC_STATUS(customerId));
    return response.data;
  },

  // 🔥 고객 구매 히스토리 조회 (MasterAddress = externalCustomerId)
  async getPurchaseHistory(customerId: string, limit: number = 50): Promise<PurchaseHistoryItem[]> {
    const response = await purchaseApi.get(`${API_ENDPOINTS.PURCHASE.PURCHASE_HISTORY(customerId)}?limit=${limit}`);
    return response.data;
  }
};

export default purchaseService;