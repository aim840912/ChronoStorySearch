import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 啟用 gzip 壓縮（減少 80% 傳輸量）
  compress: true,

  // 優化套件匯入
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
  },

  // 安全性 Headers（防止 CSRF、XSS、Clickjacking）
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
