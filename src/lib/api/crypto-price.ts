// 실시간 암호화폐 가격 API 관련 함수들

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: string;
}

export interface CryptoPriceResponse {
  [id: string]: {
    usd: number;
    usd_24h_change: number;
    usd_24h_vol: number;
    usd_market_cap: number;
    last_updated_at: number;
  };
}

// CoinGecko ID 매핑
const COIN_IDS: { [symbol: string]: string } = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'MATIC': 'matic-network',
  'BSC': 'binancecoin', // BSC는 BNB로 대체
  'AVAX': 'avalanche-2',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  'SHIB': 'shiba-inu',
  'TRX': 'tron',
  'XLM': 'stellar',
  'VET': 'vechain',
};

/**
 * 단일 암호화폐의 실시간 가격 정보를 조회합니다.
 * @param symbol - 암호화폐 심볼 (예: 'BTC', 'ETH')
 * @returns 실시간 가격 정보
 */
export async function getCryptoPrice(symbol: string): Promise<CryptoPrice | null> {
  try {
    const coinId = COIN_IDS[symbol.toUpperCase()];
    if (!coinId) {
      console.warn(`지원하지 않는 암호화폐 심볼: ${symbol}`);
      return null;
    }

    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`
    );

    if (!response.ok) {
      throw new Error(`가격 조회 실패: ${response.status}`);
    }

    const data: CryptoPriceResponse = await response.json();
    const priceData = data[coinId];

    if (!priceData) {
      throw new Error(`가격 정보를 찾을 수 없습니다: ${symbol}`);
    }

    return {
      symbol,
      name: getCryptoName(symbol),
      price: priceData.usd,
      priceChange24h: priceData.usd_24h_change,
      priceChangePercentage24h: priceData.usd_24h_change,
      marketCap: priceData.usd_market_cap,
      volume24h: priceData.usd_24h_vol,
      lastUpdated: new Date(priceData.last_updated_at * 1000).toISOString(),
    };
  } catch (error) {
    console.error(`${symbol} 가격 조회 중 오류:`, error);
    return null;
  }
}

/**
 * 여러 암호화폐의 실시간 가격 정보를 조회합니다.
 * @param symbols - 암호화폐 심볼 배열
 * @returns 실시간 가격 정보 배열
 */
export async function getCryptoPrices(symbols: string[]): Promise<CryptoPrice[]> {
  try {
    const coinIds = symbols
      .map(symbol => COIN_IDS[symbol.toUpperCase()])
      .filter(Boolean)
      .join(',');

    if (!coinIds) {
      console.warn('유효한 암호화폐 심볼이 없습니다.');
      return [];
    }

    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`
    );

    if (!response.ok) {
      throw new Error(`가격 조회 실패: ${response.status}`);
    }

    const data: CryptoPriceResponse = await response.json();
    const results: CryptoPrice[] = [];

    for (const symbol of symbols) {
      const coinId = COIN_IDS[symbol.toUpperCase()];
      if (coinId && data[coinId]) {
        const priceData = data[coinId];
        results.push({
          symbol,
          name: getCryptoName(symbol),
          price: priceData.usd,
          priceChange24h: priceData.usd_24h_change,
          priceChangePercentage24h: priceData.usd_24h_change,
          marketCap: priceData.usd_market_cap,
          volume24h: priceData.usd_24h_vol,
          lastUpdated: new Date(priceData.last_updated_at * 1000).toISOString(),
        });
      }
    }

    return results;
  } catch (error) {
    console.error('암호화폐 가격 조회 중 오류:', error);
    return [];
  }
}

/**
 * 암호화폐 이름을 반환합니다.
 */
function getCryptoName(symbol: string): string {
  const names: { [symbol: string]: string } = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'USDT': 'Tether',
    'USDC': 'USD Coin',
    'MATIC': 'Polygon',
    'BSC': 'BNB',
    'AVAX': 'Avalanche',
    'SOL': 'Solana',
    'ADA': 'Cardano',
    'DOT': 'Polkadot',
    'LINK': 'Chainlink',
    'UNI': 'Uniswap',
    'LTC': 'Litecoin',
    'BCH': 'Bitcoin Cash',
    'XRP': 'Ripple',
    'DOGE': 'Dogecoin',
    'SHIB': 'Shiba Inu',
    'TRX': 'TRON',
    'XLM': 'Stellar',
    'VET': 'VeChain',
  };
  return names[symbol.toUpperCase()] || symbol;
}

/**
 * 가격 변동률에 따른 색상을 반환합니다.
 */
export function getChangeColor(changePercentage: number): string {
  if (changePercentage > 0) {
    return '#6FCF97'; // 초록색 (상승)
  } else if (changePercentage < 0) {
    return '#EB5757'; // 빨간색 (하락)
  } else {
    return '#A0A0B0'; // 회색 (변동 없음)
  }
}

/**
 * 가격을 포맷팅합니다.
 */
export function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    return `$${price.toFixed(6)}`;
  }
}

/**
 * 변동률을 포맷팅합니다.
 */
export function formatChangePercentage(changePercentage: number): string {
  const sign = changePercentage >= 0 ? '+' : '';
  return `${sign}${changePercentage.toFixed(2)}%`;
} 