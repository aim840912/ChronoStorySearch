# Project Showcase: ChronoStory Search

> 分析日期：2026-02-15
> 分析範圍：src/ 目錄（排除 node_modules、.next、dist）

---

## 專案概覽

| 項目 | 說明 |
|------|------|
| **專案名稱** | ChronoStory Search |
| **類型** | 遊戲資料庫搜尋引擎（全端應用） |
| **主框架** | Next.js 15.5 (App Router) + React 19.2 |
| **語言** | TypeScript 5.9 (strict mode) |
| **樣式** | Tailwind CSS v4 |
| **程式碼規模** | 255 檔案 / 46,603 行 / 53 目錄 |
| **元件數量** | 121 個 TSX 元件 |
| **自訂 Hooks** | 41 個 |
| **頁面路由** | 5 個（含 2 個動態 SEO 路由） |
| **多語系** | zh-TW / en（1,038 組翻譯鍵值） |
| **部署平台** | Vercel |

---

## 技術棧

### 核心框架

| 分類 | 技術 | 版本 |
|------|------|------|
| **框架** | Next.js (App Router) | ^15.5.7 |
| **UI 函式庫** | React | ^19.2.1 |
| **語言** | TypeScript | 5.9.3 |
| **樣式** | Tailwind CSS | ^4.1.15 |
| **建置工具** | Turbopack | 內建 |

### 後端與資料

| 分類 | 技術 | 用途 |
|------|------|------|
| **資料庫** | Supabase (PostgreSQL) | 用戶資料、交易系統、回報系統 |
| **即時同步** | Supabase Realtime | 跨裝置偏好設定即時同步 |
| **快取** | Upstash Redis | 伺服器端快取 |
| **CDN** | Cloudflare R2 | 圖片與 JSON 靜態資源 |
| **資料驗證** | Zod v4 | Schema 驗證（drops、items、preferences） |
| **資料取得** | SWR | Client-side 資料快取與請求去重 |

### 功能套件

| 分類 | 技術 | 用途 |
|------|------|------|
| **圖示** | lucide-react | SVG 圖示系統 |
| **通知** | Sonner | Toast 通知 |
| **OCR** | Tesseract.js v7 | 遊戲畫面文字辨識（經驗值追蹤） |
| **截圖** | html-to-image | 元件截圖匯出分享 |
| **GDPR** | react-cookie-consent | Cookie 同意橫幅 |

### 開發工具鏈

| 分類 | 技術 |
|------|------|
| **E2E 測試** | Playwright ^1.56 |
| **程式碼檢查** | ESLint 9 (Flat Config) + next/core-web-vitals |
| **格式化** | Prettier |
| **CDN 管理** | Wrangler (Cloudflare CLI) + rclone |
| **並行開發** | Concurrently（開發伺服器 + 圖片監聽） |
| **CI/CD** | GitHub Actions（JSON 自動同步到 R2） |
| **套件管理** | npm |

---

## 架構分析

### 目錄結構

```
src/
├── app/                  # Next.js App Router 路由
│   ├── page.tsx          # 首頁（主搜尋介面）
│   ├── item/[slug]/      # 物品 SEO 詳細頁（ISR）
│   ├── monster/[slug]/   # 怪物 SEO 詳細頁（ISR）
│   ├── privacy/          # 隱私政策
│   ├── terms/            # 使用條款
│   ├── manifest.ts       # PWA Manifest
│   └── sitemap.ts        # 動態 Sitemap
├── components/           # 121 個 React 元件
│   ├── search/           # 搜尋列、篩選器、建議列表
│   ├── cards/            # 通用卡片元件（BaseCard 模式）
│   ├── gacha/            # 扭蛋模擬器
│   ├── trade/            # 交易系統
│   ├── report/           # 回報系統
│   ├── tools/            # 工具（經驗值追蹤、螢幕錄影、手動記錄）
│   ├── equipment/        # 裝備屬性
│   ├── seo/              # SEO 專用元件
│   ├── adsense/          # Google AdSense 廣告整合
│   ├── toolbar/          # 工具列選單
│   ├── settings/         # 設定 Modal
│   └── common/           # 共用元件（BaseModal、Toggle）
├── hooks/                # 41 個自訂 Hooks
├── contexts/             # 5 個 React Context
├── lib/                  # 工具函數與服務層
│   ├── supabase/         # Supabase 服務（5 個服務模組）
│   ├── bot-detection/    # Bot 偵測系統
│   ├── analytics/        # GA4 事件追蹤
│   ├── ocr/              # OCR 文字辨識
│   ├── redis/            # Redis 快取
│   ├── cache/            # 資料快取策略
│   └── swr/              # SWR 全域配置
├── providers/            # SWR Provider
├── schemas/              # Zod 驗證 Schema
├── locales/              # i18n 翻譯檔（zh-TW、en）
└── types/                # 13 個 TypeScript 類型定義檔
```

### Server/Client Components 混合策略

| 類型 | 數量 | 比例 | 用途 |
|------|------|------|------|
| Client Components | 160 | ~63% | 互動功能（搜尋、篩選、Modal、工具） |
| Server Components | ~95 | ~37% | SEO 頁面、資料抓取、靜態展示 |

### 設計模式

| 模式 | 信心 | 實踐 |
|------|------|------|
| **Provider Pattern** | [V] | 5 個 Context（Auth、Language、ImageFormat、Theme、PreferencesSync） |
| **Custom Hooks 抽象** | [V] | 41 個 Hooks 封裝業務邏輯（OCR、拖拽、無限滾動、搜尋） |
| **ISR (Incremental Static Regeneration)** | [V] | 物品/怪物詳細頁 24hr revalidate，Top 50 預渲染 |
| **Server-side Data Layer** | [V] | `server-data.ts` 統一管理 Server Component 資料抓取 |
| **Tab Leader Pattern** | [V] | `tab-leader.ts` 實現多分頁協調，避免重複 Realtime 連線 |
| **Bot Detection System** | [V] | 行為偵測 + User-Agent 分析 + Rate Limiting 三層防護 |
| **Cache Busting Strategy** | [V] | `r2-versions.json` 版本號管理 CDN 快取失效 |
| **BaseCard / BaseModal** | [V] | 共用基礎元件，統一卡片和 Modal 樣式 |

---

## 功能清單

### 核心功能

| 功能 | 信心 | 說明 |
|------|------|------|
| [V] **怪物/物品搜尋** | 高 | 模糊搜尋、建議列表、搜尋歷史 |
| [V] **掉落物資料庫** | 高 | 怪物掉落表、物品來源反查 |
| [V] **裝備屬性系統** | 高 | 隨機屬性計算、裝備詳細資訊 |
| [V] **篩選系統** | 高 | 多維度篩選（裝備類型、等級、屬性） |
| [V] **扭蛋模擬器** | 高 | 裝備隨機屬性模擬 |
| [V] **交易系統** | 高 | 物品交易刊登、篩選、黑名單 |
| [V] **回報系統** | 高 | 資料錯誤回報、影片附件、審核功能 |
| [V] **收藏功能** | 高 | 跨裝置同步收藏 |
| [V] **商店查詢** | 高 | NPC 商店物品查詢 |
| [V] **卷軸兌換表** | 高 | 卷軸交換資訊 |
| [V] **製作配方** | 高 | 物品製作材料查詢 |

### 工具功能

| 功能 | 信心 | 說明 |
|------|------|------|
| [V] **經驗值追蹤器（OCR）** | 高 | Tesseract.js 辨識遊戲畫面經驗值，自動計算效率 |
| [V] **命中率計算機** | 高 | 遊戲命中率公式計算，支援怪物選擇 |
| [V] **螢幕錄影** | 高 | MediaRecorder API 錄製遊戲畫面 |
| [V] **手動經驗記錄** | 高 | 手動輸入經驗值追蹤 |
| [V] **遊戲指令查詢** | 高 | 遊戲指令速查表 |

### 平台功能

| 功能 | 信心 | 說明 |
|------|------|------|
| [V] **多語系（i18n）** | 高 | zh-TW / en 雙語，1,038 組翻譯鍵值 |
| [V] **深色模式** | 高 | ThemeContext 管理，系統偏好自動偵測 |
| [V] **PWA** | 高 | Service Worker + Manifest，支援安裝至桌面 |
| [V] **SEO** | 高 | generateMetadata、OG Image、動態 Sitemap、ISR |
| [V] **Google Analytics** | 高 | GA4 事件追蹤 |
| [V] **Google AdSense** | 高 | 5 種廣告格式（Anchor、Display、InFeed、Multiplex） |
| [V] **無限滾動** | 高 | IntersectionObserver 實作 |
| [V] **響應式設計** | 高 | 320px - 1280px+ 全裝置適配，自訂斷點 |
| [V] **Supabase 即時同步** | 高 | 偏好設定跨裝置即時同步 |
| [V] **圖片格式切換** | 高 | PNG / 待機動畫 / 死亡動畫 三種格式 |
| [V] **Cookie 同意** | 高 | GDPR 合規 Cookie Consent 橫幅 |
| [V] **懶載入圖片** | 高 | 17 個元件使用 `loading="lazy"` |

---

## 品質指標

### TypeScript 嚴格度：5/5

| 設定 | 狀態 |
|------|------|
| `strict` | true |
| `noUnusedLocals` | true |
| `noUnusedParameters` | true |
| `noImplicitReturns` | true |
| `noFallthroughCasesInSwitch` | true |

### ESLint 配置

- Flat Config (ESLint 9)
- `next/core-web-vitals` + `next/typescript`
- 自訂規則：未使用變數 `_` 前綴忽略
- R2 CDN 圖片元件允許 `<img>`（避免消耗 Vercel Image Optimization 配額）

### 測試覆蓋

| 框架 | 測試檔案數 | 類型 |
|------|-----------|------|
| Playwright | 3 | E2E（圖片快取、Modal 截圖、API 測試工具） |

### 安全實踐

| 實踐 | 信心 | 說明 |
|------|------|------|
| [V] **安全標頭** | 高 | X-Content-Type-Options、X-Frame-Options、X-XSS-Protection、Referrer-Policy |
| [V] **Bot 偵測** | 高 | 三層防護：行為偵測 + UA 分析 + Rate Limiting |
| [V] **輸入驗證** | 高 | Zod v4 Schema 驗證 |
| [V] **環境變數** | 高 | Supabase、Redis、R2 金鑰透過環境變數管理 |
| [V] **dangerouslySetInnerHTML** | 高 | 僅 1 處使用（SW 註冊腳本，安全） |

---

## 效能與最佳化

| 技術 | 信心 | 說明 |
|------|------|------|
| [V] **ISR** | 高 | 物品/怪物頁 24hr revalidate，Top 50 靜態預渲染 |
| [V] **Turbopack** | 高 | 開發與建置均使用 Turbopack 加速 |
| [V] **gzip 壓縮** | 高 | `compress: true` 減少 ~80% 傳輸量 |
| [V] **套件匯入優化** | 高 | `optimizePackageImports` 優化 lucide-react 等 |
| [V] **Service Worker 快取** | 高 | CDN 圖片 cache-first、同源靜態 stale-while-revalidate |
| [V] **懶載入圖片** | 高 | `loading="lazy"` 延遲載入非首屏圖片 |
| [V] **CDN Cache Busting** | 高 | `r2-versions.json` 版本號控制快取失效 |
| [V] **無限滾動** | 高 | 避免一次渲染大量卡片 |
| [V] **Debounce 搜尋** | 高 | `useDebouncedValue` 避免頻繁觸發搜尋 |
| [V] **平行資料抓取** | 高 | `Promise.all` 同時抓取多個資料源 |

---

## CI/CD

| 項目 | 說明 |
|------|------|
| **部署** | Vercel（Git push 自動部署） |
| **GitHub Actions** | `sync-r2-json.yml` — push 到 main 時自動同步 JSON 到 R2 並更新版本號 |
| **CDN 管理** | rclone + Wrangler CLI 管理 Cloudflare R2 資源 |

---

## USP（獨特賣點）

以下為按「稀有度 + 展示價值 + 商業價值」評分排序的技術亮點：

### 1. OCR 經驗值追蹤器 — Tesseract.js 即時遊戲畫面辨識
- **稀有度**: 5 | **展示價值**: 5 | **商業價值**: 4 | **總分: 14**
- 使用 Tesseract.js v7 辨識遊戲截圖中的經驗值數字
- 自動偵測區域 + OCR 信心度顯示 + 歷史紀錄

### 2. 三層 Bot 偵測防護系統
- **稀有度**: 5 | **展示價值**: 5 | **商業價值**: 5 | **總分: 15**
- 行為偵測（異常操作模式）+ User-Agent 分析 + 動態 Rate Limiting
- 自建安全層，不依賴第三方服務

### 3. Supabase Realtime + Tab Leader 跨裝置同步
- **稀有度**: 4 | **展示價值**: 5 | **商業價值**: 4 | **總分: 13**
- 偏好設定即時同步到所有登入裝置
- Tab Leader Pattern 確保同一瀏覽器只有一個分頁維持 WebSocket 連線

### 4. ISR + 動態 Sitemap SEO 架構
- **稀有度**: 3 | **展示價值**: 4 | **商業價值**: 5 | **總分: 12**
- Top 50 熱門頁面靜態預渲染，其餘按需生成
- 動態 Sitemap 自動包含所有怪物/物品頁面
- generateMetadata 動態生成 OG Image

### 5. CDN Cache Busting + GitHub Actions 自動同步
- **稀有度**: 4 | **展示價值**: 4 | **商業價值**: 4 | **總分: 12**
- `r2-versions.json` 版本號機制繞過 CDN 快取
- GitHub Actions 自動偵測 JSON 變更、上傳 R2、更新版本號、commit 回 repo

### 6. Service Worker 多策略快取（PWA）
- **稀有度**: 3 | **展示價值**: 4 | **商業價值**: 4 | **總分: 11**
- CDN 圖片 cache-first、同源靜態 stale-while-revalidate、API network-only
- 零依賴手寫 Service Worker

### 7. MediaRecorder 螢幕錄影功能
- **稀有度**: 4 | **展示價值**: 4 | **商業價值**: 3 | **總分: 11**
- 原生 MediaRecorder API 錄製遊戲畫面
- 錄製設定、狀態顯示、控制面板完整 UI

### 8. 41 個自訂 Hooks 抽象業務邏輯
- **稀有度**: 3 | **展示價值**: 4 | **商業價值**: 3 | **總分: 10**
- 包含 OCR、拖拽、無限滾動、搜尋建議、Modal 管理等
- 高度模組化，邏輯與 UI 完全分離

---

## 展示素材

### 格式 1：專案技術摘要（履歷用）

使用 Next.js 15 (App Router) 搭配 React 19 和 TypeScript 5.9 開發的遊戲資料庫搜尋引擎，
服務於楓之谷懷舊社群，提供怪物掉落查詢、裝備屬性計算、交易系統等功能。
後端使用 Supabase (PostgreSQL) + Upstash Redis，搭配 Cloudflare R2 CDN 存放 30,000+ 張遊戲圖片與 JSON 資料。

技術架構採用 Server/Client Components 混合策略，SEO 頁面使用 ISR (24hr revalidate) 搭配動態 Sitemap。
整合 Tesseract.js OCR 進行遊戲畫面經驗值辨識、Supabase Realtime 實現跨裝置偏好同步、
自建三層 Bot 偵測防護系統。使用 41 個自訂 Hooks 封裝業務邏輯，實現高度模組化。

全站支援 zh-TW/en 雙語切換（1,038 組翻譯鍵值）、PWA 離線存取、深色模式、
Google Analytics/AdSense 整合、GDPR Cookie Consent。
建置工具鏈包含 Turbopack、ESLint 9 Flat Config、Playwright E2E 測試、
GitHub Actions CI/CD 自動同步資料至 Cloudflare R2。

### 格式 2：技術亮點清單

```
[V] Next.js 15.5 App Router + React 19.2 — 使用最新穩定版框架
[V] TypeScript 5.9 strict mode — 完整型別安全（5 項嚴格檢查全開）
[V] Tailwind CSS v4 — 最新版本 CSS 框架
[V] Supabase Realtime + Tab Leader Pattern — 跨裝置即時偏好同步
[V] Tesseract.js v7 OCR — 遊戲畫面經驗值即時辨識
[V] 三層 Bot 偵測系統 — 行為偵測 + UA 分析 + Rate Limiting
[V] ISR + 動態 Sitemap + generateMetadata — 完整 SEO 架構
[V] Cloudflare R2 CDN + Cache Busting — 版本號驅動快取策略
[V] GitHub Actions CI/CD — JSON 自動同步到 R2 + 版本號更新
[V] Service Worker PWA — 手寫多策略快取（cache-first / stale-while-revalidate）
[V] MediaRecorder 螢幕錄影 — 原生 API 遊戲畫面錄製
[V] 41 個自訂 Hooks — 高度模組化業務邏輯封裝
[V] zh-TW/en 雙語國際化 — Context-based i18n（1,038 組翻譯鍵值）
[V] Zod v4 Schema 驗證 — 結構化輸入驗證
[V] 安全標頭 + 輸入驗證 — X-Frame-Options、XSS Protection、CSRF 防護
[V] 5 種 AdSense 廣告格式 — Anchor、Display、InFeed、Multiplex 整合
[V] 320px-1280px+ 響應式 — 自訂斷點全裝置適配
```

### 格式 3：技能矩陣（履歷用）

| 分類 | 技術 |
|------|------|
| **框架** | Next.js 15 (App Router), React 19 |
| **語言** | TypeScript 5.9 (strict), HTML5, CSS3 |
| **樣式** | Tailwind CSS v4 |
| **資料庫** | Supabase (PostgreSQL), Upstash Redis |
| **CDN** | Cloudflare R2 |
| **即時通訊** | Supabase Realtime (WebSocket) |
| **資料取得** | SWR, fetch (ISR/SSG) |
| **驗證** | Zod v4 |
| **AI/ML** | Tesseract.js (OCR 光學字元辨識) |
| **PWA** | Service Worker, Web App Manifest |
| **瀏覽器 API** | MediaRecorder, IntersectionObserver, Web Share |
| **SEO** | generateMetadata, Sitemap, OG Image, ISR |
| **廣告** | Google AdSense (5 formats) |
| **分析** | Google Analytics 4 (GA4) |
| **國際化** | 自建 Context-based i18n (zh-TW/en) |
| **測試** | Playwright (E2E) |
| **CI/CD** | GitHub Actions, Vercel |
| **工具** | ESLint 9, Prettier, Turbopack, rclone, Wrangler |
| **安全** | Bot Detection, Rate Limiting, Security Headers, Zod Validation |

### 格式 4：面試談話要點（STAR 格式）

#### 故事 1：OCR 經驗值追蹤器

**Situation**: 遊戲玩家需要追蹤掛機效率，但手動記錄經驗值非常繁瑣

**Task**: 實現自動辨識遊戲畫面中的經驗值數字，計算每小時經驗值效率

**Action**:
- 整合 Tesseract.js v7 進行 OCR 文字辨識
- 開發自動區域偵測（`useAutoRegionDetector`），自動定位經驗值文字位置
- 封裝 OCR 常數與文字正規化模組（`ocr-constants.ts`、`text-normalizer.ts`）
- 實作 OCR 信心度顯示，讓用戶判斷辨識準確度
- 支援歷史紀錄儲存與統計分析

**Result**:
- 程式碼證據：`src/hooks/useOcr.ts`、`src/hooks/useAutoRegionDetector.ts`、`src/lib/ocr/`
- 完整的 OCR 管線：截圖 → 區域偵測 → 文字辨識 → 數字提取 → 效率計算

**可能追問**:
- OCR 辨識準確率如何提升？
- 為什麼選擇 Tesseract.js 而非其他 OCR 方案？
- 如何處理不同遊戲解析度的適配？

---

#### 故事 2：Supabase Realtime + Tab Leader 跨裝置同步

**Situation**: 用戶在多台裝置使用網站，偏好設定（語言、主題、收藏）需要即時同步

**Task**: 實現偏好設定的跨裝置即時同步，同時避免多分頁產生重複 WebSocket 連線

**Action**:
- 使用 Supabase Realtime 監聽偏好設定變更
- 實作 Tab Leader Pattern（`tab-leader.ts`），利用 BroadcastChannel 協調多分頁
- 只有 Leader Tab 維持 Realtime 連線，其他分頁透過 BroadcastChannel 接收更新
- 封裝 `PreferencesSyncContext` 統一管理同步邏輯

**Result**:
- 程式碼證據：`src/lib/tab-leader.ts`、`src/lib/supabase/realtime-preferences.ts`、`src/contexts/PreferencesSyncContext.tsx`
- 減少 WebSocket 連線數，避免 Supabase 並發限制

**可能追問**:
- Tab Leader 選舉機制是如何實作的？
- Leader Tab 關閉後如何重新選舉？
- 衝突解決策略是什麼？

---

#### 故事 3：CDN Cache Busting + CI/CD 自動化

**Situation**: 遊戲資料頻繁更新，30,000+ 張圖片和 JSON 存放在 Cloudflare R2 CDN，需要確保用戶看到最新資料

**Task**: 設計快取策略，讓 CDN 能高效快取的同時確保資料更新能即時反映

**Action**:
- 設計 `r2-versions.json` 版本號機制，每個資源獨立版本號
- URL 帶上 `?v=版本號` 繞過 CDN 快取
- GitHub Actions 自動化：push JSON 變更 → rclone 上傳 R2 → 更新版本號 → commit 回 repo
- 同時管理圖片清單（`available-images.json`）判斷圖片是否存在

**Result**:
- 程式碼證據：`data/r2-versions.json`、`.github/workflows/sync-r2-json.yml`、`scripts/generate-image-manifest.js`
- 完全自動化的資料更新流程，push 即部署

**可能追問**:
- 為什麼不用 CDN 的 Cache-Control header？
- 版本號如何與多開發者協作避免衝突？
- 如果 GitHub Actions 失敗怎麼處理？

---

#### 故事 4：三層 Bot 偵測防護

**Situation**: 網站公開 API 和資料，需要防止爬蟲大量抓取消耗資源

**Task**: 在不影響正常用戶體驗的前提下，偵測並限制惡意機器人流量

**Action**:
- 第一層：User-Agent 分析（`user-agent-detector.ts`），偵測已知爬蟲
- 第二層：行為偵測（`behavior-detector.ts`），分析請求頻率和操作模式
- 第三層：動態 Rate Limiting（`rate-limiter.ts`），根據偵測結果調整限流策略
- 定義常數和型別（`constants.ts`、`types.ts`）確保可維護性

**Result**:
- 程式碼證據：`src/lib/bot-detection/`（5 個模組）
- 自建安全層，不依賴第三方付費服務

**可能追問**:
- 如何區分正常用戶的快速操作和機器人？
- 誤判率如何監控和調整？
- 為什麼不直接用 Cloudflare Bot Management？

### 格式 5：接案提案素材

#### 已驗證的技術能力

| 能力領域 | 驗證 | 專案中的實踐 |
|----------|------|--------------|
| 現代前端框架 | [V] | Next.js 15 + React 19，App Router 架構，ISR 靜態生成 |
| 全端開發 | [V] | Supabase PostgreSQL + Redis 快取 + R2 CDN + Vercel 部署 |
| TypeScript | [V] | strict mode 全開（5/5），13 個型別定義檔，Zod 驗證 |
| 響應式設計 | [V] | 320px-1280px+ 全裝置適配，自訂斷點系統 |
| 國際化 | [V] | 完整 zh-TW/en 雙語切換，1,038 組翻譯鍵值 |
| SEO 最佳化 | [V] | ISR + 動態 Sitemap + generateMetadata + OG Image |
| 效能最佳化 | [V] | Service Worker 快取、Turbopack、gzip、懶載入、無限滾動 |
| 即時功能 | [V] | Supabase Realtime + Tab Leader Pattern 跨裝置同步 |
| 安全防護 | [V] | 三層 Bot 偵測 + 安全標頭 + Rate Limiting + 輸入驗證 |
| CI/CD | [V] | GitHub Actions 自動部署 + R2 資料同步 |
| AI/ML 整合 | [V] | Tesseract.js OCR 文字辨識 |
| 廣告變現 | [V] | Google AdSense 5 種格式整合 |
| 程式碼品質 | [V] | ESLint 9 + Prettier + Playwright E2E 測試 |

#### 量化成果

| 指標 | 數值 |
|------|------|
| 程式碼規模 | 46,603 行 / 255 檔案 |
| React 元件 | 121 個 |
| 自訂 Hooks | 41 個 |
| TypeScript 嚴格度 | 5/5 |
| 翻譯鍵值 | 1,038 組 (zh-TW + en) |
| CDN 管理資源 | 30,000+ 張圖片 |
| 測試檔案 | 3 個 Playwright E2E |
| CI/CD Pipeline | GitHub Actions 自動化 |

---

## 綜合評分卡

| # | 維度 | 評分 | 偵測依據 |
|---|------|------|----------|
| 1 | **技術現代性** | 5/5 | Next.js 15.5 + React 19.2 + TS 5.9 + Tailwind v4 + Turbopack |
| 2 | **型別安全** | 5/5 | strict + noUnusedLocals + noUnusedParameters + noImplicitReturns + noFallthroughCasesInSwitch |
| 3 | **測試實踐** | 2/5 | 3 個 Playwright E2E 測試，無單元測試 |
| 4 | **效能最佳化** | 4/5 | ISR、SW 快取、gzip、Turbopack、懶載入、CDN Cache Busting |
| 5 | **無障礙 (a11y)** | 2/5 | 少量 aria-label（8 處），缺少系統性 a11y 實踐 |
| 6 | **國際化 (i18n)** | 4/5 | zh-TW/en 完整雙語，但非路由級 i18n |
| 7 | **程式碼品質** | 4/5 | ESLint 9 + Prettier + TS strict + 模組化 Hooks |
| 8 | **CI/CD** | 3/5 | GitHub Actions R2 同步 + Vercel 自動部署，缺少自動化測試 |
| 9 | **安全實踐** | 4/5 | Bot 偵測、安全標頭、Zod 驗證、環境變數管理 |
| 10 | **文件完整度** | 3/5 | 專案 CLAUDE.md 詳盡，但缺少 README 和 API 文件 |

**綜合分數：36/50**

### 綜合評語

ChronoStory Search 是一個技術棧現代、架構完整的中大型全端應用，展現了從前端 UI 到後端服務、從 CDN 管理到 CI/CD 自動化的全鏈路開發能力。專案在效能最佳化（ISR + SW 快取 + CDN Cache Busting）和安全防護（三層 Bot 偵測）方面有突出的工程實踐。OCR 經驗值追蹤器和 Supabase Realtime + Tab Leader Pattern 是高區分度的技術亮點。主要改進空間在測試覆蓋率和無障礙支援。
