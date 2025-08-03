# Nest Wallet 자산별 상태관리 튜토리얼

이 문서는 nest-wallet에서 자산(Assets)의 상태를 어떻게 관리하는지에 대한 상세한 가이드입니다.

## 📚 목차

1. [상태관리 아키텍처 개요](#상태관리-아키텍처-개요)
2. [Jotai Atoms 기반 상태관리](#jotai-atoms-기반-상태관리)
3. [지갑 상태관리](#지갑-상태관리)
4. [활성화된 자산 관리](#활성화된-자산-관리)
5. [React Query를 통한 서버 상태](#react-query를-통한-서버-상태)
6. [Local Storage 연동](#local-storage-연동)
7. [이벤트 기반 상태 동기화](#이벤트-기반-상태-동기화)

## 상태관리 아키텍처 개요

nest-wallet은 다층 상태관리 아키텍처를 사용합니다:

```
┌─────────────────────────────────────────┐
│                UI Layer                 │ (React Components)
├─────────────────────────────────────────┤
│            State Layer                  │
│  ┌─────────────┐ ┌─────────────────────┐│
│  │    Jotai    │ │    React Query      ││ (Client State + Server State)
│  │   Atoms     │ │     Cache           ││
│  └─────────────┘ └─────────────────────┘│
├─────────────────────────────────────────┤
│          Persistence Layer              │ (Local Storage)
├─────────────────────────────────────────┤
│           API Layer                     │ (Blockchain APIs)
└─────────────────────────────────────────┘
```

### 주요 상태 카테고리

| 상태 타입 | 관리 도구 | 지속성 | 주요 용도 |
|----------|----------|--------|----------|
| **지갑 정보** | Jotai + localStorage | 영구 | 지갑 목록, 선택된 지갑 |
| **활성화된 자산** | Jotai + localStorage | 영구 | 사용자가 활성화한 코인 목록 |
| **잔액 데이터** | React Query | 임시 (30초) | 실시간 잔액, 가격 정보 |
| **트랜잭션 상태** | React Query | 임시 | 전송 상태, 수수료 예상 |

## Jotai Atoms 기반 상태관리

### Atoms 정의

```typescript
// src/store/atoms.ts
import { atom } from 'jotai';

// 지갑 목록 상태
export const walletListAtom = atom<WalletInfo[]>([]);

// 선택된 지갑 ID
export const selectedWalletIdAtom = atom<string>('');

// 지갑 목록 로딩 상태
export const walletListLoadingAtom = atom<boolean>(false);

// 활성화된 자산 목록 (심볼 배열)
export const enabledAssetsAtom = atom<string[]>([]);
```

### 복합 Atoms (Derived State)

```typescript
// 선택된 지갑 정보 (computed)
export const selectedWalletAtom = atom(
  (get) => {
    const walletList = get(walletListAtom);
    const selectedId = get(selectedWalletIdAtom);
    return walletList.find(w => w.id === selectedId) || null;
  }
);

// 활성화된 자산의 잔액 총합 (computed)
export const totalPortfolioValueAtom = atom(
  (get) => {
    const enabledAssets = get(enabledAssetsAtom);
    const selectedWallet = get(selectedWalletAtom);
    
    if (!selectedWallet) return 0;
    
    // 각 활성화된 자산의 USD 가치 합계 계산
    return enabledAssets.reduce((total, symbol) => {
      const balance = getBalanceForSymbol(selectedWallet, symbol);
      return total + balance.usdValue;
    }, 0);
  }
);
```

## 지갑 상태관리

### useWalletList Hook

```typescript
// src/hooks/useWalletAtoms.ts
export const useWalletList = () => {
  const [walletList, setWalletList] = useAtom(walletListAtom);
  const [selectedWalletId, setSelectedWalletId] = useAtom(selectedWalletIdAtom);
  const [isLoading, setIsLoading] = useAtom(walletListLoadingAtom);

  // 지갑 목록 로드 (localStorage에서)
  const loadWallets = () => {
    try {
      setIsLoading(true);
      const wallets = getWalletsFromStorage(); // localStorage 읽기
      setWalletList(wallets);
      
      // 저장된 선택된 지갑 복원
      const savedSelectedWalletId = localStorage.getItem('selectedWalletId');
      if (savedSelectedWalletId && wallets.find(w => w.id === savedSelectedWalletId)) {
        setSelectedWalletId(savedSelectedWalletId);
      } else if (wallets.length > 0) {
        setSelectedWalletIdWithStorage(wallets[0].id);
      }
    } catch (error) {
      console.error('지갑 목록 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 지갑 선택 시 localStorage에 자동 저장
  const setSelectedWalletIdWithStorage = (walletId: string) => {
    setSelectedWalletId(walletId);
    localStorage.setItem('selectedWalletId', walletId);
  };

  // 선택된 지갑 정보 (computed)
  const selectedWallet = walletList.find(w => w.id === selectedWalletId);

  return {
    walletList,
    selectedWallet,
    selectedWalletId,
    setSelectedWalletId: setSelectedWalletIdWithStorage,
    isLoading,
    loadWallets,
    refreshWalletList: loadWallets
  };
};
```

### 지갑 생성 플로우

```typescript
// 새 지갑 생성 시 상태 업데이트
const createNewWallet = async (name: string) => {
  try {
    // 1. HD 지갑 생성
    const newWallet = await createHDWallet({ name });
    
    // 2. localStorage에 저장
    const existingWallets = getWalletsFromStorage();
    const updatedWallets = [...existingWallets, newWallet];
    localStorage.setItem('hdWallets', JSON.stringify(updatedWallets));
    
    // 3. Atom 상태 업데이트
    setWalletList(updatedWallets);
    setSelectedWalletId(newWallet.id);
    
    // 4. 기본 자산 활성화 (BTC, ETH)
    updateEnabledAssets(['BTC', 'ETH']);
    
    return newWallet;
  } catch (error) {
    console.error('지갑 생성 실패:', error);
    throw error;
  }
};
```

## 활성화된 자산 관리

### useEnabledAssets Hook

```typescript
export const useEnabledAssets = () => {
  const [enabledAssets, setEnabledAssets] = useAtom(enabledAssetsAtom);

  // localStorage에서 활성화된 자산 로드
  const loadEnabledAssets = () => {
    const savedEnabledAssets = localStorage.getItem('enabledAssets');
    if (savedEnabledAssets) {
      try {
        const assets = JSON.parse(savedEnabledAssets);
        const assetSymbols = assets.map((asset: any) => asset.symbol);
        setEnabledAssets(assetSymbols);
        console.log('활성화된 자산 로드:', assetSymbols);
      } catch (error) {
        console.error('활성화된 자산 로드 실패:', error);
      }
    }
  };

  // 활성화된 자산 업데이트 (localStorage + 이벤트 발생)
  const updateEnabledAssets = (assets: string[]) => {
    // 1. Atom 상태 업데이트
    setEnabledAssets(assets);
    
    // 2. localStorage에 저장
    const assetsData = assets.map(symbol => ({ symbol }));
    localStorage.setItem('enabledAssets', JSON.stringify(assetsData));
    
    // 3. 글로벌 이벤트 발생 (다른 컴포넌트에 알림)
    window.dispatchEvent(new CustomEvent('assetsUpdated', { 
      detail: { enabledAssets: assets }
    }));
  };

  // 초기 로딩 시 localStorage에서 복원
  useEffect(() => {
    if (typeof window !== 'undefined' && enabledAssets.length === 0) {
      loadEnabledAssets();
    }
  }, [enabledAssets.length]);

  return {
    enabledAssets,
    loadEnabledAssets,
    updateEnabledAssets
  };
};
```

### 자산 활성화/비활성화 플로우

```typescript
// 가상자산 추가 페이지에서의 자산 관리
const handleAssetToggle = (assetId: string) => {
  setAssets(prevAssets => 
    prevAssets.map(asset => 
      asset.id === assetId 
        ? { ...asset, isEnabled: !asset.isEnabled }
        : asset
    )
  );
};

const handleSave = async () => {
  try {
    // 1. 활성화된 자산 필터링
    const enabledAssets = assets.filter(asset => asset.isEnabled);
    const enabledSymbols = enabledAssets.map(asset => asset.symbol);
    
    // 2. 새로 추가된 자산들에 대해 주소/개인키 생성
    const newlyAddedAssets = enabledSymbols.filter(symbol => 
      !previousEnabledSymbols.includes(symbol)
    );
    
    for (const symbol of newlyAddedAssets) {
      // 코인별 derivation path 결정
      let derivationPath: string;
      if (symbol === 'SOL') {
        derivationPath = "m/44'/501'/0'/0/0";
      } else if (symbol === 'ETH') {
        derivationPath = getNextEthAddressPath(existingEthAddresses);
      } else {
        derivationPath = getNextAccountPath(existingAssets);
      }
      
      // 주소와 개인키 생성
      const newAssetKey = await generateNewAssetKey(symbol, derivationPath);
      
      // 지갑 정보 업데이트
      if (newAssetKey) {
        const currentWallet = getCurrentWallet();
        currentWallet.addresses[symbol] = newAssetKey.address;
        currentWallet.privateKeys[symbol] = newAssetKey.privateKey;
        updateWalletInStorage(currentWallet);
      }
    }
    
    // 3. 활성화된 자산 상태 업데이트
    updateEnabledAssets(enabledSymbols);
    
    console.log('가상자산 설정 저장 완료:', { enabledAssets, enabledSymbols });
    router.push('/');
  } catch (error) {
    console.error('가상자산 설정 저장 실패:', error);
  }
};
```

## React Query를 통한 서버 상태

### 잔액 조회 쿼리

```typescript
// src/hooks/queries/useWalletBalance.ts
export const useWalletBalance = (address: string, symbol: string) => {
  return useQuery({
    queryKey: ['walletBalance', address, symbol],
    queryFn: async (): Promise<WalletBalance> => {
      // 1. 블록체인 잔액과 시세 동시 조회
      const [blockchainBalance, cryptoPrice] = await Promise.all([
        getBlockchainBalance(address, symbol),
        getCryptoPrice(symbol)
      ]);
      
      // 2. USD 가치 계산
      const balanceNum = parseFloat(blockchainBalance?.balance || '0');
      const usdValue = balanceNum * (cryptoPrice?.price || 0);

      return {
        address,
        symbol,
        balance: blockchainBalance?.balance || '0.00000',
        usdValue: `$${usdValue.toFixed(2)}`,
        price: cryptoPrice ? formatPrice(cryptoPrice.price) : '$0.00',
        change: cryptoPrice ? formatChangePercentage(cryptoPrice.priceChangePercentage24h) : '0.00%',
        changeColor: cryptoPrice ? getChangeColor(cryptoPrice.priceChangePercentage24h) : '#A0A0B0'
      };
    },
    staleTime: 30000, // 30초 캐시
    enabled: !!address && !!symbol, // address와 symbol이 있을 때만 실행
  });
};
```

### 다중 잔액 조회

```typescript
export const useWalletBalances = (addresses: { address: string; symbol: string }[]) => {
  return useQuery({
    queryKey: ['walletBalances', addresses],
    queryFn: async (): Promise<WalletBalance[]> => {
      // 고유한 심볼들 추출
      const uniqueSymbols = Array.from(new Set(addresses.map(addr => addr.symbol)));
      
      // 병렬로 블록체인 잔액과 가격 조회
      const [blockchainBalances, cryptoPrices] = await Promise.all([
        Promise.all(addresses.map(({ address, symbol }) => 
          getBlockchainBalance(address, symbol)
        )),
        Promise.all(uniqueSymbols.map(symbol => getCryptoPrice(symbol)))
      ]);

      // 심볼별 가격 매핑
      const priceMap = new Map();
      cryptoPrices.forEach((price, index) => {
        if (price) {
          priceMap.set(uniqueSymbols[index], price);
        }
      });

      // 결과 조합
      return addresses.map(({ address, symbol }, index) => {
        const blockchainBalance = blockchainBalances[index];
        const cryptoPrice = priceMap.get(symbol);
        
        const balanceNum = parseFloat(blockchainBalance?.balance || '0');
        const usdValue = balanceNum * (cryptoPrice?.price || 0);

        return {
          address,
          symbol,
          balance: blockchainBalance?.balance || '0.00000',
          usdValue: `$${usdValue.toFixed(2)}`,
          price: cryptoPrice ? formatPrice(cryptoPrice.price) : '$0.00',
          change: cryptoPrice ? formatChangePercentage(cryptoPrice.priceChangePercentage24h) : '0.00%',
          changeColor: cryptoPrice ? getChangeColor(cryptoPrice.priceChangePercentage24h) : '#A0A0B0'
        };
      });
    },
    staleTime: 30000,
    enabled: addresses.length > 0,
  });
};
```

### 쿼리 무효화 패턴

```typescript
// 전송 완료 후 잔액 새로고침
const invalidateBalanceCache = () => {
  queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
  console.log('잔액 캐시 무효화 완료');
};

// 이벤트 리스너로 전송 완료 감지
useEffect(() => {
  const handleTransferCompleted = (event: CustomEvent) => {
    console.log('전송 완료 이벤트 수신:', event.detail);
    invalidateBalanceCache();
  };

  window.addEventListener('transferCompleted', handleTransferCompleted as EventListener);
  return () => {
    window.removeEventListener('transferCompleted', handleTransferCompleted as EventListener);
  };
}, []);
```

## Local Storage 연동

### 데이터 구조

```typescript
// localStorage 키 구조
{
  "hdWallets": [
    {
      "id": "wallet-uuid",
      "name": "My Wallet",
      "masterAddress": "base64-encoded-master-address",
      "mnemonic": "12-word-mnemonic-phrase",
      "addresses": {
        "BTC": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        "ETH": "0x742d35Cc6635C0532925a3b8D40745c89a99a3e1",
        "SOL": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
      },
      "privateKeys": {
        "BTC": "hex-private-key",
        "ETH": "hex-private-key", 
        "SOL": "[1,2,3,...,64]" // JSON array for Solana
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "selectedWalletId": "wallet-uuid",
  "enabledAssets": [
    {"symbol": "BTC"},
    {"symbol": "ETH"},
    {"symbol": "SOL"}
  ]
}
```

### Storage 유틸리티 함수

```typescript
// src/lib/wallet-utils.ts

// 지갑 목록 가져오기
export const getWalletsFromStorage = (): WalletInfo[] => {
  try {
    const wallets = localStorage.getItem('hdWallets');
    return wallets ? JSON.parse(wallets) : [];
  } catch (error) {
    console.error('지갑 목록 조회 실패:', error);
    return [];
  }
};

// 특정 지갑 가져오기
export const getWalletById = (walletId: string): WalletInfo | null => {
  try {
    const wallets = getWalletsFromStorage();
    return wallets.find(w => w.id === walletId) || null;
  } catch (error) {
    console.error('지갑 조회 실패:', error);
    return null;
  }
};

// 지갑 정보 업데이트
export const updateWalletInStorage = (updatedWallet: WalletInfo): boolean => {
  try {
    const wallets = getWalletsFromStorage();
    const updatedWallets = wallets.map(w => 
      w.id === updatedWallet.id ? updatedWallet : w
    );
    localStorage.setItem('hdWallets', JSON.stringify(updatedWallets));
    return true;
  } catch (error) {
    console.error('지갑 업데이트 실패:', error);
    return false;
  }
};
```

### 데이터 마이그레이션

```typescript
// 기존 지갑들에 새로운 자산 추가 (예: SOL)
export const addSolanaToExistingWallets = async () => {
  try {
    const wallets = getWalletsFromStorage();
    let successCount = 0;
    let failedCount = 0;

    for (const wallet of wallets) {
      try {
        // SOL 주소가 이미 있으면 스킵
        if (wallet.addresses.SOL) continue;

        // 니모닉에서 SOL 주소 생성
        const seed = await bip39.mnemonicToSeed(wallet.mnemonic);
        const hdkey = HDKey.fromMasterSeed(seed);
        const solKey = hdkey.derive(DERIVATION_PATHS.SOL);
        
        if (solKey.privateKey) {
          const solData = generateSolanaAddress(solKey.privateKey);
          
          // 지갑 정보 업데이트
          const updatedWallet: WalletInfo = {
            ...wallet,
            addresses: { ...wallet.addresses, SOL: solData.address },
            privateKeys: { ...wallet.privateKeys, SOL: solData.privateKey }
          };

          updateWalletInStorage(updatedWallet);
          successCount++;
        }
      } catch (error) {
        console.error(`지갑 ${wallet.name}의 SOL 주소 추가 실패:`, error);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('솔라나 주소 추가 실패:', error);
    return { success: 0, failed: 0 };
  }
};
```

## 이벤트 기반 상태 동기화

### 글로벌 이벤트 시스템

```typescript
// 이벤트 타입 정의
interface CustomEvents {
  'assetsUpdated': { enabledAssets: string[] };
  'transferCompleted': { symbol: string; amount: string; to: string };
  'walletCreated': { walletId: string; name: string };
  'walletSelected': { walletId: string };
}

// 이벤트 발생 헬퍼
const dispatchCustomEvent = <T extends keyof CustomEvents>(
  eventType: T,
  detail: CustomEvents[T]
) => {
  window.dispatchEvent(new CustomEvent(eventType, { detail }));
};

// 이벤트 수신 헬퍼
const useCustomEvent = <T extends keyof CustomEvents>(
  eventType: T,
  handler: (detail: CustomEvents[T]) => void
) => {
  useEffect(() => {
    const eventHandler = (event: CustomEvent<CustomEvents[T]>) => {
      handler(event.detail);
    };

    window.addEventListener(eventType, eventHandler as EventListener);
    return () => {
      window.removeEventListener(eventType, eventHandler as EventListener);
    };
  }, [eventType, handler]);
};
```

### 컴포넌트 간 상태 동기화

```typescript
// 메인 페이지에서 이벤트 수신
export default function Home() {
  const { loadEnabledAssets } = useEnabledAssets();
  const { refreshWalletList } = useWalletList();
  const queryClient = useQueryClient();

  // 자산 업데이트 이벤트 수신
  useCustomEvent('assetsUpdated', (detail) => {
    console.log('자산 업데이트 이벤트 수신:', detail);
    loadEnabledAssets(); // 활성화된 자산 목록 새로고침
  });

  // 전송 완료 이벤트 수신
  useCustomEvent('transferCompleted', (detail) => {
    console.log('전송 완료 이벤트 수신:', detail);
    queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
  });

  // 페이지 포커스 시 전체 상태 새로고침
  useEffect(() => {
    const handleFocus = () => {
      refreshWalletList();
      loadEnabledAssets();
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // 라우터 변경 시 잔액 새로고침
  useEffect(() => {
    const handleRouteChange = () => {
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);
}
```

## 상태 디버깅 및 모니터링

### 개발 모드 상태 로깅

```typescript
// 디버깅용 상태 로깅
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.log('=== 지갑 상태 디버깅 ===');
    console.log('선택된 지갑:', selectedWallet);
    console.log('활성화된 자산:', enabledAssets);
    console.log('지갑 주소들:', selectedWallet?.addresses);
    console.log('잔액 데이터:', {
      BTC: btcBalance.data,
      ETH: ethBalance.data,
      SOL: solBalance.data
    });
  }
}, [selectedWallet, enabledAssets, btcBalance.data, ethBalance.data, solBalance.data]);
```

### React DevTools 통합

```typescript
// Jotai DevTools (개발 모드)
import { useAtomDevtools } from 'jotai/devtools';

const DevTools = () => {
  useAtomDevtools(walletListAtom);
  useAtomDevtools(selectedWalletIdAtom);
  useAtomDevtools(enabledAssetsAtom);
  return null;
};

// React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <>
          <DevTools />
          <ReactQueryDevtools initialIsOpen={false} />
        </>
      )}
    </QueryClientProvider>
  );
}
```

## 성능 최적화 전략

### 1. 메모이제이션

```typescript
// 계산 비용이 높은 상태는 useMemo로 최적화
const totalUSD = useMemo(() => {
  if (!selectedWallet || !enabledAssets.length) return 0;
  
  return enabledAssets.reduce((total, symbol) => {
    const balance = getBalanceBySymbol(symbol);
    const usdValue = parseFloat(balance?.usdValue?.replace('$', '').replace(',', '') || '0');
    return total + usdValue;
  }, 0);
}, [selectedWallet, enabledAssets, balanceData]);
```

### 2. 조건부 렌더링

```typescript
// 활성화된 자산만 렌더링
{selectedWallet && enabledAssets.map(symbol => (
  selectedWallet.addresses[symbol] && (
    <AssetCard 
      key={symbol}
      symbol={symbol}
      address={selectedWallet.addresses[symbol]}
      balance={balanceData[symbol]}
    />
  )
))}
```

### 3. 쿼리 최적화

```typescript
// 필요할 때만 쿼리 실행
const btcBalance = useWalletBalance(
  selectedWallet?.addresses.BTC || '', 
  'BTC',
  {
    enabled: !!selectedWallet?.addresses.BTC && enabledAssets.includes('BTC')
  }
);
```

이 튜토리얼을 통해 nest-wallet의 자산별 상태관리 시스템을 이해하고, 효율적으로 상태를 관리할 수 있습니다.