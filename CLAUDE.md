The orignal prompt is from: https://www.dzombak.com/blog/2025/08/getting-good-results-from-claude-code/

# 開發指南

## 📑 目錄

- [🚀 快速開始](#-快速開始)
- [📈 優化歷史](#-優化歷史)
- [🤖 Claude 行為準則](#-claude-行為準則)
- [📐 開發理念](#-開發理念)
- [🔧 開發流程](#-開發流程)
- [🌐 API 開發規範](#-api-開發規範)
- [💎 程式碼品質標準](#-程式碼品質標準)
- [🎨 UI/UX 設計規範](#-uiux-設計規範)
- [✅ 品質閘門與維護](#-品質閘門與維護)

---

## 🚀 快速開始

### 5 秒速查

```bash
# 開發前必做
npm run type-check && npm run lint

# 常用指令
npm run dev          # 啟動開發伺服器
npm run type-check   # TypeScript 檢查
npm run lint         # 程式碼品質檢查
```

### 核心原則（3 條）

1. **使用繁體中文** - 所有溝通均使用繁體中文
2. **使用 TodoWrite 追蹤複雜任務** - 完成後立即標記 completed
3. **遵循專案規範** - 使用日誌系統 (apiLogger/dbLogger)、統一錯誤處理、API 中間件

### 常用指令

```bash
# 開發流程
npm run dev                          # 啟動開發伺服器 (Turbopack)
npm run type-check                   # 檢查 TypeScript 類型
npm run lint                         # 檢查程式碼品質

# 維護檢查
rm -rf .next/cache                   # 清理建置快取
npm audit                            # 安全性檢查
npm run analyze                      # Bundle 大小分析

# 依賴管理
npm ls | grep package-name           # 檢查套件
npx depcheck                         # 檢查未使用依賴
```

### 開發流程 Slash Commands

```bash
# 開發前檢查
/pre-dev-check [功能名稱]            # 開發前檢查（Code Reuse、依賴、架構、效能）

# API 開發檢查
/api-check [API路徑]                 # API 開發完成檢查（中間件、錯誤處理、TypeScript）

# 維護和發布檢查
/major-change-check                  # 重大變更維護檢查（快取、依賴、品質、TODO）
/release-check                       # 版本發布前檢查（依賴、測試、效能、文檔）
/tech-debt-scan                      # 技術債掃描（建置時間、警告、重複程式碼、過時依賴）
```

### 檢查優化歷史

**⚠️ 重要：在建議任何優化前，請先執行以下指令**

```bash
/opt-status                          # 查看完整優化歷史
/opt-status pending                  # 查看待實施項目
/opt-status rejected                 # 查看已拒絕項目
```

**為什麼需要檢查？**
- 避免重複建議已實施的優化
- 了解哪些優化已被評估但拒絕（含原因）
- 掌握專案當前的優化狀態和效能指標

**詳細資訊**：查閱 `docs/optimization/OPTIMIZATION_HISTORY.md`

---

## 📈 優化歷史

本專案已實施和規劃的優化記錄在 **`docs/optimization/OPTIMIZATION_HISTORY.md`**。

### 已實施優化（8 項）

#### 🚀 效能優化
- ✅ Redis 快取（市場搜尋）
- ✅ Cloudflare R2 圖片 CDN

#### 🏗️ 架構改進
- ✅ 統一錯誤處理系統
- ✅ API 中間件組合系統
- ✅ 日誌系統標準化

#### 🔒 安全加固
- ✅ Bot Detection 系統
- ✅ Discord 帳號年齡驗證
- ✅ 配額系統（RPC 實作）

### 待評估優化（6 項）

#### 💰 成本優化
- 📋 調整 Middleware 匹配規則（⭐ 最高優先級）
  - 預期：減少 40-50% Function Invocations
- 📋 Edge Functions 遷移（6 個低風險 API）
  - 預期：成本降低 30-40%、延遲減少 60-70%
- 📋 客戶端快取 (`/api/auth/me`)
  - 預期：減少 60% 調用次數

#### 🚀 效能優化
- 📋 批次 API 請求
- 📋 WebSocket 即時通知
- 📋 資料庫查詢優化

### 使用規範

#### **建議優化前必須檢查**
```bash
/opt-status                 # 在提出任何優化建議前執行
```

#### **實施優化後更新記錄**
完成優化後，請更新 `OPTIMIZATION_HISTORY.md`：
1. 移動項目從「待評估」到「已實施」
2. 填寫實施日期、Commit hash、實際效果
3. 更新效能指標和統計資料

#### **評估但拒絕的優化**
如果某個優化被評估後決定不實施，請記錄到「已評估但未實施」區塊，說明拒絕原因。

**詳細文件**：`docs/optimization/OPTIMIZATION_HISTORY.md`

---

## 🤖 Claude 行為準則

### 執行原則

- **精確執行** - 只做被要求的事，不多不少
- **謹慎建立檔案** - 只在絕對必要時建立新檔案，優先編輯現有檔案
- **不主動建立文檔** - 除非使用者明確要求，否則不建立 *.md 或 README 檔案

### Git 提交流程

- **Commit 前必須詢問**：
  1. 展示變更的檔案列表 (`git status`, `git diff --stat`)
  2. 展示完整的 commit message 草稿
  3. 等待使用者明確確認後才執行 commit
  4. 確認後才可執行 `git add` 和 `git commit`

- **Push 前必須詢問**：
  1. 詢問使用者是否要推送到 remote
  2. 等待使用者明確確認後才執行 `git push`
  3. 永不自動執行 push 操作

### TodoWrite 使用規範

#### 基本原則

將複雜工作分解為 3-5 個階段，使用 TodoWrite 工具追蹤進度：

```typescript
TodoWrite({
  todos: [
    { content: "階段 1: [具體目標]", status: "pending", activeForm: "執行階段 1中" },
    { content: "階段 2: [具體目標]", status: "pending", activeForm: "執行階段 2中" }
  ]
})
```

#### 狀態管理規則

1. **狀態轉換順序**：
   - pending (待處理) → in_progress (進行中) → completed (已完成)
   - 永不跳過 in_progress 直接標記為 completed

2. **一次只有一個 in_progress**：
   - 同一時間只能有一個任務狀態為 `in_progress`
   - 開始新任務前必須先完成當前任務

3. **立即更新原則**：
   - ✅ 開始任務時：**立即**標記為 `in_progress`
   - ✅ 完成任務後：**立即**標記為 `completed`
   - ❌ 不要批量處理多個任務的狀態更新

4. **任務描述格式**：
   - `content`: 命令式（例：「建立 API 目錄結構」）
   - `activeForm`: 現在進行式（例：「建立 API 目錄結構中」）

5. **完成條件要求**：
   - **僅當任務完全完成時**才標記為 `completed`
   - 如果遇到錯誤或阻塞，保持 `in_progress`
   - 永不標記未完成的任務為 `completed`

**何時不標記為 completed**：
- 測試失敗時
- 實作部分完成時
- 遇到未解決的錯誤時
- 找不到必要檔案或依賴時
- 被阻塞無法繼續時

#### Markdown 文檔任務清單同步

**當專案包含實作路線圖或檢查清單文檔時**（如 `docs/architecture/交易系統/08-實作路線圖.md`），Claude 需要同時管理兩種任務清單：

1. **TodoWrite（動態追蹤）**：
   - 用於追蹤當前會話的執行進度
   - 狀態：pending → in_progress → completed
   - 會話結束後狀態消失

2. **Markdown Task List（靜態記錄）**：
   - 用於更新文檔中的永久記錄
   - 格式：`- [ ]` → `- [x]`
   - 永久保存在文檔中

**同步規則**：

- **開始任務時**：只更新 TodoWrite 為 in_progress，文檔保持 `[ ]`
- **完成任務時**：同時更新 TodoWrite 為 completed **和**文檔為 `[x]`

**適用情境**：
- ✅ 當任務來自文檔中的檢查清單
- ✅ 當實作路線圖明確列出任務清單
- ❌ 當任務是臨時性的（不在文檔中）

**注意事項**：
- 僅更新**直接對應**的任務項目
- 不要一次批量勾選多個未完成的任務
- 完成任務後**立即**更新文檔，不要等到最後才批量更新

---

## 📐 開發理念

### 核心信念

- **漸進式進展優於大爆炸式改變** - 小的變更能編譯並通過測試
- **從現有程式碼中學習** - 在實作前先研究和規劃
- **實用主義優於教條主義** - 適應專案現實
- **清晰意圖優於巧妙程式碼** - 保持無趣和明顯
- **單一職責原則** - 每個函數/類別單一職責，避免過早抽象化
- **高信心原則** - 不確定時說「不知道」，優先研究和驗證而非猜測

### 永不 與 始終

**永不**：
- 使用 `--no-verify` 繞過提交鉤子
- 停用測試而不是修復它們
- 提交不能編譯的程式碼
- 做假設 - 用現有程式碼驗證
- **在沒有理由的情況下安裝依賴** - 始終在提交訊息中解釋原因
- **建立重複功能** - 先用 grep/搜尋檢查現有程式碼
- **忽略效能警告** - 解決套件大小和建置時間問題

**始終**：
- 漸進式提交可工作的程式碼
- 從現有實作中學習
- 3 次嘗試失敗後停止並重新評估
- **執行開發前檢查清單** - 程式碼重用、依賴評估、架構一致性、效能影響
- **監控技術債信號** - 建置時間增加、TypeScript 錯誤、ESLint 警告、重複程式碼

### 決策框架

當存在多種有效方法時，根據以下原則選擇：

1. **可測試性** - 我能輕易測試這個嗎？
2. **可讀性** - 6 個月後有人能理解這個嗎？
3. **一致性** - 這是否符合專案模式？
4. **簡潔性** - 這是否最簡單可行的解決方案？
5. **可逆性** - 後續更改有多困難？
6. **技術債影響** - 這會在後續產生技術債嗎？

### 學習程式碼庫

- 找到 3 個類似的功能/元件
- 識別常見模式和慣例
- 盡可能使用相同的函式庫/工具
- 遵循現有的測試模式

---

## 🔧 開發流程

### 開發前檢查清單

實作任何功能前，**必須**執行開發前檢查：

```bash
/pre-dev-check [功能名稱或描述]
```

**檢查項目包括**：
- ✅ **Code Reuse Check** - 搜尋相似功能，避免重複實作
- ✅ **Dependency Assessment** - 評估是否需要新依賴，避免套件膨脹
- ✅ **Architecture Consistency** - 確認遵循專案架構模式
- ✅ **Performance Impact** - 評估對建置時間和 Bundle 大小的影響

**詳細檢查項目和標準**：請參考 `.claude/commands/pre-dev-check.md`

**每次開發前執行**：
```bash
npm run type-check && npm run lint
```

### 實作流程

1. **理解** - 研究程式碼庫中的現有模式
2. **實作** - 編寫功能程式碼
3. **測試** - 根據情況編寫或更新測試（新功能必須、修復建議、重構可選）
4. **重構** - 在測試通過的情況下清理
5. **提交** - 使用清晰的訊息解釋「為什麼」

### 遇到困難時（嘗試 3 次後）

**重要**：每個問題最多嘗試 3 次，然後停止。

1. **記錄失敗原因**：
   - 你嘗試了什麼
   - 具體的錯誤訊息
   - 你認為為什麼失敗

2. **研究替代方案**：
   - 找到 2-3 個類似的實作
   - 記錄使用的不同方法

3. **質疑基本原則**：
   - 這是否正確的抽象層級？
   - 能否將其分解為更小的問題？
   - 是否有更簡單的方法？

4. **嘗試不同角度**：
   - 不同的函式庫/框架功能？
   - 不同的架構模式？
   - 移除抽象而不是添加？

---

## 🌐 API 開發規範

### Error Handling

**專案已實施統一錯誤處理系統** - 請使用現有系統而不要建立新的錯誤處理機制

- **使用統一錯誤類別**: 從 `@/lib/errors` 匯入標準錯誤類別
- **使用錯誤處理中間件**: 在 API 路由中使用 `withErrorHandler`
- **使用統一回應格式**: 從 `@/lib/api-response` 匯入回應工具
- **整合 logger 系統**: 所有錯誤自動記錄到適當的日誌級別 (apiLogger)
- **包含除錯上下文**: 每個錯誤都有追蹤 ID 和詳細上下文
- **永不默默吐掉例外** - 所有例外都應適當處理和記錄

**可用的錯誤類型**：

- `ValidationError` - 輸入驗證失敗 (400)
- `AuthorizationError` - 權限不足 (403)
- `NotFoundError` - 資源不存在 (404)
- `MethodNotAllowedError` - HTTP 方法不支援 (405)
- `DatabaseError` - 資料庫操作失敗 (500)
- `ErrorFactory.fromSupabaseError()` - 自動轉換 Supabase 錯誤

### API 中間件架構

**專案已實施統一的中間件組合系統** - 請使用組合函數而非手動組合

**推薦使用的組合函數**：

- `withAuthAndError` - 認證 + 錯誤處理（需要使用者登入）
- `withAdminAndError` - 管理員認證 + 錯誤處理（需要管理員權限）
- `withOptionalAuthAndError` - 可選認證 + 錯誤處理（公開 API 但可能需要使用者資訊）

**範例**：

```typescript
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'

// ✅ 正確：使用組合函數
async function handlePOST(req: NextRequest, user: User) {
  const data = await req.json()
  const result = await service.create(data, user.id)
  return success(result, '建立成功')
}

export const POST = withAuthAndError(handlePOST, {
  module: 'YourAPI',
  enableAuditLog: true
})

// ❌ 錯誤：缺少錯誤處理
export const POST = requireAuth(handlePOST)
```

**重要**：
- `requireAuth`/`requireAdmin` 只負責認證，**不包含**錯誤處理
- 處理函數必須接收 `(request: NextRequest, user: User)` 參數
- 使用組合函數時，錯誤會自動記錄到 apiLogger

### Next.js 15 動態路由參數處理

**重要**：Next.js 15 中，動態路由參數是 Promise，必須 await：

```typescript
// ✅ 正確：await params Promise
async function handleGET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params  // 必須 await
  const data = await service.findById(id)
  return success(data, '查詢成功')
}

export const GET = withAuthAndError(handleGET, { module: 'ProductAPI' })
```

### API 開發完成檢查清單

API 開發完成後，**必須**執行 API 檢查：

```bash
/api-check [API 路徑或檔案]
```

**檢查項目包括**：
- ✅ **中間件和認證** - 正確使用組合中間件（withAuthAndError/withAdminAndError）
- ✅ **錯誤處理** - 使用標準錯誤類型和統一回應格式
- ✅ **TypeScript** - 類型檢查通過，無 `any` 類型繞過
- ✅ **安全性** - 防止常見漏洞（SQL Injection、XSS 等）
- ✅ **資料庫操作** - 使用統一 Service 層，避免 N+1 查詢
- ✅ **測試** - 新功能必須有測試覆蓋

**詳細檢查項目和標準**：請參考 `.claude/commands/api-check.md`

---

## 💎 程式碼品質標準

### 架構原則

- **組合優於繼承** - 使用依賴注入
- **介面優於單例模式** - 啟用測試和靈活性
- **明確優於隱含** - 清晰的資料流和依賴關係
- **重視測試** - 永不停用測試，修復它們；新功能必須有測試

### 程式碼品質要求

**每次提交必須**：
- 編譯成功
- 通過所有現有測試
- 遵循專案格式化/linting
- 使用專案日誌系統 (apiLogger/dbLogger，不用 console.log)

**提交前**：
- **先向使用者確認** - 展示變更檔案和 commit message 草稿
- 運行格式化工具/linter
- 自我審查變更
- 確保提交訊息解釋「為什麼」

### 品質標準與技術債管理

**品質標準**（建議）:
- 相同邏輯出現 **3+ 次** → 考慮抽取為共用函數
- 元件建議 **< 200 行** / 函數建議 **< 30 行** / Props 建議 **< 7 個**
- 巢狀層數建議 **< 3 層** / 參數數量建議 **< 5 個**
- 避免在元件內直接調用 API (使用 custom hooks)

**技術債信號**:
- 🔴 建置時間增加 > 30 秒
- 🔴 TypeScript/ESLint 錯誤或警告數量增加
- 🔴 相似功能在多處重複實作
- 🔴 依賴套件版本過舊或有安全漏洞

**技術債分類**:
- 🔴 Critical - 影響系統穩定性、安全性或核心功能
- 🟡 Major - 影響開發效率、用戶體驗或維護成本
- 🟢 Minor - 程式碼整潔度、文檔或註解問題

**定期執行技術債掃描**：
```bash
/tech-debt-scan
```

掃描項目包括：建置時間、TypeScript/ESLint 警告、重複程式碼、過時依賴、安全漏洞、Bundle 大小、TODO/DEBT 標籤、程式碼複雜度等。

**詳細掃描項目和標準**：請參考 `.claude/commands/tech-debt-scan.md`

**遇到技術債信號時**：
1. **記錄問題** - 使用 TODO 註釋和 DEBT 標籤
2. **考慮重構** - 而不是增加問題
3. **參考現有實作** - 尋找類似的模式

### 依賴管理

**新增依賴前必須執行**:

```bash
# 1. 檢查現有相似功能
grep -r "import.*from.*package-name" src/
npm ls | grep similar-functionality

# 2. 評估套件健康度
npm info package-name
npm audit

# 3. 檢查 Bundle 影響
npm run analyze  # 記錄當前大小
npm install package-name
npm run analyze  # 比較差異

# 4. 檢查未使用依賴
npx depcheck
```

**依賴管理規則**:
- **避免** 安裝功能重複的套件（如已有 lodash 不要加 ramda）
- **謹慎** 安裝超過 1 年未更新的套件（除非是穩定庫）
- **評估** 增加 bundle > 100KB 的套件影響（非核心功能需謹慎）
- **必須** 在 commit message 說明為什麼需要新依賴

### 測試指南

- 測試行為而非實作
- 盡可能每個測試一個斷言
- 清晰的測試名稱描述場景
- 使用現有的測試工具/助手
- 測試應該是確定性的

---

## 🎨 UI/UX 設計規範

### 視覺設計原則

1. **禁止使用漸層**
   - ❌ `bg-gradient-to-r from-blue-500 to-purple-600`
   - ✅ `bg-blue-500`
   - 理由：保持視覺簡潔、提升效能、易於維護

2. **禁止使用 Emoji**
   - ❌ `🎯` `✅` `❌` `📊` `🔍`
   - ✅ 使用 SVG 圖示替代
   - 理由：emoji 在不同平台顯示不一致、無法精確控制樣式、影響無障礙體驗

3. **使用 SVG 圖示**
   - 使用 inline SVG 或圖示庫（如 Heroicons）
   - 確保 SVG 支援深色模式（使用 `currentColor`）
   - 提供適當的 `aria-label` 以支援無障礙
   - SVG 應具有適當的尺寸類別（如 `w-6 h-6`）

**範例**：

```tsx
// ❌ 錯誤：使用 emoji
<div>{isSuccess ? '✅' : '❌'} 操作結果</div>

// ✅ 正確：使用 SVG 圖示
<div className="flex items-center gap-2">
  {isSuccess ? (
    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )}
  <span>操作結果</span>
</div>
```

---

## ✅ 品質閘門與維護

### 完成定義

- [ ] 測試已寫並通過
- [ ] 程式碼遵循專案慣例
- [ ] 沒有 linter/格式化器警告
- [ ] 提交訊息清晰
- [ ] 實作符合計劃

### 重大變更的維護

**執行重大變更時** 必須執行維護檢查：

```bash
/major-change-check
```

**檢查項目包括**：
- ✅ **快取清理** - 清理建置快取（目標 < 200MB）
- ✅ **依賴檢查** - 未使用依賴、安全漏洞、過時套件
- ✅ **品質檢查** - TypeScript、Lint、Bundle 大小
- ✅ **TODO 掃描** - 追蹤未完成工作和技術債
- ✅ **測試和建置** - 確保所有測試通過、建置成功

**詳細檢查項目和標準**：請參考 `.claude/commands/major-change-check.md`

### 版本發布維護

**版本發布前** 必須執行深度維護檢查：

```bash
/release-check
```

**檢查項目包括**：
- ✅ **依賴健康** - 過時依賴、安全漏洞、未使用套件
- ✅ **程式碼品質** - 重複程式碼、TypeScript、Lint、測試覆蓋率
- ✅ **效能基準** - 建置時間、Bundle 大小、關鍵路徑效能
- ✅ **資料庫效能** - 查詢優化、索引設置、N+1 查詢檢查
- ✅ **測試套件** - 單元測試、整合測試、E2E 測試、手動測試
- ✅ **系統指標** - Vercel 效能、API 回應時間、快取命中率
- ✅ **文檔更新** - README、API 文檔、Changelog、優化歷史
- ✅ **環境配置** - 環境變數、生產配置、敏感資訊檢查
- ✅ **備份回滾** - 資料庫備份、回滾計劃

**詳細檢查項目和標準**：請參考 `.claude/commands/release-check.md`

**建議**：在非尖峰時段發布，並在發布後持續監控 1-2 小時。
