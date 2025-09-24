import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { 
  walletListAtom, 
  selectedWalletIdAtom, 
  walletListLoadingAtom,
  enabledAssetsAtom 
} from '@/store/atoms';
import { getWalletsFromStorage } from '@/lib/wallet-utils';
import { ASSET_CONSTANTS } from '@/config/constants';

// 지갑 리스트 관리 hook
export const useWalletList = () => {
  const [walletList, setWalletList] = useAtom(walletListAtom);
  const [selectedWalletId, setSelectedWalletId] = useAtom(selectedWalletIdAtom);
  const [isLoading, setIsLoading] = useAtom(walletListLoadingAtom);

  // 지갑 선택 시 로컬 스토리지에 저장하는 함수
  const setSelectedWalletIdWithStorage = (walletId: string) => {
    setSelectedWalletId(walletId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedWalletId', walletId);
    }
  };

  // 지갑 목록 로드
  const loadWallets = () => {
    try {
      setIsLoading(true);
      const wallets = getWalletsFromStorage();
      setWalletList(wallets);
      
      if (wallets.length > 0) {
        // 저장된 선택된 지갑이 있으면 복원
        const savedSelectedWalletId = localStorage.getItem('selectedWalletId');
        
        if (savedSelectedWalletId && wallets.find(w => w.id === savedSelectedWalletId)) {
          // 저장된 지갑이 존재하면 선택
          setSelectedWalletId(savedSelectedWalletId);
        } else {
          // 저장된 지갑이 없거나 존재하지 않으면 첫 번째 지갑 선택
          setSelectedWalletIdWithStorage(wallets[0].id);
        }
      }
    } catch (error) {
      console.error('지갑 목록 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 로딩 시 로컬 스토리지에서 선택된 지갑 복원
  useEffect(() => {
    if (typeof window !== 'undefined' && !selectedWalletId) {
      const savedSelectedWalletId = localStorage.getItem('selectedWalletId');
      if (savedSelectedWalletId) {
        setSelectedWalletId(savedSelectedWalletId);
      }
    }
  }, []);

  // 지갑 목록 새로고침
  const refreshWalletList = () => {
    loadWallets();
  };

  // 선택된 지갑 정보
  const selectedWallet = walletList.find(w => w.id === selectedWalletId);

  return {
    walletList,
    selectedWallet,
    selectedWalletId,
    setSelectedWalletId: setSelectedWalletIdWithStorage,
    isLoading,
    loadWallets,
    refreshWalletList
  };
};

// 활성화된 자산 관리 hook
export const useEnabledAssets = () => {
  const [enabledAssets, setEnabledAssets] = useAtom(enabledAssetsAtom);

  // 활성화된 자산 로드
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
        // 로드 실패 시 기본값 설정
        setEnabledAssets(ASSET_CONSTANTS.DEFAULT_ENABLED_ASSETS);
      }
    } else {
      // 저장된 자산이 없으면 기본값 설정
      console.log('저장된 자산 없음, 기본값 설정:', ASSET_CONSTANTS.DEFAULT_ENABLED_ASSETS);
      setEnabledAssets(ASSET_CONSTANTS.DEFAULT_ENABLED_ASSETS);
      
      // 기본값을 localStorage에 저장
      const defaultAssetsData = ASSET_CONSTANTS.DEFAULT_ENABLED_ASSETS.map(symbol => ({ symbol }));
      localStorage.setItem('enabledAssets', JSON.stringify(defaultAssetsData));
    }
  };

  // 활성화된 자산 업데이트
  const updateEnabledAssets = (assets: string[]) => {
    setEnabledAssets(assets);
    
    // 로컬 스토리지에 저장
    const assetsData = assets.map(symbol => ({ symbol }));
    localStorage.setItem('enabledAssets', JSON.stringify(assetsData));
    
    // 이벤트 발생
    window.dispatchEvent(new CustomEvent('assetsUpdated', { 
      detail: { enabledAssets: assets }
    }));
  };

  // 초기 로딩 시 localStorage에서 활성화된 자산 복원
  useEffect(() => {
    if (typeof window !== 'undefined' && enabledAssets.length === 0) {
      loadEnabledAssets();
    }
  }, [enabledAssets.length]); // enabledAssets.length만 의존성으로 사용

  return {
    enabledAssets,
    loadEnabledAssets,
    updateEnabledAssets
  };
}; 