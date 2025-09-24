// Purchase API 관련 타입 정의

export interface SupportedCurrency {
  id: string;
  name: string;
  symbol: string;
  network: string;
  minimumAmount: number;
  maximumAmount: number;
  providers: Record<string, boolean>;
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
}

export interface TransactionResponse {
  transactionId: string;
  providerId: string;
  status: TransactionStatus;
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

export enum TransactionStatus {
  PENDING = 'PENDING',
  WAITING_PAYMENT = 'WAITING_PAYMENT',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  KYC_REQUIRED = 'KYC_REQUIRED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
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

export interface CacheStatus {
  status: string;
  cache: {
    lastUpdate: string | null;
    currencyCount: number;
    providers: string[];
    stale: boolean;
  };
  timestamp: string;
}

export interface PurchaseStats {
  status: string;
  stats: {
    totalTransactions: number;
    totalVolume: number;
    averageAmount: number;
    topCurrencies: Array<{
      currency: string;
      count: number;
      volume: number;
    }>;
    providerStats: Record<string, {
      transactions: number;
      volume: number;
      averageTime: string;
    }>;
  };
  timestamp: string;
}

// UI 관련 타입들
export interface PurchaseFormData {
  currency: string;
  amount: string;
  fiatCurrency: string;
  email?: string;
  preferences: {
    prioritizeCost: boolean;
    prioritizeSpeed: boolean;
    preferredProvider?: string;
  };
}

export interface PurchaseStep {
  id: 'quote' | 'confirm' | 'processing' | 'complete' | 'error';
  title: string;
  description: string;
}

export const PURCHASE_STEPS: Record<string, PurchaseStep> = {
  quote: {
    id: 'quote',
    title: '견적 조회',
    description: '최적의 견적을 찾고 있습니다.'
  },
  confirm: {
    id: 'confirm',
    title: '거래 확인',
    description: '거래 내용을 확인하고 진행해주세요.'
  },
  processing: {
    id: 'processing',
    title: '거래 처리중',
    description: '거래가 생성되고 있습니다.'
  },
  complete: {
    id: 'complete',
    title: '거래 완료',
    description: '거래가 성공적으로 생성되었습니다.'
  },
  error: {
    id: 'error',
    title: '오류 발생',
    description: '거래 중 오류가 발생했습니다.'
  }
};

// 지원하는 암호화폐 목록
export const SUPPORTED_CURRENCIES = [
  'BTC',
  'ETH',
  'USDT',
  'SOL',
  'MATIC',
  'BNB',
  'ADA',
  'DOT'
] as const;

export type SupportedCurrencyType = typeof SUPPORTED_CURRENCIES[number];

// 프리셋 금액들
export const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

// 지원하는 법정화폐
export const FIAT_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'KRW', symbol: '₩', name: 'Korean Won' }
] as const;