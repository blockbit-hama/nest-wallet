"use client";
import { useState, useEffect } from "react";
import { useMasterAddress } from '../../hooks/wallet/useMasterAddress';
import { useWallet } from '../../hooks/wallet/useWallet';
import { getCouponsByMasterAddress } from "../../lib/api/voucher";
import { getExchangeRate, normalizeCurrencyId } from "../../lib/api/exchange-rate";
import { cn } from '@/lib/utils/utils';

interface CouponTransferStep1Props {
  onComplete: (data: any) => void;
}

export function CouponTransferStep1({ onComplete }: CouponTransferStep1Props) {
  const { masterAddress } = useMasterAddress();
  const { walletAddress } = useWallet();
  
  const [senderAddress, setSenderAddress] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [estimatedFee, setEstimatedFee] = useState("");
  const [feeInDollar, setFeeInDollar] = useState("");
  const [opswalletFeeInDollar, setOpswalletFeeInDollar] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("ETHEREUM");
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // walletAddress가 변경될 때마다 senderAddress 자동 설정
  useEffect(() => {
    if (walletAddress) {
      setSenderAddress(walletAddress);
    }
  }, [walletAddress]);

  // 통화 옵션
  const currencyOptions = [
    { value: "ETHEREUM", label: "ETH" },
    { value: "BITCOIN", label: "BTC" },
    { value: "SOLANA", label: "SOL" },
    { value: "TETHER", label: "USDT" },
  ];

  // 이전에 보낸 주소들 (실제로는 로컬 스토리지나 API에서 가져올 데이터)
  const recentAddresses = [
    "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "0x8ba1f109551bD432803012645Hac136c772c3c3",
    "0x1234567890123456789012345678901234567890"
  ];

  // masterAddress가 변경될 때마다 쿠폰 목록 조회
  useEffect(() => {
    if (masterAddress) {
      fetchCoupons();
    }
  }, [masterAddress]);

  // 통화가 변경될 때마다 환율 조회
  useEffect(() => {
    if (selectedCurrency) {
      fetchExchangeRate();
    }
  }, [selectedCurrency]);

  // 예상 수수료가 변경될 때마다 달러 금액 계산
  useEffect(() => {
    if (estimatedFee && exchangeRate) {
      calculateFeeInDollar();
    }
  }, [estimatedFee, exchangeRate]);

  const fetchCoupons = async () => {
    if (!masterAddress) return;
    
    try {
      setLoading(true);
      const response = await getCouponsByMasterAddress(masterAddress);
      setCoupons(response.coupons || []);
    } catch (error) {
      console.error('쿠폰 목록 조회 실패:', error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const normalizedCurrency = normalizeCurrencyId(selectedCurrency);
      const rate = await getExchangeRate(normalizedCurrency);
      setExchangeRate(rate);
    } catch (error) {
      console.error('환율 조회 실패:', error);
      setExchangeRate(1.0);
    }
  };

  const calculateFeeInDollar = async () => {
    if (!estimatedFee || !exchangeRate) return;
    
    try {
      setCalculatingFee(true);
      const fee = parseFloat(estimatedFee);
      const calculatedFee = fee * exchangeRate;
      setFeeInDollar(calculatedFee.toFixed(2));
    } catch (error) {
      console.error('수수료 계산 실패:', error);
    } finally {
      setCalculatingFee(false);
    }
  };

  const selectedCouponObjects = coupons.filter(c => selectedCoupons.includes(c.code));

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!senderAddress.trim()) {
      newErrors.senderAddress = "보내는 주소를 입력해주세요";
    } else if (senderAddress.length < 10) {
      newErrors.senderAddress = "올바른 주소를 입력해주세요";
    }

    if (!recipientAddress.trim()) {
      newErrors.recipientAddress = "받는 주소를 입력해주세요";
    } else if (recipientAddress.length < 10) {
      newErrors.recipientAddress = "올바른 주소를 입력해주세요";
    }

    if (!estimatedFee.trim()) {
      newErrors.estimatedFee = "예상 수수료를 입력해주세요";
    } else if (parseFloat(estimatedFee) < 0) {
      newErrors.estimatedFee = "올바른 수수료를 입력해주세요";
    }

    if (!feeInDollar.trim()) {
      newErrors.feeInDollar = "예상 수수료 달러를 입력해주세요";
    } else if (parseFloat(feeInDollar) < 0) {
      newErrors.feeInDollar = "올바른 달러 금액을 입력해주세요";
    }

    if (!opswalletFeeInDollar.trim()) {
      newErrors.opswalletFeeInDollar = "예상 OpsWallet 달러를 입력해주세요";
    } else if (parseFloat(opswalletFeeInDollar) < 0) {
      newErrors.opswalletFeeInDollar = "올바른 달러 금액을 입력해주세요";
    }

    if (selectedCoupons.length === 0) {
      newErrors.coupons = "쿠폰을 선택해주세요";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCouponToggle = (couponCode: string) => {
    setSelectedCoupons(prev => 
      prev.includes(couponCode) 
        ? prev.filter(c => c !== couponCode)
        : [...prev, couponCode]
    );
  };

  const handleNext = () => {
    if (validateForm()) {
      onComplete({
        senderAddress,
        recipientAddress,
        estimatedFee,
        feeInDollar,
        opswalletFeeInDollar,
        selectedCoupons: selectedCouponObjects,
        fiatCode: selectedCurrency,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* From 주소 (개인지갑 주소) */}
      <div className="flex flex-col gap-4">
        <label className="text-base font-bold mb-2" style={{ color: '#E0DFE4' }}>From 주소</label>
        <input
          className="w-full px-5 py-4 border-2 rounded-xl text-base font-semibold transition-all duration-200 cursor-not-allowed"
          style={{ 
            background: '#1B1C22', 
            borderColor: '#2A2B32',
            color: '#A0A0B0'
          }}
          type="text"
          placeholder="지갑 주소가 자동으로 설정됩니다"
          value={senderAddress}
          readOnly
        />
        {errors.senderAddress && <div className="text-red-500 text-sm font-semibold mt-2">{errors.senderAddress}</div>}
      </div>

      {/* To 주소 */}
      <div className="flex flex-col gap-4">
        <label className="text-base font-bold mb-2" style={{ color: '#E0DFE4' }}>To 주소</label>
        <input
          className="w-full px-5 py-4 border-2 rounded-xl text-base font-semibold transition-all duration-200 focus:outline-none focus:border-orange-400"
          style={{ 
            background: '#23242A', 
            borderColor: '#2A2B32',
            color: '#E0DFE4'
          }}
          type="text"
          placeholder="받는 주소를 입력하세요"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          onFocus={(e) => {
            e.target.style.borderColor = '#F2A003';
            e.target.style.background = '#1B1C22';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#2A2B32';
            e.target.style.background = '#23242A';
          }}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {recentAddresses.map((address, index) => (
            <button
              key={index}
              className="px-4 py-2 border rounded-lg text-sm cursor-pointer transition-all duration-200 mr-2 mb-2 hover:border-orange-400 hover:text-orange-400"
              style={{ 
                background: '#23242A', 
                borderColor: '#2A2B32',
                color: '#A0A0B0'
              }}
              onClick={() => setRecipientAddress(address)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1B1C22';
                e.currentTarget.style.borderColor = '#F2A003';
                e.currentTarget.style.color = '#F2A003';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#23242A';
                e.currentTarget.style.borderColor = '#2A2B32';
                e.currentTarget.style.color = '#A0A0B0';
              }}
            >
              {address.slice(0, 8)}...{address.slice(-6)}
            </button>
          ))}
        </div>
        {errors.recipientAddress && <div className="text-red-500 text-sm font-semibold mt-2">{errors.recipientAddress}</div>}
      </div>

      {/* 예상 수수료 */}
      <div className="flex flex-col gap-4">
        <label className="text-base font-bold mb-2" style={{ color: '#E0DFE4' }}>예상 수수료</label>
        <div className="flex gap-3 items-end">
          <input
            className="w-full px-5 py-4 border-2 rounded-xl text-base font-semibold transition-all duration-200 focus:outline-none focus:border-orange-400"
            style={{ 
              background: '#23242A', 
              borderColor: '#2A2B32',
              color: '#E0DFE4'
            }}
            type="number"
            placeholder="0.00"
            step="0.01"
            value={estimatedFee}
            onChange={(e) => setEstimatedFee(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = '#F2A003';
              e.target.style.background = '#1B1C22';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#2A2B32';
              e.target.style.background = '#23242A';
            }}
          />
          <select
            className="px-5 py-4 border-2 rounded-xl text-base font-semibold min-w-30 cursor-pointer transition-all duration-200 focus:outline-none focus:border-orange-400"
            style={{ 
              background: '#23242A', 
              borderColor: '#2A2B32',
              color: '#E0DFE4'
            }}
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = '#F2A003';
              e.target.style.background = '#1B1C22';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#2A2B32';
              e.target.style.background = '#23242A';
            }}
          >
            {currencyOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {estimatedFee && exchangeRate && (
          <div className="text-sm font-semibold mt-2 text-center" style={{ color: '#F2A003' }}>
            {calculatingFee ? "계산 중..." : `≈ $${(parseFloat(estimatedFee) * exchangeRate).toFixed(2)} USD`}
          </div>
        )}
        {errors.estimatedFee && <div className="text-red-500 text-sm font-semibold mt-2">{errors.estimatedFee}</div>}
      </div>

      {/* 예상 수수료 달러 */}
      <div className="flex flex-col gap-4">
        <label className="text-base font-bold mb-2" style={{ color: '#E0DFE4' }}>예상 수수료 달러</label>
        <input
          className="w-full px-5 py-4 border-2 rounded-xl text-base font-semibold transition-all duration-200 cursor-not-allowed"
          style={{ 
            background: '#1B1C22', 
            borderColor: '#2A2B32',
            color: '#A0A0B0'
          }}
          type="number"
          placeholder="0.00"
          step="0.01"
          value={feeInDollar}
          readOnly
        />
        {errors.feeInDollar && <div className="text-red-500 text-sm font-semibold mt-2">{errors.feeInDollar}</div>}
      </div>

      {/* 예상 OpsWallet 달러 */}
      <div className="flex flex-col gap-4">
        <label className="text-base font-bold mb-2" style={{ color: '#E0DFE4' }}>예상 OpsWallet 달러</label>
        <input
          className="w-full px-5 py-4 border-2 rounded-xl text-base font-semibold transition-all duration-200 focus:outline-none focus:border-orange-400"
          style={{ 
            background: '#23242A', 
            borderColor: '#2A2B32',
            color: '#E0DFE4'
          }}
          type="number"
          placeholder="0.00"
          step="0.01"
          value={opswalletFeeInDollar}
          onChange={(e) => setOpswalletFeeInDollar(e.target.value)}
          onFocus={(e) => {
            e.target.style.borderColor = '#F2A003';
            e.target.style.background = '#1B1C22';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#2A2B32';
            e.target.style.background = '#23242A';
          }}
        />
        {errors.opswalletFeeInDollar && <div className="text-red-500 text-sm font-semibold mt-2">{errors.opswalletFeeInDollar}</div>}
      </div>

      {/* 쿠폰 리스트 */}
      <div className="flex flex-col gap-4">
        <label className="text-base font-bold mb-2" style={{ color: '#E0DFE4' }}>쿠폰 리스트</label>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-base" style={{ color: '#A0A0B0' }}>
            쿠폰 목록을 불러오는 중...
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-base" style={{ color: '#A0A0B0' }}>
            {masterAddress ? "사용 가능한 쿠폰이 없습니다." : "지갑을 선택하면 쿠폰 목록이 표시됩니다."}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {coupons.map((coupon) => (
              <div
                key={coupon.code}
                className={cn(
                  "border-2 rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all duration-200 hover:border-orange-400 hover:-translate-y-1",
                  selectedCoupons.includes(coupon.code) 
                    ? "border-orange-400" 
                    : "border-gray-600"
                )}
                style={{ 
                  background: selectedCoupons.includes(coupon.code) 
                    ? 'linear-gradient(135deg, rgba(242, 160, 3, 0.1) 0%, rgba(242, 160, 3, 0.05) 100%)' 
                    : 'linear-gradient(135deg, #23242A 0%, #1B1C22 100%)',
                  borderColor: selectedCoupons.includes(coupon.code) ? '#F2A003' : '#2A2B32'
                }}
                onClick={() => handleCouponToggle(coupon.code)}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-extrabold"
                     style={{ 
                       background: 'linear-gradient(135deg, #F2A003 0%, #FFB800 100%)',
                       color: '#1B1C22'
                     }}>
                  🎫
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="text-base font-bold" style={{ color: '#E0DFE4' }}>{coupon.code}</div>
                  <div className="text-sm font-semibold" style={{ color: '#F2A003' }}>
                    {coupon.amount} {coupon.fiatCode}
                  </div>
                  <div className="text-xs" style={{ color: '#A0A0B0' }}>
                    유효기간: {new Date(coupon.expireDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {errors.coupons && <div className="text-red-500 text-sm font-semibold mt-2">{errors.coupons}</div>}
      </div>

      {/* 다음 버튼 */}
      <button
        className="w-full py-4 border-0 rounded-xl text-lg font-extrabold cursor-pointer transition-all duration-200 mt-4 hover:-translate-y-1 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        style={{ 
          background: !senderAddress.trim() || !recipientAddress.trim() || !estimatedFee.trim() || !feeInDollar.trim() || !opswalletFeeInDollar.trim() || selectedCoupons.length === 0
            ? '#23242A'
            : 'linear-gradient(135deg, #F2A003 0%, #FFB800 100%)',
          color: !senderAddress.trim() || !recipientAddress.trim() || !estimatedFee.trim() || !feeInDollar.trim() || !opswalletFeeInDollar.trim() || selectedCoupons.length === 0
            ? '#A0A0B0'
            : '#1B1C22',
          boxShadow: !senderAddress.trim() || !recipientAddress.trim() || !estimatedFee.trim() || !feeInDollar.trim() || !opswalletFeeInDollar.trim() || selectedCoupons.length === 0
            ? 'none'
            : '0 8px 24px rgba(242, 160, 3, 0.3)'
        }}
        onClick={handleNext}
        disabled={!senderAddress.trim() || !recipientAddress.trim() || !estimatedFee.trim() || !feeInDollar.trim() || !opswalletFeeInDollar.trim() || selectedCoupons.length === 0}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(242, 160, 3, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        다음
      </button>
    </div>
  );
}