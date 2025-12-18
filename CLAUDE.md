# ChronoStory 專案開發指南

> 本專案遵循 `~/.claude/CLAUDE.md` 的通用開發規範
> 以下為專案特定規範和資訊

---

## 專案資訊

| 項目 | 說明 |
|------|------|
| **專案名稱** | ChronoStory Search |
| **技術棧** | Next.js 15 + TypeScript + Tailwind CSS |
| **資料庫** | Supabase (PostgreSQL) |
| **快取** | Upstash Redis |
| **圖片儲存** | Cloudflare R2 CDN |
| **部署平台** | Vercel |
| **專案類型** | 全端應用（含 API Routes） |

---

## 常用指令

```bash
npm run dev          # 啟動開發伺服器 (localhost:3000)
npm run build        # 建置
npm run type-check   # TypeScript 檢查
npm run lint         # ESLint 檢查
```

---

## 專案架構

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API Routes
│   ├── admin/        # 管理後台
│   └── page.tsx      # 主頁面
├── components/       # React 元件
│   ├── gacha/        # 扭蛋機相關
│   ├── trade/        # 交易系統相關
│   └── auth/         # 認證相關
├── hooks/            # 自定義 Hooks
├── lib/              # 工具函數與服務
│   ├── cache/        # 快取相關
│   └── swr/          # SWR 設定
├── contexts/         # React Context
├── types/            # TypeScript 類型定義
├── schemas/          # Zod 驗證 Schema
├── locales/          # i18n 翻譯檔案 (zh-TW, en)
└── middleware.ts     # Next.js 中間件

data/                 # 靜態資料 (JSON)
public/images/        # 本地圖片資源
```

---

## 專案特定規範

### 圖片格式系統

怪物圖片支援三種格式：
- **PNG**：靜態圖片
- **待機 (stand)**：GIF 動畫
- **死亡 (die)**：GIF 動畫

使用 `ImageFormatContext` 管理全域圖片格式狀態。

### 多語系支援

- 支援語言：`zh-TW`（繁體中文）、`en`（英文）
- 翻譯檔案：`src/locales/zh-TW.json`、`src/locales/en.json`
- 使用 `LanguageContext` 管理語言狀態

### 資料來源

| 資料類型 | 來源 |
|---------|------|
| 怪物資料 | `/data/monsters.json` |
| 物品資料 | `/data/items.json` |
| 物品屬性 | `/data/item-attributes-essential.json` |
| 圖片資源 | Cloudflare R2 CDN |

### 響應式設計

| 項目 | 說明 |
|------|------|
| **最低支援寬度** | 320px |
| **自訂斷點** | 400px, 500px, 554px, 1120px |

自訂斷點用途：
- `min-[400px]` - 按鈕 padding 調整
- `min-[500px]` - 文字顯示切換（縮寫/完整）
- `min-[554px]` - FilterTabs 佈局、ActionButtons 位置
- `min-[1120px]` - MonsterModal 桌面版雙欄佈局

### 建置時間標準

本專案為中型專案，建置時間 **> 2 分鐘** 視為警告，需調查原因。

---

## 關鍵 Context

| Context | 用途 |
|---------|------|
| `AuthContext` | 用戶認證狀態 |
| `LanguageContext` | 多語系切換 |
| `ImageFormatContext` | 圖片格式切換 |
| `ThemeContext` | 深色/淺色主題 |
| `FavoritesContext` | 收藏功能 |

---

## 資料維護腳本

### R2 資源維護（圖片 + JSON）

**關鍵檔案**：
| 檔案 | 用途 |
|------|------|
| `data/available-images.json` | R2 圖片清單（判斷圖片是否存在） |
| `data/r2-versions.json` | 圖片/JSON 版本號 + hash（Cache Busting） |
| `scripts/generate-image-manifest.js` | 從 R2 同步圖片清單，自動更新版本號 |

**新增或更新圖片到 R2 後**：
```bash
npm run r2:sync-manifest
# 腳本會自動：
# 1. 更新 available-images.json（圖片清單）
# 2. 檢測變更並自動更新版本號（r2-versions.json）

git add data/available-images.json data/r2-versions.json
git commit -m "chore: sync R2 image manifest"
```

**手動更新 JSON 版本號**（當 JSON 檔案更新時）：
編輯 `data/r2-versions.json`：
```json
{ "json": { "items-organized": { "1234": "2" } } }
```

**問題排查**：
- 新圖片不顯示 → 執行 `npm run r2:sync-manifest` 更新清單
- 更新後顯示舊版 → 執行 `npm run r2:sync-manifest`（自動檢測並更新版本號）

---

### 裝備資料驗證與修正

| 腳本 | 用途 |
|------|------|
| `node scripts/compare-random-stats.js` | 比對本地 metaInfo 與 API stats，產生 `random-stats-diff.md` |
| `node scripts/fix-equipment-stats.js` | 依 diff 報告修正 metaInfo 並重算 randomStats |
| `node scripts/recalc-random-stats.js` | 重新計算所有裝備的 randomStats |

### randomStats 計算公式

```
O = reqLevel / 10（套服 Overall 類型 ×2）

A 值依屬性類型：
- 主屬性 (STR/DEX/INT/LUK): A = O / 屬性數量
- 攻擊/魔攻/速度: A = O / 2
- 命中/迴避: A = O
- 跳躍: A = O / 4
- HP/MP/物防/魔防: A = O × 5

randomStats = { base, min: max(0, base-A), max: base+A }
```

---

## 環境變數

必要的環境變數（參考 `.env.example`）：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudflare R2
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ACCOUNT_ID=
```
