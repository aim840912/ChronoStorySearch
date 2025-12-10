# data/ 移除遷移計劃

> 本文檔詳細記錄如何讓 `chronostoryData/` 完全取代 `data/` 目錄。

---

## 一、檔案對應總覽

| data/ 檔案 | 狀態 | chronostoryData/ 對應 | 行動 |
|------------|------|----------------------|------|
| `drops-essential.json` | 需建立 | 從 `drops-by-monster/` 合併 | 建立腳本 |
| `mob-info.json` | 需轉換 | `mob-info.json` (欄位不同) | 轉換欄位 |
| `item-attributes-essential.json` | 需建立 | 從 `items-organized/` 提取 | 建立腳本 |
| `drops-100-percent.json` | 缺失 | ❌ 無對應 | 從 CSV 建立 |
| `gacha/*.json` | 需補充 | `gachapon/*.json` (簡化格式) | 補充資料 |
| `available-images.json` | ✅ 相同 | `available-images.json` | 直接使用 |
| `drops.json` | 可刪除 | `drops-by-monster/` | 不需要 |
| `drops-detailed/` | 可刪除 | `drops-by-monster/` | 不需要 |
| `drops-index.json` | 可刪除 | `monster-index.json` | 不需要 |
| `item-attributes.json` | 可刪除 | `items-organized/` | 不需要 |
| `item-attributes-detailed/` | 可刪除 | `items-organized/` | 不需要 |
| `item-ids.json` | 可刪除 | 不需要 | - |
| `item-id-rules.json` | 可刪除 | 不需要 | - |
| `maplestory-io-versions.json` | 可刪除 | 參考用 | - |
| `monsters-animations-result.json` | 可刪除 | 一次性結果 | - |
| `ludibrium-clocktower-monsters.json` | 可刪除 | 特殊用途 | - |
| `map-translation-draft.json` | 可刪除 | 草稿 | - |

---

## 二、需要建立的新檔案

### 1. 掉落搜尋（使用索引方案）

**用途**：搜尋索引和怪物/物品關係查詢

**方案**：使用現有的 3 個索引檔案，不需要建立新的 `drops-essential.json`

| 檔案 | 大小 | 用途 |
|------|------|------|
| `monster-index.json` | 28 KB | 怪物搜尋（名稱、Boss 標籤、dropCount） |
| `item-index.json` | 224 KB | 物品搜尋（名稱、monsterCount） |
| `drop-relations.json` | 484 KB | 怪物↔物品 ID 映射關係 |
| **總計** | **736 KB** | 比合併方案節省 39% |

**搜尋流程**：
```
1. 用戶搜尋 "Snail"
2. 從 monster-index.json 找到 mobId: 100100
3. 從 drop-relations.json 獲取掉落物品 ID 列表
4. 從 item-index.json 獲取物品名稱（用於顯示）
5. 點擊怪物 → 按需載入 drops-by-monster/100100.json（詳細機率、數量）
```

**優點**：
- 初始載入減少 39% (736 KB vs 1.2 MB)
- 詳細資訊按需載入
- 資料不重複，索引結構清晰

**程式碼修改**：
- `src/hooks/useDataManagement.ts` - 載入 3 個索引檔案
- `src/hooks/useSearchLogic.ts` - 使用索引建立搜尋 Map
- `src/lib/cache/items-cache.ts` - 改用 item-index.json 初始化

---

### 2. item-attributes-essential.json

**用途**：物品篩選屬性

**來源**：從 `items-organized/**/*.json` 提取

**目標格式**：
```json
[
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
]
```

**欄位映射**：
| data/ 欄位 | items-organized/ 來源 |
|------------|----------------------|
| `item_id` | `id` |
| `item_name` | `description.name` |
| `type` | `typeInfo.subCategory` |
| `sub_type` | `typeInfo.subCategory` |
| `req_level` | `metaInfo.reqLevel` |
| `req_str` | `metaInfo.reqSTR` |
| `req_dex` | `metaInfo.reqDEX` |
| `req_int` | `metaInfo.reqINT` |
| `req_luk` | `metaInfo.reqLUK` |
| `equipment_category` | 根據 `metaInfo.reqJob` 計算 |
| `equipment_classes` | 根據 `metaInfo.reqJob` 計算 |
| `scroll_category` | 根據物品 ID 範圍判斷 |

---

### 3. drops-100-percent.json（商人掉落）

**用途**：NPC 商人販售物品

**來源**：從 `csv-data/` 建立或手動整理

**目標格式**：
```json
[
  {
    "mapId": "105040306",
    "mapName": "Warning Street - The Swamp of Despair II",
    "chineseMapName": "絕望沼澤 II",
    "region": "Sleepywood",
    "drops": [
      {
        "itemId": 2000000,
        "itemName": "Red Potion",
        "chineseItemName": "紅色藥水",
        "chance": 100,
        "minQty": 1,
        "maxQty": 1
      }
    ]
  }
]
```

**現有地圖**（需建立）：
1. Warning Street - The Swamp of Despair II
2. Victoria Road - The Tree That Grew III
3. Orbis Tower - <4th Floor>

---

## 三、需要修改的檔案

### 1. mob-info.json 欄位轉換

**現有 chronostoryData 格式**：
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
    "magicDefense": 0
  },
  "chineseMobName": "嫩寶"
}
```

**需要的 data/ 格式**：
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
    "mag_def": 0
  },
  "chineseMobName": "嫩寶"
}
```

**欄位映射表**：
| chronostoryData | data/ | 說明 |
|-----------------|-------|------|
| `id` | `mob_id` | |
| `name` | `mob_name` | |
| `InGame` | `released` | true→1, false→0 |
| `maxHP` | `max_hp` | |
| `accuracy` | `acc` | |
| `evasion` | `avoid` | |
| `physicalDefense` | `phys_def` | |
| `magicDefense` | `mag_def` | |

**選項**：
- A. 修改 chronostoryData 的 mob-info.json 使用 snake_case
- B. 修改程式碼適應 camelCase（推薦）

---

### 2. gachapon/ 格式補充

**現有 chronostoryData 格式**：
```json
{
  "name": "Ellinia",
  "location": "Ellinia",
  "totalItems": 180,
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

**需要的 data/ 格式（enhanced）**：
```json
{
  "machineId": 1,
  "machineName": "Gachapon - Ellinia",
  "chineseMachineName": "艾麗妮雅轉蛋",
  "description": "...",
  "totalItems": 180,
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

**缺失資料**：
- `machineId` - 需手動分配
- `machineName`, `chineseMachineName` - 需補充
- `probability` - 星級評分
- `chineseName` - 中文名稱
- `equipment`, `statVariation` - 裝備詳情

**建議**：從 `items-organized/` 補充物品詳情。

---

## 四、程式碼修改

### 需要修改的檔案

| 檔案 | 修改內容 |
|------|---------|
| `src/hooks/useDataManagement.ts` | 改讀取路徑和欄位映射 |
| `src/lib/cache/items-cache.ts` | 改讀取路徑 |
| `src/lib/image-utils.ts` | 改 available-images.json 路徑 |
| `src/hooks/useLazyData.ts` | 改讀取路徑 |

### useDataManagement.ts 修改範例

```typescript
// 之前
import dropsEssentialData from '@/../data/drops-essential.json'
import mobInfoData from '@/../data/mob-info.json'

// 之後
import dropsEssentialData from '@/../chronostoryData/drops-essential.json'
import mobInfoData from '@/../chronostoryData/mob-info.json'

// mob-info 欄位映射（如果保留 camelCase）
const mobId = parseInt(info.mob.id, 10)  // 之前是 info.mob.mob_id
const level = info.mob.level
```

---

## 五、遷移步驟

### 階段 1：建立相容檔案

- [ ] 1.1 建立 `drops-essential.json`（從 drops-by-monster 合併）
- [ ] 1.2 建立 `item-attributes-essential.json`（從 items-organized 提取）
- [ ] 1.3 建立 `drops-100-percent.json`（商人資料）

### 階段 2：補充轉蛋機資料

- [ ] 2.1 補充 `gachapon/*.json` 的 machineId, machineName
- [ ] 2.2 補充物品的 chineseName（從 items-organized）
- [ ] 2.3 補充物品的 equipment, statVariation

### 階段 3：修改程式碼

- [ ] 3.1 修改 import 路徑
- [ ] 3.2 修改 mob-info 欄位映射
- [ ] 3.3 修改 item-attributes 欄位映射
- [ ] 3.4 測試所有功能

### 階段 4：移除 data/

- [ ] 4.1 確認所有功能正常
- [ ] 4.2 移除 `data/` 目錄
- [ ] 4.3 更新 .gitignore（如需要）

---

## 六、可直接刪除的 data/ 檔案

以下檔案在 chronostoryData 已有對應或不再需要：

| 檔案 | 原因 |
|------|------|
| `drops.json` | 由 drops-by-monster/ 取代 |
| `drops-detailed/` | 由 drops-by-monster/ 取代 |
| `drops-index.json` | 由 monster-index.json 取代 |
| `item-attributes.json` | 由 items-organized/ 取代 |
| `item-attributes-detailed/` | 由 items-organized/ 取代 |
| `item-ids.json` | 不需要 |
| `item-id-rules.json` | 不需要 |
| `maplestory-io-versions.json` | 參考用，不需要 |
| `monsters-animations-result.json` | 一次性結果 |
| `ludibrium-clocktower-monsters.json` | 特殊用途，不需要 |
| `map-translation-draft.json` | 草稿 |
| `README.md` | 更新或移除 |
| `images/` | 由 R2 CDN 取代 |

---

## 七、風險評估

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| 欄位映射錯誤 | 資料顯示錯誤 | 完整測試 |
| 缺失資料 | 功能缺失 | 建立前先確認所有使用點 |
| 效能下降 | 載入變慢 | 監控 bundle 大小 |

---

## 八、預估時程

| 階段 | 時間 |
|------|------|
| 階段 1：建立相容檔案 | 1-2 小時 |
| 階段 2：補充轉蛋機資料 | 2-3 小時 |
| 階段 3：修改程式碼 | 1-2 小時 |
| 階段 4：測試和移除 | 1 小時 |
| **總計** | **5-8 小時** |
