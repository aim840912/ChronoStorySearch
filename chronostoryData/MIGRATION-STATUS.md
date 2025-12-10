# ChronoStory 資料遷移狀態

> 此文檔記錄 `chronostoryData/` 相對於專案需求的缺失項目，以便未來完成資料遷移。

**最後更新**：2025-12-10

---

## 目標

使用 `chronostoryData/` 完全替代 `data/` 資料夾，讓專案資料來源統一管理。

---

## 專案資料讀取位置

| 程式檔案 | 讀取的資料 | 用途 |
|---------|-----------|------|
| `src/lib/cache/items-cache.ts` | item-attributes-essential.json, item-attributes.json, drops-essential.json, gacha/* | 全域快取 |
| `src/hooks/useDataManagement.ts` | drops-essential.json, mob-info.json, item-attributes-essential.json, drops-100-percent.json, gacha/* | 主資料管理 |
| `src/hooks/useLazyData.ts` | item-attributes-essential.json, item-attributes-detailed/*, drops-detailed/*, mob-info.json | 懶加載 |
| `src/hooks/useGachaMachine.ts` | gacha/machine-*.json | 轉蛋機邏輯 |
| `src/lib/image-utils.ts` | available-images.json | 圖片可用性檢查 |
| `src/components/MerchantShopModal.tsx` | drops-100-percent.json | 商人專賣 Modal |
| `src/components/dev/DevApiTester.tsx` | maplestory-io-versions.json | 開發工具 |

---

## 已有資料

| 資料類型 | 檔案/目錄 | 數量 | 說明 |
|---------|----------|------|------|
| 物品資料 | [items-organized/](./items-organized/) | 1,893 檔案 | 按類型分類 (consumable, equipment, etc) |
| 怪物掉落 | [drops-by-monster/](./drops-by-monster/) | 169 檔案 | 每個怪物一個 JSON |
| 物品掉落來源 | [drops-by-item/](./drops-by-item/) | 1,937 檔案 | 每個物品一個 JSON |
| 扭蛋機 | [gachapon/](./gachapon/) | 7 檔案 | 簡化格式 |
| 怪物資訊 | [mob-info.json](./mob-info.json) | 1 檔案 | 怪物基本資訊 |
| 物品索引 | [item-index.json](./item-index.json) | 1 檔案 | 快速查詢用 |
| 怪物索引 | [monster-index.json](./monster-index.json) | 1 檔案 | 快速查詢用 |
| 掉落關係 | [drop-relations.json](./drop-relations.json) | 1 檔案 | mobToItems 對應表 |
| 圖片清單 | [available-images.json](./available-images.json) | 1 檔案 | 從 data/ 複製 |

---

## 缺失項目清單

### 高優先 - 前端啟動必需

這些檔案是前端應用啟動時會載入的核心資料：

| 缺失項目 | data/ 路徑 | 大小 | 用途 | 生成方式 |
|---------|-----------|------|------|---------|
| 掉落索引 | [drops-essential.json](../data/drops-essential.json) | 1.2 MB | 搜尋索引、列表顯示 | 從 [drops-by-monster/](./drops-by-monster/) 合併生成 |
| 物品屬性 (Essential) | [item-attributes-essential.json](../data/item-attributes-essential.json) | 544 KB | 物品列表顯示、篩選 | 從 [items-organized/](./items-organized/) 轉換生成 |
| 轉蛋機 (Enhanced) | `gacha/machine-{1-7}-enhanced.json` | 3 MB | 轉蛋機顯示 | 轉換 [gachapon/](./gachapon/) 格式 |

#### drops-essential.json 格式需求

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

#### item-attributes-essential.json 格式需求

```json
[
  {
    "item_id": "1002005",
    "item_name": "Iron Burgernet Helm",
    "type": "Eqp",
    "sub_type": "Cap",
    "req_level": 25,
    "equipment_category": "Hat",
    "equipment_classes": {
      "beginner": null,
      "warrior": true,
      "magician": null,
      "bowman": null,
      "thief": null,
      "pirate": null
    },
    "scroll_category": null
  }
]
```

#### gacha/machine-*-enhanced.json 格式需求

```json
{
  "machineId": 1,
  "machineName": "LithHarbor",
  "chineseMachineName": "維多利亞港",
  "totalItems": 114,
  "items": [
    {
      "chineseName": "黃金祖母綠耳環",
      "probability": "0.07%",
      "chance": 12500,
      "itemId": 1032026,
      "itemName": "Gold Emerald Earrings",
      "type": "Eqp",
      "subType": "Accessory"
    }
  ]
}
```

---

### 中優先 - 懶加載功能

這些檔案是使用者互動時才會載入的詳細資料：

| 缺失項目 | data/ 路徑 | 大小 | 用途 | 生成方式 |
|---------|-----------|------|------|---------|
| 物品詳細資訊 | [item-attributes-detailed/](../data/item-attributes-detailed/) | 5.4 MB (1,355 檔案) | 物品 Modal 詳細資訊 | 從 [items-organized/](./items-organized/) 轉換格式 |
| 怪物掉落詳細 | [drops-detailed/](../data/drops-detailed/) | 1.5 MB (169 檔案) | 怪物掉落 Modal | 調整 [drops-by-monster/](./drops-by-monster/) 格式 |
| 物品屬性 (完整) | [item-attributes.json](../data/item-attributes.json) | 2.2 MB | 詳細屬性查詢 | 從 [items-organized/](./items-organized/) 合併生成 |

#### item-attributes-detailed/{itemId}.json 格式需求

```json
{
  "item_type_id": 7,
  "sale_price": 9500,
  "equipment": {
    "category": "Hat",
    "requirements": { "req_level": 25, "req_str": 60 },
    "stats": { "wdef": 25, "upgrades": 7 },
    "stat_variation": { ... }
  }
}
```

#### drops-detailed/{mobId}.json 格式需求

與現有 `drops-by-monster/{mobId}.json` 格式類似，可能需要微調欄位名稱。

---

### 低優先 - 輔助功能

| 缺失項目 | data/ 路徑 | 大小 | 用途 | 生成方式 |
|---------|-----------|------|------|---------|
| 商人專賣 | [drops-100-percent.json](../data/drops-100-percent.json) | 12 KB | 商人 Modal | 從掉落資料篩選 chance=100% |
| 掉落完整資料 | [drops.json](../data/drops.json) | 899 KB | 完整掉落查詢 | 合併 [drops-by-monster/](./drops-by-monster/) |
| 掉落索引 | [drops-index.json](../data/drops-index.json) | 280 KB | 優化查詢 | 從掉落資料生成雙向索引 |
| API 版本資訊 | [maplestory-io-versions.json](../data/maplestory-io-versions.json) | 7.6 KB | 開發工具 | 直接從 `data/` 複製 |

---

## 格式差異對照

### 1. 現有 gachapon/ vs 需要的 gacha/

**現有 `gachapon/lith-harbor.json`**：
```json
{
  "name": "Lith Harbor Gachapon",
  "location": "Lith Harbor",
  "totalItems": 114,
  "items": [{
    "itemId": 1442002,
    "name": "Eviscerator",
    "chance": 33333,
    "percent": "0.10%"
  }]
}
```

**需要的 `gacha/machine-1-enhanced.json`**：
```json
{
  "machineId": 1,
  "machineName": "LithHarbor",
  "chineseMachineName": "維多利亞港",
  "totalItems": 114,
  "items": [{
    "chineseName": "黃金祖母綠耳環",
    "probability": "0.07%",
    "chance": 12500,
    "itemId": 1032026,
    "itemName": "Gold Emerald Earrings",
    "type": "Eqp",
    "subType": "Accessory"
  }]
}
```

**轉換需求**：
- 新增 `machineId`, `machineName`, `chineseMachineName`
- 物品新增 `chineseName`, `type`, `subType` (從 items-organized 查詢)
- `percent` → `probability`

---

### 2. 現有 items-organized/ vs 需要的 item-attributes-essential.json

**現有 `items-organized/equipment/1002005.json`**：
```json
{
  "id": 1002005,
  "description": {
    "name": "Iron Burgernet Helm",
    "chineseName": "鐵色戰鬥頭盔"
  },
  "metaInfo": {
    "reqLevel": 25,
    "reqSTR": 60,
    "reqJob": 1
  },
  "typeInfo": {
    "overallCategory": "Equip",
    "category": "Armor",
    "subCategory": "Hat"
  }
}
```

**需要的格式**：
```json
{
  "item_id": "1002005",
  "item_name": "Iron Burgernet Helm",
  "type": "Eqp",
  "sub_type": "Hat",
  "req_level": 25,
  "equipment_category": "Hat",
  "equipment_classes": {
    "beginner": null,
    "warrior": true,
    "magician": null,
    "bowman": null,
    "thief": null,
    "pirate": null
  }
}
```

**轉換需求**：
- `id` → `item_id` (字串)
- `description.name` → `item_name`
- `typeInfo.overallCategory` → `type` (Equip → Eqp)
- `typeInfo.subCategory` → `sub_type`
- `metaInfo.reqLevel` → `req_level`
- `metaInfo.reqJob` → `equipment_classes` (需要解碼 job bitmask)

---

## 轉換腳本建議

建議在 `chronostoryData/scripts/` 建立以下腳本：

1. **`generate-essential-data.js`**
   - 生成 [drops-essential.json](../data/drops-essential.json)
   - 生成 [item-attributes-essential.json](../data/item-attributes-essential.json)

2. **`generate-detailed-data.js`**
   - 生成 [item-attributes-detailed/](../data/item-attributes-detailed/) 目錄
   - 生成 [item-attributes.json](../data/item-attributes.json)

3. **`convert-gacha-format.js`**
   - 轉換 [gachapon/](./gachapon/) → `gacha/machine-*-enhanced.json`

4. **`generate-drops-data.js`**
   - 生成 [drops-detailed/](../data/drops-detailed/)
   - 生成 [drops.json](../data/drops.json)
   - 生成 [drops-index.json](../data/drops-index.json)
   - 生成 [drops-100-percent.json](../data/drops-100-percent.json)

---

## 遷移進度追蹤

| 項目 | 狀態 | 完成日期 |
|------|------|---------|
| 分析專案資料需求 | ✅ 完成 | 2025-12-10 |
| 建立 MIGRATION-STATUS.md | ✅ 完成 | 2025-12-10 |
| 複製 available-images.json | ✅ 完成 | 2025-12-10 |
| 生成 drops-essential.json | ⬜ 待處理 | - |
| 生成 item-attributes-essential.json | ⬜ 待處理 | - |
| 轉換 gacha/machine-*-enhanced.json | ⬜ 待處理 | - |
| 生成 item-attributes-detailed/ | ⬜ 待處理 | - |
| 生成 drops-detailed/ | ⬜ 待處理 | - |
| 生成 item-attributes.json | ⬜ 待處理 | - |
| 生成 drops-100-percent.json | ⬜ 待處理 | - |
| 生成 drops.json | ⬜ 待處理 | - |
| 生成 drops-index.json | ⬜ 待處理 | - |
| 複製 maplestory-io-versions.json | ⬜ 待處理 | - |
| 修改程式碼引用 | ⬜ 待處理 | - |
