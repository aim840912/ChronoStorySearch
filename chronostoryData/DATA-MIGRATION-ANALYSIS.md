# data/ → chronostoryData/ 遷移分析

> 本文檔分析從 `data/` 遷移到 `chronostoryData/` 所需的變更

---

## 目錄結構對比

### data/ (現有)

| 檔案/目錄 | 筆數 | 用途 |
|-----------|------|------|
| `drops-essential.json` | 4,714 | 掉落搜尋索引（扁平陣列） |
| `drops-detailed/` | - | 詳細掉落資料（按需載入） |
| `drops.json` | - | 完整掉落資料 |
| `mob-info.json` | 166 | 怪物等級/屬性資訊 |
| `item-attributes-essential.json` | 1,355 | 物品篩選屬性 |
| `item-attributes.json` | - | 完整物品屬性 |
| `drops-100-percent.json` | 3 | 商人 100% 掉落 |
| `gacha/` | 7 | 轉蛋機資料（enhanced 格式） |
| `available-images.json` | - | 圖片清單 |

### chronostoryData/ (新)

| 檔案/目錄 | 筆數 | 用途 |
|-----------|------|------|
| `drops-by-monster/` | 169 | 按怪物分檔的掉落資料 |
| `drops-by-item/` | 1,583 | 按物品分檔的掉落資料 |
| `monster-index.json` | 1,024 | 怪物索引（含 dropCount） |
| `item-index.json` | 1,583 | 物品索引（含 monsterCount） |
| `mob-info.json` | 172 | 怪物等級/屬性資訊 |
| `items-organized/` | 1,890 | 按類別組織的物品詳情 |
| `gachapon/` | 7 | 轉蛋機資料（簡化格式） |
| `available-images.json` | - | 圖片清單（相同） |
| `drop-relations.json` | - | 掉落關係 |
| `csv-data/` | - | 原始 CSV 資料 |

---

## 資料結構差異

### 1. 掉落資料

**data/drops-essential.json** (扁平陣列)
```json
[
  {
    "mobId": 100100,
    "mobName": "Snail",
    "chineseMobName": "嫩寶",
    "itemId": 4000019,
    "itemName": "Snail Shell",
    "chineseItemName": "嫩寶殼",
    "chance": 60,
    "minQty": 1,
    "maxQty": 1
  }
]
// 每筆 = 一個掉落關係
// 總筆數：4,714
```

**chronostoryData/drops-by-monster/100100.json** (按怪物分檔)
```json
{
  "mobId": 100100,
  "mobName": "Snail",
  "chineseMobName": "嫩寶",
  "isBoss": false,
  "inGame": true,
  "totalDrops": 12,
  "drops": [
    {
      "itemId": 4000019,
      "itemName": "Snail Shell",
      "chineseItemName": "嫩寶殼",
      "chance": 60,
      "displayChance": "60.0%",
      "minQty": 1,
      "maxQty": 1,
      "questId": 0,
      "enabled": true
    }
  ]
}
// 每檔案 = 一隻怪物的所有掉落
// 總檔案：169
```

**遷移方式**：需合併 `drops-by-monster/*.json` 成扁平陣列，或修改程式碼直接讀取分檔

---

### 2. 怪物資訊

**data/mob-info.json**
```json
{
  "mob": {
    "mob_id": "100100",
    "mob_name": "Snail",
    "released": 1,
    "max_hp": 8,
    "acc": 10,
    "avoid": 0,
    "level": 1,
    "exp": 3,
    "phys_def": 0,
    "mag_def": 0,
    "fire_weakness": "normal",
    ...
  },
  "chineseMobName": "嫩寶"
}
```

**chronostoryData/mob-info.json**
```json
{
  "mob": {
    "InGame": true,
    "id": "100100",
    "name": "Snail",
    "maxHP": 8,
    "accuracy": 10,
    "evasion": 0,
    "level": 1,
    "exp": 3,
    "physicalDefense": 0,
    "magicDefense": 0,
    "fire_weakness": "normal",
    ...
  },
  "chineseMobName": "嫩寶"
}
```

**差異**：
| data/ 欄位 | chronostoryData/ 欄位 |
|------------|----------------------|
| `mob_id` | `id` |
| `mob_name` | `name` |
| `max_hp` | `maxHP` |
| `acc` | `accuracy` |
| `avoid` | `evasion` |
| `phys_def` | `physicalDefense` |
| `mag_def` | `magicDefense` |
| `released` | `InGame` |

---

### 3. 物品屬性

**data/item-attributes-essential.json**
```json
{
  "item_id": "1002005",
  "item_name": "Iron Burgernet Helm",
  "type": "Hat",
  "sub_type": null,
  "req_level": 25,
  "req_str": 60,
  "req_dex": 0,
  "req_int": 0,
  "req_luk": 0,
  "equipment_category": "Warrior",
  "equipment_classes": ["Beginner", "Warrior"],
  "scroll_category": null
}
```

**chronostoryData/items-organized/equipment/1002005.json**
```json
{
  "id": 1002005,
  "description": {
    "id": 1002005,
    "name": "Iron Burgernet Helm",
    "description": "",
    "chineseItemName": "鋼製騎士頭盔"
  },
  "metaInfo": {
    "only": false,
    "cash": false,
    "reqLevel": 25,
    "iconRaw": "...",
    "icon": "...",
    "price": 9500,
    "reqSTR": 60,
    "reqDEX": 0,
    "reqINT": 0,
    "reqLUK": 0,
    "reqJob": 1,
    "tuc": 7,
    "incPDD": 25
  },
  "typeInfo": {
    "overallCategory": "Equip",
    "category": "Armor",
    "subCategory": "Hat"
  },
  "randomStats": { ... }
}
```

**差異**：
- `data/` 使用 snake_case，`chronostoryData/` 使用 camelCase
- `chronostoryData/` 結構更巢狀但資訊更完整
- `chronostoryData/` 包含 icon base64

---

### 4. 轉蛋機

**data/gacha/machine-1-enhanced.json**
```json
{
  "machineId": 1,
  "machineName": "Gachapon - Ellinia",
  "chineseMachineName": "艾麗妮雅轉蛋",
  "description": "...",
  "totalItems": 95,
  "items": [
    {
      "itemId": 1002024,
      "itemName": "Emerald Dome",
      "chineseName": "祖母綠武士頭盔",
      "probability": "★★★★☆",
      "chance": "2.1%",
      "equipment": { ... },
      "statVariation": { ... }
    }
  ]
}
```

**chronostoryData/gachapon/ellinia.json**
```json
{
  "name": "Ellinia",
  "location": "Ellinia",
  "totalItems": 95,
  "items": [
    {
      "itemId": 1002024,
      "name": "Emerald Dome",
      "chance": 0.021,
      "percent": "2.1%"
    }
  ]
}
```

**差異**：
- `data/` 版本包含完整物品資訊（enhanced）
- `chronostoryData/` 版本較簡化，需從 `items-organized/` 補充詳情
- 命名方式不同（machineId vs location-based）

---

## 程式碼使用點

### 需要修改的檔案

| 檔案 | 引用的 data/ 資源 |
|------|------------------|
| `src/hooks/useDataManagement.ts` | `drops-essential.json`, `mob-info.json`, `item-attributes-essential.json`, `drops-100-percent.json` |
| `src/lib/cache/items-cache.ts` | `item-attributes-essential.json`, `item-attributes.json`, `drops-essential.json`, `gacha/*.json` |
| `src/lib/image-utils.ts` | `available-images.json` |
| `src/hooks/useLazyData.ts` | `item-attributes-essential.json` |

### 引用方式
```typescript
// 目前
import dropsEssentialData from '@/../data/drops-essential.json'
import mobInfoData from '@/../data/mob-info.json'
import itemAttributesEssentialData from '@/../data/item-attributes-essential.json'

// 遷移後需要
// 選項 A: 建立轉換腳本產生相容格式
// 選項 B: 修改程式碼適應新格式
```

---

## 遷移建議

### 選項 A：建立轉換腳本（最小變更）

建立腳本將 `chronostoryData/` 轉換為 `data/` 相容格式：

1. **drops-essential.json 生成器**
   - 讀取 `drops-by-monster/*.json`
   - 展開成扁平陣列
   - 輸出到 `data/drops-essential.json`

2. **item-attributes-essential.json 生成器**
   - 讀取 `items-organized/**/*.json`
   - 轉換欄位名稱
   - 輸出到 `data/item-attributes-essential.json`

3. **mob-info.json 轉換器**
   - 讀取 `chronostoryData/mob-info.json`
   - 轉換欄位名稱（id→mob_id, name→mob_name 等）
   - 輸出到 `data/mob-info.json`

**優點**：程式碼無需變更
**缺點**：需維護兩份資料

### 選項 B：修改程式碼（長期方案）

直接修改程式碼讀取新格式：

1. **useDataManagement.ts**
   - 改為動態 import `drops-by-monster/*.json`
   - 修改 mob-info 欄位映射
   - 修改 item-attributes 讀取邏輯

2. **items-cache.ts**
   - 調整轉蛋機資料讀取

3. **型別定義**
   - 更新 `types/` 中的介面定義

**優點**：單一資料來源
**缺點**：需大量程式碼變更

### 選項 C：混合方案（推薦）

1. 使用 `chronostoryData/` 的新索引檔案：
   - `monster-index.json` → 取代搜尋用的怪物列表
   - `item-index.json` → 取代搜尋用的物品列表

2. 詳細資料按需載入：
   - `drops-by-monster/{id}.json` → Modal 詳情
   - `items-organized/{category}/{id}.json` → 物品詳情

3. 保留相容層：
   - `mob-info.json` 可直接使用（僅欄位名稱不同）
   - `available-images.json` 完全相容

---

## 缺失資料

以下 `data/` 資料在 `chronostoryData/` 中**沒有對應**：

| data/ 檔案 | 說明 | 建議 |
|------------|------|------|
| `drops-100-percent.json` | 商人掉落（3 個地圖） | 需從 CSV 建立 |
| `item-id-rules.json` | 物品 ID 規則 | 可能不需要 |
| `ludibrium-clocktower-monsters.json` | 時鐘塔怪物 | 特殊用途 |
| `map-translation-draft.json` | 地圖翻譯 | 草稿 |
| `maplestory-io-versions.json` | API 版本 | 參考用 |
| `monsters-animations-result.json` | 動畫結果 | 特殊用途 |

---

## 下一步行動

- [ ] 決定採用哪個遷移方案
- [ ] 建立缺失的 `drops-100-percent.json` 對應資料
- [ ] 建立遷移腳本或修改程式碼
- [ ] 測試遷移後功能正常
- [ ] 移除舊的 `data/` 目錄（遷移完成後）
