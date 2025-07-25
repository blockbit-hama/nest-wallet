// 환경 설정
export const ENV = {
  DEV: 'dev',
  TEST: 'test',
  PROD: 'prod'
} as const;

// API 엔드포인트
export const API_ENDPOINTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  VOUCHER: '/api/voucher',
  EXCHANGE_RATE: '/api/exchange-rate',
  COUPON_TRANSACTION: '/api/coupon-transaction',
  NONCE: '/api/nonce'
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
  DEFAULT_ENABLED_ASSETS: ['BTC', 'ETH', 'USDT'],
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