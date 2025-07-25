import { atom } from 'jotai';
import { WalletInfo } from '@/lib/wallet-utils';

export const walletConnectedAtom = atom<boolean>(false);
export const selectedAccountAtom = atom<string>('');
export const darkModeAtom = atom<boolean>(false);

// 지갑 리스트 전역 atom
export const walletListAtom = atom<WalletInfo[]>([]);

// 선택된 지갑 ID atom - 로컬 스토리지에서 초기값 가져오기
export const selectedWalletIdAtom = atom<string>('');

// 활성화된 가상자산 리스트 atom
export const enabledAssetsAtom = atom<string[]>([]);

// 지갑 리스트 로딩 상태 atom
export const walletListLoadingAtom = atom<boolean>(true);