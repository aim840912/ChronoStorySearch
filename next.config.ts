import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 啟用 gzip 壓縮（減少 80% 傳輸量）
  compress: true,

  // 優化套件匯入
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
  },
};

export default nextConfig;
