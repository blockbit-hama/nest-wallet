"use client";
import { useState, useEffect } from "react";
import { Button, Card, Input, Select } from "../../components/ui";
import { useWalletList } from "../../hooks/useWalletAtoms";
import { useMasterAddress } from "../../hooks/wallet/useMasterAddress";
import { usePurchaseQuotes, usePurchaseCurrencies, usePurchaseCountries, usePurchaseNetworkFees, usePurchaseProviderStatus, usePurchaseTransaction, usePurchaseCustomerLimits, usePurchaseCustomerKycStatus, usePurchaseHistory } from "../../hooks/queries/usePurchaseQueries";
import "../../types/webview"; // WebView 타입 정의 로드

// 기본 법정화폐 목록 (UI 표시용 - 실제 데이터는 MoonPay API에서)
const BASIC_FIAT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
];

// 가상자산 필터링 로직 (향후 확장용)
const filterCryptocurrenciesByFiat = (currencies: any[], fiatCurrency: string, userCountry?: string) => {
  if (!currencies) return [];

  return currencies.filter((currency: any) => {
    // 기본 필터링: 암호화폐만 선택
    if (currency.type !== 'crypto') return false;

    // 지원되지 않는 코인 제외
    if (!currency.isSupported) return false;

    // 향후 확장: 국가별 제한사항 확인
    if (userCountry && currency.notAllowedCountries?.includes(userCountry)) {
      return false;
    }

    // 향후 확장: 미국 내 지원 여부 확인 (필요시)
    if (userCountry === 'US' && currency.isSupportedInUS === false) {
      return false;
    }

    // 향후 확장: 법정화폐별 제한사항 (MoonPay API에서 추가 정보 제공 시)
    // 현재는 모든 법정화폐에서 모든 암호화폐 구매 가능하다고 가정

    return true;
  });
};

// 가상화폐별 아이콘 생성 함수
const createCoinIcon = (symbol: string) => {
  const iconMap: Record<string, { gradient: string; symbol: string }> = {
    BTC: { gradient: "from-yellow-400 to-orange-500", symbol: "₿" },
    ETH: { gradient: "from-blue-400 to-indigo-500", symbol: "Ξ" },
    USDT: { gradient: "from-green-400 to-emerald-500", symbol: "$" },
    SOL: { gradient: "from-purple-400 to-pink-500", symbol: "◎" },
    ADA: { gradient: "from-blue-500 to-cyan-500", symbol: "A" },
    DOT: { gradient: "from-pink-500 to-red-500", symbol: "D" },
    MATIC: { gradient: "from-purple-500 to-indigo-600", symbol: "M" },
    LINK: { gradient: "from-blue-600 to-indigo-700", symbol: "L" },
    // 기본 스타일
    DEFAULT: { gradient: "from-gray-400 to-gray-600", symbol: symbol.charAt(0) }
  };

  const config = iconMap[symbol] || iconMap.DEFAULT;
  return (
    <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${config.gradient} flex items-center justify-center text-white font-bold text-xs`}>
      {config.symbol}
    </div>
  );
};

const PurchaseIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" stroke="#F2A003" strokeWidth="2"/>
    <path d="M12 16h8" stroke="#F2A003" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 12v8" stroke="#F2A003" strokeWidth="2" strokeLinecap="round"/>
    <path d="M20 8l4 4-4 4" stroke="#F2A003" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function PurchasePage() {
  const { selectedWallet, loadWallets, walletList, refreshWalletList } = useWalletList();
  const { masterAddress } = useMasterAddress();

  // 강제 지갑 로드 함수
  const forceLoadWallet = () => {
    console.log('🔄 [Purchase Page] Force loading wallet...');
    refreshWalletList();

    // 지연 후 다시 시도
    setTimeout(() => {
      if (!selectedWallet) {
        console.log('🔄 [Purchase Page] Still no wallet, trying loadWallets...');
        loadWallets();
      }
    }, 500);
  };

  // 지갑 초기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasWalletData = localStorage.getItem('nest-wallets') && localStorage.getItem('selectedWalletId');
      if (!selectedWallet && hasWalletData) {
        loadWallets();
      } else if (!selectedWallet && walletList.length === 0) {
        loadWallets();
      }
    }
  }, []);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('BTC');
  const [amount, setAmount] = useState<string>('100');
  const [fiatCurrency, setFiatCurrency] = useState<string>('USD');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [step, setStep] = useState<'quote' | 'confirm' | 'processing' | 'complete'>('quote');
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // MoonPay API에서 지원하는 법정화폐 목록 추출
  const getSupportedFiatCurrencies = () => {
    if (!currencies) return BASIC_FIAT_CURRENCIES;

    // MoonPay currencies API에서 type이 'fiat'인 통화들만 필터링
    const moonPayFiats = Object.entries(currencies)
      .filter(([symbol, currency]: [string, any]) => currency.type === 'fiat')
      .map(([symbol, currency]: [string, any]) => ({
        code: currency.code.toUpperCase(),
        name: currency.name,
        symbol: getDefaultSymbol(currency.code.toUpperCase()), // 기본 심볼 매핑
        moonPayData: currency
      }));

    // MoonPay에서 가져온 데이터가 있으면 사용, 없으면 기본값
    return moonPayFiats.length > 0 ? moonPayFiats : BASIC_FIAT_CURRENCIES;
  };

  // 통화 코드에 따른 기본 심볼 매핑
  const getDefaultSymbol = (code: string): string => {
    const symbolMap: Record<string, string> = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$',
      'CHF': 'CHF', 'HKD': 'HK$', 'MXN': 'MX$', 'JPY': '¥', 'KRW': '₩'
    };
    return symbolMap[code] || code;
  };

  // 선택된 법정화폐의 심볼 가져오기
  const getFiatSymbol = (code: string): string => {
    const supportedFiats = getSupportedFiatCurrencies();
    const fiat = supportedFiats.find(f => f.code === code);
    return fiat?.symbol || getDefaultSymbol(code);
  };

  // 네트워크 수수료 가져오기 헬퍼 함수
  const getNetworkFee = (currency: string, fiatCurrency: string): number | null => {
    if (!networkFees) return null;

    const currencyUpper = currency.toUpperCase();
    const fiatUpper = fiatCurrency.toUpperCase();

    // MoonPay network fees API 응답 구조: { "BTC": { "USD": 2.76, "GBP": 2.18 }, "ETH": { "USD": 6.52, "GBP": 5.14 } }
    if (networkFees[currencyUpper] && networkFees[currencyUpper][fiatUpper]) {
      return networkFees[currencyUpper][fiatUpper];
    }

    return null;
  };

  // 페이지 로드 시 로깅 및 지갑 초기화
  useEffect(() => {
    console.log('🔵 [Purchase Page] Component mounted');
    console.log('🔵 [Purchase Page] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      windowLocation: window.location.href
    });
    console.log('🔵 [Purchase Page] = WALLET DEBUG START =');
    console.log('selectedWallet:', selectedWallet);
    console.log('walletList.length:', walletList.length);
    console.log('walletList:', walletList);
    console.log('localStorage nest-wallets:', localStorage.getItem('nest-wallets'));
    console.log('localStorage selectedWalletId:', localStorage.getItem('selectedWalletId'));
    console.log('🔵 [Purchase Page] = WALLET DEBUG END =');
    console.log('🔵 [Purchase Page] Initial State:', {
      selectedCurrency,
      amount,
      fiatCurrency,
      step
    });

    // 지갑이 없으면 로드 시도
    if (!selectedWallet && typeof window !== 'undefined') {
      console.log('🟡 [Purchase Page] No wallet selected, trying to load wallets...');

      // useWalletList hook에서 loadWallets 호출
      const { loadWallets } = require('../../hooks/useWalletAtoms');
      if (typeof loadWallets === 'function') {
        console.log('🟡 [Purchase Page] Calling loadWallets...');
        loadWallets();
      }
    }
  }, [selectedWallet]);

  // API 쿼리들
  const { data: currencies, isLoading: currenciesLoading, error: currenciesError } = usePurchaseCurrencies();
  const { data: countries, isLoading: countriesLoading, error: countriesError } = usePurchaseCountries();
  const { data: networkFees, isLoading: networkFeesLoading, error: networkFeesError } = usePurchaseNetworkFees();
  const {
    data: providerStatus,
    isLoading: providerStatusLoading,
    error: providerStatusError
  } = usePurchaseProviderStatus();

  // 🔥 Customer Limits 조회 (masterAddress가 externalCustomerId)
  const {
    data: customerLimits,
    isLoading: customerLimitsLoading,
    error: customerLimitsError
  } = usePurchaseCustomerLimits(masterAddress);

  // 🔥 Customer KYC Status 조회 (데모용 - 모든 MoonPay 데이터 표시)
  const {
    data: customerKycStatus,
    isLoading: customerKycStatusLoading,
    error: customerKycStatusError
  } = usePurchaseCustomerKycStatus(masterAddress);

  // 🔥 Purchase History 조회 (데모용 - 모든 MoonPay 트랜잭션 데이터 표시)
  const {
    data: purchaseHistory,
    isLoading: purchaseHistoryLoading,
    error: purchaseHistoryError
  } = usePurchaseHistory(masterAddress, 10); // 최근 10개

  // Currencies 상태 변경 로깅 및 초기 화폐 설정
  useEffect(() => {
    if (currenciesLoading) {
      console.log('🟡 [Purchase API] Loading currencies...');
    } else if (currenciesError) {
      console.error('🔴 [Purchase API] Currencies error:', currenciesError);
    } else if (currencies) {
      console.log('🟢 [Purchase API] Currencies loaded:', currencies);

      // 현재 선택된 화폐가 지원되지 않으면 BTC를 기본값으로 설정
      const availableCurrencies = Object.keys(currencies);
      if (availableCurrencies.length > 0) {
        // BTC나 btc가 있는지 대소문자 구분없이 찾기
        const btcKey = availableCurrencies.find(key => key.toUpperCase() === 'BTC');

        if (!selectedCurrency || !availableCurrencies.includes(selectedCurrency)) {
          const defaultCurrency = btcKey || availableCurrencies[0];
          console.log(`🟦 [Auto Select] Setting default currency to ${defaultCurrency}`);
          setSelectedCurrency(defaultCurrency);
        } else if (selectedCurrency === 'BTC' && btcKey && btcKey !== 'BTC') {
          // 초기값이 'BTC'인데 실제 키가 'btc'인 경우 조정
          console.log(`🟦 [Auto Select] Adjusting BTC case from ${selectedCurrency} to ${btcKey}`);
          setSelectedCurrency(btcKey);
        }
      }
    }
  }, [currencies, currenciesLoading, currenciesError, selectedCurrency]);

  // Countries 상태 변경 로깅
  useEffect(() => {
    if (countriesLoading) {
      console.log('🟡 [Purchase API] Loading countries...');
    } else if (countriesError) {
      console.error('🔴 [Purchase API] Countries error:', countriesError);
    } else if (countries) {
      console.log('🟢 [Purchase API] Countries loaded:', countries);
    }
  }, [countries, countriesLoading, countriesError]);

  // Network Fees 상태 변경 로깅
  useEffect(() => {
    if (networkFeesLoading) {
      console.log('🟡 [Purchase API] Loading network fees...');
    } else if (networkFeesError) {
      console.error('🔴 [Purchase API] Network fees error:', networkFeesError);
    } else if (networkFees) {
      console.log('🟢 [Purchase API] Network fees loaded:', networkFees);
    }
  }, [networkFees, networkFeesLoading, networkFeesError]);

  // Provider Status 상태 변경 로깅
  useEffect(() => {
    if (providerStatusLoading) {
      console.log('🟡 [Purchase API] Loading provider status...');
    } else if (providerStatusError) {
      console.error('🔴 [Purchase API] Provider status error:', providerStatusError);
    } else if (providerStatus) {
      console.log('🟢 [Purchase API] Provider status loaded:', providerStatus);

      // 각 프로바이더 상태 상세 로깅
      Object.entries(providerStatus.providers || {}).forEach(([provider, status]) => {
        const statusInfo = status as any;
        console.log(`📊 [Provider ${provider.toUpperCase()}]`, {
          available: statusInfo.available,
          lastChecked: statusInfo.lastChecked,
          error: statusInfo.error
        });
      });
    }
  }, [providerStatus, providerStatusLoading, providerStatusError]);

  // 🔥 Customer Limits 상태 변경 로깅
  useEffect(() => {
    if (customerLimitsLoading) {
      console.log('🟡 [Purchase API] Loading customer limits...');
    } else if (customerLimitsError) {
      console.error('🔴 [Purchase API] Customer limits error:', customerLimitsError);
    } else if (customerLimits) {
      console.log('🟢 [Purchase API] Customer limits loaded:', customerLimits);
      console.log('💰 [Customer Limits Info]', {
        customerId: customerLimits.customerId,
        externalCustomerId: customerLimits.externalCustomerId,
        kycStatus: customerLimits.kycStatus,
        kycLevel: customerLimits.kycLevel,
        limitsCount: customerLimits.limits?.length || 0
      });
    }
  }, [customerLimits, customerLimitsLoading, customerLimitsError]);

  // 🔥 Customer KYC Status 상태 변경 로깅
  useEffect(() => {
    if (customerKycStatusLoading) {
      console.log('🟡 [Purchase API] Loading customer KYC status...');
    } else if (customerKycStatusError) {
      console.error('🔴 [Purchase API] Customer KYC status error:', customerKycStatusError);
    } else if (customerKycStatus) {
      console.log('🟢 [Purchase API] Customer KYC status loaded:', customerKycStatus);
      console.log('🔐 [KYC Status Info]', {
        customerId: customerKycStatus.customerId,
        externalCustomerId: customerKycStatus.externalCustomerId,
        kycStatus: customerKycStatus.kycStatus,
        kycLevel: customerKycStatus.kycLevel,
        fallback: customerKycStatus.fallback || false
      });
    }
  }, [customerKycStatus, customerKycStatusLoading, customerKycStatusError]);

  // 🔥 Purchase History 상태 변경 로깅
  useEffect(() => {
    if (purchaseHistoryLoading) {
      console.log('🟡 [Purchase API] Loading purchase history...');
    } else if (purchaseHistoryError) {
      console.error('🔴 [Purchase API] Purchase history error:', purchaseHistoryError);
    } else if (purchaseHistory) {
      console.log('🟢 [Purchase API] Purchase history loaded:', purchaseHistory);
      console.log('📜 [Purchase History Info]', {
        historyCount: purchaseHistory.length,
        transactions: purchaseHistory.map(tx => ({
          id: tx.id,
          status: tx.status,
          currency: tx.currency,
          amount: tx.amount,
          createdAt: tx.createdAt
        }))
      });
    }
  }, [purchaseHistory, purchaseHistoryLoading, purchaseHistoryError]);

  const {
    data: quotes,
    isLoading: quotesLoading,
    error: quotesError,
    refetch: refetchQuotes
  } = usePurchaseQuotes(
    selectedCurrency,
    parseFloat(amount) || 0,
    fiatCurrency,
    { enabled: false }
  );

  // Quotes 상태 변경 로깅
  useEffect(() => {
    if (quotesLoading) {
      console.log('🟡 [Purchase API] Loading quotes...');
    } else if (quotesError) {
      console.error('🔴 [Purchase API] Quotes error:', quotesError);
    } else if (quotes) {
      console.log('🟢 [Purchase API] Quotes loaded:', quotes);
    }
  }, [quotes, quotesLoading, quotesError]);

  // 사용자 입력 변경 로깅
  useEffect(() => {
    console.log('🟦 [User Input] Currency changed:', selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    console.log('🟦 [User Input] Amount changed:', amount);
  }, [amount]);

  useEffect(() => {
    console.log('🟦 [State] Step changed:', step);
  }, [step]);


  const createTransactionMutation = usePurchaseTransaction();

  // 견적 조회
  const handleGetQuotes = async () => {
    console.log('🟦 [User Action] Get quotes button clicked');
    console.log('🟦 [User Action] Quote request params:', {
      selectedCurrency,
      amount,
      fiatCurrency,
      selectedWallet: selectedWallet?.name || 'none'
    });

    if (!amount || parseFloat(amount) <= 0) {
      console.warn('⚠️ [Validation] Invalid amount:', amount);
      return;
    }

    console.log('🟡 [Purchase API] Fetching quotes...');
    try {
      const result = await refetchQuotes();
      console.log('🟢 [Purchase API] Quotes fetched:', result.data);
    } catch (error) {
      console.error('🔴 [Purchase API] Quote fetch error:', error);
    }
  };

  // 선택된 통화에 맞는 실제 블록체인 주소 가져오기
  const getWalletAddressForCurrency = (currency: string): string | null => {
    console.log('🏦 [Wallet] Address lookup started:', {
      currency,
      hasSelectedWallet: !!selectedWallet,
      walletId: selectedWallet?.id
    });

    if (!selectedWallet) {
      console.warn('⚠️ [Wallet] No wallet selected');
      return null;
    }

    const currencyMap: Record<string, string> = {
      'btc': 'BTC',
      'BTC': 'BTC',
      'eth': 'ETH',
      'ETH': 'ETH',
      'ethereum': 'ETH',
      'usdt': 'USDT',
      'USDT': 'USDT',
      'tether': 'USDT',
      'sol': 'SOL',
      'SOL': 'SOL',
      'solana': 'SOL'
    };

    const addressKey = currencyMap[currency.toLowerCase()];
    const address = selectedWallet.addresses?.[addressKey];

    console.log('🏦 [Wallet] Address lookup details:', {
      currency,
      currencyLower: currency.toLowerCase(),
      addressKey,
      address: address ? `${address.slice(0, 10)}...${address.slice(-6)}` : 'not found',
      availableAddresses: selectedWallet.addresses ? Object.keys(selectedWallet.addresses) : [],
      walletAddresses: selectedWallet.addresses
    });

    return address || null;
  };

  // 거래 생성
  const handleCreateTransaction = async (providerId: string) => {
    console.log('🟦 [User Action] Create transaction clicked');

    const walletAddress = getWalletAddressForCurrency(selectedCurrency);

    console.log('🟦 [User Action] Transaction params:', {
      providerId,
      selectedCurrency,
      amount,
      walletAddress: walletAddress ? `${walletAddress.slice(0, 10)}...` : 'not found',
      selectedWallet: selectedWallet?.name || 'none'
    });

    if (!selectedWallet || !amount || !walletAddress) {
      console.warn('⚠️ [Validation] Missing required data:', {
        selectedWallet: !!selectedWallet,
        amount: !!amount,
        walletAddress: !!walletAddress,
        selectedCurrency
      });
      return;
    }

    try {
      console.log('🟡 [Transaction] Setting step to processing...');
      setStep('processing');

      // 🔥 External Transaction ID 생성 (UUID 형태)
      const externalTransactionId = `nest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 🔥 로컬스토리지에 externalTransactionId 저장
      const transactionHistory = JSON.parse(localStorage.getItem('nest-transaction-history') || '[]');
      transactionHistory.push({
        externalTransactionId,
        providerId,
        currency: selectedCurrency,
        amount: parseFloat(amount),
        userWalletAddress: walletAddress,
        masterAddress,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      localStorage.setItem('nest-transaction-history', JSON.stringify(transactionHistory));
      
      console.log('🟢 [Storage] External transaction ID saved:', externalTransactionId);

      const transactionRequest = {
        providerId,
        currency: selectedCurrency,
        amount: parseFloat(amount),
        userWalletAddress: walletAddress, // 실제 블록체인 주소 사용
        fiatCurrency: fiatCurrency, // 🔥 선택한 결제 통화 추가
        masterAddress: masterAddress, // 🔥 지갑 고유 ID 추가
        externalCustomerId: masterAddress, // 🔥 외부 고객 ID (masterAddress와 동일)
        externalTransactionId: externalTransactionId, // 🔥 외부 트랜잭션 ID (로컬 추적용)
        userEmail: 'user@example.com',
        returnUrl: `${window.location.origin}/purchase/result`,
        webhookUrl: `${process.env.NEXT_PUBLIC_API_URL || 'https://intergroup-fanny-overliterary.ngrok-free.dev'}/api/webhook/purchase`
      };

      console.log('🟡 [Purchase API] Creating transaction:', transactionRequest);
      const result = await createTransactionMutation.mutateAsync(transactionRequest);
      console.log('🟢 [Purchase API] Transaction created:', result);

      setTransactionId(result.transactionId);
      setStep('complete');
      console.log('🟢 [Transaction] Transaction completed, ID:', result.transactionId);

      // 실제 결제 URL로 리다이렉트
      if (result.paymentUrl) {
        console.log('🔗 [Redirect] Opening payment URL:', result.paymentUrl);

        // WebView 환경 감지 및 처리
        if (window.isReactNativeWebView && window.nativeApp) {
          console.log('📱 [WebView] Using native app redirect');
          window.nativeApp.openExternalUrl(result.paymentUrl);
        } else {
          console.log('🌐 [Browser] Opening in new tab');
          // 새 탭에서 열기
          window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (error) {
      console.error('🔴 [Transaction] Transaction creation failed:', error);
      setStep('quote');
    }
  };

  if (!selectedWallet) {
    return (
      <div className="min-h-screen bg-[#14151A] text-white p-4">
        <Card className="bg-[#23242A] border-gray-700">
          <div className="p-6 text-center">
            <PurchaseIcon />
            <h2 className="text-xl font-bold text-white mb-4 mt-4">지갑 선택 필요</h2>
            <p className="text-gray-400 mb-4">
              구매 기능을 사용하려면 먼저 지갑을 선택해주세요.
            </p>
            <div className="text-sm text-gray-500">
              {walletList.length === 0 ? (
                <p>사용 가능한 지갑이 없습니다. 지갑을 먼저 생성해주세요.</p>
              ) : (
                <p>{walletList.length}개 지갑이 있지만 선택되지 않았습니다.</p>
              )}
            </div>
            <button
              onClick={forceLoadWallet}
              className="mt-4 px-4 py-2 bg-[#F2A003] text-black rounded-lg hover:bg-[#F2A003]/80 transition-colors"
            >
              지갑 로드 재시도
            </button>
            <div className="mt-2 text-xs text-gray-600">
              디버깅: localStorage에 지갑 데이터가 {typeof window !== 'undefined' && localStorage.getItem('nest-wallets') ? '있습니다' : '없습니다'}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#14151A] text-white px-2 py-1">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white">암호화폐 구매</h1>
            {/* Master Address 한줄로 상단에 표시 */}
            {masterAddress && (
              <p className="text-sm text-gray-400 font-mono">
                ID: {masterAddress}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => window.location.href = '/purchase/history'}
              className="px-2 py-0.5 text-sm bg-gray-600 hover:bg-gray-500 text-white"
            >
              히스토리
            </Button>
            <PurchaseIcon />
          </div>
        </div>

        {/* 🔥 구매 한도 정보 (구매 페이지 상단) */}
        {masterAddress && (
          <Card className="bg-[#23242A] border-gray-700 mb-2">
            <div className="p-2">
              <h3 className="text-sm font-medium text-gray-400 mb-2">구매 한도 정보</h3>

              {customerLimitsLoading && (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full"></div>
                  <span className="text-sm">한도 정보 로딩 중...</span>
                </div>
              )}

              {customerLimitsError && (
                <div className="p-2 bg-yellow-600/20 border border-yellow-600/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">ℹ️</span>
                    <div className="text-sm">
                      <p className="text-yellow-300 font-medium">첫 구매 고객</p>
                      <p className="text-yellow-200/80 text-xs">
                        MoonPay에서 첫 구매를 진행하시면 KYC 인증 후 한도가 설정됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {customerLimits && !customerLimitsLoading && !customerLimitsError && (
                <>
                  {/* KYC 상태 */}
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="bg-gray-800/30 p-2 rounded">
                      <div className="text-gray-400 text-xs">KYC 상태</div>
                      <div className={`font-medium text-xs ${
                        customerLimits.kycStatus === 'completed' ? 'text-green-400' :
                        customerLimits.kycStatus === 'pending' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {customerLimits.kycStatus === 'completed' ? '✅ 인증 완료' :
                         customerLimits.kycStatus === 'pending' ? '⏳ 인증 중' :
                         customerLimits.kycStatus === 'review' ? '🔍 검토 중' : '❌ 미인증'}
                      </div>
                    </div>
                    <div className="bg-gray-800/30 p-2 rounded">
                      <div className="text-gray-400 text-xs">인증 레벨</div>
                      <div className="text-white font-medium text-xs">
                        Level {customerLimits.kycLevel}
                      </div>
                    </div>
                  </div>

                  {/* 구매 한도 정보 */}
                  {customerLimits.limits && customerLimits.limits.length > 0 && (
                    <div className="space-y-2">
                      {customerLimits.limits
                        .filter(limit => limit.type.startsWith('buy_'))
                        .slice(0, 2) // 상위 2개 결제 수단만 표시
                        .map((limit, index) => {
                          // 결제 수단 이름 매핑
                          const paymentMethodNames: Record<string, string> = {
                            'buy_credit_debit_card': '💳 카드결제',
                            'buy_bank_transfer': '🏦 계좌이체',
                            'buy_ach_bank_transfer': '🏦 ACH 이체',
                            'buy_sepa_bank_transfer': '🏦 SEPA 이체',
                            'buy_gbp_bank_transfer': '🏦 GBP 이체',
                            'buy_mobile_wallet': '📱 모바일 지갑'
                          };

                          const paymentName = paymentMethodNames[limit.type] || `💰 ${limit.type}`;
                          const dailyUsagePercent = limit.dailyLimit > 0 ?
                            ((limit.dailyLimit - limit.dailyLimitRemaining) / limit.dailyLimit * 100) : 0;
                          const monthlyUsagePercent = limit.monthlyLimit > 0 ?
                            ((limit.monthlyLimit - limit.monthlyLimitRemaining) / limit.monthlyLimit * 100) : 0;

                          return (
                            <div key={index} className="bg-blue-900/20 border border-blue-700/30 rounded p-2">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-blue-300 text-xs font-medium">{paymentName}</span>
                                <span className="text-xs text-gray-400">
                                  {customerLimits.liveMode ? '🔴 실제' : '🟡 테스트'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <div className="text-gray-400">일일 한도</div>
                                  <div className="text-white font-mono">
                                    ${limit.dailyLimitRemaining?.toLocaleString() || '0'} / ${limit.dailyLimit?.toLocaleString() || '0'}
                                  </div>
                                  <div className="bg-gray-700 rounded-full h-1 mt-1">
                                    <div
                                      className="bg-blue-400 h-1 rounded-full transition-all"
                                      style={{ width: `${dailyUsagePercent}%` }}
                                    ></div>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-400">월간 한도</div>
                                  <div className="text-white font-mono">
                                    ${limit.monthlyLimitRemaining?.toLocaleString() || '0'} / ${limit.monthlyLimit?.toLocaleString() || '0'}
                                  </div>
                                  <div className="bg-gray-700 rounded-full h-1 mt-1">
                                    <div
                                      className="bg-green-400 h-1 rounded-full transition-all"
                                      style={{ width: `${monthlyUsagePercent}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                      {/* 더 많은 한도 정보가 있으면 간단히 표시 */}
                      {customerLimits.limits.filter(limit => limit.type.startsWith('buy_')).length > 2 && (
                        <div className="text-center">
                          <span className="text-xs text-gray-500">
                            +{customerLimits.limits.filter(limit => limit.type.startsWith('buy_')).length - 2}개 추가 결제 수단
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 한도가 없는 경우 */}
                  {(!customerLimits.limits || customerLimits.limits.length === 0) && (
                    <div className="p-2 bg-gray-600/20 border border-gray-600/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">ℹ️</span>
                        <div className="text-sm">
                          <p className="text-gray-300 font-medium">한도 정보 없음</p>
                          <p className="text-gray-400 text-xs">
                            첫 구매 진행 시 KYC 인증 후 한도가 설정됩니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        )}

        {/* 🔥 KYC 상세 상태 (데모용 - 모든 MoonPay 데이터 표시) */}
        {masterAddress && (
          <Card className="bg-[#23242A] border-gray-700 mb-2">
            <div className="p-2">
              <h3 className="text-sm font-medium text-gray-400 mb-2">KYC 상세 정보 (MoonPay 원본 데이터)</h3>

              {customerKycStatusLoading && (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full"></div>
                  <span className="text-sm">KYC 정보 로딩 중...</span>
                </div>
              )}

              {customerKycStatusError && (
                <div className="p-2 bg-yellow-600/20 border border-yellow-600/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">ℹ️</span>
                    <div className="text-sm">
                      <p className="text-yellow-300 font-medium">KYC 정보 없음</p>
                      <p className="text-yellow-200/80 text-xs">
                        첫 구매 시 MoonPay에서 KYC 인증이 진행됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {customerKycStatus && !customerKycStatusLoading && !customerKycStatusError && (
                <div className="bg-purple-900/20 border border-purple-700/30 rounded p-2">
                  <div className="text-purple-300 text-xs font-medium mb-2">
                    MoonPay KYC 시스템 정보 {customerKycStatus.fallback && '(Fallback 모드)'}
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* 기본 고객 정보 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-gray-400">고객 ID</div>
                        <div className="text-white font-mono text-xs">{customerKycStatus.customerId}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">외부 고객 ID</div>
                        <div className="text-white font-mono text-xs">{customerKycStatus.externalCustomerId}</div>
                      </div>
                    </div>

                    {/* KYC 상태 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-gray-400">KYC 상태</div>
                        <div className={`font-medium text-xs ${
                          customerKycStatus.kycStatus === 'completed' ? 'text-green-400' :
                          customerKycStatus.kycStatus === 'pending' ? 'text-yellow-400' :
                          customerKycStatus.kycStatus === 'review' ? 'text-orange-400' : 'text-red-400'
                        }`}>
                          {customerKycStatus.kycStatus}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">KYC 레벨</div>
                        <div className="text-white font-medium text-xs">Level {customerKycStatus.kycLevel}</div>
                      </div>
                    </div>

                    {/* 타임스탬프 */}
                    {(customerKycStatus.createdAt || customerKycStatus.updatedAt) && (
                      <div className="grid grid-cols-2 gap-2">
                        {customerKycStatus.createdAt && (
                          <div>
                            <div className="text-gray-400">생성일시</div>
                            <div className="text-green-300 text-xs">
                              {new Date(customerKycStatus.createdAt).toLocaleString('ko-KR')}
                            </div>
                          </div>
                        )}
                        {customerKycStatus.updatedAt && (
                          <div>
                            <div className="text-gray-400">수정일시</div>
                            <div className="text-yellow-300 text-xs">
                              {new Date(customerKycStatus.updatedAt).toLocaleString('ko-KR')}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fallback 정보 */}
                    {customerKycStatus.fallback && customerKycStatus.transactionId && (
                      <div className="bg-orange-800/30 p-2 rounded">
                        <div className="text-orange-300 text-xs font-medium">Fallback 정보</div>
                        <div className="text-orange-200 text-xs">
                          트랜잭션 ID: {customerKycStatus.transactionId}
                        </div>
                      </div>
                    )}

                    {/* 메시지 */}
                    {customerKycStatus.message && (
                      <div className="bg-blue-800/30 p-2 rounded">
                        <div className="text-blue-300 text-xs font-medium">메시지</div>
                        <div className="text-blue-200 text-xs">{customerKycStatus.message}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 🔥 구매 히스토리 (데모용 - 모든 MoonPay 트랜잭션 데이터 표시) */}
        {masterAddress && (
          <Card className="bg-[#23242A] border-gray-700 mb-2">
            <div className="p-2">
              <h3 className="text-sm font-medium text-gray-400 mb-2">구매 히스토리 (MoonPay 원본 데이터)</h3>

              {purchaseHistoryLoading && (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full"></div>
                  <span className="text-sm">히스토리 로딩 중...</span>
                </div>
              )}

              {purchaseHistoryError && (
                <div className="p-2 bg-yellow-600/20 border border-yellow-600/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">ℹ️</span>
                    <div className="text-sm">
                      <p className="text-yellow-300 font-medium">구매 히스토리 없음</p>
                      <p className="text-yellow-200/80 text-xs">
                        첫 구매를 진행하시면 히스토리가 표시됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {purchaseHistory && !purchaseHistoryLoading && !purchaseHistoryError && (
                <>
                  {purchaseHistory.length > 0 ? (
                    <div className="space-y-2">
                      {purchaseHistory.slice(0, 3).map((tx, index) => ( // 최대 3개만 표시
                        <div key={index} className="bg-indigo-900/20 border border-indigo-700/30 rounded p-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-indigo-300 text-xs font-medium">
                              트랜잭션 #{tx.id.slice(-8)}
                            </span>
                            <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                              tx.status === 'completed' ? 'bg-green-600 text-white' :
                              tx.status === 'pending' ? 'bg-yellow-600 text-white' :
                              tx.status === 'failed' ? 'bg-red-600 text-white' : 'bg-gray-600 text-white'
                            }`}>
                              {tx.status}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-gray-400">통화</div>
                              <div className="text-white font-medium">{tx.currency}</div>
                            </div>
                            <div>
                              <div className="text-gray-400">금액</div>
                              <div className="text-white font-mono">{tx.fiatAmount || tx.amount} {tx.fiatCurrency}</div>
                            </div>
                            <div>
                              <div className="text-gray-400">암호화폐 수량</div>
                              <div className="text-green-300 font-mono">{tx.cryptoAmount || 'N/A'}</div>
                            </div>
                            <div>
                              <div className="text-gray-400">결제수단</div>
                              <div className="text-blue-300">{tx.paymentMethod || 'N/A'}</div>
                            </div>
                          </div>

                          {/* 타임스탬프 */}
                          <div className="mt-2 pt-2 border-t border-indigo-700/30">
                            <div className="grid grid-cols-1 gap-1 text-xs">
                              <div>
                                <span className="text-gray-400">생성: </span>
                                <span className="text-green-300">{new Date(tx.createdAt).toLocaleString('ko-KR')}</span>
                              </div>
                              {tx.completedAt && (
                                <div>
                                  <span className="text-gray-400">완료: </span>
                                  <span className="text-blue-300">{new Date(tx.completedAt).toLocaleString('ko-KR')}</span>
                                </div>
                              )}
                              {tx.failedAt && (
                                <div>
                                  <span className="text-gray-400">실패: </span>
                                  <span className="text-red-300">{new Date(tx.failedAt).toLocaleString('ko-KR')}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* KYC 정보 */}
                          {(tx.kycStatus || tx.kycLevel) && (
                            <div className="mt-2 pt-2 border-t border-indigo-700/30">
                              <div className="flex gap-4 text-xs">
                                {tx.kycStatus && (
                                  <div>
                                    <span className="text-gray-400">KYC: </span>
                                    <span className="text-purple-300">{tx.kycStatus}</span>
                                  </div>
                                )}
                                {tx.kycLevel && (
                                  <div>
                                    <span className="text-gray-400">레벨: </span>
                                    <span className="text-purple-300">{tx.kycLevel}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 지갑 주소와 트랜잭션 해시 */}
                          {(tx.walletAddress || tx.txHash) && (
                            <div className="mt-2 pt-2 border-t border-indigo-700/30">
                              {tx.walletAddress && (
                                <div className="mb-1">
                                  <div className="text-gray-400 text-xs">지갑 주소</div>
                                  <div className="text-cyan-300 font-mono text-xs break-all">
                                    {tx.walletAddress}
                                  </div>
                                </div>
                              )}
                              {tx.txHash && (
                                <div>
                                  <div className="text-gray-400 text-xs">트랜잭션 해시</div>
                                  <div className="text-cyan-300 font-mono text-xs break-all">
                                    {tx.txHash}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* 더 많은 히스토리가 있으면 표시 */}
                      {purchaseHistory.length > 3 && (
                        <div className="text-center">
                          <button
                            onClick={() => window.location.href = '/purchase/history'}
                            className="text-xs text-gray-500 hover:text-gray-400 underline"
                          >
                            +{purchaseHistory.length - 3}개 더 보기 (히스토리 페이지에서)
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2 bg-gray-600/20 border border-gray-600/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">ℹ️</span>
                        <div className="text-sm">
                          <p className="text-gray-300 font-medium">구매 히스토리 없음</p>
                          <p className="text-gray-400 text-xs">
                            첫 구매를 진행하시면 히스토리가 표시됩니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        )}

        {/* 프로바이더 상태 */}
        <Card className="bg-[#23242A] border-gray-700 mb-2">
          <div className="p-1">
            <h3 className="text-sm font-medium text-gray-400 mb-2">결제 프로바이더 상태</h3>

            {providerStatusLoading && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full"></div>
                <span className="text-sm">상태 확인 중...</span>
              </div>
            )}

            {providerStatusError && (
              <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">❌</span>
                  <div className="text-sm">
                    <p className="text-red-300 font-medium">프로바이더 상태를 확인할 수 없습니다</p>
                    <p className="text-red-200/80 text-sm">
                      구매 서비스에 연결할 수 없습니다. 네트워크 연결을 확인하고 다시 시도해주세요.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {providerStatus && !providerStatusLoading && !providerStatusError && (
              <>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(providerStatus.providers || {}).map(([provider, status]: [string, any]) => (
                    <div key={provider} className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                      status.available ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        status.available ? 'bg-green-300' : 'bg-red-300'
                      }`}></span>
                      {provider.toUpperCase()}: {status.available ? '사용가능' : '사용불가'}
                    </div>
                  ))}
                </div>
                {/* 모든 프로바이더가 사용불가인 경우 안내 메시지 */}
                {providerStatus.providers &&
                 Object.values(providerStatus.providers).every((p: any) => !p.available) && (
                  <div className="mt-3 p-3 bg-yellow-600/20 border border-yellow-600/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">⚠️</span>
                      <div className="text-sm">
                        <p className="text-yellow-300 font-medium">현재 모든 결제 서비스를 사용할 수 없습니다</p>
                        <p className="text-yellow-200/80 text-sm">
                          서비스 점검 중이거나 일시적인 문제가 발생했을 수 있습니다. 잠시 후 다시 시도해주세요.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {step === 'quote' && (
          <>
            {/* 구매할 코인 선택 */}
            <Card className="bg-[#23242A] border-gray-700 mb-2">
              <div className="p-1">
                <h3 className="text-sm font-medium text-gray-400 mb-2">구매할 암호화폐</h3>

                {currenciesLoading ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full"></div>
                    <span className="text-sm">가상화폐 목록 로딩 중...</span>
                  </div>
                ) : currenciesError ? (
                  <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">❌</span>
                      <div className="text-sm">
                        <p className="text-red-300 font-medium">가상화폐 목록을 불러올 수 없습니다</p>
                        <p className="text-red-200/80 text-sm">
                          네트워크 연결을 확인하고 다시 시도해주세요.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : currencies && Object.keys(currencies).length > 0 ? (
                  <>
                    <Select
                      options={(() => {
                        // 선택된 법정화폐에 따른 가상자산 필터링 (향후 확장용)
                        const filteredCurrencies = filterCryptocurrenciesByFiat(
                          Object.entries(currencies).map(([symbol, currency]) => ({
                            ...currency,
                            code: symbol,
                            symbol
                          })),
                          fiatCurrency
                        );

                        const allCurrencies = filteredCurrencies.map((currency) => {
                          // 화폐 이름 매핑
                          const currencyNames = {
                            'BTC': 'Bitcoin',
                            'ETH': 'Ethereum',
                            'USDT': 'Tether',
                            'USDC': 'USD Coin',
                            'SOL': 'Solana',
                            'MATIC': 'Polygon',
                            'ADA': 'Cardano',
                            'DOT': 'Polkadot',
                            'LINK': 'Chainlink'
                          };

                          return {
                            value: currency.symbol,  // 원본 symbol 그대로 사용
                            label: `${currencyNames[currency.symbol.toUpperCase()] || currency.name || currency.symbol.toUpperCase()} (${currency.symbol.toUpperCase()})`,
                            icon: createCoinIcon(currency.symbol.toUpperCase()),
                            subtitle: currency.providers ? `${Object.keys(currency.providers).length}개 프로바이더 지원` : '가능'
                          };
                        });

                        // BTC, ETH를 최상위로 이동 (대소문자 구분 없이 비교)
                        const priorityCurrencies = ['BTC', 'ETH'];
                        const priority = allCurrencies.filter(option =>
                          priorityCurrencies.includes(option.value.toUpperCase())
                        );
                        const others = allCurrencies.filter(option =>
                          !priorityCurrencies.includes(option.value.toUpperCase())
                        );

                        // BTC, ETH 순서로 정렬 후 나머지는 기존 순서 유지
                        const sortedPriority = priority.sort((a, b) => {
                          const order = { 'BTC': 0, 'ETH': 1 };
                          const aKey = a.value.toUpperCase();
                          const bKey = b.value.toUpperCase();
                          return (order[aKey] || 999) - (order[bKey] || 999);
                        });

                        return [...sortedPriority, ...others];
                      })()
                      }
                      value={selectedCurrency}
                      onChange={(value) => {
                        console.log('🟦 [User Action] Currency selected from dropdown:', value);
                        setSelectedCurrency(value);
                      }}
                      placeholder="가상화폐를 선택하세요"
                      className="w-full"
                    />
                  </>
                ) : (
                  <div className="p-3 bg-gray-600/20 border border-gray-600/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">ℹ️</span>
                      <div className="text-sm">
                        <p className="text-gray-300 font-medium">사용 가능한 가상화폐가 없습니다</p>
                        <p className="text-gray-400 text-sm">
                          공급자에서 지원하는 가상화폐가 없습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* 결제 통화 선택 */}
            <Card className="bg-[#23242A] border-gray-700 mb-2">
              <div className="p-1">
                <h3 className="text-sm font-medium text-gray-400 mb-2">결제 통화</h3>
                <Select
                  options={getSupportedFiatCurrencies().map(fiat => ({
                    value: fiat.code,
                    label: `${fiat.name} (${fiat.code})`,
                    subtitle: fiat.symbol,
                    // MoonPay 데이터가 있으면 표시
                    description: fiat.moonPayData ? `✓ MoonPay 지원` : '기본 설정'
                  }))}
                  value={fiatCurrency}
                  onChange={(value) => {
                    console.log('🟦 [User Action] Fiat currency changed:', value);
                    setFiatCurrency(value);
                  }}
                  placeholder="결제 통화 선택"
                />
              </div>
            </Card>

            {/* 국가 선택 */}
            <Card className="bg-[#23242A] border-gray-700 mb-2">
              <div className="p-1">
                <h3 className="text-sm font-medium text-gray-400 mb-2">국가 선택</h3>

                {countriesLoading ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full"></div>
                    <span className="text-sm">국가 목록 로딩 중...</span>
                  </div>
                ) : countriesError ? (
                  <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">❌</span>
                      <div className="text-sm">
                        <p className="text-red-300 font-medium">국가 목록을 불러올 수 없습니다</p>
                        <p className="text-red-200/80 text-sm">
                          네트워크 연결을 확인하고 다시 시도해주세요.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : countries && countries.length > 0 ? (
                  <>
                    <Select
                      options={countries.map((country: any) => ({
                        value: country.alpha2,
                        label: country.name,
                        subtitle: `${country.alpha2} • ${country.alpha3}`,
                        description: country.isAllowed
                          ? (country.isBuyAllowed ? '✓ 구매 가능' : '구매 제한')
                          : '❌ 사용 불가'
                      }))}
                      value={selectedCountry}
                      onChange={(value) => {
                        console.log('🟦 [User Action] Country selected from dropdown:', value);
                        setSelectedCountry(value);
                      }}
                      placeholder="국가를 선택하세요"
                      className="w-full"
                    />
                  </>
                ) : (
                  <div className="p-3 bg-gray-600/20 border border-gray-600/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">ℹ️</span>
                      <div className="text-sm">
                        <p className="text-gray-300 font-medium">사용 가능한 국가가 없습니다</p>
                        <p className="text-gray-400 text-sm">
                          MoonPay에서 지원하는 국가가 없습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* 선택된 국가 상세 정보 - 실제 MoonPay API 데이터 */}
            {selectedCountry && countries && (() => {
              const selectedCountryData = countries.find((country: any) => country.alpha2 === selectedCountry);

              if (!selectedCountryData) return null;

              return (
                <Card className="bg-[#23242A] border-gray-700 mb-2">
                  <div className="p-1">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">선택된 국가 정보</h3>

                    {/* 기본 정보 */}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div className="bg-gray-800/30 p-2 rounded">
                        <div className="text-gray-400 text-xs">국가 이름</div>
                        <div className="text-white font-medium">{selectedCountryData.name}</div>
                      </div>
                      <div className="bg-gray-800/30 p-2 rounded">
                        <div className="text-gray-400 text-xs">국가 코드</div>
                        <div className="text-white font-medium">{selectedCountryData.alpha2} / {selectedCountryData.alpha3}</div>
                      </div>
                      <div className="bg-gray-800/30 p-2 rounded">
                        <div className="text-gray-400 text-xs">MoonPay 지원</div>
                        <div className={selectedCountryData.isAllowed ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                          {selectedCountryData.isAllowed ? "✅ 지원" : "❌ 미지원"}
                        </div>
                      </div>
                      <div className="bg-gray-800/30 p-2 rounded">
                        <div className="text-gray-400 text-xs">구매 가능</div>
                        <div className={selectedCountryData.isBuyAllowed ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                          {selectedCountryData.isBuyAllowed ? "✅ 가능" : "❌ 불가능"}
                        </div>
                      </div>
                    </div>

                    {/* 서비스 지원 상태 */}
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded p-2 mb-3">
                      <div className="text-blue-300 text-xs font-medium mb-1">서비스 지원 상태</div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>• 구매 서비스: <span className={selectedCountryData.isBuyAllowed ? "text-green-400" : "text-red-400"}>{selectedCountryData.isBuyAllowed ? '✓ 지원' : '✗ 미지원'}</span></div>
                        <div>• 판매 서비스: <span className={selectedCountryData.isSellAllowed ? "text-green-400" : "text-red-400"}>{selectedCountryData.isSellAllowed ? '✓ 지원' : '✗ 미지원'}</span></div>
                        <div>• 전체 허용: <span className={selectedCountryData.isAllowed ? "text-green-400" : "text-red-400"}>{selectedCountryData.isAllowed ? '✓ 허용' : '✗ 제한'}</span></div>
                      </div>
                    </div>

                    {/* KYC 및 신원확인 문서 */}
                    {selectedCountryData.supportedDocuments && selectedCountryData.supportedDocuments.length > 0 && (
                      <div className="bg-orange-900/20 border border-orange-700/30 rounded p-2 mb-3">
                        <div className="text-orange-300 text-xs font-medium mb-1">지원 신원확인 문서</div>
                        <div className="text-xs text-gray-300">
                          <div className="grid grid-cols-1 gap-1">
                            {selectedCountryData.supportedDocuments.map((doc: any, index: number) => (
                              <div key={index} className="bg-gray-800/30 p-1 rounded">
                                <div className="text-orange-300 font-medium">{doc.name}</div>
                                {doc.description && <div className="text-gray-400 text-xs">{doc.description}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 추가 제한사항 또는 특별 정보 */}
                    <div className="bg-purple-900/20 border border-purple-700/30 rounded p-2">
                      <div className="text-purple-300 text-xs font-medium mb-1">MoonPay 국가 정보</div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>• 국가 코드: <span className="text-purple-300">{selectedCountryData.alpha2}</span> (ISO 3166-1 alpha-2)</div>
                        <div>• 확장 코드: <span className="text-purple-300">{selectedCountryData.alpha3}</span> (ISO 3166-1 alpha-3)</div>
                        <div>• 데이터 소스: <span className="text-green-400">MoonPay /v3/countries API</span></div>
                        {selectedCountryData.supportedDocuments && (
                          <div>• KYC 문서 종류: <span className="text-yellow-400">{selectedCountryData.supportedDocuments.length}개 지원</span></div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* 선택된 법정화폐 속성 정보 - 실제 MoonPay API 데이터 */}
            {fiatCurrency && (() => {
              const supportedFiats = getSupportedFiatCurrencies();
              const selectedFiat = supportedFiats.find(f => f.code === fiatCurrency);

              if (!selectedFiat) return null;

              return (
                <Card className="bg-[#23242A] border-gray-700 mb-2">
                  <div className="p-1">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">선택된 결제 통화 정보</h3>

                    {/* 기본 정보 */}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div className="bg-gray-800/30 p-2 rounded">
                        <div className="text-gray-400 text-xs">통화 코드</div>
                        <div className="text-white font-medium">{fiatCurrency}</div>
                      </div>
                      <div className="bg-gray-800/30 p-2 rounded">
                        <div className="text-gray-400 text-xs">통화 이름</div>
                        <div className="text-white font-medium">
                          {selectedFiat.moonPayData ? selectedFiat.moonPayData.name : selectedFiat.name}
                        </div>
                      </div>
                      <div className="bg-gray-800/30 p-2 rounded">
                        <div className="text-gray-400 text-xs">통화 기호</div>
                        <div className="text-white font-medium">{selectedFiat.symbol}</div>
                      </div>
                      <div className="bg-gray-800/30 p-2 rounded">
                        <div className="text-gray-400 text-xs">소수점 자릿수</div>
                        <div className="text-white font-medium">
                          {selectedFiat.moonPayData ? `${selectedFiat.moonPayData.precision}자리` : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* MoonPay 시스템 정보 */}
                    {selectedFiat.moonPayData && (
                      <div className="bg-blue-900/20 border border-blue-700/30 rounded p-2 mb-3">
                        <div className="text-blue-300 text-xs font-medium mb-1">MoonPay 시스템 정보</div>
                        <div className="text-xs text-gray-300 space-y-1">
                          <div>• MoonPay ID: <span className="text-blue-300 font-mono">{selectedFiat.moonPayData.id}</span></div>
                          <div>• 등록일: <span className="text-green-300">{new Date(selectedFiat.moonPayData.createdAt).toLocaleDateString('ko-KR')}</span></div>
                          <div>• 최종 수정: <span className="text-yellow-300">{new Date(selectedFiat.moonPayData.updatedAt).toLocaleDateString('ko-KR')}</span></div>
                          <div>• 데이터 상태: <span className="text-green-400">✓ MoonPay API 동기화됨</span></div>
                        </div>
                      </div>
                    )}

                    {/* 구매 한도 - 실제 MoonPay API 데이터 */}
                    {selectedFiat.moonPayData && (
                      <div className="bg-orange-900/20 border border-orange-700/30 rounded p-2 mb-3">
                        <div className="text-orange-300 text-xs font-medium mb-1">구매 한도 (MoonPay 실제 데이터)</div>
                        <div className="text-xs text-gray-300">
                          <div>• 최소: <span className="text-orange-300">{selectedFiat.symbol}{selectedFiat.moonPayData.minBuyAmount?.toLocaleString() || 'N/A'}</span></div>
                          <div>• 최대: <span className="text-orange-300">{selectedFiat.symbol}{selectedFiat.moonPayData.maxBuyAmount?.toLocaleString() || 'N/A'}</span></div>
                          <div>• 정밀도: {selectedFiat.moonPayData.precision || 2}자리</div>
                          <div>• 판매 지원: {selectedFiat.moonPayData.isSellSupported ? '✓' : '✗'}</div>
                        </div>
                      </div>
                    )}

                    {/* 지역 제한 - 실제 MoonPay API 데이터 */}
                    {selectedFiat.moonPayData && selectedFiat.moonPayData.notAllowedCountries && selectedFiat.moonPayData.notAllowedCountries.length > 0 && (
                      <div className="bg-red-900/20 border border-red-700/30 rounded p-2 mb-3">
                        <div className="text-red-300 text-xs font-medium mb-1">지역 제한 (MoonPay 데이터)</div>
                        <div className="text-xs text-gray-300">
                          <div>제한 국가: {selectedFiat.moonPayData.notAllowedCountries.join(', ')}</div>
                        </div>
                      </div>
                    )}

                    {/* MoonPay API 쿼리 파라미터 정보 */}
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded p-2 mb-3">
                      <div className="text-blue-300 text-xs font-medium mb-1">MoonPay API 설정</div>
                      <div className="text-xs text-gray-300">
                        <div>• baseCurrencyCode: <span className="text-blue-300">{fiatCurrency.toLowerCase()}</span></div>
                        <div>• baseCurrencyAmount: 사용자 입력 금액</div>
                        <div>• paymentMethod: credit_debit_card (기본값)</div>
                        <div>• 데이터 소스: {selectedFiat.moonPayData ? 'MoonPay /v3/currencies API' : '기본값'}</div>
                      </div>
                    </div>

                    {/* 추가 API 정보 */}
                    <div className="bg-purple-900/20 border border-purple-700/30 rounded p-2">
                      <div className="text-purple-300 text-xs font-medium mb-1">사용 가능한 MoonPay API</div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>• <span className="text-green-400">GET /v3/currencies</span> - 지원 통화 목록 (현재 사용 중)</div>
                        <div>• <span className="text-blue-400">GET /v3/countries</span> - 지원 국가 목록</div>
                        <div>• <span className="text-yellow-400">GET /v3/currencies/{fiatCurrency.toLowerCase()}/buy_quote</span> - 실시간 견적</div>
                        <div>• <span className="text-purple-400">GET /v3/currencies/{fiatCurrency.toLowerCase()}/limits</span> - 구매 한도</div>
                        <div>• <span className="text-cyan-400">GET /v4/ip_address</span> - 지역 감지</div>
                        <div className="text-yellow-400 mt-2">⚡ 모든 데이터는 실시간 API에서 가져옵니다</div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* 선택된 가상화폐 속성 정보 - 실제 MoonPay API 데이터 */}
            {selectedCurrency && currencies && (() => {
              const cryptoCurrencyData = Object.entries(currencies).find(([symbol, currency]: [string, any]) =>
                currency.code === selectedCurrency.toLowerCase() && currency.type === 'crypto'
              );

              if (!cryptoCurrencyData) return null;

              const [symbol, cryptoData] = cryptoCurrencyData;

              return (
                <Card className="bg-[#23242A] border-gray-700 mb-2">
                  <div className="p-1">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">선택된 가상화폐 정보</h3>

                    {/* 기본 정보 */}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div className="bg-gray-800/30 p-2 rounded">
                        <div className="text-gray-400 text-xs">통화 코드</div>
                        <div className="text-white font-medium">{selectedCurrency}</div>
                      </div>
                      <div className="bg-gray-800/30 p-2 rounded">
                        <div className="text-gray-400 text-xs">통화 이름</div>
                        <div className="text-white font-medium">{cryptoData.name}</div>
                      </div>
                      <div className="bg-gray-800/30 p-2 rounded">
                        <div className="text-gray-400 text-xs">소수점 자릿수</div>
                        <div className="text-white font-medium">{cryptoData.precision}자리</div>
                      </div>
                      <div className="bg-gray-800/30 p-2 rounded">
                        <div className="text-gray-400 text-xs">상태</div>
                        <div className={cryptoData.isSuspended ? "text-red-400 font-medium" : "text-green-400 font-medium"}>
                          {cryptoData.isSuspended ? "❌ 중단됨" : "✅ 활성"}
                        </div>
                      </div>
                    </div>

                    {/* MoonPay 시스템 정보 */}
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded p-2 mb-3">
                      <div className="text-blue-300 text-xs font-medium mb-1">MoonPay 시스템 정보</div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>• MoonPay ID: <span className="text-blue-300 font-mono">{cryptoData.id}</span></div>
                        <div>• 등록일: <span className="text-green-300">{new Date(cryptoData.createdAt).toLocaleDateString('ko-KR')}</span></div>
                        <div>• 최종 수정: <span className="text-yellow-300">{new Date(cryptoData.updatedAt).toLocaleDateString('ko-KR')}</span></div>
                        <div>• 테스트 모드: <span className={cryptoData.supportsTestMode ? "text-green-400" : "text-red-400"}>{cryptoData.supportsTestMode ? '✓ 지원' : '✗ 미지원'}</span></div>
                      </div>
                    </div>

                    {/* 구매/판매 한도 */}
                    <div className="bg-orange-900/20 border border-orange-700/30 rounded p-2 mb-3">
                      <div className="text-orange-300 text-xs font-medium mb-1">구매/판매 한도 (MoonPay 실제 데이터)</div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>• 최소 구매: <span className="text-orange-300">{cryptoData.minBuyAmount} {selectedCurrency}</span></div>
                        <div>• 최대 구매: <span className="text-orange-300">{cryptoData.maxBuyAmount} {selectedCurrency}</span></div>
                        {cryptoData.minSellAmount && (
                          <div>• 최소 판매: <span className="text-green-300">{cryptoData.minSellAmount} {selectedCurrency}</span></div>
                        )}
                        {cryptoData.maxSellAmount && (
                          <div>• 최대 판매: <span className="text-green-300">{cryptoData.maxSellAmount} {selectedCurrency}</span></div>
                        )}
                        <div>• 판매 지원: <span className={cryptoData.isSellSupported ? "text-green-400" : "text-red-400"}>{cryptoData.isSellSupported ? '✓ 지원' : '✗ 미지원'}</span></div>
                      </div>
                    </div>

                    {/* 지역 제한 정보 */}
                    {(cryptoData.notAllowedCountries?.length > 0 || cryptoData.notAllowedUSStates?.length > 0) && (
                      <div className="bg-red-900/20 border border-red-700/30 rounded p-2 mb-3">
                        <div className="text-red-300 text-xs font-medium mb-1">지역 제한 (MoonPay 데이터)</div>
                        <div className="text-xs text-gray-300 space-y-1">
                          {cryptoData.notAllowedCountries?.length > 0 && (
                            <div>제한 국가: <span className="text-red-300">{cryptoData.notAllowedCountries.join(', ')}</span></div>
                          )}
                          {cryptoData.notAllowedUSStates?.length > 0 && (
                            <div>제한 미국 주: <span className="text-red-300">{cryptoData.notAllowedUSStates.join(', ')}</span></div>
                          )}
                          <div>미국 지원: <span className={cryptoData.isSupportedInUs ? "text-green-400" : "text-red-400"}>{cryptoData.isSupportedInUs ? '✓ 지원' : '✗ 미지원'}</span></div>
                        </div>
                      </div>
                    )}

                    {/* 블록체인 기술 정보 */}
                    {cryptoData.metadata && (
                      <div className="bg-purple-900/20 border border-purple-700/30 rounded p-2 mb-3">
                        <div className="text-purple-300 text-xs font-medium mb-1">블록체인 기술 정보</div>
                        <div className="text-xs text-gray-300 space-y-1">
                          {cryptoData.metadata.networkCode && (
                            <div>• 네트워크: <span className="text-purple-300">{cryptoData.metadata.networkCode}</span></div>
                          )}
                          {cryptoData.metadata.chainId && (
                            <div>• 체인 ID: <span className="text-purple-300">{cryptoData.metadata.chainId}</span></div>
                          )}
                          {cryptoData.metadata.contractAddress && (
                            <div>• 컨트랙트: <span className="text-purple-300 font-mono">{cryptoData.metadata.contractAddress}</span></div>
                          )}
                          <div>• 주소 태그 지원: <span className={cryptoData.supportsAddressTag ? "text-green-400" : "text-gray-400"}>{cryptoData.supportsAddressTag ? '✓ 지원' : '✗ 미지원'}</span></div>
                        </div>
                      </div>
                    )}

                    {/* 주소 검증 정보 */}
                    {cryptoData.addressRegex && (
                      <div className="bg-green-900/20 border border-green-700/30 rounded p-2 mb-3">
                        <div className="text-green-300 text-xs font-medium mb-1">주소 검증 정보</div>
                        <div className="text-xs text-gray-300 space-y-1">
                          <div>• 메인넷 주소 패턴:</div>
                          <div className="text-green-300 font-mono text-xs bg-gray-800/50 p-1 rounded">{cryptoData.addressRegex}</div>
                          {cryptoData.testnetAddressRegex && (
                            <>
                              <div>• 테스트넷 주소 패턴:</div>
                              <div className="text-yellow-300 font-mono text-xs bg-gray-800/50 p-1 rounded">{cryptoData.testnetAddressRegex}</div>
                            </>
                          )}
                          {cryptoData.addressTagRegex && (
                            <>
                              <div>• 주소 태그 패턴:</div>
                              <div className="text-blue-300 font-mono text-xs bg-gray-800/50 p-1 rounded">{cryptoData.addressTagRegex}</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* 구매 금액 */}
            <Card className="bg-[#23242A] border-gray-700 mb-2">
              <div className="p-1">
                <h3 className="text-sm font-medium text-gray-400 mb-2">구매 금액 ({fiatCurrency})</h3>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    console.log('🟦 [User Action] Amount input changed:', e.target.value);
                    setAmount(e.target.value);
                  }}
                  placeholder="구매할 금액을 입력하세요"
                  className="w-full"
                  min="1"
                  step="1"
                />
                <div className="flex gap-2 mt-2">
                  {[50, 100, 200, 500].map(preset => (
                    <button
                      key={preset}
                      onClick={() => {
                        console.log('🟦 [User Action] Preset amount selected:', preset);
                        setAmount(preset.toString());
                      }}
                      className="px-2 py-0.5 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* 암호화폐 받을 주소 */}
            <Card className="bg-[#23242A] border-gray-700 mb-2">
              <div className="p-1">
                <h3 className="text-sm font-medium text-gray-400 mb-2">
                  {selectedCurrency ? `${selectedCurrency.toUpperCase()} 받을 주소` : '암호화폐 받을 주소'}
                </h3>
                <Input
                  type="text"
                  value={getWalletAddressForCurrency(selectedCurrency) || ''}
                  onChange={(e) => {
                    // 필요시 수동으로 주소 변경 가능하도록 처리
                    console.log('🟦 [User Action] Receiving address changed:', e.target.value);
                  }}
                  placeholder={selectedCurrency ?
                    `${selectedCurrency.toUpperCase()} 지갑 주소를 입력하세요` :
                    '먼저 구매할 암호화폐를 선택하세요'
                  }
                  className="w-full font-mono text-sm"
                  readOnly={true} // 자동으로만 입력되도록 설정
                />
                {selectedCurrency && getWalletAddressForCurrency(selectedCurrency) && (
                  <p className="text-sm text-gray-500 mt-2">
                    * 자동 입력됨
                  </p>
                )}
                {selectedCurrency && !getWalletAddressForCurrency(selectedCurrency) && (
                  <p className="text-sm text-yellow-500 mt-2">
                    ⚠️ 주소 없음
                  </p>
                )}
              </div>
            </Card>

            {/* 견적 조회 버튼 */}
            <Button
              onClick={handleGetQuotes}
              disabled={
                quotesLoading ||
                !amount ||
                parseFloat(amount) <= 0 ||
                providerStatusError ||
                providerStatusLoading ||
                (providerStatus?.providers && Object.values(providerStatus.providers).every((p: any) => !p.available))
              }
              className={`w-full font-bold mt-2 ${
                (providerStatusError ||
                 providerStatusLoading ||
                 (providerStatus?.providers && Object.values(providerStatus.providers).every((p: any) => !p.available)))
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-[#F2A003] hover:bg-[#F2A003]/80 text-black'
              }`}
            >
              {quotesLoading
                ? '견적 조회 중...'
                : providerStatusError
                  ? '서비스 연결 실패'
                  : providerStatusLoading
                    ? '상태 확인 중...'
                    : (providerStatus?.providers && Object.values(providerStatus.providers).every((p: any) => !p.available))
                      ? '결제 서비스 사용불가'
                      : '견적 조회'
              }
            </Button>

            {/* 견적 결과 */}
            {quotes && (
              <Card className="bg-[#23242A] border-gray-700">
                <div className="p-1">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">최적 견적</h3>

                  {/* 추천 견적 */}
                  {quotes.recommended && (
                    <div className="bg-[#F2A003]/10 border border-[#F2A003]/30 rounded-lg p-3 mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[#F2A003] font-bold text-sm">🏆 추천</span>
                        <span className="text-sm bg-[#F2A003] text-black px-2 py-1 rounded">
                          {quotes.recommended.providerId.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-white font-bold">
                        {quotes.recommended.cryptoAmount} {selectedCurrency}
                      </div>
                      <div className="text-gray-400 text-sm space-y-1">
                        <div>총 비용: <span className="text-white">{getFiatSymbol(fiatCurrency)}{quotes.recommended.totalCost}</span></div>
                        <div>기본 수수료: <span className="text-orange-300">{getFiatSymbol(fiatCurrency)}{quotes.recommended.baseFee.toFixed(2)}</span></div>
                        <div>네트워크 수수료: <span className="text-blue-300">
                          {(() => {
                            const networkFee = getNetworkFee(selectedCurrency, fiatCurrency);
                            if (networkFee !== null) {
                              return `${getFiatSymbol(fiatCurrency)}${networkFee.toFixed(2)}`;
                            } else {
                              return '별도';
                            }
                          })()}
                        </span></div>
                        <div>환율: 1 {selectedCurrency} = <span className="text-green-300">{getFiatSymbol(fiatCurrency)}{quotes.recommended.exchangeRate?.toFixed(2)}</span></div>
                        <div>소요시간: <span className="text-purple-300">{quotes.recommended.processingTime}</span></div>
                        {quotes.recommended.additionalInfo && (
                          <div className="mt-2 p-2 bg-gray-800/40 rounded text-xs">
                            <div className="text-blue-300 font-medium mb-1">MoonPay API 상세 정보</div>
                            {quotes.recommended.additionalInfo.moonPayQuoteId && (
                              <div className="text-gray-500">견적ID: {quotes.recommended.additionalInfo.moonPayQuoteId}</div>
                            )}
                            {quotes.recommended.additionalInfo.networkFee && (
                              <div className="text-yellow-400">네트워크 수수료: {getFiatSymbol(fiatCurrency)}{quotes.recommended.additionalInfo.networkFee}</div>
                            )}
                            {quotes.recommended.additionalInfo.extraFee && (
                              <div className="text-red-400">추가 수수료: {getFiatSymbol(fiatCurrency)}{quotes.recommended.additionalInfo.extraFee}</div>
                            )}
                            {quotes.recommended.additionalInfo.rate && (
                              <div className="text-green-400">실시간 환율: {quotes.recommended.additionalInfo.rate}</div>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleCreateTransaction(quotes.recommended.providerId)}
                        className="w-full mt-2 bg-[#F2A003] hover:bg-[#F2A003]/80 text-black font-bold"
                        disabled={createTransactionMutation.isPending}
                      >
                        구매하기
                      </Button>
                    </div>
                  )}

                  {/* 대안 견적들 */}
                  {quotes.alternatives && quotes.alternatives.length > 0 && (
                    <>
                      <h4 className="text-sm text-gray-400">다른 옵션</h4>
                      {quotes.alternatives.map((quote: any, index: number) => (
                        <div key={index} className="bg-gray-700/30 rounded-lg p-3 mb-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm bg-gray-600 text-white px-2 py-1 rounded">
                              {quote.providerId.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-white font-medium">
                            {quote.cryptoAmount} {selectedCurrency}
                          </div>
                          <div className="text-gray-400 text-sm space-y-1">
                            <div>총 비용: <span className="text-white">{getFiatSymbol(fiatCurrency)}{quote.totalCost}</span></div>
                            <div>기본 수수료: <span className="text-orange-300">{getFiatSymbol(fiatCurrency)}{quote.baseFee.toFixed(2)}</span></div>
                            <div>환율: 1 {selectedCurrency} = <span className="text-green-300">{getFiatSymbol(fiatCurrency)}{quote.exchangeRate?.toFixed(2)}</span></div>
                            <div>소요시간: <span className="text-purple-300">{quote.processingTime}</span></div>
                          </div>
                          <Button
                            onClick={() => handleCreateTransaction(quote.providerId)}
                            className="w-full mt-2 bg-gray-600 hover:bg-gray-500 text-white"
                            disabled={createTransactionMutation.isPending}
                          >
                            선택하기
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </Card>
            )}
          </>
        )}

        {step === 'processing' && (
          <Card className="bg-[#23242A] border-gray-700">
            <div className="px-3 py-2 text-center">
              <div className="animate-spin w-5 h-5 border-4 border-[#F2A003] border-t-transparent rounded-full mx-auto"></div>
              <h3 className="text-sm font-bold text-white">거래 생성 중...</h3>
              <p className="text-gray-400">잠시만 기다려주세요.</p>
            </div>
          </Card>
        )}

        {step === 'complete' && transactionId && quotes?.recommended && (
          <Card className="bg-[#23242A] border-gray-700">
            <div className="px-3 py-2 text-center">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                ✓
              </div>
              <h3 className="text-sm font-bold text-white">구매 정보</h3>

              {/* 구매 정보 요약 */}
              <div className="bg-gray-800/50 rounded-lg px-2 py-1 text-left">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">결제 금액</span>
                    <span className="text-white font-semibold">
                      {getFiatSymbol(fiatCurrency)}{amount} {fiatCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">구매 암호화폐</span>
                    <span className="text-white font-semibold">
                      {quotes.recommended.cryptoAmount.toFixed(6)} {selectedCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">환율</span>
                    <span className="text-gray-300 text-sm">
                      1 {selectedCurrency} = ${quotes.recommended.exchangeRate.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">수수료 포함 총액</span>
                      <span className="text-[#F2A003] font-bold">
                        {getFiatSymbol(fiatCurrency)}{quotes.recommended.totalCost.toFixed(2)} {fiatCurrency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-6">
                MoonPay 결제창이 새 브라우저에서 열렸습니다.<br/>
                결제를 완료하면 암호화폐가 지갑으로 전송됩니다.
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={() => window.location.href = '/purchase/history'}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white"
                >
                  히스토리 보기
                </Button>
                <Button
                  onClick={() => {
                    setStep('quote');
                    setTransactionId(null);
                  }}
                  className="flex-1 bg-[#F2A003] hover:bg-[#F2A003]/80 text-black font-bold"
                >
                  새 구매하기
                </Button>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}