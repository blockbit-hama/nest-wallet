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
import { regenerateAllWalletPrivateKeys } from "../lib/wallet-utils";

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
    
    return total;
  };

  const totalUSD = calculateTotalUSD();

  // HD Wallet 목록 로드
  useEffect(() => {
    loadWallets();
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
      
      // 잔액 데이터 디버깅
      console.log('BTC 잔액 데이터:', btcBalance.data);
      console.log('ETH 잔액 데이터:', ethBalance.data);
      console.log('USDT 잔액 데이터:', usdtBalance.data);
      console.log('MATIC 잔액 데이터:', maticBalance.data);
      console.log('BSC 잔액 데이터:', bscBalance.data);
      console.log('AVAX 잔액 데이터:', avaxBalance.data);
    }
  }, [selectedWallet, enabledAssets, btcBalance.data, ethBalance.data, usdtBalance.data, maticBalance.data, bscBalance.data, avaxBalance.data]);

  // assetsUpdated 이벤트 수신
  useEffect(() => {
    const handleAssetsUpdated = (event: CustomEvent) => {
      console.log('자산 업데이트 이벤트 수신:', event.detail);
      // 이벤트는 useEnabledAssets hook에서 처리됨
    };

    window.addEventListener('assetsUpdated', handleAssetsUpdated as EventListener);
    return () => {
      window.removeEventListener('assetsUpdated', handleAssetsUpdated as EventListener);
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
      setCouponList(response.coupons || []);
      
      // 총 쿠폰 금액 계산
      const total = response.coupons?.reduce((sum, coupon) => {
        return sum + Number(coupon.amountRemaining);
      }, 0) || 0;
      setTotalCouponAmount(total);
      
      console.log('쿠폰 목록 로드 완료:', response.coupons);
      console.log('총 쿠폰 금액:', total);
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