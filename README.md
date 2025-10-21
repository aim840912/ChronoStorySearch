# 🍁 ChronoStory 掉落物查詢系統

一個現代化的 MapleStory 掉落物與轉蛋機查詢網站，使用 Next.js 15 和 React 19 構建。

## ✨ 功能特色

### 核心功能
- 🔍 **智慧搜尋** - 支援怪物、物品、轉蛋物品的即時搜尋與建議
- 💫 **進階篩選** - 依物品類別、職業、等級範圍進行精準篩選
- ⭐ **最愛收藏** - 收藏常用怪物與物品，快速查詢
- 🎰 **轉蛋系統** - 完整的轉蛋機模擬與物品查詢
- 🌓 **深色模式** - 支援亮色/深色主題切換
- 🌍 **雙語支援** - 繁體中文與英文界面

### 技術特色
- ⚡ **極速載入** - Next.js Turbopack 建置，首屏載入優化
- 📱 **響應式設計** - 完美適配桌面、平板、手機
- 🎨 **現代 UI** - Tailwind CSS 4 驅動的美觀介面
- 🔄 **無限滾動** - 大量資料的流暢瀏覽體驗
- 💾 **資料持久化** - LocalStorage 存儲使用者偏好

## 🛠 技術棧

### 前端框架
- **Next.js 15.5** - React 全端框架
- **React 19.2** - UI 函式庫
- **TypeScript 5.9** - 類型安全
- **Tailwind CSS 4** - CSS 框架

### 開發工具
- **ESLint 9** - 程式碼檢查
- **Turbopack** - 極速建置工具
- **Vercel Analytics** - 使用分析

### 基礎設施
- **Cloudflare R2** - 圖片 CDN
- **Vercel** - 部署平台

## 🚀 快速開始

### 環境要求
- Node.js 20+
- npm 或 pnpm

### 安裝依賴

```bash
npm install
```

### 環境變數設置

創建 `.env.local` 檔案：

```env
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-r2-bucket.r2.dev
```

### 開發模式

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看網站。

### 建置生產版本

```bash
npm run build
npm run start
```

## 📁 專案結構

```
src/
├── app/                 # Next.js App Router 頁面
├── components/          # React 元件
├── contexts/            # React Context（主題、語言）
├── hooks/               # 自定義 Hooks
├── lib/                 # 工具函數與共用邏輯
├── types/               # TypeScript 類型定義
data/                    # 遊戲資料（JSON）
public/                  # 靜態資源
scripts/                 # 資料處理腳本
```

## 🎯 開發指南

### 程式碼品質

專案已配置嚴格的程式碼品質檢查：

```bash
# TypeScript 類型檢查
npm run type-check

# ESLint 檢查
npm run lint

# 程式碼格式化
npm run format
```

### 開發規範

請參閱 `CLAUDE.md` 了解完整的開發規範，包括：
- 程式碼風格指南
- API 開發規範
- 依賴管理規則
- 技術債管理

### 日誌系統

專案使用統一的日誌系統（`src/lib/logger.ts`）：

```typescript
import { clientLogger } from '@/lib/logger'

clientLogger.info('資訊訊息')
clientLogger.warn('警告訊息')
clientLogger.error('錯誤訊息', error)
clientLogger.debug('除錯訊息')
```

生產環境日誌會自動存儲到 localStorage，可通過以下方式查看：

```javascript
// 在 Console 中執行
import { Logger } from '@/lib/logger'
Logger.getLogs()  // 查看日誌
Logger.clearLogs() // 清除日誌
```

## 📊 資料來源

遊戲資料來源於 [ChronoStory 官方 Google Sheets](https://docs.google.com/spreadsheets/d/e/2PACX-1vRpKuZGJQIFFxSi6kzYx4ALI0MQborpLEkh3J1qIGSd0Bw7U4NYg5CK-3ESzyK580z4D8NO59SUeC3k/pubhtml?gid=1888753114&single=true)。

## 🔧 維護任務

### 定期維護

```bash
# 檢查過期依賴
npm outdated

# 安全性檢查
npm audit

# 清理建置快取
rm -rf .next/cache

# 檢查未使用依賴
npx depcheck
```

### R2 圖片管理

```bash
# 同步圖片到 R2
npm run r2:sync

# 檢查 R2 檔案
npm run r2:list

# 驗證本地與 R2 一致性
npm run r2:check
```

## 📈 效能優化

- ✅ Gzip 壓縮
- ✅ WebP/AVIF 圖片格式
- ✅ 套件自動優化
- ✅ 延遲載入轉蛋資料
- ✅ 無限滾動分頁
- ✅ 搜尋防抖（debounce）

## 🤝 貢獻

歡迎提交 Issue 或 Pull Request！

## 📝 授權

本專案僅供學習和研究使用。遊戲相關資料版權屬於 Nexon 及其相關公司。

## 🔗 相關連結

- [Next.js 文檔](https://nextjs.org/docs)
- [React 文檔](https://react.dev)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [TypeScript 文檔](https://www.typescriptlang.org/docs)

---

Made with ❤️ by Claude Code
