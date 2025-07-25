"use client";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useState, useEffect } from "react";
import { useWallet } from "../../hooks/queries/useWallet";
import { useWalletList } from "../../hooks/useWalletAtoms";

export default function ReceivePage() {
  const router = useRouter();
  const [selectedAddress, setSelectedAddress] = useState<string>("ETH");
  const [currentWallet, setCurrentWallet] = useState<any>(null);

  // 새로운 atoms hooks 사용
  const { selectedWallet } = useWalletList();

  // 현재 선택된 지갑 설정
  useEffect(() => {
    if (selectedWallet) {
      setCurrentWallet(selectedWallet);
    }
  }, [selectedWallet]);

  const availableAddresses = currentWallet ? [
    { key: "ETH", label: "ETH (메인넷)", address: currentWallet.addresses.ETH },
    { key: "ETH_GOERLI", label: "ETH (Goerli 테스트넷)", address: currentWallet.addresses.ETH_GOERLI },
    { key: "ETH_SEPOLIA", label: "ETH (Sepolia 테스트넷)", address: currentWallet.addresses.ETH_SEPOLIA },
    { key: "BTC", label: "BTC", address: currentWallet.addresses.BTC },
    { key: "MATIC", label: "MATIC (Polygon)", address: currentWallet.addresses.MATIC },
    { key: "BSC", label: "BSC", address: currentWallet.addresses.BSC },
    { key: "AVAX", label: "AVAX", address: currentWallet.addresses.AVAX },
  ].filter(addr => addr.address) : [];

  const currentAddress = availableAddresses.find(addr => addr.key === selectedAddress)?.address || "";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentAddress);
      alert('주소가 클립보드에 복사되었습니다!');
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
      // 폴백: 텍스트 영역을 생성하여 복사
      const textArea = document.createElement('textarea');
      textArea.value = currentAddress;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('주소가 클립보드에 복사되었습니다!');
    }
  };

  if (!currentWallet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#14151A' }}>
        <div className="text-center text-white p-10">
          <h1 className="text-2xl font-bold mb-4">지갑 정보를 찾을 수 없습니다</h1>
          <p className="text-gray-400 mb-6">지갑을 먼저 생성하거나 선택해주세요.</p>
          <button 
            onClick={() => router.push('/')} 
            className="bg-[#F2A003] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#E09400] transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#14151A' }}>
      <h1 className="text-2xl font-bold text-white mb-6">내 지갑 주소</h1>
      
      {/* 주소 선택 드롭다운 */}
      <div className="w-full max-w-md mb-6">
        <label className="block text-white text-sm font-semibold mb-2">주소 선택</label>
        <select
          value={selectedAddress}
          onChange={(e) => setSelectedAddress(e.target.value)}
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-[#F2A003] focus:outline-none"
        >
          {availableAddresses.map(addr => (
            <option key={addr.key} value={addr.key}>
              {addr.label}
            </option>
          ))}
        </select>
      </div>

      {/* QR 코드 */}
      <div className="bg-white p-6 rounded-xl mb-4">
        <QRCodeCanvas value={currentAddress} size={200} />
      </div>
      
      {/* 선택된 주소 정보 */}
      <div className="text-white mb-2 text-center">
        {availableAddresses.find(addr => addr.key === selectedAddress)?.label}
      </div>
      <div className="text-gray-300 font-mono break-all mb-6 text-center max-w-md">
        {currentAddress}
      </div>

      {/* 주소 복사 버튼 */}
      <button 
        onClick={copyToClipboard}
        className="bg-[#F2A003] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#E09400] transition-colors mb-4"
      >
        📋 주소 복사
      </button>
      
      <button 
        onClick={() => router.push('/')} 
        className="bg-gray-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-600 transition-colors"
      >
        닫기
      </button>
    </div>
  );
} 