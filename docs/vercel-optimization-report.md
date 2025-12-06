# Vercel 流量優化分析報告

> 分析日期：2025-12-06
> 專案：ChronoStory Search

---

## 執行摘要

經過深入分析，專案的資料架構已經非常優秀（Essential/Detailed 分層載入），主要問題已逐步解決：

1. ~~**全站 Client-Side Rendering**~~ - ✅ Root Layout 已改為 Server Component
2. ~~**Root Layout 是 Client Component**~~ - ✅ 已建立 Providers.tsx 包裝
3. ~~**Framer Motion 動畫開銷**~~ - ✅ 已改用 CSS 動畫（減少 40KB Bundle）

---

## 當前流量數據（過去 30 天）

| 指標 | 當前值 | 免費額度 | 使用率 |
|------|--------|----------|--------|
| Edge Requests | 966K | 1M | 96.6% |
| Function Invocations | 632K | 1M | 63.2% |
| Fluid Active CPU | 4h 31m | 4h | 113% (超額) |

---

## 已完成的優化

### 1. 刪除 middleware.ts（2025-12-06）
- **問題**：即使 matcher 為空，middleware 仍被部署和調用
- **影響**：佔 90.9% Function Invocations（574K 次）
- **解決**：刪除整個 `src/middleware.ts` 檔案
- **預期效果**：減少 ~90% Function Invocations

### 2. optimizePackageImports（2025-12-06）
- **修改**：在 `next.config.ts` 加入 `framer-motion` 和 `lucide-react`
- **預期效果**：減少 15-20% Edge Requests

### 3. Root Layout 改為 Server Component（2025-12-06）
- **問題**：Root Layout 標記為 `'use client'`，導致整個應用無法靜態優化
- **解決**：建立 `Providers.tsx` 包裝所有 Client Providers，讓 `layout.tsx` 成為 Server Component
- **預期效果**：減少 30-40% Function Invocations
- **新建檔案**：`src/components/Providers.tsx`
- **修改檔案**：`src/app/layout.tsx`
- **額外效果**：可使用 Next.js `metadata` API，改善 SEO

### 4. 移除 Framer Motion，改用 CSS 動畫（2025-12-06）
- **問題**：Framer Motion 增加約 50KB gzipped 的 Bundle Size
- **解決**：使用 CSS `@keyframes` 和 Tailwind 動畫類別替代
- **實際效果**：First Load JS 461KB → 421KB（減少 **40KB**，約 8.7%）
- **修改檔案**：
  - `src/components/cards/BaseCard.tsx` - 移除 motion.div，改用 CSS 入場動畫
  - `src/components/cards/FavoriteButton.tsx` - 移除 motion.button，改用 CSS 心跳動畫
  - `src/app/globals.css` - 新增 `@keyframes card-fade-in` 和 `@keyframes heartbeat`
  - `next.config.ts` - 從 optimizePackageImports 移除 framer-motion
- **額外效果**：支援 `prefers-reduced-motion` 無障礙設定

---

## 當前架構優點

### 已實施的優化

1. **資料分層載入策略**
   - Essential JSON（搜尋索引，預載入）
   - Detailed JSON（Modal 詳細資料，懶加載）
   - 減少約 85-94% 資料傳輸量

2. **轉蛋機延遲載入**
   - 7 個轉蛋機 JSON 只在需要時載入
   - 使用動態 import，不產生 API 請求

3. **SWR 快取配置**
   - `dedupingInterval: 60s`
   - `revalidateOnFocus: false`
   - 有效減少重複請求

4. **靜態資源使用 Cloudflare R2 CDN**
   - 不計入 Vercel Edge Requests

---

## 待優化問題

### ~~問題 1：Root Layout 是 Client Component~~ ✅ 已解決
- **檔案**：`src/app/layout.tsx`
- **狀態**：✅ 已於 2025-12-06 修復
- **解決方案**：建立 `Providers.tsx` 包裝所有 Client Providers

### 問題 2：部分檔案仍標記為 'use client'
- **影響**：部分頁面無法使用 Next.js SSG/ISR
- **現況**：Root Layout 已修復，其他檔案視需求評估

### ~~問題 3：Framer Motion 使用廣泛~~ ✅ 已解決
- **檔案**：`BaseCard.tsx`, `FavoriteButton.tsx`
- **狀態**：✅ 已於 2025-12-06 修復
- **解決方案**：移除 framer-motion，改用 CSS `@keyframes` 動畫
- **效果**：Bundle Size 減少 40KB（461KB → 421KB）

### ~~問題 4：使用原生 img 標籤~~（實際上是優點）

- **檔案**：`src/components/cards/CardImage.tsx`
- **實際情況**：✅ 這是正確的做法！
- **原因**：圖片存放在 Cloudflare R2 CDN，不經過 Vercel，不計入流量

---

## 各優化方法流量影響分析

> ⚠️ **重要**：並非所有「優化」都會減少 Vercel 流量，有些反而會增加

| 優化方法 | Edge Requests | Function Invocations | 結論 |
|---------|---------------|---------------------|------|
| Root Layout → Server Component | ↓ 減少 | ↓ 減少 | ✅ 推薦 |
| 減少 Framer Motion | ↓ 減少 | 不變 | ✅ 推薦 |
| GA lazyOnload | 不變 | 不變 | ✅ 推薦（改善載入） |
| ~~ISR (revalidate)~~ | - | ⚠️ 每次重驗證 +1 | ❌ 不適用（頁面已是靜態） |
| ~~Next.js Image~~ | ↑ **增加** | ↑ **增加** | ❌ 不適用 |
| 保持原生 img + R2 CDN | ✅ 0 | ✅ 0 | ✅ **目前最佳解** |

---

## 為什麼不用 Next.js Image

### 當前架構（最佳解）

```
用戶請求圖片 → Cloudflare R2 CDN → 直接回傳
                    ↑
              完全不經過 Vercel！
              不計入 Edge Requests
              不計入 Function Invocations
```

### Next.js Image（會增加流量）

```
用戶請求圖片 → Vercel /_next/image API → 優化處理 → 回傳
                        ↑
                  產生 Function Invocation！
                  每個 圖片+尺寸 組合 = 1 次調用
```

### 結論

| 方案 | 優點 | 缺點 |
|-----|------|------|
| **原生 img + R2 CDN** | 不計入 Vercel 流量 | 無自動 WebP 轉換 |
| Next.js Image | 自動優化格式 | 增加 Function Invocations |

**建議**：保持現有架構，不使用 Next.js Image。

---

## 優化建議

### 優先級 1：高影響 - 立即實施

#### 1.1 將 Root Layout 改為 Server Component

**預期效果**：減少 30-40% Function Invocations

**修改檔案**：
- `src/app/layout.tsx`（移除 'use client'）
- `src/components/Providers.tsx`（新建，包裝所有 Context Providers）

**實施方式**：

```typescript
// src/components/Providers.tsx（新建）
'use client'

import { ReactNode } from 'react'
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ImageFormatProvider } from "@/contexts/ImageFormatContext";
import { SWRProvider } from "@/providers/SWRProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ImageFormatProvider>
            {children}
          </ImageFormatProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SWRProvider>
  )
}
```

```typescript
// src/app/layout.tsx（修改後）
// 移除 'use client'

import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";
import { Providers } from "@/components/Providers";
// ... 其他 imports

export const metadata = {
  title: "ChronoStory Search",
  description: "查找裝備、怪物詳細資訊",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      {/* ... */}
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

---

#### ~~1.2 使用 Next.js Image 組件~~（已移除）

> ⚠️ **此建議已移除** - 詳見下方「為什麼不用 Next.js Image」說明

---

### 優先級 2：中影響 - 短期實施

#### ~~2.1 減少 Framer Motion 使用範圍~~ ✅ 已完成

**實際效果**：Bundle Size 461KB → 421KB（減少 40KB，約 8.7%）

**採用方案**：方案 C - 完全移除 framer-motion，使用 CSS animations

**修改檔案**：
- ✅ `src/components/cards/BaseCard.tsx` - 使用 `animate-card-fade-in` CSS 類別
- ✅ `src/components/cards/FavoriteButton.tsx` - 使用 `animate-heartbeat` CSS 類別
- ✅ `src/app/globals.css` - 新增 `@keyframes` 動畫
- ✅ `next.config.ts` - 移除 framer-motion 優化設定

---

#### ~~2.2 實施頁面級靜態生成（ISR）~~ ❌ 不適用

> ⚠️ **此建議已移除** - 經分析後發現頁面已是靜態渲染

**原因**：
- Build 輸出顯示 `○ (Static) prerendered as static content`
- 頁面沒有動態依賴（無 cookies、headers、searchParams）
- 資料來自靜態 JSON 檔案，不需要 ISR 重驗證
- 啟用 ISR 反而會**增加** Function Invocations（每次重驗證 +1）

**結論**：頁面已是最佳狀態，不需修改。

---

#### 2.3 優化 Google Analytics 載入時機

**預期效果**：減少 5-10% 初始載入時間

**修改檔案**：
- `src/components/analytics/GoogleAnalytics.tsx`

**實施方式**：

```typescript
// 將 strategy="afterInteractive" 改為 strategy="lazyOnload"
<Script
  strategy="lazyOnload"
  src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
/>
```

---

### 優先級 3：低影響 - 長期優化

1. **將純展示組件改為 Server Components**
   - `Footer.tsx`
   - `MaintenanceBanner.tsx`

2. **實施 Bundle 分析**
   ```bash
   npm install -D @next/bundle-analyzer
   ANALYZE=true npm run build
   ```

3. **考慮使用 Edge Runtime**
   ```typescript
   export const runtime = 'edge'
   ```

---

## 預期效果總結

| 優化項目 | 優先級 | 預期效果 | 實施難度 | 狀態 |
|---------|-------|---------|---------|------|
| Root Layout 改為 Server Component | P1 | -30~40% Function Invocations | 中 | ✅ 已完成 |
| 移除 Framer Motion | P2 | -8.7% Bundle Size (40KB) | 中 | ✅ 已完成 |
| GA 延遲載入 | P2 | 改善初始載入速度 | 低 | 待實施 |
| ~~頁面級靜態生成 (force-static)~~ | P3 | ❌ 頁面已是靜態，無效果 | - | ❌ 不適用 |
| ~~使用 Next.js Image~~ | - | ❌ 會增加流量 | - | ❌ 已移除 |

### 總體預期

| 指標 | 優化前 | 優化後（預估） | 減少比例 |
|------|--------|----------------|----------|
| Edge Requests | 966K | 680-770K | -20~30% |
| Function Invocations | 632K | 250-320K | -50~60% |
| Fluid Active CPU | 113% | 68-79% | -30~40% |

---

## 實施順序建議

### 第一階段（立即實施）✅ 已完成
1. ~~將 Root Layout 改為 Server Component~~ ✅ 2025-12-06 完成

### 第二階段（一週內）
2. ~~減少 Framer Motion~~ ✅ 2025-12-06 完成（改用 CSS 動畫）
3. GA 改為 lazyOnload

### 第三階段（兩週內）
4. ~~考慮頁面級靜態生成 (force-static)~~ ❌ 不適用（頁面已是靜態）
5. Bundle 分析（可選）

---

## 監控指標

- 每週檢查 Vercel Dashboard 數據
- 目標：一個月內讓所有指標降到 70% 以下
- 關注指標：
  - Edge Requests
  - Function Invocations
  - Fluid Active CPU
  - First Load JS Size

---

## 關鍵檔案清單

### 需要修改的檔案
1. ~~`/src/app/layout.tsx`~~ - ✅ 已改為 Server Component
2. ~~`/src/components/cards/BaseCard.tsx`~~ - ✅ 已改用 CSS 動畫
3. ~~`/src/components/cards/FavoriteButton.tsx`~~ - ✅ 已改用 CSS 動畫
4. `/src/components/analytics/GoogleAnalytics.tsx` - 改為 lazyOnload（待實施）

### 需要新建的檔案
1. ~~`/src/components/Providers.tsx`~~ - ✅ 已建立（包裝所有 Context Providers）

### 不需要修改的檔案
1. ~~`/src/components/cards/CardImage.tsx`~~ - 保持原生 img + R2 CDN（已是最佳解）
2. ~~`/next.config.ts` images 設定~~ - 不使用 Next.js Image

---

## 附錄：已刪除的 middleware.ts 內容

```typescript
// 已於 2025-12-06 刪除
// 原因：即使 matcher 為空陣列，仍被 Vercel 部署和調用
// 影響：佔 90.9% Function Invocations（574K 次）
// Bot Detection 已移至 API 路由中的 withBotDetection 處理
```
