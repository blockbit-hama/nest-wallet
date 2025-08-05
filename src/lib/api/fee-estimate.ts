// 블록체인 수수료 추정 API 관련 함수들

// Infura API 설정
const INFURA_API_KEY = process.env.NEXT_PUBLIC_INFURA_API_KEY || 'your-infura-api-key';
const INFURA_ENDPOINTS = {
  ethereum: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
  polygon: `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`,
  bsc: 'https://bsc-dataseed1.binance.org/',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

// 솔라나 RPC 엔드포인트
const SOLANA_ENDPOINTS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
};

export interface FeeEstimate {
  symbol: string;
  network: string;
  gasPrice: string;
  gasLimit: string;
  estimatedFee: string;
  feeInDollar: number;
  priority: 'low' | 'medium' | 'high';
}

// 솔라나 수수료 추정 인터페이스
export interface SolanaFeeEstimate {
  symbol: string;
  network: string;
  feeInLamports: number;
  feeInSol: string;
  feeInDollar: number;
  priority: 'low' | 'medium' | 'high';
  computeUnits: number;
}

// 새로운 인터페이스: 트랜잭션별 가스 추정
export interface TransactionGasEstimate {
  from: string;
  to: string;
  value: string;
  data?: string;
  symbol: string;
  network: string;
}

// 솔라나 트랜잭션 추정 인터페이스
export interface SolanaTransactionEstimate {
  from: string;
  to: string;
  amount: string;
  symbol: string;
  network: string;
  transactionType?: 'SOL_TRANSFER' | 'SPL_TOKEN_TRANSFER' | 'SWAP' | 'COMPLEX_DEFI' | 'CUSTOM';
  customData?: string;
}

// 트랜잭션 타입별 기본 가스 리밋
export const DEFAULT_GAS_LIMITS = {
  ETH_TRANSFER: 21000,
  ERC20_TRANSFER: 65000,
  ERC20_APPROVE: 46000,
  SWAP: 200000,
  COMPLEX_DEFI: 500000,
  NFT_TRANSFER: 100000,
  CONTRACT_DEPLOY: 1000000,
} as const;

// 솔라나 트랜잭션 타입별 기본 수수료 (lamports)
export const SOLANA_DEFAULT_FEES = {
  SOL_TRANSFER: 5000, // 기본 SOL 전송
  SPL_TOKEN_TRANSFER: 5000, // SPL 토큰 전송
  SWAP: 10000, // 스왑 트랜잭션
  COMPLEX_DEFI: 15000, // 복잡한 DeFi 트랜잭션
  NFT_TRANSFER: 5000, // NFT 전송
  CUSTOM: 5000, // 커스텀 트랜잭션
} as const;

// 솔라나 컴퓨트 유닛 (기본값)
export const SOLANA_COMPUTE_UNITS: { [key: string]: number } = {
  SOL_TRANSFER: 200000,
  SPL_TOKEN_TRANSFER: 200000,
  SWAP: 400000,
  COMPLEX_DEFI: 600000,
  NFT_TRANSFER: 200000,
  CUSTOM: 200000,
};

/**
 * 트랜잭션 데이터로 가스 리밋 추정
 */
export async function estimateGasLimit(
  network: string,
  transaction: {
    from: string;
    to: string;
    value: string;
    data?: string;
  }
): Promise<number> {
  try {
    const endpoint = getNetworkEndpoint(network);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_estimateGas',
        params: [{
          from: transaction.from,
          to: transaction.to,
          value: transaction.value,
          data: transaction.data || '0x'
        }],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`가스 추정 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`가스 추정 API 오류: ${data.error.message}`);
    }

    const estimatedGas = parseInt(data.result, 16);
    
    // 안전 마진 추가 (20%)
    const gasWithMargin = Math.ceil(estimatedGas * 1.2);
    
    return gasWithMargin;
  } catch (error) {
    console.error('가스 추정 중 오류:', error);
    // 기본값 반환
    return getDefaultGasLimit(transaction.data);
  }
}

/**
 * 트랜잭션 데이터로 기본 가스 리밋 추정
 */
function getDefaultGasLimit(data?: string): number {
  if (!data || data === '0x') {
    return DEFAULT_GAS_LIMITS.ETH_TRANSFER;
  }
  
  // 함수 시그니처 분석
  const functionSignature = data.slice(0, 10);
  
  switch (functionSignature) {
    case '0xa9059cbb': // transfer(address,uint256)
      return DEFAULT_GAS_LIMITS.ERC20_TRANSFER;
    case '0x095ea7b3': // approve(address,uint256)
      return DEFAULT_GAS_LIMITS.ERC20_APPROVE;
    case '0x38ed1739': // swapExactTokensForTokens
    case '0x7ff36ab5': // swapExactETHForTokens
    case '0x18cbafe5': // swapExactTokensForETH
      return DEFAULT_GAS_LIMITS.SWAP;
    case '0x23b872dd': // transferFrom(address,address,uint256)
      return DEFAULT_GAS_LIMITS.NFT_TRANSFER;
    default:
      return DEFAULT_GAS_LIMITS.COMPLEX_DEFI;
  }
}

/**
 * 네트워크 엔드포인트 가져오기
 */
function getNetworkEndpoint(network: string): string {
  switch (network.toLowerCase()) {
    case 'ethereum':
    case 'eth':
      return INFURA_ENDPOINTS.ethereum;
    case 'polygon':
    case 'matic':
      return INFURA_ENDPOINTS.polygon;
    case 'bsc':
    case 'binance':
      return INFURA_ENDPOINTS.bsc;
    case 'avalanche':
    case 'avax':
      return INFURA_ENDPOINTS.avalanche;
    default:
      return INFURA_ENDPOINTS.ethereum;
  }
}

/**
 * 트랜잭션별 정확한 수수료 추정
 */
export async function estimateTransactionFee(
  transaction: TransactionGasEstimate
): Promise<FeeEstimate | null> {
  try {
    // 1. 가스 리밋 추정
    const gasLimit = await estimateGasLimit(transaction.network, {
      from: transaction.from,
      to: transaction.to,
      value: transaction.value,
      data: transaction.data
    });

    // 2. 가스 가격 조회
    const gasPriceEstimate = await getGasPrice(transaction.network);
    if (!gasPriceEstimate) {
      throw new Error('가스 가격 조회 실패');
    }

    // 3. 총 수수료 계산
    const gasPriceWei = parseInt(gasPriceEstimate.gasPrice, 16);
    const estimatedFeeWei = gasPriceWei * gasLimit;
    const estimatedFeeEth = estimatedFeeWei / Math.pow(10, 18);

    // 4. USD 환산
    const cryptoPrice = await getCryptoPrice(transaction.symbol);
    const cryptoPriceUsd = cryptoPrice?.price || getDefaultPrice(transaction.symbol);
    const feeInDollar = estimatedFeeEth * cryptoPriceUsd;

    return {
      symbol: transaction.symbol,
      network: transaction.network,
      gasPrice: (gasPriceWei / Math.pow(10, 9)).toFixed(2), // Gwei
      gasLimit: gasLimit.toString(),
      estimatedFee: estimatedFeeEth.toString(),
      feeInDollar: feeInDollar,
      priority: 'medium'
    };
  } catch (error) {
    console.error('트랜잭션 수수료 추정 실패:', error);
    return null;
  }
}

/**
 * 네트워크별 가스 가격 조회
 */
async function getGasPrice(network: string): Promise<{ gasPrice: string } | null> {
  try {
    const endpoint = getNetworkEndpoint(network);
    
    const response = await fetch(endpoint, {
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
      throw new Error(`가스 가격 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`가스 가격 API 오류: ${data.error.message}`);
    }

    return { gasPrice: data.result };
  } catch (error) {
    console.error('가스 가격 조회 중 오류:', error);
    return null;
  }
}

/**
 * 기본 암호화폐 가격
 */
function getDefaultPrice(symbol: string): number {
  const defaultPrices: { [key: string]: number } = {
    'ETH': 2000,
    'BTC': 40000,
    'MATIC': 1,
    'BSC': 300,
    'AVAX': 20,
  };
  return defaultPrices[symbol.toUpperCase()] || 2000;
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
      feeInDollar: feeInDollar,
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
      feeInDollar: feeInDollar,
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
      feeInDollar: feeInDollar,
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
      feeInDollar: feeInDollar,
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
      feeInDollar: feeInDollar,
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

/**
 * ERC20 토큰 전송을 위한 트랜잭션 데이터 생성
 */
export function createERC20TransferData(
  toAddress: string,
  amount: string,
  decimals: number = 18
): string {
  // transfer(address,uint256) 함수 시그니처: 0xa9059cbb
  const functionSignature = '0xa9059cbb';
  
  // 주소를 32바이트로 패딩 (앞에 0x 제거 후 24자리 0으로 패딩)
  const paddedAddress = toAddress.slice(2).padStart(64, '0');
  
  // 금액을 wei 단위로 변환하고 32바이트로 패딩
  const amountWei = (parseFloat(amount) * Math.pow(10, decimals)).toString(16);
  const paddedAmount = amountWei.padStart(64, '0');
  
  return functionSignature + paddedAddress + paddedAmount;
}

/**
 * ERC20 토큰 승인을 위한 트랜잭션 데이터 생성
 */
export function createERC20ApproveData(
  spenderAddress: string,
  amount: string,
  decimals: number = 18
): string {
  // approve(address,uint256) 함수 시그니처: 0x095ea7b3
  const functionSignature = '0x095ea7b3';
  
  const paddedAddress = spenderAddress.slice(2).padStart(64, '0');
  const amountWei = (parseFloat(amount) * Math.pow(10, decimals)).toString(16);
  const paddedAmount = amountWei.padStart(64, '0');
  
  return functionSignature + paddedAddress + paddedAmount;
}

/**
 * 트랜잭션 데이터에서 함수 시그니처 분석
 */
export function analyzeTransactionData(data: string): {
  functionName: string;
  gasEstimate: number;
  description: string;
} {
  if (!data || data === '0x') {
    return {
      functionName: 'ETH_TRANSFER',
      gasEstimate: DEFAULT_GAS_LIMITS.ETH_TRANSFER,
      description: '이더리움 전송'
    };
  }
  
  const functionSignature = data.slice(0, 10);
  
  switch (functionSignature) {
    case '0xa9059cbb':
      return {
        functionName: 'ERC20_TRANSFER',
        gasEstimate: DEFAULT_GAS_LIMITS.ERC20_TRANSFER,
        description: 'ERC20 토큰 전송'
      };
    case '0x095ea7b3':
      return {
        functionName: 'ERC20_APPROVE',
        gasEstimate: DEFAULT_GAS_LIMITS.ERC20_APPROVE,
        description: 'ERC20 토큰 승인'
      };
    case '0x23b872dd':
      return {
        functionName: 'ERC20_TRANSFER_FROM',
        gasEstimate: DEFAULT_GAS_LIMITS.NFT_TRANSFER,
        description: 'ERC20 토큰 전송 (from)'
      };
    case '0x38ed1739':
      return {
        functionName: 'UNISWAP_SWAP',
        gasEstimate: DEFAULT_GAS_LIMITS.SWAP,
        description: 'Uniswap 토큰 스왑'
      };
    case '0x7ff36ab5':
      return {
        functionName: 'UNISWAP_SWAP_ETH',
        gasEstimate: DEFAULT_GAS_LIMITS.SWAP,
        description: 'Uniswap ETH 스왑'
      };
    case '0x18cbafe5':
      return {
        functionName: 'UNISWAP_SWAP_TO_ETH',
        gasEstimate: DEFAULT_GAS_LIMITS.SWAP,
        description: 'Uniswap ETH로 스왑'
      };
    default:
      return {
        functionName: 'UNKNOWN_CONTRACT_CALL',
        gasEstimate: DEFAULT_GAS_LIMITS.COMPLEX_DEFI,
        description: '복잡한 스마트 컨트랙트 호출'
      };
  }
}

/**
 * 트랜잭션별 정확한 수수료 추정 (고급 버전)
 */
export async function estimateAdvancedTransactionFee(
  transaction: TransactionGasEstimate & {
    transactionType?: 'ETH_TRANSFER' | 'ERC20_TRANSFER' | 'SWAP' | 'CUSTOM';
    customData?: string;
  }
): Promise<FeeEstimate | null> {
  try {
    let transactionData = transaction.data || '0x';
    
    // 트랜잭션 타입에 따라 데이터 생성
    if (transaction.transactionType === 'ERC20_TRANSFER' && transaction.customData) {
      // ERC20 전송인 경우 함수 데이터 생성
      const [tokenAddress, amount] = transaction.customData.split(',');
      transactionData = createERC20TransferData(transaction.to, amount);
    }
    
    // 가스 리밋 추정
    const gasLimit = await estimateGasLimit(transaction.network, {
      from: transaction.from,
      to: transaction.to,
      value: transaction.value,
      data: transactionData
    });

    // 가스 가격 조회
    const gasPriceEstimate = await getGasPrice(transaction.network);
    if (!gasPriceEstimate) {
      throw new Error('가스 가격 조회 실패');
    }

    // 총 수수료 계산
    const gasPriceWei = parseInt(gasPriceEstimate.gasPrice, 16);
    const estimatedFeeWei = gasPriceWei * gasLimit;
    const estimatedFeeEth = estimatedFeeWei / Math.pow(10, 18);

    // USD 환산
    const cryptoPrice = await getCryptoPrice(transaction.symbol);
    const cryptoPriceUsd = cryptoPrice?.price || getDefaultPrice(transaction.symbol);
    const feeInDollar = estimatedFeeEth * cryptoPriceUsd;

    // 트랜잭션 분석
    const analysis = analyzeTransactionData(transactionData);

    return {
      symbol: transaction.symbol,
      network: transaction.network,
      gasPrice: (gasPriceWei / Math.pow(10, 9)).toFixed(2), // Gwei
      gasLimit: gasLimit.toString(),
      estimatedFee: estimatedFeeEth.toFixed(6),
      feeInDollar: feeInDollar,
      priority: 'medium'
    };
  } catch (error) {
    console.error('고급 트랜잭션 수수료 추정 실패:', error);
    return null;
  }
} 

/**
 * 솔라나 수수료 추정
 */
export async function estimateSolanaFee(
  transaction: SolanaTransactionEstimate
): Promise<SolanaFeeEstimate | null> {
  try {
    console.log('솔라나 수수료 추정 시작:', transaction);

    // 솔라나 RPC 연결
    const { Connection } = await import('@solana/web3.js');
    const connection = new Connection(SOLANA_ENDPOINTS.mainnet);

    // 1. 최신 수수료 조회
    const { feeCalculator } = await connection.getRecentBlockhash();
    const baseFee = feeCalculator.lamportsPerSignature;

    // 2. 트랜잭션 타입에 따른 수수료 계산
    let totalFee = baseFee;
    let computeUnits = SOLANA_COMPUTE_UNITS.SOL_TRANSFER;

    switch (transaction.transactionType) {
      case 'SPL_TOKEN_TRANSFER':
        totalFee = baseFee * 2; // 토큰 전송은 더 많은 수수료
        computeUnits = SOLANA_COMPUTE_UNITS.SPL_TOKEN_TRANSFER;
        break;
      case 'SWAP':
        totalFee = baseFee * 3; // 스왑은 더 많은 수수료
        computeUnits = SOLANA_COMPUTE_UNITS.SWAP;
        break;
      case 'COMPLEX_DEFI':
        totalFee = baseFee * 4; // 복잡한 DeFi 트랜잭션
        computeUnits = SOLANA_COMPUTE_UNITS.COMPLEX_DEFI;
        break;
      default:
        totalFee = baseFee;
        computeUnits = SOLANA_COMPUTE_UNITS.SOL_TRANSFER;
    }

    // 3. SOL로 변환 (1 SOL = 1,000,000,000 lamports)
    const feeInSol = totalFee / 1000000000;

    // 4. USD 환산
    const solPrice = await getCryptoPrice('SOL');
    const solPriceUsd = solPrice?.price || 100; // 기본값 $100
    const feeInDollar = feeInSol * solPriceUsd;

    return {
      symbol: 'SOL',
      network: 'solana',
      feeInLamports: totalFee,
      feeInSol: feeInSol.toFixed(9),
      feeInDollar: feeInDollar,
      priority: 'medium',
      computeUnits: computeUnits
    };
  } catch (error) {
    console.error('솔라나 수수료 추정 실패:', error);
    return getDefaultSolanaFee();
  }
}

/**
 * 기본 솔라나 수수료 (fallback)
 */
function getDefaultSolanaFee(): SolanaFeeEstimate {
  return {
    symbol: 'SOL',
    network: 'solana',
    feeInLamports: 5000,
    feeInSol: '0.000005',
    feeInDollar: 0.0005,
    priority: 'medium',
    computeUnits: 200000
  };
}

/**
 * 솔라나 네트워크 상태 조회
 */
export async function getSolanaNetworkStatus(): Promise<{
  slot: number;
  blockTime: number;
  feeCalculator: any;
} | null> {
  try {
    const { Connection } = await import('@solana/web3.js');
    const connection = new Connection(SOLANA_ENDPOINTS.mainnet);

    const currentSlot = await connection.getSlot();
    const [blockTime, { feeCalculator }] = await Promise.all([
      connection.getBlockTime(currentSlot),
      connection.getRecentBlockhash()
    ]);

    return {
      slot: currentSlot,
      blockTime: blockTime || 0,
      feeCalculator
    };
  } catch (error) {
    console.error('솔라나 네트워크 상태 조회 실패:', error);
    return null;
  }
}

/**
 * 솔라나 트랜잭션 시뮬레이션으로 정확한 수수료 추정
 */
export async function simulateSolanaTransaction(
  transaction: SolanaTransactionEstimate
): Promise<SolanaFeeEstimate | null> {
  try {
    const { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction } = await import('@solana/web3.js');
    const connection = new Connection(SOLANA_ENDPOINTS.mainnet);

    // 솔라나 트랜잭션 생성
    const solTransaction = new Transaction();
    
    // SOL 전송 명령어 추가
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(transaction.from),
      toPubkey: new PublicKey(transaction.to),
      lamports: parseFloat(transaction.amount) * LAMPORTS_PER_SOL,
    });

    solTransaction.add(transferInstruction);

    // 최신 블록해시 가져오기
    const { blockhash } = await connection.getLatestBlockhash();
    solTransaction.recentBlockhash = blockhash;
    solTransaction.feePayer = new PublicKey(transaction.from);

    // 트랜잭션 시뮬레이션
    const simulation = await connection.simulateTransaction(solTransaction);
    
    if (simulation.value.err) {
      console.error('솔라나 트랜잭션 시뮬레이션 실패:', simulation.value.err);
      return getDefaultSolanaFee();
    }

    // 수수료 계산 (시뮬레이션에서 fee가 없을 수 있음)
    const feeInLamports = (simulation.value as any).fee || 5000;
    const feeInSol = feeInLamports / LAMPORTS_PER_SOL;

    // USD 환산
    const solPrice = await getCryptoPrice('SOL');
    const solPriceUsd = solPrice?.price || 100;
    const feeInDollar = feeInSol * solPriceUsd;

    return {
      symbol: 'SOL',
      network: 'solana',
      feeInLamports: feeInLamports,
      feeInSol: feeInSol.toFixed(9),
      feeInDollar: feeInDollar,
      priority: 'medium',
      computeUnits: simulation.value.unitsConsumed || 200000
    };
  } catch (error) {
    console.error('솔라나 트랜잭션 시뮬레이션 실패:', error);
    return getDefaultSolanaFee();
  }
} 

/**
 * 솔라나 동적 수수료 조정
 */
export interface SolanaDynamicFee {
  baseFee: number;
  priorityFee: number;
  computeUnitPrice: number;
  totalFee: number;
  feeInSol: string;
  feeInDollar: number;
  reason: string;
}

/**
 * 솔라나 네트워크 혼잡도에 따른 동적 수수료 계산
 */
export async function calculateSolanaDynamicFee(
  transaction: SolanaTransactionEstimate,
  priority: 'low' | 'medium' | 'high' = 'medium'
): Promise<SolanaDynamicFee | null> {
  try {
    const { Connection } = await import('@solana/web3.js');
    const connection = new Connection(SOLANA_ENDPOINTS.mainnet);

    // 1. 현재 네트워크 상태 조회
    const networkStatus = await getSolanaNetworkStatus();
    if (!networkStatus) {
      throw new Error('네트워크 상태 조회 실패');
    }

    // 2. SOL 가격 조회
    const solPrice = await getCryptoPrice('SOL');
    const solPriceUsd = solPrice?.price || 100;

    // 3. 기본 수수료
    const baseFee = networkStatus.feeCalculator.lamportsPerSignature;

    // 4. 우선순위별 추가 수수료
    let priorityFee = 0;
    switch (priority) {
      case 'low':
        priorityFee = 0;
        break;
      case 'medium':
        priorityFee = baseFee * 0.5; // 50% 추가
        break;
      case 'high':
        priorityFee = baseFee * 2; // 200% 추가
        break;
    }

    // 5. SOL 가격에 따른 동적 조정
    let priceAdjustment = 1.0;
    if (solPriceUsd > 500) {
      // SOL 가격이 $500 이상이면 수수료 조정 고려
      priceAdjustment = Math.min(solPriceUsd / 500, 3.0); // 최대 3배까지만
    }

    // 6. 컴퓨트 유닛 가격 (동적)
    const computeUnitPrice = Math.ceil(baseFee / 200000 * priceAdjustment); // 기본 200,000 units 기준

    // 7. 총 수수료 계산
    const totalFee = Math.ceil((baseFee + priorityFee) * priceAdjustment);

    // 8. SOL로 변환
    const feeInSol = totalFee / 1000000000;

    // 9. USD 환산
    const feeInDollar = feeInSol * solPriceUsd;

    // 10. 조정 이유 설명
    let reason = '기본 수수료';
    if (priorityFee > 0) {
      reason += ` + 우선순위 수수료 (${priority})`;
    }
    if (priceAdjustment > 1.0) {
      reason += ` + 가격 조정 (${priceAdjustment.toFixed(2)}x)`;
    }

    return {
      baseFee,
      priorityFee,
      computeUnitPrice,
      totalFee,
      feeInSol: feeInSol.toFixed(9),
      feeInDollar: feeInDollar,
      reason
    };
  } catch (error) {
    console.error('솔라나 동적 수수료 계산 실패:', error);
    return null;
  }
}

/**
 * 솔라나 수수료 최적화 추천
 */
export async function getSolanaFeeRecommendation(
  transaction: SolanaTransactionEstimate
): Promise<{
  low: SolanaDynamicFee;
  medium: SolanaDynamicFee;
  high: SolanaDynamicFee;
  recommendation: 'low' | 'medium' | 'high';
  reason: string;
} | null> {
  try {
    // 3가지 우선순위로 수수료 계산
    const [lowFee, mediumFee, highFee] = await Promise.all([
      calculateSolanaDynamicFee(transaction, 'low'),
      calculateSolanaDynamicFee(transaction, 'medium'),
      calculateSolanaDynamicFee(transaction, 'high')
    ]);

    if (!lowFee || !mediumFee || !highFee) {
      throw new Error('수수료 계산 실패');
    }

    // SOL 가격 기반 추천
    const solPrice = await getCryptoPrice('SOL');
    const solPriceUsd = solPrice?.price || 100;

    let recommendation: 'low' | 'medium' | 'high' = 'medium';
    let reason = '';

    if (solPriceUsd > 1000) {
      // SOL 가격이 $1000 이상이면 낮은 우선순위 추천
      recommendation = 'low';
      reason = `SOL 가격이 높음 ($${solPriceUsd.toFixed(2)}) - 낮은 우선순위로 비용 절약`;
    } else if (solPriceUsd < 50) {
      // SOL 가격이 $50 이하면 높은 우선순위 추천
      recommendation = 'high';
      reason = `SOL 가격이 낮음 ($${solPriceUsd.toFixed(2)}) - 높은 우선순위로 빠른 처리`;
    } else {
      recommendation = 'medium';
      reason = `SOL 가격이 적정 수준 ($${solPriceUsd.toFixed(2)}) - 중간 우선순위 추천`;
    }

    return {
      low: lowFee,
      medium: mediumFee,
      high: highFee,
      recommendation,
      reason
    };
  } catch (error) {
    console.error('솔라나 수수료 추천 실패:', error);
    return null;
  }
}

/**
 * 솔라나 수수료 히스토리 분석
 */
export async function analyzeSolanaFeeHistory(): Promise<{
  averageFee: number;
  feeTrend: 'increasing' | 'decreasing' | 'stable';
  recommendation: string;
} | null> {
  try {
    // 최근 24시간 수수료 데이터 수집 (실제로는 API 호출 필요)
    const recentFees = [
      { time: Date.now() - 24 * 60 * 60 * 1000, fee: 5000 },
      { time: Date.now() - 12 * 60 * 60 * 1000, fee: 5200 },
      { time: Date.now() - 6 * 60 * 60 * 1000, fee: 4800 },
      { time: Date.now(), fee: 5000 }
    ];

    const averageFee = recentFees.reduce((sum, item) => sum + item.fee, 0) / recentFees.length;
    
    // 트렌드 분석
    const firstHalf = recentFees.slice(0, 2).reduce((sum, item) => sum + item.fee, 0) / 2;
    const secondHalf = recentFees.slice(2).reduce((sum, item) => sum + item.fee, 0) / 2;
    
    let feeTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (secondHalf > firstHalf * 1.1) {
      feeTrend = 'increasing';
    } else if (secondHalf < firstHalf * 0.9) {
      feeTrend = 'decreasing';
    }

    let recommendation = '';
    switch (feeTrend) {
      case 'increasing':
        recommendation = '수수료가 상승 중 - 낮은 우선순위 사용 권장';
        break;
      case 'decreasing':
        recommendation = '수수료가 하락 중 - 높은 우선순위 사용 가능';
        break;
      default:
        recommendation = '수수료가 안정적 - 중간 우선순위 사용 권장';
    }

    return {
      averageFee,
      feeTrend,
      recommendation
    };
  } catch (error) {
    console.error('솔라나 수수료 히스토리 분석 실패:', error);
    return null;
  }
} 