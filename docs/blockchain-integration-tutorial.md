# Nest Wallet 블록체인 통합 튜토리얼

이 문서는 nest-wallet에서 지원하는 다양한 블록체인 코인들이 어떻게 통합되어 사용되는지에 대한 상세한 가이드입니다.

## 📚 목차

1. [지원하는 블록체인 코인](#지원하는-블록체인-코인)
2. [지갑 생성 및 주소 관리](#지갑-생성-및-주소-관리)
3. [코인별 구현 상세](#코인별-구현-상세)
4. [잔액 조회 시스템](#잔액-조회-시스템)
5. [트랜잭션 처리](#트랜잭션-처리)
6. [API 구조](#api-구조)

## 지원하는 블록체인 코인

nest-wallet은 다음과 같은 블록체인 코인들을 지원합니다:

| 코인 | 네트워크 | Derivation Path | 주요 특징 |
|------|----------|----------------|-----------|
| **BTC** | Bitcoin | `m/44'/0'/0'/0/0` | UTXO 기반, P2PKH 주소 |
| **ETH** | Ethereum | `m/44'/60'/0'/0/0` | EVM 호환, 스마트 컨트랙트 |
| **SOL** | Solana | `m/44'/501'/0'/0/0` | ed25519 키, 고성능 |
| **USDT** | Ethereum | `m/44'/60'/1'/0/0` | ERC-20 토큰 |
| **MATIC** | Polygon | `m/44'/60'/2'/0/0` | EVM 호환, Layer 2 |
| **BSC** | Binance Smart Chain | `m/44'/60'/3'/0/0` | EVM 호환 |
| **AVAX** | Avalanche | `m/44'/60'/4'/0/0` | EVM 호환 |

## 지갑 생성 및 주소 관리

### HD Wallet 구조

```typescript
interface WalletInfo {
  id: string;
  name: string;
  masterAddress: string;
  mnemonic: string;
  addresses: {
    BTC?: string;
    ETH?: string;
    ETH_1?: string;  // 추가 ETH 주소들
    ETH_2?: string;
    SOL?: string;
    USDT?: string;
    MATIC?: string;
    BSC?: string;
    AVAX?: string;
  };
  privateKeys?: {
    // addresses와 동일한 구조
  };
  createdAt: string;
}
```

### 지갑 생성 프로세스

1. **니모닉 생성/복구**
   ```typescript
   // 새 지갑 생성
   const mnemonic = generateMnemonic(); // 12개 단어

   // 기존 지갑 복구
   const isValid = validateMnemonic(mnemonic);
   ```

2. **HD Key 생성**
   ```typescript
   const seed = await bip39.mnemonicToSeed(mnemonic);
   const hdkey = HDKey.fromMasterSeed(seed);
   ```

3. **코인별 주소 생성**
   ```typescript
   // BTC 주소 생성
   const btcKey = hdkey.derive(DERIVATION_PATHS.BTC);
   addresses.BTC = generateBitcoinAddress(btcKey.privateKey);

   // ETH 주소 생성
   const ethKey = hdkey.derive(DERIVATION_PATHS.ETH);
   const ethWallet = Wallet.fromPrivateKey(ethKey.privateKey);
   addresses.ETH = ethWallet.getAddressString();

   // SOL 주소 생성 (ed25519)
   const solKey = hdkey.derive(DERIVATION_PATHS.SOL);
   const solData = generateSolanaAddress(solKey.privateKey);
   addresses.SOL = solData.address;
   ```

## 코인별 구현 상세

### Bitcoin (BTC)
- **파생 경로**: `m/44'/0'/0'/0/0`
- **주소 형식**: P2PKH (1로 시작)
- **키 타입**: secp256k1
- **API**: BlockCypher

```typescript
// BTC 주소 생성
const generateBitcoinAddress = (privateKey: Buffer): string => {
  // SHA256 + RIPEMD160 해싱
  // Base58Check 인코딩
  return address;
};

// BTC 잔액 조회
const getBitcoinBalance = async (address: string) => {
  const response = await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`);
  const data = await response.json();
  return data.balance / Math.pow(10, 8); // satoshi to BTC
};
```

### Ethereum (ETH)
- **파생 경로**: `m/44'/60'/0'/0/0`
- **주소 형식**: 0x로 시작하는 40자 hex
- **키 타입**: secp256k1
- **API**: Infura

```typescript
// ETH 주소 생성
const ethKey = hdkey.derive(DERIVATION_PATHS.ETH);
const ethWallet = Wallet.fromPrivateKey(ethKey.privateKey);
const address = ethWallet.getAddressString();

// ETH 잔액 조회
const getEthereumBalance = async (address: string) => {
  const response = await fetch(INFURA_ENDPOINTS.ethereum, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address, 'latest'],
      id: 1,
    }),
  });
};
```

### Solana (SOL)
- **파생 경로**: `m/44'/501'/0'/0/0`
- **주소 형식**: Base58 인코딩
- **키 타입**: ed25519
- **API**: Solana RPC

```typescript
// SOL 주소 생성 (deterministic ed25519)
const generateSolanaAddress = (privateKey: Buffer) => {
  const seed = new Uint8Array(privateKey.slice(0, 32));
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const address = bs58.encode(keyPair.publicKey);
  const privateKeyArray = Array.from(keyPair.secretKey);
  
  return {
    address,
    privateKey: JSON.stringify(privateKeyArray)
  };
};

// SOL 잔액 조회
const getSolanaBalance = async (address: string) => {
  const response = await fetch('https://api.mainnet-beta.solana.com', {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'getBalance',
      params: [address],
      id: 1,
    }),
  });
};
```

### USDT (ERC-20 토큰)
- **파생 경로**: `m/44'/60'/1'/0/0`
- **컨트랙트**: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- **Decimals**: 6

```typescript
// USDT 잔액 조회 (ERC-20)
const getUSDTBalance = async (address: string) => {
  const USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  
  const response = await fetch(INFURA_ENDPOINTS.ethereum, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: USDT_CONTRACT,
        data: `0x70a08231000000000000000000000000${address.slice(2)}`
      }, 'latest'],
      id: 1,
    }),
  });
  
  const balanceHex = data.result;
  const balance = parseInt(balanceHex, 16) / Math.pow(10, 6);
  return balance;
};
```

## 잔액 조회 시스템

### React Query 기반 잔액 관리

```typescript
// hooks/queries/useWalletBalance.ts
export const useWalletBalance = (address: string, symbol: string) => {
  return useQuery({
    queryKey: ['walletBalance', address, symbol],
    queryFn: async (): Promise<WalletBalance> => {
      const [blockchainBalance, cryptoPrice] = await Promise.all([
        getBlockchainBalance(address, symbol),
        getCryptoPrice(symbol)
      ]);
      
      const balanceNum = parseFloat(blockchainBalance.balance);
      const usdValue = balanceNum * cryptoPrice.price;
      
      return {
        address,
        symbol,
        balance: blockchainBalance.balance,
        usdValue: `$${usdValue.toFixed(2)}`,
        price: formatPrice(cryptoPrice.price),
        change: formatChangePercentage(cryptoPrice.priceChangePercentage24h),
        changeColor: getChangeColor(cryptoPrice.priceChangePercentage24h)
      };
    },
    staleTime: 30000, // 30초 캐시
    enabled: !!address && !!symbol,
  });
};
```

### 블록체인별 잔액 조회 분기

```typescript
// lib/api/blockchain-balance.ts
export async function getBlockchainBalance(address: string, symbol: string) {
  switch (symbol.toUpperCase()) {
    case 'BTC':
      return await getBitcoinBalance(address);
    case 'ETH':
      return await getEthereumBalance(address);
    case 'SOL':
      return await getSolanaBalance(address);
    case 'USDT':
      return await getUSDTBalance(address);
    case 'MATIC':
      return await getPolygonBalance(address);
    case 'BSC':
      return await getBSCBalance(address);
    case 'AVAX':
      return await getAvalancheBalance(address);
    default:
      console.warn(`지원하지 않는 블록체인 심볼: ${symbol}`);
      return null;
  }
}
```

## 트랜잭션 처리

### 트랜잭션 생성 패턴

각 블록체인마다 고유한 트랜잭션 구조를 가집니다:

```typescript
// Ethereum 트랜잭션
const createEthereumTransaction = async (params) => {
  const transaction = {
    to: params.to,
    value: parseEther(params.amount),
    gasLimit: params.gasLimit,
    gasPrice: params.gasPrice,
    nonce: await getTransactionCount(params.from)
  };
  
  return transaction;
};

// Solana 트랜잭션  
const createSolanaTransaction = async (params) => {
  const transaction = new Transaction();
  
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(params.from),
    toPubkey: new PublicKey(params.to),
    lamports: parseFloat(params.amount) * LAMPORTS_PER_SOL,
  });
  
  transaction.add(transferInstruction);
  return transaction;
};
```

### 서명 프로세스

```typescript
// 지갑에서 개인키 가져오기
const privateKey = getWalletPrivateKey(walletId, symbol);

// 코인별 서명 방식
if (symbol === 'SOL') {
  const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(privateKey)));
  transaction.sign(keypair);
} else {
  // EVM 계열 (ETH, MATIC, BSC, AVAX)
  const wallet = new ethers.Wallet(privateKey);
  const signedTx = await wallet.signTransaction(transaction);
}
```

## API 구조

### 디렉토리 구조

```
src/lib/
├── api/                          # 외부 API 통합
│   ├── blockchain-balance.ts     # 블록체인 잔액 조회
│   ├── blockchain-transfer.ts    # 블록체인 전송
│   ├── crypto-price.ts          # 암호화폐 시세
│   └── fee-estimate.ts          # 수수료 예상
├── ethereum/                     # 이더리움 특화
│   └── transaction.ts
├── solana/                       # 솔라나 특화  
│   └── transaction.ts
└── wallet-utils.ts              # 지갑 유틸리티
```

### 코인별 특화 모듈

각 블록체인의 고유한 특성을 다루는 전용 모듈:

```typescript
// lib/ethereum/transaction.ts
export const createEthereumTransfer = async (params) => {
  // EVM 호환 체인들의 공통 로직
  // ETH, MATIC, BSC, AVAX에서 재사용
};

// lib/solana/transaction.ts  
export const createSolanaTransfer = async (params) => {
  // 솔라나 전용 트랜잭션 로직
  // ed25519 서명, lamports 단위
};
```

## 확장성 고려사항

### 새로운 블록체인 추가

1. **Derivation Path 정의**
   ```typescript
   const DERIVATION_PATHS = {
     // 기존 코인들...
     NEW_COIN: "m/44'/9999'/0'/0/0",
   };
   ```

2. **주소 생성 함수 구현**
   ```typescript
   const generateNewCoinAddress = (privateKey: Buffer) => {
     // 해당 블록체인의 주소 생성 로직
   };
   ```

3. **잔액 조회 API 추가**
   ```typescript
   const getNewCoinBalance = async (address: string) => {
     // 블록체인 API 호출
   };
   ```

4. **UI 컴포넌트 업데이트**
   - 아이콘 추가
   - 가상자산 추가 페이지에 항목 추가
   - 메인화면 카드 렌더링 로직 추가

### 성능 최적화

- **React Query 캐싱**: 30초 staleTime으로 API 호출 최소화
- **병렬 요청**: Promise.all로 여러 잔액 동시 조회
- **조건부 렌더링**: 활성화된 자산만 렌더링
- **Lazy Loading**: 필요시에만 블록체인 라이브러리 로드

이 튜토리얼을 통해 nest-wallet의 블록체인 통합 구조를 이해하고, 새로운 코인을 추가하거나 기존 기능을 확장할 수 있습니다.