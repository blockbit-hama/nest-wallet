"use client";
import { useState, useEffect } from "react";
import { TabBar } from "../../components/molecules/TabBar";
import { registerCoupon, getCouponsByMasterAddress, GetCouponsResponse } from '@/lib/api/voucher';
import { useMasterAddress } from '../../hooks/wallet/useMasterAddress';
import { cn } from '@/lib/utils/utils';

export default function CouponSwapPage() {
  const { masterAddress, signMessageForCouponAuth } = useMasterAddress();
  const [voucherCode, setVoucherCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [couponList, setCouponList] = useState<GetCouponsResponse | null>(null);

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
      setCouponList(response);
    } catch (error) {
      console.error('쿠폰 목록 로드 실패:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) {
      setError('바우처 코드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await registerCoupon(
        masterAddress || '', // 마스터 어드레스가 없으면 빈 문자열 전달 (자동 생성됨)
        voucherCode,
        signMessageForCouponAuth
      );

      if (response.success) {
        setSuccess(`쿠폰이 성공적으로 등록되었습니다.`);
        setVoucherCode('');
        
        // 마스터 어드레스가 새로 생성되었을 수 있으므로 다시 로드
        const updatedMasterAddress = localStorage.getItem('masterAddress');
        if (updatedMasterAddress) {
          console.log('업데이트된 마스터 어드레스로 쿠폰 목록 로드:', updatedMasterAddress);
          const couponResponse = await getCouponsByMasterAddress(updatedMasterAddress);
          setCouponList(couponResponse);
        } else {
          // 기존 마스터 어드레스로 다시 로드
          await loadCoupons();
        }
      } else {
        setError(response.message || '쿠폰 등록에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '쿠폰 등록 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen relative" style={{ background: '#14151A' }}>
      <h2 className="text-3xl font-extrabold mb-6" style={{ color: '#F2A003' }}>
        Coupon Swap
      </h2>

      {/* 프로모션/이벤트 영역 */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: '#23242A' }}>
        <h3 className="text-lg font-bold mb-3" style={{ color: '#F2A003' }}>
          이벤트/프로모션
        </h3>
        {/* 추천인 코드 */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="추천인 코드를 입력하세요"
            className="w-3/4 p-2 rounded-lg border text-white text-sm mr-2"
            style={{ 
              borderColor: '#23242A',
              background: '#181920',
              borderWidth: '1.5px'
            }}
          />
          <button className="px-4 py-2 border-0 rounded-lg text-sm font-bold cursor-pointer"
                  style={{ background: '#F2A003', color: '#14151A' }}>
            등록
          </button>
        </div>
        {/* 내 리퍼럴 코드/초대 */}
        <div className="mb-3">
          내 추천코드: <b>REF-1234-ABCD</b>
          <button className="ml-2 px-2 py-1 border rounded-lg text-xs cursor-pointer"
                  style={{ 
                    background: '#23242A',
                    color: '#F2A003',
                    borderColor: '#F2A003'
                  }}>
            복사
          </button>
          <button className="ml-1 px-2 py-1 border-0 rounded-lg text-xs cursor-pointer"
                  style={{ background: '#F2A003', color: '#14151A' }}>
            공유
          </button>
        </div>
        {/* 에어드랍/이벤트 */}
        <div className="mb-3">
          <button className="px-4 py-2 border-0 rounded-lg text-sm font-bold cursor-pointer mr-2"
                  style={{ background: '#F2A003', color: '#14151A' }}>
            에어드랍 대상자 확인
          </button>
          <button className="px-4 py-2 border-0 rounded-lg text-sm font-bold cursor-pointer"
                  style={{ background: '#F2A003', color: '#14151A' }}>
            이벤트 당첨자 조회
          </button>
        </div>
        {/* 광고/이벤트 참여 */}
        <div>
          <button className="px-4 py-2 border rounded-lg text-sm cursor-pointer"
                  style={{ 
                    background: '#23242A',
                    color: '#F2A003',
                    borderColor: '#F2A003'
                  }}>
            광고/이벤트 참여하기
          </button>
        </div>
      </div>

      {/* 바우처 교환 영역 */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-3" style={{ color: '#F2A003' }}>
          바우처 교환
        </h3>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={voucherCode}
            onChange={e => setVoucherCode(e.target.value)}
            placeholder="바우처 코드를 입력하세요 (예: VCHR-20250608-ABCD12)"
            className="w-full px-5 py-4 rounded-2xl border-2 text-white text-lg mb-3 outline-none transition-all duration-200 focus:border-orange-400"
            style={{ 
              borderColor: '#23242A',
              background: '#181920'
            }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!voucherCode || isLoading}
            className="w-full h-14 border-0 rounded-2xl text-xl font-extrabold cursor-pointer transition-opacity duration-200 disabled:opacity-50"
            style={{ 
              background: '#F2A003',
              color: '#14151A',
              opacity: !voucherCode || isLoading ? 0.5 : 1
            }}
          >
            {isLoading ? "교환 중..." : "쿠폰으로 교환하기"}
          </button>

          {error && (
            <div className="text-base my-3 text-center p-3 rounded-lg"
                 style={{ 
                   color: '#EB5757',
                   background: 'rgba(235, 87, 87, 0.1)'
                 }}>
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl p-6 text-white text-center my-3"
                 style={{ background: '#23242A' }}>
              <div className="text-xl font-bold mb-2" style={{ color: '#F2A003' }}>
                쿠폰 발급 완료!
              </div>
              <div className="text-lg mb-1">
                쿠폰 코드: <b>{success.split('쿠폰 코드: ')[1]}</b>
              </div>
            </div>
          )}
        </form>
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