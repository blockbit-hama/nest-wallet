"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SwapProvider {
  id: string;
  name: string;
  token: string;
  volume24h: number;
  lastPrice: number;
  change24h: number;
  logo?: string;
}

export default function SwapPage() {
  const [swapProviders, setSwapProviders] = useState<SwapProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchSwapProviders();
  }, []);

  const fetchSwapProviders = async () => {
    try {
      setIsLoading(true);
      
      // 실제 스왑 API 호출 (예: CoinGecko API 사용)
      const response = await fetch('https://api.coingecko.com/api/v3/exchanges?per_page=5&page=1');
      const data = await response.json();
      
      // API 데이터를 우리 형식으로 변환
      const providers: SwapProvider[] = data.map((exchange: any, index: number) => ({
        id: exchange.id,
        name: exchange.name,
        token: exchange.name,
        volume24h: exchange.trade_volume_24h_btc || 0,
        lastPrice: Math.random() * 0.0001 + 0.000001, // 임시 가격
        change24h: (Math.random() - 0.5) * 10, // 임시 변화율
        logo: exchange.image
      }));
      
      setSwapProviders(providers);
    } catch (error) {
      console.error('스왑 제공자 정보 조회 실패:', error);
      
      // API 실패 시 더미 데이터 사용
      const dummyProviders: SwapProvider[] = [
        {
          id: 'gekko',
          name: 'GEKKO',
          token: 'GEKKO',
          volume24h: 1250000,
          lastPrice: 0.0000011,
          change24h: 1.2
        },
        {
          id: 'uniswap',
          name: 'Uniswap',
          token: 'UNI',
          volume24h: 8900000,
          lastPrice: 0.0000234,
          change24h: -2.1
        },
        {
          id: 'pancakeswap',
          name: 'PancakeSwap',
          token: 'CAKE',
          volume24h: 3400000,
          lastPrice: 0.0000156,
          change24h: 3.4
        },
        {
          id: 'sushiswap',
          name: 'SushiSwap',
          token: 'SUSHI',
          volume24h: 2100000,
          lastPrice: 0.0000089,
          change24h: -0.8
        },
        {
          id: 'curve',
          name: 'Curve',
          token: 'CRV',
          volume24h: 5600000,
          lastPrice: 0.0000321,
          change24h: 2.7
        }
      ];
      
      setSwapProviders(dummyProviders);
    } finally {
      setIsLoading(false);
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(8)}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    const color = change >= 0 ? 'text-green-400' : 'text-red-400';
    return { text: `${sign}${change.toFixed(1)}%`, color };
  };

  return (
    <div className="min-h-screen" style={{ background: '#14151A' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <button 
          onClick={() => router.back()}
          className="text-white text-lg font-semibold"
        >
          ← 뒤로
        </button>
        <h1 className="text-xl font-bold text-white">스왑</h1>
        <div className="w-16"></div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F2A003] mx-auto mb-4"></div>
            <p className="text-white">스왑 정보를 불러오는 중...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 헤더 테이블 */}
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-gray-400">
                <div>토큰/24시간 거래량</div>
                <div className="text-center">마지막체결가</div>
                <div className="text-center">24시간%</div>
                <div className="text-center">액션</div>
              </div>
            </div>

            {/* 스왑 제공자 리스트 */}
            {swapProviders.map((provider) => {
              const changeInfo = formatChange(provider.change24h);
              return (
                <div key={provider.id} className="bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition-colors">
                  <div className="grid grid-cols-4 gap-4 items-center">
                    {/* 토큰/거래량 */}
                    <div className="flex items-center space-x-3">
                      {provider.logo && (
                        <img 
                          src={provider.logo} 
                          alt={provider.name}
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <div className="text-white font-semibold">{provider.name}</div>
                        <div className="text-gray-400 text-sm">{formatVolume(provider.volume24h)}</div>
                      </div>
                    </div>

                    {/* 마지막체결가 */}
                    <div className="text-center">
                      <div className="text-white font-semibold">{formatPrice(provider.lastPrice)}</div>
                    </div>

                    {/* 24시간 변화율 */}
                    <div className="text-center">
                      <div className={`font-semibold ${changeInfo.color}`}>
                        {changeInfo.text}
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="text-center">
                      <button
                        onClick={() => {
                          // 스왑 실행 페이지로 이동
                          console.log(`${provider.name} 스왑 시작`);
                        }}
                        className="px-4 py-2 bg-[#F2A003] text-[#14151A] rounded-lg font-semibold hover:bg-[#E09400] transition-colors"
                      >
                        스왑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 