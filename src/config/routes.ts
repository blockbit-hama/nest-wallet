// 앱 라우트 경로 정의
export const ROUTES = {
  // 메인 페이지
  HOME: '/',
  
  // 지갑 관련
  CREATE_WALLET: '/create-wallet',
  RECOVER_WALLET: '/recover-wallet',
  
  // 전송 관련
  COUPON_TRANSFER: '/coupon-transfer',
  COUPON_SWAP: '/coupon-swap',
  VOUCHER_PURCHASE: '/voucher-purchase',
  
  // 수신 관련
  RECEIVE: '/receive',
  QR_GENERATE: '/qr-generate',
  
  // 설정 관련
  SETTINGS: '/settings',
  ADD_ASSETS: '/add-assets'
} as const;

// 탭 바 네비게이션
export const TAB_ROUTES = [
  { path: ROUTES.HOME, label: '홈', icon: '🏠' },
  { path: ROUTES.COUPON_TRANSFER, label: '전송', icon: '📤' },
  { path: ROUTES.RECEIVE, label: '수신', icon: '📥' },
  { path: ROUTES.SETTINGS, label: '설정', icon: '⚙️' }
] as const; 