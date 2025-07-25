"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createHDWallet, saveWalletToStorage } from "../../lib/wallet-utils";
import { Button, Input } from "../../components/ui";
import { useWalletList } from "../../hooks/useWalletAtoms";

export default function CreateWalletPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<'input' | 'backup' | 'confirm' | 'complete'>('input');
  const [walletName, setWalletName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<any>(null);

  // 새로운 atoms hooks 사용
  const { refreshWalletList } = useWalletList();

  // 지갑 생성
  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      setError('지갑 이름을 입력해주세요.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const wallet = await createHDWallet({ name: walletName.trim() });
      setWalletInfo(wallet);
      setStep('backup');
    } catch (error) {
      console.error('지갑 생성 실패:', error);
      setError(error instanceof Error ? error.message : '지갑 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // 백업 확인
  const handleBackupConfirm = () => {
    setStep('confirm');
  };

  // 지갑 저장 및 완료
  const handleSaveWallet = async () => {
    if (!walletInfo) {
      setError('지갑 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      // 지갑을 로컬 스토리지에 저장
      saveWalletToStorage(walletInfo);
      
      // atoms 업데이트
      refreshWalletList();
      
      setStep('complete');
    } catch (error) {
      console.error('지갑 저장 실패:', error);
      setError(error instanceof Error ? error.message : '지갑 저장에 실패했습니다.');
    }
  };

  // 완료 후 홈으로 이동
  const handleComplete = () => {
    router.push('/');
  };

  // 뒤로 가기
  const handleBack = () => {
    if (step === 'backup') {
      setStep('input');
    } else if (step === 'confirm') {
      setStep('backup');
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
        <h1 className="text-xl font-bold text-white">새 지갑 생성</h1>
        <div className="w-8"></div>
      </div>

      {/* 진행 단계 표시 */}
      <div className="flex justify-center items-center p-4">
        <div className="flex items-center space-x-2">
          {['input', 'backup', 'confirm', 'complete'].map((s, index) => (
            <div key={s} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === s 
                    ? 'bg-[#F2A003] text-white' 
                    : index < ['input', 'backup', 'confirm', 'complete'].indexOf(step)
                    ? 'bg-[#26A17B] text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {index + 1}
              </div>
              {index < 3 && (
                <div className={`w-12 h-1 mx-2 ${
                  index < ['input', 'backup', 'confirm', 'complete'].indexOf(step)
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
              <h2 className="text-2xl font-bold text-white mb-2">새 지갑 생성</h2>
              <p className="text-gray-400">
                새로운 HD 지갑을 생성하여 다양한 가상자산을 관리하세요.
              </p>
            </div>
            
            <div className="space-y-4">
              <label className="block text-white font-semibold">지갑 이름</label>
              <Input
                type="text"
                value={walletName}
                onChange={(e) => {
                  setWalletName(e.target.value);
                  setError(null);
                }}
                placeholder="예: 내 첫 번째 지갑"
                maxLength={20}
              />
            </div>

            <div className="bg-[#F2A003]/10 border border-[#F2A003]/30 p-4 rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="text-[#F2A003] text-xl">ℹ️</div>
                <div className="text-[#F2A003] text-sm">
                  <strong>HD 지갑:</strong> 하나의 니모닉으로 여러 가상자산의 주소를 생성할 수 있습니다.
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              onClick={handleCreateWallet}
              className="w-full"
              disabled={!walletName.trim() || isCreating}
              isLoading={isCreating}
            >
              {isCreating ? '생성 중...' : '지갑 생성'}
            </Button>
          </div>
        )}

        {step === 'backup' && walletInfo && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">니모닉 백업</h2>
              <p className="text-gray-400">
                지갑 복구를 위해 니모닉을 안전한 곳에 백업하세요.
              </p>
            </div>

            <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="text-red-400 text-xl">⚠️</div>
                <div className="text-red-400 text-sm">
                  <strong>중요:</strong> 이 니모닉은 지갑 복구의 유일한 방법입니다. 
                  안전한 곳에 보관하고 절대 타인에게 공유하지 마세요.
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl">
              <label className="block text-gray-400 text-sm font-semibold mb-3">니모닉 (복구 문구)</label>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-white font-mono text-sm break-words leading-relaxed">
                  {walletInfo.mnemonic}
                </p>
              </div>
              <p className="text-gray-400 text-xs mt-2">
                단어 수: {walletInfo.mnemonic.split(' ').length}개
              </p>
            </div>

            <div className="bg-[#26A17B]/10 border border-[#26A17B]/30 p-4 rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="text-[#26A17B] text-xl">💡</div>
                <div className="text-[#26A17B] text-sm">
                  <strong>백업 팁:</strong><br />
                  • 종이에 적어서 안전한 곳에 보관<br />
                  • 여러 장소에 분산 보관<br />
                  • 디지털 기기에 저장하지 마세요
                </div>
              </div>
            </div>

            <Button
              onClick={handleBackupConfirm}
              className="w-full"
            >
              백업 완료
            </Button>
          </div>
        )}

        {step === 'confirm' && walletInfo && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">지갑 정보 확인</h2>
              <p className="text-gray-400">
                생성된 지갑 정보를 확인하고 저장하세요.
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl space-y-4">
              <div>
                <label className="block text-gray-400 text-sm font-semibold mb-2">지갑 이름</label>
                <p className="text-white font-semibold">{walletInfo.name}</p>
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm font-semibold mb-2">마스터 주소</label>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <p className="text-white font-mono text-sm break-all">
                    {walletInfo.masterAddress}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-semibold mb-2">생성된 주소들</label>
                <div className="space-y-2">
                  {Object.entries(walletInfo.addresses).map(([asset, address]) => (
                    <div key={asset} className="bg-gray-700 p-2 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm font-semibold">{asset}</span>
                        <span className="text-gray-400 text-xs">{String(address)}</span>
                      </div>
                    </div>
                  ))}
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
                onClick={() => setStep('backup')}
                variant="secondary"
                className="flex-1"
              >
                뒤로
              </Button>
              <Button
                onClick={handleSaveWallet}
                className="flex-1"
              >
                지갑 저장
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">지갑 생성 완료!</h2>
            <p className="text-gray-400 mb-6">
              새로운 지갑이 성공적으로 생성되었습니다.<br />
              이제 다양한 가상자산을 관리할 수 있습니다.
            </p>

            <div className="bg-[#26A17B]/20 border border-[#26A17B]/30 p-4 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="text-[#26A17B] text-xl">✅</div>
                <div className="text-[#26A17B] text-sm">
                  <strong>지갑 이름:</strong> {walletInfo?.name}<br />
                  <strong>생성 시간:</strong> {new Date().toLocaleString()}
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