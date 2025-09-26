// 환경 설정
export const ENV = {
  DEV: 'dev',
  TEST: 'test',
  PROD: 'prod'
} as const;

// API 엔드포인트
export const API_ENDPOINTS = {
  BASE_URL: process.env.GAS_COUPON_API_URL || 'http://localhost:9001',
  VOUCHER: '/api/v1/vouchers',
  EXCHANGE_RATE: '/api/v1/exchange-rate',
  SPONSOR_TRANSACTION: '/api/v1/transaction/sponsor',
  TRANSACTION_STATUS: '/api/v1/transaction/status',
  NONCE: '/api/v1/auth/nonce',
  // Purchase API 엔드포인트 (백엔드 실제 경로에 맞게 수정)
  PURCHASE_BASE_URL: process.env.PURCHASE_API_URL || 'http://localhost:3000',
  PURCHASE: {
    BASE: '/buy/v1', // 🔥 기본 경로
    HEALTH: '/buy/v1/health',
    CURRENCIES: '/buy/v1/currencies',
    COUNTRIES: '/buy/v1/countries', // 🔥 지원 국가 목록
    NETWORK_FEES: '/buy/v1/network_fees', // 🔥 네트워크 수수료
    CUSTOMER_LIMITS: (customerId: string) => `/buy/v1/customer/limits/${customerId}`, // 🔥 고객 한도
    CUSTOMER_KYC_STATUS: (customerId: string) => `/buy/v1/customer/kyc-status/${customerId}`, // 🔥 KYC 상태
    PURCHASE_HISTORY: (customerId: string) => `/buy/v1/purchases/by-customer/${customerId}`, // 🔥 구매 히스토리
    QUOTES: '/buy/v1/quotes',
    QUOTES_PROVIDER: '/buy/v1/quotes', // 특정 프로바이더 견적 조회
    TRANSACTIONS: '/buy/v1/transactions',
    PROVIDERS_STATUS: '/buy/v1/providers/status'
  }
} as const;

// 지갑 관련 상수
export const WALLET_CONSTANTS = {
  MNEMONIC_LENGTH: 12,
  DERIVATION_PATHS: {
    BTC: "m/44'/0'/0'/0/0",
    ETH: "m/44'/60'/0'/0/0",
    USDT: "m/44'/60'/0'/0/0",
    ETH_GOERLI: "m/44'/60'/0'/0/1",
    ETH_SEPOLIA: "m/44'/60'/0'/0/2",
    MATIC: "m/44'/60'/0'/0/3",
    BSC: "m/44'/60'/0'/0/4",
    AVAX: "m/44'/60'/0'/0/5"
  }
} as const;

// 가상자산 상수
export const ASSET_CONSTANTS = {
  DEFAULT_ENABLED_ASSETS: ['BTC', 'ETH', 'SOL'],
  STORAGE_KEY: 'enabledAssets'
} as const;

// UI 상수
export const UI_CONSTANTS = {
  COLORS: {
    PRIMARY: '#F2A003',
    SUCCESS: '#6FCF97',
    ERROR: '#EB5757',
    BACKGROUND: '#14151A',
    CARD_BACKGROUND: '#23242A'
  }
} as const; 