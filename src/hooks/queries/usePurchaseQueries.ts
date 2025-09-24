import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseService, QuoteRequest, CreateTransactionRequest } from '../../lib/api/purchase';

// React Query 키 상수 (백엔드 실제 API에 맞게 수정)
export const PURCHASE_QUERY_KEYS = {
  health: ['purchase', 'health'] as const,
  currencies: ['purchase', 'currencies'] as const,
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

// 트랜잭션 상태 조회 (providerId 파라미터 추가)
export function usePurchaseTransactionStatus(transactionId: string | null, providerId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: PURCHASE_QUERY_KEYS.transaction(transactionId || ''),
    queryFn: () => (transactionId && providerId) ? purchaseService.getTransactionStatus(transactionId, providerId) : null,
    enabled: enabled && !!transactionId && !!providerId,
    staleTime: 30000,
    refetchInterval: (data, query) => {
      // 완료되지 않은 트랜잭션은 자동 리프레시
      if (data?.status && !['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(data.status)) {
        return 10000; // 10초마다
      }
      return false;
    },
  });
}

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