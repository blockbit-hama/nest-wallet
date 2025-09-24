"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useMasterAddress } from "../hooks/wallet/useMasterAddress";
import { getCouponsByMasterAddress } from "../lib/api/voucher";
import { CustomSelect } from "../components/molecules/CustomSelect";
import { useRouter } from "next/navigation";
import { TabBar } from "../components/molecules/TabBar";
import { cn } from '@/lib/utils/utils';
import { useWalletList, useEnabledAssets } from "../hooks/useWalletAtoms";
import { useWalletBalance } from "../hooks/queries/useWalletBalance";
import { Button, Input, Card } from "../components/ui";
import { useQueryClient } from '@tanstack/react-query';
import { regenerateAllWalletPrivateKeys, addSolanaToExistingWallets, createTestWalletIfNotExists, getNextEthAddressPath, getNextAccountPath } from "../lib/wallet-utils";
import { useWallet } from "../hooks/wallet/useWallet";

// 더 세련된 코인 SVG 아이콘들 (gradient, 입체감, 라인 등)
const BtcIcon = ({ size = 54 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="btcG" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff7d1"/>
        <stop offset="100%" stopColor="#F7931A"/>
      </radialGradient>
    </defs>
    <circle cx="27" cy="27" r="27" fill="#1B1C22"/>
    <circle cx="27" cy="27" r="22" fill="url(#btcG)"/>
    <text x="27" y="36" textAnchor="middle" fontWeight="bold" fontSize={size * 0.45} fill="#fff" fontFamily="monospace" style={{filter:'drop-shadow(0 1px 2px #0008)'}}>₿</text>
  </svg>
);
const EthIcon = ({ size = 54 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ethG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#B2BFFF"/>
        <stop offset="100%" stopColor="#627EEA"/>
      </linearGradient>
    </defs>
    <circle cx="27" cy="27" r="27" fill="#1B1C22"/>
    <circle cx="27" cy="27" r="22" fill="url(#ethG)"/>
    <polygon points="27,12 39,27 27,48 15,27" fill="#fff"/>
    <polygon points="27,12 27,36 39,27" fill="#B2BFFF"/>
    <polygon points="27,12 27,36 15,27" fill="#627EEA"/>
  </svg>
);
const UsdtIcon = ({ size = 54 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="usdtG" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#baffd7"/>
        <stop offset="100%" stopColor="#26A17B"/>
      </radialGradient>
    </defs>
    <circle cx="27" cy="27" r="27" fill="#1B1C22"/>
    <circle cx="27" cy="27" r="22" fill="url(#usdtG)"/>
    <text x="27" y="36" textAnchor="middle" fontWeight="bold" fontSize={size * 0.38} fill="#fff" fontFamily="monospace" style={{filter:'drop-shadow(0 1px 2px #0008)'}}>$</text>
  </svg>
);
const SolIcon = ({ size = 54 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="solG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF6B6B"/>
        <stop offset="100%" stopColor="#4ECDC4"/>
      </linearGradient>
    </defs>
    <circle cx="27" cy="27" r="27" fill="#1B1C22"/>
    <circle cx="27" cy="27" r="22" fill="url(#solG)"/>
    <text x="27" y="36" textAnchor="middle" fontWeight="bold" fontSize={size * 0.45} fill="#fff" fontFamily="monospace" style={{filter:'drop-shadow(0 1px 2px #0008)'}}>◎</text>
  </svg>
);

const BaseIcon = ({ size = 54 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="baseG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0052FF"/>
        <stop offset="100%" stopColor="#4C5BB3"/>
      </linearGradient>
    </defs>
    <circle cx="27" cy="27" r="27" fill="#1B1C22"/>
    <circle cx="27" cy="27" r="22" fill="url(#baseG)"/>
    <text x="27" y="36" textAnchor="middle" fontWeight="bold" fontSize={size * 0.45} fill="#fff" fontFamily="monospace" style={{filter:'drop-shadow(0 1px 2px #0008)'}}>B</text>
  </svg>
);

// QR 코드 SVG 아이콘 (단순한 [=] 스타일)
const QrIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 왼쪽 세로선 */}
    <rect x="8" y="6" width="2" height="20" fill="#F2A003"/>
    <rect x="12" y="6" width="2" height="20" fill="#F2A003"/>
    <rect x="16" y="6" width="2" height="20" fill="#F2A003"/>
    
    {/* 오른쪽 세로선 */}
    <rect x="22" y="6" width="2" height="20" fill="#F2A003"/>
    <rect x="26" y="6" width="2" height="20" fill="#F2A003"/>
  </svg>
);

// Coin 타입 정의
interface Coin {
  symbol: string;
  name: string;
  amount: string;
  usd: string;
  change: string;
  changeColor: string;
  subAmount: string;
  subUsd: string;
}

// 전송, 수신, 스왑 버튼용 세련된 아이콘
const SwapIcon = ({ size = 32, color = '#F2A003' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 20H24M24 20L20 24M24 20L20 16" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M24 12H8M8 12L12 8M8 12L12 16" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Home() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [balanceType, setBalanceType] = useState<'잔액' | 'NFT' | '쿠폰'>('잔액');
  const [selectedCouponId, setSelectedCouponId] = useState<string>("");
  const balanceOptions = ['잔액', 'NFT', '쿠폰'] as const;
  
  // useMasterAddress 훅 사용
  const { masterAddress } = useMasterAddress();

  // React Query 클라이언트
  const queryClient = useQueryClient();
  
  // 지갑 관련 hooks
  const { generateNewAssetKey } = useWallet();

  // 새로운 atoms hooks 사용
  const {
    walletList,
    selectedWallet,
    selectedWalletId,
    setSelectedWalletId,
    isLoading: isWalletListLoading,
    loadWallets,
    refreshWalletList
  } = useWalletList();

  const {
    enabledAssets,
    loadEnabledAssets
  } = useEnabledAssets();

  // React Query hooks로 잔액 데이터 가져오기
  const btcBalance = useWalletBalance(
    selectedWallet?.addresses.BTC || '', 
    'BTC'
  );
  const ethBalance = useWalletBalance(
    selectedWallet?.addresses.ETH || '', 
    'ETH'
  );
  const usdtBalance = useWalletBalance(
    selectedWallet?.addresses.USDT || '', 
    'USDT'
  );
  const maticBalance = useWalletBalance(
    selectedWallet?.addresses.MATIC || '', 
    'MATIC'
  );
  const bscBalance = useWalletBalance(
    selectedWallet?.addresses.BSC || '', 
    'BSC'
  );
  const avaxBalance = useWalletBalance(
    selectedWallet?.addresses.AVAX || '', 
    'AVAX'
  );
  const solBalance = useWalletBalance(
    selectedWallet?.addresses.SOL || '', 
    'SOL'
  );
  const baseBalance = useWalletBalance(
    selectedWallet?.addresses.BASE || '', 
    'BASE'
  );
  const ethSepoliaBalance = useWalletBalance(
    selectedWallet?.addresses['ETH-SEPOLIA'] || '', 
    'ETH-SEPOLIA'
  );
  const solDevnetBalance = useWalletBalance(
    selectedWallet?.addresses['SOL-DEVNET'] || '', 
    'SOL-DEVNET'
  );
  const baseSepoliaBalance = useWalletBalance(
    selectedWallet?.addresses['BASE-SEPOLIA'] || '', 
    'BASE-SEPOLIA'
  );
  const ethGoerliBalance = useWalletBalance(
    selectedWallet?.addresses['ETH-GOERLI'] || '', 
    'ETH-GOERLI'
  );
  const baseGoerliBalance = useWalletBalance(
    selectedWallet?.addresses['BASE-GOERLI'] || '', 
    'BASE-GOERLI'
  );
  const solTestnetBalance = useWalletBalance(
    selectedWallet?.addresses['SOL-TESTNET'] || '', 
    'SOL-TESTNET'
  );

  // 잔액 데이터 캐시 무효화 함수
  const invalidateBalanceCache = () => {
    queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
    console.log('잔액 캐시 무효화 완료');
  };

  // 총 달러 금액 계산 (활성화된 자산들의 합계)
  const calculateTotalUSD = () => {
    if (!selectedWallet || !enabledAssets.length) return 0;
    
    let total = 0;
    
    // 활성화된 자산들의 USD 가치 합계
    if (enabledAssets.includes('BTC') && btcBalance.data) {
      const btcValue = parseFloat(btcBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += btcValue;
    }
    
    if (enabledAssets.includes('ETH') && ethBalance.data) {
      const ethValue = parseFloat(ethBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += ethValue;
    }
    
    if (enabledAssets.includes('USDT') && usdtBalance.data) {
      const usdtValue = parseFloat(usdtBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += usdtValue;
    }
    
    if (enabledAssets.includes('MATIC') && maticBalance.data) {
      const maticValue = parseFloat(maticBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += maticValue;
    }
    
    if (enabledAssets.includes('BSC') && bscBalance.data) {
      const bscValue = parseFloat(bscBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += bscValue;
    }
    
    if (enabledAssets.includes('AVAX') && avaxBalance.data) {
      const avaxValue = parseFloat(avaxBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += avaxValue;
    }
    
    if (enabledAssets.includes('SOL') && solBalance.data) {
      const solValue = parseFloat(solBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += solValue;
    }
    
    if (enabledAssets.includes('BASE') && baseBalance.data) {
      const baseValue = parseFloat(baseBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += baseValue;
    }
    
    if (enabledAssets.includes('ETH-SEPOLIA') && ethSepoliaBalance.data) {
      const ethSepoliaValue = parseFloat(ethSepoliaBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += ethSepoliaValue;
    }
    
    if (enabledAssets.includes('SOL-DEVNET') && solDevnetBalance.data) {
      const solDevnetValue = parseFloat(solDevnetBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += solDevnetValue;
    }
    
    if (enabledAssets.includes('BASE-SEPOLIA') && baseSepoliaBalance.data) {
      const baseSepoliaValue = parseFloat(baseSepoliaBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += baseSepoliaValue;
    }
    
    if (enabledAssets.includes('ETH-GOERLI') && ethGoerliBalance.data) {
      const ethGoerliValue = parseFloat(ethGoerliBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += ethGoerliValue;
    }
    
    if (enabledAssets.includes('BASE-GOERLI') && baseGoerliBalance.data) {
      const baseGoerliValue = parseFloat(baseGoerliBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += baseGoerliValue;
    }
    
    if (enabledAssets.includes('SOL-TESTNET') && solTestnetBalance.data) {
      const solTestnetValue = parseFloat(solTestnetBalance.data.usdValue.replace('$', '').replace(',', ''));
      total += solTestnetValue;
    }
    
    return total;
  };

  const totalUSD = calculateTotalUSD();

  // 활성화된 자산들에 대한 주소가 모두 존재하는지 확인하고 누락된 것들을 생성
  const ensureAllAddressesExist = async () => {
    try {
      console.log('=== 주소 생성 확인 시작 ===');
      
      // localStorage에서 현재 활성화된 자산들 가져오기
      const savedEnabledAssets = localStorage.getItem('enabledAssets');
      if (!savedEnabledAssets) {
        console.log('활성화된 자산이 없음');
        return;
      }
      
      const enabledAssets = JSON.parse(savedEnabledAssets);
      const enabledSymbols = enabledAssets.map((asset: any) => asset.symbol);
      console.log('활성화된 자산들:', enabledSymbols);
      
      // 현재 지갑들 가져오기
      const wallets = JSON.parse(localStorage.getItem('hdWallets') || '[]');
      console.log('전체 지갑 수:', wallets.length);
      
      let walletsUpdated = false;
      
      // 각 지갑에 대해 누락된 주소들을 생성
      for (const wallet of wallets) {
        console.log(`\n--- ${wallet.name} (${wallet.id}) 주소 확인 ---`);
        
        if (!wallet.addresses) wallet.addresses = {};
        if (!wallet.privateKeys) wallet.privateKeys = {};
        
        const missingAssets = enabledSymbols.filter(symbol => !wallet.addresses[symbol]);
        console.log('누락된 자산들:', missingAssets);
        
        for (const symbol of missingAssets) {
          try {
            console.log(`${symbol} 주소 생성 중...`);
            
            // 자산에 따른 파생 경로 결정
            let derivationPath: string | undefined;
            
            if (symbol.includes('SOL')) {
              // 솔라나 계열 (메인넷, 테스트넷, 데브넷)
              derivationPath = "m/44'/501'/0'/0/0";
            } else if (symbol.includes('ETH') || symbol.includes('BASE')) {
              // 이더리움 계열 (메인넷, 테스트넷)
              const existingEthAddresses = enabledSymbols.filter(s => s.includes('ETH') || s.includes('BASE'));
              derivationPath = getNextEthAddressPath(existingEthAddresses);
            } else {
              // 다른 토큰들 (account로 구분)
              const existingAssets = enabledSymbols.filter(s => 
                s !== 'BTC' && 
                !s.includes('ETH') && 
                !s.includes('SOL') && 
                !s.includes('BASE')
              );
              derivationPath = getNextAccountPath(existingAssets);
            }
            
            console.log(`${symbol} 파생 경로:`, derivationPath);
            const newAssetKey = await generateNewAssetKey(symbol, derivationPath);
            
            if (newAssetKey) {
              wallet.addresses[symbol] = newAssetKey.address;
              wallet.privateKeys[symbol] = newAssetKey.privateKey;
              walletsUpdated = true;
              console.log(`✅ ${symbol} 주소 생성 완료: ${newAssetKey.address.substring(0, 10)}...`);
            } else {
              console.error(`❌ ${symbol} 주소 생성 실패`);
            }
          } catch (error) {
            console.error(`❌ ${symbol} 주소 생성 중 오류:`, error);
          }
        }
      }
      
      // 업데이트된 지갑 정보 저장
      if (walletsUpdated) {
        localStorage.setItem('hdWallets', JSON.stringify(wallets));
        console.log('✅ 지갑 정보 업데이트 완료');
      } else {
        console.log('✅ 모든 주소가 이미 존재함');
      }
      
      console.log('=== 주소 생성 확인 완료 ===\n');
    } catch (error) {
      console.error('주소 생성 확인 중 오류:', error);
    }
  };

  // 디버깅용 로그
  console.log('메인 화면 상태:', {
    enabledAssets,
    selectedWallet: selectedWallet ? {
      id: selectedWallet.id,
      addresses: selectedWallet.addresses,
      hasSOL: !!selectedWallet.addresses.SOL
    } : null,
    solBalance: solBalance.data
  });

  // localStorage 디버깅
  if (typeof window !== 'undefined') {
    const savedEnabledAssets = localStorage.getItem('enabledAssets');
    console.log('localStorage 저장된 자산:', savedEnabledAssets);
    if (savedEnabledAssets) {
      try {
        const parsed = JSON.parse(savedEnabledAssets);
        console.log('파싱된 저장 자산:', parsed);
        console.log('자산 심볼들:', parsed.map((a: any) => a.symbol));
      } catch (error) {
        console.error('localStorage 파싱 오류:', error);
      }
    }
  }

  // HD Wallet 목록 로드 및 솔라나 마이그레이션
  useEffect(() => {
    const initializeApp = async () => {
      // test-wallet 생성 (없으면 생성)
      try {
        console.log('=== test-wallet 생성 함수 호출 시작 ===');
        const testWalletCreated = await createTestWalletIfNotExists();
        console.log('test-wallet 생성 결과:', testWalletCreated);
        console.log('=== test-wallet 생성 함수 호출 완료 ===');
        
        // test-wallet이 생성되었다면 즉시 지갑 목록과 활성화된 자산을 새로고침
        if (testWalletCreated) {
          console.log('test-wallet 생성됨, 상태 새로고침 중...');
          // 약간의 지연을 주어 localStorage 업데이트가 완료되도록 함
          await new Promise(resolve => setTimeout(resolve, 100));
          loadWallets();
          loadEnabledAssets();
        }
      } catch (error) {
        console.error('test-wallet 생성 실패:', error);
      }
      
      // 기존 지갑들에 솔라나 주소 추가 (마이그레이션)
      try {
        const result = await addSolanaToExistingWallets();
        console.log('솔라나 마이그레이션 결과:', result);
      } catch (error) {
        console.error('솔라나 마이그레이션 실패:', error);
      }
      
      // 활성화된 자산들에 대한 주소 생성 (누락된 주소들 자동 생성)
      try {
        await ensureAllAddressesExist();
      } catch (error) {
        console.error('주소 생성 실패:', error);
      }
      
      // 최종 지갑 목록 로드
      loadWallets();
      loadEnabledAssets();
    };
    
    initializeApp();
  }, []);

  // 활성화된 자산 로드
  useEffect(() => {
    loadEnabledAssets();
  }, []);

  // 디버깅용 useEffect
  useEffect(() => {
    if (selectedWallet) {
      console.log('선택된 지갑:', selectedWallet);
      console.log('활성화된 자산:', enabledAssets);
      console.log('MATIC 주소 존재:', !!selectedWallet.addresses.MATIC);
      console.log('MATIC 주소 값:', selectedWallet.addresses.MATIC);
      console.log('MATIC 활성화됨:', enabledAssets.includes('MATIC'));
      console.log('모든 주소들:', selectedWallet.addresses);
      
      // 테스트넷 자산 상태 확인
      const testnetAssets = ['ETH-SEPOLIA', 'ETH-GOERLI', 'BASE-SEPOLIA', 'BASE-GOERLI', 'SOL-DEVNET', 'SOL-TESTNET'];
      testnetAssets.forEach(symbol => {
        console.log(`${symbol} 주소:`, selectedWallet.addresses[symbol]);
        console.log(`${symbol} 활성화됨:`, enabledAssets.includes(symbol));
      });
      
      // 잔액 데이터 디버깅
      console.log('BTC 잔액 데이터:', btcBalance.data);
      console.log('ETH 잔액 데이터:', ethBalance.data);
      console.log('USDT 잔액 데이터:', usdtBalance.data);
      console.log('MATIC 잔액 데이터:', maticBalance.data);
      console.log('BSC 잔액 데이터:', bscBalance.data);
      console.log('AVAX 잔액 데이터:', avaxBalance.data);
      console.log('SOL 잔액 데이터:', solBalance.data);
      console.log('BASE 잔액 데이터:', baseBalance.data);
      console.log('ETH-SEPOLIA 잔액 데이터:', ethSepoliaBalance.data);
      console.log('SOL-DEVNET 잔액 데이터:', solDevnetBalance.data);
      
      // 테스트넷 자산 디버깅
      console.log('ETH-SEPOLIA 주소:', selectedWallet.addresses['ETH-SEPOLIA']);
      console.log('ETH-SEPOLIA 활성화됨:', enabledAssets.includes('ETH-SEPOLIA'));
      console.log('ETH-GOERLI 주소:', selectedWallet.addresses['ETH-GOERLI']);
      console.log('ETH-GOERLI 활성화됨:', enabledAssets.includes('ETH-GOERLI'));
      console.log('BASE-SEPOLIA 주소:', selectedWallet.addresses['BASE-SEPOLIA']);
      console.log('BASE-SEPOLIA 활성화됨:', enabledAssets.includes('BASE-SEPOLIA'));
      console.log('SOL-DEVNET 주소:', selectedWallet.addresses['SOL-DEVNET']);
      console.log('SOL-DEVNET 활성화됨:', enabledAssets.includes('SOL-DEVNET'));
      console.log('BASE-SEPOLIA 잔액 데이터:', baseSepoliaBalance.data);
      console.log('ETH-GOERLI 잔액 데이터:', ethGoerliBalance.data);
      console.log('BASE-GOERLI 잔액 데이터:', baseGoerliBalance.data);
      console.log('SOL-TESTNET 잔액 데이터:', solTestnetBalance.data);
    }
      }, [selectedWallet, enabledAssets, btcBalance.data, ethBalance.data, usdtBalance.data, maticBalance.data, bscBalance.data, avaxBalance.data, solBalance.data, baseBalance.data, ethSepoliaBalance.data, solDevnetBalance.data, baseSepoliaBalance.data, ethGoerliBalance.data, baseGoerliBalance.data, solTestnetBalance.data]);

  // assetsUpdated 이벤트 수신
  useEffect(() => {
    const handleAssetsUpdated = (event: CustomEvent) => {
      console.log('자산 업데이트 이벤트 수신:', event.detail);
      // 이벤트는 useEnabledAssets hook에서 처리됨
    };

    const handleWalletsUpdated = () => {
      console.log('지갑 업데이트 이벤트 수신');
      refreshWalletList();
      loadEnabledAssets();
    };

    window.addEventListener('assetsUpdated', handleAssetsUpdated as EventListener);
    window.addEventListener('walletsUpdated', handleWalletsUpdated as EventListener);
    return () => {
      window.removeEventListener('assetsUpdated', handleAssetsUpdated as EventListener);
      window.removeEventListener('walletsUpdated', handleWalletsUpdated as EventListener);
    };
  }, []);

  // 전송 완료 이벤트 수신하여 잔액 새로고침
  useEffect(() => {
    const handleTransferCompleted = (event: CustomEvent) => {
      console.log('전송 완료 이벤트 수신:', event.detail);
      
      // 캐시 무효화로 모든 잔액 데이터 새로고침
      invalidateBalanceCache();
      
      // 쿠폰 목록도 새로고침
      if (masterAddress) {
        loadCoupons();
      }
    };

    window.addEventListener('transferCompleted', handleTransferCompleted as EventListener);
    return () => {
      window.removeEventListener('transferCompleted', handleTransferCompleted as EventListener);
    };
  }, [masterAddress]);

  // 페이지 포커스 시 지갑 목록 새로고침
  useEffect(() => {
    const handleFocus = () => {
      refreshWalletList();
      loadEnabledAssets(); // 활성화된 자산도 다시 로드
      
      // 캐시 무효화로 잔액 데이터 새로고침
      invalidateBalanceCache();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // 라우터 변경 시 잔액 새로고침 (전송 완료 후 홈화면으로 돌아올 때)
  useEffect(() => {
    const handleRouteChange = () => {
      // 캐시 무효화로 모든 잔액 데이터 새로고침
      invalidateBalanceCache();
    };

    // 페이지 로드 시 한 번 실행
    handleRouteChange();
    
    // 라우터 이벤트 리스너 추가
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // 실제 쿠폰 데이터 (서버에서 받아온 데이터 사용)
  const [couponList, setCouponList] = useState<any[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [totalCouponAmount, setTotalCouponAmount] = useState(0);

  // 쿠폰 목록 로드 함수
  const loadCoupons = async () => {
    if (!masterAddress) return;
    
    setIsLoadingCoupons(true);
    try {
      const response = await getCouponsByMasterAddress(masterAddress);
      
      if (response.success && response.data) {
        setCouponList(response.data.coupons || []);
        
        // 총 쿠폰 금액 계산
        const total = response.data.coupons?.reduce((sum, coupon) => {
          return sum + Number(coupon.amountRemaining);
        }, 0) || 0;
        setTotalCouponAmount(total);
        
        console.log('쿠폰 목록 로드 완료:', response.data.coupons);
        console.log('총 쿠폰 금액:', total);
      } else {
        console.error('쿠폰 목록 로드 실패:', response.message);
        setCouponList([]);
        setTotalCouponAmount(0);
      }
    } catch (error) {
      console.error('쿠폰 목록 로드 실패:', error);
      setCouponList([]);
      setTotalCouponAmount(0);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  // masterAddress가 변경될 때마다 쿠폰 로드
  useEffect(() => {
    if (masterAddress) {
      loadCoupons();
    }
  }, [masterAddress]);

  const filteredCouponList = couponList.filter(c => c.name !== '포인트');

  // 코인별 아이콘 매핑
  const getCoinIcon = (symbol: string, size: number = 54) => {
    if (symbol === 'BTC') return <BtcIcon size={size} />;
    if (symbol === 'ETH') return <EthIcon size={size} />;
    if (symbol === 'USDT') return <UsdtIcon size={size} />;
    if (symbol === 'SOL') return <SolIcon size={size} />;
    if (symbol === 'BASE') return <BaseIcon size={size} />;
    if (symbol.includes('ETH') || symbol.includes('BASE')) return <EthIcon size={size} />;
    if (symbol.includes('SOL')) return <SolIcon size={size} />;
    return <span style={{ width: size, height: size, display: 'inline-block' }} />;
  };

  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  return (
    <div className="min-h-screen w-full flex flex-col relative font-inherit">
      {/* 탑바 */}
      <nav className="top-bar">
        <div className="top-bar-inner">
          {/* 지갑 콤보박스 */}
          <div className="wallet-select-container">
            <CustomSelect
              value={selectedWalletId}
              options={
                isWalletListLoading
                  ? [{ value: '', label: '로딩 중...' }]
                  : [
                      ...walletList.map(w => ({ value: w.id, label: w.name })),
                      { value: 'create-new', label: '+ 새 지갑 추가' }
                    ]
              }
              onChange={(value) => {
                if (value === 'create-new') {
                  router.push('/create-wallet');
                } else {
                  setSelectedWalletId(value);
                }
              }}
              width={260}
              height={68}
              fontSize={24}
              padding="20px 56px 20px 28px"
              accentColor="#F2A003"
            />
          </div>
          {/* QR 코드 스캔 버튼 */}
          <div>
            <button 
              className="profile-button"
              aria-label="QR 스캔"
              onClick={() => alert('QR 스캔 기능은 추후 구현 예정입니다.')}
            >
              <QrIcon />
            </button>
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 */}
      <main className="main-box">
        {/* 내 ETH/달러/쿠폰 */}
        <div className="main-summary-box">
          <div className="main-summary-amount">${totalUSD.toFixed(2)}</div>
          {/* 총 쿠폰 금액: 항상 전송/수신 버튼 위에만 노출 */}
          <div className="main-summary-coupon">
            총 쿠폰: ${totalCouponAmount.toFixed(2)}
          </div>
        </div>
        
        {/* 전송/수신/스왑 버튼 */}
        <div className="main-action-button-group">
          <button 
            className="main-action-button"
            onClick={() => router.push('/coupon-transfer')}
          >
            전송
          </button>
          <button 
            className="main-action-receive-button"
            onClick={() => router.push('/receive')}
          >
            수신
          </button>
          <button 
            className="main-action-swap-button"
            onClick={() => router.push('/swap')}
          >
            <SwapIcon />
          </button>
        </div>
        
        {/* 잔액 콤보박스 */}
        <div className="balance-combo-box">
          <CustomSelect
            value={balanceType}
            options={balanceOptions.map(opt => ({ value: opt, label: opt }))}
            onChange={v => setBalanceType(v as typeof balanceType)}
            width={120}
            height={40}
            fontSize={15}
            padding="8px 32px 8px 16px"
            accentColor="#F2A003"
            style={{ minWidth: 90 }}
          />
        </div>
        
        {/* 잔액 리스트 */}
        <div className="balance-list">
          {selectedWallet && (
            <>
              {selectedWallet.addresses.BTC && enabledAssets.includes('BTC') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <BtcIcon size={60} />
                  <div className="balance-card-inner">
                    <span className="balance-card-name">BTC</span>
                    <span className="balance-card-usd" style={{ color: btcBalance.data?.changeColor || '#6FCF97' }}>
                      {btcBalance.isLoading ? '로딩 중...' : btcBalance.data?.price ? `${btcBalance.data.price} ${btcBalance.data.change}` : '$0.00 0.00%'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {btcBalance.isLoading ? '로딩 중...' : btcBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {btcBalance.isLoading ? '로딩 중...' : btcBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}
              
              {selectedWallet.addresses.ETH && enabledAssets.includes('ETH') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <EthIcon size={60} />
                  <div className="balance-card-inner">
                    <span className="balance-card-name">ETH</span>
                    <span className="balance-card-usd" style={{ color: ethBalance.data?.changeColor || '#EB5757' }}>
                      {ethBalance.isLoading ? '로딩 중...' : ethBalance.data?.price ? `${ethBalance.data.price} ${ethBalance.data.change}` : '$0.00 0.00%'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {ethBalance.isLoading ? '로딩 중...' : ethBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {ethBalance.isLoading ? '로딩 중...' : ethBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}
              
              {selectedWallet.addresses.USDT && enabledAssets.includes('USDT') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <UsdtIcon size={60} />
                  <div className="balance-card-inner">
                    <span className="balance-card-name">USDT</span>
                    <span className="balance-card-usd" style={{ color: usdtBalance.data?.changeColor || '#EB5757' }}>
                      {usdtBalance.isLoading ? '로딩 중...' : usdtBalance.data?.price ? `${usdtBalance.data.price} ${usdtBalance.data.change}` : '$0.00 0.00%'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {usdtBalance.isLoading ? '로딩 중...' : usdtBalance.data?.balance || '0.00'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {usdtBalance.isLoading ? '로딩 중...' : usdtBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}
              
              {selectedWallet.addresses.SOL && enabledAssets.includes('SOL') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <SolIcon size={60} />
                  <div className="balance-card-inner">
                    <span className="balance-card-name">SOL</span>
                    <span className="balance-card-usd" style={{ color: solBalance.data?.changeColor || '#EB5757' }}>
                      {solBalance.isLoading ? '로딩 중...' : solBalance.data?.price ? `${solBalance.data.price} ${solBalance.data.change}` : '$0.00 0.00%'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {solBalance.isLoading ? '로딩 중...' : solBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {solBalance.isLoading ? '로딩 중...' : solBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}

              {selectedWallet.addresses.BASE && enabledAssets.includes('BASE') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <BaseIcon size={60} />
                  <div className="balance-card-inner">
                    <span className="balance-card-name">BASE</span>
                    <span className="balance-card-usd" style={{ color: baseBalance.data?.changeColor || '#6FCF97' }}>
                      {baseBalance.isLoading ? '로딩 중...' : baseBalance.data?.price ? `${baseBalance.data.price} ${baseBalance.data.change}` : '$0.00 0.00%'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {baseBalance.isLoading ? '로딩 중...' : baseBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {baseBalance.isLoading ? '로딩 중...' : baseBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}

              {selectedWallet.addresses['ETH-SEPOLIA'] && enabledAssets.includes('ETH-SEPOLIA') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <EthIcon size={60} />
                  <div className="balance-card-inner">
                    <span className="balance-card-name">ETH-SEPOLIA</span>
                    <span className="balance-card-usd" style={{ color: ethSepoliaBalance.data?.changeColor || '#6FCF97' }}>
                      {ethSepoliaBalance.isLoading ? '로딩 중...' : ethSepoliaBalance.data?.price ? `${ethSepoliaBalance.data.price} ${ethSepoliaBalance.data.change}` : 'Testnet N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {ethSepoliaBalance.isLoading ? '로딩 중...' : ethSepoliaBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {ethSepoliaBalance.isLoading ? '로딩 중...' : ethSepoliaBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}

              {selectedWallet.addresses['SOL-DEVNET'] && enabledAssets.includes('SOL-DEVNET') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <SolIcon size={60} />
                  <div className="balance-card-inner">
                    <span className="balance-card-name">SOL-DEVNET</span>
                    <span className="balance-card-usd" style={{ color: solDevnetBalance.data?.changeColor || '#6FCF97' }}>
                      {solDevnetBalance.isLoading ? '로딩 중...' : solDevnetBalance.data?.price ? `${solDevnetBalance.data.price} ${solDevnetBalance.data.change}` : 'Testnet N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {solDevnetBalance.isLoading ? '로딩 중...' : solDevnetBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {solDevnetBalance.isLoading ? '로딩 중...' : solDevnetBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}

              {selectedWallet.addresses['BASE-SEPOLIA'] && enabledAssets.includes('BASE-SEPOLIA') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <BaseIcon size={60} />
                  <div className="balance-card-inner">
                    <span className="balance-card-name">BASE-SEPOLIA</span>
                    <span className="balance-card-usd" style={{ color: baseSepoliaBalance.data?.changeColor || '#6FCF97' }}>
                      {baseSepoliaBalance.isLoading ? '로딩 중...' : baseSepoliaBalance.data?.price ? `${baseSepoliaBalance.data.price} ${baseSepoliaBalance.data.change}` : 'Testnet N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {baseSepoliaBalance.isLoading ? '로딩 중...' : baseSepoliaBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {baseSepoliaBalance.isLoading ? '로딩 중...' : baseSepoliaBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}

              {selectedWallet.addresses['ETH-GOERLI'] && enabledAssets.includes('ETH-GOERLI') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <EthIcon size={60} />
                  <div className="balance-card-inner">
                    <span className="balance-card-name">ETH-GOERLI</span>
                    <span className="balance-card-usd" style={{ color: ethGoerliBalance.data?.changeColor || '#6FCF97' }}>
                      {ethGoerliBalance.isLoading ? '로딩 중...' : ethGoerliBalance.data?.price ? `${ethGoerliBalance.data.price} ${ethGoerliBalance.data.change}` : 'Testnet N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {ethGoerliBalance.isLoading ? '로딩 중...' : ethGoerliBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {ethGoerliBalance.isLoading ? '로딩 중...' : ethGoerliBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}

              {selectedWallet.addresses['BASE-GOERLI'] && enabledAssets.includes('BASE-GOERLI') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <BaseIcon size={60} />
                  <div className="balance-card-inner">
                    <span className="balance-card-name">BASE-GOERLI</span>
                    <span className="balance-card-usd" style={{ color: baseGoerliBalance.data?.changeColor || '#6FCF97' }}>
                      {baseGoerliBalance.isLoading ? '로딩 중...' : baseGoerliBalance.data?.price ? `${baseGoerliBalance.data.price} ${baseGoerliBalance.data.change}` : 'Testnet N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {baseGoerliBalance.isLoading ? '로딩 중...' : baseGoerliBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {baseGoerliBalance.isLoading ? '로딩 중...' : baseGoerliBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}

              {selectedWallet.addresses['SOL-TESTNET'] && enabledAssets.includes('SOL-TESTNET') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <SolIcon size={60} />
                  <div className="balance-card-inner">
                    <span className="balance-card-name">SOL-TESTNET</span>
                    <span className="balance-card-usd" style={{ color: solTestnetBalance.data?.changeColor || '#6FCF97' }}>
                      {solTestnetBalance.isLoading ? '로딩 중...' : solTestnetBalance.data?.price ? `${solTestnetBalance.data.price} ${solTestnetBalance.data.change}` : 'Testnet N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {solTestnetBalance.isLoading ? '로딩 중...' : solTestnetBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {solTestnetBalance.isLoading ? '로딩 중...' : solTestnetBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}

              {/* 다른 체인들 */}
              {enabledAssets.includes('MATIC') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                    M
                  </div>
                  <div className="balance-card-inner">
                    <span className="balance-card-name">MATIC</span>
                    <span className="balance-card-usd" style={{ color: maticBalance.data?.changeColor || '#6FCF97' }}>
                      {maticBalance.isLoading ? '로딩 중...' : maticBalance.data?.price ? `${maticBalance.data.price} ${maticBalance.data.change}` : '$0.00 0.00%'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {maticBalance.isLoading ? '로딩 중...' : maticBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {maticBalance.isLoading ? '로딩 중...' : maticBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}

              {enabledAssets.includes('BSC') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-xl">
                    B
                  </div>
                  <div className="balance-card-inner">
                    <span className="balance-card-name">BSC</span>
                    <span className="balance-card-usd" style={{ color: bscBalance.data?.changeColor || '#6FCF97' }}>
                      {bscBalance.isLoading ? '로딩 중...' : bscBalance.data?.price ? `${bscBalance.data.price} ${bscBalance.data.change}` : '$0.00 0.00%'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {bscBalance.isLoading ? '로딩 중...' : bscBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {bscBalance.isLoading ? '로딩 중...' : bscBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}

              {enabledAssets.includes('AVAX') && (
                <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
                  <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-xl">
                    A
                  </div>
                  <div className="balance-card-inner">
                    <span className="balance-card-name">AVAX</span>
                    <span className="balance-card-usd" style={{ color: avaxBalance.data?.changeColor || '#EB5757' }}>
                      {avaxBalance.isLoading ? '로딩 중...' : avaxBalance.data?.price ? `${avaxBalance.data.price} ${avaxBalance.data.change}` : '$0.00 0.00%'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end ml-auto">
                    <span className="balance-card-amount">
                      {avaxBalance.isLoading ? '로딩 중...' : avaxBalance.data?.balance || '0.00000'}
                    </span>
                    <span className="balance-card-sub-usd">
                      {avaxBalance.isLoading ? '로딩 중...' : avaxBalance.data?.usdValue || '$0.00'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
          
          {!selectedWallet && !isWalletListLoading && (
            <div className="common-card" style={{ padding: '14px 24px', gap: 20 }}>
              <div className="balance-card-inner">
                <span className="balance-card-name">지갑이 없습니다</span>
                <span className="balance-card-usd" style={{ color: '#A0A0B0' }}>새 지갑을 생성해주세요</span>
              </div>
            </div>
          )}
        </div>

        {/* 가상자산 추가 링크 */}
        {selectedWallet && (
          <div className="text-center mt-4">
            <button 
              onClick={() => router.push('/add-assets')}
              className="text-[#F2A003] text-sm font-semibold hover:text-[#E09400] transition-colors"
            >
              + 가상자산 추가
            </button>
          </div>
        )}
        
        {/* 쿠폰 리스트: balanceType이 '쿠폰'일 때만 노출, 리스트 위에는 아무 정보도 없음 */}
        {balanceType === '쿠폰' && (
          <div className="coupon-list">
            {filteredCouponList.map(coupon => (
              <div key={coupon.id} className="coupon-card">
                <div className="flex-1">
                  <div className="coupon-card-name">{coupon.name} <span className="text-orange-400 font-extrabold">${coupon.amount}</span></div>
                  <div className="coupon-card-expire">유효기간: {coupon.expireAt}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* D'Cent Wallet 워터마크 */}
        <div className="watermark">
          <span>D'Cent Wallet</span>
        </div>
      </main>

      {/* 하단 탭바 */}
      <TabBar />
    </div>
  );
}