# Hidden Street vs 本地 JSON 題庫比對報告

**比對來源**:
- 本地 JSON: `chronostoryData/csv-data/3rd/chronostory-quiz.json` (38 題)
- Hidden Street: [3rd Job Questions](https://bc.hidden-street.net/3rd-job-questions) (40 題)

**比對日期**: 2025-12-19

---

## 總結

| 類型 | 數量 |
|------|------|
| 匹配成功 | ~28 題 |
| 答案差異 | 5 題 |
| Hidden Street 獨有 | 10 題 |
| 本地獨有 (ChronoStory 特有) | 8 題 |

---

## 一、重要答案差異

以下題目在兩個來源中答案不同，需要根據實際遊戲版本確認：

| # | 題目 | 本地答案 | Hidden Street 答案 |
|---|------|---------|-------------------|
| 1 | Which of these monsters will you NOT be facing in Ossyria? | **Clang** | **Croco** |
| 2 | Which monster cannot be found in El Nath? | **Cold Eye** | **Dark Ligator** |
| 3 | Which monster does not appear in Maple Island? | **King Slime** | **Evil Eye** |
| 4 | Maple Island doesn't have which monsters? | **Blue Mushroom** | **Pig** |
| 5 | Which town is not at Victoria Island? | **Southperry** | **Amherst or Southperry** |

### 分析:
- **Ossyria 怪物**: ChronoStory 使用 Clang，Hidden Street 使用 Croco（可能是不同版本的選項）
- **El Nath 怪物**: 本地答案 Cold Eye，HS 答案 Dark Ligator（不同選項題）
- **Maple Island 怪物**: 這是兩個不同的題目，選項組合不同
- **Victoria Island 城鎮**: Hidden Street 允許 Amherst 或 Southperry，本地只有 Southperry

---

## 二、Hidden Street 獨有題目（本地缺少）

以下題目在 Hidden Street 有但本地 JSON 沒有，**可考慮補充**：

| # | 題目 | 答案 | 分類 |
|---|------|------|------|
| 1 | In GM Event, how many FRUIT CAKE you can get as reward? | 5 | Items |
| 2 | Which material doesn't need for awaken Hero's Gladius? | Fairy Wing | Quests |
| 3 | Which of following quests can be repeated? | Arwen and the Glass Shoe | Quests |
| 4 | Which of following highest level quest? | Alcaster and the Dark Crystal | Quests |
| 5 | Which NPC cannot be seen in El Nath snowfield? | Elma the Housekeeper | NPC |
| 6 | Which NPC is not related to pets? | Vicious | NPC |
| 7 | In Kerning City, who is the father of Alex, the run way kid? | Chief Stan | NPC |
| 8 | Which NPC is not belong to Alpha Platoon's Network of Communication? | Peter | NPC |
| 9 | Which of following NPC is not related to item synthesis/refine? | Shane | NPC |
| 10 | Which monster has not appeared in Maple Island? (answer: Evil Eye) | Evil Eye | Monsters |

---

## 三、本地獨有題目（ChronoStory 特有）

以下題目是 **ChronoStory 專屬**，Hidden Street 沒有（這些是正確的，不需要刪除）：

| # | 題目 | 答案 |
|---|------|------|
| 1 | **Who is the founder of ChronoStory?** | Boutei |
| 2 | **What is not a monster found in ChronoStory?** | Red Stirge |
| 3 | Which of the following monsters is not involved in a Wanted Quest? | Wild Boar |
| 4 | Which NPC is not involved in Mr.Wetbottom's Secret Book? | Ria |
| 5 | Which NPC is not involved in The Chaos Behind Alfonse Green and the Nependeath Juice? | Lisa |
| 6 | Which NPC cannot be seen in Sleepywood? | Lakelis |
| 7 | Which NPC cannot be seen in Orbis? | Jeff |

> 注意：題目 1 和 2 是 ChronoStory 專屬題目，不會在原版 MapleStory 題庫中出現。

---

## 四、建議行動

### 優先級高（答案確認）:
- [ ] 確認 "Ossyria monsters" 題目的正確答案 (Clang vs Croco)
- [ ] 確認 "Victoria Island town" 題目是否需要包含 Amherst

### 優先級中（補充題目）:
- [ ] 考慮新增 GM Event FRUIT CAKE 題目
- [ ] 考慮新增 Quest 相關題目（Hero's Gladius、Arwen、Alcaster）
- [ ] 考慮新增 NPC 相關題目（El Nath snowfield、pets、Alex's father）

### 無需行動:
- ChronoStory 專屬題目（founder、not found in ChronoStory）保持現狀

---

## 附錄：完整匹配清單

<details>
<summary>點擊展開已匹配的題目</summary>

已成功匹配並答案一致的題目：
- In MapleStory, what is the EXP needed to level up from Lv1 to Lv2? → 15
- For the 1st job advancement, which of the following is the WRONG requirement? → Thief - 20 LUK or more
- Which of the following debuffs is incorrect? → Weaken - slow down moving speed
- Which of following monsters's item CORRECTLY corresponds to the monster? → Stirge - Stirge's Wing
- Which of following monsters's item INCORRECTLY corresponds to the monster? → Nependeath - Nependeath's Nut
- Which of following potions has CORRECT info.? → Pizza - Recover 400 HP
- Which of following potions has WRONG info.? → Sunrise Dew - Recover 3000 MP
- Green Mushroom, Tree Stump, Bubbling, Axe Stump, Octopus, which is the highest level? → Axe Stump
- Which monster will be seen during the ride to Orbis/Ellinia? → Crimson Balrog
- Which of the following monsters can fly? → Malady
- Which NPC cannot be seen in El Nath? → Sophia
- Which NPC cannot be seen in Perion? → Francois
- Which NPC cannot be seen in Henesys? → Teo
- Which NPC cannot be seen in Ellinia? → Roel
- Which NPC cannot be seen in Kerning City? → Luke
- Which NPC cannot be seen in Maple Island? → Teo
- Which is the first NPC you meet in Maple Island? → Heena
- What do you receive in return for giving 30 Dark Marbles to the 2nd job advancement NPC? → Proof of Hero
- What item do you give Maya at Henesys in order to cure her sickness? → Weird Medicine
- Who do you see in the monitor in the navigation room with Kyrin? → Dr. Kim
- What color are Athena Pierce's eyes? → Green
- How many feathers are there on Dances with Barlog's Hat? → 13
- What is the color of the orb that Grendel the Really Old is holding in Ellinia? → Blue
- Which of the following is not a 2nd job class? → Mage
- For the 1st job advancement, which job correctly states the job advancement requirement? → Bowman - 25 DEX

</details>
