# 圖片使用說明

> 本專案使用 Cloudflare R2 CDN 儲存和提供圖片，不再使用 JSON 內嵌的 Base64 圖片。

---

## 架構概覽

```
用戶請求
    ↓
src/lib/image-utils.ts
    ↓
檢查 available-images.json（圖片是否存在）
    ↓
返回 R2 CDN URL
    ↓
Cloudflare R2 CDN
```

---

## CDN 配置

**環境變數**：
```bash
NEXT_PUBLIC_R2_PUBLIC_URL=https://cdn.chronostorysearch.com
```

**R2 Bucket 結構**：
```
r2:maplestory-images/
├── images/
│   ├── items/           # 物品圖片 (.png)
│   ├── monsters/        # 怪物圖片 (.png)
│   ├── monsters-gif/    # 怪物待機動畫 (.gif)
│   ├── monsters-die/    # 怪物死亡動畫 (.gif)
│   ├── monsters-hit/    # 怪物受擊動畫 (.gif)
│   └── scrolls/         # 卷軸成功率圖示 (.png)
```

---

## 圖片 URL 格式

### 物品圖片
```
https://cdn.chronostorysearch.com/images/items/{itemId}.png

範例：
https://cdn.chronostorysearch.com/images/items/1002005.png
```

### 怪物圖片
```
# 靜態圖片
https://cdn.chronostorysearch.com/images/monsters/{mobId}.png

# 待機動畫
https://cdn.chronostorysearch.com/images/monsters-gif/{mobId}.gif

# 死亡動畫
https://cdn.chronostorysearch.com/images/monsters-die/{mobId}.gif

# 受擊動畫
https://cdn.chronostorysearch.com/images/monsters-hit/{mobId}.gif

範例：
https://cdn.chronostorysearch.com/images/monsters/100100.png
https://cdn.chronostorysearch.com/images/monsters-gif/100100.gif
```

### 卷軸圖示
```
https://cdn.chronostorysearch.com/images/scrolls/{successRate}.png

支援的成功率：10, 15, 30, 60, 70, 100

範例：
https://cdn.chronostorysearch.com/images/scrolls/60.png
```

---

## available-images.json

**位置**：`data/available-images.json`

**用途**：記錄 R2 CDN 上可用的圖片 ID，避免請求不存在的圖片產生 404 錯誤。

**結構**：
```json
{
  "items": [1002005, 1002006, ...],           // 物品 ID 列表
  "monsters": [100100, 100101, ...],          // 怪物 ID 列表
  "monsters-gif": [100100, 100101, ...],      // 有待機動畫的怪物
  "monsters-die": [100100, 100101, ...],      // 有死亡動畫的怪物
  "monsters-hit": [100100, 100101, ...],      // 有受擊動畫的怪物
  "totalItems": 1234,
  "totalMonsters": 567,
  "generatedAt": "2024-01-01T00:00:00Z"
}
```

---

## 程式碼使用

**檔案**：`src/lib/image-utils.ts`

### 主要函數

```typescript
// 取得物品圖片 URL
getItemImageUrl(itemId: number, options?: { fallback?: string, itemName?: string }): string

// 取得怪物圖片 URL
getMonsterImageUrl(mobId: number, options?: { format?: ImageFormat, fallback?: string }): string

// 檢查圖片是否存在
hasItemImage(itemId: number): boolean
hasMonsterImage(mobId: number): boolean
hasMonsterGif(mobId: number): boolean
hasMonsterDie(mobId: number): boolean
hasMonsterHit(mobId: number): boolean
```

### 使用範例

```typescript
import { getItemImageUrl, getMonsterImageUrl } from '@/lib/image-utils'

// 物品圖片
const itemUrl = getItemImageUrl(1002005)
// → "https://cdn.chronostorysearch.com/images/items/1002005.png"

// 卷軸圖片（自動解析成功率）
const scrollUrl = getItemImageUrl(2040002, { itemName: "Scroll for Helmet 60%" })
// → "https://cdn.chronostorysearch.com/images/scrolls/60.png"

// 怪物靜態圖片
const monsterPng = getMonsterImageUrl(100100)
// → "https://cdn.chronostorysearch.com/images/monsters/100100.png"

// 怪物待機動畫
const monsterGif = getMonsterImageUrl(100100, { format: 'stand' })
// → "https://cdn.chronostorysearch.com/images/monsters-gif/100100.gif"
```

---

## 為什麼移除 iconRaw/icon 欄位

`items-organized/` 目錄的 JSON 檔案原本包含 Base64 編碼的圖片：

```json
{
  "metaInfo": {
    "iconRaw": "iVBORw0KGgoAAAAN...",  // 已移除
    "icon": "iVBORw0KGgoAAAAN..."       // 已移除
  }
}
```

**移除原因**：

| 理由 | 說明 |
|------|------|
| 檔案大小 | Base64 圖片佔 JSON 檔案 74% 大小 |
| 重複儲存 | 圖片已存在於 R2 CDN |
| 載入效能 | CDN 有快取，比 JSON 內嵌更快 |
| 維護成本 | 更新圖片只需上傳 R2，無需修改 JSON |

**移除效果**：

- 修改前：4.87 MB（1,890 檔案）
- 修改後：1.27 MB
- **節省：3.61 MB (74%)**

---

## 上傳新圖片到 R2

```bash
# 使用 rclone 上傳
~/rclone copy /path/to/image.png r2:maplestory-images/images/items/ --progress

# 更新 available-images.json（需手動或腳本）
```
