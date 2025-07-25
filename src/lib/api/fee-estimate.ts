// 블록체인 수수료 추정 API 관련 함수들

// Infura API 설정
const INFURA_API_KEY = process.env.NEXT_PUBLIC_INFURA_API_KEY || 'your-infura-api-key';
const INFURA_ENDPOINTS = {
  ethereum: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
  polygon: `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`,
  bsc: 'https://bsc-dataseed1.binance.org/',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

export interface FeeEstimate {
  symbol: string;
  network: string;
  gasPrice: string;
  gasLimit: string;
  estimatedFee: string;
  feeInDollar: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * 이더리움 가스 가격 조회
 */
export async function getEthereumGasPrice(): Promise<FeeEstimate | null> {
  try {
    const response = await fetch(INFURA_ENDPOINTS.ethereum, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`이더리움 가스 가격 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`이더리움 API 오류: ${data.error.message}`);
    }

    const gasPriceWei = parseInt(data.result, 16);
    const gasPriceGwei = gasPriceWei / Math.pow(10, 9);
    
    // 일반적인 가스 리밋 (ETH 전송: 21,000)
    const gasLimit = 21000;
    const estimatedFeeEth = (gasPriceWei * gasLimit) / Math.pow(10, 18);
    
    // ETH 가격 조회 (실제로는 별도 API 호출)
    const ethPrice = await getCryptoPrice('ETH');
    const ethPriceUsd = ethPrice?.price || 2000; // 기본값
    const feeInDollar = estimatedFeeEth * ethPriceUsd;

    return {
      symbol: 'ETH',
      network: 'ethereum',
      gasPrice: gasPriceGwei.toFixed(2),
      gasLimit: gasLimit.toString(),
      estimatedFee: estimatedFeeEth.toFixed(6),
      feeInDollar: feeInDollar.toFixed(2),
      priority: 'medium'
    };
  } catch (error) {
    console.error('이더리움 가스 가격 조회 중 오류:', error);
    return null;
  }
}

/**
 * Polygon 가스 가격 조회
 */
export async function getPolygonGasPrice(): Promise<FeeEstimate | null> {
  try {
    const response = await fetch(INFURA_ENDPOINTS.polygon, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Polygon 가스 가격 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Polygon API 오류: ${data.error.message}`);
    }

    const gasPriceWei = parseInt(data.result, 16);
    const gasPriceGwei = gasPriceWei / Math.pow(10, 9);
    
    const gasLimit = 21000;
    const estimatedFeeMatic = (gasPriceWei * gasLimit) / Math.pow(10, 18);
    
    const maticPrice = await getCryptoPrice('MATIC');
    const maticPriceUsd = maticPrice?.price || 1; // 기본값
    const feeInDollar = estimatedFeeMatic * maticPriceUsd;

    return {
      symbol: 'MATIC',
      network: 'polygon',
      gasPrice: gasPriceGwei.toFixed(2),
      gasLimit: gasLimit.toString(),
      estimatedFee: estimatedFeeMatic.toFixed(6),
      feeInDollar: feeInDollar.toFixed(2),
      priority: 'medium'
    };
  } catch (error) {
    console.error('Polygon 가스 가격 조회 중 오류:', error);
    return null;
  }
}

/**
 * BSC 가스 가격 조회
 */
export async function getBSCGasPrice(): Promise<FeeEstimate | null> {
  try {
    const response = await fetch(INFURA_ENDPOINTS.bsc, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`BSC 가스 가격 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`BSC API 오류: ${data.error.message}`);
    }

    const gasPriceWei = parseInt(data.result, 16);
    const gasPriceGwei = gasPriceWei / Math.pow(10, 9);
    
    const gasLimit = 21000;
    const estimatedFeeBnb = (gasPriceWei * gasLimit) / Math.pow(10, 18);
    
    const bnbPrice = await getCryptoPrice('BSC');
    const bnbPriceUsd = bnbPrice?.price || 300; // 기본값
    const feeInDollar = estimatedFeeBnb * bnbPriceUsd;

    return {
      symbol: 'BSC',
      network: 'bsc',
      gasPrice: gasPriceGwei.toFixed(2),
      gasLimit: gasLimit.toString(),
      estimatedFee: estimatedFeeBnb.toFixed(6),
      feeInDollar: feeInDollar.toFixed(2),
      priority: 'medium'
    };
  } catch (error) {
    console.error('BSC 가스 가격 조회 중 오류:', error);
    return null;
  }
}

/**
 * Avalanche 가스 가격 조회
 */
export async function getAvalancheGasPrice(): Promise<FeeEstimate | null> {
  try {
    const response = await fetch(INFURA_ENDPOINTS.avalanche, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Avalanche 가스 가격 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Avalanche API 오류: ${data.error.message}`);
    }

    const gasPriceWei = parseInt(data.result, 16);
    const gasPriceGwei = gasPriceWei / Math.pow(10, 9);
    
    const gasLimit = 21000;
    const estimatedFeeAvax = (gasPriceWei * gasLimit) / Math.pow(10, 18);
    
    const avaxPrice = await getCryptoPrice('AVAX');
    const avaxPriceUsd = avaxPrice?.price || 20; // 기본값
    const feeInDollar = estimatedFeeAvax * avaxPriceUsd;

    return {
      symbol: 'AVAX',
      network: 'avalanche',
      gasPrice: gasPriceGwei.toFixed(2),
      gasLimit: gasLimit.toString(),
      estimatedFee: estimatedFeeAvax.toFixed(6),
      feeInDollar: feeInDollar.toFixed(2),
      priority: 'medium'
    };
  } catch (error) {
    console.error('Avalanche 가스 가격 조회 중 오류:', error);
    return null;
  }
}

/**
 * 비트코인 수수료 조회 (BlockCypher API)
 */
export async function getBitcoinFee(): Promise<FeeEstimate | null> {
  try {
    const response = await fetch('https://api.blockcypher.com/v1/btc/main');
    
    if (!response.ok) {
      throw new Error(`비트코인 수수료 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    // 평균 수수료 (satoshis per byte)
    const averageFee = data.medium_fee_per_kb / 1000; // per byte
    const estimatedBytes = 225; // 일반적인 BTC 전송 크기
    const estimatedFeeSatoshi = averageFee * estimatedBytes;
    const estimatedFeeBtc = estimatedFeeSatoshi / Math.pow(10, 8);
    
    const btcPrice = await getCryptoPrice('BTC');
    const btcPriceUsd = btcPrice?.price || 40000; // 기본값
    const feeInDollar = estimatedFeeBtc * btcPriceUsd;

    return {
      symbol: 'BTC',
      network: 'bitcoin',
      gasPrice: averageFee.toFixed(2),
      gasLimit: estimatedBytes.toString(),
      estimatedFee: estimatedFeeBtc.toFixed(8),
      feeInDollar: feeInDollar.toFixed(2),
      priority: 'medium'
    };
  } catch (error) {
    console.error('비트코인 수수료 조회 중 오류:', error);
    return null;
  }
}

/**
 * 심볼에 따른 수수료 추정
 */
export async function getFeeEstimate(symbol: string): Promise<FeeEstimate | null> {
  switch (symbol.toUpperCase()) {
    case 'ETH':
      return await getEthereumGasPrice();
    case 'BTC':
      return await getBitcoinFee();
    case 'MATIC':
      return await getPolygonGasPrice();
    case 'BSC':
      return await getBSCGasPrice();
    case 'AVAX':
      return await getAvalancheGasPrice();
    default:
      console.warn(`지원하지 않는 블록체인 심볼: ${symbol}`);
      return null;
  }
}

// 암호화폐 가격 조회 함수 (임시)
async function getCryptoPrice(symbol: string): Promise<{ price: number } | null> {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${getCoinId(symbol)}&vs_currencies=usd`);
    const data = await response.json();
    const coinId = getCoinId(symbol);
    return data[coinId] ? { price: data[coinId].usd } : null;
  } catch (error) {
    console.error('암호화폐 가격 조회 실패:', error);
    return null;
  }
}

function getCoinId(symbol: string): string {
  const coinIds: { [key: string]: string } = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'MATIC': 'matic-network',
    'BSC': 'binancecoin',
    'AVAX': 'avalanche-2',
  };
  return coinIds[symbol.toUpperCase()] || 'ethereum';
} 