import { ethers } from 'ethers';

// 이더리움 트랜잭션 구성 및 서명을 위한 유틸리티

export interface TransactionParams {
  from: string;
  to: string;
  value: string; // ETH amount in wei
  gasLimit?: string;
  gasPrice?: string;
  nonce?: number;
}

export interface SignedTransaction {
  rawTransaction: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
}

/**
 * 이더리움 트랜잭션을 구성합니다.
 */
export async function createEthereumTransaction(
  params: TransactionParams,
  provider: ethers.providers.JsonRpcProvider
): Promise<ethers.providers.TransactionRequest> {
  const { from, to, value, gasLimit, gasPrice, nonce } = params;

  // 기본값 설정
  const defaultGasLimit = '21000'; // ETH 전송의 기본 가스 리밋
  const defaultGasPrice = await provider.getGasPrice();
  const defaultNonce = await provider.getTransactionCount(from);

  const transaction: ethers.providers.TransactionRequest = {
    to,
    value: ethers.utils.parseUnits(value, 'ether'),
    gasLimit: ethers.BigNumber.from(gasLimit || defaultGasLimit),
    gasPrice: gasPrice ? ethers.BigNumber.from(gasPrice) : defaultGasPrice,
    nonce: nonce !== undefined ? nonce : defaultNonce,
  };

  return transaction;
}

/**
 * 개인키로 트랜잭션을 서명합니다.
 */
export async function signTransaction(
  transaction: ethers.providers.TransactionRequest,
  privateKey: string
): Promise<SignedTransaction> {
  try {
    console.log('=== 트랜잭션 서명 시작 ===');
    console.log('전달된 트랜잭션:', JSON.stringify(transaction, null, 2));
    
    const wallet = new ethers.Wallet(privateKey);
    
    // 필수 필드들이 있는지 확인
    if (!transaction.to) {
      throw new Error('수신 주소가 없습니다.');
    }
    
    // value 필드가 유효한지 확인하고 BigNumber로 변환
    let value: ethers.BigNumber;
    if (transaction.value) {
      console.log('원본 value:', transaction.value, '타입:', typeof transaction.value);
      if (typeof transaction.value === 'string') {
        value = ethers.utils.parseUnits(transaction.value, 'ether');
      } else if (transaction.value instanceof ethers.BigNumber) {
        value = transaction.value;
      } else {
        console.log('유효하지 않은 value 타입:', transaction.value);
        throw new Error('유효하지 않은 전송 금액입니다.');
      }
    } else {
      console.log('value가 없음, 0으로 설정');
      value = ethers.BigNumber.from(0);
    }
    
    console.log('처리된 value:', value.toString());
    
    // 안전한 트랜잭션 객체 생성
    const safeTransaction = {
      to: transaction.to,
      value: value,
      gasLimit: transaction.gasLimit || ethers.BigNumber.from(21000),
      gasPrice: transaction.gasPrice || ethers.BigNumber.from(0),
      nonce: transaction.nonce || 0,
    };
    
    console.log('안전한 트랜잭션 객체:', JSON.stringify(safeTransaction, null, 2));
    
    // 타입 체크를 우회하여 서명
    const signedTx = await wallet.signTransaction(safeTransaction as any);
    console.log('서명 완료:', signedTx.substring(0, 66) + '...');

    return {
      rawTransaction: signedTx,
      hash: ethers.utils.keccak256(signedTx),
      from: wallet.address,
      to: transaction.to,
      value: value.toString(),
      gasLimit: safeTransaction.gasLimit.toString(),
      gasPrice: safeTransaction.gasPrice.toString(),
      nonce: (safeTransaction.nonce as number) || 0,
    };
  } catch (error) {
    console.error('트랜잭션 서명 실패:', error);
    throw error;
  }
}

/**
 * 서명된 트랜잭션을 블록체인에 전송합니다.
 */
export async function sendSignedTransaction(
  rawTransaction: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<ethers.providers.TransactionReceipt> {
  const tx = await provider.sendTransaction(rawTransaction);
  return await tx.wait();
}

/**
 * ETH를 다른 주소로 전송하는 완전한 프로세스
 */
export async function sendEthereumTransaction(
  fromAddress: string,
  toAddress: string,
  amount: string, // ETH amount
  privateKey: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<ethers.providers.TransactionResponse> {
  try {
    console.log('=== 이더리움 트랜잭션 전송 시작 ===');
    console.log('fromAddress:', fromAddress);
    console.log('toAddress:', toAddress);
    console.log('amount:', amount, '타입:', typeof amount);
    
    // amount 검증
    if (!amount || amount.trim() === '') {
      throw new Error('전송 금액이 제공되지 않았습니다.');
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('유효하지 않은 전송 금액입니다.');
    }
    
    console.log('검증된 amount:', amount);
    
    // 1. 트랜잭션 구성
    const transaction = await createEthereumTransaction({
      from: fromAddress,
      to: toAddress,
      value: amount,
    }, provider);

    console.log('생성된 트랜잭션:', JSON.stringify(transaction, null, 2));

    // 2. 트랜잭션 서명
    const signedTx = await signTransaction(transaction, privateKey);

    // 3. 블록체인에 전송 (receipt.wait() 제거)
    const txResponse = await provider.sendTransaction(signedTx.rawTransaction);
    console.log('트랜잭션 제출 완료, txHash:', txResponse.hash);

    return txResponse;
  } catch (error) {
    console.error('이더리움 트랜잭션 전송 실패:', error);
    throw error;
  }
}

/**
 * 가스 가격을 조회합니다.
 */
export async function getGasPrice(provider: ethers.providers.JsonRpcProvider): Promise<string> {
  const gasPrice = await provider.getGasPrice();
  return gasPrice.toString();
}

/**
 * 가스 리밋을 추정합니다.
 */
export async function estimateGasLimit(
  fromAddress: string,
  toAddress: string,
  value: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<string> {
  const gasLimit = await provider.estimateGas({
    from: fromAddress,
    to: toAddress,
    value: ethers.utils.parseUnits(value, 'ether'),
  });
  return gasLimit.toString();
} 