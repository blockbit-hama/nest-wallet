import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';

export interface SolanaTransactionParams {
  from: string;
  to: string;
  amount: string; // SOL amount
  feePayer?: string; // FeePay 공개키 (선택사항)
}

export interface SignedSolanaTransaction {
  rawTransaction: string;
  signature: string;
}

/**
 * 솔라나 트랜잭션을 구성합니다.
 */
export async function createSolanaTransaction(
  params: SolanaTransactionParams,
  connection: Connection,
  feePayerPublicKey?: string
): Promise<Transaction> {
  const { from, to, amount, feePayer } = params;

  // 솔라나 주소를 PublicKey로 변환
  const fromPublicKey = new PublicKey(from);
  const toPublicKey = new PublicKey(to);
  
  // FeePay 공개키가 있으면 사용, 없으면 from 주소 사용
  const payerPublicKey = feePayer ? new PublicKey(feePayer) : fromPublicKey;

  // 솔라나 트랜잭션 생성
  const transaction = new Transaction();

  // SOL 전송 명령어 추가
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: fromPublicKey,
    toPubkey: toPublicKey,
    lamports: parseFloat(amount) * LAMPORTS_PER_SOL,
  });

  transaction.add(transferInstruction);

  // FeePayer 설정 (FeePay 공개키가 있으면 사용)
  if (feePayer) {
    transaction.feePayer = payerPublicKey;
    console.log('FeePay 공개키를 feePayer로 설정:', feePayer);
  } else {
    transaction.feePayer = fromPublicKey;
    console.log('기본 주소를 feePayer로 설정:', from);
  }

  // 최신 블록해시 가져오기
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  return transaction;
}

/**
 * 개인키로 솔라나 트랜잭션을 서명합니다.
 */
export async function signSolanaTransaction(
  transaction: Transaction,
  privateKey: string
): Promise<SignedSolanaTransaction> {
  try {
    console.log('=== 솔라나 트랜잭션 서명 시작 ===');
    console.log('트랜잭션:', transaction);
    console.log('개인키 길이:', privateKey.length);

    // 개인키를 Keypair로 변환
    const keypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(privateKey))
    );

    // 트랜잭션 서명
    transaction.sign(keypair);
    
    // 서명된 트랜잭션을 직렬화
    const serializedTransaction = transaction.serialize();
    const rawTransaction = Buffer.from(serializedTransaction).toString('base64');

    console.log('서명 완료');
    console.log('=== 솔라나 트랜잭션 서명 완료 ===');

    return {
      rawTransaction,
      signature: transaction.signature?.toString() || '',
    };
  } catch (error) {
    console.error('솔라나 트랜잭션 서명 실패:', error);
    throw error;
  }
}

/**
 * 서명된 솔라나 트랜잭션을 전송합니다.
 */
export async function sendSignedSolanaTransaction(
  rawTransaction: string,
  connection: Connection
): Promise<string> {
  try {
    console.log('=== 솔라나 트랜잭션 전송 시작 ===');
    
    // base64 디코딩
    const transactionBuffer = Buffer.from(rawTransaction, 'base64');
    const transaction = Transaction.from(transactionBuffer);

    // 트랜잭션 전송
    const signature = await connection.sendRawTransaction(transactionBuffer);
    
    console.log('트랜잭션 전송 완료, signature:', signature);
    console.log('=== 솔라나 트랜잭션 전송 완료 ===');

    return signature;
  } catch (error) {
    console.error('솔라나 트랜잭션 전송 실패:', error);
    throw error;
  }
}

/**
 * SOL을 다른 주소로 전송하는 완전한 프로세스
 */
export async function sendSolanaTransaction(
  fromAddress: string,
  toAddress: string,
  amount: string, // SOL amount
  privateKey: string,
  connection: Connection,
  feePayerPublicKey?: string
): Promise<string> {
  try {
    console.log('=== 솔라나 트랜잭션 전송 시작 ===');
    console.log('fromAddress:', fromAddress);
    console.log('toAddress:', toAddress);
    console.log('amount:', amount);
    console.log('feePayerPublicKey:', feePayerPublicKey);

    // amount 검증
    if (!amount || amount.trim() === '') {
      throw new Error('전송 금액이 제공되지 않았습니다.');
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('유효하지 않은 전송 금액입니다.');
    }

    // 1. 트랜잭션 구성
    const transaction = await createSolanaTransaction({
      from: fromAddress,
      to: toAddress,
      amount: amount,
      feePayer: feePayerPublicKey,
    }, connection, feePayerPublicKey);

    console.log('생성된 트랜잭션:', transaction);

    // 2. 트랜잭션 서명
    const signedTx = await signSolanaTransaction(transaction, privateKey);

    // 3. 블록체인에 전송
    const signature = await sendSignedSolanaTransaction(signedTx.rawTransaction, connection);
    console.log('트랜잭션 제출 완료, signature:', signature);

    return signature;
  } catch (error) {
    console.error('솔라나 트랜잭션 전송 실패:', error);
    throw error;
  }
}

/**
 * 솔라나 잔액을 조회합니다.
 */
export async function getSolanaBalance(
  address: string,
  connection: Connection
): Promise<string> {
  try {
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return (balance / LAMPORTS_PER_SOL).toString();
  } catch (error) {
    console.error('솔라나 잔액 조회 실패:', error);
    throw error;
  }
} 