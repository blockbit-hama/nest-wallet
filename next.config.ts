import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove emotion compiler since we're using TailwindCSS
  transpilePackages: ['dlv', 'util-deprecate'],
  
  // Docker를 위한 standalone 출력 활성화
  output: 'standalone',
  
  // 빌드 시 타입 및 ESLint 에러 무시
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 빌드 최적화 설정
  serverExternalPackages: [],
  
  // 정적 내보내기 비활성화 (SSR 사용)
  trailingSlash: false,
  
  env: {
    GAS_COUPON_API_URL: process.env.GAS_COUPON_API_URL || 'http://localhost:9001',
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;