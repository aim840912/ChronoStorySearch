# 資料目錄說明

本目錄包含 MapleStory 編年史搜尋系統的所有 JSON 資料檔案。

## 📂 目錄結構

```
data/
├── README.md                          # 本檔案
├── drops.json                         # 完整掉落資料（資料生成來源）
├── drops-essential.json               # 精簡掉落資料（前端使用）
├── drops-index.json                   # 掉落資料索引（優化用，未啟用）
├── drops-detailed/                    # 按怪物 ID 拆分的掉落資料
│   ├── 100100.json                    # 嫩寶的掉落資料
│   ├── 120100.json                    # 紅蝸牛的掉落資料
│   └── ...                            # 共 132 個檔案
├── item-attributes.json               # 完整物品屬性（資料生成來源）
├── item-attributes-essential.json     # 精簡物品屬性（前端使用）
├── item-attributes-detailed/          # 按物品 ID 拆分的物品屬性
│   ├── 1002005.json                   # 鋼鐵盔甲頭盔的屬性
│   ├── 2040001.json                   # 帽子防禦卷軸的屬性
│   └── ...                            # 共 1,355 個檔案
├── mob-info.json                      # 怪物資訊（等級、HP、經驗值）
├── mob-maps.json                      # 怪物出現地圖資訊
├── available-images.json              # 可用圖片清單
└── gacha/                             # 轉蛋機資料
    ├── machine-1-enhanced.json        # 勇士之村轉蛋機（完整資料）
    ├── machine-2-enhanced.json        # 弓箭手村轉蛋機
    ├── machine-3-enhanced.json        # 魔法森林轉蛋機
    ├── machine-4-enhanced.json        # 墮落城市轉蛋機
    ├── machine-5-enhanced.json        # 奇幻村轉蛋機
    ├── machine-6-enhanced.json        # 神木村轉蛋機
    └── machine-7-enhanced.json        # 武陵轉蛋機
```

---

## 🗄️ 資料檔案說明

### 1. 掉落資料 (Drops Data)

#### `drops.json` (898 KB, 3,662 條記錄)
**用途**：資料生成管道的**來源檔案**
**使用者**：僅供腳本使用（`split-drops.js`、`download-item-icons.js` 等）
**前端載入**：❌ 不載入

**結構**：
```json
[
  {
    "mobId": 100100,
    "mobName": "Snail",
    "chineseMobName": "嫩寶",
    "itemId": 1002067,
    "itemName": "Green Headband",
    "chineseItemName": "綠髮帶",
    "chance": 0.001287,
    "minQty": 1,
    "maxQty": 1
  }
]
```

#### `drops-essential.json` (898 KB, 3,662 條記錄)
**用途**：前端預載入，用於搜尋和列表顯示
**載入時機**：應用啟動時（靜態 import）
**使用位置**：`src/hooks/useDataManagement.ts`

**結構**：與 `drops.json` 相同

#### `drops-index.json` (280 KB) 🆕
**用途**：輕量級索引，用於優化前端載入（**目前未啟用**）
**生成腳本**：`scripts/generate-drops-index.js`

**結構**：
```json
{
  "itemToMobs": {
    "1002067": [100100, 120100]
  },
  "mobToItems": {
    "100100": [0, 1002067, 1040002]
  },
  "items": {
    "1002067": {
      "name": "Green Headband",
      "chineseName": "綠髮帶"
    }
  },
  "mobs": {
    "100100": {
      "name": "Snail",
      "chineseName": "嫩寶"
    }
  }
}
```

**優化效果**：節省 68.9% 初始載入大小（618 KB）

#### `drops-detailed/{mobId}.json` (共 132 個檔案，每個約 6.81 KB)
**用途**：單一怪物的完整掉落資料
**載入時機**：開啟 MonsterModal 時（動態 import）
**使用位置**：`src/hooks/useLazyData.ts` (`useLazyDropsDetailed`)

**結構**：與 `drops-essential.json` 相同，但僅包含該怪物的掉落

---

### 2. 物品屬性 (Item Attributes)

#### `item-attributes.json` (2.5 MB, 132,344 行)
**用途**：資料生成管道的**來源檔案**
**使用者**：僅供腳本使用（`split-item-attributes-by-id.js` 等）
**前端載入**：❌ 不載入

#### `item-attributes-essential.json` (540 KB, 25,779 行)
**用途**：前端預載入，用於物品列表和篩選
**載入時機**：應用啟動時（靜態 import）
**使用位置**：`src/hooks/useLazyData.ts` (`useItemAttributesEssential`)

**結構**：
```json
[
  {
    "item_id": "1002005",
    "item_name": "Iron Burgernet Helm",
    "type": "Eqp",
    "sub_type": "Cap",
    "req_level": 25,
    "req_str": 60,
    "equipment_category": "Hat",
    "equipment_classes": { "warrior": true },
    "scroll_category": null
  }
]
```

#### `item-attributes-detailed/{itemId}.json` (共 1,355 個檔案，每個約 2 KB)
**用途**：單一物品的完整屬性資料
**載入時機**：開啟 ItemModal 時（動態 import）
**使用位置**：`src/hooks/useLazyData.ts` (`useLazyItemDetailed`)

**結構**：
```json
{
  "item_type_id": 3,
  "sale_price": 1,
  "untradeable": null,
  "scroll": {
    "category": "Hat",
    "successRate": 60,
    "stats": { "avoidability": 3, "hp": 15 },
    "randomStats": {
      "str": { "min": 0, "max": 1 }
    }
  }
}
```

---

### 3. 轉蛋機資料 (Gacha Data)

#### `gacha/machine-{1-7}-enhanced.json` (共 7 個檔案，476 KB ~ 708 KB)
**用途**：各轉蛋機的完整物品資料（包含屬性、機率）
**載入時機**：使用者首次搜尋轉蛋機時（動態 import）
**使用位置**：`src/hooks/useDataManagement.ts` (`loadGachaMachines`)

**結構**：
```json
{
  "machineId": 2,
  "machineName": "Henesys",
  "chineseMachineName": "弓箭手村",
  "totalItems": 200,
  "items": [
    {
      "chineseName": "藍色梅杜斯",
      "probability": "0.13%",
      "chance": 33333,
      "itemId": 1452025,
      "itemName": "Blue Metus",
      "equipment": {
        "category": "Bow",
        "requirements": { "reqLevel": 90 },
        "stats": { "watk": 90 }
      }
    }
  ]
}
```

**重要**：`itemId` 必須為 `number` 型別（不是 string）

---

### 4. 怪物資訊 (Monster Info)

#### `mob-info.json` (192 KB, 6,091 行)
**用途**：怪物的基本資訊（等級、HP、經驗值）
**載入時機**：應用啟動時（靜態 import）

**結構**：
```json
[
  {
    "mobId": 100100,
    "mobName": "Snail",
    "level": 1,
    "hp": 50,
    "exp": 3,
    "chineseMobName": "嫩寶"
  }
]
```

#### `mob-maps.json` (68 KB)
**用途**：怪物出現的地圖資訊
**載入時機**：使用者查看怪物地圖時（動態 import）

---

## 🛠️ 資料生成腳本

### 核心腳本

| 腳本 | 用途 | 輸入 | 輸出 |
|------|------|------|------|
| `split-drops.js` | 拆分掉落資料 | `drops.json` | `drops-essential.json` + `drops-detailed/*.json` |
| `split-item-attributes-by-id.js` | 拆分物品屬性 | `item-attributes.json` | `item-attributes-essential.json` + `item-attributes-detailed/*.json` |
| `generate-drops-index.js` 🆕 | 生成掉落索引 | `drops.json` | `drops-index.json` |
| `fix-gacha-itemid-type.js` 🆕 | 修正轉蛋機 itemId 型別 | `gacha/*.json` | 更新現有檔案 |
| `enhance-gacha-data.js` | 增強轉蛋機資料 | `gacha/machine-{id}.json` | `gacha/machine-{id}-enhanced.json` |

### 執行指令

```bash
# 拆分掉落資料
node scripts/split-drops.js

# 拆分物品屬性
node scripts/split-item-attributes-by-id.js

# 生成掉落索引（可選）
node scripts/generate-drops-index.js

# 修正轉蛋機 itemId 型別
node scripts/fix-gacha-itemid-type.js

# 增強轉蛋機資料（需要 API）
node scripts/enhance-gacha-data.js
```

---

## 📊 資料統計

### 檔案數量

| 類別 | 檔案數 | 總大小 |
|------|--------|--------|
| 掉落資料 (Drops) | 134 | ~1.9 MB |
| 物品屬性 (Items) | 1,357 | ~8.4 MB |
| 轉蛋機資料 (Gacha) | 7 | ~3.0 MB |
| 怪物資訊 (Monster) | 2 | ~260 KB |
| **總計** | **1,500** | **~13.5 MB** |

### 前端載入策略

| 階段 | 載入內容 | 大小 | 載入方式 |
|------|----------|------|----------|
| **應用啟動** | `drops-essential.json` | 898 KB | 靜態 import |
| | `item-attributes-essential.json` | 540 KB | 靜態 import |
| | `mob-info.json` | 192 KB | 靜態 import |
| | **小計** | **1.6 MB** | |
| **開啟 ItemModal** | `item-attributes-detailed/{id}.json` | ~2 KB | 動態 import |
| **開啟 MonsterModal** | `drops-detailed/{id}.json` | ~6.81 KB | 動態 import |
| **首次搜尋轉蛋** | `gacha/machine-*-enhanced.json` (7 個) | ~3 MB | 動態 import |

**優化效果**：
- 初始載入：1.6 MB（vs. 完整資料 13.5 MB）
- 節省比例：**88.1%**

---

## 🔧 資料維護指南

### 更新掉落資料

1. 更新來源檔案：`data/drops.json`
2. 執行拆分腳本：
   ```bash
   node scripts/split-drops.js
   ```
3. (可選) 重新生成索引：
   ```bash
   node scripts/generate-drops-index.js
   ```
4. 測試前端功能是否正常

### 更新物品屬性

1. 更新來源檔案：`data/item-attributes.json`
2. 執行拆分腳本：
   ```bash
   node scripts/split-item-attributes-by-id.js
   ```
3. 測試前端功能是否正常

### 更新轉蛋機資料

1. 更新原始 JSON（如果有）或使用 CSV 轉換：
   ```bash
   node scripts/convert-gacha-sheets.js /path/to/csv
   ```
2. 增強轉蛋機資料（需要 API）：
   ```bash
   node scripts/enhance-gacha-data.js
   ```
3. 確保 `itemId` 為 number 型別：
   ```bash
   node scripts/fix-gacha-itemid-type.js
   ```
4. 測試前端功能是否正常

### 資料驗證

專案已整合 Zod Schema 驗證，可自動驗證資料格式：

- 掉落資料：`src/schemas/drops.schema.ts`
- 物品屬性：`src/schemas/items.schema.ts`

驗證會在前端載入時自動執行（`useLazyData.ts`），驗證失敗時會記錄警告日誌。

---

## 🚨 注意事項

### 1. 資料型別一致性

**重要**：所有 `itemId` 必須為 **number** 型別（不是 string）

- ✅ `"itemId": 1002067`
- ❌ `"itemId": "1002067"`

**檢查方式**：
```bash
# 檢查是否有 string 型別的 itemId
grep -r '"itemId": "' data/gacha/
```

### 2. JSON 格式規範

- 使用 2 空格縮排
- 欄位使用 snake_case（資料檔案）或 camelCase（增強檔案）
- 布林值使用 `true`/`false`（不是字串）
- 空值使用 `null`（不是 undefined）

### 3. 檔案命名規範

- 按 ID 拆分的檔案：`{id}.json`（如 `100100.json`）
- 增強檔案：`{name}-enhanced.json`
- 精簡檔案：`{name}-essential.json`
- 索引檔案：`{name}-index.json`

---

## 📚 相關文檔

- TypeScript 型別定義：`src/types/index.ts`
- Zod Schema 定義：`src/schemas/*.schema.ts`
- 資料載入 Hooks：`src/hooks/useDataManagement.ts`, `src/hooks/useLazyData.ts`
- 專案開發指南：`/CLAUDE.md`

---

**最後更新**：2025-10-30
**維護者**：Claude Code
