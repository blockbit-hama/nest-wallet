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
  isTestnet?: boolean;
  rpcUrl?: string;
  networkType?: string;
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

  // 컴포넌트 마운트 및 환경 정보 로깅
  useEffect(() => {
    console.log('🔵 [Add Assets Page] 컴포넌트 마운트됨');
    console.log('🔵 [Add Assets Page] 환경 정보:', {
      NODE_ENV: process.env.NODE_ENV,
      windowLocation: typeof window !== 'undefined' ? window.location.href : 'SSR',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR',
      supportedAssetsCount: supportedAssets.length
    });
  }, []);

  // 새로운 atoms hooks 사용
  const { updateEnabledAssets, loadEnabledAssets } = useEnabledAssets();
  const { generateNewAssetKey } = useWallet();

  // 지원하는 암호화폐 목록 (기본 자산들 + 테스트넷)
  const supportedAssets = [
    { id: "btc", symbol: "BTC", name: "Bitcoin", icon: "₿", networkType: "Bitcoin Mainnet" },
    { id: "eth", symbol: "ETH", name: "Ethereum", icon: "Ξ", networkType: "Ethereum Mainnet", rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/GPTx_vXGL4Z6NxRMjBTHowIQU8-Jt0c-" },
    { id: "sol", symbol: "SOL", name: "Solana", icon: "◎", networkType: "Solana Mainnet", rpcUrl: "https://solana-mainnet.g.allthatnode.com/archive/json_rpc/006290a8b32b4a3e86cdc5c949333263" },
    { id: "base", symbol: "BASE", name: "Base", icon: "B", networkType: "Base Mainnet", rpcUrl: "https://base-mainnet.g.allthatnode.com/archive/evm/006290a8b32b4a3e86cdc5c949333263" },
    { id: "usdt", symbol: "USDT", name: "Tether", icon: "$", networkType: "Ethereum Mainnet" },
    { id: "matic", symbol: "MATIC", name: "Polygon", icon: "M", networkType: "Polygon Mainnet" },
    { id: "bsc", symbol: "BSC", name: "BNB", icon: "B", networkType: "BNB Smart Chain" },
    { id: "avax", symbol: "AVAX", name: "Avalanche", icon: "A", networkType: "Avalanche C-Chain" },
    // 테스트넷 자산들
    { id: "eth-goerli", symbol: "ETH-GOERLI", name: "Ethereum Goerli", icon: "Ξ", isTestnet: true, networkType: "Ethereum Goerli Testnet", rpcUrl: "https://eth-goerli.g.alchemy.com/v2/your-api-key" },
    { id: "eth-sepolia", symbol: "ETH-SEPOLIA", name: "Ethereum Sepolia", icon: "Ξ", isTestnet: true, networkType: "Ethereum Sepolia Testnet", rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/hlm24QaedvTfFFy2vnHyP_lgadkFT1Sg" },
    { id: "sol-devnet", symbol: "SOL-DEVNET", name: "Solana Devnet", icon: "◎", isTestnet: true, networkType: "Solana Devnet", rpcUrl: "https://solana-devnet.g.allthatnode.com/archive/json_rpc/006290a8b32b4a3e86cdc5c949333263" },
    { id: "sol-testnet", symbol: "SOL-TESTNET", name: "Solana Testnet", icon: "◎", isTestnet: true, networkType: "Solana Testnet", rpcUrl: "https://api.testnet.solana.com" },
    { id: "base-goerli", symbol: "BASE-GOERLI", name: "Base Goerli", icon: "B", isTestnet: true, networkType: "Base Goerli Testnet", rpcUrl: "https://goerli.base.org" },
    { id: "base-sepolia", symbol: "BASE-SEPOLIA", name: "Base Sepolia", icon: "B", isTestnet: true, networkType: "Base Sepolia Testnet", rpcUrl: "https://base-sepolia.g.allthatnode.com/full/evm/006290a8b32b4a3e86cdc5c949333263" },
  ];

  // 실시간 가격 정보 로드
  const loadAssetPrices = async () => {
    console.log('💰 [Add Assets Page] 자산 가격 정보 로드 시작');

    // 메인넷 자산들만 가격 정보 조회 (테스트넷은 가격 정보 없음)
    const mainnetSymbols = supportedAssets
      .filter(asset => !asset.isTestnet)
      .map(asset => asset.symbol);

    console.log('💰 [Add Assets Page] 메인넷 자산들:', mainnetSymbols);

    const cryptoPrices = await getCryptoPrices(mainnetSymbols);
    console.log('💰 [Add Assets Page] 가격 정보 조회 완료:', {
      requestedCount: mainnetSymbols.length,
      receivedCount: cryptoPrices.length
    });

    // 가격 정보를 assets 배열에 매핑 (isEnabled는 기존 상태 유지)
    const assetsWithPrices = supportedAssets.map(asset => {
      const priceData = cryptoPrices.find(price => price.symbol === asset.symbol);
      
      return {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        icon: asset.icon,
        price: asset.isTestnet ? 'Testnet' : (priceData ? formatPrice(priceData.price) : '$0.00'),
        change: asset.isTestnet ? 'N/A' : (priceData ? formatChangePercentage(priceData.priceChangePercentage24h) : '0.00%'),
        changeColor: asset.isTestnet ? '#A0A0B0' : (priceData ? getChangeColor(priceData.priceChangePercentage24h) : '#A0A0B0'),
        isEnabled: false, // 초기값, 나중에 저장된 상태로 덮어씌워짐
        isTestnet: asset.isTestnet,
        rpcUrl: asset.rpcUrl,
        networkType: asset.networkType
      };
    });

    setAssets(assetsWithPrices);
    console.log('💰 [Add Assets Page] 자산 목록 설정 완료:', assetsWithPrices.length);
  };

  // 컴포넌트 마운트 시 가격 정보 로드 및 저장된 자산 설정 복원
  useEffect(() => {
    let isMounted = true;
    
    const initializeAssets = async () => {
      console.log('🚀 [Add Assets Page] 자산 초기화 시작');
      try {
        setIsLoading(true);
        await loadAssetPrices();

        // 저장된 활성화된 자산 설정 로드
        const savedEnabledAssets = localStorage.getItem('enabledAssets');
        console.log('💾 [Add Assets Page] 저장된 활성화 자산 확인:', !!savedEnabledAssets);

        if (savedEnabledAssets && isMounted) {
          try {
            const enabledAssets = JSON.parse(savedEnabledAssets);
            const enabledSymbols = enabledAssets.map((asset: any) => asset.symbol);

            console.log('💾 [Add Assets Page] 활성화된 자산 심볼들:', enabledSymbols);

            setAssets(prevAssets =>
              prevAssets.map(asset => ({
                ...asset,
                isEnabled: enabledSymbols.includes(asset.symbol)
              }))
            );

            console.log('✅ [Add Assets Page] 저장된 활성화된 자산 적용 완료');
          } catch (error) {
            console.error('❌ [Add Assets Page] 활성화된 자산 로드 실패:', error);
          }
        }
      } catch (error) {
        console.error('❌ [Add Assets Page] 자산 초기화 실패:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          console.log('🏁 [Add Assets Page] 자산 초기화 완료');
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
    console.log('🔄 [Add Assets Page] 자산 토글:', { assetId });

    setAssets(prevAssets =>
      prevAssets.map(asset => {
        if (asset.id === assetId) {
          const newEnabled = !asset.isEnabled;
          console.log('🔄 [Add Assets Page] 자산 상태 변경:', {
            symbol: asset.symbol,
            from: asset.isEnabled,
            to: newEnabled
          });
          return { ...asset, isEnabled: newEnabled };
        }
        return asset;
      })
    );
  };

  // 사용자 정의 자산 추가
  const handleAddCustomAsset = async () => {
    console.log('➕ [Add Assets Page] 사용자 정의 자산 추가 시작:', { customAsset });

    try {
      if (!customAsset.symbol || !customAsset.name) {
        console.log('❌ [Add Assets Page] 유효성 검사 실패 - 심볼 또는 이름 누락');
        alert('심볼과 이름을 입력해주세요.');
        return;
      }

      const derivationPath = createCustomDerivationPath(
        customAsset.coinType,
        customAsset.account,
        customAsset.change,
        customAsset.addressIndex
      );

      console.log('➕ [Add Assets Page] 파생 경로 생성:', {
        symbol: customAsset.symbol,
        derivationPath
      });

      // 자산 생성
      const newAssetKey = await generateNewAssetKey(customAsset.symbol, derivationPath);
      
      if (newAssetKey) {
        console.log('✅ [Add Assets Page] 사용자 정의 자산 생성 완료:', newAssetKey);
        
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

        console.log('✅ [Add Assets Page] 사용자 정의 자산 UI 업데이트 완료');
        alert(`${customAsset.symbol} 자산이 추가되었습니다.`);
      }
    } catch (error) {
      console.error('❌ [Add Assets Page] 사용자 정의 자산 추가 실패:', error);
      alert('자산 추가에 실패했습니다.');
    }
  };

  // 저장 함수
  const handleSave = async () => {
    console.log('💾 [Add Assets Page] 자산 설정 저장 시작');

    try {
      // 활성화된 자산 정보를 atoms로 업데이트
      const enabledAssets = assets.filter(asset => asset.isEnabled);
      const enabledSymbols = enabledAssets.map(asset => asset.symbol);

      console.log('💾 [Add Assets Page] 활성화된 자산들:', {
        count: enabledAssets.length,
        symbols: enabledSymbols
      });
      
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
      
      // 현재 지갑 정보 가져오기
      const wallets = JSON.parse(localStorage.getItem('hdWallets') || '[]');
      const currentWallet = wallets.find((w: any) => w.id === localStorage.getItem('selectedWalletId'));
      
      // 활성화된 모든 자산에 대해 주소가 없으면 생성
      const assetsNeedingAddresses = enabledSymbols.filter(symbol => {
        if (!currentWallet || !currentWallet.addresses) return true;
        return !currentWallet.addresses[symbol];
      });
      
      console.log('주소가 필요한 자산들:', assetsNeedingAddresses);
      
      // 주소가 필요한 자산들에 대해 주소와 개인키 생성
      for (const symbol of assetsNeedingAddresses) {
        try {
          console.log(`${symbol} 자산의 주소와 개인키 생성 중...`);
          
          // 자산에 따른 파생 경로 결정
          let derivationPath: string | undefined;
          const asset = assets.find(a => a.symbol === symbol);
          
          if (asset?.derivationPath) {
            // 사용자 정의 자산
            derivationPath = asset.derivationPath;
          } else if (symbol.includes('SOL')) {
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
          
          console.log(`${symbol} 자산 생성 시도 - derivationPath:`, derivationPath);
          const newAssetKey = await generateNewAssetKey(symbol, derivationPath);
          
          if (newAssetKey) {
            console.log(`${symbol} 자산 생성 완료:`, {
              symbol: newAssetKey.symbol,
              address: newAssetKey.address,
              derivationPath
            });
            
            if (currentWallet) {
              // 주소와 개인키 추가
              if (!currentWallet.addresses) currentWallet.addresses = {};
              if (!currentWallet.privateKeys) currentWallet.privateKeys = {};
              
              currentWallet.addresses[symbol] = newAssetKey.address;
              currentWallet.privateKeys[symbol] = newAssetKey.privateKey;
              
              console.log(`${symbol} 자산이 지갑에 추가되었습니다.`);
            }
          } else {
            console.error(`${symbol} 자산 생성 실패 - generateNewAssetKey가 null 반환`);
          }
        } catch (error) {
          console.error(`${symbol} 자산 생성 중 오류:`, error);
        }
      }
      
      // 지갑 정보 업데이트를 한 번에 저장
      if (currentWallet && assetsNeedingAddresses.length > 0) {
        const updatedWallets = wallets.map((w: any) => 
          w.id === currentWallet.id ? currentWallet : w
        );
        localStorage.setItem('hdWallets', JSON.stringify(updatedWallets));
        console.log('지갑 정보 업데이트 완료');
      }
      
      // 활성화된 자산 업데이트 (이 함수가 localStorage에 저장함)
      updateEnabledAssets(enabledSymbols);
      
      console.log('가상자산 설정 저장 완료:', {
        enabledAssets,
        enabledSymbols
      });
      
      // 지갑 목록 새로고침 이벤트 발생
      window.dispatchEvent(new CustomEvent('walletsUpdated'));
      
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
        
        {/* 메인넷 자산 섹션 */}
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3 text-lg">메인넷 자산</h3>
          <div className="space-y-3">
            {assets.filter(asset => !asset.isTestnet).map((asset) => (
              <div 
                key={asset.id}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: '#23242A' }}
              >
                {/* 자산 정보 */}
                <div className="flex items-center gap-4">
                  {/* 아이콘 */}
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg relative"
                    style={{ 
                      background: asset.symbol.includes('ETH') ? 'linear-gradient(135deg, #627EEA, #B2BFFF)' :
                                asset.symbol.includes('SOL') ? 'linear-gradient(135deg, #9945FF, #14F195)' :
                                asset.symbol.includes('BASE') ? 'linear-gradient(135deg, #0052FF, #4C5BB3)' :
                                asset.symbol === 'BTC' ? 'linear-gradient(135deg, #F7931A, #FFB800)' :
                                asset.symbol === 'USDT' ? 'linear-gradient(135deg, #26A17B, #baffd7)' :
                                asset.symbol === 'MATIC' ? 'linear-gradient(135deg, #8247E5, #A855F7)' :
                                asset.symbol === 'BSC' ? 'linear-gradient(135deg, #F3BA2F, #F7931A)' :
                                asset.symbol === 'AVAX' ? 'linear-gradient(135deg, #E84142, #FF6B6B)' :
                                'linear-gradient(135deg, #2E5A88, #4C5BB3)'
                    }}
                  >
                    {asset.icon}
                  </div>
                  
                  {/* 자산 정보 */}
                  <div>
                    <div className="text-white font-semibold flex items-center gap-2">
                      {asset.name}
                    </div>
                    <div className="text-gray-400 text-sm">{asset.symbol}</div>
                    {asset.networkType && (
                      <div className="text-gray-500 text-xs">{asset.networkType}</div>
                    )}
                    {asset.rpcUrl && (
                      <div className="text-gray-600 text-xs max-w-xs truncate" title={asset.rpcUrl}>
                        RPC: {asset.rpcUrl}
                      </div>
                    )}
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
        </div>

        {/* 테스트넷 자산 섹션 */}
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3 text-lg flex items-center gap-2">
            <span className="text-[#F2A003]">🧪</span>
            테스트넷 자산
          </h3>
          <div className="text-gray-400 text-sm mb-3">
            개발 및 테스트용 네트워크입니다. 실제 가치가 없습니다.
          </div>
          <div className="space-y-3">
            {assets.filter(asset => asset.isTestnet).map((asset) => (
              <div 
                key={asset.id}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ 
                  background: '#1a1b1f',
                  border: '1px solid #F2A003'
                }}
              >
                {/* 자산 정보 */}
                <div className="flex items-center gap-4">
                  {/* 아이콘 */}
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg relative"
                    style={{ 
                      background: asset.symbol.includes('ETH') ? 'linear-gradient(135deg, #627EEA, #B2BFFF)' :
                                asset.symbol.includes('SOL') ? 'linear-gradient(135deg, #9945FF, #14F195)' :
                                asset.symbol.includes('BASE') ? 'linear-gradient(135deg, #0052FF, #4C5BB3)' :
                                'linear-gradient(135deg, #2E5A88, #4C5BB3)'
                    }}
                  >
                    {asset.icon}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#F2A003] rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">T</span>
                    </div>
                  </div>
                  
                  {/* 자산 정보 */}
                  <div>
                    <div className="text-white font-semibold flex items-center gap-2">
                      {asset.name}
                      <span className="text-xs bg-[#F2A003] text-white px-2 py-1 rounded-full">
                        TESTNET
                      </span>
                    </div>
                    <div className="text-gray-400 text-sm">{asset.symbol}</div>
                    {asset.networkType && (
                      <div className="text-gray-500 text-xs">{asset.networkType}</div>
                    )}
                    {asset.rpcUrl && (
                      <div className="text-gray-600 text-xs max-w-xs truncate" title={asset.rpcUrl}>
                        RPC: {asset.rpcUrl}
                      </div>
                    )}
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
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#F2A003] border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-white">가격 정보를 불러오는 중...</span>
          </div>
        ) : null}
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