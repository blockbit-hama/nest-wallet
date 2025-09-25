"use client";
import { useState, useEffect } from "react";
import { Button, Card } from "../../../components/ui";
import { useMasterAddress } from "../../../hooks/wallet/useMasterAddress";
import "../../../types/webview"; // WebView 타입 정의 로드

// 히스토리 아이콘
const HistoryIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" stroke="#F2A003" strokeWidth="2"/>
    <path d="M16 8v8l4 4" stroke="#F2A003" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// 상태별 아이콘
const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <span className="text-green-400">✅</span>;
    case 'pending':
      return <span className="text-yellow-400">⏳</span>;
    case 'failed':
      return <span className="text-red-400">❌</span>;
    case 'cancelled':
      return <span className="text-gray-400">🚫</span>;
    default:
      return <span className="text-blue-400">📋</span>;
  }
};

// 상태별 텍스트
const getStatusText = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return '완료';
    case 'pending':
      return '진행중';
    case 'failed':
      return '실패';
    case 'cancelled':
      return '취소됨';
    default:
      return status;
  }
};

// 상태별 색상
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-600/20 border-green-600/30 text-green-300';
    case 'pending':
      return 'bg-yellow-600/20 border-yellow-600/30 text-yellow-300';
    case 'failed':
      return 'bg-red-600/20 border-red-600/30 text-red-300';
    case 'cancelled':
      return 'bg-gray-600/20 border-gray-600/30 text-gray-300';
    default:
      return 'bg-blue-600/20 border-blue-600/30 text-blue-300';
  }
};

export default function PurchaseHistoryPage() {
  const { masterAddress } = useMasterAddress();
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 구매 히스토리 조회
  const fetchPurchaseHistory = async () => {
    if (!masterAddress) {
      console.log('❌ [Purchase History] masterAddress 없음');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🟡 [Purchase History] 구매 히스토리 조회 시작:', { masterAddress });
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/buy/v1/purchases/by-customer/${encodeURIComponent(masterAddress)}?limit=50`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🟢 [Purchase History] 구매 히스토리 조회 성공:', data);
      
      setPurchaseHistory(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('🔴 [Purchase History] 구매 히스토리 조회 실패:', err);
      setError(err.message || '구매 히스토리를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // KYC 상태 및 구매 한도 조회
  const fetchKycStatus = async () => {
    if (!masterAddress) {
      return;
    }

    setKycLoading(true);

    try {
      console.log('🟡 [KYC Status] KYC 상태 조회 시작:', { masterAddress });
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/buy/v1/customer/kyc-status/${encodeURIComponent(masterAddress)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🟢 [KYC Status] KYC 상태 조회 성공:', data);
      
      setKycStatus(data);
    } catch (err: any) {
      console.error('🔴 [KYC Status] KYC 상태 조회 실패:', err);
      // KYC 조회 실패는 에러로 표시하지 않음 (선택적 기능)
    } finally {
      setKycLoading(false);
    }
  };

  // masterAddress 변경 시 히스토리 및 KYC 상태 조회
  useEffect(() => {
    if (masterAddress) {
      fetchPurchaseHistory();
      fetchKycStatus();
    }
  }, [masterAddress]);

  // 새로고침 버튼
  const handleRefresh = () => {
    fetchPurchaseHistory();
    fetchKycStatus();
  };

  if (!masterAddress) {
    return (
      <div className="min-h-screen bg-[#14151A] text-white p-4">
        <Card className="bg-[#23242A] border-gray-700">
          <div className="p-6 text-center">
            <HistoryIcon />
            <h2 className="text-xl font-bold text-white mb-4 mt-4">지갑 연결 필요</h2>
            <p className="text-gray-400 mb-4">
              구매 히스토리를 보려면 먼저 지갑을 연결해주세요.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#14151A] text-white p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">구매 히스토리</h1>
          <div className="flex items-center gap-2">
            <HistoryIcon />
            <Button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-1 text-sm bg-[#F2A003] hover:bg-[#F2A003]/80 text-black font-bold"
            >
              {loading ? '새로고침 중...' : '새로고침'}
            </Button>
          </div>
        </div>

        {/* 마스터 주소 표시 */}
        <Card className="bg-[#23242A] border-gray-700 mb-4">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">지갑 ID</h3>
            <p className="text-white font-mono text-sm break-all">
              {masterAddress}
            </p>
          </div>
        </Card>

        {/* KYC 상태 및 구매 한도 */}
        {kycStatus && (
          <Card className="bg-[#23242A] border-gray-700 mb-4">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">KYC 상태 및 구매 한도</h3>
              
              {/* KYC 상태 */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">KYC 상태</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    kycStatus.kycStatus === 'completed' ? 'bg-green-600/20 text-green-300' :
                    kycStatus.kycStatus === 'pending' ? 'bg-yellow-600/20 text-yellow-300' :
                    kycStatus.kycStatus === 'failed' ? 'bg-red-600/20 text-red-300' :
                    'bg-gray-600/20 text-gray-300'
                  }`}>
                    {kycStatus.kycStatus === 'completed' ? '✅ 완료' :
                     kycStatus.kycStatus === 'pending' ? '⏳ 진행중' :
                     kycStatus.kycStatus === 'failed' ? '❌ 실패' :
                     kycStatus.kycStatus === 'not_started' ? '🆕 미시작' :
                     kycStatus.kycStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">KYC 레벨</span>
                  <span className="text-white text-sm">Level {kycStatus.kycLevel || 0}</span>
                </div>
              </div>

              {/* 구매 한도 */}
              {kycStatus.limits && kycStatus.limits.length > 0 && (
                <div>
                  <h4 className="text-xs text-gray-400 mb-2">구매 한도</h4>
                  <div className="space-y-2">
                    {kycStatus.limits
                      .filter((limit: any) => limit.type.startsWith('buy_') && limit.dailyLimit > 0)
                      .slice(0, 3) // 상위 3개만 표시
                      .map((limit: any, index: number) => (
                        <div key={index} className="bg-gray-800/50 rounded p-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-300">
                              {limit.type.replace('buy_', '').replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-white">
                              ${limit.dailyLimitRemaining.toLocaleString()} / ${limit.dailyLimit.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                            <div 
                              className="bg-[#F2A003] h-1 rounded-full" 
                              style={{ 
                                width: `${(limit.dailyLimitRemaining / limit.dailyLimit) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* KYC 로딩 상태 */}
        {kycLoading && (
          <Card className="bg-[#23242A] border-gray-700 mb-4">
            <div className="p-4">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full"></div>
                <span className="text-sm">KYC 상태 확인 중...</span>
              </div>
            </div>
          </Card>
        )}

        {/* 로딩 상태 */}
        {loading && (
          <Card className="bg-[#23242A] border-gray-700">
            <div className="p-6 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-[#F2A003] border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-bold text-white mb-2">구매 히스토리 로딩 중...</h3>
              <p className="text-gray-400">잠시만 기다려주세요.</p>
            </div>
          </Card>
        )}

        {/* 에러 상태 */}
        {error && (
          <Card className="bg-[#23242A] border-gray-700 mb-4">
            <div className="p-4">
              <div className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">❌</span>
                <div className="text-sm">
                  <p className="text-red-300 font-medium">구매 히스토리를 불러올 수 없습니다</p>
                  <p className="text-red-200/80 text-xs mt-1">{error}</p>
                </div>
              </div>
              <Button
                onClick={handleRefresh}
                className="w-full mt-3 bg-red-600 hover:bg-red-500 text-white"
              >
                다시 시도
              </Button>
            </div>
          </Card>
        )}

        {/* 구매 히스토리 목록 */}
        {!loading && !error && (
          <>
            {purchaseHistory.length === 0 ? (
              <Card className="bg-[#23242A] border-gray-700">
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    📋
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">구매 내역이 없습니다</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    아직 구매한 암호화폐가 없습니다.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/purchase'}
                    className="bg-[#F2A003] hover:bg-[#F2A003]/80 text-black font-bold"
                  >
                    구매하러 가기
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {purchaseHistory.map((transaction: any, index: number) => (
                  <Card key={transaction.id || index} className="bg-[#23242A] border-gray-700">
                    <div className="p-4">
                      {/* 헤더 */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(transaction.status)}
                          <span className="text-white font-semibold">
                            {transaction.currencyCode?.toUpperCase() || transaction.currency?.toUpperCase() || 'Unknown'}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(transaction.status)}`}>
                          {getStatusText(transaction.status)}
                        </span>
                      </div>

                      {/* 구매 정보 */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">구매 금액</span>
                          <span className="text-white">
                            ${transaction.baseCurrencyAmount || transaction.fiatAmount || '0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">받을 암호화폐</span>
                          <span className="text-white">
                            {transaction.quoteCurrencyAmount || transaction.cryptoAmount || '0'} {transaction.currencyCode?.toUpperCase() || transaction.currency?.toUpperCase() || ''}
                          </span>
                        </div>
                        
                        {transaction.walletAddress && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">지갑 주소</span>
                            <span className="text-gray-300 font-mono text-xs">
                              {transaction.walletAddress.slice(0, 8)}...{transaction.walletAddress.slice(-6)}
                            </span>
                          </div>
                        )}
                        {transaction.createdAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">구매 시간</span>
                            <span className="text-gray-300 text-xs">
                              {new Date(transaction.createdAt).toLocaleString('ko-KR')}
                            </span>
                          </div>
                        )}
                        {transaction.cryptoTransactionId && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">트랜잭션 해시</span>
                            <span className="text-gray-300 font-mono text-xs">
                              {transaction.cryptoTransactionId.slice(0, 8)}...{transaction.cryptoTransactionId.slice(-6)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* MoonPay 트랜잭션 ID */}
                      {transaction.id && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">MoonPay ID</span>
                            <span className="text-gray-400 font-mono">
                              {transaction.id.slice(0, 8)}...{transaction.id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* 하단 네비게이션 */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#14151A] border-t border-gray-700 p-4">
          <div className="max-w-md mx-auto flex gap-2">
            <Button
              onClick={() => window.location.href = '/purchase'}
              className="flex-1 bg-[#F2A003] hover:bg-[#F2A003]/80 text-black font-bold"
            >
              새 구매
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white"
            >
              홈으로
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}