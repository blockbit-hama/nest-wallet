import { ethers } from 'ethers';
import { 
  createEthereumTransaction, 
  signTransaction, 
  sendSignedTransaction,
  sendEthereumTransaction 
} from '../ethereum/transaction';
import { sendSolanaTransaction, getSolanaBalance } from '../solana/transaction';
import { Connection } from '@solana/web3.js';

// API 키들
const INFURA_API_KEY = process.env.NEXT_PUBLIC_INFURA_API_KEY || 'your-infura-api-key';
const BLOCKCYPHER_TOKEN = process.env.NEXT_PUBLIC_BLOCKCYPHER_TOKEN || 'your-blockcypher-token';

// RPC 엔드포인트들
const RPC_ENDPOINTS = {
  ethereum: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
  polygon: `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`,
  bsc: 'https://bsc-dataseed1.binance.org/',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  solana: 'https://api.mainnet-beta.solana.com',
  goerli: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
  sepolia: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
};

// 전송 결과 타입
export interface TransferResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  receipt?: any;
}

// 이더리움 기반 체인 전송 (ETH, Polygon, BSC, Avalanche)
export async function sendEthereumBasedTransaction(
  fromAddress: string,
  toAddress: string,
  amount: string,
  privateKey: string,
  network: 'ethereum' | 'polygon' | 'bsc' | 'avalanche' | 'goerli' | 'sepolia'
): Promise<TransferResult> {
  try {
    const rpcUrl = RPC_ENDPOINTS[network];
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    // 잔액 확인
    const balance = await provider.getBalance(fromAddress);
    const amountWei = ethers.utils.parseUnits(amount, 'ether');
    
    if (balance.lt(amountWei)) {
      throw new Error('잔액이 부족합니다.');
    }

    // 트랜잭션 전송
    const txResponse = await sendEthereumTransaction(
      fromAddress,
      toAddress,
      amount,
      privateKey,
      provider
    );

    return {
      success: true,
      transactionHash: txResponse.hash,
      receipt: txResponse,
    };
  } catch (error) {
    console.error(`${network} 전송 실패:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

// 비트코인 전송 (BlockCypher API 사용)
export async function sendBitcoinTransaction(
  fromAddress: string,
  toAddress: string,
  amount: string, // BTC amount
  privateKey: string
): Promise<TransferResult> {
  try {
    // BlockCypher API를 사용한 비트코인 전송
    const response = await fetch('https://api.blockcypher.com/v1/btc/main/txs/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${BLOCKCYPHER_TOKEN}`,
      },
      body: JSON.stringify({
        inputs: [{ addresses: [fromAddress] }],
        outputs: [{ addresses: [toAddress], value: Math.floor(parseFloat(amount) * 100000000) }], // BTC to satoshis
      }),
    });

    if (!response.ok) {
      throw new Error(`비트코인 전송 실패: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      transactionHash: data.tx.hash,
      receipt: data,
    };
  } catch (error) {
    console.error('비트코인 전송 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

// 통합 전송 함수
export async function sendBlockchainTransaction(
  fromAddress: string,
  toAddress: string,
  amount: string,
  privateKey: string,
  currency: string
): Promise<TransferResult> {
  try {
    // currency가 undefined이거나 null인 경우 처리
    if (!currency) {
      throw new Error('통화 정보가 제공되지 않았습니다.');
    }

    // amount가 undefined이거나 빈 문자열인 경우 처리
    if (!amount || amount.trim() === '') {
      throw new Error('전송 금액이 제공되지 않았습니다.');
    }

    // amount가 유효한 숫자인지 확인
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('유효하지 않은 전송 금액입니다.');
    }

    // 통화에 따라 적절한 네트워크 선택
    let network: 'ethereum' | 'polygon' | 'bsc' | 'avalanche' | 'solana' | 'goerli' | 'sepolia';
    
    switch (currency.toUpperCase()) {
      case 'ETH':
      case 'ETHEREUM':
        network = 'ethereum';
        break;
      case 'MATIC':
      case 'POLYGON':
        network = 'polygon';
        break;
      case 'BSC':
      case 'BNB':
        network = 'bsc';
        break;
      case 'AVAX':
      case 'AVALANCHE':
        network = 'avalanche';
        break;
      case 'SOL':
      case 'SOLANA':
        // 솔라나는 별도 처리
        return await sendSolanaTransaction(fromAddress, toAddress, amount, privateKey, new Connection(RPC_ENDPOINTS.solana));
      case 'ETH_GOERLI':
        network = 'goerli';
        break;
      case 'ETH_SEPOLIA':
        network = 'sepolia';
        break;
      case 'BTC':
      case 'BITCOIN':
        // 비트코인은 별도 처리
        return await sendBitcoinTransaction(fromAddress, toAddress, amount, privateKey);
      default:
        throw new Error(`지원하지 않는 통화: ${currency}`);
    }

    // 이더리움 기반 체인 전송
    return await sendEthereumBasedTransaction(fromAddress, toAddress, amount, privateKey, network);
  } catch (error) {
    console.error('블록체인 전송 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

// 가스 가격 조회
export async function getGasPrice(network: string): Promise<string> {
  try {
    const rpcUrl = RPC_ENDPOINTS[network as keyof typeof RPC_ENDPOINTS];
    if (!rpcUrl) {
      throw new Error(`지원하지 않는 네트워크: ${network}`);
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const gasPrice = await provider.getGasPrice();
    return ethers.utils.formatUnits(gasPrice, 'gwei');
  } catch (error) {
    console.error('가스 가격 조회 실패:', error);
    throw error;
  }
}

// 잔액 조회
export async function getBalance(address: string, network: string): Promise<string> {
  try {
    // 솔라나는 별도 처리
    if (network.toLowerCase() === 'solana' || network.toLowerCase() === 'sol') {
      const connection = new Connection(RPC_ENDPOINTS.solana);
      return await getSolanaBalance(address, connection);
    }

    const rpcUrl = RPC_ENDPOINTS[network as keyof typeof RPC_ENDPOINTS];
    if (!rpcUrl) {
      throw new Error(`지원하지 않는 네트워크: ${network}`);
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error('잔액 조회 실패:', error);
    throw error;
  }
} 

// 직접 전송을 위한 간단한 API 함수 (Infura API 키와 서명된 트랜잭션만 전송)
export async function sendDirectTransaction(
  apiKey: string,
  signedTransaction: string,
  network: string
): Promise<TransferResult> {
  try {
    const rpcUrl = `https://${network}.infura.io/v3/${apiKey}`;
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // 서명된 트랜잭션 전송
    const tx = await provider.sendTransaction(signedTransaction);
    const receipt = await tx.wait();
    
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      receipt: receipt,
    };
  } catch (error) {
    console.error('직접 전송 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
} 