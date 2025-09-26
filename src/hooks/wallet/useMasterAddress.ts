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
        // 기존 Ethereum 주소 형식(42자)이면 새로운 형식으로 마이그레이션
        if (savedMasterAddress.startsWith('0x') && savedMasterAddress.length === 42) {
          console.log('기존 Ethereum 형식 마스터 어드레스 감지, 새로운 형식으로 마이그레이션합니다.');
          await createMasterAddress();
        } else if (savedMasterAddress.length > 20) {
          // 20자보다 긴 다른 형식도 마이그레이션
          console.log('긴 형식의 마스터 어드레스 감지, 새로운 형식으로 마이그레이션합니다.');
          await createMasterAddress();
        } else {
          // 정상적인 20자 형식
          setMasterAddress(savedMasterAddress);
          setMasterPrivateKey(savedMasterPrivateKey);
          console.log('기존 마스터 어드레스 로드:', savedMasterAddress);
        }
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
      // 20자의 간단한 고유 ID 생성 (URL 안전한 문자만 사용)
      const generateSimpleId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = 'USR_'; // 사용자 ID 접두사
        for (let i = 0; i < 16; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const simpleId = generateSimpleId();

      // 서명용 개인키는 여전히 생성 (나중에 서명이 필요한 경우를 위해)
      const wallet = ethers.Wallet.createRandom();

      setMasterAddress(simpleId);
      setMasterPrivateKey(wallet.privateKey);
      localStorage.setItem('masterAddress', simpleId);
      localStorage.setItem('masterPrivateKey', wallet.privateKey);

      console.log('새 마스터 어드레스가 생성되었습니다 (Simple ID):', simpleId);
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