"use client";
import { useState, useEffect } from "react";
import { Button, Card, Input } from "../../components/ui";
import { useMasterAddress } from "../../hooks/wallet/useMasterAddress";
import { usePurchaseQuotes, usePurchaseCurrencies, usePurchaseProviderStatus, usePurchaseTransaction } from "../../hooks/queries/usePurchaseQueries";

// 구매 가능한 코인 아이콘들
const CoinIcons = {
  BTC: () => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">₿</div>
  ),
  ETH: () => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">Ξ</div>
  ),
  USDT: () => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">$</div>
  ),
  SOL: () => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm">◎</div>
  )
};

const PurchaseIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" stroke="#F2A003" strokeWidth="2"/>
    <path d="M12 16h8" stroke="#F2A003" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 12v8" stroke="#F2A003" strokeWidth="2" strokeLinecap="round"/>
    <path d="M20 8l4 4-4 4" stroke="#F2A003" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function PurchasePage() {
  const masterAddress = useMasterAddress();
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ETH');
  const [amount, setAmount] = useState<string>('100');
  const [fiatCurrency] = useState<string>('USD');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [step, setStep] = useState<'quote' | 'confirm' | 'processing' | 'complete'>('quote');
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // API 쿼리들
  const { data: currencies, isLoading: currenciesLoading } = usePurchaseCurrencies();
  const {
    data: providerStatus,
    isLoading: providerStatusLoading,
    error: providerStatusError
  } = usePurchaseProviderStatus();
  const {
    data: quotes,
    isLoading: quotesLoading,
    refetch: refetchQuotes
  } = usePurchaseQuotes(
    selectedCurrency,
    parseFloat(amount) || 0,
    fiatCurrency,
    { enabled: false }
  );

  const createTransactionMutation = usePurchaseTransaction();

  // 견적 조회
  const handleGetQuotes = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    await refetchQuotes();
  };

  // 거래 생성
  const handleCreateTransaction = async (providerId: string) => {
    if (!masterAddress || !amount) return;

    try {
      setStep('processing');
      const result = await createTransactionMutation.mutateAsync({
        providerId,
        currency: selectedCurrency,
        amount: parseFloat(amount),
        userWalletAddress: masterAddress,
        userEmail: 'user@example.com', // 실제로는 사용자 입력 받아야 함
        returnUrl: `${window.location.origin}/purchase/result`,
        webhookUrl: `${process.env.NEXT_PUBLIC_API_URL || ''}/webhook/purchase`
      });

      setTransactionId(result.transactionId);
      setStep('complete');

      // 실제 결제 URL로 리다이렉트 (여기서는 시뮬레이션)
      if (result.paymentUrl) {
        window.open(result.paymentUrl, '_blank');
      }
    } catch (error) {
      console.error('Transaction creation failed:', error);
      setStep('quote');
    }
  };

  if (!masterAddress) {
    return (
      <div className="min-h-screen bg-[#14151A] text-white p-4">
        <Card className="bg-[#23242A] border-gray-700">
          <div className="p-6 text-center">
            <PurchaseIcon />
            <h2 className="text-xl font-bold text-white mb-4 mt-4">지갑 연결 필요</h2>
            <p className="text-gray-400">구매 기능을 사용하려면 먼저 지갑을 생성하거나 복원해주세요.</p>
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
          <h1 className="text-2xl font-bold text-white">암호화폐 구매</h1>
          <PurchaseIcon />
        </div>

        {/* 프로바이더 상태 */}
        <Card className="bg-[#23242A] border-gray-700 mb-4">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">결제 프로바이더 상태</h3>

            {providerStatusLoading && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full"></div>
                <span className="text-sm">상태 확인 중...</span>
              </div>
            )}

            {providerStatusError && (
              <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">❌</span>
                  <div className="text-sm">
                    <p className="text-red-300 font-medium">프로바이더 상태를 확인할 수 없습니다</p>
                    <p className="text-red-200/80 text-xs mt-1">
                      구매 서비스에 연결할 수 없습니다. 네트워크 연결을 확인하고 다시 시도해주세요.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {providerStatus && !providerStatusLoading && !providerStatusError && (
              <>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(providerStatus.providers || {}).map(([provider, status]: [string, any]) => (
                    <div key={provider} className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                      status.available ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        status.available ? 'bg-green-300' : 'bg-red-300'
                      }`}></span>
                      {provider.toUpperCase()}: {status.available ? '사용가능' : '사용불가'}
                    </div>
                  ))}
                </div>
                {/* 모든 프로바이더가 사용불가인 경우 안내 메시지 */}
                {providerStatus.providers &&
                 Object.values(providerStatus.providers).every((p: any) => !p.available) && (
                  <div className="mt-3 p-3 bg-yellow-600/20 border border-yellow-600/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">⚠️</span>
                      <div className="text-sm">
                        <p className="text-yellow-300 font-medium">현재 모든 결제 서비스를 사용할 수 없습니다</p>
                        <p className="text-yellow-200/80 text-xs mt-1">
                          서비스 점검 중이거나 일시적인 문제가 발생했을 수 있습니다. 잠시 후 다시 시도해주세요.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {step === 'quote' && (
          <>
            {/* 구매할 코인 선택 */}
            <Card className="bg-[#23242A] border-gray-700 mb-4">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">구매할 암호화폐</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CoinIcons).map(([coin, Icon]) => (
                    <button
                      key={coin}
                      onClick={() => setSelectedCurrency(coin)}
                      className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${
                        selectedCurrency === coin
                          ? 'border-[#F2A003] bg-[#F2A003]/10'
                          : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                      }`}
                    >
                      <Icon />
                      <span className="font-medium">{coin}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* 구매 금액 */}
            <Card className="bg-[#23242A] border-gray-700 mb-4">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">구매 금액 (USD)</h3>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="구매할 금액을 입력하세요"
                  className="w-full"
                  min="1"
                  step="1"
                />
                <div className="flex gap-2 mt-2">
                  {[50, 100, 200, 500].map(preset => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset.toString())}
                      className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* 견적 조회 버튼 */}
            <Button
              onClick={handleGetQuotes}
              disabled={
                quotesLoading ||
                !amount ||
                parseFloat(amount) <= 0 ||
                providerStatusError ||
                providerStatusLoading ||
                (providerStatus?.providers && Object.values(providerStatus.providers).every((p: any) => !p.available))
              }
              className={`w-full mb-4 font-bold ${
                (providerStatusError ||
                 providerStatusLoading ||
                 (providerStatus?.providers && Object.values(providerStatus.providers).every((p: any) => !p.available)))
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-[#F2A003] hover:bg-[#F2A003]/80 text-black'
              }`}
            >
              {quotesLoading
                ? '견적 조회 중...'
                : providerStatusError
                  ? '서비스 연결 실패'
                  : providerStatusLoading
                    ? '상태 확인 중...'
                    : (providerStatus?.providers && Object.values(providerStatus.providers).every((p: any) => !p.available))
                      ? '결제 서비스 사용불가'
                      : '견적 조회'
              }
            </Button>

            {/* 견적 결과 */}
            {quotes && (
              <Card className="bg-[#23242A] border-gray-700">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">최적 견적</h3>

                  {/* 추천 견적 */}
                  {quotes.recommended && (
                    <div className="bg-[#F2A003]/10 border border-[#F2A003]/30 rounded-lg p-3 mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[#F2A003] font-bold text-sm">🏆 추천</span>
                        <span className="text-xs bg-[#F2A003] text-black px-2 py-1 rounded">
                          {quotes.recommended.providerId.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-white font-bold">
                        {quotes.recommended.cryptoAmount} {selectedCurrency}
                      </div>
                      <div className="text-gray-400 text-sm">
                        수수료: ${quotes.recommended.totalCost} | 소요시간: {quotes.recommended.processingTime}
                      </div>
                      <Button
                        onClick={() => handleCreateTransaction(quotes.recommended.providerId)}
                        className="w-full mt-2 bg-[#F2A003] hover:bg-[#F2A003]/80 text-black font-bold"
                        disabled={createTransactionMutation.isPending}
                      >
                        구매하기
                      </Button>
                    </div>
                  )}

                  {/* 대안 견적들 */}
                  {quotes.alternatives && quotes.alternatives.length > 0 && (
                    <>
                      <h4 className="text-xs text-gray-400 mb-2 mt-4">다른 옵션</h4>
                      {quotes.alternatives.map((quote: any, index: number) => (
                        <div key={index} className="bg-gray-700/30 rounded-lg p-3 mb-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded">
                              {quote.providerId.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-white font-medium">
                            {quote.cryptoAmount} {selectedCurrency}
                          </div>
                          <div className="text-gray-400 text-sm">
                            수수료: ${quote.totalCost} | 소요시간: {quote.processingTime}
                          </div>
                          <Button
                            onClick={() => handleCreateTransaction(quote.providerId)}
                            className="w-full mt-2 bg-gray-600 hover:bg-gray-500 text-white"
                            disabled={createTransactionMutation.isPending}
                          >
                            선택하기
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </Card>
            )}
          </>
        )}

        {step === 'processing' && (
          <Card className="bg-[#23242A] border-gray-700">
            <div className="p-6 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-[#F2A003] border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-bold text-white mb-2">거래 생성 중...</h3>
              <p className="text-gray-400">잠시만 기다려주세요.</p>
            </div>
          </Card>
        )}

        {step === 'complete' && transactionId && (
          <Card className="bg-[#23242A] border-gray-700">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                ✓
              </div>
              <h3 className="text-lg font-bold text-white mb-2">거래 생성 완료</h3>
              <p className="text-gray-400 mb-4">결제를 완료하려면 새 창에서 결제를 진행해주세요.</p>
              <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-400 mb-1">거래 ID</p>
                <p className="text-sm font-mono text-white break-all">{transactionId}</p>
              </div>
              <Button
                onClick={() => {
                  setStep('quote');
                  setTransactionId(null);
                }}
                className="w-full bg-[#F2A003] hover:bg-[#F2A003]/80 text-black font-bold"
              >
                새 구매하기
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}