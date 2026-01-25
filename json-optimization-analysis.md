# JSON 優化分析報告

> 分析日期：2026-01-25
> 專案：ChronoStory Search

---

## 一、檔案大小總覽

### 總體統計

| 目錄 | 總大小 | 檔案數量 |
|------|--------|----------|
| `chronostoryData/` | **16 MB** | 4,033 |
| `data/` | 277 KB | 4 |
| **合計** | **~16.3 MB** | 4,037 |

### 主要 JSON 檔案（前 10 大）

| 檔案 | 大小 | 用途 |
|------|------|------|
| `item-attributes-essential.json` | **1.4 MB** | 所有物品屬性（裝備需求、數值等） |
| `item-index.json` | 293 KB | 物品索引（2,054 項） |
| `drop-relations.json` | 205 KB | 怪物→物品掉落對照表 |
| `mob-info.json` | 124 KB | 怪物詳細資訊（228 隻） |
| `monster-index.json` | 39 KB | 怪物索引 |
| `r2-versions.json` | 217 KB | R2 CDN 版本控制 |
| `available-images.json` | 35 KB | 可用圖片清單 |

### 分類資料夾統計

| 資料夾 | 檔案數量 | 總大小 | 用途 |
|--------|----------|--------|------|
| `items-organized/equipment/` | 1,519 | 4.9 MB | 個別裝備資料 |
| `drops-by-item/` | 1,745 | 4.4 MB | 物品→掉落來源對照 |
| `drops-by-monster/` | 216 | 1.8 MB | 怪物掉落清單 |
| `items-organized/consumable/` | 310 | 402 KB | 消耗品資料 |
| `gacha/` | 7 | 304 KB | 扭蛋機獎品池 |
| `gachapon/` | 7 | 176 KB | 轉蛋機獎品池 |

---

## 二、各檔案詳細結構分析

### 2.1 `item-attributes-essential.json`（1.4 MB）

**結構**：Array，每個物品約 500-700 bytes

```json
{
  "item_id": "1002004",
  "item_name": "Great Brown Helmet",
  "type": "Eqp",
  "sub_type": "Hat",
  "req_level": 35,
  "req_str": 90,
  "req_dex": 0,
  "req_int": 0,
  "req_luk": 0,
  "equipment_category": "Hat",
  "equipment_classes": {
    "beginner": null,
    "warrior": true,
    "magician": null,
    "bowman": null,
    "thief": null,
    "pirate": null
  },
  "scroll_category": null,
  "attack_speed": null,
  "inc_str": 1,
  "inc_dex": 0,
  "inc_int": 0,
  "inc_luk": 0,
  "inc_pad": 0,
  "inc_mad": 0,
  "inc_pdd": 35,
  "inc_mdd": 0,
  "inc_mhp": 0,
  "inc_mmp": 0,
  "inc_acc": 0,
  "inc_eva": 0,
  "inc_speed": 0,
  "inc_jump": 0,
  "tuc": 7
}
```

**問題識別**：
- ❌ 大量 `0` 和 `null` 值佔用空間
- ❌ `equipment_classes` 冗餘（6 個欄位，大多為 null）
- ❌ 所有 `inc_*` 欄位即使為 0 也存在

### 2.2 `drop-relations.json`（205 KB）

**結構**：Object，mobToItems 對照表

```json
{
  "lastUpdated": "2026-01-22",
  "mobToItems": {
    "2000": [0, 2010000, 2010009, 4031161, 4031162],
    "100100": [0, 1002067, 1040002, 1052095, ...]
  }
}
```

**優點**：結構已經相當精簡（僅存 itemId 陣列）

### 2.3 `mob-info.json`（124 KB）

**結構**：Array，每隻怪物約 550 bytes

```json
{
  "mob": {
    "InGame": true,
    "id": "100100",
    "name": "Snail",
    "maxHP": 8,
    "accuracy": 20,
    "evasion": 0,
    "level": 1,
    "exp": 3,
    "physicalDefense": 0,
    "magicDefense": 0,
    "fire_weakness": null,
    "ice_weakness": null,
    "lightning_weakness": null,
    "holy_weakness": null,
    "poison_weakness": null,
    "minimumPushDamage": 1,
    "dark_weakness": null,
    "isUndead": false,
    "isBoss": false
  },
  "chineseMobName": "嫩寶"
}
```

**問題識別**：
- ❌ 大量 `null` 屬性弱點欄位
- ❌ `id` 為字串而非數字
- ❌ 外層 `mob` 包裹可能冗餘

### 2.4 個別物品檔案（`items-organized/`）

**Equipment 範例**（約 600-1,000 bytes）：

```json
{
  "id": 1002004,
  "description": {
    "id": 1002004,      // ❌ 與外層 id 重複
    "name": "Great Brown Helmet",
    "description": "",
    "chineseItemName": "褐色戰鬥頭盔"
  },
  "metaInfo": {
    "only": false,
    "cash": false,
    "reqLevel": 35,
    "price": 40000,
    "reqSTR": 90,
    "reqDEX": 0,        // ❌ 0 值可省略
    "reqINT": 0,
    "reqLUK": 0,
    "reqJob": 1,
    "reqLevelEquip": 35,
    "tuc": 7,
    "incSTR": 1,
    "incPDD": 35
  },
  "typeInfo": {
    "overallCategory": "Equip",
    "category": "Armor",
    "subCategory": "Hat"
  },
  "randomStats": {
    "incSTR": { "base": 1, "min": 0, "max": 5 },
    "incPDD": { "base": 35, "min": 18, "max": 53 }
  },
  "isGachapon": true
}
```

**問題識別**：
- ❌ `description.id` 與外層 `id` 重複
- ❌ 0 值欄位可省略（約 4-6 個）
- ❌ `reqLevelEquip` 與 `reqLevel` 可能重複

### 2.5 掉落檔案（`drops-by-monster/`）

**範例**（約 500-15,000 bytes，視掉落數量而定）：

```json
{
  "mobId": 100100,
  "mobName": "Snail",
  "chineseMobName": "嫩寶",
  "isBoss": false,
  "inGame": true,
  "drops": [
    {
      "itemId": 4000019,
      "itemName": "Snail Shell",
      "chineseItemName": "嫩寶殼",
      "chance": 60,
      "displayChance": "60.0%",    // ❌ 可由 chance 計算
      "minQty": 1,
      "maxQty": 1,
      "questId": 0,
      "enabled": true
    }
  ]
}
```

**問題識別**：
- ❌ `displayChance` 是冗餘欄位（前端可計算）
- ❌ `minQty`/`maxQty` 常為 1，可用預設值
- ❌ `questId: 0` 和 `enabled: true` 可省略（使用預設值）

---

## 三、優化建議與預估節省

### 方案 A：移除冗餘欄位（低風險）

| 優化項目 | 預估節省 |
|----------|----------|
| 移除 0 值屬性欄位 | ~200 KB |
| 移除 `displayChance` | ~100 KB |
| 移除重複 `id` 欄位 | ~50 KB |
| 使用預設值策略 | ~150 KB |
| **預估總節省** | **~500 KB (約 3%)** |

### 方案 B：結構重組（中風險）

| 優化項目 | 預估節省 |
|----------|----------|
| `equipment_classes` 改為陣列 | ~100 KB |
| 弱點屬性合併為單一物件 | ~50 KB |
| 移除不必要的巢狀結構 | ~100 KB |
| **預估總節省** | **~250 KB (約 1.5%)** |

### 方案 C：檔案合併策略（高效益但需重構）

| 優化項目 | 預估節省 | 備註 |
|----------|----------|------|
| 合併小型個別檔案 | ~3-4 MB | 減少 HTTP 請求開銷 |
| 使用分頁載入 | - | 減少初始載入量 |

### 總結預估

| 方案 | 風險等級 | 預估節省 | 實施難度 |
|------|----------|----------|----------|
| A | 低 | ~500 KB (3%) | 簡單 |
| B | 中 | +250 KB (1.5%) | 中等 |
| C | 高 | +3-4 MB (25%) | 複雜 |

---

## 四、執行方案建議

### 第一階段：快速勝利（方案 A）

**優先順序**：

1. **移除 `displayChance` 欄位**
   - 影響範圍：`drops-by-monster/`、`drops-by-item/`
   - 風險：低（前端已有計算邏輯）
   - 預估節省：~100 KB

2. **移除 0 值屬性欄位**
   - 影響範圍：`item-attributes-essential.json`、個別物品檔案
   - 風險：中（需確認前端有預設值處理）
   - 預估節省：~200 KB

3. **移除重複 `id` 欄位**
   - 影響範圍：`items-organized/` 所有檔案
   - 風險：低
   - 預估節省：~50 KB

### 第二階段：結構優化（方案 B）

需要更詳細的前端程式碼分析，確認這些結構變更不會造成 breaking changes。

### 第三階段：架構重構（方案 C）

考慮：
- 將 `items-organized/` 合併為數個較大的分類檔案
- 實施 lazy loading 策略
- 考慮使用 gzip 壓縮傳輸

---

## 五、注意事項

### 向後相容性

- 任何結構變更都需要同步更新前端程式碼
- 建議先在 staging 環境測試
- 使用版本號控制 JSON schema 變更

### 快取考量

- 修改後需更新 `r2-versions.json` 版本號
- CDN 快取可能需要手動清除

### 監控建議

- 追蹤 JSON 載入時間變化
- 監控 bundle size 變化
- 設定效能基準線

---

## 六、附錄

### 檔案大小排名（完整）

```
1.4 MB  item-attributes-essential.json
293 KB  item-index.json
217 KB  r2-versions.json (data/)
205 KB  drop-relations.json
124 KB  mob-info.json
 61 KB  gacha/machine-7-enhanced.json
 57 KB  gacha/machine-3-enhanced.json
 51 KB  gacha/machine-4-enhanced.json
 46 KB  drops-by-item/0.json (Meso)
 42 KB  gacha/machine-2-enhanced.json
 39 KB  monster-index.json
 38 KB  gacha/machine-5-enhanced.json
 35 KB  available-images.json
 34 KB  gachapon/scroll.json
 32 KB  gachapon/henesys.json
```

### 資料夾結構

```
chronostoryData/
├── item-attributes-essential.json  (1.4 MB)
├── item-index.json                 (293 KB)
├── drop-relations.json             (205 KB)
├── mob-info.json                   (124 KB)
├── monster-index.json              (39 KB)
├── available-images.json           (32 KB)
├── gachapon-item-ids.json          (20 KB)
├── items-organized/
│   ├── consumable/                 (310 files, 402 KB)
│   └── equipment/                  (1,519 files, 4.9 MB)
├── drops-by-monster/               (216 files, 1.8 MB)
├── drops-by-item/                  (1,745 files, 4.4 MB)
├── gacha/                          (7 files, 304 KB)
└── gachapon/                       (7 files, 176 KB)
```
