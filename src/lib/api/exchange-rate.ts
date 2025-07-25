// 환율 API 관련 함수들

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

export interface ExchangeRateResponse {
  [currencyId: string]: {
    usd: number;
  };
}

/**
 * CoinGecko API를 통해 실시간 환율을 조회합니다.
 * @param currencyId - 통화 ID (예: 'ethereum', 'bitcoin', 'solana')
 * @returns USD 기준 환율
 */
export async function getExchangeRate(currencyId: string): Promise<number> {
  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${currencyId}&vs_currencies=usd`
    );
    
    if (!response.ok) {
      throw new Error(`환율 조회 실패: ${response.status}`);
    }
    
    const data: ExchangeRateResponse = await response.json();
    
    if (!data[currencyId] || !data[currencyId].usd) {
      throw new Error(`환율 정보를 찾을 수 없습니다: ${currencyId}`);
    }
    
    return data[currencyId].usd;
  } catch (error) {
    console.error('환율 조회 중 오류:', error);
    // 기본값 반환 (실패 시)
    return 1.0;
  }
}

/**
 * 통화 ID를 CoinGecko 형식으로 변환합니다.
 * @param currencyId - 원본 통화 ID
 * @returns CoinGecko 형식의 통화 ID
 */
export function normalizeCurrencyId(currencyId: string): string {
  const currencyMap: { [key: string]: string } = {
    'ETH': 'ethereum',
    'BTC': 'bitcoin',
    'SOL': 'solana',
    'USDT': 'tether',
    'USDC': 'usd-coin',
    'ETHEREUM': 'ethereum',
    'BITCOIN': 'bitcoin',
    'SOLANA': 'solana',
    'MATIC': 'matic-network',
    'BSC': 'binancecoin',
    'AVAX': 'avalanche-2',
  };
  
  return currencyMap[currencyId.toUpperCase()] || currencyId.toLowerCase();
}