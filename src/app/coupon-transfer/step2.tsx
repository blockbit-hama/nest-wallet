"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNonce, createCouponTransfer, getFeePayPublicKey } from "../../lib/api/voucher";
import { useMasterAddress } from "../../hooks/wallet/useMasterAddress";
import { useWallet } from "../../hooks/wallet/useWallet";
import { sendBlockchainTransaction, sendDirectTransaction } from "../../lib/api/blockchain-transfer";
import { ethers } from "ethers";

interface CouponTransferStep2Props {
  transferData: {
    senderAddress: string;
    recipientAddress: string;
    transferAmount?: string;
    currency: string;
    selectedCoupons: any[];
    estimatedFee: string;
    feeInDollar: string;
    opswalletFeeInDollar: string;
    transferMode: 'coupon' | 'direct';
  };
  onComplete: () => void;
  onBack: () => void;
}

export function CouponTransferStep2({ transferData, onComplete, onBack }: CouponTransferStep2Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingStep, setLoadingStep] = useState("");

  const { masterAddress, signMessageForCouponAuth } = useMasterAddress();
  const { signTransaction, signEthereumTransaction, getAssetPrivateKey } = useWallet();

  const handleConfirm = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage("");
    
    try {
      if (!masterAddress) {
        throw new Error("마스터 주소를 찾을 수 없습니다.");
      }

      if (transferData.transferMode === 'coupon') {
        await handleCouponTransfer();
      } else {
        await handleDirectTransfer();
      }

      setIsSuccess(true);
      setLoadingStep("");
    } catch (error) {
      console.error('전송 실패:', error);
      setIsError(true);
      setErrorMessage(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      setLoadingStep("");
    } finally {
      setIsLoading(false);
    }
  };

  // 쿠폰 전송 처리
  const handleCouponTransfer = async () => {
    if (!signMessageForCouponAuth) {
      throw new Error("지갑이 연결되어 있지 않습니다.");
    }

    if (!masterAddress) {
      throw new Error("마스터 주소를 찾을 수 없습니다.");
    }

    // 1. Nonce 요청 (쿠폰 서버 인증용)
    setLoadingStep("nonce 요청 중...");
    const nonceResponse = await createNonce({ masterAddress });
    const nonce = nonceResponse.nonce;
    console.log('Nonce 요청 성공:', nonce);

    // 2. 쿠폰 서버 인증용 서명 생성 (1번 방식)
    setLoadingStep("쿠폰 서버 인증 서명 생성 중...");
    const authMessage = `${masterAddress}${nonce}`;
    const authSignature = await signMessageForCouponAuth(authMessage);
    console.log('쿠폰 서버 인증 서명 생성 완료:', authSignature);

    // 3. 블록체인 트랜잭션 서명 생성 (2번 방식)
    setLoadingStep("블록체인 트랜잭션 서명 생성 중...");
    
    // 통화에 따라 적절한 심볼 결정 및 트랜잭션 생성
    let transactionSymbol = 'ETH'; // 기본값
    let signedTransaction = '';
    
    if (transferData.currency === 'SOL' || transferData.currency === 'SOLANA') {
      // 솔라나 트랜잭션 생성
      transactionSymbol = 'SOL';
      
      // FeePay 공개키 가져오기
      setLoadingStep("FeePay 공개키 요청 중...");
      const feePayResponse = await getFeePayPublicKey('SOL');
      const feePayerPublicKey = feePayResponse.key;
      console.log('FeePay 공개키 가져오기 완료:', feePayerPublicKey);
      
      // 솔라나 트랜잭션 생성 및 서명
      const { createSolanaTransaction, signSolanaTransaction } = await import('../../lib/solana/transaction');
      const { Connection } = await import('@solana/web3.js');
      
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const transaction = await createSolanaTransaction({
        from: transferData.senderAddress,
        to: transferData.recipientAddress,
        amount: transferData.transferAmount || "0",
        feePayer: feePayerPublicKey,
      }, connection, feePayerPublicKey);
      
      const assetKey = getAssetPrivateKey(transactionSymbol);
      if (!assetKey) {
        throw new Error(`${transactionSymbol} 개인키를 찾을 수 없습니다.`);
      }
      
      const signedTx = await signSolanaTransaction(transaction, assetKey.privateKey);
      signedTransaction = signedTx.rawTransaction;
      console.log('솔라나 트랜잭션 서명 생성 완료:', signedTransaction);
      
    } else {
      // 이더리움 기반 트랜잭션 생성
      if (transferData.currency === 'BITCOIN') {
        transactionSymbol = 'BTC';
      } else if (transferData.currency === 'MATIC') {
        transactionSymbol = 'MATIC';
      } else if (transferData.currency === 'BSC') {
        transactionSymbol = 'BSC';
      } else if (transferData.currency === 'AVAX') {
        transactionSymbol = 'AVAX';
      }
      
      const assetKey = getAssetPrivateKey(transactionSymbol);
      if (!assetKey) {
        throw new Error(`${transactionSymbol} 개인키를 찾을 수 없습니다.`);
      }
      
      // 이더리움 기반 트랜잭션 데이터 생성 및 서명
      const txData = {
        to: transferData.recipientAddress,
        value: ethers.utils.parseEther(transferData.transferAmount || "0"),
        gasLimit: 21000,
        gasPrice: ethers.utils.parseUnits("20", "gwei")
      };
      
      signedTransaction = await signEthereumTransaction(txData, transactionSymbol);
      console.log('이더리움 기반 트랜잭션 서명 생성 완료:', signedTransaction);
    }

    // 4. 트랜잭션 데이터 준비
    setLoadingStep("트랜잭션 준비 중...");
    const couponTransferData = {
      masterAddress,
      signature: authSignature,
      nonce,
      currencyId: transferData.currency,
      estimatedFee: transferData.estimatedFee,
      feeInDollar: transferData.feeInDollar,
      opswalletFeeInDollar: transferData.opswalletFeeInDollar || "1.00",
      couponList: calculateOptimalCouponUsage(transferData.selectedCoupons, parseFloat(transferData.feeInDollar) + parseFloat(transferData.opswalletFeeInDollar || "0")),
      senderAddress: transferData.senderAddress,
      transaction: {
        serializedTransaction: signedTransaction,
        userSignature: authSignature,
        userPublicKey: masterAddress
      },
      memo: "송금에 필요한 수수료 대납 요청"
    };

    // 5. 쿠폰 전송 요청
    setLoadingStep("쿠폰 전송 중...");
    const response = await createCouponTransfer(couponTransferData);
    console.log('쿠폰 전송 성공:', response);

    if (!response.transactionId) {
      throw new Error('쿠폰 전송에 실패했습니다.');
    }
  };

  // 직접 블록체인 전송 처리
  const handleDirectTransfer = async () => {
    if (!signTransaction) {
      throw new Error("지갑이 연결되어 있지 않습니다.");
    }

    setLoadingStep("블록체인 트랜잭션 준비 중...");
    
    // currency가 undefined인 경우 처리
    if (!transferData.currency) {
      throw new Error("전송할 통화가 지정되지 않았습니다.");
    }
    
    // 통화에 따라 적절한 심볼 결정
    let transactionSymbol = 'ETH'; // 기본값
    if (transferData.currency === 'BITCOIN') {
      transactionSymbol = 'BTC';
    } else if (transferData.currency === 'MATIC') {
      transactionSymbol = 'MATIC';
    } else if (transferData.currency === 'BSC') {
      transactionSymbol = 'BSC';
    } else if (transferData.currency === 'AVAX') {
      transactionSymbol = 'AVAX';
    }

    setLoadingStep("개인키 조회 중...");
    
    // 선택된 지갑의 개인키 가져오기
    const assetKey = getAssetPrivateKey(transactionSymbol);
    
    if (!assetKey) {
      throw new Error(`${transactionSymbol} 개인키를 찾을 수 없습니다.`);
    }

    setLoadingStep("블록체인으로 전송 중...");
    
    // 전송 금액이 없으면 오류 발생
    if (!transferData.transferAmount || parseFloat(transferData.transferAmount) <= 0) {
      throw new Error("전송 금액을 입력해주세요.");
    }
    
    // 실제 블록체인 전송 (기존 함수 사용)
    const result = await sendBlockchainTransaction(
      transferData.senderAddress,
      transferData.recipientAddress,
      transferData.transferAmount,
      assetKey.privateKey,
      transferData.currency
    );

    if (!result.success) {
      throw new Error(result.error || '블록체인 전송에 실패했습니다.');
    }

    console.log('직접 블록체인 전송 완료:', result);
    
    // 트랜잭션 해시를 로컬 스토리지에 저장 (액션 탭에서 확인용)
    if (result.transactionHash) {
      const transactionInfo = {
        hash: result.transactionHash,
        from: transferData.senderAddress,
        to: transferData.recipientAddress,
        amount: transferData.transferAmount,
        currency: transferData.currency,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      existingTransactions.unshift(transactionInfo);
      localStorage.setItem('transactions', JSON.stringify(existingTransactions));
    }
    
    // 성공 상태로 변경하고 바로 완료 처리
    setIsSuccess(true);
    setLoadingStep("");
    setIsLoading(false);
  };

  const handleBack = () => {
    if (!isLoading) {
      onBack();
    }
  };

  const handleComplete = () => {
    // 전송 완료 후 잔액 새로고침 이벤트 발생
    window.dispatchEvent(new CustomEvent('transferCompleted', { 
      detail: { 
        transferMode: transferData.transferMode,
        currency: transferData.currency 
      }
    }));
    
    onComplete();
  };

  // 최적의 쿠폰 사용량 계산 (적은 양부터 차감)
  const calculateOptimalCouponUsage = (selectedCoupons: any[], requiredAmount: number) => {
    console.log('🎯 Calculating optimal coupon usage for required amount:', requiredAmount);
    
    // 쿠폰을 금액 순으로 정렬 (적은 것부터)
    const sortedCoupons = [...selectedCoupons].sort((a, b) => {
      const amountA = parseFloat(a.amountRemaining || a.value || "0");
      const amountB = parseFloat(b.amountRemaining || b.value || "0");
      return amountA - amountB;
    });

    console.log('📊 Sorted coupons (ascending):', sortedCoupons.map(c => ({
      code: c.code,
      amount: c.amountRemaining || c.value
    })));

    let remainingRequired = requiredAmount;
    const couponUsage: Array<{ couponCode: string; amount: string }> = [];

    // 적은 쿠폰부터 차감
    for (const coupon of sortedCoupons) {
      const couponAmount = parseFloat(coupon.amountRemaining || coupon.value || "0");
      
      if (remainingRequired <= 0) break;
      
      const useAmount = Math.min(couponAmount, remainingRequired);
      couponUsage.push({
        couponCode: coupon.code,
        amount: useAmount.toFixed(2)
      });
      
      remainingRequired -= useAmount;
      console.log(`💳 Using coupon ${coupon.code}: ${useAmount.toFixed(2)} (remaining: ${remainingRequired.toFixed(2)})`);
    }

    if (remainingRequired > 0) {
      console.warn(`⚠️ Insufficient coupon amount. Still need: ${remainingRequired.toFixed(2)}`);
    }

    console.log('✅ Final coupon usage:', couponUsage);
    return couponUsage;
  };

  return (
    <div className="min-h-screen" style={{ background: '#14151A' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <button 
          onClick={handleBack}
          disabled={isLoading}
          className="text-white text-lg font-semibold disabled:opacity-50"
        >
          ← 뒤로
        </button>
        <h1 className="text-xl font-bold text-white">전송 확인</h1>
        <div className="w-16"></div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="p-6">
        {isSuccess ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">전송 완료!</h2>
            <p className="text-gray-400 mb-6">
              {transferData.transferMode === 'coupon' 
                ? '쿠폰이 성공적으로 전송되었습니다.'
                : '블록체인 전송이 완료되었습니다.'
              }
            </p>
            <button
              onClick={handleComplete}
              className="bg-[#F2A003] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#E09400] transition-colors"
            >
              완료
            </button>
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">전송 실패</h2>
            <p className="text-gray-400 mb-6">{errorMessage}</p>
            <button
              onClick={handleBack}
              className="bg-[#F2A003] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#E09400] transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 전송 모드 표시 */}
            <div className={`p-4 rounded-xl border ${
              transferData.transferMode === 'coupon'
                ? "bg-blue-900/20 border-blue-500/30"
                : "bg-green-900/20 border-green-500/30"
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  transferData.transferMode === 'coupon' ? "bg-blue-500" : "bg-green-500"
                }`}>
                  {transferData.transferMode === 'coupon' ? '🎫' : '🔗'}
                </div>
                <div>
                  <div className="text-white font-semibold">
                    {transferData.transferMode === 'coupon' ? '쿠폰 서버 전송' : '직접 블록체인 전송'}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {transferData.transferMode === 'coupon' 
                      ? '선택된 쿠폰을 쿠폰 서버로 전송합니다.'
                      : '직접 블록체인으로 송금합니다.'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* 전송 정보 요약 */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">전송 정보</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">보내는 주소:</span>
                  <span className="text-white font-mono text-sm">{transferData.senderAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">받는 주소:</span>
                  <span className="text-white font-mono text-sm">{transferData.recipientAddress}</span>
                </div>
                {transferData.transferMode === 'direct' && transferData.transferAmount && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">전송 금액:</span>
                    <span className="text-white">{transferData.transferAmount} {transferData.currency}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">예상 수수료:</span>
                  <span className="text-white">{transferData.estimatedFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">수수료 (USD):</span>
                  <span className="text-white">{transferData.feeInDollar}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">OpsWallet 수수료 (USD):</span>
                  <span className="text-white">{transferData.opswalletFeeInDollar}</span>
                </div>
                {transferData.transferMode === 'coupon' && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">선택된 쿠폰:</span>
                    <span className="text-white">{transferData.selectedCoupons.length}개</span>
                  </div>
                )}
              </div>
            </div>

            {/* 선택된 쿠폰 목록 (쿠폰 전송 모드일 때만) */}
            {transferData.transferMode === 'coupon' && transferData.selectedCoupons.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">선택된 쿠폰</h3>
                <div className="space-y-2">
                  {transferData.selectedCoupons.map((coupon) => (
                    <div key={coupon.code} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                      <div>
                        <div className="text-white font-semibold">{coupon.code}</div>
                        <div className="text-sm text-[#F2A003]">
                          {Number(coupon.amountRemaining || coupon.value || 0).toLocaleString()} {coupon.fiatCode || coupon.currency}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        만료: {new Date(coupon.expireDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 주의사항 */}
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
              <h3 className="text-yellow-400 font-semibold mb-2">⚠️ 주의사항</h3>
              <ul className="text-yellow-300 text-sm space-y-1">
                <li>• 전송 후에는 되돌릴 수 없습니다.</li>
                <li>• 주소를 정확히 확인해주세요.</li>
                <li>• 수수료는 네트워크 상황에 따라 변동될 수 있습니다.</li>
                {transferData.transferMode === 'coupon' && (
                  <li>• 쿠폰 전송은 쿠폰 서버를 통해 처리됩니다.</li>
                )}
                {transferData.transferMode === 'direct' && (
                  <li>• 직접 전송은 블록체인에 즉시 반영됩니다.</li>
                )}
              </ul>
            </div>

            {/* 로딩 상태 */}
            {isLoading && (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F2A003] mx-auto mb-4"></div>
                <p className="text-white font-semibold">{loadingStep}</p>
              </div>
            )}

            {/* 확인 버튼 */}
            {!isLoading && (
              <div className="flex space-x-3">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 px-6 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 px-6 bg-[#F2A003] text-[#14151A] rounded-xl font-semibold hover:bg-[#E09400] transition-colors"
                >
                  전송 실행
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}