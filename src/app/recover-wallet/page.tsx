"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateMnemonic, recoverWalletFromMnemonic, saveWalletToStorage } from "../../lib/wallet-utils";
import { Button, Input } from "../../components/ui";
import { useWalletList, useEnabledAssets } from "../../hooks/useWalletAtoms";

export default function RecoverWalletPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<'input' | 'confirm' | 'complete'>('input');
  const [walletName, setWalletName] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 새로운 atoms hooks 사용
  const { refreshWalletList } = useWalletList();
  const { updateEnabledAssets } = useEnabledAssets();

  // 니모닉 입력 처리
  const handleMnemonicInput = (value: string) => {
    // 입력 중에는 공백을 유지하고, 소문자만 변환
    const cleanedValue = value.toLowerCase();
    setMnemonic(cleanedValue);
    setError(null);
  };

  // 지갑 이름과 니모닉 확인
  const handleInputSubmit = () => {
    if (!walletName.trim()) {
      setError('지갑 이름을 입력해주세요.');
      return;
    }

    if (!mnemonic.trim()) {
      setError('니모닉을 입력해주세요.');
      return;
    }

    // 니모닉 단어 수 확인 (공백 정리 후)
    const trimmedMnemonic = mnemonic.trim();
    const words = trimmedMnemonic.split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setError('니모닉은 12개 또는 24개의 단어여야 합니다.');
      return;
    }

    // 니모닉 유효성 검사 (공백 정리 후)
    if (!validateMnemonic(trimmedMnemonic)) {
      setError('유효하지 않은 니모닉입니다. 단어를 정확히 입력해주세요.');
      return;
    }

    setError(null);
    setStep('confirm');
  };

  // 지갑 복구 실행
  const handleRecoverWallet = async () => {
    setIsRecovering(true);
    setError(null);

    try {
      // 니모닉으로 지갑 복구
      const wallet = await recoverWalletFromMnemonic(mnemonic.trim(), walletName);
      
      // 지갑을 로컬 스토리지에 저장
      saveWalletToStorage(wallet);
      
      // 기본 자산 활성화 (BTC, ETH)
      updateEnabledAssets(['BTC', 'ETH']);
      console.log('지갑 복구 시 기본 자산 활성화: BTC, ETH');
      
      // atoms 업데이트
      refreshWalletList();
      
      setStep('complete');
    } catch (error) {
      console.error('지갑 복구 실패:', error);
      setError(error instanceof Error ? error.message : '지갑 복구 중 오류가 발생했습니다.');
    } finally {
      setIsRecovering(false);
    }
  };

  // 완료 후 홈으로 이동
  const handleComplete = () => {
    router.push('/');
  };

  // 뒤로 가기
  const handleBack = () => {
    if (step === 'confirm') {
      setStep('input');
    } else if (step === 'complete') {
      setStep('confirm');
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative font-inherit" style={{ background: '#14151A' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <button 
          onClick={handleBack}
          className="text-white text-lg font-bold"
        >
          ← 뒤로
        </button>
        <h1 className="text-xl font-bold text-white">지갑 복구</h1>
        <div className="w-8"></div>
      </div>

      {/* 진행 단계 표시 */}
      <div className="flex justify-center items-center p-4">
        <div className="flex items-center space-x-2">
          {['input', 'confirm', 'complete'].map((s, index) => (
            <div key={s} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === s 
                    ? 'bg-[#F2A003] text-white' 
                    : index < ['input', 'confirm', 'complete'].indexOf(step)
                    ? 'bg-[#26A17B] text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {index + 1}
              </div>
              {index < 2 && (
                <div className={`w-12 h-1 mx-2 ${
                  index < ['input', 'confirm', 'complete'].indexOf(step)
                    ? 'bg-[#26A17B]'
                    : 'bg-gray-600'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 p-6 max-w-md mx-auto w-full">
        {step === 'input' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">지갑 복구</h2>
              <p className="text-gray-400">
                기존에 사용하던 니모닉을 입력하여 지갑을 복구하세요.
              </p>
            </div>
            
            <div className="space-y-4">
              <label className="block text-white font-semibold">지갑 이름</label>
              <Input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="예: 복구된 지갑"
                maxLength={20}
              />
            </div>

            <div className="space-y-4">
              <label className="block text-white font-semibold">니모닉 (복구 문구)</label>
              <textarea
                value={mnemonic}
                onChange={(e) => handleMnemonicInput(e.target.value)}
                placeholder="12개 또는 24개의 단어를 공백으로 구분하여 입력하세요"
                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-[#F2A003] focus:outline-none resize-none"
                rows={4}
                style={{ minHeight: '120px' }}
              />
              <div className="text-gray-400 text-sm space-y-1">
                <p>예: abandon ability able about above absent absorb abstract absurd abuse access accident</p>
                <p>• 12개 또는 24개의 단어를 정확히 입력하세요</p>
                <p>• 각 단어는 공백으로 구분하세요</p>
                <p>• 대소문자는 자동으로 처리됩니다</p>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              onClick={handleInputSubmit}
              className="w-full"
              disabled={!walletName.trim() || !mnemonic.trim()}
            >
              다음
            </Button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">복구 정보 확인</h2>
              <p className="text-gray-400">
                입력한 정보를 확인하고 지갑을 복구하세요.
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl space-y-4">
              <div>
                <label className="block text-gray-400 text-sm font-semibold mb-2">지갑 이름</label>
                <p className="text-white font-semibold">{walletName}</p>
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm font-semibold mb-2">니모닉</label>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <p className="text-white font-mono text-sm break-words">
                    {mnemonic.trim()}
                  </p>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  단어 수: {mnemonic.trim().split(/\s+/).length}개
                </p>
              </div>
            </div>

            <div className="bg-[#F2A003]/10 border border-[#F2A003]/30 p-4 rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="text-[#F2A003] text-xl">ℹ️</div>
                <div className="text-[#F2A003] text-sm">
                  <strong>알림:</strong> 이 니모닉으로 기존 지갑의 모든 주소와 자산에 접근할 수 있습니다. 
                  안전한 환경에서 복구를 진행하세요.
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                onClick={() => setStep('input')}
                variant="secondary"
                className="flex-1"
              >
                수정
              </Button>
              <Button
                onClick={handleRecoverWallet}
                disabled={isRecovering}
                isLoading={isRecovering}
                className="flex-1"
              >
                {isRecovering ? '복구 중...' : '지갑 복구'}
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6 text-center">
            <div className="text-6xl mb-4">🔓</div>
            <h2 className="text-2xl font-bold text-white mb-2">지갑 복구 완료!</h2>
            <p className="text-gray-400 mb-6">
              지갑이 성공적으로 복구되었습니다.<br />
              이제 기존 자산에 접근할 수 있습니다.
            </p>

            <div className="bg-[#26A17B]/20 border border-[#26A17B]/30 p-4 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="text-[#26A17B] text-xl">✅</div>
                <div className="text-[#26A17B] text-sm">
                  <strong>지갑 이름:</strong> {walletName}<br />
                  <strong>복구 시간:</strong> {new Date().toLocaleString()}
                </div>
              </div>
            </div>

            <Button
              onClick={handleComplete}
              className="w-full"
            >
              지갑으로 이동
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 