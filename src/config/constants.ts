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
  PURCHASE_BASE_URL: process.env.PURCHASE_API_URL || 'http://localhost:3001',
  PURCHASE: {
    HEALTH: '/api/buy/v1/health',
    CURRENCIES: '/api/buy/v1/currencies',
    QUOTES: '/api/buy/v1/quotes',
    QUOTES_PROVIDER: '/api/buy/v1/quotes', // 특정 프로바이더 견적 조회
    TRANSACTIONS: '/api/buy/v1/transactions',
    PROVIDERS_STATUS: '/api/buy/v1/providers/status'
    // 사용자별 트랜잭션 조회와 관리자 엔드포인트는 백엔드에 없으므로 제거
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