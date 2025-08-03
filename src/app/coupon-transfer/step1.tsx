"use client";
import { useState, useEffect } from "react";
import { useMasterAddress } from "../../hooks/wallet/useMasterAddress";
import { getCouponsByMasterAddress } from "../../lib/api/voucher";
import { getExchangeRate, normalizeCurrencyId } from "../../lib/api/exchange-rate";
import { cn } from '@/lib/utils/utils';
import { useWalletList } from "../../hooks/useWalletAtoms";
import { getFeeEstimate, estimateTransactionFee, TransactionGasEstimate, estimateSolanaFee, simulateSolanaTransaction, SolanaTransactionEstimate } from "../../lib/api/fee-estimate";

interface CouponTransferStep1Props {
  onComplete: (data: any) => void;
}

export function CouponTransferStep1({ onComplete }: CouponTransferStep1Props) {
  const { masterAddress } = useMasterAddress();
  
  const [selectedFromAddress, setSelectedFromAddress] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
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
  const [transferMode, setTransferMode] = useState<'coupon' | 'direct'>('coupon');
  const [transferAmountInDollar, setTransferAmountInDollar] = useState<string>("");

  // 새로운 atoms hooks 사용
  const { selectedWallet } = useWalletList();

  // 현재 선택된 지갑의 주소들
  const availableAddresses = selectedWallet ? [
    { key: "ETH", label: "ETH (메인넷)", address: selectedWallet.addresses.ETH },
    { key: "ETH_1", label: "ETH (두번째 주소)", address: selectedWallet.addresses.ETH_1 },
    { key: "ETH_2", label: "ETH (세번째 주소)", address: selectedWallet.addresses.ETH_2 },
    { key: "BTC", label: "BTC", address: selectedWallet.addresses.BTC },
    { key: "MATIC", label: "MATIC (Polygon)", address: selectedWallet.addresses.MATIC },
    { key: "BSC", label: "BSC", address: selectedWallet.addresses.BSC },
    { key: "AVAX", label: "AVAX", address: selectedWallet.addresses.AVAX },
    { key: "SOL", label: "SOL (Solana)", address: selectedWallet.addresses.SOL },
  ].filter(addr => addr.address) : [];

  // 선택된 주소가 변경될 때 통화 자동 설정
  useEffect(() => {
    if (selectedFromAddress) {
      if (selectedFromAddress.includes('ETH')) {
        setSelectedCurrency("ETHEREUM");
      } else if (selectedFromAddress === 'BTC') {
        setSelectedCurrency("BITCOIN");
      } else if (selectedFromAddress === 'MATIC') {
        setSelectedCurrency("MATIC");
      } else if (selectedFromAddress === 'BSC') {
        setSelectedCurrency("BSC");
      } else if (selectedFromAddress === 'AVAX') {
        setSelectedCurrency("AVAX");
      } else if (selectedFromAddress === 'SOL') {
        setSelectedCurrency("SOLANA");
      }
    }
  }, [selectedFromAddress]);

  // 통화가 변경될 때마다 환율 조회 및 수수료 자동 조회
  useEffect(() => {
    if (selectedCurrency) {
      fetchExchangeRate();
      fetchFeeEstimate(); // 수수료 자동 조회
    }
  }, [selectedCurrency]);

  // 받는 주소나 전송 금액이 변경될 때 수수료 재계산
  useEffect(() => {
    if (selectedCurrency && recipientAddress.trim() && selectedFromAddress) {
      // 약간의 지연을 두어 연속 입력을 방지
      const timeoutId = setTimeout(() => {
        fetchFeeEstimate();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [recipientAddress, transferAmount, selectedFromAddress]);

  // masterAddress가 변경될 때마다 쿠폰 목록 조회
  useEffect(() => {
    if (masterAddress) {
      fetchCoupons();
    }
  }, [masterAddress]);

  // 통화 옵션
  const currencyOptions = [
    { value: "ETHEREUM", label: "ETH" },
    { value: "BITCOIN", label: "BTC" },
    { value: "MATIC", label: "MATIC" },
    { value: "BSC", label: "BSC" },
    { value: "AVAX", label: "AVAX" },
    { value: "SOLANA", label: "SOL" },
    { value: "TETHER", label: "USDT" },
  ];

  // 이전에 보낸 주소들
  const recentAddresses = [
    "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "0x8ba1f109551bD432803012645Hac136c772c3c3",
    "0x1234567890123456789012345678901234567890"
  ];

  // 예상 수수료가 변경될 때마다 달러 금액 계산
  useEffect(() => {
    if (estimatedFee && exchangeRate) {
      calculateFeeInDollar();
    }
  }, [estimatedFee, exchangeRate]);

  // 쿠폰 선택 여부에 따라 전송 모드 변경
  useEffect(() => {
    if (selectedCoupons.length > 0) {
      setTransferMode('coupon');
    } else {
      setTransferMode('direct');
    }
  }, [selectedCoupons]);

  // 전송 금액이 변경될 때 달러 환산액 계산
  useEffect(() => {
    console.log('달러 환산액 계산 useEffect 실행');
    console.log('transferAmount:', transferAmount);
    console.log('exchangeRate:', exchangeRate);
    
    if (transferAmount && exchangeRate) {
      const amount = parseFloat(transferAmount);
      console.log('파싱된 금액:', amount);
      if (!isNaN(amount)) {
        const dollarAmount = amount * exchangeRate;
        console.log('계산된 달러 금액:', dollarAmount);
        setTransferAmountInDollar(dollarAmount.toFixed(2));
      } else {
        console.log('유효하지 않은 금액');
        setTransferAmountInDollar("");
      }
    } else {
      console.log('transferAmount 또는 exchangeRate가 없음');
      setTransferAmountInDollar("");
    }
  }, [transferAmount, exchangeRate]);

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
      console.log('환율 조회 시작, 통화:', selectedCurrency);
      const normalizedCurrency = normalizeCurrencyId(selectedCurrency);
      console.log('정규화된 통화 ID:', normalizedCurrency);
      const rate = await getExchangeRate(normalizedCurrency);
      console.log('조회된 환율:', rate);
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

  const fetchFeeEstimate = async () => {
    try {
      console.log('수수료 자동 조회 시작, 통화:', selectedCurrency);
      
      // 통화에 따라 적절한 심볼과 네트워크 결정
      let symbol = 'ETH';
      let network = 'ethereum';
      
      if (selectedCurrency === 'BITCOIN') {
        symbol = 'BTC';
        network = 'bitcoin';
      } else if (selectedCurrency === 'MATIC') {
        symbol = 'MATIC';
        network = 'polygon';
      } else if (selectedCurrency === 'BSC') {
        symbol = 'BSC';
        network = 'bsc';
      } else if (selectedCurrency === 'AVAX') {
        symbol = 'AVAX';
        network = 'avalanche';
      } else if (selectedCurrency === 'SOLANA') {
        symbol = 'SOL';
        network = 'solana';
      }

      console.log('수수료 조회 심볼:', symbol, '네트워크:', network);

      // 선택된 주소와 받는 주소가 있으면 트랜잭션별 추정
      if (selectedFromAddress && recipientAddress.trim()) {
        const selectedAddress = availableAddresses.find(addr => addr.key === selectedFromAddress);
        
        if (selectedAddress) {
          console.log('트랜잭션별 수수료 추정 시작');
          
          // 솔라나인 경우 별도 처리
          if (network === 'solana') {
            const solanaTransaction: SolanaTransactionEstimate = {
              from: selectedAddress.address,
              to: recipientAddress.trim(),
              amount: transferAmount || '0',
              symbol: symbol,
              network: network,
              transactionType: 'SOL_TRANSFER'
            };

            // 솔라나 트랜잭션 시뮬레이션으로 정확한 수수료 추정
            const solanaFeeEstimate = await simulateSolanaTransaction(solanaTransaction);
            
            if (solanaFeeEstimate) {
              setEstimatedFee(solanaFeeEstimate.feeInSol);
              setFeeInDollar(solanaFeeEstimate.feeInDollar);
              console.log('솔라나 수수료 추정 완료:', solanaFeeEstimate);
              return;
            }
          } else {
            // EVM 기반 블록체인 처리
            const transactionData: TransactionGasEstimate = {
              from: selectedAddress.address,
              to: recipientAddress.trim(),
              value: transferAmount || '0', // 전송 금액이 있으면 사용, 없으면 0
              data: '0x', // 기본 ETH 전송
              symbol: symbol,
              network: network
            };

            const feeEstimate = await estimateTransactionFee(transactionData);
            
            if (feeEstimate) {
              setEstimatedFee(feeEstimate.estimatedFee);
              setFeeInDollar(feeEstimate.feeInDollar);
              console.log('트랜잭션별 수수료 추정 완료:', feeEstimate);
              return;
            }
          }
        }
      }

      // 트랜잭션별 추정이 실패하거나 주소가 없으면 기본 추정 사용
      console.log('기본 수수료 추정 사용');
      const feeEstimate = await getFeeEstimate(symbol);
      
      if (feeEstimate) {
        setEstimatedFee(feeEstimate.estimatedFee);
        setFeeInDollar(feeEstimate.feeInDollar);
        console.log('기본 수수료 추정 완료:', feeEstimate);
      } else {
        console.warn('수수료 조회 실패, 기본값 사용');
        // 기본값 설정
        setEstimatedFee('0.001');
        setFeeInDollar('2.00');
      }
    } catch (error) {
      console.error('수수료 조회 실패:', error);
      // 기본값 설정
      setEstimatedFee('0.001');
      setFeeInDollar('2.00');
    }
  };

  const selectedCouponObjects = coupons.filter(c => selectedCoupons.includes(c.code));

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedFromAddress) {
      newErrors.selectedFromAddress = "보내는 주소를 선택해주세요";
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

    // OpsWallet 수수료는 쿠폰 전송 모드일 때만 검증
    if (transferMode === 'coupon') {
      if (!opswalletFeeInDollar.trim()) {
        newErrors.opswalletFeeInDollar = "예상 OpsWallet 달러를 입력해주세요";
      } else if (parseFloat(opswalletFeeInDollar) < 0) {
        newErrors.opswalletFeeInDollar = "올바른 달러 금액을 입력해주세요";
      }
    }

    // 쿠폰 전송 모드일 때만 쿠폰 선택 필수
    if (transferMode === 'coupon' && selectedCoupons.length === 0) {
      newErrors.coupons = "쿠폰을 선택해주세요";
    }

    // 직접 전송 모드일 때는 전송 금액 필수
    if (transferMode === 'direct' && (!transferAmount.trim() || parseFloat(transferAmount) <= 0)) {
      newErrors.transferAmount = "전송 금액을 입력해주세요";
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
      const selectedAddress = availableAddresses.find(addr => addr.key === selectedFromAddress);
      onComplete({
        senderAddress: selectedAddress?.address || "",
        recipientAddress,
        transferAmount: transferMode === 'direct' ? transferAmount : undefined,
        estimatedFee,
        feeInDollar,
        opswalletFeeInDollar,
        selectedCoupons: selectedCouponObjects,
        fiatCode: selectedCurrency,
        currencyId: selectedCurrency,
        currency: selectedCurrency, // step2에서 기대하는 필드 추가
        transferMode,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 전송 모드 선택 */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-3">전송 방식</h3>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => setTransferMode('coupon')}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg font-semibold transition-all",
              transferMode === 'coupon'
                ? "bg-[#F2A003] text-[#14151A]"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            )}
          >
            쿠폰 전송
          </button>
          <button
            type="button"
            onClick={() => setTransferMode('direct')}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg font-semibold transition-all",
              transferMode === 'direct'
                ? "bg-[#F2A003] text-[#14151A]"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            )}
          >
            직접 전송
          </button>
        </div>
        <p className="text-gray-400 text-sm mt-2">
          {transferMode === 'coupon' 
            ? '쿠폰을 선택하면 쿠폰 서버로 전송됩니다.'
            : '직접 블록체인으로 송금됩니다.'
          }
        </p>
      </div>

      {/* 보내는 주소 선택 */}
      <div className="space-y-3">
        <label className="block text-white font-semibold">보내는 주소</label>
        <select
          value={selectedFromAddress}
          onChange={(e) => setSelectedFromAddress(e.target.value)}
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
        >
          <option value="">주소를 선택하세요</option>
          {availableAddresses.map((addr) => (
            <option key={addr.key} value={addr.key}>
              {addr.label}: {addr.address?.slice(0, 10)}...{addr.address?.slice(-8)}
            </option>
          ))}
        </select>
        {errors.selectedFromAddress && (
          <p className="text-red-400 text-sm">{errors.selectedFromAddress}</p>
        )}
      </div>

      {/* 받는 주소 입력 */}
      <div className="space-y-3">
        <label className="block text-white font-semibold">받는 주소</label>
        <input
          type="text"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          placeholder="0x..."
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
        />
        {errors.recipientAddress && (
          <p className="text-red-400 text-sm">{errors.recipientAddress}</p>
        )}
        
        {/* 최근 주소들 */}
        {recentAddresses.length > 0 && (
          <div className="space-y-2">
            <p className="text-gray-400 text-sm">최근 주소:</p>
            <div className="flex flex-wrap gap-2">
              {recentAddresses.map((address, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setRecipientAddress(address)}
                  className="px-3 py-1 bg-gray-700 text-white text-xs rounded-lg hover:bg-gray-600"
                >
                  {address.slice(0, 8)}...{address.slice(-6)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 직접 전송 모드일 때만 전송 금액 표시 */}
      {transferMode === 'direct' && (
        <div className="space-y-3">
          <label className="block text-white font-semibold">전송 금액</label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
            />
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {/* 달러 환산액 표시 */}
          {transferAmountInDollar && (
            <div className="flex justify-between items-center p-3 bg-gray-800 rounded-xl border border-gray-700">
              <span className="text-gray-400 text-sm">달러 환산액:</span>
              <span className="text-[#F2A003] font-semibold">${transferAmountInDollar}</span>
            </div>
          )}
          {transferAmount && !exchangeRate && (
            <div className="flex justify-between items-center p-3 bg-gray-800 rounded-xl border border-gray-700">
              <span className="text-gray-400 text-sm">달러 환산액:</span>
              <span className="text-gray-500 text-sm">환율 로딩 중...</span>
            </div>
          )}
          {transferAmount && exchangeRate === null && (
            <div className="flex justify-between items-center p-3 bg-gray-800 rounded-xl border border-gray-700">
              <span className="text-gray-400 text-sm">달러 환산액:</span>
              <span className="text-gray-500 text-sm">환율 정보를 가져올 수 없습니다</span>
            </div>
          )}
          {errors.transferAmount && (
            <p className="text-red-400 text-sm">{errors.transferAmount}</p>
          )}
        </div>
      )}

      {/* 쿠폰 선택 (쿠폰 전송 모드일 때만) */}
      {transferMode === 'coupon' && (
        <div className="space-y-3">
          <label className="block text-white font-semibold">쿠폰 선택</label>
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-400">쿠폰 목록을 불러오는 중...</div>
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400">사용 가능한 쿠폰이 없습니다.</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {coupons
                .filter(coupon => coupon.status === 'ACTIVE')
                .map((coupon) => (
                  <div
                    key={coupon.code}
                    className={cn(
                      "p-4 rounded-xl border-2 cursor-pointer transition-all",
                      selectedCoupons.includes(coupon.code)
                        ? "border-[#F2A003] bg-[#F2A003]/10"
                        : "border-gray-700 bg-gray-800"
                    )}
                    onClick={() => handleCouponToggle(coupon.code)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold">{coupon.code}</div>
                        <div className="text-sm text-[#F2A003]">
                          {Number(coupon.amountRemaining || coupon.value || 0).toLocaleString()} {coupon.fiatCode || coupon.currency}
                        </div>
                        <div className="text-xs text-gray-400">
                          만료: {new Date(coupon.expireDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded border-2",
                        selectedCoupons.includes(coupon.code)
                          ? "bg-[#F2A003] border-[#F2A003]"
                          : "border-gray-500"
                      )}>
                        {selectedCoupons.includes(coupon.code) && (
                          <div className="text-white text-xs flex items-center justify-center">✓</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
          {errors.coupons && (
            <p className="text-red-400 text-sm">{errors.coupons}</p>
          )}
        </div>
      )}

      {/* 수수료 설정 */}
      <div className="space-y-4">
        <h3 className="text-white font-semibold">수수료 설정</h3>
        
        <div className="space-y-3">
          <label className="block text-gray-400 text-sm font-semibold">
            예상 수수료
            <span className="text-xs text-gray-500 ml-2">
              (트랜잭션별 정확한 추정)
            </span>
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={estimatedFee}
              onChange={(e) => setEstimatedFee(e.target.value)}
              placeholder="0.001"
              className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
            />
            <button
              type="button"
              onClick={fetchFeeEstimate}
              className="px-4 py-3 bg-[#F2A003] text-[#14151A] rounded-xl font-semibold hover:bg-[#E09400] transition-colors"
            >
              자동
            </button>
          </div>
          <p className="text-xs text-gray-500">
            주소와 금액을 입력하면 실시간으로 정확한 수수료를 계산합니다
          </p>
          {errors.estimatedFee && (
            <p className="text-red-400 text-sm">{errors.estimatedFee}</p>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-gray-400 text-sm font-semibold">수수료 (USD)</label>
          <input
            type="number"
            value={feeInDollar}
            onChange={(e) => setFeeInDollar(e.target.value)}
            placeholder="2.00"
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
            disabled={calculatingFee}
          />
          {calculatingFee && (
            <p className="text-gray-400 text-sm">계산 중...</p>
          )}
          {errors.feeInDollar && (
            <p className="text-red-400 text-sm">{errors.feeInDollar}</p>
          )}
        </div>

        {/* OpsWallet 수수료는 쿠폰 전송 모드일 때만 표시 */}
        {transferMode === 'coupon' && (
          <div className="space-y-3">
            <label className="block text-gray-400 text-sm font-semibold">OpsWallet 수수료 (USD)</label>
            <input
              type="number"
              value={opswalletFeeInDollar}
              onChange={(e) => setOpswalletFeeInDollar(e.target.value)}
              placeholder="1.00"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
            />
            {errors.opswalletFeeInDollar && (
              <p className="text-red-400 text-sm">{errors.opswalletFeeInDollar}</p>
            )}
          </div>
        )}
      </div>

      {/* 전송 모드 정보 */}
      <div className={cn(
        "p-4 rounded-xl border",
        transferMode === 'coupon'
          ? "bg-blue-900/20 border-blue-500/30"
          : "bg-green-900/20 border-green-500/30"
      )}>
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold",
            transferMode === 'coupon' ? "bg-blue-500" : "bg-green-500"
          )}>
            {transferMode === 'coupon' ? '🎫' : '🔗'}
          </div>
          <div>
            <div className="text-white font-semibold">
              {transferMode === 'coupon' ? '쿠폰 서버 전송' : '직접 블록체인 전송'}
            </div>
            <div className="text-gray-400 text-sm">
              {transferMode === 'coupon' 
                ? '선택된 쿠폰을 쿠폰 서버로 전송합니다.'
                : '직접 블록체인으로 송금합니다.'
              }
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleNext}
        className="w-full py-4 bg-[#F2A003] text-[#14151A] rounded-xl font-bold text-lg hover:bg-[#E09400] transition-colors"
      >
        다음
      </button>
    </div>
  );
} 