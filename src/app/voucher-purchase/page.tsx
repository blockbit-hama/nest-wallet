"use client";
import { useState, useEffect } from "react";
import { TabBar } from "../../components/molecules/TabBar";
import { cn } from '@/lib/utils/utils';

interface Voucher {
  id: string;
  amount: number;
  expiresAt: string;
}

export default function VoucherPurchasePage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState<"list" | "pay" | "result">("list");
  const [result, setResult] = useState<any>(null);
  const [myVouchers, setMyVouchers] = useState([
    { code: "VCHR-20250608-ABCD12", amount: 0.01, expiresAt: "2025-09-30", status: "UNUSED" },
    { code: "VCHR-20250610-XYZ999", amount: 0.02, expiresAt: "2025-10-31", status: "USED" },
    { code: "VCHR-20250501-EXPIRED", amount: 0.01, expiresAt: "2025-05-01", status: "EXPIRED" },
  ]);

  // 1. 바우처 상품 목록 조회 (목업)
  useEffect(() => {
    // 실제로는 fetch("/v1/vouchers/catalog")
    setTimeout(() => {
      setVouchers([
        { id: "v1", amount: 10000, expiresAt: "2025-06-30" },
        { id: "v2", amount: 30000, expiresAt: "2025-12-31" },
        { id: "v3", amount: 50000, expiresAt: "2026-06-30" },
      ]);
    }, 300);
  }, []);

  // 2. 결제 요청 (PG 연동은 실제로는 외부 창/redirect 등)
  const handlePay = () => {
    setStep("pay");
    // 실제 결제 연동 로직 필요
    setTimeout(() => {
      // 결제 성공 가정
      setResult({
        code: "VCHR-20250608-ABCD12",
        amount: vouchers.find(v => v.id === selected)?.amount,
        expiresAt: vouchers.find(v => v.id === selected)?.expiresAt,
      });
      setStep("result");
    }, 2000);
  };

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen relative" style={{ background: '#14151A' }}>
      <h2 className="text-3xl font-extrabold mb-6" style={{ color: '#F2A003' }}>Voucher Purchase</h2>
      
      {step === "list" && (
        <>
          <div className="flex flex-col gap-4">
            {vouchers.map(v => (
              <div 
                key={v.id} 
                className={cn(
                  "border-2 rounded-2xl p-5 cursor-pointer flex justify-between items-center transition-all duration-200",
                  selected === v.id ? "border-orange-400" : "border-gray-700"
                )}
                style={{ 
                  background: '#181920', 
                  color: '#fff',
                  borderColor: selected === v.id ? '#F2A003' : '#23242A'
                }}
                onClick={() => setSelected(v.id)}
              >
                <div>
                  <div className="text-xl font-bold">{v.amount.toLocaleString()}원</div>
                  <div className="text-sm" style={{ color: '#F2A003' }}>유효기간: {v.expiresAt}</div>
                </div>
                {selected === v.id && (
                  <span className="font-bold" style={{ color: '#F2A003' }}>선택됨</span>
                )}
              </div>
            ))}
          </div>
          <button
            className="mt-8 w-full h-14 border-0 rounded-2xl text-xl font-extrabold cursor-pointer transition-opacity duration-200 disabled:opacity-50"
            style={{ 
              background: '#F2A003', 
              color: '#14151A',
              opacity: selected ? 1 : 0.5
            }}
            disabled={!selected}
            onClick={handlePay}
          >
            결제하기
          </button>
        </>
      )}
      
      {step === "pay" && (
        <div className="text-center mt-15 text-xl" style={{ color: '#F2A003' }}>
          결제 진행 중...
        </div>
      )}
      
      {step === "result" && result && (
        <div className="mt-10 text-center">
          <div className="text-2xl font-bold mb-4" style={{ color: '#F2A003' }}>
            바우처 발급 완료!
          </div>
          <div className="text-lg text-white mb-2">
            코드: <b>{result.code}</b>
          </div>
          <div className="text-lg text-white mb-2">
            금액: {result.amount?.toLocaleString()}원
          </div>
          <div className="text-base" style={{ color: '#A0A0B0' }}>
            유효기간: {result.expiresAt}
          </div>
        </div>
      )}
      
      <div className="mt-10">
        <h3 className="text-lg font-bold mb-3" style={{ color: '#F2A003' }}>내 바우처</h3>
        <div className="flex flex-col gap-2">
          {myVouchers.map(v => (
            <div 
              key={v.code} 
              className="rounded-xl p-4 text-white flex justify-between items-center"
              style={{ 
                background: '#23242A',
                opacity: v.status === "UNUSED" ? 1 : 0.5
              }}
            >
              <div>
                <div className="text-base font-bold">{v.code}</div>
                <div className="text-sm" style={{ color: '#F2A003' }}>
                  금액: {v.amount} ETH
                </div>
                <div className="text-xs" style={{ color: '#A0A0B0' }}>
                  유효기간: {v.expiresAt}
                </div>
              </div>
              <div className="text-xs font-bold" style={{ color: '#A0A0B0' }}>
                {v.status === "UNUSED" ? "미사용" : v.status === "USED" ? "사용됨" : "만료"}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <TabBar />
    </div>
  );
}