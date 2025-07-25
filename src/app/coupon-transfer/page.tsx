"use client";
import { useState } from "react";
import { CouponTransferStep1 } from "./step1";
import { CouponTransferStep2 } from "./step2";
import { TabBar } from "../../components/molecules/TabBar";
import { cn } from '@/lib/utils/utils';

export default function CouponTransferPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [transferData, setTransferData] = useState<any>(null);

  const handleStep1Complete = (data: any) => {
    setTransferData(data);
    setCurrentStep(2);
  };

  const handleStep2Complete = () => {
    // 전송 완료 후 홈으로 이동
    window.location.href = '/';
  };

  const handleClose = () => {
    window.location.href = '/';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-5">
      <div className="rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border shadow-2xl"
           style={{ 
             background: '#1B1C22', 
             borderColor: '#23242A', 
             boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)' 
           }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold m-0" style={{ color: '#F2A003' }}>쿠폰 전송</h1>
          <button 
            className="bg-transparent border-0 text-2xl cursor-pointer p-2 rounded-lg transition-all duration-200 hover:bg-gray-700"
            style={{ color: '#A0A0B0' }}
            onClick={handleClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#23242A';
              e.currentTarget.style.color = '#F2A003';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#A0A0B0';
            }}
          >
            ✕
          </button>
        </div>

        <div className="flex justify-center mb-6 gap-2">
          <div className={cn(
            "w-3 h-3 rounded-full border-2 transition-all duration-300",
            currentStep === 1 ? "border-orange-400" : currentStep > 1 ? "border-orange-400" : "border-gray-700"
          )}
          style={{ 
            background: currentStep > 1 ? '#F2A003' : currentStep === 1 ? '#F2A003' : '#23242A',
            borderColor: currentStep === 1 ? '#F2A003' : '#23242A'
          }} />
          <div className={cn(
            "w-3 h-3 rounded-full border-2 transition-all duration-300",
            currentStep === 2 ? "border-orange-400" : "border-gray-700"
          )}
          style={{ 
            background: currentStep === 2 ? '#F2A003' : '#23242A',
            borderColor: currentStep === 2 ? '#F2A003' : '#23242A'
          }} />
        </div>

        {currentStep === 1 && (
          <CouponTransferStep1 onComplete={handleStep1Complete} />
        )}

        {currentStep === 2 && transferData && (
          <CouponTransferStep2 
            transferData={transferData}
            onComplete={handleStep2Complete}
            onBack={() => setCurrentStep(1)}
          />
        )}
      </div>
    </div>
  );
}