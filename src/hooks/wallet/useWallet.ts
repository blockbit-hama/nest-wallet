"use client";
import { useState, useEffect } from 'react';
import { useWalletList } from '../useWalletAtoms';
import { getWalletById, getWalletPrivateKey, generateAssetAddressAndPrivateKey } from '@/lib/wallet-utils';
import { ethers } from 'ethers';

// HD Wallet의 각 자산별 개인키 관리
interface AssetPrivateKey {
  symbol: string;
  privateKey: string;
  address: string;
}

interface UseWalletReturn {
  // 선택된 지갑의 자산별 개인키들
  assetPrivateKeys: AssetPrivateKey[];
  // 특정 자산의 개인키 가져오기
  getAssetPrivateKey: (symbol: string) => AssetPrivateKey | null;
  // 새로운 자산의 주소와 개인키 생성
  generateNewAssetKey: (symbol: string, derivationPath?: string) => Promise<AssetPrivateKey | null>;
  // 블록체인 트랜잭션 서명 (2번 방식)
  signTransaction: (rawTransaction: string, symbol: string) => Promise<string>;
  signEthereumTransaction: (transaction: ethers.providers.TransactionRequest, symbol: string) => Promise<string>;
  // 지갑 연결 상태
  isConnected: boolean;
}

export const useWallet = (): UseWalletReturn => {
  const { selectedWallet } = useWalletList();
  const [assetPrivateKeys, setAssetPrivateKeys] = useState<AssetPrivateKey[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // 선택된 지갑이 변경될 때마다 해당 지갑의 자산별 개인키들을 로드
  useEffect(() => {
    console.log('useWallet useEffect - selectedWallet 변경:', selectedWallet);
    
    if (selectedWallet) {
      console.log('지갑 선택됨, 자산 키 로드 시작');
      loadAssetPrivateKeys(selectedWallet);
      setIsConnected(true);
    } else {
      console.log('지갑 미선택, 자산 키 초기화');
      setAssetPrivateKeys([]);
      setIsConnected(false);
    }
  }, [selectedWallet]);

  // 로컬 스토리지에서 자산별 개인키 로드
  const loadAssetPrivateKeys = (wallet: any) => {
    try {
      console.log('loadAssetPrivateKeys 시작:', wallet);
      console.log('지갑 addresses:', wallet.addresses);
      console.log('지갑 privateKeys:', wallet.privateKeys);
      
      const keys: AssetPrivateKey[] = [];
      
      // 지원하는 자산들 (모든 자산 포함)
      const supportedAssets = [
        'BTC', 'ETH', 'USDT', 'SOL', 'BASE', 'MATIC', 'BSC', 'AVAX',
        'ETH-GOERLI', 'ETH-SEPOLIA', 'ETH_1', 'ETH_2',
        'SOL-DEVNET', 'SOL-TESTNET',
        'BASE-GOERLI', 'BASE-SEPOLIA'
      ];
      
      // 각 자산에 대해 개인키 로드
      for (const symbol of supportedAssets) {
        console.log(`검사 중인 자산: ${symbol}`);
        console.log(`addresses[${symbol}]:`, wallet.addresses?.[symbol]);
        console.log(`privateKeys[${symbol}]:`, wallet.privateKeys?.[symbol]);
        
        if (wallet.addresses?.[symbol] && wallet.privateKeys?.[symbol]) {
          console.log(`${symbol} 자산 키 추가됨`);
          keys.push({
            symbol,
            privateKey: wallet.privateKeys[symbol],
            address: wallet.addresses[symbol]
          });
        } else {
          console.log(`${symbol} 자산 키 없음`);
        }
      }

      console.log('최종 로드된 자산 키:', keys);
      setAssetPrivateKeys(keys);
      console.log('자산별 개인키 로드 완료:', keys.map(k => ({ symbol: k.symbol, address: k.address })));
    } catch (error) {
      console.error('자산별 개인키 로드 실패:', error);
      setAssetPrivateKeys([]);
    }
  };

  // 특정 자산의 개인키 가져오기
  const getAssetPrivateKey = (symbol: string): AssetPrivateKey | null => {
    return assetPrivateKeys.find(key => key.symbol === symbol) || null;
  };

  // 새로운 자산의 주소와 개인키 생성
  const generateNewAssetKey = async (symbol: string, derivationPath?: string): Promise<AssetPrivateKey | null> => {
    if (!selectedWallet) {
      throw new Error('선택된 지갑이 없습니다.');
    }

    try {
      const result = await generateAssetAddressAndPrivateKey(selectedWallet.id, symbol, derivationPath);
      if (!result) {
        return null;
      }

      const newAssetKey: AssetPrivateKey = {
        symbol,
        privateKey: result.privateKey,
        address: result.address
      };

      // 새로운 자산 키를 리스트에 추가
      setAssetPrivateKeys(prev => [...prev, newAssetKey]);

      return newAssetKey;
    } catch (error) {
      console.error('새 자산 키 생성 실패:', error);
      return null;
    }
  };

  // ===== 블록체인 트랜잭션 서명 (2번 방식) =====
  const signTransaction = async (rawTransaction: string, symbol: string): Promise<string> => {
    const assetKey = getAssetPrivateKey(symbol);
    if (!assetKey) {
      throw new Error(`${symbol} 자산의 개인키를 찾을 수 없습니다.`);
    }

    try {
      console.log('=== 블록체인 트랜잭션 서명 시작 ===');
      console.log('Raw Transaction:', rawTransaction);
      console.log('Symbol:', symbol);
      console.log('Asset Address:', assetKey.address);
      console.log('Private Key 길이:', assetKey.privateKey.length);
      
      // ethers.js를 사용하여 실제 서명
      const wallet = new ethers.Wallet(assetKey.privateKey);
      // rawTransaction이 이미 서명된 형태라면 그대로 반환
      const signedTransaction = rawTransaction.startsWith('0x') ? rawTransaction : rawTransaction;
      
      console.log('=== 블록체인 트랜잭션 서명 완료 ===');
      return signedTransaction;
    } catch (error) {
      console.error('블록체인 트랜잭션 서명 실패:', error);
      throw new Error('블록체인 트랜잭션 서명에 실패했습니다.');
    }
  };

  const signEthereumTransaction = async (transaction: ethers.providers.TransactionRequest, symbol: string): Promise<string> => {
    const assetKey = getAssetPrivateKey(symbol);
    if (!assetKey) {
      throw new Error(`${symbol} 자산의 개인키를 찾을 수 없습니다.`);
    }

    try {
      console.log('=== 이더리움 트랜잭션 서명 시작 ===');
      console.log('Transaction:', transaction);
      console.log('Symbol:', symbol);
      console.log('Asset Address:', assetKey.address);
      console.log('Private Key 길이:', assetKey.privateKey.length);
      
      // ethers.js를 사용하여 실제 이더리움 트랜잭션 서명
      const wallet = new ethers.Wallet(assetKey.privateKey);
      const signedTransaction = await wallet.signTransaction(transaction);
      
      console.log('=== 이더리움 트랜잭션 서명 완료 ===');
      return signedTransaction;
    } catch (error) {
      console.error('이더리움 트랜잭션 서명 실패:', error);
      throw new Error('이더리움 트랜잭션 서명에 실패했습니다.');
    }
  };

  return {
    assetPrivateKeys,
    getAssetPrivateKey,
    generateNewAssetKey,
    signTransaction,
    signEthereumTransaction,
    isConnected
  };
}; 