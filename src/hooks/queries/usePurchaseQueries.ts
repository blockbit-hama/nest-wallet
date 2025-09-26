import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseService, QuoteRequest, CreateTransactionRequest } from '../../lib/api/purchase';

// React Query 키 상수 (백엔드 실제 API에 맞게 수정)
export const PURCHASE_QUERY_KEYS = {
  health: ['purchase', 'health'] as const,
  currencies: ['purchase', 'currencies'] as const,
  countries: ['purchase', 'countries'] as const, // 🔥 국가 목록 추가
  networkFees: ['purchase', 'network-fees'] as const, // 🔥 네트워크 수수료 추가
  customerLimits: (customerId: string) => ['purchase', 'customer-limits', customerId] as const, // 🔥 고객 한도 추가
  customerKycStatus: (customerId: string) => ['purchase', 'customer-kyc-status', customerId] as const, // 🔥 고객 KYC 상태 추가
  purchaseHistory: (customerId: string, limit?: number) => ['purchase', 'purchase-history', customerId, limit] as const, // 🔥 구매 히스토리 추가
  quotes: (currency: string, amount: number, fiatCurrency: string) =>
    ['purchase', 'quotes', currency, amount, fiatCurrency] as const,
  providerQuote: (providerId: string, currency: string, amount: number, fiatCurrency: string) =>
    ['purchase', 'provider-quote', providerId, currency, amount, fiatCurrency] as const,
  transaction: (transactionId: string) =>
    ['purchase', 'transaction', transactionId] as const,
  providerStatus: ['purchase', 'provider-status'] as const,
};

// 헬스 체크
export function usePurchaseHealth() {
  return useQuery({
    queryKey: PURCHASE_QUERY_KEYS.health,
    queryFn: purchaseService.getHealth,
    staleTime: 30000, // 30초
    refetchInterval: 60000, // 1분마다 리프레시
  });
}

// 지원 통화 조회
export function usePurchaseCurrencies() {
  return useQuery({
    queryKey: PURCHASE_QUERY_KEYS.currencies,
    queryFn: purchaseService.getSupportedCurrencies,
    staleTime: 300000, // 5분
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // 연결 실패는 재시도하지 않음
      if (error?.message?.includes('구매 서비스가 현재 사용할 수 없습니다')) {
        return false;
      }
      return failureCount < 2;
    },
    onError: (error: any) => {
      console.warn('Failed to fetch supported currencies:', error.message);
    },
  });
}

// 🔥 지원 국가 조회
export function usePurchaseCountries() {
  return useQuery({
    queryKey: PURCHASE_QUERY_KEYS.countries,
    queryFn: purchaseService.getSupportedCountries,
    staleTime: 3600000, // 1시간 (국가 정보는 자주 변하지 않음)
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // 연결 실패는 재시도하지 않음
      if (error?.message?.includes('구매 서비스가 현재 사용할 수 없습니다')) {
        return false;
      }
      return failureCount < 2;
    },
    onError: (error: any) => {
      console.warn('Failed to fetch supported countries:', error.message);
    },
  });
}

// 🔥 네트워크 수수료 조회
export function usePurchaseNetworkFees() {
  return useQuery({
    queryKey: PURCHASE_QUERY_KEYS.networkFees,
    queryFn: purchaseService.getNetworkFees,
    staleTime: 300000, // 5분 (네트워크 수수료는 비교적 자주 변함)
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // 연결 실패는 재시도하지 않음
      if (error?.message?.includes('구매 서비스가 현재 사용할 수 없습니다')) {
        return false;
      }
      return failureCount < 2;
    },
    onError: (error: any) => {
      console.warn('Failed to fetch network fees:', error.message);
    },
  });
}

// 견적 조회 (다중 프로바이더)
export function usePurchaseQuotes(
  currency: string,
  amount: number,
  fiatCurrency: string = 'USD',
  options?: { enabled?: boolean; prioritizeCost?: boolean; prioritizeSpeed?: boolean; preferredProvider?: string; userWalletAddress?: string }
) {
  return useQuery({
    queryKey: PURCHASE_QUERY_KEYS.quotes(currency, amount, fiatCurrency),
    queryFn: () => {
      const quoteRequest: QuoteRequest = {
        currency,
        amount,
        fiatCurrency,
        prioritizeCost: options?.prioritizeCost,
        prioritizeSpeed: options?.prioritizeSpeed,
        preferredProvider: options?.preferredProvider,
        userWalletAddress: options?.userWalletAddress,
      };
      return purchaseService.getQuotes(quoteRequest);
    },
    enabled: options?.enabled !== false && currency && amount > 0,
    staleTime: 60000, // 1분 (견적은 자주 변동됨)
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// 특정 프로바이더 견적 조회
export function usePurchaseProviderQuote(
  providerId: string,
  currency: string,
  amount: number,
  fiatCurrency: string = 'USD',
  enabled: boolean = true
) {
  return useQuery({
    queryKey: PURCHASE_QUERY_KEYS.providerQuote(providerId, currency, amount, fiatCurrency),
    queryFn: () => purchaseService.getQuoteFromProvider(providerId, currency, amount, fiatCurrency),
    enabled: enabled && providerId && currency && amount > 0,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// 상태 확인 기능 제거됨 - 단순 중개 모델로 변경

// 프로바이더 상태 조회
export function usePurchaseProviderStatus() {
  return useQuery({
    queryKey: PURCHASE_QUERY_KEYS.providerStatus,
    queryFn: purchaseService.getProviderStatus,
    staleTime: 60000, // 1분
    refetchInterval: 120000, // 2분마다 리프레시
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // 연결 실패는 재시도하지 않음
      if (error?.message?.includes('구매 서비스가 현재 사용할 수 없습니다')) {
        return false;
      }
      return failureCount < 2;
    },
    onError: (error: any) => {
      console.warn('Failed to fetch provider status:', error.message);
    },
  });
}

// 트랜잭션 생성 뮤테이션
export function usePurchaseTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTransactionRequest) =>
      purchaseService.createTransaction(request),
    onSuccess: (data, variables) => {
      // 생성된 트랜잭션을 캐시에 추가
      queryClient.setQueryData(
        PURCHASE_QUERY_KEYS.transaction(data.transactionId),
        data
      );
    },
    onError: (error) => {
      console.error('Transaction creation failed:', error);
    },
  });
}

// 🔥 고객 구매 한도 조회 (구매 페이지 상단 표시용)
export function usePurchaseCustomerLimits(customerId: string | null) {
  return useQuery({
    queryKey: PURCHASE_QUERY_KEYS.customerLimits(customerId || ''),
    queryFn: () => purchaseService.getCustomerLimits(customerId!),
    enabled: !!customerId, // customerId가 있을 때만 실행
    staleTime: 300000, // 5분 (한도 정보는 비교적 안정적)
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // 404는 새로운 사용자일 수 있으므로 재시도하지 않음
      if (error?.response?.status === 404) {
        return false;
      }
      // 연결 실패는 재시도하지 않음
      if (error?.message?.includes('구매 서비스가 현재 사용할 수 없습니다')) {
        return false;
      }
      return failureCount < 2;
    },
    onError: (error: any) => {
      console.warn('Failed to fetch customer limits:', error.message);
    },
  });
}

// 🔥 고객 KYC 상태 조회 (데모용 - 모든 MoonPay 데이터 표시)
export function usePurchaseCustomerKycStatus(customerId: string | null) {
  return useQuery({
    queryKey: PURCHASE_QUERY_KEYS.customerKycStatus(customerId || ''),
    queryFn: () => purchaseService.getCustomerKycStatus(customerId!),
    enabled: !!customerId,
    staleTime: 300000, // 5분
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) {
        return false;
      }
      if (error?.message?.includes('구매 서비스가 현재 사용할 수 없습니다')) {
        return false;
      }
      return failureCount < 2;
    },
    onError: (error: any) => {
      console.warn('Failed to fetch customer KYC status:', error.message);
    },
  });
}

// 🔥 고객 구매 히스토리 조회 (데모용 - 모든 MoonPay 트랜잭션 데이터 표시)
export function usePurchaseHistory(customerId: string | null, limit: number = 50) {
  return useQuery({
    queryKey: PURCHASE_QUERY_KEYS.purchaseHistory(customerId || '', limit),
    queryFn: () => purchaseService.getPurchaseHistory(customerId!, limit),
    enabled: !!customerId,
    staleTime: 60000, // 1분 (구매 히스토리는 자주 업데이트될 수 있음)
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) {
        return false;
      }
      if (error?.message?.includes('구매 서비스가 현재 사용할 수 없습니다')) {
        return false;
      }
      return failureCount < 2;
    },
    onError: (error: any) => {
      console.warn('Failed to fetch purchase history:', error.message);
    },
  });
}

// 헬퍼 함수: 모든 Purchase 관련 캐시 무효화
export function useInvalidatePurchaseQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        return query.queryKey[0] === 'purchase';
      },
    });
  };
}