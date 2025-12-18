# 物品名稱不一致報告

**比對日期**: 2025-12-18
**比對範圍**: drops-by-item 中的所有物品 (1583 個)
**資料來源比對**:
- 本地: `chronostoryData/items-organized/{category}/{itemId}.json` → `description.name`
- API: `https://chronostory.onrender.com/api/item-info?itemId={itemId}` → `item_name`

---

## 發現的不一致項目 (共 5 個)

| Item ID | API 名稱 | 本地名稱 | 中文名稱 |
|---------|----------|----------|----------|
| 2040030 | Dark Scroll for Helmet for DEX 30% | Scroll for Helmet for DEX 30% | 頭盔敏捷詛咒卷軸30% |
| 2040340 | Scroll for Accessory for STR 10% | Scroll for Earring for HP 15% | 耳環生命卷軸15% |
| 2040932 | Dark Scroll for Shield for STR 30% | Scroll for Shield for STR 30% | 盾牌力量詛咒卷軸30% |
| 2044803 | Dark Scroll for Knuckler for ATT 70% | Scroll for Knuckler for Attack 70% | 指虎攻擊詛咒卷軸70% |
| 2044804 | Dark Scroll for Knuckler for ATT 30% | Scroll for Knuckler for Attack 30% | 指虎攻擊詛咒卷軸30% |

---

## 分析

### 類型 1: Dark Scroll vs Scroll (4 個)
這些物品在 API 中被標記為 "Dark Scroll"，但本地檔案中是 "Scroll"：
- **2040030**: 頭盔敏捷詛咒卷軸30%
- **2040932**: 盾牌力量詛咒卷軸30%
- **2044803**: 指虎攻擊詛咒卷軸70%
- **2044804**: 指虎攻擊詛咒卷軸30%

### 類型 2: 完全不同的物品 (1 個)
- **2040340**: API 顯示為 "Scroll for Accessory for STR 10%"，但本地是 "Scroll for Earring for HP 15%"
  - 中文名稱：耳環生命卷軸15%
  - 可能是 **ID 錯誤**，需要進一步調查

---

## 涉及的本地檔案

- `chronostoryData/items-organized/consumable/2040030.json`
- `chronostoryData/items-organized/consumable/2040340.json`
- `chronostoryData/items-organized/consumable/2040932.json`
- `chronostoryData/items-organized/consumable/2044803.json`
- `chronostoryData/items-organized/consumable/2044804.json`

---

## 建議處理方式

1. **Dark Scroll 問題**: 確認哪個來源是正確的（API 或本地），統一名稱
2. **2040340 ID 問題**: 需要調查 ID 是否對應錯誤的物品
