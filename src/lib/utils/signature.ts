// 서명 관련 유틸리티 함수들

/**
 * SHA-256 해시를 생성합니다.
 * @param message - 해시할 메시지
 * @returns 해시된 문자열
 */
export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// ===== 쿠폰 서버 인증용 서명 (1번 방식) =====

/**
 * 쿠폰 서버 인증용 메시지 서명
 * masterAddress + nonce를 masterAddress의 개인키로 서명
 * @param message - 서명할 메시지 (masterAddress + nonce)
 * @param privateKey - masterAddress의 개인키
 * @returns 서명된 문자열
 */
export async function signMessageForCouponAuth(
  message: string, 
  privateKey: string
): Promise<string> {
  try {
    // SHA-256 해시 생성
    const hashedMessage = await sha256(message);
    
    // 실제로는 secp256k1 서명을 생성해야 합니다.
    // 여기서는 임시로 해시된 메시지를 반환합니다.
    return `0x${hashedMessage}${'0'.repeat(130 - hashedMessage.length)}`;
  } catch (error) {
    console.error('쿠폰 인증 서명 생성 실패:', error);
    throw new Error('쿠폰 인증 서명을 생성할 수 없습니다.');
  }
}

/**
 * masterAddress와 nonce로부터 쿠폰 서버 인증용 서명을 생성합니다.
 * @param masterAddress - 마스터 주소
 * @param nonce - nonce
 * @param privateKey - masterAddress의 개인키
 * @returns 서명된 문자열
 */
export async function createCouponAuthSignature(
  masterAddress: string, 
  nonce: string, 
  privateKey: string
): Promise<string> {
  const message = `${masterAddress}${nonce}`;
  return await signMessageForCouponAuth(message, privateKey);
}

// ===== 블록체인 트랜잭션 서명 (2번 방식) =====

/**
 * 블록체인 트랜잭션 서명
 * raw transaction을 해당 계정의 개인키로 서명
 * @param rawTransaction - 서명할 raw transaction
 * @param privateKey - 해당 계정의 개인키
 * @returns 서명된 트랜잭션
 */
export async function signTransaction(
  rawTransaction: string,
  privateKey: string
): Promise<string> {
  try {
    // 실제로는 블록체인 라이브러리를 사용하여 raw transaction을 서명해야 합니다.
    // 예: ethers.js, web3.js 등을 사용
    
    // 임시 구현: 실제로는 적절한 블록체인 라이브러리 사용 필요
    console.warn('실제 구현에서는 적절한 블록체인 라이브러리를 사용해야 합니다.');
    return rawTransaction; // 실제로는 서명된 트랜잭션 반환
  } catch (error) {
    console.error('트랜잭션 서명 실패:', error);
    throw new Error('트랜잭션 서명에 실패했습니다.');
  }
}

/**
 * 이더리움 트랜잭션 서명
 * @param transaction - 이더리움 트랜잭션 객체
 * @param privateKey - 개인키
 * @returns 서명된 트랜잭션
 */
export async function signEthereumTransaction(
  transaction: {
    to: string;
    value: string;
    gasLimit: string;
    gasPrice: string;
    nonce: number;
    chainId: number;
  },
  privateKey: string
): Promise<string> {
  try {
    // 실제로는 ethers.js나 web3.js를 사용하여 서명
    // 예시: const signedTx = await wallet.signTransaction(transaction);
    
    console.warn('실제 구현에서는 ethers.js나 web3.js를 사용해야 합니다.');
    return `0x${'0'.repeat(130)}`; // 더미 서명
  } catch (error) {
    console.error('이더리움 트랜잭션 서명 실패:', error);
    throw new Error('이더리움 트랜잭션 서명에 실패했습니다.');
  }
}

// ===== 레거시 호환성 (기존 코드와의 호환성을 위해) =====

/**
 * @deprecated use signMessageForCouponAuth instead
 * 메시지를 서명합니다. (쿠폰 서버 인증용)
 * @param message - 서명할 메시지
 * @param privateKey - 개인키
 * @returns 서명된 문자열
 */
export async function signMessage(message: string, privateKey: string): Promise<string> {
  console.warn('signMessage is deprecated. Use signMessageForCouponAuth instead.');
  return await signMessageForCouponAuth(message, privateKey);
}

/**
 * @deprecated use createCouponAuthSignature instead
 * masterAddress와 nonce로부터 서명을 생성합니다.
 * @param masterAddress - 마스터 주소
 * @param nonce - nonce
 * @param privateKey - 개인키
 * @returns 서명된 문자열
 */
export async function createSignature(
  masterAddress: string, 
  nonce: string, 
  privateKey: string
): Promise<string> {
  console.warn('createSignature is deprecated. Use createCouponAuthSignature instead.');
  return await createCouponAuthSignature(masterAddress, nonce, privateKey);
}