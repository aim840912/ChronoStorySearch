# Consumable 資料一致性問題報告

**檢查日期**: 2025-12-18
**檢查範圍**: `chronostoryData/items-organized/consumable/` (309 個檔案)
**檢查項目**: name、chineseItemName、description 之間的一致性

---

## 發現的問題項目 (共 13 個)

### 1. 2040313 - 耳環防禦卷軸15%

| 欄位 | 值 |
|------|-----|
| name | Scroll for Earring for Defense 15% |
| chineseItemName | 耳環防禦卷軸15% |
| description | Improves INT on Earrings. Success rate: 65%, Magic Attack +2, INT+1 |
| **問題** | 百分比不一致: name=15% vs desc=65% |

---

### 2. 2040328 - 耳環力量卷軸100%

| 欄位 | 值 |
|------|-----|
| name | Scroll for Earring for STR 100% |
| chineseItemName | 耳環力量卷軸100% |
| description | Improves HP on earrings. Success rate:10%, MaxHP+30... |
| **問題** | 百分比不一致: name=100% vs desc=10% |

---

### 3. 2040330 - 耳環力量卷軸60%

| 欄位 | 值 |
|------|-----|
| name | Scroll for Earring for STR 60% |
| chineseItemName | 耳環力量卷軸60% |
| description | Improves INT on earrings. Success rate: 10%, Magic ATT +5, INT +3... |
| **問題** | 百分比不一致: name=60% vs desc=10% |

---

### 4. 2040340 - 耳環生命卷軸15% (嚴重)

| 欄位 | 值 |
|------|-----|
| name | Scroll for Accessory for STR 10% |
| chineseItemName | 耳環生命卷軸15% |
| description | Improves HP on Earrings. Success Rate: 15%, MaxHP+30 |
| metaInfo | incMHP: 30 (HP 屬性) |
| **問題** | ⚠️ 多重問題: 百分比不一致 (10% vs 15%)、屬性衝突 (name說STR但實際是HP)、裝備類型衝突 (name說Accessory但實際是Earring) |

---

### 5. 2040615 - 褲裙敏捷卷軸15%

| 欄位 | 值 |
|------|-----|
| name | Scroll for Bottomwear for DEX 15% |
| chineseItemName | 褲裙敏捷卷軸15% |
| description | Improves weapon def. on bottomwear. Success rate:65%... |
| **問題** | 百分比不一致: name=15% vs desc=65% |

---

### 6. 2040620 - 褲裙移動卷軸15%

| 欄位 | 值 |
|------|-----|
| name | Scroll for Bottomwear for Mobility 15% |
| chineseItemName | 褲裙移動卷軸15% |
| description | Improves HP on bottomwears. Success rate:100%, MaxHP+5 |
| **問題** | 百分比不一致: name=15% vs desc=100% |

---

### 7. 2040826 - 手套防禦卷軸15%

| 欄位 | 值 |
|------|-----|
| name | Scroll for Gloves for Defense 15% |
| chineseItemName | 手套防禦卷軸15% |
| description | Improves ATT on Gloves. Success rate: 60%, Weapons ATT +2... |
| **問題** | 百分比不一致: name=15% vs desc=60% |

---

### 8. 2040829 - 手套命中卷軸15%

| 欄位 | 值 |
|------|-----|
| name | Scroll for Gloves for Accuracy 15% |
| chineseItemName | 手套命中卷軸15% |
| description | Improves dexterity on gloves. Success rate: 100%, accuracy+2, DEX+2 |
| **問題** | 百分比不一致: name=15% vs desc=100% |

---

### 9. 2040926 - 盾牌魔力卷軸15%

| 欄位 | 值 |
|------|-----|
| name | Scroll for Shield for Magic ATT 15% |
| chineseItemName | 盾牌魔力卷軸15% |
| description | Improves HP on shields. Success rate:100%, MaxHP+5 |
| **問題** | 百分比不一致: name=15% vs desc=100% |

---

### 10. 2040928 - 盾牌攻擊卷軸100%

| 欄位 | 值 |
|------|-----|
| name | Scroll for Shield for ATT 100% |
| chineseItemName | 盾牌攻擊卷軸100% |
| description | Improves HP on shields. Success rate:10%, MaxHP+30... |
| **問題** | 百分比不一致: name=100% vs desc=10% |

---

### 11. 2044015 - 雙手劍命中卷軸15%

| 欄位 | 值 |
|------|-----|
| name | Scroll for Two-Handed Sword for Accuracy 15% |
| chineseItemName | 雙手劍命中卷軸15% |
| description | Improves ATT on Two-Handed Swords. Success rate: 10%... |
| **問題** | 百分比不一致: name=15% vs desc=10% |

---

### 12. 2044810 - 指虎命中卷軸15%

| 欄位 | 值 |
|------|-----|
| name | Scroll for Knuckler for Accuracy 15% |
| chineseItemName | 指虎命中卷軸15% |
| description | Improves the attack on Maple Golden Claw. Success rate:40%... |
| **問題** | 百分比不一致: name=15% vs desc=40% |

---

### 13. 2044905 - 火槍攻擊卷軸15%

| 欄位 | 值 |
|------|-----|
| name | Scroll for Gun for ATT 15% |
| chineseItemName | 火槍攻擊卷軸15% |
| description | Improves the attact on Maple Canon Shooter. Success rate:40%... |
| **問題** | 百分比不一致: name=15% vs desc=40% |

---

## 問題分類統計

| 問題類型 | 數量 |
|----------|------|
| 百分比不一致 | 13 |
| 屬性衝突 | 1 |
| 裝備類型衝突 | 1 |

## 嚴重程度

- 🔴 **嚴重** (1個): 2040340 - 多重問題
- 🟡 **中等** (12個): 其他百分比不一致項目

## 涉及的檔案

```
chronostoryData/items-organized/consumable/2040313.json
chronostoryData/items-organized/consumable/2040328.json
chronostoryData/items-organized/consumable/2040330.json
chronostoryData/items-organized/consumable/2040340.json
chronostoryData/items-organized/consumable/2040615.json
chronostoryData/items-organized/consumable/2040620.json
chronostoryData/items-organized/consumable/2040826.json
chronostoryData/items-organized/consumable/2040829.json
chronostoryData/items-organized/consumable/2040926.json
chronostoryData/items-organized/consumable/2040928.json
chronostoryData/items-organized/consumable/2044015.json
chronostoryData/items-organized/consumable/2044810.json
chronostoryData/items-organized/consumable/2044905.json
```
