# Nest Wallet

블록체인 지갑 애플리케이션

## 주요 기능

### 🔥 새로운 기능: 트랜잭션별 정확한 가스 추정

기존의 하드코딩된 가스 리밋 대신, 실제 트랜잭션 데이터를 분석하여 정확한 수수료를 계산합니다.

#### 주요 개선사항

1. **실시간 가스 추정**
   - `eth_estimateGas` API를 사용한 정확한 가스 리밋 계산
   - 트랜잭션 복잡도에 따른 동적 가스 추정
   - 20% 안전 마진 자동 적용

2. **트랜잭션 타입별 최적화**
   - ETH 전송: ~21,000 gas
   - ERC20 토큰 전송: ~65,000 gas
   - 스마트 컨트랙트 호출: 수십만 gas
   - DeFi 스왑: ~200,000 gas

3. **함수 시그니처 분석**
   - 자동으로 트랜잭션 데이터 분석
   - 호출하는 함수에 따른 가스 추정
   - 지원 함수: transfer, approve, swap 등

#### 사용 방법

```typescript
import { estimateTransactionFee, TransactionGasEstimate } from './lib/api/fee-estimate';

const transaction: TransactionGasEstimate = {
  from: "0x1234...",
  to: "0x5678...",
  value: "1.0",
  data: "0x", // ETH 전송
  symbol: "ETH",
  network: "ethereum"
};

const feeEstimate = await estimateTransactionFee(transaction);
console.log(feeEstimate);
// {
//   symbol: "ETH",
//   network: "ethereum",
//   gasPrice: "25.5",
//   gasLimit: "25200",
//   estimatedFee: "0.000642",
//   feeInDollar: "1.28",
//   priority: "medium"
// }
```

#### ERC20 토큰 전송 지원

```typescript
import { createERC20TransferData } from './lib/api/fee-estimate';

// ERC20 전송 데이터 생성
const transferData = createERC20TransferData(
  "0x5678...", // 받는 주소
  "100",       // 전송 금액
  18           // 토큰 소수점
);

const transaction: TransactionGasEstimate = {
  from: "0x1234...",
  to: "0xTokenContractAddress...", // 토큰 컨트랙트 주소
  value: "0", // ERC20 전송은 value가 0
  data: transferData,
  symbol: "ETH",
  network: "ethereum"
};
```

#### 솔라나 수수료 추정

솔라나는 고정 수수료 시스템을 사용하며, 트랜잭션 시뮬레이션을 통해 정확한 수수료를 계산합니다.

```typescript
import { simulateSolanaTransaction, SolanaTransactionEstimate } from './lib/api/fee-estimate';

const solanaTransaction: SolanaTransactionEstimate = {
  from: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  to: "2xNweLHLqrxmzZxKqsK4h1J3J7EoX3dA1qH6qKqKqKqK",
  amount: "1.0",
  symbol: "SOL",
  network: "solana",
  transactionType: "SOL_TRANSFER"
};

const feeEstimate = await simulateSolanaTransaction(solanaTransaction);
console.log(feeEstimate);
// {
//   symbol: "SOL",
//   network: "solana",
//   feeInLamports: 5000,
//   feeInSol: "0.000005000",
//   feeInDollar: "0.0005",
//   priority: "medium",
//   computeUnits: 200000
// }

// 동적 수수료 추천 (SOL 가격 고려)
const feeRecommendation = await getSolanaFeeRecommendation(solanaTransaction);
console.log(feeRecommendation);
// {
//   low: { feeInDollar: "0.0003", feeInSol: "0.000003000", reason: "기본 수수료" },
//   medium: { feeInDollar: "0.0005", feeInSol: "0.000005000", reason: "기본 수수료 + 우선순위 수수료 (medium)" },
//   high: { feeInDollar: "0.0015", feeInSol: "0.000015000", reason: "기본 수수료 + 우선순위 수수료 (high)" },
//   recommendation: "low",
//   reason: "SOL 가격이 높음 ($1200.00) - 낮은 우선순위로 비용 절약"
// }
```

**솔라나 수수료 특징:**
- **고정 수수료**: 기본 5,000 lamports (0.000005 SOL)
- **트랜잭션 시뮬레이션**: 실제 트랜잭션을 시뮬레이션하여 정확한 수수료 계산
- **컴퓨트 유닛**: 트랜잭션 복잡도에 따른 컴퓨트 유닛 추정
- **실시간 가격**: CoinGecko API로 USD 환산
- **동적 수수료 조정**: SOL 가격 상승에 따른 수수료 최적화
- **우선순위 기반**: 낮음/중간/높음 우선순위에 따른 수수료 조정

#### 지원 네트워크

- **이더리움 (Ethereum)**: Infura API
- **폴리곤 (Polygon)**: Infura API
- **BSC**: Binance RPC
- **Avalanche**: Avalanche RPC
- **솔라나 (Solana)**: Solana RPC
- **비트코인**: BlockCypher API

#### 자동 수수료 계산

UI에서 주소와 금액을 입력하면 자동으로:
1. 트랜잭션 데이터 분석
2. 실시간 가스 가격 조회
3. 정확한 가스 리밋 추정
4. USD 환산 수수료 계산

## 기존 기능

- 쿠폰 관리 및 전송
- 멀티 체인 지원
- 실시간 잔액 조회
- 트랜잭션 히스토리

## 설치 및 실행

```bash
npm install
npm run dev
```

## 환경 변수

```env
NEXT_PUBLIC_INFURA_API_KEY=your_infura_api_key
```
