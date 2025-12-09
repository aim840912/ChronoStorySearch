# Gachapon Items vs Items-Organized 缺失 ID 分析報告

**分析日期**: 2025-12-09

---

## 摘要

| 項目 | 數量 |
|------|------|
| Gachapon CSV 唯一物品 ID | 1,307 |
| Items-Organized 總 ID 數 | 1,888 |
| **缺失的 ID 數** | **1** |

---

## 缺失物品詳情

| ItemID | 物品名稱 | 來源 Gachapon | 機率 |
|--------|----------|---------------|------|
| 1003840 | Shadow Knight Hat | HenesysGachapon | 0.15% |

### 物品分析

- **ID 前綴**: `1003xxx` = 帽子類裝備 (Hat)
- **物品類型**: Shadow Knight Hat (影子騎士帽)
- **所屬扭蛋機**: Henesys Gachapon

---

## 建議行動

### 方案 A: 補充缺失物品
從 maplestory.io API 獲取物品資料並新增至 `items-organized/equipment/`：

```bash
# 獲取物品資料
curl -sL "https://maplestory.io/api/gms/83/item/1003840" -o 1003840.json
```

### 方案 B: 確認物品是否真實存在
在 MapleStory v83 版本中確認 Shadow Knight Hat 是否為有效物品。

---

## 資料來源

### Gachapon CSV 檔案 (已下載)

| 檔案名稱 | GID | 物品數量 |
|----------|-----|----------|
| ScrollGachapon.csv | 753735062 | 248 |
| LithHarborGachapon.csv | 1131782307 | 73 |
| HenesysGachapon.csv | 1341584885 | 170 |
| ElliniaGachapon.csv | 1155991176 | 117 |
| PerionGachapon.csv | 1497972303 | 124 |
| KerningCityGachapon.csv | 1450283032 | 160 |
| NautilusGachapon.csv | 1720390663 | 29 |

### Items-Organized 資料夾結構

```
chronostoryData/items-organized/
├── equipment/  (1,400 files)
├── consumable/ (309 files)
└── etc/        (179 files)
```

---

## 附錄: GID 對照表

| Gachapon 名稱 | GID |
|---------------|-----|
| ScrollGachapon | 753735062 |
| LithHarborGachapon | 1131782307 |
| HenesysGachapon | 1341584885 |
| ElliniaGachapon | 1155991176 |
| PerionGachapon | 1497972303 |
| KerningCityGachapon | 1450283032 |
| NautilusGachapon | 1720390663 |

---

*報告由 Claude Code 自動產生*
