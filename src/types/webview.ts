// WebView 환경에서 사용할 타입 정의

declare global {
  interface Window {
    isReactNativeWebView?: boolean;
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    nativeApp?: {
      openExternalUrl: (url: string) => void;
      showAlert: (title: string, message: string) => void;
    };
  }
}

export interface WebViewMessage {
  type: 'PURCHASE_REDIRECT' | 'PURCHASE_SUCCESS' | 'PURCHASE_ERROR' | 'NAVIGATION_REQUEST' | 'SHOW_ALERT' | 'APP_INFO' | 'OPEN_EXTERNAL_URL';
  url?: string;
  message?: string;
  title?: string;
  route?: string;
  platform?: string;
  version?: string;
  isNativeApp?: boolean;
}

export interface AppInfo {
  platform: string;
  version: string;
  isNativeApp: boolean;
}

export {};