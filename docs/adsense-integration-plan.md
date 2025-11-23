# Google AdSense 整合計劃

> **專案類型**：單頁應用（SPA）- Next.js 15 + App Router
> **目標**：在不影響效能的前提下，最大化 Google AdSense 收益
> **更新日期**：2025-11-20

---

## 📋 目錄

- [專案架構分析](#專案架構分析)
- [SPA 對 AdSense 收益的影響](#spa-對-adsense-收益的影響)
- [解決方案](#解決方案)
- [分階段實作計劃](#分階段實作計劃)
- [技術實作細節](#技術實作細節)
- [預期效果與監控](#預期效果與監控)
- [常見問題 FAQ](#常見問題-faq)

---

## 專案架構分析

### 當前路由結構

**使用技術**：Next.js 15.5.6 + App Router

```
src/app/
├── page.tsx                         # 主頁面 (/) - 709 行
│   └── 'use client' - 完全客戶端渲染
├── layout.tsx                       # 根佈局
├── admin/
│   ├── login/page.tsx              # 管理員登入
│   └── system-settings/page.tsx    # 系統設定
└── api/                            # 30+ API 路由
```

**實際頁面數**：3 個 (`page.tsx`)

### SPA 特性

#### 主頁面的客戶端路由系統

```typescript
// 使用 Hash 參數實現 Modal 導航
#monster={monsterId}     → 打開怪物詳細 Modal
#item={itemId}           → 打開物品詳細 Modal
#gacha={machineId}       → 打開轉蛋機 Modal
#q={searchTerm}          → 搜尋參數
```

#### 頁面切換行為

| 操作 | 頁面重新載入 | AdSense 廣告重載 | GA4 記錄 |
|------|------------|----------------|---------|
| 初次進入網站 | ✅ 是 | ✅ 是 | ✅ 1 PV |
| 搜尋商品 | ❌ 否 | ❌ 否 | ❌ 0 PV |
| 打開 Monster Modal | ❌ 否 | ❌ 否 | ❌ 0 PV |
| 打開 Item Modal | ❌ 否 | ❌ 否 | ❌ 0 PV |
| 打開 Gacha Modal | ❌ 否 | ❌ 否 | ❌ 0 PV |
| 變更篩選器 | ❌ 否 | ❌ 否 | ❌ 0 PV |

**結論**：典型的 SPA 架構，所有內容在單個 DOM 樹中更新。

---

## SPA 對 AdSense 收益的影響

### AdSense 收益模式

Google AdSense 主要有兩種計費方式：

1. **CPM（Cost Per Mille）** - 每 1,000 次曝光收益
   - 💰 收益範圍：$0.5 - $3 USD / 1,000 次曝光
   - ✅ **無需點擊**即可獲得收益
   - 📊 佔總收益的 20-40%

2. **CPC（Cost Per Click）** - 每次點擊收益
   - 💰 收益範圍：$0.2 - $2 USD / 點擊
   - 👆 需要使用者點擊廣告
   - 📊 佔總收益的 60-80%

### 問題：SPA 嚴重低估頁面瀏覽量

#### 使用者典型行為分析

```
傳統多頁網站：
  1. 進入首頁 → 頁面載入 → 廣告曝光 +1 → GA4 記錄 +1 PV
  2. 搜尋商品 → 頁面重載 → 廣告曝光 +1 → GA4 記錄 +1 PV
  3. 查看詳情 → 頁面重載 → 廣告曝光 +1 → GA4 記錄 +1 PV
  4. 查看物品 → 頁面重載 → 廣告曝光 +1 → GA4 記錄 +1 PV
  5. 查看轉蛋 → 頁面重載 → 廣告曝光 +1 → GA4 記錄 +1 PV

  總計：5 次廣告曝光、5 PV

當前 SPA 網站：
  1. 進入首頁 → 頁面載入 → 廣告曝光 +1 → GA4 記錄 +1 PV
  2. 搜尋商品 → Modal 切換 → 廣告曝光 +0 → GA4 記錄 +0 PV ❌
  3. 查看詳情 → Modal 切換 → 廣告曝光 +0 → GA4 記錄 +0 PV ❌
  4. 查看物品 → Modal 切換 → 廣告曝光 +0 → GA4 記錄 +0 PV ❌
  5. 查看轉蛋 → Modal 切換 → 廣告曝光 +0 → GA4 記錄 +0 PV ❌

  總計：1 次廣告曝光、1 PV

收益損失：-80%
```

### 收益影響估算

假設月流量 **5,000 訪客**，每位訪客平均互動 **5 次**：

| 網站類型 | 頁面瀏覽 | 廣告曝光 | CPM 收益<br>($1.5/1K) | CPC 收益<br>(1% CTR, $0.5/click) | 總收益 |
|---------|---------|---------|---------------------|---------------------------|--------|
| **傳統多頁** | 25,000 PV | 25,000 | $37.5 | $125 | **$162.5** |
| **當前 SPA** | 5,000 PV | 5,000 | $7.5 | $25 | **$32.5** |
| **損失** | -80% | -80% | -80% | -80% | **-80% ($130)** |

#### 年度收益損失

```
傳統多頁：$162.5 × 12 = $1,950 / 年
當前 SPA： $32.5 × 12 = $390 / 年

年度損失：$1,560
```

---

## 解決方案

### 方案 A：手動刷新廣告 + GA4 事件追蹤 ⭐ **推薦**

#### 原理
在 Modal 打開、搜尋、篩選等互動時，手動觸發：
1. GA4 `page_view` 事件（統計 PV）
2. AdSense 廣告刷新（增加曝光次數）

#### 優點
- ✅ 工作量小（2-3 小時）
- ✅ 不影響現有架構
- ✅ 無效能影響
- ✅ 立即見效

#### 缺點
- ⚠️ 需手動維護追蹤點
- ⚠️ 廣告刷新頻率需控制（避免違反 AdSense 政策）

#### 預期改善
| 指標 | 改善幅度 | 數值變化 |
|------|---------|---------|
| PV 追蹤 | +300-400% | 5,000 → 20,000 PV |
| 廣告曝光 | +300-400% | 5,000 → 20,000 次 |
| 月收益 | +200-300% | $32.5 → $97.5-130 |

---

### 方案 B：多位置廣告

#### 原理
在不同內容區塊放置多個廣告位：
- 主頁面：Footer 廣告（固定）
- 搜尋結果：列表中間廣告（動態顯示）
- Modal 內容：Modal 底部廣告（Modal 打開時載入）

#### 優點
- ✅ 增加曝光機會
- ✅ 不依賴手動刷新

#### 缺點
- ❌ 可能影響使用者體驗
- ❌ 需謹慎設計位置
- ❌ 工作量較大（1 天）

#### 預期改善
| 指標 | 改善幅度 | 數值變化 |
|------|---------|---------|
| 廣告曝光 | +150% | 5,000 → 12,500 次 |
| 月收益 | +100-150% | $32.5 → $65-81 |

---

### 方案 C：架構重構（Hash 路由 → 真實路由）

#### 原理
將 Modal 改為真實的頁面路由：

```
當前 Hash 路由：
/#monster=100001
/#item=3001
/#gacha=machine1

改為真實路由：
/monsters/100001
/items/3001
/gacha/machine1
```

#### 優點
- ✅ 每個路由都是真實頁面載入
- ✅ AdSense 自動計入新曝光（無需手動觸發）
- ✅ SEO 友好（可被搜尋引擎索引）
- ✅ 分享連結更友善
- ✅ 收益接近傳統多頁網站

#### 缺點
- ❌ 需大幅重構（1-2 週工作量）
- ❌ 可能影響現有功能
- ❌ 需調整 SSR/ISR 策略
- ❌ 載入時間可能增加

#### 預期改善
| 指標 | 改善幅度 | 數值變化 |
|------|---------|---------|
| PV 追蹤 | +400% | 5,000 → 25,000 PV |
| 廣告曝光 | +400% | 5,000 → 25,000 次 |
| 月收益 | +400% | $32.5 → $162.5 |

---

### 方案比較

| 方案 | 工作量 | 收益提升 | 使用者體驗影響 | 技術風險 | 推薦度 |
|------|-------|---------|---------------|---------|--------|
| **A: 手動刷新廣告** | 2-3 小時 | +200-300% | 無影響 | 低 | ⭐⭐⭐⭐⭐ |
| **B: 多位置廣告** | 1 天 | +100-150% | 需謹慎設計 | 低 | ⭐⭐⭐⭐ |
| **C: 架構重構** | 1-2 週 | +400% | 需完整測試 | 中 | ⭐⭐⭐ |

**建議策略**：
1. **立即執行**：方案 A（快速見效）
2. **1 個月後評估**：根據數據決定是否執行方案 B
3. **3-6 個月後**：如果流量 > 50,000/月，考慮方案 C

---

## 分階段實作計劃

### 📅 階段 1：環境設定與基礎整合（30 分鐘）

#### 1.1 取得 Google AdSense Publisher ID
1. 前往 [Google AdSense](https://www.google.com/adsense/)
2. 註冊帳號並等待核准
3. 取得 Publisher ID（格式：`ca-pub-XXXXXXXXXXXXXXXX`）

#### 1.2 設定環境變數
```bash
# .env.local
NEXT_PUBLIC_GOOGLE_ADSENSE_ID=ca-pub-XXXXXXXXXXXXXXXX
```

```bash
# .env.example（加入範例）
NEXT_PUBLIC_GOOGLE_ADSENSE_ID=ca-pub-0000000000000000
```

#### 1.3 在 layout.tsx 加入驗證腳本
```typescript
// src/app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

### 📅 階段 2：建立 AdSense 元件（1 小時）

#### 2.1 建立 Footer 廣告元件

```typescript
// src/components/AdSense/AdSenseFooter.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

interface AdSenseFooterProps {
  adSlot: string
  adFormat?: 'auto' | 'fluid' | 'rectangle'
  className?: string
}

export function AdSenseFooter({
  adSlot,
  adFormat = 'auto',
  className = ''
}: AdSenseFooterProps) {
  const adRef = useRef<HTMLModElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  // 延遲載入：只在 Footer 可見時載入廣告
  useEffect(() => {
    if (!adRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(adRef.current)

    return () => observer.disconnect()
  }, [])

  // 載入 AdSense 廣告
  useEffect(() => {
    if (isVisible && typeof window !== 'undefined') {
      try {
        const adsbygoogle = (window as any).adsbygoogle || []
        adsbygoogle.push({})
      } catch (error) {
        console.error('AdSense load error:', error)
      }
    }
  }, [isVisible])

  if (!process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID) {
    return null // 未設定 AdSense ID
  }

  return (
    <div className={`adsense-container ${className}`}>
      {/* 廣告標籤（符合 Google 政策） */}
      <div className="text-xs text-gray-500 text-center mb-2">
        Advertisement
      </div>

      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-client={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  )
}
```

#### 2.2 建立廣告刷新工具

```typescript
// src/components/AdSense/useAdSenseRefresh.ts
import { useEffect } from 'react'

/**
 * AdSense 廣告刷新 Hook
 * 用於 SPA 中手動觸發廣告重新載入
 *
 * ⚠️ 注意：不要過度頻繁刷新（建議間隔 > 30 秒），避免違反 AdSense 政策
 */
export function useAdSenseRefresh(shouldRefresh: boolean) {
  useEffect(() => {
    if (!shouldRefresh) return

    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        // 推送新廣告請求
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
      }
    } catch (error) {
      console.error('AdSense refresh error:', error)
    }
  }, [shouldRefresh])
}
```

#### 2.3 匯出元件

```typescript
// src/components/AdSense/index.ts
export { AdSenseFooter } from './AdSenseFooter'
export { useAdSenseRefresh } from './useAdSenseRefresh'
```

---

### 📅 階段 3：GA4 自訂事件追蹤（1 小時）

#### 3.1 建立 GA4 工具函數

```typescript
// src/lib/analytics/ga4-utils.ts

/**
 * 追蹤頁面瀏覽事件
 * 用於 SPA 中手動觸發 page_view 事件
 */
export function trackPageView(pagePath: string, pageTitle: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle,
      page_location: window.location.href,
    })
  }
}

/**
 * 追蹤廣告曝光事件
 */
export function trackAdImpression(adSlot: string, adFormat: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'ad_impression', {
      ad_slot: adSlot,
      ad_format: adFormat,
    })
  }
}

/**
 * 追蹤搜尋事件
 */
export function trackSearch(searchTerm: string, resultCount: number) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'search', {
      search_term: searchTerm,
      result_count: resultCount,
    })
  }
}
```

#### 3.2 在主頁面加入事件追蹤

```typescript
// src/app/page.tsx（部分修改）
import { trackPageView, trackSearch } from '@/lib/analytics/ga4-utils'
import { useAdSenseRefresh } from '@/components/AdSense'

export default function Home() {
  // ... 現有狀態

  // 追蹤搜尋事件
  useEffect(() => {
    if (debouncedSearchTerm) {
      trackPageView(
        `/?q=${encodeURIComponent(debouncedSearchTerm)}`,
        `搜尋：${debouncedSearchTerm}`
      )
      trackSearch(debouncedSearchTerm, filteredDrops.length)
    }
  }, [debouncedSearchTerm, filteredDrops.length])

  // 追蹤 Monster Modal 開啟
  useEffect(() => {
    if (modals.isMonsterModalOpen && selectedMonsterId) {
      trackPageView(
        `/#monster=${selectedMonsterId}`,
        `怪物詳情：${selectedMonsterId}`
      )
    }
  }, [modals.isMonsterModalOpen, selectedMonsterId])

  // 追蹤 Item Modal 開啟
  useEffect(() => {
    if (modals.isItemModalOpen && selectedItemId) {
      trackPageView(
        `/#item=${selectedItemId}`,
        `物品詳情：${selectedItemId}`
      )
    }
  }, [modals.isItemModalOpen, selectedItemId])

  // 追蹤 Gacha Modal 開啟
  useEffect(() => {
    if (modals.isGachaModalOpen && selectedMachineId) {
      trackPageView(
        `/#gacha=${selectedMachineId}`,
        `轉蛋機：${selectedMachineId}`
      )
    }
  }, [modals.isGachaModalOpen, selectedMachineId])

  // 追蹤 Enhance Modal 開啟
  useEffect(() => {
    if (modals.isEnhanceModalOpen) {
      trackPageView('/#enhance', '強化模擬器')
    }
  }, [modals.isEnhanceModalOpen])

  // ... 其他程式碼
}
```

---

### 📅 階段 4：整合到 Footer（30 分鐘）

```typescript
// src/components/Footer.tsx（修改）
import { AdSenseFooter } from '@/components/AdSense'

export function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-auto">
      {/* 現有的 Footer 內容 */}
      <div className="container mx-auto px-4">
        {/* ... 現有內容 ... */}
      </div>

      {/* AdSense 廣告區域 */}
      <div className="container mx-auto px-4 mt-8 border-t border-gray-700 pt-8">
        <AdSenseFooter
          adSlot="1234567890"
          adFormat="auto"
          className="max-w-4xl mx-auto"
        />
      </div>

      {/* 版權資訊 */}
      <div className="text-center text-gray-500 text-sm mt-8">
        © 2025 MapleStory Market. All rights reserved.
      </div>
    </footer>
  )
}
```

---

### 📅 階段 5：測試與驗證（30 分鐘）

#### 5.1 功能測試

- [ ] 廣告是否正常顯示在 Footer
- [ ] 延遲載入是否生效（滾動到 Footer 才載入）
- [ ] Modal 打開時 GA4 是否記錄 page_view
- [ ] 搜尋時 GA4 是否記錄 search 事件
- [ ] Console 無錯誤訊息

#### 5.2 效能測試

```bash
# 執行 Lighthouse 測試
npm run build
npm run start

# 開啟 Chrome DevTools → Lighthouse
# 檢查 Core Web Vitals：
# - LCP (Largest Contentful Paint) < 2.5s
# - FID (First Input Delay) < 100ms
# - CLS (Cumulative Layout Shift) < 0.1
```

#### 5.3 GA4 驗證

1. 開啟 [Google Analytics 4](https://analytics.google.com/)
2. 前往 **即時 → 事件**
3. 測試各種互動，確認事件正確追蹤：
   - `page_view` - 頁面瀏覽
   - `search` - 搜尋事件
   - `ad_impression` - 廣告曝光（可選）

#### 5.4 AdSense 驗證

1. 開啟 [Google AdSense](https://www.google.com/adsense/)
2. 前往 **網站 → 您的網站**
3. 確認網站通過驗證
4. 等待 24-48 小時開始顯示廣告

---

## 技術實作細節

### AdSense 政策遵守

⚠️ **重要**：違反以下政策可能導致帳號停用

#### ✅ 必須做的事
1. **明確標示廣告**
   ```html
   <div class="ad-label">廣告 / Advertisement</div>
   <ins class="adsbygoogle">...</ins>
   ```

2. **避免誤導性點擊**
   - ❌ 不可在廣告上方放置「點這裡」、「下載」等誘導文字
   - ❌ 不可將廣告偽裝成內容
   - ✅ 廣告與內容應有明顯區隔

3. **廣告刷新頻率**
   - ❌ 不可 < 30 秒刷新一次
   - ✅ 建議在使用者有意義的互動時才刷新（如切換頁面）

4. **禁止自行點擊**
   - ❌ 永遠不要點擊自己的廣告
   - ❌ 不要要求他人點擊廣告

#### ❌ 禁止的行為
- 在同一頁面放置過多廣告（建議 ≤ 3 個）
- 使用自動化工具產生點擊
- 在不適當的內容旁放置廣告（暴力、色情等）
- 隱藏廣告或使用過小字體

### 效能優化策略

#### 1. 延遲載入（Lazy Loading）

```typescript
// 使用 Intersection Observer
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadAd() // 只在廣告位可見時載入
      }
    },
    { threshold: 0.1 } // 10% 可見即觸發
  )
  observer.observe(adRef.current)
}, [])
```

**效果**：
- 減少初始載入時間
- 節省頻寬（使用者未滾動到 Footer 時不載入）
- 改善 Core Web Vitals 指標

#### 2. Script 載入策略

```typescript
<Script
  src="https://pagead2.googlesyndication.com/..."
  strategy="afterInteractive" // 頁面互動後才載入
  // 不使用 "beforeInteractive"（會阻塞渲染）
/>
```

#### 3. 錯誤處理

```typescript
try {
  (window.adsbygoogle = window.adsbygoogle || []).push({})
} catch (error) {
  // 靜默處理，不影響主要功能
  console.error('AdSense error:', error)
}
```

### TypeScript 類型定義

```typescript
// src/types/adsense.d.ts
interface Window {
  adsbygoogle: any[]
}

interface AdSenseProps {
  adClient: string
  adSlot: string
  adFormat?: 'auto' | 'fluid' | 'rectangle'
  style?: React.CSSProperties
}
```

---

## 預期效果與監控

### 收益預測（方案 A）

假設月流量 **5,000 訪客**，平均每人互動 **5 次**：

#### 實施前
```
頁面瀏覽：5,000 PV
廣告曝光：5,000 次
CPM 收益：5,000 / 1,000 × $1.5 = $7.5
CPC 收益：5,000 × 1% × $0.5 = $25
月收益：$32.5
```

#### 實施後
```
頁面瀏覽：20,000 PV（+300%）
廣告曝光：20,000 次（+300%）
CPM 收益：20,000 / 1,000 × $1.5 = $30
CPC 收益：20,000 × 1% × $0.5 = $100
月收益：$130（+300%）

年度收益：$1,560（vs. 實施前 $390）
年度增加：$1,170
```

### 監控指標

#### GA4 關鍵指標

| 指標 | 目標 | 檢查頻率 |
|------|------|---------|
| 頁面瀏覽量（PV） | > 15,000/月 | 每週 |
| 平均互動次數 | > 3 次/使用者 | 每週 |
| 跳出率 | < 60% | 每週 |
| 平均停留時間 | > 2 分鐘 | 每週 |

#### AdSense 關鍵指標

| 指標 | 目標 | 檢查頻率 |
|------|------|---------|
| 頁面 RPM（每千次曝光收益） | > $5 | 每週 |
| 點擊率（CTR） | 0.5% - 2% | 每週 |
| CPC（每次點擊成本） | > $0.3 | 每月 |
| 無效流量率 | < 5% | 每月 |

#### Core Web Vitals

| 指標 | 目標 | 工具 |
|------|------|------|
| LCP | < 2.5s | Lighthouse |
| FID | < 100ms | Lighthouse |
| CLS | < 0.1 | Lighthouse |

### 問題排查

#### 廣告不顯示

1. **檢查 Publisher ID**
   ```bash
   # 確認環境變數正確
   echo $NEXT_PUBLIC_GOOGLE_ADSENSE_ID
   ```

2. **檢查 AdSense 帳號狀態**
   - 帳號是否通過核准
   - 網站是否通過驗證
   - 是否有政策違規警告

3. **檢查 Console 錯誤**
   ```javascript
   // Chrome DevTools → Console
   // 查看是否有 AdSense 相關錯誤
   ```

4. **AdBlock 檢查**
   - 停用瀏覽器的廣告封鎖插件
   - 使用無痕模式測試

#### GA4 事件未追蹤

1. **檢查 gtag 是否載入**
   ```javascript
   console.log(typeof window.gtag) // 應顯示 "function"
   ```

2. **檢查事件參數**
   ```javascript
   // 在 trackPageView 中加入 console.log
   console.log('Tracking page_view:', pagePath, pageTitle)
   ```

3. **檢查 GA4 即時報告**
   - 前往 Google Analytics 4
   - 即時 → 事件
   - 確認事件是否出現（可能延遲 1-2 分鐘）

---

## 常見問題 FAQ

### Q1: 沒人點擊廣告會有收益嗎？

**A:** 會！Google AdSense 有兩種收益模式：
- **CPM（曝光收益）**：每 1,000 次曝光就有收益，無需點擊
- **CPC（點擊收益）**：點擊才有收益

通常 CPM 佔總收益的 20-40%，所以即使沒有點擊，仍然有收益。

### Q2: 單頁應用會降低收益嗎？

**A:** 是的，如果不做優化，單頁應用的收益會比傳統多頁網站低 60-80%。

**原因**：
- 傳統網站：每次換頁都重新載入廣告 → 計入新曝光
- 單頁應用：只有初次載入計入 → Modal 切換不計入

**解決方案**：
- 使用本計劃的方案 A（手動刷新廣告 + GA4 追蹤）
- 可恢復 60-80% 的收益潛力

### Q3: Footer 位置的廣告收益會很低嗎？

**A:** Footer 廣告的收益確實比頁面頂部低，但：

**優點**：
- ✅ 不影響使用者體驗
- ✅ 不影響頁面載入速度（延遲載入）
- ✅ 仍有穩定的 CPM 收益

**數據**：
- Footer CPM 約為頁首的 40-60%
- 但點擊率（CTR）可能更低（0.3-0.8% vs. 1-2%）

**建議**：
- 先從 Footer 開始（低風險）
- 1 個月後評估數據
- 如果收益穩定，再考慮增加其他位置

### Q4: 多久可以開始賺錢？

**A:** 時間表：
1. **申請 AdSense**：1-2 週（審核時間）
2. **整合廣告**：1 天（按照本計劃）
3. **開始顯示廣告**：24-48 小時（Google 審核廣告位）
4. **第一筆收益**：即時開始累積
5. **提領收益**：達到 $100 USD 門檻（約 2-6 個月）

### Q5: 會影響網站效能嗎？

**A:** 使用本計劃的優化策略，影響極小：

| 指標 | 影響 |
|------|------|
| 初始載入時間 | 無影響（afterInteractive 策略） |
| Footer 載入時間 | +100-200ms（延遲載入） |
| 額外 JavaScript | ~30KB（gzip 壓縮後） |
| Core Web Vitals | 通常不受影響 |

**測試建議**：
- 整合前後都執行 Lighthouse 測試
- 確保 LCP < 2.5s、CLS < 0.1

### Q6: AdSense 會被 AdBlock 封鎖嗎？

**A:** 是的，約 25-30% 的使用者使用 AdBlock。

**因應策略**：
- 接受此現實（無法完全避免）
- 不要嘗試繞過 AdBlock（違反政策）
- 考慮其他收益來源（聯盟行銷、贊助）

### Q7: 需要多少流量才值得放廣告？

**A:** 建議流量門檻：

| 月流量 | 建議 |
|--------|------|
| < 1,000 訪客 | 先專注於內容，暫不放廣告 |
| 1,000 - 10,000 訪客 | ✅ 適合開始放廣告（本計劃適用） |
| 10,000 - 100,000 訪客 | ✅ 考慮多位置廣告（方案 B） |
| > 100,000 訪客 | ✅ 考慮架構重構（方案 C） |

---

## 附錄

### 參考資源

- [Google AdSense 政策](https://support.google.com/adsense/answer/48182)
- [Google Analytics 4 文檔](https://developers.google.com/analytics/devguides/collection/ga4)
- [Next.js Script Component](https://nextjs.org/docs/app/api-reference/components/script)
- [Core Web Vitals](https://web.dev/vitals/)

### 更新日誌

- **2025-11-20**：建立初始版本
  - 專案架構分析
  - SPA 收益影響評估
  - 三種解決方案
  - 分階段實作計劃

---

## 總結

本計劃針對單頁應用（SPA）的 Google AdSense 整合挑戰，提供三種解決方案：

1. **方案 A（推薦）**：手動刷新廣告 + GA4 追蹤
   - ⏱️ 工作量：2-3 小時
   - 📈 收益提升：+200-300%
   - 🎯 立即可執行

2. **方案 B**：多位置廣告
   - ⏱️ 工作量：1 天
   - 📈 收益提升：+100-150%
   - 🎯 1 個月後評估

3. **方案 C**：架構重構
   - ⏱️ 工作量：1-2 週
   - 📈 收益提升：+400%
   - 🎯 3-6 個月後考慮

**建議執行順序**：A → B → C（漸進式優化）

**預期年度收益增加**：$1,170（方案 A）- $1,560（方案 C）
