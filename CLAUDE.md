The orignal prompt is from: https://www.dzombak.com/blog/2025/08/getting-good-results-from-claude-code/

# 開發指南

## 🚀 快速參考

### 5 個核心原則
1. **使用繁體中文** - 所有溝通均使用繁體中文
2. **避免不必要地建立檔案** - 優先編輯現有檔案
3. **使用專案日誌系統** - 永不使用 console.log（使用 apiLogger、dbLogger 等）
4. **執行開發前檢查清單** - 程式碼重用、依賴檢查、效能影響
5. **對複雜任務使用 TodoWrite** - 通過狀態更新追蹤進度

### 關鍵規則
```bash
# 開發前必須執行
npm run type-check && npm run lint

# 依賴管理
npm ls | grep similar-package        # 檢查重複套件
npx depcheck                         # 檢查未使用依賴

# 技術債警告信號
🔴 相同邏輯出現 3+ 次              → 抽取為共用函數
🔴 元件 > 200 行 / 函數 > 30 行    → 拆分或簡化
🔴 建置時間增加 > 30 秒            → 調查並優化
```

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
```
---

## 開發理念

### 核心信念

- **漸進式進展優於大爭霸式改變** - 小的變更能編譯並通過測試
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
- 隨時更新計劃文件
- 從現有實作中學習
- 3 次嘗試失敗後停止並重新評估
- **執行開發前檢查清單** - 程式碼重用、依賴評估、架構一致性、效能影響
- **監控技術債信號** - 建置時間增加、TypeScript 錯誤、ESLint 警告、重複程式碼
- **適當記錄技術債** - 使用帶有 DEBT 標籤、分類和估計工作量的 TODO 註釋
- **執行每週維護** - 快取清理、依賴檢查、安全稽核、套件分析
- **追蹤效能指標** - 建置大小 < 200MB 快取、建置時間 < 5分鐘、套件 JS < 500KB

## 開發流程

### 開發前檢查清單

實作任何功能前，**必須**驗證：

- [ ] **Code Reuse Check**: 搜尋是否有相似功能可以重用
  - 使用 `grep -r -E "(function|class|const)" src/` 檢查現有功能
  - 檢查 `src/lib/` 和 `src/components/` 是否有相關工具
  - 優先擴展現有功能而非創建新的

- [ ] **Dependency Assessment**: 評估是否需要新依賴
  - 確認不會引入重複功能的套件
  - 檢查套件維護狀態：最後更新 < 1年、stars > 1000、active issues
  - 執行 `npm ls` 確認不會產生依賴衝突
  - **記錄為什麼需要此依賴** (在 commit message 中)

- [ ] **Architecture Consistency**: 確認遵循現有模式
  - API 路由使用統一錯誤處理中間件
  - 服務層使用 BaseService 或 AbstractService
  - 元件遵循現有的 props 和 state 管理模式

- [ ] **Performance Impact**: 評估效能影響
  - 新增功能不會增加建置時間 > 30 秒
  - 不會增加主要 bundle 大小 > 50KB
  - 避免引入會影響 Runtime 效能的重型套件

**每次開發前執行**：
```bash
npm run type-check && npm run lint
```

### 1. 規劃與階段分割

將複雜工作分解為 3-5 個階段。使用 TodoWrite 工具追蹤進度：

```typescript
TodoWrite({
  todos: [
    { content: "階段 1: [具體目標]", status: "pending", activeForm: "執行階段 1" },
    { content: "階段 2: [具體目標]", status: "pending", activeForm: "執行階段 2" },
    // ... 最多 5 個階段
  ]
})
```
- 隨著進度更新狀態 (pending → in_progress → completed)
- 每個階段都要有明確的成功標準和可測試的結果

### 2. 實作流程

1. **理解** - 研究程式碼庫中的現有模式
2. **實作** - 編寫功能程式碼
3. **測試** - 根據情況編寫或更新測試（新功能必須、修復建議、重構可選）
4. **重構** - 在測試通過的情況下清理
5. **提交** - 使用清晰的訊息解釋「為什麼」

### 3. 遇到困難時（嘗試 3 次後）

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

## API 開發規範

### Error Handling

**專案已實施統一錯誤處理系統** - 請使用現有系統而不要建立新的錯誤處理機制

- **使用統一錯誤類別**: 從 `@/lib/errors` 匯入標準錯誤類別
- **使用錯誤處理中間件**: 在 API 路由中使用 `withErrorHandler`
- **使用統一回應格式**: 從 `@/lib/api-response` 匯入回應工具
- **整合 logger 系統**: 所有錯誤自動記錄到適當的日誌級別
- **包含除錯上下文**: 每個錯誤都有追蹤 ID 和詳細上下文
- **永不默默吐掉例外** - 所有例外都應適當處理和記錄

#### 可用的錯誤類型

- `ValidationError` - 輸入驗證失敗 (400)
- `AuthorizationError` - 權限不足 (403)
- `NotFoundError` - 資源不存在 (404)
- `MethodNotAllowedError` - HTTP 方法不支援 (405)
- `DatabaseError` - 資料庫操作失敗 (500)
- `ErrorFactory.fromSupabaseError()` - 自動轉換 Supabase 錯誤

### API 中間件架構

**專案已實施統一的中間件組合系統** - 請使用組合函數而非手動組合

#### 可用的組合函數（推薦使用）

- `withAuthAndError` - 認證 + 錯誤處理（需要使用者登入）
- `withAdminAndError` - 管理員認證 + 錯誤處理（需要管理員權限）
- `withOptionalAuthAndError` - 可選認證 + 錯誤處理（公開 API 但可能需要使用者資訊）

```typescript
import { withAuthAndError, withAdminAndError, User } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'

// ✅ 正確：使用組合函數
async function handlePOST(req: NextRequest, user: User) {
  // user 已確保存在且已通過錯誤處理
  const data = await req.json()
  const result = await service.create(data, user.id)
  return success(result, '建立成功')
}

export const POST = withAuthAndError(handlePOST, {
  module: 'YourAPI',
  enableAuditLog: true
})

// ❌ 錯誤：缺少錯誤處理
export const POST = requireAuth(handlePOST)  // requireAuth 不包含 withErrorHandler

// ❌ 錯誤：重複包裝
export const POST = withErrorHandler(requireAuth(handlePOST), { module: 'API' })
```

**重要**：
- `requireAuth`/`requireAdmin` 只負責認證，**不包含**錯誤處理
- 處理函數必須接收 `(request: NextRequest, user: User)` 參數
- 使用組合函數時，錯誤會自動記錄到 apiLogger

#### 基礎中間件（僅在特殊情況使用）

- `requireAuth` - 僅認證檢查
- `requireAdmin` - 僅管理員檢查
- `optionalAuth` - 僅可選認證
- `withErrorHandler` - 僅錯誤處理

**何時使用**：只在需要自定義中間件組合時才使用基礎中間件。

### API 開發完成檢查清單

- [ ] 使用適當的組合中間件 (withAuthAndError/withAdminAndError/withOptionalAuthAndError)
- [ ] 所有錯誤使用標準錯誤類型 (ValidationError, NotFoundError, MethodNotAllowedError 等)
- [ ] 動態路由參數正確使用 await (Next.js 15+)
- [ ] 處理函數接收正確參數：`(request: NextRequest, user: User)` 或 `(request: NextRequest, user: User | null)`
- [ ] 回應使用統一格式 (success, created, successWithPagination)
- [ ] TypeScript 類型檢查通過
- [ ] 處理不支援的 HTTP 方法時返回 MethodNotAllowedError

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

// ❌ 錯誤：直接使用 params
async function handleGET(
  request: NextRequest,
  context: { params: { id: string } }  // 類型錯誤
) {
  const { id } = context.params  // 執行時錯誤
}
```

**參考範例**：
- 查看 `src/app/api/admin/connection-pool/route.ts` 了解正確的中間件使用
- 查看 `src/app/api/site-settings/route.ts` 了解組合函數的實際應用

## 技術標準

### 架構原則

- **組合優於繼承** - 使用依賴注入
- **介面優於單例模式** - 啟用測試和靈活性
- **明確優於隱含** - 清晰的資料流和依賴關係
- **重視測試** - 永不停用測試，修復它們；新功能必須有測試

### 程式碼品質

- **每次提交必須**：
  - 編譯成功
  - 通過所有現有測試
  - 遵循專案格式化/linting
  - 使用專案日誌系統 (不用 console.log)

- **提交前**：
  - 運行格式化工具/linter
  - 自我審查變更
  - 確保提交訊息解釋「為什麼」

- **錯誤自動記錄**: 使用 `withErrorHandler` 中間件時，錯誤會自動記錄到適當級別

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

### 程式碼品質保證與技術債管理

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

**遇到技術債信號時**：
1. **記錄問題** - 使用 TODO 註釋和 DEBT 標籤
2. **考慮重構** - 而不是增加問題
3. **參考現有實作** - 尋找類似的模式

### 測試指南

- 測試行為而非實作
- 盡可能每個測試一個斷言
- 清晰的測試名稱描述場景
- 使用現有的測試工具/助手
- 測試應該是確定性的

## 決策與學習

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

### 開發工具

- 使用專案現有的建置系統
- 使用專案的測試框架
- 使用專案的格式化器/linter 設定
- 不要在沒有強烈理由的情況下引入新工具

## 品質閣門

### 完成定義

- [ ] 測試已寫並通過
- [ ] 程式碼遵循專案慣例
- [ ] 沒有 linter/格式化器警告
- [ ] 提交訊息清晰
- [ ] 實作符合計劃

## 維護任務

### 重大變更的維護

**執行重大變更時** 執行以下維護工作：

```bash
# 1. 清理建置快取
rm -rf .next/cache
echo "Cache size after cleanup: $(du -sh .next/ 2>/dev/null || echo "0B")"

# 2. 檢查未使用的依賴
npx depcheck

# 3. 檢查依賴安全性
npm audit

# 4. 分析 Bundle 大小
npm run analyze

# 5. 檢查 TODO 註解
grep -r "TODO" src/ --include="*.ts" --include="*.tsx"
```

**重大變更檢查清單**：
- [ ] 清理建置快取 (目標: < 200MB)
- [ ] 移除未使用依賴
- [ ] 修復安全漏洞 (high/critical)
- [ ] 審查並處理 TODO 項目
- [ ] 確認 Bundle 大小在標準內

### 版本發布維護

**版本發布前** 執行深度維護：

```bash
# 1. 依賴套件健康檢查
npm outdated

# 2. 檢查重複程式碼
# 使用工具如 jscpd 或手動檢查常見模式
grep -r "function.*{" src/ | sort | uniq -c | sort -nr

# 3. 資料庫效能檢查
# 檢查慢查詢日誌 (如果有的話)

# 4. 效能基準測試
npm run build
echo "Build time: $(date)"
```

**版本發布檢查清單**：
- [ ] 評估並更新依賴套件 (minor/patch 版本)
- [ ] 檢查並清理重複程式碼
- [ ] 審查資料庫查詢效能
- [ ] 運行完整的測試套件
- [ ] 檢查系統效能指標
- [ ] 更新文檔和 README

---

## 🤖 Claude 行為準則

以下是 Claude 在此專案中的核心行為準則：

### 執行原則
- **精確執行** - 只做被要求的事，不多不少
- **謹慎建立檔案** - 只在絕對必要時建立新檔案
- **優先編輯現有檔案** - 永遠優先選擇編輯而非建立
- **不主動建立文檔** - 除非使用者明確要求，否則不建立 *.md 或 README 檔案