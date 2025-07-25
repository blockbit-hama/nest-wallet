import { useQuery } from '@tanstack/react-query';
import { getCryptoPrice, getChangeColor, formatPrice, formatChangePercentage } from '@/lib/api/crypto-price';
import { getBlockchainBalance } from '@/lib/api/blockchain-balance';

// 지갑 잔액 정보 타입
interface WalletBalance {
  address: string;
  symbol: string;
  balance: string;
  usdValue: string;
  price: string;
  change: string;
  changeColor: string;
}

// 지갑 잔액 조회 hook
export const useWalletBalance = (address: string, symbol: string) => {
  return useQuery({
    queryKey: ['walletBalance', address, symbol],
    queryFn: async (): Promise<WalletBalance> => {
      // 실제 블록체인 잔액과 암호화폐 가격 API 호출
      const [blockchainBalance, cryptoPrice] = await Promise.all([
        getBlockchainBalance(address, symbol),
        getCryptoPrice(symbol)
      ]);
      
      // 기본값 설정
      let balance = '0.00000';
      let price = 0;
      let priceChange = 0;
      
      // 블록체인 잔액이 있으면 사용
      if (blockchainBalance) {
        balance = blockchainBalance.balance;
      }
      
      // 암호화폐 가격이 있으면 사용
      if (cryptoPrice) {
        price = cryptoPrice.price;
        priceChange = cryptoPrice.priceChangePercentage24h;
      }
      
      // USD 가치 계산
      const balanceNum = parseFloat(balance);
      const usdValue = balanceNum * price;

      return {
        address,
        symbol,
        balance,
        usdValue: `$${usdValue.toFixed(2)}`,
        price: price > 0 ? formatPrice(price) : '$0.00',
        change: price > 0 ? formatChangePercentage(priceChange) : '0.00%',
        changeColor: price > 0 ? getChangeColor(priceChange) : '#A0A0B0'
      };
    },
    staleTime: 30000, // 30초
    enabled: !!address && !!symbol,
  });
};

// 여러 지갑 잔액 조회 hook
export const useWalletBalances = (addresses: { address: string; symbol: string }[]) => {
  return useQuery({
    queryKey: ['walletBalances', addresses],
    queryFn: async (): Promise<WalletBalance[]> => {
      // 고유한 심볼들 추출
      const uniqueSymbols = Array.from(new Set(addresses.map(addr => addr.symbol)));
      
      // 실제 블록체인 잔액과 암호화폐 가격 API 호출
      const [blockchainBalances, cryptoPrices] = await Promise.all([
        Promise.all(addresses.map(({ address, symbol }) => getBlockchainBalance(address, symbol))),
        Promise.all(uniqueSymbols.map(symbol => getCryptoPrice(symbol)))
      ]);

      // 심볼별 가격 매핑
      const priceMap = new Map();
      cryptoPrices.forEach((price, index) => {
        if (price) {
          priceMap.set(uniqueSymbols[index], price);
        }
      });

      return addresses.map(({ address, symbol }, index) => {
        const blockchainBalance = blockchainBalances[index];
        const cryptoPrice = priceMap.get(symbol);
        
        // 기본값 설정
        let balance = '0.00000';
        let price = 0;
        let priceChange = 0;
        
        // 블록체인 잔액이 있으면 사용
        if (blockchainBalance) {
          balance = blockchainBalance.balance;
        }
        
        // 암호화폐 가격이 있으면 사용
        if (cryptoPrice) {
          price = cryptoPrice.price;
          priceChange = cryptoPrice.priceChangePercentage24h;
        }
        
        // USD 가치 계산
        const balanceNum = parseFloat(balance);
        const usdValue = balanceNum * price;

        return {
          address,
          symbol,
          balance,
          usdValue: `$${usdValue.toFixed(2)}`,
          price: price > 0 ? formatPrice(price) : '$0.00',
          change: price > 0 ? formatChangePercentage(priceChange) : '0.00%',
          changeColor: price > 0 ? getChangeColor(priceChange) : '#A0A0B0'
        };
      });
    },
    staleTime: 30000, // 30초
    enabled: addresses.length > 0,
  });
}; 