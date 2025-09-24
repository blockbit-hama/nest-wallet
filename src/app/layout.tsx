import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReactNode } from "react";
import { Providers } from './providers';
import './globals.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coupon Wallet",
  description: "Secure and easy to use coupon wallet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 환경 변수 로그 출력 (서버 사이드에서만 실행)
  if (typeof window === 'undefined') {
    console.log('🚀 Next.js App Starting...');
    console.log('📋 Environment Variables:');
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    console.log('   GAS_COUPON_API_URL:', process.env.GAS_COUPON_API_URL);
    console.log('   PORT:', process.env.PORT);
    console.log('   NEXT_PUBLIC_DEBUG:', process.env.NEXT_PUBLIC_DEBUG);
    console.log('   NEXT_PUBLIC_LOG_LEVEL:', process.env.NEXT_PUBLIC_LOG_LEVEL);
    console.log('=====================================');
  }

  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}