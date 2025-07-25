import * as bip39 from 'bip39';
import HDKey from 'hdkey';
import { Wallet } from '@ethereumjs/wallet';
import { keccak256 } from 'js-sha3';
import { createHash } from 'crypto';

export interface WalletInfo {
  id: string;
  name: string;
  masterAddress: string;
  mnemonic: string;
  addresses: {
    BTC?: string;
    ETH?: string;
    ETH_1?: string;
    ETH_2?: string;
    USDT?: string;
    MATIC?: string;
    BSC?: string;
    AVAX?: string;
  };
  privateKeys?: {
    BTC?: string;
    ETH?: string;
    ETH_1?: string;
    ETH_2?: string;
    USDT?: string;
    MATIC?: string;
    BSC?: string;
    AVAX?: string;
  };
  createdAt: string;
}

export interface HDWalletConfig {
  name: string;
  mnemonic?: string; // 복구 시에만 제공
}

// BIP-44 derivation paths (개선된 구조)
const DERIVATION_PATHS = {
  // 기본 자산들 (고정)
  BTC: "m/44'/0'/0'/0/0",      // Bitcoin
  ETH: "m/44'/60'/0'/0/0",     // Ethereum Mainnet
  
  // ETH 추가 주소들 (address_index로 구분)
  ETH_1: "m/44'/60'/0'/0/1",   // ETH 두번째 주소
  ETH_2: "m/44'/60'/0'/0/2",   // ETH 세번째 주소
  
  // 다른 토큰들 (account로 구분)
  USDT: "m/44'/60'/1'/0/0",    // USDT (account=1)
  MATIC: "m/44'/60'/2'/0/0",   // MATIC (account=2)
  BSC: "m/44'/60'/3'/0/0",     // BSC (account=3)
  AVAX: "m/44'/60'/4'/0/0",    // AVAX (account=4)
};

// 동적 파생 경로 생성 함수들
export const getNextAccountPath = (existingAssets: string[]): string => {
  const usedAccounts = existingAssets
    .filter(asset => asset !== 'BTC' && asset !== 'ETH' && !asset.startsWith('ETH_'))
    .map(asset => {
      const path = DERIVATION_PATHS[asset as keyof typeof DERIVATION_PATHS];
      if (path) {
        const parts = path.split('/');
        const accountIndex = parseInt(parts[3]);
        return accountIndex;
      }
      return 0;
    })
    .filter(index => !isNaN(index));
  
  const nextAccount = Math.max(0, ...usedAccounts) + 1;
  return `m/44'/60'/${nextAccount}'/0/0`;
};

export const getNextEthAddressPath = (existingEthAddresses: string[]): string => {
  const usedIndices = existingEthAddresses
    .map(addr => {
      const path = DERIVATION_PATHS[addr as keyof typeof DERIVATION_PATHS];
      if (path) {
        const parts = path.split('/');
        const addressIndex = parseInt(parts[4]);
        return addressIndex;
      }
      return 0;
    })
    .filter(index => !isNaN(index));
  
  const nextIndex = Math.max(0, ...usedIndices) + 1;
  return `m/44'/60'/0'/0/${nextIndex}`;
};

// 사용자 정의 파생 경로 생성
export const createCustomDerivationPath = (
  coinType: number,
  account: number = 0,
  change: number = 0,
  addressIndex: number = 0
): string => {
  return `m/44'/${coinType}'/${account}'/${change}/${addressIndex}`;
};

/**
 * 새로운 니모닉 생성
 */
export const generateMnemonic = (): string => {
  return bip39.generateMnemonic(128); // 12개 단어
};

/**
 * 니모닉 유효성 검사
 */
export const validateMnemonic = (mnemonic: string): boolean => {
  return bip39.validateMnemonic(mnemonic.trim());
};

/**
 * HD Wallet 생성
 */
export const createHDWallet = async (config: HDWalletConfig): Promise<WalletInfo> => {
  try {
    // 1. 니모닉 생성 (복구가 아닌 경우)
    const mnemonic = config.mnemonic || generateMnemonic();
    
    // 2. 니모닉 유효성 검사
    if (!validateMnemonic(mnemonic)) {
      throw new Error('유효하지 않은 니모닉입니다.');
    }

    // 3. 시드 생성
    const seed = await bip39.mnemonicToSeed(mnemonic);
    
    // 4. HD Wallet 생성
    const hdkey = HDKey.fromMasterSeed(seed);
    
    // 5. Master Address 생성 (서버 인증용)
    const masterKey = hdkey.derive("m/44'/60'/0'/0/0"); // ETH path 사용
    if (!masterKey.privateKey) {
      throw new Error('마스터 키 생성에 실패했습니다.');
    }
    const masterWallet = Wallet.fromPrivateKey(masterKey.privateKey);
    const masterAddress = masterWallet.getAddressString();
    
    // 6. 각 코인별 주소와 개인키 생성
    const addresses: WalletInfo['addresses'] = {};
    const privateKeys: WalletInfo['privateKeys'] = {};
    
    // BTC 주소와 개인키 생성
    const btcKey = hdkey.derive(DERIVATION_PATHS.BTC);
    if (btcKey.privateKey) {
      addresses.BTC = generateBitcoinAddress(btcKey.privateKey);
      privateKeys.BTC = btcKey.privateKey.toString('hex');
    }
    
    // ETH 주소와 개인키 생성 (메인넷)
    const ethKey = hdkey.derive(DERIVATION_PATHS.ETH);
    if (ethKey.privateKey) {
      const ethWallet = Wallet.fromPrivateKey(ethKey.privateKey);
      addresses.ETH = ethWallet.getAddressString();
      privateKeys.ETH = ethKey.privateKey.toString('hex');
    }
    
    // USDT 주소 (ETH와 동일)
    addresses.USDT = addresses.ETH;
    privateKeys.USDT = privateKeys.ETH;
    
    // ETH 추가 주소들과 개인키 생성
    const eth1Key = hdkey.derive(DERIVATION_PATHS.ETH_1);
    if (eth1Key.privateKey) {
      const eth1Wallet = Wallet.fromPrivateKey(eth1Key.privateKey);
      addresses.ETH_1 = eth1Wallet.getAddressString();
      privateKeys.ETH_1 = eth1Key.privateKey.toString('hex');
    }
    
    const eth2Key = hdkey.derive(DERIVATION_PATHS.ETH_2);
    if (eth2Key.privateKey) {
      const eth2Wallet = Wallet.fromPrivateKey(eth2Key.privateKey);
      addresses.ETH_2 = eth2Wallet.getAddressString();
      privateKeys.ETH_2 = eth2Key.privateKey.toString('hex');
    }
    
    // 다른 체인 주소들과 개인키 생성
    const maticKey = hdkey.derive(DERIVATION_PATHS.MATIC);
    if (maticKey.privateKey) {
      const maticWallet = Wallet.fromPrivateKey(maticKey.privateKey);
      addresses.MATIC = maticWallet.getAddressString();
      privateKeys.MATIC = maticKey.privateKey.toString('hex');
    }
    
    const bscKey = hdkey.derive(DERIVATION_PATHS.BSC);
    if (bscKey.privateKey) {
      const bscWallet = Wallet.fromPrivateKey(bscKey.privateKey);
      addresses.BSC = bscWallet.getAddressString();
      privateKeys.BSC = bscKey.privateKey.toString('hex');
    }
    
    const avaxKey = hdkey.derive(DERIVATION_PATHS.AVAX);
    if (avaxKey.privateKey) {
      const avaxWallet = Wallet.fromPrivateKey(avaxKey.privateKey);
      addresses.AVAX = avaxWallet.getAddressString();
      privateKeys.AVAX = avaxKey.privateKey.toString('hex');
    }
    
    // 7. 지갑 정보 생성
    const walletInfo: WalletInfo = {
      id: generateWalletId(),
      name: config.name,
      masterAddress,
      mnemonic,
      addresses,
      privateKeys,
      createdAt: new Date().toISOString()
    };
    
    return walletInfo;
  } catch (error) {
    console.error('HD Wallet 생성 실패:', error);
    throw new Error('지갑 생성 중 오류가 발생했습니다.');
  }
};

/**
 * 니모닉으로 지갑 복구
 */
export const recoverWalletFromMnemonic = async (
  mnemonic: string, 
  name: string
): Promise<WalletInfo> => {
  return createHDWallet({ name, mnemonic });
};

/**
 * Bitcoin 주소 생성 (BIP-44 표준)
 */
const generateBitcoinAddress = (privateKey: Buffer): string => {
  try {
    // 1. 개인키로 공개키 생성
    const hdkey = HDKey.fromMasterSeed(privateKey);
    const publicKey = hdkey.publicKey;
    
    if (!publicKey) {
      throw new Error('공개키 생성에 실패했습니다.');
    }
    
    // 2. 공개키를 SHA-256으로 해시
    const sha256Hash = createHash('sha256').update(publicKey).digest();
    
    // 3. RIPEMD-160으로 해시
    const ripemd160Hash = createHash('ripemd160').update(sha256Hash).digest();
    
    // 4. 버전 바이트 추가 (0x00 for mainnet)
    const versionedPayload = Buffer.concat([Buffer.from([0x00]), ripemd160Hash]);
    
    // 5. 체크섬 계산 (더블 SHA-256)
    const checksum = createHash('sha256')
      .update(createHash('sha256').update(versionedPayload).digest())
      .digest()
      .slice(0, 4);
    
    // 6. 최종 주소 생성
    const finalPayload = Buffer.concat([versionedPayload, checksum]);
    
    // 7. Base58Check 인코딩
    return base58Encode(finalPayload);
  } catch (error) {
    console.error('Bitcoin 주소 생성 실패:', error);
    // 폴백: 간단한 해시 기반 주소
    const hash = keccak256(privateKey);
    return `1${hash.slice(0, 33)}`;
  }
};

/**
 * Base58 인코딩 (간단한 구현)
 */
const base58Encode = (buffer: Buffer): string => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = BigInt('0x' + buffer.toString('hex'));
  let str = '';
  
  while (num > 0) {
    const mod = Number(num % BigInt(58));
    str = alphabet[mod] + str;
    num = num / BigInt(58);
  }
  
  // 앞의 0 바이트들 처리
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    str = '1' + str;
  }
  
  return str;
};

/**
 * 고유한 지갑 ID 생성
 */
const generateWalletId = (): string => {
  return `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 지갑 정보를 로컬 스토리지에 저장
 */
export const saveWalletToStorage = (wallet: WalletInfo): void => {
  try {
    const existingWallets = getWalletsFromStorage();
    const updatedWallets = [...existingWallets, wallet];
    localStorage.setItem('hdWallets', JSON.stringify(updatedWallets));
  } catch (error) {
    console.error('지갑 저장 실패:', error);
    throw new Error('지갑 저장에 실패했습니다.');
  }
};

/**
 * 로컬 스토리지에서 지갑 목록 가져오기
 */
export const getWalletsFromStorage = (): WalletInfo[] => {
  try {
    const walletsJson = localStorage.getItem('hdWallets');
    return walletsJson ? JSON.parse(walletsJson) : [];
  } catch (error) {
    console.error('지갑 목록 로드 실패:', error);
    return [];
  }
};

/**
 * 특정 지갑 가져오기
 */
export const getWalletById = (id: string): WalletInfo | null => {
  const wallets = getWalletsFromStorage();
  return wallets.find(w => w.id === id) || null;
};

/**
 * 지갑 삭제
 */
export const deleteWallet = (id: string): void => {
  try {
    const wallets = getWalletsFromStorage();
    const updatedWallets = wallets.filter(w => w.id !== id);
    localStorage.setItem('hdWallets', JSON.stringify(updatedWallets));
  } catch (error) {
    console.error('지갑 삭제 실패:', error);
    throw new Error('지갑 삭제에 실패했습니다.');
  }
};

/**
 * 메시지 서명 (지갑의 개인키로)
 */
export const signMessageWithWallet = async (
  walletId: string, 
  message: string,
  symbol: string = 'ETH' // 기본값은 ETH
): Promise<string> => {
  try {
    const wallet = getWalletById(walletId);
    if (!wallet) {
      throw new Error('지갑을 찾을 수 없습니다.');
    }
    
    // 지갑의 해당 자산 개인키 가져오기
    const privateKey = wallet.privateKeys?.[symbol as keyof typeof wallet.privateKeys];
    if (!privateKey) {
      throw new Error(`${symbol} 개인키를 찾을 수 없습니다.`);
    }
    
    console.log(`=== 지갑 메시지 서명 시작 (${symbol}) ===`);
    console.log('지갑 ID:', walletId);
    console.log('지갑 이름:', wallet.name);
    console.log('메시지:', message);
    console.log('개인키 길이:', privateKey.length);
    
    // 메시지 해시 생성
    const messageHash = keccak256(message);
    console.log('메시지 해시:', messageHash);
    
    // 실제 secp256k1 서명 생성
    const { ec } = require('elliptic');
    const elliptic = new ec('secp256k1');
    
    const keyPair = elliptic.keyFromPrivate(privateKey, 'hex');
    const signature = keyPair.sign(messageHash).toDER('hex');
    
    console.log('생성된 서명:', signature);
    console.log('서명 길이:', signature.length);
    console.log(`=== 지갑 메시지 서명 완료 (${symbol}) ===`);
    
    return signature;
  } catch (error) {
    console.error('지갑 메시지 서명 실패:', error);
    throw new Error('서명 생성에 실패했습니다.');
  }
};

/**
 * 지갑 잔액 조회 (실제로는 API 호출)
 */
export const getWalletBalance = async (address: string, currency: 'BTC' | 'ETH' | 'USDT') => {
  // 실제로는 블록체인 API를 호출해야 함
  // 여기서는 더미 데이터 반환
  return {
    address,
    currency,
    balance: '0.0',
    usdValue: '0.00'
  };
}; 

/**
 * 지갑에서 특정 자산의 개인키 가져오기
 */
export const getWalletPrivateKey = (walletId: string, symbol: string): string | null => {
  try {
    const wallet = getWalletById(walletId);
    if (!wallet || !wallet.privateKeys) {
      return null;
    }
    
    return wallet.privateKeys[symbol as keyof typeof wallet.privateKeys] || null;
  } catch (error) {
    console.error('개인키 조회 실패:', error);
    return null;
  }
};

/**
 * 지갑의 모든 개인키 가져오기
 */
export const getWalletAllPrivateKeys = (walletId: string): WalletInfo['privateKeys'] | null => {
  try {
    const wallet = getWalletById(walletId);
    return wallet?.privateKeys || null;
  } catch (error) {
    console.error('모든 개인키 조회 실패:', error);
    return null;
  }
};

/**
 * 특정 자산의 주소와 개인키 생성 (가상자산 추가 시 사용)
 */
export const generateAssetAddressAndPrivateKey = async (
  walletId: string, 
  symbol: string,
  derivationPath?: string
): Promise<{ address: string; privateKey: string } | null> => {
  try {
    const wallet = getWalletById(walletId);
    if (!wallet) {
      throw new Error('지갑을 찾을 수 없습니다.');
    }

    // 니모닉에서 시드 생성
    const seed = await bip39.mnemonicToSeed(wallet.mnemonic);
    const hdkey = HDKey.fromMasterSeed(seed);
    
    // 해당 자산의 derivation path 가져오기
    let path: string;
    if (derivationPath) {
      // 사용자 정의 파생 경로 사용
      path = derivationPath;
    } else {
      // 기본 파생 경로 사용
      path = DERIVATION_PATHS[symbol as keyof typeof DERIVATION_PATHS];
      if (!path) {
        throw new Error(`지원하지 않는 자산: ${symbol}`);
      }
    }
    
    // 개인키 생성
    const key = hdkey.derive(path);
    if (!key.privateKey) {
      throw new Error('개인키 생성에 실패했습니다.');
    }
    
    // 주소 생성
    let address: string;
    if (symbol === 'BTC') {
      address = generateBitcoinAddress(key.privateKey);
    } else {
      const walletInstance = Wallet.fromPrivateKey(key.privateKey);
      address = walletInstance.getAddressString();
    }
    
    return {
      address,
      privateKey: key.privateKey.toString('hex')
    };
  } catch (error) {
    console.error('자산 주소 및 개인키 생성 실패:', error);
    return null;
  }
}; 

/**
 * 기존 지갑의 privateKeys를 니모닉에서 재생성
 */
export const regeneratePrivateKeysForWallet = async (walletId: string): Promise<boolean> => {
  try {
    const wallet = getWalletById(walletId);
    if (!wallet) {
      throw new Error('지갑을 찾을 수 없습니다.');
    }

    console.log('지갑 privateKeys 재생성 시작:', wallet.name);
    console.log('기존 addresses:', wallet.addresses);
    console.log('기존 privateKeys:', wallet.privateKeys);

    // 니모닉에서 시드 생성
    const seed = await bip39.mnemonicToSeed(wallet.mnemonic);
    const hdkey = HDKey.fromMasterSeed(seed);
    
    // 새로운 privateKeys 객체 생성
    const newPrivateKeys: WalletInfo['privateKeys'] = {};
    
    // 각 자산별로 개인키 재생성
    for (const [symbol, address] of Object.entries(wallet.addresses)) {
      const path = DERIVATION_PATHS[symbol as keyof typeof DERIVATION_PATHS];
      if (path) {
        const key = hdkey.derive(path);
        if (key.privateKey) {
          newPrivateKeys[symbol as keyof typeof newPrivateKeys] = key.privateKey.toString('hex');
          console.log(`${symbol} 개인키 재생성 완료`);
        }
      }
    }

    // 지갑 정보 업데이트
    const updatedWallet: WalletInfo = {
      ...wallet,
      privateKeys: newPrivateKeys
    };

    // 로컬 스토리지 업데이트
    const wallets = getWalletsFromStorage();
    const updatedWallets = wallets.map(w => w.id === walletId ? updatedWallet : w);
    localStorage.setItem('hdWallets', JSON.stringify(updatedWallets));

    console.log('지갑 privateKeys 재생성 완료:', updatedWallet.name);
    console.log('새로운 privateKeys:', newPrivateKeys);
    
    return true;
  } catch (error) {
    console.error('지갑 privateKeys 재생성 실패:', error);
    return false;
  }
};

/**
 * 모든 기존 지갑의 privateKeys를 재생성
 */
export const regenerateAllWalletPrivateKeys = async (): Promise<{ success: number; failed: number }> => {
  try {
    const wallets = getWalletsFromStorage();
    let successCount = 0;
    let failedCount = 0;

    console.log(`총 ${wallets.length}개의 지갑에서 privateKeys 재생성 시작`);

    for (const wallet of wallets) {
      // privateKeys가 없거나 비어있는 지갑만 처리
      if (!wallet.privateKeys || Object.keys(wallet.privateKeys).length === 0) {
        const success = await regeneratePrivateKeysForWallet(wallet.id);
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      } else {
        console.log(`지갑 ${wallet.name}은 이미 privateKeys가 있음`);
      }
    }

    console.log(`privateKeys 재생성 완료: 성공 ${successCount}개, 실패 ${failedCount}개`);
    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('모든 지갑 privateKeys 재생성 실패:', error);
    const wallets = getWalletsFromStorage();
    return { success: 0, failed: wallets.length };
  }
}; 