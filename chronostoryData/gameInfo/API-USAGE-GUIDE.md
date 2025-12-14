# MapleStory.io API 使用指南

本文件說明如何請求 Claude 使用專案內建的 MapleStory.io API 測試 modal 獲取物品資料。

---

## 請求格式

### 簡潔版

```
用 API 測試 modal 獲取 [物品ID] 的資料並更新 JSON
```

**範例：**
```
用 API 測試 modal 獲取 1003840 的資料並更新 JSON
```

### 完整版

```
請使用專案的 MapleStory.io API 測試 modal 獲取物品 [ID] 的資料，
區域：[TWMS/GMS]，版本：[版本號]
然後更新 items-organized 的 JSON 檔案
```

**範例：**
```
請使用專案的 MapleStory.io API 測試 modal 獲取物品 1003840 的資料，
區域：TWMS，版本：217
然後更新 items-organized 的 JSON 檔案
```

### 批量處理

```
用 API 測試 modal 獲取以下物品資料並更新 JSON：
- 1003840
- 1002150
- 2000000
```

---

## 支援的區域與版本

| 區域 | 說明 | 常用版本 |
|------|------|----------|
| **GMS** | Global MapleStory | 83 (經典版) |
| **TWMS** | Taiwan MapleStory | 217 |
| **KMS** | Korea MapleStory | - |
| **JMS** | Japan MapleStory | - |
| **CMS** | China MapleStory | - |

---

## 關鍵字速查

| 關鍵字 | 說明 |
|--------|------|
| `API 測試 modal` | 使用專案內建的測試工具（非外部 Swagger UI） |
| `items-organized` | 目標是更新 `chronostoryData/items-organized/` 的 JSON |
| `TWMS` / `GMS` | 指定遊戲區域 |
| `v217` / `v83` | 指定版本號 |

---

## JSON 更新流程

Claude 執行的步驟：

1. **開啟 localhost:3000** - 確保開發伺服器運行中
2. **點擊「API 測試工具」按鈕** - 開啟 MapleStory.io API 測試 modal
3. **設定參數** - 選擇區域、版本，輸入物品 ID
4. **點擊「測試」按鈕** - 獲取 API 回傳資料
5. **擷取圖片 base64** - 從回傳的 iconRaw 和 icon 欄位
6. **更新 JSON 檔案** - 寫入 `items-organized/[category]/[id].json`

---

## randomStats 計算

裝備 JSON 需要包含 `randomStats` 欄位，用於顯示屬性浮動範圍。

### 請求格式

```
根據 stats calcu.md 計算 [物品ID] 的 randomStats
```

**範例：**
```
根據 stats calcu.md 計算 1003840 的 randomStats 並更新 JSON
```

### 計算公式（參考 `gameInfo/stats calcu.md`）

**基礎浮動範圍：**
```
O = 裝備等級 / 10（套服要 ×2）
```

**各屬性的 A 值：**

| 屬性類型 | A 值計算 |
|----------|----------|
| 主屬（STR/DEX/INT/LUK） | `O / 主屬數量` |
| 雙防（PDD/MDD） | `O × 5` |
| 命中/迴避 | `O` |
| 雙攻/速度 | `O / 2` |
| 跳躍 | `O / 4` |
| HP/MP | `O × 5` |

**min/max 計算：**
```
min = max(0, base - A)
max = base + A
```

### 計算範例

**物品：暗影騎士帽（1003840）- reqLevel: 100**

| 屬性 | base | O | A | min | max |
|------|------|---|---|-----|-----|
| incSTR | 3 | 10 | 10（單主屬） | 0 | 13 |
| incPDD | 100 | 10 | 50（防禦×5） | 50 | 150 |

---

## 應移除的欄位

API 回傳的資料包含一些專案不需要的欄位，需根據物品類型移除。

### 請求格式

```
移除 [目錄] 的 [欄位名稱]
```

**範例：**
```
移除 consumable 目錄的 iconOrigin, iconRawOrigin, islots, vslots
移除 etc 目錄的 islots
```

### 各類型應移除的欄位

| 物品類型 | 目錄 | 應移除欄位 |
|----------|------|------------|
| **裝備** | `equipment/` | `lowItemId`, `highItemId` |
| **消耗品** | `consumable/` | `iconOrigin`, `iconRawOrigin`, `islots`, `vslots` |
| **其他** | `etc/` | `islots` |

### 欄位說明

| 欄位 | 說明 | 適用類型 |
|------|------|----------|
| `vslots` | 視覺層佔用（角色外觀覆蓋部位） | 僅裝備類 |
| `islots` | 道具欄位類型 | 僅裝備類 |
| `iconOrigin` | 圖示原點座標 | 不需要 |
| `iconRawOrigin` | 原始圖示原點座標 | 不需要 |
| `lowItemId` / `highItemId` | MapleStory.io 分類用 | 不需要 |

---

## 注意事項

- **圖片格式**：API 回傳的 base64 可能包含附加 metadata，Claude 會自動清理
- **欄位選擇**：`lowItemId`/`highItemId` 是 MapleStory.io 的分類欄位，專案不需要儲存
- **中英文名稱**：API 回傳的中文名放入 `chineseName`，英文名放入 `name`
- **參考格式**：可指定現有 JSON 作為格式參考（如 `參考 1002150.json 的格式`）
- **randomStats**：裝備類物品必須計算 randomStats，參考 `gameInfo/stats calcu.md`
- **批量清理**：可使用 Node.js 腳本批量移除欄位（系統無 jq）
