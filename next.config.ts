import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 啟用 gzip 壓縮（減少 80% 傳輸量）
  compress: true,

  // 優化套件匯入
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
  },

  // Next.js Image 優化配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-a1c4c32d4c65452098ab977db77e349e.r2.dev',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
};

export default nextConfig;
