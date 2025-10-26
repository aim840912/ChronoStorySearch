# Claude Code 工作流程指南

本指南幫助您最大化 Claude Code 的開發效率，涵蓋魔法關鍵字、自訂指令和最佳實踐。

## 📚 文檔目錄

- **[魔法關鍵字參考](./magic-keywords-reference.md)** - 完整的魔法關鍵字清單和使用範例
- **[自訂指令指南](./custom-commands-guide.md)** - 如何使用和擴展專案的自訂 slash 指令

## 🚀 快速開始

### 基本工作流程

```bash
# 1. 啟動 Claude Code
claude

# 2. 使用快捷鍵
Shift+Tab      # 切換到 Plan Mode（唯讀規劃模式）
Tab            # 開啟/關閉 Extended Thinking

# 3. 使用魔法關鍵字
> ultrathink 設計這個交易系統的架構

# 4. 使用自訂指令
> /ultraplan 實作即時聊天功能
```

## 🎯 常用工作流程

### 1. 探索 → 規劃 → 實作 → 提交

適用於：新功能開發、大型重構

```bash
# 階段 1: 探索現有程式碼
> /deepdive 尋找現有的認證實作模式

# 階段 2: 規劃（Plan Mode）
Shift+Tab  # 進入 Plan Mode
> /ultraplan 重新設計認證系統以支援多租戶

# 階段 3: 實作
Shift+Tab  # 退出 Plan Mode
> 實作剛才規劃的認證系統

# 階段 4: 審查
Shift+Tab  # 進入 Plan Mode
> /safereview 審查新的認證系統程式碼

# 階段 5: 提交
> 提交變更，commit message 應該說明為什麼做這個改動
```

### 2. 快速 Bug 修復

適用於：緊急修復、小型問題

```bash
# 直接描述問題（不需要魔法關鍵字）
> 修正登入頁面的表單驗證錯誤

# 如果問題複雜，使用 think
> think 為什麼使用者登出後 session 沒有正確清除
```

### 3. 架構設計

適用於：系統設計、技術選型

```bash
# 使用 archdesign 指令
Shift+Tab  # Plan Mode
> /archdesign 設計一個可擴展的通知系統，支援 email、推播和站內訊息

# 或直接使用 ultrathink
> ultrathink 評估使用 WebSocket vs Server-Sent Events 實作即時更新
```

### 4. 程式碼審查

適用於：PR 審查、程式碼品質檢查

```bash
# 安全審查（不會修改任何檔案）
Shift+Tab  # Plan Mode
> /safereview src/app/api/trade/**/*.ts

# 或指定特定檔案
> /safereview src/app/api/trade/route.ts
```

### 5. 效能優化

適用於：效能問題排查、優化

```bash
# 深度分析
> /deepdive 分析交易系統的效能瓶頸

# 使用 think hard 評估優化方案
> think hard 比較不同的快取策略對交易查詢效能的影響
```

## 📊 決策樹：何時使用哪個關鍵字/指令？

```
問題複雜度？
│
├─ 簡單（< 5 分鐘）
│  └─ 直接描述需求，不需要魔法關鍵字
│
├─ 中等（5-30 分鐘）
│  ├─ 需要規劃？→ think + Plan Mode
│  ├─ 需要探索？→ /deepdive
│  └─ 需要審查？→ /safereview
│
└─ 複雜（> 30 分鐘）
   ├─ 架構設計？→ /archdesign 或 /ultraplan
   ├─ 技術選型？→ ultrathink + Plan Mode
   ├─ 大型重構？→ /deepdive + /ultraplan
   └─ 效能優化？→ think hard + /deepdive
```

## 🎨 模式切換策略

### Plan Mode（Shift+Tab）

**何時使用**：
- ✅ 架構設計和規劃
- ✅ 程式碼審查
- ✅ 風險評估
- ✅ 探索陌生程式碼
- ✅ 評估多種方案

**優點**：
- 安全：不會意外修改檔案
- 節省成本：避免昂貴的執行階段
- 清晰：獲得結構化的分析結果

**使用技巧**：
```bash
# 進入 Plan Mode
Shift+Tab

# 進行規劃
> /ultraplan 實作即時聊天功能

# 審查計劃
[Claude 提供詳細計劃]

# 滿意後退出 Plan Mode 開始實作
Shift+Tab
> 開始實作剛才的計劃
```

### Extended Thinking（Tab 或魔法關鍵字）

**何時使用**：
- ✅ 複雜的邏輯推理
- ✅ 需要評估多種方案
- ✅ 架構設計決策
- ✅ 棘手的 bug 排查

**Token 預算選擇**：
| 關鍵字 | Token | 使用時機 |
|--------|-------|---------|
| `think` | 4,000 | 常規問題、需要基本推理 |
| `think hard` | 10,000 | 複雜邏輯、中等難度決策 |
| `ultrathink` | 32,000 | 架構設計、重大技術決策 |

## 🛠️ 專案特定工作流程

### 交易系統開發

```bash
# 1. 理解現有架構
> /deepdive 交易系統的資料流和狀態管理

# 2. 規劃新功能
Shift+Tab
> /ultraplan 增加交易撤銷功能，需要考慮並發控制

# 3. 安全審查
> /safereview src/app/api/trade/**/*.ts
```

### API 開發

```bash
# 1. 研究現有模式
> /deepdive 尋找現有的 API 錯誤處理和中間件模式

# 2. 實作新 API
> 實作 GET /api/items/:id，使用專案的 withAuthAndError 中間件

# 3. 審查
Shift+Tab
> /safereview 檢查新的 API 是否遵循專案規範
```

### 效能優化

```bash
# 1. 識別瓶頸
> /deepdive 分析首頁載入時間過長的原因

# 2. 評估方案
> think hard 比較 SSR、ISR 和 Client-side 渲染的效能影響

# 3. 實作優化
> 實作推薦的優化方案
```

## 💡 最佳實踐

### ✅ 做

- **開始前先規劃** - 複雜任務使用 Plan Mode + ultrathink
- **遵循專案規範** - 參考 CLAUDE.md 中的要求
- **使用自訂指令** - 重複的工作流程建立 slash 指令
- **組合使用** - Plan Mode + ultrathink 是強大的組合
- **提供上下文** - 告訴 Claude 您的目標和約束
- **迭代改進** - 使用 `/clear` 清除上下文，重新開始

### ❌ 避免

- **過度使用 ultrathink** - 簡單任務不需要最大思考預算
- **跳過規劃** - 複雜任務直接實作容易出錯
- **忽略專案模式** - 始終參考現有程式碼的實作方式
- **批量提交** - 保持小而頻繁的提交
- **忽略審查** - 重要變更使用 `/safereview`

## 🎓 進階技巧

### 1. 組合魔法關鍵字

```bash
# 研究 + 深度思考
> research 現有的快取實作，然後 ultrathink 最佳的改進方案
```

### 2. 使用背景執行（Ctrl+B）

```bash
# 啟動開發伺服器在背景
!npm run dev
Ctrl+B

# 繼續開發，同時伺服器在背景運行
> 新增一個新的 API 路由
```

### 3. 快速記憶（# 前綴）

```bash
# 新增專案規則到 CLAUDE.md
> #所有 API 必須使用 withAuthAndError 中間件

# Claude 會記住這個規則
```

### 4. 視覺化反饋循環

```bash
# 開發 UI 元件
> 建立一個交易卡片元件

# 檢視結果（截圖或瀏覽器）
> 調整卡片的間距和顏色

# 迭代改進
```

## 📈 效率提升檢查清單

開始新任務前，問自己：

- [ ] 這個任務是否需要規劃？（→ Plan Mode）
- [ ] 我是否理解現有的程式碼模式？（→ /deepdive）
- [ ] 這個決策是否複雜？（→ ultrathink）
- [ ] 我是否需要評估多種方案？（→ think hard）
- [ ] 變更是否重大？（→ /safereview）

## 🔗 相關資源

- [魔法關鍵字完整參考](./magic-keywords-reference.md)
- [自訂指令使用指南](./custom-commands-guide.md)
- [Claude Code 官方文檔](https://docs.claude.com/en/docs/claude-code)
- [專案開發規範](../../CLAUDE.md)

## 🆘 疑難排解

### Claude 的回應不符合預期？

1. **提供更多上下文** - 說明您的目標和約束
2. **使用更強的思考模式** - 嘗試 `think hard` 或 `ultrathink`
3. **切換到 Plan Mode** - 先規劃再執行
4. **清除上下文** - 使用 `/clear` 重新開始
5. **檢查 CLAUDE.md** - 確認專案規則是否正確

### Token 消耗太快？

1. **適當選擇思考級別** - 不是所有任務都需要 ultrathink
2. **使用 Plan Mode** - 避免昂貴的執行階段
3. **分解任務** - 大任務分成小塊
4. **使用 /compact** - 壓縮對話歷史

### 不確定使用哪個指令？

參考上面的「決策樹」章節，或：
- 簡單任務 → 直接描述
- 探索程式碼 → `/deepdive`
- 規劃設計 → `/ultraplan` 或 `/archdesign`
- 程式碼審查 → `/safereview`

---

**提示**：定期審查和更新這些工作流程，隨著專案發展調整策略。
