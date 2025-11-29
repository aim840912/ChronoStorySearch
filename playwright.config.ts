import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 測試配置
 * 用於自動化瀏覽器測試
 */
export default defineConfig({
  // 測試目錄
  testDir: './tests',

  // 完全並行運行測試
  fullyParallel: true,

  // 失敗時不重試（測試環境）
  retries: 0,

  // 並行執行的 worker 數量
  workers: 1,

  // 報告設置
  reporter: [
    ['html'],
    ['list']
  ],

  use: {
    // 基礎 URL（支援環境變數覆蓋）
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // 截圖設置
    screenshot: 'only-on-failure',

    // 視頻設置
    video: 'retain-on-failure',

    // 追蹤設置
    trace: 'on-first-retry',
  },

  // 測試項目配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web Server 配置（自動啟動開發服務器）
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
