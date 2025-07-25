"use client";
import { useState, useEffect } from "react";
import { useWalletList } from "../../hooks/useWalletAtoms";
import { useWallet } from "../../hooks/wallet/useWallet";
import { useEnabledAssets } from "../../hooks/useWalletAtoms";
import { getTransactions, Transaction, testEthereumAPI } from "../../lib/api/transaction";

export default function ActionPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<string>('all');
  
  const { selectedWalletId, selectedWallet, loadWallets, isLoading: isWalletListLoading } = useWalletList();
  const { enabledAssets, loadEnabledAssets } = useEnabledAssets();
  const { assetPrivateKeys, getAssetPrivateKey } = useWallet();

  // 컴포넌트 마운트 시 지갑 목록과 활성화된 자산 로드
  useEffect(() => {
    loadWallets();
    loadEnabledAssets();
  }, []);

  // 선택된 지갑 정보 디버깅
  useEffect(() => {
    console.log('액션 페이지 - 선택된 지갑 정보:', {
      selectedWalletId,
      selectedWallet: selectedWallet ? {
        id: selectedWallet.id,
        name: selectedWallet.name,
        addresses: selectedWallet.addresses,
        privateKeys: selectedWallet.privateKeys ? Object.keys(selectedWallet.privateKeys) : null
      } : null,
      enabledAssets,
      isWalletListLoading
    });
  }, [selectedWalletId, selectedWallet, enabledAssets, isWalletListLoading]);

  // 선택된 지갑이 가지고 있는 가상자산 목록 가져오기 (홈 페이지와 동일한 로직)
  const getWalletAssets = () => {
    if (!selectedWallet || !enabledAssets.length) {
      console.log('getWalletAssets: 지갑 또는 활성화된 자산이 없음', { 
        selectedWallet: !!selectedWallet, 
        enabledAssetsLength: enabledAssets.length 
      });
      return [];
    }
    
    console.log('getWalletAssets 디버깅:', {
      selectedWalletAddresses: selectedWallet.addresses,
      enabledAssets: enabledAssets
    });
    
    const assets: string[] = [];
    
    // 홈 페이지와 동일한 조건으로 가상자산 확인
    if (selectedWallet.addresses.BTC && enabledAssets.includes('BTC')) {
      console.log('BTC 추가됨:', selectedWallet.addresses.BTC);
      assets.push('BTC');
    }
    if (selectedWallet.addresses.ETH && enabledAssets.includes('ETH')) {
      console.log('ETH 추가됨:', selectedWallet.addresses.ETH);
      assets.push('ETH');
    }
    if (selectedWallet.addresses.USDT && enabledAssets.includes('USDT')) {
      console.log('USDT 추가됨:', selectedWallet.addresses.USDT);
      assets.push('USDT');
    }
    if (enabledAssets.includes('MATIC')) {
      console.log('MATIC 추가됨 (enabledAssets에만 있음)');
      assets.push('MATIC');
    }
    if (enabledAssets.includes('BSC')) {
      console.log('BSC 추가됨 (enabledAssets에만 있음)');
      assets.push('BSC');
    }
    if (enabledAssets.includes('AVAX')) {
      console.log('AVAX 추가됨 (enabledAssets에만 있음)');
      assets.push('AVAX');
    }
    
    console.log('getWalletAssets: 홈 페이지 로직으로 확인된 가상자산', assets);
    return assets;
  };

  // 실제 트랜잭션 데이터 로드
  const loadTransactions = async () => {
    console.log('=== loadTransactions 함수 시작 ===');
    
    if (!selectedWalletId || !selectedWallet) {
      console.log('loadTransactions: 지갑이 선택되지 않음');
      console.log('selectedWalletId:', selectedWalletId);
      console.log('selectedWallet:', !!selectedWallet);
      return;
    }

    try {
      console.log('실제 트랜잭션 데이터 로드 시작');
      console.log('선택된 지갑 ID:', selectedWalletId);
      console.log('선택된 자산:', selectedAsset);
      console.log('지갑 주소들:', selectedWallet.addresses);
      
      // 선택된 자산에 따라 트랜잭션 조회
      const currency = selectedAsset === 'all' ? undefined : selectedAsset;
      console.log('조회할 통화:', currency);
      
      // 이더리움인 경우 특별 로그 추가
      if (currency === 'ETH') {
        console.log('=== 이더리움 트랜잭션 조회 시작 ===');
        console.log('이더리움 주소:', selectedWallet.addresses.ETH);
      }
      
      console.log('getTransactions 함수 호출 전');
      const transactions = await getTransactions(selectedWalletId, currency, 50, selectedWallet);
      console.log('getTransactions 함수 호출 후');
      
      console.log('로드된 트랜잭션 수:', transactions.length);
      console.log('트랜잭션 샘플:', transactions.slice(0, 2));
      
      // 로컬 스토리지의 트랜잭션 정보도 가져오기
      const localTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      console.log('로컬 스토리지 트랜잭션:', localTransactions);
      
      // 로컬 트랜잭션을 Transaction 형식으로 변환
      const localTransactionObjects = localTransactions.map((localTx: any) => ({
        id: localTx.hash,
        type: 'withdrawal' as const,
        currency: localTx.currency,
        amount: localTx.amount,
        fromAddress: localTx.from,
        toAddress: localTx.to,
        timestamp: new Date(localTx.timestamp),
        status: localTx.status as 'pending' | 'completed' | 'failed',
        txHash: localTx.hash,
        blockNumber: null,
        gasUsed: '0',
        gasPrice: '0'
      }));
      
      // 로컬 트랜잭션과 API 트랜잭션 합치기
      const allTransactions = [...localTransactionObjects, ...transactions];
      
      // 이더리움인 경우 결과 확인
      if (currency === 'ETH') {
        console.log('=== 이더리움 트랜잭션 조회 완료 ===');
        console.log('최종 트랜잭션 수:', allTransactions.length);
      }
      
      console.log('setTransactions 호출 전');
      setTransactions(allTransactions);
      console.log('setTransactions 호출 후');
      console.log('=== loadTransactions 함수 완료 ===');
    } catch (error) {
      console.error('트랜잭션 로드 실패:', error);
      setTransactions([]);
    }
  };

  useEffect(() => {
    console.log('액션 페이지 useEffect:', { 
      selectedWalletId, 
      selectedWallet: !!selectedWallet, 
      enabledAssets,
      isWalletListLoading,
      selectedAsset
    });
    
    // 지갑 목록이 로딩 중이면 대기
    if (isWalletListLoading) {
      console.log('지갑 목록 로딩 중...');
      return;
    }
    
    // 지갑이 선택되고 enabledAssets가 로드된 후 트랜잭션 로드
    if (selectedWallet && enabledAssets.length > 0) {
      console.log('지갑과 활성화된 자산 로드됨, 트랜잭션 로드 시작');
      console.log('현재 선택된 자산:', selectedAsset);
      setIsLoading(true);
      loadTransactions().finally(() => {
        setIsLoading(false);
      });
    } else if (selectedWallet && enabledAssets.length === 0) {
      // 지갑은 선택되었지만 enabledAssets가 로드되지 않은 경우
      console.log('지갑 선택됨, enabledAssets 대기 중...');
      // 3초 후에도 로드되지 않으면 로딩 상태 해제
      setTimeout(() => {
        console.log('enabledAssets 로드 타임아웃, 로딩 상태 해제');
        setIsLoading(false);
      }, 3000);
    } else if (!selectedWallet && !isWalletListLoading) {
      // 지갑이 선택되지 않은 경우 (지갑 목록 로딩이 완료된 후)
      console.log('지갑 미선택, 로딩 상태 해제');
      setIsLoading(false);
    }
  }, [selectedWalletId, selectedWallet, enabledAssets, isWalletListLoading, selectedAsset]);

  // selectedAsset이 변경될 때 강제로 트랜잭션 로드
  useEffect(() => {
    console.log('=== selectedAsset useEffect 트리거됨 ===');
    console.log('selectedWallet:', !!selectedWallet);
    console.log('enabledAssets.length:', enabledAssets.length);
    console.log('selectedAsset:', selectedAsset);
    
    if (selectedWallet && enabledAssets.length > 0) {
      console.log('selectedAsset 변경됨, 강제 트랜잭션 로드:', selectedAsset);
      setIsLoading(true);
      loadTransactions().finally(() => {
        setIsLoading(false);
      });
    } else {
      console.log('조건 불만족:', {
        selectedWallet: !!selectedWallet,
        enabledAssetsLength: enabledAssets.length
      });
    }
  }, [selectedAsset]);

  // 지갑이 변경될 때 선택된 자산을 전체로 리셋
  useEffect(() => {
    setSelectedAsset('all');
  }, [selectedWalletId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '완료';
      case 'pending':
        return '처리중';
      case 'failed':
        return '실패';
      default:
        return '알 수 없음';
    }
  };

  const getTypeText = (type: string) => {
    return type === 'deposit' ? '입금' : '출금';
  };

  const getTypeColor = (type: string) => {
    return type === 'deposit' ? 'text-green-400' : 'text-red-400';
  };

  const filteredTransactions = selectedAsset === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.currency === selectedAsset);

  const getAssetOptions = () => {
    const walletAssets = getWalletAssets();
    return [
      { value: 'all', label: '전체 가상자산' },
      ...walletAssets.map(asset => ({ value: asset, label: asset }))
    ];
  };

  const getAssetIcon = (asset: string) => {
    const icons: { [key: string]: string } = {
      'BTC': '₿',
      'ETH': 'Ξ',
      'USDT': '₮',
      'MATIC': '🔷',
      'BSC': '🔶',
      'AVAX': '❄️',
      'BNB': '🔶',
      'POLYGON': '🔷',
      'AVALANCHE': '❄️',
      'BITCOIN': '₿',
      'ETHEREUM': 'Ξ',
    };
    return icons[asset] || '💎';
  };

  // 트랜잭션 상태 업데이트 함수
  const updateTransactionStatus = (hash: string, newStatus: 'pending' | 'completed' | 'failed') => {
    const localTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const updatedTransactions = localTransactions.map((tx: any) => 
      tx.hash === hash ? { ...tx, status: newStatus } : tx
    );
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
    
    // 현재 트랜잭션 목록도 업데이트
    setTransactions(prev => prev.map(tx => 
      tx.txHash === hash ? { ...tx, status: newStatus } : tx
    ));
  };

  // 트랜잭션 상태 확인 함수 (Etherscan API 사용)
  const checkTransactionStatus = async (hash: string) => {
    try {
      const response = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${hash}&apikey=YourApiKeyToken`);
      const data = await response.json();
      
      if (data.result && data.result.status === '0x1') {
        updateTransactionStatus(hash, 'completed');
      } else if (data.result && data.result.status === '0x0') {
        updateTransactionStatus(hash, 'failed');
      } else {
        updateTransactionStatus(hash, 'pending');
      }
    } catch (error) {
      console.error('트랜잭션 상태 확인 실패:', error);
    }
  };

  // 지갑에 가상자산이 있는지 확인
  const hasWalletAssets = getWalletAssets().length > 0;

  if (isLoading || isWalletListLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#14151A' }}>
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F2A003] mb-4"></div>
          <p className="text-white mb-4">
            {isWalletListLoading ? '지갑 목록을 불러오는 중...' : '로딩 중...'}
          </p>
        </div>
      </div>
    );
  }

  if (!selectedWallet) {
    return (
      <div className="min-h-screen" style={{ background: '#14151A' }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white">액션 히스토리</h1>
          <div className="w-16"></div>
        </div>

        {/* 지갑 선택 안내 */}
        <div className="p-6">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">지갑을 선택해주세요</h3>
            <p className="text-gray-400">트랜잭션 히스토리를 보려면 먼저 지갑을 선택해야 합니다.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasWalletAssets) {
    return (
      <div className="min-h-screen" style={{ background: '#14151A' }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white">액션 히스토리</h1>
          <div className="w-16"></div>
        </div>

        {/* 가상자산 없음 안내 */}
        <div className="p-6">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">가상자산이 없습니다</h3>
            <p className="text-gray-400">선택한 지갑에 가상자산이 없습니다.</p>
            <p className="text-gray-400 mt-2">가상자산을 추가하면 트랜잭션 히스토리를 확인할 수 있습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#14151A' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">액션 히스토리</h1>
        <div className="w-16"></div>
      </div>

      {/* 필터 */}
      <div className="p-6 border-b border-gray-800">
        <div className="space-y-3">
          <label className="text-white text-sm font-semibold">가상자산 선택:</label>
          <div className="flex items-center space-x-4">
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#F2A003] focus:outline-none"
            >
              {getAssetOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.value === 'all' ? '전체 가상자산' : option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 트랜잭션 목록 */}
      <div className="p-6">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">트랜잭션이 없습니다</h3>
            <p className="text-gray-400">아직 입금/출금 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {transaction.type === 'deposit' ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        {getTypeText(transaction.type)} - {transaction.currency}
                      </div>
                      <div className="text-sm text-gray-400">
                        {transaction.timestamp.toLocaleDateString()} {transaction.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${getTypeColor(transaction.type)}`}>
                      {transaction.type === 'deposit' ? '+' : '-'}{transaction.amount} {transaction.currency}
                    </div>
                    <div className={`text-sm ${getStatusColor(transaction.status)}`}>
                      {getStatusText(transaction.status)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">보내는 주소:</span>
                    <span className="text-white font-mono text-xs">{transaction.fromAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">받는 주소:</span>
                    <span className="text-white font-mono text-xs">{transaction.toAddress}</span>
                  </div>
                  {transaction.txHash && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">트랜잭션 해시:</span>
                      <span className="text-white font-mono text-xs">{transaction.txHash}</span>
                    </div>
                  )}
                  {transaction.blockNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">블록 번호:</span>
                      <span className="text-white text-xs">{transaction.blockNumber.toLocaleString()}</span>
                    </div>
                  )}
                  {transaction.gasUsed && transaction.gasPrice && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">가스 사용량:</span>
                      <span className="text-white text-xs">{transaction.gasUsed} ({transaction.gasPrice} Gwei)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 