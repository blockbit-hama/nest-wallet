"use client";
import { useState, useEffect } from 'react';
import { ec } from 'elliptic';

const elliptic = new ec('secp256k1');

interface UseMasterAddressReturn {
  masterAddress: string | null;
  masterPrivateKey: string | null;
  createMasterAddress: () => Promise<void>;
  signMessageForCouponAuth: (message: string) => Promise<string>;
  disconnect: () => void;
}

export const useMasterAddress = (): UseMasterAddressReturn => {
  const [masterAddress, setMasterAddress] = useState<string | null>(null);
  const [masterPrivateKey, setMasterPrivateKey] = useState<string | null>(null);

  // 초기화 - 로컬 스토리지에서 마스터 어드레스 로드 또는 자동 생성
  useEffect(() => {
    const initializeMasterAddress = async () => {
      const savedMasterAddress = localStorage.getItem('masterAddress');
      const savedMasterPrivateKey = localStorage.getItem('masterPrivateKey');

      if (savedMasterAddress && savedMasterPrivateKey) {
        // 기존 masterAddress가 있으면 로드
        setMasterAddress(savedMasterAddress);
        setMasterPrivateKey(savedMasterPrivateKey);
        console.log('기존 마스터 어드레스 로드:', savedMasterAddress);
        console.log('마스터 어드레스 길이:', savedMasterAddress.length);
      } else {
        // 기존 masterAddress가 없으면 자동 생성
        console.log('마스터 어드레스가 없어서 자동으로 생성합니다.');
        try {
          await createMasterAddress();
          console.log('✅ 앱 초기화 시 마스터 어드레스 자동 생성 완료');
        } catch (error) {
          console.error('❌ 앱 초기화 시 마스터 어드레스 생성 실패:', error);
        }
      }
    };

    initializeMasterAddress();
  }, []);

  const createMasterAddress = async () => {
    try {
      // 1. 새로운 키페어 생성 (서버 인증용)
      const keyPair = elliptic.genKeyPair();
      const masterPrivateKeyHex = keyPair.getPrivate('hex');
      const publicKey = keyPair.getPublic();
      
      // 2. masterAddress 생성 (공개키를 uncompressed 형식으로 인코딩한 후 Base64로 변환)
      const publicKeyUncompressed = publicKey.encode('array', false);
      const masterAddressBase64 = Buffer.from(publicKeyUncompressed).toString('base64');
      
      // 3. 상태 업데이트 및 로컬 스토리지에 저장
      setMasterAddress(masterAddressBase64);
      setMasterPrivateKey(masterPrivateKeyHex);
      localStorage.setItem('masterAddress', masterAddressBase64);
      localStorage.setItem('masterPrivateKey', masterPrivateKeyHex);
      
      console.log('새 마스터 어드레스가 생성되었습니다:', masterAddressBase64);
    } catch (error) {
      console.error('마스터 어드레스 생성 실패:', error);
      throw error;
    }
  };

  // ===== 쿠폰 서버 인증용 서명 (1번 방식) =====
  const signMessageForCouponAuth = async (message: string): Promise<string> => {
    try {
      console.log('=== 쿠폰 서버 인증 서명 생성 시작 ===');
      console.log('입력 메시지:', message);
      console.log('메시지 타입:', typeof message);
      console.log('메시지 길이:', message.length);
      console.log('masterAddress:', masterAddress);
      console.log('masterPrivateKey 길이:', masterPrivateKey?.length);
      
      // 마스터 어드레스나 개인키가 없으면 자동으로 생성
      if (!masterAddress || !masterPrivateKey) {
        console.log('마스터 어드레스가 없어서 새로 생성합니다.');
        await createMasterAddress();
        
        // 생성 후 상태 다시 확인
        const newMasterAddress = localStorage.getItem('masterAddress');
        const newMasterPrivateKey = localStorage.getItem('masterPrivateKey');
        
        console.log('생성된 마스터 어드레스:', newMasterAddress);
        console.log('생성된 마스터 개인키 길이:', newMasterPrivateKey?.length);
        
        if (!newMasterAddress || !newMasterPrivateKey) {
          throw new Error('마스터 어드레스 생성에 실패했습니다.');
        }
        
        setMasterAddress(newMasterAddress);
        setMasterPrivateKey(newMasterPrivateKey);
      }
      
      // 현재 상태에서 개인키 가져오기
      const currentMasterPrivateKey = masterPrivateKey || localStorage.getItem('masterPrivateKey');
      if (!currentMasterPrivateKey) {
        throw new Error('마스터 개인키를 찾을 수 없습니다.');
      }
      
      console.log('사용할 마스터 개인키 길이:', currentMasterPrivateKey.length);
      
      // 백엔드와 동일한 방식으로 SHA-256 해시 생성
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const messageHash = Buffer.from(hashArray);
      
      console.log('해시된 메시지 길이:', messageHash.length);
      console.log('해시된 메시지 (hex):', messageHash.toString('hex'));
      
      // 백엔드와 동일하게 Buffer 형태로 서명 (masterAddress의 개인키 사용)
      const keyPair = elliptic.keyFromPrivate(currentMasterPrivateKey, 'hex');
      const signature = keyPair.sign(messageHash).toDER('hex');
      console.log('생성된 서명:', signature);
      console.log('서명 길이:', signature.length);
      
      // 공개키 정보도 로깅
      const publicKey = keyPair.getPublic();
      const publicKeyUncompressed = publicKey.encode('array', false);
      const expectedMasterAddress = Buffer.from(publicKeyUncompressed).toString('base64');
      console.log('예상 masterAddress:', expectedMasterAddress);
      console.log('실제 masterAddress:', masterAddress);
      console.log('masterAddress 일치:', expectedMasterAddress === masterAddress);
      
      // 백엔드 검증 과정 시뮬레이션
      console.log('=== 백엔드 검증 과정 시뮬레이션 ===');
      console.log('백엔드 검증 과정:');
      console.log('1. walletId 디코딩:', masterAddress);
      
      const currentMasterAddress = masterAddress || localStorage.getItem('masterAddress');
      if (!currentMasterAddress) {
        throw new Error('마스터 어드레스를 찾을 수 없습니다.');
      }
      
      const decodedBuffer = Buffer.from(currentMasterAddress, 'base64');
      console.log('2. 디코딩된 버퍼 길이:', decodedBuffer.length);
      console.log('3. 디코딩된 버퍼 (hex):', decodedBuffer.toString('hex'));
      
      try {
        console.log('4. 공개키 복원 시도...');
        const reconstructedPublicKey = elliptic.keyFromPublic(decodedBuffer, 'array');
        console.log('5. 공개키 복원 성공');
        
        console.log('6. 메시지 해시 (검증용):', messageHash.toString('hex'));
        console.log('7. 서명 (검증용):', signature);
        
        // 백엔드와 동일한 방식으로 서명 검증
        const isValid = reconstructedPublicKey.verify(messageHash, signature);
        console.log('8. 서명 검증 결과:', isValid);
        
        if (!isValid) {
          console.error('❌ 서명 검증 실패 - 프론트엔드와 백엔드 간 불일치');
        } else {
          console.log('✅ 서명 검증 성공 - 프론트엔드와 백엔드 일치');
        }
      } catch (error) {
        console.error('❌ 공개키 복원 실패:', error);
      }
      
      console.log('=== 쿠폰 서버 인증 서명 생성 완료 ===');
      
      return signature;
    } catch (error) {
      console.error('쿠폰 서버 인증 서명 생성 실패:', error);
      if (error instanceof Error) {
        throw new Error(`쿠폰 서버 인증 서명 생성에 실패했습니다: ${error.message}`);
      } else {
        throw new Error('쿠폰 서버 인증 서명 생성에 실패했습니다.');
      }
    }
  };

  const disconnect = () => {
    setMasterAddress(null);
    setMasterPrivateKey(null);
    localStorage.removeItem('masterAddress');
    localStorage.removeItem('masterPrivateKey');
  };

  return {
    masterAddress,
    masterPrivateKey,
    createMasterAddress,
    signMessageForCouponAuth,
    disconnect
  };
}; 