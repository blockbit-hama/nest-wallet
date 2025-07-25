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
  experimental: {
    // 서버 컴포넌트 최적화
    serverComponentsExternalPackages: [],
  },
  
  // 정적 내보내기 비활성화 (SSR 사용)
  trailingSlash: false,
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
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