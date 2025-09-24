"use client";
import { useState, useEffect } from "react";
import { TabBar } from "../../components/molecules/TabBar";
import { getCouponsByMasterAddress, GetCouponsResponse, createVoucher, CreateVoucherRequest, registerCoupon } from '@/lib/api/voucher';
import { useMasterAddress } from '../../hooks/wallet/useMasterAddress';
import { cn } from '@/lib/utils/utils';

export default function CouponSwapPage() {
  const { masterAddress, signMessageForCouponAuth } = useMasterAddress();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [couponList, setCouponList] = useState<GetCouponsResponse | null>(null);
  
  // 바우처 생성 상태
  const [isCreatingVoucher, setIsCreatingVoucher] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createVoucherData, setCreateVoucherData] = useState<CreateVoucherRequest>({
    code: '',
    amount: 0,
    fiatCode: 'USD',
    status: 'ISSUED',
    expireDate: '',
    couponExpireDate: '',
  });

  // 바우처 교환 상태
  const [voucherCode, setVoucherCode] = useState("");
  const [isExchanging, setIsExchanging] = useState(false);

  useEffect(() => {
    if (masterAddress) {
      loadCoupons();
    }
  }, [masterAddress]);

  const loadCoupons = async () => {
    if (!masterAddress) return;
    
    try {
      console.log('쿠폰 목록 로드 시작, masterAddress:', masterAddress);
      const response = await getCouponsByMasterAddress(masterAddress);
      console.log('쿠폰 목록 응답:', response);
      
      if (response.success && response.data) {
        setCouponList(response.data);
      } else {
        console.error('쿠폰 목록 로드 실패:', response.message);
      }
    } catch (error) {
      console.error('쿠폰 목록 로드 실패:', error);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createVoucherData.code.trim()) {
      setError('바우처 코드를 입력해주세요.');
      return;
    }

    if (createVoucherData.amount <= 0) {
      setError('바우처 금액은 0보다 커야 합니다.');
      return;
    }

    if (!createVoucherData.expireDate) {
      setError('바우처 만료일을 입력해주세요.');
      return;
    }

    if (!createVoucherData.couponExpireDate) {
      setError('쿠폰 만료일을 입력해주세요.');
      return;
    }

    setIsCreatingVoucher(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await createVoucher(createVoucherData);

      if (response.success) {
        setSuccess(response.message);
        setCreateVoucherData({
          code: '',
          amount: 0,
          fiatCode: 'USD',
          status: 'ISSUED',
          expireDate: '',
          couponExpireDate: '',
        });
        setShowCreateForm(false);
      } else {
        setError(response.message || '바우처 생성에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '바우처 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreatingVoucher(false);
    }
  };

  const handleCreateVoucherChange = (field: keyof CreateVoucherRequest, value: any) => {
    setCreateVoucherData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExchangeVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!voucherCode.trim()) {
      setError('바우처 코드를 입력해주세요.');
      return;
    }

    if (!masterAddress) {
      setError('지갑이 연결되지 않았습니다.');
      return;
    }

    setIsExchanging(true);
    setError(null);
    setSuccess(null);

    try {
      // 실제 서명 함수 사용 (useMasterAddress 훅에서 제공)
      const response = await registerCoupon(masterAddress, voucherCode, signMessageForCouponAuth);

      if (response.success) {
        setSuccess(response.message);
        setVoucherCode('');
        
        // 쿠폰 목록 새로고침
        await loadCoupons();
      } else {
        setError(response.message || '바우처 교환에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '바우처 교환 중 오류가 발생했습니다.');
    } finally {
      setIsExchanging(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen relative" style={{ background: '#14151A' }}>
      <h2 className="text-3xl font-extrabold mb-6" style={{ color: '#F2A003' }}>
        Coupon Swap
      </h2>

      {/* 바우처 추가/생성 영역 */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: '#23242A' }}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold" style={{ color: '#F2A003' }}>
            바우처 추가
          </h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer"
            style={{ 
              background: showCreateForm ? '#EB5757' : '#F2A003',
              color: '#14151A'
            }}
          >
            {showCreateForm ? "닫기" : "새 바우처 추가"}
          </button>
        </div>
        
        {showCreateForm && (
          <form onSubmit={handleCreateVoucher} className="space-y-3">
            <input
              type="text"
              value={createVoucherData.code}
              onChange={e => handleCreateVoucherChange('code', e.target.value)}
              placeholder="바우처 코드 (예: V-TEST-USD-100)"
              className="w-full px-4 py-3 rounded-lg border text-white text-base outline-none transition-all duration-200 focus:border-orange-400"
              style={{ 
                borderColor: '#23242A',
                background: '#181920',
                borderWidth: '1.5px'
              }}
              disabled={isCreatingVoucher}
            />
            
            <input
              type="number"
              value={createVoucherData.amount}
              onChange={e => handleCreateVoucherChange('amount', parseFloat(e.target.value) || 0)}
              placeholder="바우처 금액"
              className="w-full px-4 py-3 rounded-lg border text-white text-base outline-none transition-all duration-200 focus:border-orange-400"
              style={{ 
                borderColor: '#23242A',
                background: '#181920',
                borderWidth: '1.5px'
              }}
              disabled={isCreatingVoucher}
            />
            
            <select
              value={createVoucherData.fiatCode}
              onChange={e => handleCreateVoucherChange('fiatCode', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border text-white text-base outline-none transition-all duration-200 focus:border-orange-400"
              style={{ 
                borderColor: '#23242A',
                background: '#181920',
                borderWidth: '1.5px'
              }}
              disabled={isCreatingVoucher}
            >
              <option value="USD">USD</option>
              <option value="KRW">KRW</option>
              <option value="EUR">EUR</option>
              <option value="JPY">JPY</option>
            </select>
            
            <input
              type="datetime-local"
              value={createVoucherData.expireDate}
              onChange={e => handleCreateVoucherChange('expireDate', e.target.value)}
              placeholder="바우처 만료일"
              className="w-full px-4 py-3 rounded-lg border text-white text-base outline-none transition-all duration-200 focus:border-orange-400"
              style={{ 
                borderColor: '#23242A',
                background: '#181920',
                borderWidth: '1.5px'
              }}
              disabled={isCreatingVoucher}
            />
            
            <input
              type="datetime-local"
              value={createVoucherData.couponExpireDate}
              onChange={e => handleCreateVoucherChange('couponExpireDate', e.target.value)}
              placeholder="쿠폰 만료일"
              className="w-full px-4 py-3 rounded-lg border text-white text-base outline-none transition-all duration-200 focus:border-orange-400"
              style={{ 
                borderColor: '#23242A',
                background: '#181920',
                borderWidth: '1.5px'
              }}
              disabled={isCreatingVoucher}
            />
            
            <input
              type="number"
              value={createVoucherData.maxTotalCoupons || ''}
              onChange={e => handleCreateVoucherChange('maxTotalCoupons', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="최대 총 쿠폰 발행 수 (선택사항)"
              className="w-full px-4 py-3 rounded-lg border text-white text-base outline-none transition-all duration-200 focus:border-orange-400"
              style={{ 
                borderColor: '#23242A',
                background: '#181920',
                borderWidth: '1.5px'
              }}
              disabled={isCreatingVoucher}
            />
            
            <button
              type="submit"
              disabled={isCreatingVoucher}
              className="w-full py-3 border-0 rounded-lg text-base font-bold cursor-pointer transition-opacity duration-200 disabled:opacity-50"
              style={{ 
                background: '#F2A003',
                color: '#14151A',
                opacity: isCreatingVoucher ? 0.5 : 1
              }}
            >
              {isCreatingVoucher ? "추가 중..." : "바우처 추가하기"}
            </button>
          </form>
        )}
      </div>

      {/* 에러 및 성공 메시지 */}
      {error && (
        <div className="text-sm my-3 text-center p-2 rounded-lg"
             style={{ 
               color: '#EB5757',
               background: 'rgba(235, 87, 87, 0.1)'
             }}>
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg p-4 text-white text-center my-3"
             style={{ background: '#181920' }}>
          <div className="text-base font-bold mb-1" style={{ color: '#F2A003' }}>
            성공!
          </div>
          <div className="text-sm">
            {success}
          </div>
        </div>
      )}

      {/* 바우처 교환 영역 */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-3" style={{ color: '#F2A003' }}>
          바우처 교환
        </h3>
        
        <div className="rounded-2xl p-5" style={{ background: '#23242A' }}>
          <form onSubmit={handleExchangeVoucher}>
            <input
              type="text"
              value={voucherCode}
              onChange={e => setVoucherCode(e.target.value)}
              placeholder="바우처 코드를 입력하세요 (예: V-DEV-VOUCHER-USD-1)"
              className="w-full px-4 py-3 rounded-lg border text-white text-base mb-3 outline-none transition-all duration-200 focus:border-orange-400"
              style={{ 
                borderColor: '#23242A',
                background: '#181920',
                borderWidth: '1.5px'
              }}
              disabled={isExchanging}
            />
            <button
              type="submit"
              disabled={!voucherCode || isExchanging}
              className="w-full py-3 border-0 rounded-lg text-base font-bold cursor-pointer transition-opacity duration-200 disabled:opacity-50"
              style={{ 
                background: '#F2A003',
                color: '#14151A',
                opacity: !voucherCode || isExchanging ? 0.5 : 1
              }}
            >
              {isExchanging ? "교환 중..." : "교환하기"}
            </button>
          </form>
        </div>
      </div>

      {/* 내 쿠폰 영역 */}
      <div className="mt-10">
        <h3 className="text-lg font-bold mb-3" style={{ color: '#F2A003' }}>
          내 쿠폰
        </h3>
        <div className="flex flex-col gap-2">
          {!couponList || !couponList.coupons || couponList.coupons.length === 0 ? (
            <div className="rounded-xl p-6 text-white text-center"
                 style={{ background: '#23242A' }}>
              보유한 쿠폰이 없습니다.
            </div>
          ) : (
            couponList.coupons.map((coupon: any) => (
              <div
                key={coupon.code}
                className="rounded-xl p-4 text-white flex justify-between items-center"
                style={{ 
                  background: '#23242A',
                  opacity: coupon.status === 'ACTIVE' ? 1 : 0.5
                }}
              >
                <div>
                  <div className="text-base font-bold">{coupon.code}</div>
                  <div className="text-sm" style={{ color: '#F2A003' }}>
                    잔액: {Number(coupon.amountRemaining || coupon.value || 0).toLocaleString()} {coupon.fiatCode || coupon.currency}
                  </div>
                  <div className="text-xs" style={{ color: '#A0A0B0' }}>
                    유효기간: {new Date(coupon.expireDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-xs font-bold" style={{ color: '#A0A0B0' }}>
                  {coupon.status === 'ACTIVE' ? '활성' : coupon.status === 'EXPIRED' ? '만료' : '사용완료'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TabBar />
    </div>
  );
}