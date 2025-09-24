import * as bip39 from 'bip39';
import HDKey from 'hdkey';
import { Wallet } from '@ethereumjs/wallet';
import { keccak256 } from 'js-sha3';
import { createHash } from 'crypto';
import EC from 'elliptic';
import { ethers } from 'ethers';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const ec = new EC.ec('secp256k1');

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
    SOL?: string;
    USDT?: string;
    MATIC?: string;
    BSC?: string;
    AVAX?: string;
    BASE?: string;
    'ETH-SEPOLIA'?: string;
    'ETH-GOERLI'?: string;
    'BASE-SEPOLIA'?: string;
    'BASE-GOERLI'?: string;
    'SOL-DEVNET'?: string;
    'SOL-TESTNET'?: string;
  };
  privateKeys?: {
    BTC?: string;
    ETH?: string;
    ETH_1?: string;
    ETH_2?: string;
    SOL?: string;
    USDT?: string;
    MATIC?: string;
    BSC?: string;
    AVAX?: string;
    BASE?: string;
    'ETH-SEPOLIA'?: string;
    'ETH-GOERLI'?: string;
    'BASE-SEPOLIA'?: string;
    'BASE-GOERLI'?: string;
    'SOL-DEVNET'?: string;
    'SOL-TESTNET'?: string;
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
  SOL: "m/44'/501'/0'/0/0",    // Solana
  
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
    .filter(asset => asset !== 'BTC' && asset !== 'ETH' && asset !== 'SOL' && !asset.startsWith('ETH_'))
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
    
    // 5. Master Address 생성 (EIP-55 Ethereum 주소)
    const masterKey = hdkey.derive("m/44'/60'/0'/0/0"); // ETH path 사용
    if (!masterKey.privateKey) {
      throw new Error('마스터 키 생성에 실패했습니다.');
    }
    const masterEthWallet = Wallet.fromPrivateKey(masterKey.privateKey);
    const masterAddress = ethers.getAddress(masterEthWallet.getAddressString());
    
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
    
    // SOL 주소와 개인키 생성
    const solKey = hdkey.derive(DERIVATION_PATHS.SOL);
    if (solKey.privateKey) {
      const solData = generateSolanaAddress(solKey.privateKey);
      addresses.SOL = solData.address;
      privateKeys.SOL = solData.privateKey;
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
    const keyPair = ec.keyFromPrivate(privateKey, 'hex');
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
    } else if (symbol.includes('SOL')) {
      // 솔라나 계열 주소 생성 (SOL, SOL-DEVNET, SOL-TESTNET)
      console.log(`솔라나 주소 생성 시작... (${symbol})`);
      try {
        console.log('BIP-44 파생 개인키 크기:', key.privateKey.length, 'bytes');
        
        // BIP-44에서 파생된 32바이트 private key를 솔라나용 32바이트 seed로 사용
        let seed: Uint8Array;
        if (key.privateKey.length >= 32) {
          seed = new Uint8Array(key.privateKey.slice(0, 32));
        } else {
          // 패딩이 필요한 경우
          const padded = Buffer.alloc(32);
          key.privateKey.copy(padded);
          seed = new Uint8Array(padded);
        }
        
        console.log('솔라나 시드 크기:', seed.length, 'bytes');
        
        // ed25519 키페어 생성
        const keypair = nacl.sign.keyPair.fromSeed(seed);
        
        // 솔라나 주소는 public key를 base58로 인코딩
        address = bs58.encode(keypair.publicKey);
        
        // secret key를 JSON 배열 형태로 저장 (솔라나 표준)
        const secretKeyArray = Array.from(keypair.secretKey);
        
        console.log(`솔라나 주소 생성 완료 (${symbol}):`, address);
        console.log('Secret key 배열 길이:', secretKeyArray.length);
        
        // 솔라나는 JSON 배열 형태로 private key를 반환
        return {
          address,
          privateKey: JSON.stringify(secretKeyArray)
        };
      } catch (error) {
        console.error(`솔라나 주소 생성 실패 (${symbol}):`, error);
        throw error;
      }
    } else {
      // 이더리움 계열 주소 생성 (ETH, BASE, ETH-SEPOLIA, BASE-SEPOLIA 등)
      const walletInstance = Wallet.fromPrivateKey(key.privateKey);
      address = walletInstance.getAddressString();
      
      return {
        address,
        privateKey: key.privateKey.toString('hex')
      };
    }
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
      } else if (symbol === 'SOL') {
        // 솔라나는 고정된 derivation path 사용
        const solPath = "m/44'/501'/0'/0/0";
        const key = hdkey.derive(solPath);
        if (key.privateKey) {
          newPrivateKeys.SOL = key.privateKey.toString('hex');
          console.log('SOL 개인키 재생성 완료');
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

/**
 * 기존 지갑들에 솔라나 주소 추가 (마이그레이션)
 */
export const addSolanaToExistingWallets = async (): Promise<{ success: number; failed: number }> => {
  try {
    const wallets = getWalletsFromStorage();
    let successCount = 0;
    let failedCount = 0;

    console.log(`총 ${wallets.length}개의 지갑에 솔라나 주소 추가 시작`);

    for (const wallet of wallets) {
      try {
        // SOL 주소가 이미 있으면 스킵
        if (wallet.addresses.SOL) {
          console.log(`지갑 ${wallet.name}은 이미 SOL 주소가 있음`);
          continue;
        }

        // 니모닉에서 시드 생성
        const seed = await bip39.mnemonicToSeed(wallet.mnemonic);
        const hdkey = HDKey.fromMasterSeed(seed);
        
        // SOL 주소와 개인키 생성
        const solKey = hdkey.derive(DERIVATION_PATHS.SOL);
        if (solKey.privateKey) {
          const solData = generateSolanaAddress(solKey.privateKey);
          
          // 지갑 정보 업데이트
          const updatedWallet: WalletInfo = {
            ...wallet,
            addresses: {
              ...wallet.addresses,
              SOL: solData.address
            },
            privateKeys: {
              ...wallet.privateKeys,
              SOL: solData.privateKey
            }
          };

          // 개별 지갑 업데이트
          const allWallets = getWalletsFromStorage();
          const updatedWallets = allWallets.map(w => w.id === wallet.id ? updatedWallet : w);
          localStorage.setItem('hdWallets', JSON.stringify(updatedWallets));

          console.log(`지갑 ${wallet.name}에 SOL 주소 추가 완료: ${solData.address}`);
          successCount++;
        } else {
          console.error(`지갑 ${wallet.name}의 SOL 개인키 생성 실패`);
          failedCount++;
        }
      } catch (error) {
        console.error(`지갑 ${wallet.name}의 SOL 주소 추가 실패:`, error);
        failedCount++;
      }
    }

    console.log(`솔라나 주소 추가 완료: 성공 ${successCount}개, 실패 ${failedCount}개`);
    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('솔라나 주소 추가 실패:', error);
    const wallets = getWalletsFromStorage();
    return { success: 0, failed: wallets.length };
  }
}; 

/**
 * 솔라나 주소 생성
 */
const generateSolanaAddress = (privateKey: Buffer): { address: string; privateKey: string } => {
  try {
    console.log('솔라나 주소 생성 시작...');
    console.log('개인키 크기:', privateKey.length, 'bytes');
    
    // BIP-44에서 파생된 32바이트 private key를 솔라나용 32바이트 seed로 사용
    let seed: Uint8Array;
    if (privateKey.length >= 32) {
      seed = new Uint8Array(privateKey.slice(0, 32));
    } else {
      // 패딩이 필요한 경우
      const padded = Buffer.alloc(32);
      privateKey.copy(padded);
      seed = new Uint8Array(padded);
    }
    
    console.log('솔라나 시드 크기:', seed.length, 'bytes');
    
    // ed25519 키페어 생성 (deterministic)
    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    
    // 솔라나 주소는 public key를 base58로 인코딩
    const address = bs58.encode(keyPair.publicKey);
    
    // secret key를 JSON 배열 형태로 저장 (솔라나 표준)
    const privateKeyArray = Array.from(keyPair.secretKey);
    
    console.log('솔라나 주소 생성 완료:', address);
    console.log('Secret key 배열 길이:', privateKeyArray.length);
    
    return {
      address,
      privateKey: JSON.stringify(privateKeyArray)
    };
  } catch (error) {
    console.error('솔라나 주소 생성 실패:', error);
    throw new Error('솔라나 주소 생성 중 오류가 발생했습니다.');
  }
};

// EIP-55 전환으로 기존 Base64 공개키 기반 masterAddress 생성 로직 제거

// 지정된 니모닉으로 test-wallet 생성 및 필요한 자산들 추가
export const createTestWalletIfNotExists = async (): Promise<boolean> => {
  try {
    const wallets = getWalletsFromStorage();
    
    // test-wallet이 이미 존재하는지 확인 (개발 중 항상 재생성)
    const existingTestWallet = wallets.find(w => w.name === 'test-wallet');
    if (existingTestWallet) {
      console.log('기존 test-wallet을 삭제하고 새로 생성합니다.');
      // 기존 test-wallet 삭제
      const updatedWallets = wallets.filter(w => w.name !== 'test-wallet');
      localStorage.setItem('hdWallets', JSON.stringify(updatedWallets));
      // 활성화된 자산도 클리어
      localStorage.removeItem('enabledAssets');
      localStorage.removeItem('selectedWalletId');
    }
    
    console.log('=== test-wallet 생성 시작 ===');

    // 지정된 니모닉
    const testMnemonic = 'tuna evil senior ginger clog autumn come update marble wife body east fly struggle badge someone pupil allow zero yellow slush fury labor battle';
    
    // 니모닉 유효성 검사
    if (!validateMnemonic(testMnemonic)) {
      console.error('지정된 니모닉이 유효하지 않습니다.');
      return false;
    }

    // test-wallet 생성
    console.log('니모닉으로 test-wallet 생성 중...');
    const testWallet = await recoverWalletFromMnemonic(testMnemonic, 'test-wallet');
    console.log('test-wallet 생성 완료, 기본 주소들:', testWallet.addresses);
    
    // 테스트넷 자산들만 추가 (메인넷은 제외)
    const requiredAssets = [
      { symbol: 'ETH-SEPOLIA', derivationPath: "m/44'/60'/0'/0/0" }, // 사용자가 원하는 주소
      { symbol: 'ETH-GOERLI', derivationPath: "m/44'/60'/0'/0/0" }, // ETH Goerli 테스트넷
      { symbol: 'BASE-SEPOLIA', derivationPath: "m/44'/60'/0'/0/0" }, // Base Sepolia 테스트넷
      { symbol: 'BASE-GOERLI', derivationPath: "m/44'/60'/0'/0/0" }, // Base Goerli 테스트넷
      { symbol: 'SOL-DEVNET', derivationPath: "m/44'/501'/0'/0/0" }, // 솔라나 데브넷
      { symbol: 'SOL-TESTNET', derivationPath: "m/44'/501'/0'/0/0" } // 솔라나 테스트넷
    ];

    for (const asset of requiredAssets) {
      try {
        const { symbol, derivationPath } = asset;

        console.log(`${symbol} 자산 생성 시작, derivationPath: ${derivationPath}`);
        const assetResult = await generateAssetAddressAndPrivateKey(testWallet.id, symbol, derivationPath);
        
        if (assetResult) {
          testWallet.addresses[symbol] = assetResult.address;
          if (!testWallet.privateKeys) {
            testWallet.privateKeys = {};
          }
          testWallet.privateKeys[symbol] = assetResult.privateKey;
          
          console.log(`✅ ${symbol} 자산 추가 완료: ${assetResult.address}`);
        } else {
          console.error(`❌ ${symbol} 자산 추가 실패`);
        }
      } catch (error) {
        console.error(`❌ ${symbol} 자산 추가 중 오류:`, error);
      }
    }

    // test-wallet을 첫 번째 지갑으로 저장
    const updatedWallets = [testWallet, ...wallets];
    localStorage.setItem('hdWallets', JSON.stringify(updatedWallets));
    
    // test-wallet을 선택된 지갑으로 설정
    localStorage.setItem('selectedWalletId', testWallet.id);
    
    // 활성화된 자산 설정 (필요한 자산들만 활성화)
    const enabledAssetSymbols = requiredAssets.map(asset => asset.symbol);
    localStorage.setItem('enabledAssets', JSON.stringify(enabledAssetSymbols.map(symbol => ({ symbol }))));
    
    console.log('test-wallet 생성 완료:', testWallet);
    return true;
    
  } catch (error) {
    console.error('test-wallet 생성 중 오류:', error);
    return false;
  }
}; 