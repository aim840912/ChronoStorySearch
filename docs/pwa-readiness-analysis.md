# ChronoStory PWA 準備度分析

> 分析日期：2024-12-27

## 現狀總結

專案目前有**良好的快取基礎設施**，但**缺少 PWA 核心元件**。

---

## 已具備的能力

| 能力 | 位置 | 說明 |
|------|------|------|
| SWR 快取策略 | `src/lib/swr/config.ts` | 客戶端請求去重、錯誤重試、60 秒快取視窗 |
| LocalStorage 管理 | `src/lib/storage.ts` | 收藏、偏好設定、瀏覽紀錄持久化 |
| 伺服器端快取 | `src/lib/cache/items-cache.ts` | Redis + 記憶體 Map 雙層快取 |
| 基本 SEO Metadata | `src/app/layout.tsx` | 標題、描述、favicon |
| 應用程式圖示 | `public/images/chrono.png` | 單一品牌圖示（5.1 KB） |

### 快取流程圖

```
用戶請求
    ↓
SWR Cache (60s 去重) ← 客戶端
    ↓
localStorage (偏好設定) ← 持久化
    ↓
Server API
    ↓
Redis Cache (Upstash)
    ↓
Database (Supabase)
```

---

## 缺少的 PWA 核心元件

### 1. Web App Manifest（必要）

- **狀態**：完全缺失
- **影響**：無法觸發「加到主畫面」提示、無法定義應用名稱/圖示/啟動行為
- **需建立**：`/public/manifest.json`

### 2. Service Worker（必要）

- **狀態**：完全缺失
- **影響**：無離線功能、無背景同步、無資源快取攔截
- **相關套件**：專案未安裝 `next-pwa`、`serwist`、`workbox` 等

### 3. PWA Meta Tags（必要）

- **缺少的標籤**：
  - `theme-color` - 瀏覽器 UI 主題色
  - `apple-mobile-web-app-capable` - iOS 主畫面支援
  - `apple-mobile-web-app-status-bar-style` - iOS 狀態列樣式
  - `mobile-web-app-capable` - Android PWA 支援

### 4. 多尺寸圖示（必要）

- **需要**：
  - 192×192 px（Android 主畫面）
  - 512×512 px（啟動畫面、應用商店）
  - Maskable 圖示（自適應圖示）
  - Apple Touch Icon 180×180 px

### 5. 離線支援（建議）

- **缺少**：
  - 離線錯誤頁面
  - 網路狀態偵測
  - 離線可用的頁面

---

## 實作建議（分階段）

### Phase 1: 基礎 PWA（可安裝）

**實作內容**：
1. 建立 `/public/manifest.json`
2. 在 `layout.tsx` 加入 PWA meta tags
3. 產生多尺寸圖示集
4. 安裝並設定 `@serwist/next`（或 `next-pwa`）
5. 建立基本 Service Worker

**預估結果**：可觸發「加到主畫面」提示

| 優點 | 缺點 |
|------|------|
| 用戶可將應用安裝到主畫面，增加品牌識別度 | 仍需網路連線才能使用，無離線功能 |
| 全螢幕體驗，無瀏覽器 UI 干擾 | 需要維護多尺寸圖示資源 |
| 提升用戶回訪率（主畫面捷徑） | Service Worker 註冊可能影響首次載入效能 |
| 實作成本低，約 1-2 小時 | iOS Safari 對 PWA 支援較弱（無推播、儲存限制） |
| 無需上架應用商店，即時更新 | 用戶需手動觸發「加到主畫面」，轉換率較低 |

**適用情境**：想快速讓應用「看起來像 App」，但不需要離線功能

---

### Phase 2: 離線體驗

**實作內容**：
1. 建立離線錯誤頁面 `/offline`
2. 設定 Service Worker 快取策略
3. 加入網路狀態指示器
4. 圖片使用 cache-first 策略

**預估結果**：斷網時仍可瀏覽已快取內容

| 優點 | 缺點 |
|------|------|
| 斷網時仍可瀏覽已快取內容，提升可用性 | 快取策略設計複雜，需考慮資料一致性 |
| 減少重複請求，降低伺服器負載和 API 成本 | 佔用用戶裝置儲存空間（可能達數十 MB） |
| 加速二次訪問，改善感知效能 | 需處理快取失效和版本更新邏輯 |
| 用戶在網路不穩定環境仍能使用（地鐵、飛機） | 調試困難，Service Worker 有獨立生命週期 |
| 對資料密集型應用（如本專案的怪物/物品查詢）效益顯著 | 動態資料（如交易系統）難以離線化 |

**適用情境**：資料查詢類應用、用戶常在網路不穩定環境使用

**本專案特別考量**：
- 怪物/物品資料是靜態的，非常適合離線快取
- 圖片資源已使用 CDN，可設定 cache-first 策略
- 交易系統需保持 network-first，確保資料即時性

---

### Phase 3: 進階功能（可選）

**實作內容**：
1. Push 通知
2. 背景同步
3. 啟動畫面（Splash Screen）
4. 效能優化（預快取關鍵資源）

| 優點 | 缺點 |
|------|------|
| Push 通知可主動觸達用戶，提升互動率 | 需要後端推播服務（如 Firebase Cloud Messaging） |
| 背景同步確保離線操作不遺失 | 權限管理複雜，用戶可能拒絕通知權限 |
| 啟動畫面提升專業感和品牌體驗 | 維護成本高，需持續監控推播效果 |
| 預快取可讓關鍵頁面瞬間載入 | iOS 對背景同步支援有限 |
| 接近原生 App 體驗 | 過度推播可能導致用戶反感並取消訂閱 |

**適用情境**：需要主動通知用戶的場景（如價格提醒、新資料更新）

**本專案可能應用**：
- 收藏物品價格變動通知
- 新版本資料更新提醒
- 每日登入提醒（遊戲化元素）

---

## 技術選型建議

### 方案 1：@serwist/next（推薦）

**簡介**：next-pwa 的 fork，由社群積極維護，專為 Next.js 13+ App Router 設計

| 優點 | 缺點 |
|------|------|
| 積極維護，版本更新頻繁（2024 年持續活躍） | 社群資源較少，Stack Overflow 問題少 |
| 完整支援 Next.js 15 App Router | 文檔相對簡潔，進階用法需讀原始碼 |
| TypeScript 原生支援，類型定義完整 | 遷移自 next-pwa 需調整部分 API |
| 內建 Workbox 最佳化配置 | 客製化程度低於手動 Workbox |
| 支援 App Router 的 `app/sw.ts` 寫法 | 依賴 Workbox，增加 bundle 大小 |

**適用情境**：
- Next.js 15 專案（如本專案）
- 想快速導入 PWA，不想深入 Workbox 配置
- 需要 TypeScript 支援

**安裝指令**：
```bash
npm install @serwist/next serwist
```

---

### 方案 2：next-pwa

**簡介**：最老牌的 Next.js PWA 解決方案，社群廣泛使用

| 優點 | 缺點 |
|------|------|
| 社群廣泛，Stack Overflow 問題多 | 維護速度慢，對新版 Next.js 支援滯後 |
| 範例專案多，容易找到參考 | 部分 API 已過時，需注意版本相容性 |
| 配置簡單，適合快速上手 | Next.js 15 相容性需自行驗證 |
| 文檔詳細，常見問題都有解答 | 預設配置可能不適合 App Router |
| 穩定性高，經過大量專案驗證 | 原作者維護意願降低 |

**適用情境**：
- 使用 Next.js 13 以下或 Pages Router
- 專案穩定性優先，不追求最新功能
- 團隊熟悉 next-pwa 生態

**安裝指令**：
```bash
npm install next-pwa
```

---

### 方案 3：手動 Workbox

**簡介**：直接使用 Google 的 Workbox 函式庫，完全掌控 Service Worker

| 優點 | 缺點 |
|------|------|
| 完全控制快取策略和 Service Worker 行為 | 配置複雜，學習曲線陡峭 |
| 無框架綁定，可用於任何專案 | 需自行處理 Next.js 整合（路由、SSR） |
| 可實現高度客製化的離線體驗 | 調試困難，需熟悉 Service Worker 生命週期 |
| bundle 大小可控，只引入需要的模組 | 維護成本高，每次 Next.js 升級可能需調整 |
| 適合有特殊需求的專案 | 開發時間長，不適合快速迭代 |

**適用情境**：
- 需要高度客製化的快取策略
- 團隊有 Service Worker 經驗
- 專案有特殊離線需求（如離線編輯、複雜同步）

**安裝指令**：
```bash
npm install workbox-core workbox-precaching workbox-routing workbox-strategies
```

---

### 選型總結

| 項目 | @serwist/next | next-pwa | 手動 Workbox |
|------|---------------|----------|--------------|
| **Next.js 15 支援** | 完整 | 需驗證 | 需自行整合 |
| **學習曲線** | 低 | 低 | 高 |
| **客製化程度** | 中 | 低 | 高 |
| **維護成本** | 低 | 低 | 高 |
| **社群資源** | 少 | 多 | 多 |
| **推薦程度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

**本專案建議**：使用 `@serwist/next`
- Next.js 15 + App Router 架構，@serwist/next 支援度最佳
- 專案需求單純（離線查詢），不需高度客製化
- TypeScript 專案，類型支援重要

---

## 需建立/修改的檔案清單

| 檔案 | 動作 | 說明 |
|------|------|------|
| `public/manifest.json` | 新增 | PWA 清單 |
| `public/icons/icon-192.png` | 新增 | Android 圖示 |
| `public/icons/icon-512.png` | 新增 | 啟動畫面圖示 |
| `public/icons/maskable-icon.png` | 新增 | 自適應圖示 |
| `src/app/layout.tsx` | 修改 | 加入 PWA meta tags 和 manifest 連結 |
| `next.config.ts` | 修改 | 加入 PWA 設定 |
| `src/app/sw.ts` | 新增 | Service Worker（若用 serwist） |
| `src/app/offline/page.tsx` | 新增 | 離線頁面 |

---

## 附錄：圖示產生方法

從 `chrono.png` 產生多尺寸圖示的三種方法：

---

### 方法 1：線上工具

**推薦工具**：
- [PWA Asset Generator](https://pwa-asset-generator.nicholaslarue.com/)
- [Favicon Generator](https://realfavicongenerator.net/)
- [PWA Builder](https://www.pwabuilder.com/imageGenerator)

| 優點 | 缺點 |
|------|------|
| 無需安裝任何工具，開箱即用 | 依賴第三方服務，可能有隱私疑慮 |
| 視覺化介面，可即時預覽效果 | 服務可能關閉或變更 |
| 自動產生所有所需尺寸和格式 | 無法整合到 CI/CD 流程 |
| 適合一次性產生，快速完成 | 每次更新圖示需重新上傳 |
| 部分工具提供 maskable 圖示預覽 | 品質控制較差，可能有壓縮損失 |

**適用情境**：
- 初次建立 PWA，快速取得完整圖示集
- 非技術人員操作
- 圖示不常更新的專案

---

### 方法 2：命令列工具（sharp-cli）

```bash
# 安裝 sharp-cli（全域）
npm install -g sharp-cli

# 產生各尺寸
sharp -i public/images/chrono.png -o public/icons/icon-192.png resize 192 192
sharp -i public/images/chrono.png -o public/icons/icon-512.png resize 512 512
sharp -i public/images/chrono.png -o public/icons/apple-touch-icon.png resize 180 180

# 或使用 npm script（推薦）
# package.json:
# "scripts": {
#   "generate-icons": "sharp -i public/images/chrono.png -o public/icons/icon-192.png resize 192 192 && ..."
# }
```

| 優點 | 缺點 |
|------|------|
| 可整合到 npm scripts，自動化執行 | 需要安裝 Node.js 和 sharp-cli |
| 可納入 CI/CD 流程 | 初次設定需撰寫指令 |
| 完全離線運作，無隱私疑慮 | 需手動指定每個尺寸 |
| 品質可控，可調整壓縮參數 | 無視覺化預覽 |
| 版本控制友好，指令可追蹤 | maskable 圖示需額外處理 padding |

**適用情境**：
- 圖示可能定期更新
- 需要整合到建置流程
- 團隊協作，需可重現的產生方式

---

### 方法 3：@serwist/next 自動產生

使用 `@serwist/next` 套件，在建置時自動從來源圖片產生所需尺寸。

```typescript
// next.config.ts
import withSerwist from '@serwist/next'

export default withSerwist({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // 圖示會根據 manifest.json 中的定義自動產生
})
```

| 優點 | 缺點 |
|------|------|
| 與框架深度整合，零額外設定 | 綁定特定框架和工具 |
| 建置時自動產生，確保一致性 | 建置時間增加 |
| 自動處理 hash 和 cache busting | 控制粒度較低 |
| manifest.json 變更時自動同步 | 調試困難，產生過程不透明 |
| 適合持續部署環境 | 需要來源圖片足夠大（建議 512px+） |

**適用情境**：
- 使用 @serwist/next 作為 PWA 方案
- 希望完全自動化，不手動管理圖示
- 專案有完整的 CI/CD 流程

---

### 圖示產生方法總結

| 項目 | 線上工具 | 命令列 (sharp) | @serwist 自動 |
|------|----------|----------------|---------------|
| **設定複雜度** | 無 | 中 | 低 |
| **自動化程度** | 手動 | 可自動化 | 完全自動 |
| **品質控制** | 低 | 高 | 中 |
| **框架綁定** | 無 | 無 | 有 |
| **推薦場景** | 快速開始 | 長期維護 | 整合開發 |

**本專案建議**：
- **初期**：使用線上工具快速產生完整圖示集
- **長期**：若採用 @serwist/next，可切換為自動產生

---

## 附錄：快速開始範例

### manifest.json 範例

```json
{
  "name": "ChronoStory Search",
  "short_name": "ChronoStory",
  "description": "MapleStory 資料查詢工具",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#4a90d9",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/maskable-icon.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### PWA Meta Tags 範例

```tsx
// src/app/layout.tsx 加入
export const metadata: Metadata = {
  // ...existing metadata
  manifest: '/manifest.json',
  themeColor: '#4a90d9',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ChronoStory',
  },
}
```
