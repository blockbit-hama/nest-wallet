"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

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
      // EIP-55 Ethereum 주소 생성 (개인키는 로컬 저장)
      const wallet = ethers.Wallet.createRandom();
      const checksumAddress = ethers.getAddress(wallet.address);

      setMasterAddress(checksumAddress);
      setMasterPrivateKey(wallet.privateKey);
      localStorage.setItem('masterAddress', checksumAddress);
      localStorage.setItem('masterPrivateKey', wallet.privateKey);

      console.log('새 마스터 어드레스가 생성되었습니다 (EIP-55):', checksumAddress);
    } catch (error) {
      console.error('마스터 어드레스 생성 실패:', error);
      throw error;
    }
  };

  // ===== 쿠폰 서버 인증용 서명 (EIP-191 personal_sign) =====
  const signMessageForCouponAuth = async (message: string): Promise<string> => {
    try {
      // 마스터 어드레스나 개인키가 없으면 자동으로 생성
      if (!masterAddress || !masterPrivateKey) {
        await createMasterAddress();
      }

      const currentMasterPrivateKey = masterPrivateKey || localStorage.getItem('masterPrivateKey');
      if (!currentMasterPrivateKey) {
        throw new Error('마스터 개인키를 찾을 수 없습니다.');
      }

      // ethers Wallet로 personal_sign
      const wallet = new ethers.Wallet(currentMasterPrivateKey);
      const signature = await wallet.signMessage(message);
      return signature;
    } catch (error) {
      console.error('쿠폰 서버 인증 서명 생성 실패:', error);
      if (error instanceof Error) {
        throw new Error(`쿠폰 서버 인증 서명 생성에 실패했습니다: ${error.message}`);
      }
      throw new Error('쿠폰 서버 인증 서명 생성에 실패했습니다.');
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