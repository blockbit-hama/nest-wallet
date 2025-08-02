"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEnabledAssets } from "../../hooks/useWalletAtoms";
import { useWallet } from "../../hooks/wallet/useWallet";
import { getCryptoPrices, getChangeColor, formatPrice, formatChangePercentage } from "../../lib/api/crypto-price";
import { getWalletById, getNextAccountPath, getNextEthAddressPath, createCustomDerivationPath } from "../../lib/wallet-utils";
import { Button, Input, Card } from "../../components/ui";

// 가상자산 타입 정의
interface Asset {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  price: string;
  change: string;
  changeColor: string;
  isEnabled: boolean;
  derivationPath?: string;
}

// 사용자 정의 자산 타입
interface CustomAsset {
  symbol: string;
  name: string;
  coinType: number;
  account: number;
  change: number;
  addressIndex: number;
}

export default function AddAssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customAsset, setCustomAsset] = useState<CustomAsset>({
    symbol: '',
    name: '',
    coinType: 60,
    account: 0,
    change: 0,
    addressIndex: 0
  });

  // 새로운 atoms hooks 사용
  const { updateEnabledAssets, loadEnabledAssets } = useEnabledAssets();
  const { generateNewAssetKey } = useWallet();

  // 지원하는 암호화폐 목록 (기본 자산들)
  const supportedAssets = [
    { id: "btc", symbol: "BTC", name: "Bitcoin", icon: "₿" },
    { id: "eth", symbol: "ETH", name: "Ethereum", icon: "Ξ" },
    { id: "sol", symbol: "SOL", name: "Solana", icon: "◎" },
    { id: "usdt", symbol: "USDT", name: "Tether", icon: "$" },
    { id: "matic", symbol: "MATIC", name: "Polygon", icon: "M" },
    { id: "bsc", symbol: "BSC", name: "BNB", icon: "B" },
    { id: "avax", symbol: "AVAX", name: "Avalanche", icon: "A" },
  ];

  // 실시간 가격 정보 로드
  const loadAssetPrices = async () => {
    const symbols = supportedAssets.map(asset => asset.symbol);
    const cryptoPrices = await getCryptoPrices(symbols);

    // 가격 정보를 assets 배열에 매핑 (isEnabled는 기존 상태 유지)
    const assetsWithPrices = supportedAssets.map(asset => {
      const priceData = cryptoPrices.find(price => price.symbol === asset.symbol);
      
      return {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        icon: asset.icon,
        price: priceData ? formatPrice(priceData.price) : '$0.00',
        change: priceData ? formatChangePercentage(priceData.priceChangePercentage24h) : '0.00%',
        changeColor: priceData ? getChangeColor(priceData.priceChangePercentage24h) : '#A0A0B0',
        isEnabled: false // 초기값, 나중에 저장된 상태로 덮어씌워짐
      };
    });

    setAssets(assetsWithPrices);
  };

  // 컴포넌트 마운트 시 가격 정보 로드 및 저장된 자산 설정 복원
  useEffect(() => {
    let isMounted = true;
    
    const initializeAssets = async () => {
      try {
        setIsLoading(true);
        await loadAssetPrices();
        
        // 저장된 활성화된 자산 설정 로드
        const savedEnabledAssets = localStorage.getItem('enabledAssets');
        if (savedEnabledAssets && isMounted) {
          try {
            const enabledAssets = JSON.parse(savedEnabledAssets);
            const enabledSymbols = enabledAssets.map((asset: any) => asset.symbol);
            
            setAssets(prevAssets => 
              prevAssets.map(asset => ({
                ...asset,
                isEnabled: enabledSymbols.includes(asset.symbol)
              }))
            );
            
            console.log('저장된 활성화된 자산 로드:', enabledSymbols);
          } catch (error) {
            console.error('활성화된 자산 로드 실패:', error);
          }
        }
      } catch (error) {
        console.error('자산 초기화 실패:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAssets();
    
    return () => {
      isMounted = false;
    };
  }, []); // 의존성 배열을 비워서 한 번만 실행

  // 토글 버튼 클릭 핸들러
  const handleToggle = (assetId: string) => {
    setAssets(prevAssets => 
      prevAssets.map(asset => 
        asset.id === assetId 
          ? { ...asset, isEnabled: !asset.isEnabled }
          : asset
      )
    );
  };

  // 사용자 정의 자산 추가
  const handleAddCustomAsset = async () => {
    try {
      if (!customAsset.symbol || !customAsset.name) {
        alert('심볼과 이름을 입력해주세요.');
        return;
      }

      const derivationPath = createCustomDerivationPath(
        customAsset.coinType,
        customAsset.account,
        customAsset.change,
        customAsset.addressIndex
      );

      console.log('사용자 정의 자산 추가:', {
        symbol: customAsset.symbol,
        derivationPath
      });

      // 자산 생성
      const newAssetKey = await generateNewAssetKey(customAsset.symbol, derivationPath);
      
      if (newAssetKey) {
        console.log('사용자 정의 자산 생성 완료:', newAssetKey);
        
        // 활성화된 자산 목록에 추가
        const newAsset: Asset = {
          id: customAsset.symbol.toLowerCase(),
          symbol: customAsset.symbol,
          name: customAsset.name,
          icon: customAsset.symbol.charAt(0),
          price: '$0.00',
          change: '0.00%',
          changeColor: '#A0A0B0',
          isEnabled: true,
          derivationPath
        };

        setAssets(prev => [...prev, newAsset]);
        setShowCustomForm(false);
        setCustomAsset({
          symbol: '',
          name: '',
          coinType: 60,
          account: 0,
          change: 0,
          addressIndex: 0
        });

        alert(`${customAsset.symbol} 자산이 추가되었습니다.`);
      }
    } catch (error) {
      console.error('사용자 정의 자산 추가 실패:', error);
      alert('자산 추가에 실패했습니다.');
    }
  };

  // 저장 함수
  const handleSave = async () => {
    try {
      // 활성화된 자산 정보를 atoms로 업데이트
      const enabledAssets = assets.filter(asset => asset.isEnabled);
      const enabledSymbols = enabledAssets.map(asset => asset.symbol);
      
      // 현재 활성화된 자산과 이전 활성화된 자산 비교
      const savedEnabledAssets = localStorage.getItem('enabledAssets');
      let previousEnabledSymbols: string[] = [];
      
      if (savedEnabledAssets) {
        try {
          const enabledAssets = JSON.parse(savedEnabledAssets);
          previousEnabledSymbols = enabledAssets.map((asset: any) => asset.symbol);
        } catch (error) {
          console.error('이전 활성화된 자산 로드 실패:', error);
        }
      }
      
      // 새로 추가된 자산들 찾기
      const newlyAddedAssets = enabledSymbols.filter(symbol => 
        !previousEnabledSymbols.includes(symbol)
      );
      
      console.log('새로 추가된 자산들:', newlyAddedAssets);
      
      // 새로 추가된 자산들에 대해 주소와 개인키 생성
      for (const symbol of newlyAddedAssets) {
        try {
          console.log(`${symbol} 자산의 주소와 개인키 생성 중...`);
          
          // 자산에 따른 파생 경로 결정
          let derivationPath: string | undefined;
          const asset = assets.find(a => a.symbol === symbol);
          
          if (asset?.derivationPath) {
            // 사용자 정의 자산
            derivationPath = asset.derivationPath;
          } else if (symbol === 'SOL') {
            // 솔라나는 고정된 derivation path 사용
            derivationPath = "m/44'/501'/0'/0/0";
          } else if (symbol === 'ETH') {
            // ETH 추가 주소
            const existingEthAddresses = enabledSymbols.filter(s => s.startsWith('ETH'));
            derivationPath = getNextEthAddressPath(existingEthAddresses);
          } else {
            // 다른 토큰들 (account로 구분)
            const existingAssets = enabledSymbols.filter(s => s !== 'BTC' && s !== 'ETH' && s !== 'SOL' && !s.startsWith('ETH'));
            derivationPath = getNextAccountPath(existingAssets);
          }
          
          console.log(`${symbol} 자산 생성 시도 - derivationPath:`, derivationPath);
          const newAssetKey = await generateNewAssetKey(symbol, derivationPath);
          
          if (newAssetKey) {
            console.log(`${symbol} 자산 생성 완료:`, {
              symbol: newAssetKey.symbol,
              address: newAssetKey.address,
              derivationPath
            });
            
            // 지갑 정보 업데이트 (로컬 스토리지에 저장)
            const wallets = JSON.parse(localStorage.getItem('hdWallets') || '[]');
            const currentWallet = wallets.find((w: any) => w.id === localStorage.getItem('selectedWalletId'));
            
            if (currentWallet) {
              // 주소와 개인키 추가
              currentWallet.addresses[symbol] = newAssetKey.address;
              if (!currentWallet.privateKeys) {
                currentWallet.privateKeys = {};
              }
              currentWallet.privateKeys[symbol] = newAssetKey.privateKey;
              
              // 업데이트된 지갑 정보 저장
              const updatedWallets = wallets.map((w: any) => 
                w.id === currentWallet.id ? currentWallet : w
              );
              localStorage.setItem('hdWallets', JSON.stringify(updatedWallets));
              
              console.log(`${symbol} 자산이 지갑에 추가되었습니다.`);
            }
          } else {
            console.error(`${symbol} 자산 생성 실패 - generateNewAssetKey가 null 반환`);
          }
        } catch (error) {
          console.error(`${symbol} 자산 생성 중 오류:`, error);
        }
      }
      
      // 활성화된 자산 업데이트 (이 함수가 localStorage에 저장함)
      updateEnabledAssets(enabledSymbols);
      
      console.log('가상자산 설정 저장 완료:', {
        enabledAssets,
        enabledSymbols
      });
      
      // 디버깅용: 저장 후 localStorage 확인
      const debugEnabledAssets = localStorage.getItem('enabledAssets');
      const debugWallets = localStorage.getItem('hdWallets');
      console.log('저장 후 localStorage 상태:', {
        enabledAssets: debugEnabledAssets,
        wallets: debugWallets ? JSON.parse(debugWallets).map((w: any) => ({
          id: w.id,
          addresses: w.addresses
        })) : null
      });
      
      alert('가상자산 설정이 저장되었습니다!');
      router.push('/');
    } catch (error) {
      console.error('가상자산 설정 저장 실패:', error);
      alert('가상자산 설정 저장에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#14151A' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <button 
          onClick={() => router.push('/')}
          className="text-white text-lg font-semibold"
        >
          ← 뒤로
        </button>
        <h1 className="text-xl font-bold text-white">가상자산 추가</h1>
        <button 
          onClick={handleSave}
          className="text-[#F2A003] text-lg font-semibold"
        >
          저장
        </button>
      </div>

      {/* 자산 리스트 */}
      <div className="p-6">
        <div className="text-white text-sm mb-4">
          토글을 켜면 홈 화면에 해당 가상자산이 표시됩니다.
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#F2A003] border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-white">가격 정보를 불러오는 중...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => (
              <div 
                key={asset.id}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: '#23242A' }}
              >
                {/* 자산 정보 */}
                <div className="flex items-center gap-4">
                  {/* 아이콘 */}
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ 
                      background: asset.symbol === 'BTC' ? 'linear-gradient(135deg, #F7931A, #FFB800)' :
                                asset.symbol === 'ETH' ? 'linear-gradient(135deg, #627EEA, #B2BFFF)' :
                                asset.symbol === 'USDT' ? 'linear-gradient(135deg, #26A17B, #baffd7)' :
                                asset.symbol === 'USDC' ? 'linear-gradient(135deg, #2775CA, #5A9FD4)' :
                                asset.symbol === 'MATIC' ? 'linear-gradient(135deg, #8247E5, #A855F7)' :
                                asset.symbol === 'BSC' ? 'linear-gradient(135deg, #F3BA2F, #F7931A)' :
                                asset.symbol === 'AVAX' ? 'linear-gradient(135deg, #E84142, #FF6B6B)' :
                                asset.symbol === 'SOL' ? 'linear-gradient(135deg, #9945FF, #14F195)' :
                                asset.symbol === 'ADA' ? 'linear-gradient(135deg, #0033AD, #4C5BB3)' :
                                asset.symbol === 'DOT' ? 'linear-gradient(135deg, #E6007A, #FF6B9D)' :
                                asset.symbol === 'LINK' ? 'linear-gradient(135deg, #2A5ADA, #4C5BB3)' :
                                asset.symbol === 'UNI' ? 'linear-gradient(135deg, #FF007A, #FF6B9D)' :
                                asset.symbol === 'LTC' ? 'linear-gradient(135deg, #BEBEBE, #D3D3D3)' :
                                asset.symbol === 'BCH' ? 'linear-gradient(135deg, #F7931A, #FFB800)' :
                                asset.symbol === 'XRP' ? 'linear-gradient(135deg, #23292F, #4C5BB3)' :
                                asset.symbol === 'DOGE' ? 'linear-gradient(135deg, #C2A633, #D4AF37)' :
                                asset.symbol === 'SHIB' ? 'linear-gradient(135deg, #FF6B6B, #FF8E8E)' :
                                asset.symbol === 'TRX' ? 'linear-gradient(135deg, #FF6B6B, #FF8E8E)' :
                                asset.symbol === 'XLM' ? 'linear-gradient(135deg, #4C5BB3, #6B7BC6)' :
                                asset.symbol === 'VET' ? 'linear-gradient(135deg, #15BDFF, #4CC3FF)' :
                                'linear-gradient(135deg, #2E5A88, #4C5BB3)'
                    }}
                  >
                    {asset.icon}
                  </div>
                  
                  {/* 자산 정보 */}
                  <div>
                    <div className="text-white font-semibold">{asset.name}</div>
                    <div className="text-gray-400 text-sm">{asset.symbol}</div>
                  </div>
                </div>

                {/* 가격 정보 */}
                <div className="text-right">
                  <div className="text-white font-semibold">{asset.price}</div>
                  <div className="text-sm" style={{ color: asset.changeColor }}>
                    {asset.change}
                  </div>
                </div>

                {/* 토글 버튼 */}
                <div className="ml-4">
                  <button
                    onClick={() => handleToggle(asset.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#F2A003] focus:ring-offset-2 focus:ring-offset-gray-800 ${
                      asset.isEnabled ? 'bg-[#F2A003]' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        asset.isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 사용자 정의 자산 추가 섹션 */}
      <div className="p-6 border-t border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">사용자 정의 자산 추가</h2>
          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="text-[#F2A003] text-sm font-semibold hover:text-[#E09400] transition-colors"
          >
            {showCustomForm ? '취소' : '+ 직접 추가'}
          </button>
        </div>

        {showCustomForm && (
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  심볼
                </label>
                <Input
                  type="text"
                  placeholder="예: CUSTOM"
                  value={customAsset.symbol}
                  onChange={(e) => setCustomAsset(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  이름
                </label>
                <Input
                  type="text"
                  placeholder="예: Custom Token"
                  value={customAsset.name}
                  onChange={(e) => setCustomAsset(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Coin Type
                </label>
                <Input
                  type="number"
                  placeholder="60"
                  value={customAsset.coinType}
                  onChange={(e) => setCustomAsset(prev => ({ ...prev, coinType: parseInt(e.target.value) || 60 }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={customAsset.account}
                  onChange={(e) => setCustomAsset(prev => ({ ...prev, account: parseInt(e.target.value) || 0 }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Change
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={customAsset.change}
                  onChange={(e) => setCustomAsset(prev => ({ ...prev, change: parseInt(e.target.value) || 0 }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address Index
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={customAsset.addressIndex}
                  onChange={(e) => setCustomAsset(prev => ({ ...prev, addressIndex: parseInt(e.target.value) || 0 }))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="text-sm text-gray-400">
              파생 경로: m/44'/{customAsset.coinType}'/{customAsset.account}'/{customAsset.change}/{customAsset.addressIndex}
            </div>

            <Button
              onClick={handleAddCustomAsset}
              className="w-full bg-[#F2A003] hover:bg-[#E09400] text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              자산 추가
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
} 