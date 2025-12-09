# 資料來源遷移計劃：`/data/` → `/chronostoryData/`

> 建立時間：2025-12-09
> 狀態：規劃完成，待執行

## 概述

將前端資料來源從 `/data/` 遷移到 `/chronostoryData/`，保留所有額外資料（中文名稱、icon Base64 等），採用直接替換策略。

---

## 現況分析

### 資料匯入點（4 個核心檔案）

| 檔案 | 重要性 | 匯入資料 |
|------|--------|---------|
| `src/lib/cache/items-cache.ts` | 🔴 核心 | 7 個資料檔（Essential + Detailed + Gacha） |
| `src/hooks/useLazyData.ts` | 🔴 核心 | Essential + 動態載入 Detailed |
| `src/hooks/useDataManagement.ts` | 🟡 重要 | Drops + MobInfo + Gacha |
| `src/lib/image-utils.ts` | 🟢 低 | available-images.json |

### 資料結構差異

| 面向 | `/data/` (現行) | `/chronostoryData/` (新) |
|------|----------------|--------------------------|
| 命名 | `snake_case` | `camelCase` |
| 結構 | 扁平 + 嵌套混合 | 統一嵌套 (`description`, `metaInfo`, `typeInfo`) |
| Essential | ✅ 有合併檔案 | ❌ 需要產生 |
| 額外欄位 | 基本 | `chineseName`, `icon`, `iconRaw`, `randomStats` |

---

## 遷移策略

### 策略選擇：**統一 camelCase + 產生 Essential**

**理由**：
1. `chronostoryData/` 已使用 camelCase，保持一致
2. 專案已有 `Enhanced*` 系列類型支援 camelCase
3. 保留額外資料的價值

---

## 實作步驟

### 階段 1：產生 Essential 檔案

**目標**：從 `chronostoryData/items-organized/` 產生合併的 Essential 檔案

**產出檔案**：
```
chronostoryData/
├── item-attributes-essential.json    # 合併所有物品的篩選屬性
├── item-index.json                   # 已存在，物品索引
└── monster-index.json                # 已存在，怪物索引
```

**Essential 結構設計**（符合現有篩選需求）：
```typescript
interface ItemAttributesEssential {
  itemId: number
  itemName: string
  chineseName: string | null
  type: string              // typeInfo.overallCategory
  category: string          // typeInfo.category
  subCategory: string       // typeInfo.subCategory

  // 裝備篩選欄位
  reqLevel: number | null
  reqStr: number | null
  reqDex: number | null
  reqInt: number | null
  reqLuk: number | null
  equipmentCategory: string | null
  equipmentClasses: Record<string, boolean> | null

  // 卷軸篩選欄位
  scrollCategory: string | null
}
```

**腳本位置**：`chronostoryData/scripts/generate-essential.js`

---

### 階段 2：更新 TypeScript 類型

**修改檔案**：`src/types/item-equipment.ts`

**策略**：擴展現有 `Enhanced*` 類型系列

```typescript
// 新增/修改類型
export interface ChronoItemEssential {
  itemId: number
  itemName: string
  chineseName: string | null
  type: string
  category: string
  subCategory: string
  reqLevel: number | null
  reqStr: number | null
  reqDex: number | null
  reqInt: number | null
  reqLuk: number | null
  equipmentCategory: string | null
  equipmentClasses: Record<string, boolean> | null
  scrollCategory: string | null
}

export interface ChronoItemDetailed {
  id: number
  description: {
    id: number
    name: string
    description: string
    chineseName: string | null
  }
  metaInfo: {
    only: boolean
    cash: boolean
    reqLevel?: number
    reqSTR?: number
    reqDEX?: number
    reqINT?: number
    reqLUK?: number
    reqJob?: number
    incSTR?: number
    incDEX?: number
    // ... 其他屬性
    icon: string
    iconRaw: string
  }
  typeInfo: {
    overallCategory: string
    category: string
    subCategory: string
  }
  randomStats?: Record<string, { base: number; min: number; max: number }>
}
```

---

### 階段 3：更新 Zod Schema

**修改檔案**：`src/schemas/items.schema.ts`

**新增**：
```typescript
export const ChronoItemEssentialSchema = z.object({
  itemId: z.number(),
  itemName: z.string(),
  chineseName: z.string().nullable(),
  type: z.string(),
  category: z.string(),
  subCategory: z.string(),
  reqLevel: z.number().nullable(),
  // ... 其他欄位
})

export const ChronoItemDetailedSchema = z.object({
  id: z.number(),
  description: z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    chineseName: z.string().nullable(),
  }),
  metaInfo: z.object({
    // ...
  }),
  typeInfo: z.object({
    overallCategory: z.string(),
    category: z.string(),
    subCategory: z.string(),
  }),
  randomStats: z.record(z.object({
    base: z.number(),
    min: z.number(),
    max: z.number(),
  })).optional(),
})
```

---

### 階段 4：更新資料載入層

#### 4.1 `src/lib/cache/items-cache.ts`

**修改**：
```typescript
// 舊
import itemsData from '@/../data/item-attributes-essential.json'

// 新
import itemsData from '@/../chronostoryData/item-attributes-essential.json'
```

**注意**：需同步更新 Map 建立邏輯以適應新的欄位名稱

#### 4.2 `src/hooks/useLazyData.ts`

**修改**：
```typescript
// 舊
import essentialData from '@/../data/item-attributes-essential.json'
const dataModule = await import(`@/../data/item-attributes-detailed/${itemId}.json`)

// 新
import essentialData from '@/../chronostoryData/item-attributes-essential.json'

// 動態載入需要判斷物品類型
const getItemCategory = (itemId: number): string => {
  if (itemId >= 1000000 && itemId < 2000000) return 'equipment'
  if (itemId >= 2000000 && itemId < 3000000) return 'consumable'
  return 'etc'
}
const category = getItemCategory(itemId)
const dataModule = await import(`@/../chronostoryData/items-organized/${category}/${itemId}.json`)
```

#### 4.3 `src/hooks/useDataManagement.ts`

**修改**：
```typescript
// 舊
import dropsEssentialData from '@/../data/drops-essential.json'
import mobInfoData from '@/../data/mob-info.json'

// 新
import dropsEssentialData from '@/../chronostoryData/drops-essential.json'  // 需產生
import mobInfoData from '@/../chronostoryData/mob-info.json'
```

---

### 階段 5：更新篩選邏輯

**修改檔案**：
- `src/lib/filter-utils.ts`
- `src/lib/item-list-utils.ts`
- `src/hooks/useFilterLogic.ts`

**主要變更**：將 snake_case 欄位存取改為 camelCase

```typescript
// 舊
item.req_level
item.equipment?.requirements?.req_str

// 新
item.reqLevel
item.metaInfo?.reqSTR
```

---

### 階段 6：更新 UI 元件

**受影響元件**：
- `src/components/ItemAttributesCard.tsx`
- `src/components/equipment/EquipmentStatsCard.tsx`
- `src/components/ItemModal.tsx`
- `src/components/DropItemCard.tsx`

**主要變更**：適應新的嵌套結構

```typescript
// 舊
<span>{item.item_name}</span>
<span>{item.equipment?.stats?.wdef}</span>

// 新
<span>{item.description.name}</span>
<span>{item.metaInfo?.incPDD}</span>
```

---

### 階段 7：產生缺失資料

**需要產生的檔案**：

1. **drops-essential.json** - 從 `drops-by-monster/` 產生
2. **item-attributes-essential.json** - 從 `items-organized/` 產生

**腳本**：`chronostoryData/scripts/generate-essential-files.js`

---

## 檔案修改清單

### 必須修改（核心）
- [ ] `src/types/item-equipment.ts` - 新增 Chrono* 類型
- [ ] `src/schemas/items.schema.ts` - 新增 Zod schema
- [ ] `src/lib/cache/items-cache.ts` - 更新匯入路徑和欄位存取
- [ ] `src/hooks/useLazyData.ts` - 更新匯入和動態載入邏輯
- [ ] `src/hooks/useDataManagement.ts` - 更新匯入路徑

### 必須修改（篩選）
- [ ] `src/lib/filter-utils.ts` - 更新欄位存取
- [ ] `src/lib/item-list-utils.ts` - 更新欄位存取
- [ ] `src/hooks/useFilterLogic.ts` - 適應新結構

### 必須修改（UI）
- [ ] `src/components/ItemAttributesCard.tsx`
- [ ] `src/components/equipment/EquipmentStatsCard.tsx`
- [ ] `src/components/ItemModal.tsx`
- [ ] `src/components/DropItemCard.tsx`

### 需要產生（資料）
- [ ] `chronostoryData/item-attributes-essential.json`
- [ ] `chronostoryData/drops-essential.json`

---

## 測試計劃

1. **單元測試**：篩選邏輯、資料轉換
2. **整合測試**：
   - 物品搜尋功能
   - 篩選功能（職業、等級、類型）
   - Modal 顯示詳細資訊
   - 轉蛋機功能
3. **效能測試**：
   - 頁面載入時間
   - Essential 檔案大小
   - 記憶體使用量

---

## 轉蛋機資料處理

**策略**：暫時保留使用 `/data/gacha/`，之後再產生

**理由**：
1. 轉蛋機資料結構複雜（含 Enhanced 屬性）
2. 優先確保核心物品/怪物資料遷移成功
3. 減少一次遷移的風險

**暫行方案**：
```typescript
// src/hooks/useDataManagement.ts
// 轉蛋機資料暫時保留原路徑
import('@/../data/gacha/machine-1-enhanced.json')
```

**未來工作**：
- [ ] 產生 `chronostoryData/gacha/` 目錄
- [ ] 轉換 Enhanced 格式為 chronostoryData 結構
- [ ] 更新轉蛋機載入邏輯

---

## 風險與回滾

### 風險
1. **類型不相容**：新舊類型混用可能導致 TypeScript 錯誤
2. **欄位缺失**：chronostoryData 可能缺少某些舊資料有的欄位
3. **效能影響**：Essential 檔案大小可能增加（包含更多欄位）

### 回滾策略
1. 保留 `/data/` 目錄直到確認穩定
2. Git 分支：`feature/chronostory-migration`
3. 部署前在 Preview 環境完整測試

---

## 預估工作量

| 階段 | 預估時間 |
|------|---------|
| 階段 1：產生 Essential | 1-2 小時 |
| 階段 2-3：類型和 Schema | 1 小時 |
| 階段 4：資料載入層 | 2 小時 |
| 階段 5：篩選邏輯 | 2 小時 |
| 階段 6：UI 元件 | 2-3 小時 |
| 階段 7：產生缺失資料 | 1 小時 |
| 測試和修復 | 2-3 小時 |
| **總計** | **11-14 小時** |
