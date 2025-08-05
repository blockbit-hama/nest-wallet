// 트랜잭션 타입 정의
export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  currency: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
  blockNumber?: string;
  gasUsed?: string;
  gasPrice?: string;
}

// 트랜잭션 조회 파라미터
export interface TransactionQueryParams {
  walletId: string;
  currency?: string;
  limit?: number;
  offset?: number;
}

// 이더리움 트랜잭션 조회 (Etherscan API 사용)
export const getEthereumTransactions = async (
  address: string,
  currency: string = 'ETH'
): Promise<Transaction[]> => {
  try {
    console.log('이더리움 트랜잭션 조회 시작:', address);
    
    // Etherscan API 키 (실제로는 환경변수에서 가져와야 함)
    const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'YourEtherscanApiKey';
    
    // API 키가 기본값이면 다른 방법 시도
    if (ETHERSCAN_API_KEY === 'YourEtherscanApiKey') {
      console.log('Etherscan API 키가 설정되지 않음, 대체 방법 시도');
      return await getEthereumTransactionsAlternative(address, currency);
    }
    
    const ETHERSCAN_URL = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;

    const response = await fetch(ETHERSCAN_URL);
    if (!response.ok) {
      throw new Error('Etherscan API 요청 실패');
    }
    const data = await response.json();
    
    // API 제한 또는 오류 체크
    if (data.status !== '1' || data.message?.includes('No API calls') || data.message?.includes('rate limit')) {
      console.log('Etherscan API 제한 또는 오류:', data.message);
      return await getEthereumTransactionsAlternative(address, currency);
    }
    
    if (!data.result) {
      // 트랜잭션이 없음
      return [];
    }
    
    // Etherscan 트랜잭션 데이터를 Transaction[] 형태로 변환
    const transactions: Transaction[] = data.result.map((tx: any, idx: number) => ({
      id: tx.hash,
      type: tx.to.toLowerCase() === address.toLowerCase() ? 'deposit' : 'withdrawal',
      currency: 'ETH',
      amount: (parseInt(tx.value, 10) / 1e18).toFixed(6),
      fromAddress: tx.from,
      toAddress: tx.to,
      timestamp: new Date(parseInt(tx.timeStamp, 10) * 1000),
      status: parseInt(tx.confirmations, 10) > 0 ? 'completed' : 'pending',
      txHash: tx.hash,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed,
      gasPrice: tx.gasPrice,
    }));
    return transactions;
  } catch (error) {
    console.error('이더리움 트랜잭션 조회 실패:', error);
    return await getEthereumTransactionsAlternative(address, currency);
  }
};

// 대체 이더리움 트랜잭션 조회 방법
const getEthereumTransactionsAlternative = async (
  address: string,
  currency: string = 'ETH'
): Promise<Transaction[]> => {
  try {
    console.log('대체 방법으로 이더리움 트랜잭션 조회 시도');
    
    // 방법 1: Blockscout API (무료, 제한 없음)
    const BLOCKSCOUT_URL = `https://blockscout.com/eth/mainnet/api?module=account&action=txlist&address=${address}&sort=desc`;
    console.log('Blockscout API URL:', BLOCKSCOUT_URL);
    
    const response = await fetch(BLOCKSCOUT_URL);
    console.log('Blockscout API 응답 상태:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Blockscout API 응답 데이터:', data);
      
      if (data.status === '1' && data.result) {
        const transactions: Transaction[] = data.result.map((tx: any) => ({
          id: tx.hash,
          type: tx.to.toLowerCase() === address.toLowerCase() ? 'deposit' : 'withdrawal',
          currency: 'ETH',
          amount: (parseInt(tx.value, 10) / 1e18).toFixed(6),
          fromAddress: tx.from,
          toAddress: tx.to,
          timestamp: new Date(parseInt(tx.timeStamp, 10) * 1000),
          status: parseInt(tx.confirmations, 10) > 0 ? 'completed' : 'pending',
          txHash: tx.hash,
          blockNumber: tx.blockNumber,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
        }));
        console.log('Blockscout API로 트랜잭션 조회 성공:', transactions.length);
        return transactions;
      } else {
        console.log('Blockscout API 응답에 트랜잭션 없음:', data);
      }
    } else {
      console.log('Blockscout API 요청 실패:', response.status, response.statusText);
    }
    
    // 방법 2: Infura API (트랜잭션 개수만 조회 가능)
    console.log('Infura API로 트랜잭션 개수 조회');
    const INFURA_API_KEY = '9aa3d95b3bc440fa88ea12eaa4456161';
    const INFURA_URL = `https://mainnet.infura.io/v3/${INFURA_API_KEY}`;
    
    const infuraResponse = await fetch(INFURA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionCount',
        params: [address, 'latest'],
        id: 1,
      }),
    });
    
    console.log('Infura API 응답 상태:', infuraResponse.status, infuraResponse.statusText);
    
    if (infuraResponse.ok) {
      const infuraData = await infuraResponse.json();
      console.log('Infura API 응답 데이터:', infuraData);
      
      const txCount = parseInt(infuraData.result, 16);
      console.log('Infura API - 트랜잭션 개수:', txCount);
      
      if (txCount > 0) {
        // 트랜잭션이 있지만 상세 내역은 가져올 수 없음
        console.log('트랜잭션이 있지만 상세 내역을 가져올 수 없음');
        return [];
      }
    } else {
      console.log('Infura API 요청 실패:', infuraResponse.status, infuraResponse.statusText);
    }
    
    console.log('모든 API 시도 실패, 빈 배열 반환');
    return [];
  } catch (error) {
    console.error('대체 방법도 실패:', error);
    return [];
  }
};

// 비트코인 트랜잭션 조회 (BlockCypher API 사용)
export const getBitcoinTransactions = async (
  address: string,
  currency: string = 'BTC'
): Promise<Transaction[]> => {
  try {
    // BlockCypher API (무료 티어)
    const BLOCKCYPHER_URL = `https://api.blockcypher.com/v1/btc/main/addrs/${address}`;
    
    const response = await fetch(BLOCKCYPHER_URL);
    
    if (!response.ok) {
      throw new Error('BlockCypher API 요청 실패');
    }

    const data = await response.json();
    
    // 실제 트랜잭션 데이터를 Transaction 형식으로 변환
    const transactions: Transaction[] = [];
    
    if (data.txs) {
      data.txs.forEach((tx: any, index: number) => {
        // 입금 트랜잭션
        if (tx.outputs && tx.outputs.some((output: any) => output.addresses.includes(address))) {
          const output = tx.outputs.find((output: any) => output.addresses.includes(address));
          transactions.push({
            id: `btc-deposit-${index}`,
            type: 'deposit',
            currency: 'BTC',
            amount: (output.value / 100000000).toFixed(8), // satoshi to BTC
            fromAddress: 'Unknown',
            toAddress: address,
            timestamp: new Date(tx.received * 1000),
            status: tx.confirmations > 0 ? 'completed' : 'pending',
            txHash: tx.hash,
            blockNumber: tx.block_height,
          });
        }
        
        // 출금 트랜잭션
        if (tx.inputs && tx.inputs.some((input: any) => input.addresses.includes(address))) {
          const input = tx.inputs.find((input: any) => input.addresses.includes(address));
          transactions.push({
            id: `btc-withdrawal-${index}`,
            type: 'withdrawal',
            currency: 'BTC',
            amount: (input.output_value / 100000000).toFixed(8), // satoshi to BTC
            fromAddress: address,
            toAddress: 'Unknown',
            timestamp: new Date(tx.received * 1000),
            status: tx.confirmations > 0 ? 'completed' : 'pending',
            txHash: tx.hash,
            blockNumber: tx.block_height,
          });
        }
      });
    }
    
    return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    console.error('비트코인 트랜잭션 조회 실패:', error);
    return generateMockTransactionsForAddress(address, currency);
  }
};

// 폴리곤 트랜잭션 조회
export const getPolygonTransactions = async (
  address: string,
  currency: string = 'MATIC'
): Promise<Transaction[]> => {
  try {
    // Polygon API (Alchemy 또는 Infura 사용)
    const POLYGON_API_KEY = '9aa3d95b3bc440fa88ea12eaa4456161';
    const POLYGON_URL = `https://polygon-mainnet.infura.io/v3/${POLYGON_API_KEY}`;
    
    // 실제 구현에서는 Polygon API를 통해 트랜잭션 히스토리를 가져와야 함
    return generateMockTransactionsForAddress(address, currency);
  } catch (error) {
    console.error('폴리곤 트랜잭션 조회 실패:', error);
    return generateMockTransactionsForAddress(address, currency);
  }
};

// 바이낸스 스마트 체인 트랜잭션 조회
export const getBSCTransactions = async (
  address: string,
  currency: string = 'BSC'
): Promise<Transaction[]> => {
  try {
    // BSC API (BSCScan API 사용)
    const BSCSCAN_API_KEY = 'YourBSCScanAPIKey'; // 실제 API 키 필요
    const BSCSCAN_URL = `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&apikey=${BSCSCAN_API_KEY}`;
    
    // 실제 구현에서는 BSCScan API를 통해 트랜잭션 히스토리를 가져와야 함
    return generateMockTransactionsForAddress(address, currency);
  } catch (error) {
    console.error('BSC 트랜잭션 조회 실패:', error);
    return generateMockTransactionsForAddress(address, currency);
  }
};

// 아발란체 트랜잭션 조회
export const getAvalancheTransactions = async (
  address: string,
  currency: string = 'AVAX'
): Promise<Transaction[]> => {
  try {
    // Avalanche API (Snowtrace API 사용)
    const SNOWTRACE_API_KEY = 'YourSnowtraceAPIKey'; // 실제 API 키 필요
    const SNOWTRACE_URL = `https://api.snowtrace.io/api?module=account&action=txlist&address=${address}&apikey=${SNOWTRACE_API_KEY}`;
    
    // 실제 구현에서는 Snowtrace API를 통해 트랜잭션 히스토리를 가져와야 함
    return generateMockTransactionsForAddress(address, currency);
  } catch (error) {
    console.error('Avalanche 트랜잭션 조회 실패:', error);
    return generateMockTransactionsForAddress(address, currency);
  }
};

// 통합 트랜잭션 조회 함수
export const getTransactions = async (
  walletId: string,
  currency?: string,
  limit: number = 50,
  wallet?: any
): Promise<Transaction[]> => {
  try {
    console.log('getTransactions 호출:', { walletId, currency, limit });
    
    // 지갑 정보 가져오기 (직접 전달된 wallet이 있으면 사용, 없으면 localStorage에서 조회)
    let targetWallet = wallet;
    
    if (!targetWallet) {
      const walletsJson = localStorage.getItem('wallets');
      console.log('localStorage에서 가져온 wallets JSON:', walletsJson);
      
      const wallets = JSON.parse(walletsJson || '[]');
      console.log('파싱된 wallets 배열:', wallets);
      console.log('wallets 배열 길이:', wallets.length);
      
      targetWallet = wallets.find((w: any) => w.id === walletId);
      console.log('찾으려는 walletId:', walletId);
      console.log('찾은 지갑:', targetWallet);
    } else {
      console.log('직접 전달된 지갑 정보 사용:', targetWallet);
    }
    
    if (!targetWallet) {
      console.error('지갑을 찾을 수 없습니다:', walletId);
      if (!wallet) {
        console.log('사용 가능한 지갑 ID들:', JSON.parse(localStorage.getItem('wallets') || '[]').map((w: any) => w.id));
      }
      throw new Error('지갑을 찾을 수 없습니다.');
    }

    console.log('찾은 지갑 정보:', {
      id: targetWallet.id,
      name: targetWallet.name,
      addresses: targetWallet.addresses
    });

    const allTransactions: Transaction[] = [];
    
    // 특정 통화만 조회
    if (currency) {
      const address = targetWallet.addresses[currency];
      console.log(`${currency} 주소:`, address);
      
      if (address) {
        let transactions: Transaction[] = [];
        
        switch (currency) {
          case 'BTC':
            console.log('비트코인 트랜잭션 조회 시작');
            transactions = await getBitcoinTransactions(address, currency);
            break;
          case 'ETH':
            console.log('이더리움 트랜잭션 조회 시작');
            transactions = await getEthereumTransactions(address, currency);
            break;
          case 'MATIC':
            console.log('폴리곤 트랜잭션 조회 시작');
            transactions = await getPolygonTransactions(address, currency);
            break;
          case 'BSC':
            console.log('BSC 트랜잭션 조회 시작');
            transactions = await getBSCTransactions(address, currency);
            break;
          case 'AVAX':
            console.log('아발란체 트랜잭션 조회 시작');
            transactions = await getAvalancheTransactions(address, currency);
            break;
          default:
            console.log('기본 목업 트랜잭션 생성');
            transactions = generateMockTransactionsForAddress(address, currency);
        }
        
        console.log(`${currency} 트랜잭션 수:`, transactions.length);
        allTransactions.push(...transactions);
      } else {
        console.log(`${currency} 주소가 없음`);
      }
    } else {
      // 모든 통화 조회
      console.log('모든 통화 트랜잭션 조회 시작');
      const currencies = ['BTC', 'ETH', 'MATIC', 'BSC', 'AVAX'];
      
      for (const curr of currencies) {
        const address = targetWallet.addresses[curr];
        console.log(`${curr} 주소:`, address);
        
        if (address) {
          let transactions: Transaction[] = [];
          
          switch (curr) {
            case 'BTC':
              transactions = await getBitcoinTransactions(address, curr);
              break;
            case 'ETH':
              transactions = await getEthereumTransactions(address, curr);
              break;
            case 'MATIC':
              transactions = await getPolygonTransactions(address, curr);
              break;
            case 'BSC':
              transactions = await getBSCTransactions(address, curr);
              break;
            case 'AVAX':
              transactions = await getAvalancheTransactions(address, curr);
              break;
          }
          
          console.log(`${curr} 트랜잭션 수:`, transactions.length);
          allTransactions.push(...transactions);
        }
      }
    }
    
    console.log('전체 트랜잭션 수:', allTransactions.length);
    
    // 최신 순으로 정렬하고 limit 적용
    const sortedTransactions = allTransactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    
    console.log('최종 반환 트랜잭션 수:', sortedTransactions.length);
    return sortedTransactions;
  } catch (error) {
    console.error('트랜잭션 조회 실패:', error);
    return [];
  }
};

// 목업 트랜잭션 생성 (임시용)
const generateMockTransactionsForAddress = (address: string, currency: string): Transaction[] => {
  const transactions: Transaction[] = [];
  
  // 최근 30일 내의 랜덤 트랜잭션 생성
  for (let i = 0; i < 10; i++) {
    const isDeposit = Math.random() > 0.5;
    const amount = (Math.random() * 10).toFixed(4);
    const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const status = Math.random() > 0.1 ? 'completed' : 'pending';
    
    transactions.push({
      id: `${currency.toLowerCase()}-${isDeposit ? 'deposit' : 'withdrawal'}-${i}`,
      type: isDeposit ? 'deposit' : 'withdrawal',
      currency,
      amount,
      fromAddress: isDeposit ? `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 10)}` : address,
      toAddress: isDeposit ? address : `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 10)}`,
      timestamp,
      status,
      txHash: `0x${Math.random().toString(16).substring(2, 34)}`,
      blockNumber: Math.floor(Math.random() * 1000000),
      gasUsed: Math.floor(Math.random() * 100000).toString(),
      gasPrice: Math.floor(Math.random() * 50).toString(),
    });
  }
  
  return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}; 

// 테스트용: 알려진 이더리움 주소로 API 테스트
export const testEthereumAPI = async (): Promise<void> => {
  // 사용자가 제공한 실제 주소 (트랜잭션 3개 있음)
  const testAddress = '0xa4cff6e802abda3302b978d1bd4264d08e613fa0';
  console.log('=== 이더리움 API 테스트 시작 ===');
  console.log('테스트 주소:', testAddress);
  
  try {
    const transactions = await getEthereumTransactions(testAddress, 'ETH');
    console.log('테스트 결과 - 트랜잭션 수:', transactions.length);
    if (transactions.length > 0) {
      console.log('첫 번째 트랜잭션:', transactions[0]);
      console.log('모든 트랜잭션:', transactions);
    } else {
      console.log('트랜잭션이 조회되지 않음');
    }
  } catch (error) {
    console.error('테스트 실패:', error);
  }
  
  console.log('=== 이더리움 API 테스트 완료 ===');
}; 