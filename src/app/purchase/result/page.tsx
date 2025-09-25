"use client";
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface TransactionResult {
  status: 'success' | 'failed' | 'pending';
  transactionId?: string;
  message?: string;
}

export default function PurchaseResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<TransactionResult>({ status: 'pending' });

  useEffect(() => {
    // URL 파라미터에서 결과 정보 추출
    const transactionId = searchParams.get('transactionId');
    const status = searchParams.get('transactionStatus');

    console.log('🔍 Purchase Result - URL Parameters:', { transactionId, status });

    if (transactionId) {
      // MoonPay에서 돌아온 경우
      setResult({
        status: status as 'success' | 'failed' | 'pending' || 'pending',
        transactionId,
        message: '결제가 처리되었습니다. 암호화폐가 지갑으로 전송됩니다.'
      });
    } else {
      // 파라미터가 없으면 구매 페이지로 리다이렉트
      router.push('/purchase');
    }
  }, [searchParams, router]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleRetryPurchase = () => {
    router.push('/purchase');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <div className="p-6 text-center">
          {result.status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">결제 성공!</h1>
              <p className="text-gray-400 mb-6">
                {result.message || '결제가 성공적으로 완료되었습니다.'}
              </p>
              {result.transactionId && (
                <div className="bg-[#2A2B31] rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-400 mb-1">트랜잭션 ID</p>
                  <p className="text-white font-mono text-sm break-all">{result.transactionId}</p>
                </div>
              )}
              {result.amount && result.currency && (
                <div className="bg-[#2A2B31] rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-400 mb-1">구매 금액</p>
                  <p className="text-white font-semibold">
                    ${result.amount} → {result.currency.toUpperCase()}
                  </p>
                </div>
              )}
            </>
          )}

          {result.status === 'failed' && (
            <>
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">결제 실패</h1>
              <p className="text-gray-400 mb-6">
                {result.message || '결제 중 문제가 발생했습니다.'}
              </p>
            </>
          )}

          {result.status === 'pending' && (
            <>
              <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">결제 처리 중</h1>
              <p className="text-gray-400 mb-6">
                {result.message || '결제가 처리 중입니다. 잠시만 기다려 주세요.'}
              </p>
            </>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleRetryPurchase}
              className="w-full bg-[#F2A003] hover:bg-[#E6940C] text-black font-semibold"
            >
              새로운 구매하기
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              홈으로 돌아가기
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}