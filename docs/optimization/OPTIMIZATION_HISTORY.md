# 專案優化歷史

> **最後更新**：2025-11-03
> **維護者**：請在每次實施優化後更新此文件

---

## 📊 總覽統計

| 指標 | 數值 |
|------|------|
| ✅ 已實施優化 | 11 項 |
| ⏳ 進行中 | 0 項 |
| 📋 待評估 | 3 項 |
| 🚫 已拒絕 | 0 項 |
| 💰 預估成本節省 | $20-32/月 |
| ⚡ 預估效能提升 | API 延遲 -60%, 頁面載入 -30% |

---

## ✅ 已實施優化

### 🚀 效能優化

#### [Redis 快取 - 市場搜尋]
- **狀態**：✅ 已實施
- **實施日期**：2024-10 (估計)
- **類別**：效能優化
- **預期效果**：減少 30-40% 資料庫查詢
- **技術細節**：
  - 使用 Upstash Redis 快取市場搜尋結果
  - TTL 設置為適當時間
  - 基本搜尋有快取，複雜篩選不快取
- **相關檔案**：
  - `src/app/api/market/search/route.ts`

#### [Cloudflare R2 圖片 CDN]
- **狀態**：✅ 已實施
- **實施日期**：2024-10 (估計)
- **類別**：效能優化 + 成本優化
- **預期效果**：圖片載入速度提升、減少 Vercel 頻寬成本
- **技術細節**：
  - 所有遊戲圖片資源儲存在 Cloudflare R2
  - 通過 CDN 分發，全球低延遲
  - 減少 Vercel Function Invocations
- **相關檔案**：
  - `public/images/` (已遷移)

### 🏗️ 架構改進

#### [統一錯誤處理系統]
- **狀態**：✅ 已實施
- **實施日期**：2024-10 (估計)
- **類別**：架構改進
- **預期效果**：提升程式碼品質、減少錯誤處理不一致
- **技術細節**：
  - 標準錯誤類別：`ValidationError`, `AuthorizationError`, `NotFoundError`, `DatabaseError`
  - 統一錯誤處理中間件：`withErrorHandler`
  - 整合 logger 系統 (apiLogger)
  - 包含追蹤 ID 和詳細上下文
- **相關檔案**：
  - `src/lib/errors.ts`
  - `src/lib/middleware/error-handler.ts`

#### [API 中間件組合系統]
- **狀態**：✅ 已實施
- **實施日期**：2024-10 (估計)
- **類別**：架構改進
- **預期效果**：簡化 API 開發、統一認證流程
- **技術細節**：
  - 組合函數：`withAuthAndError`, `withAdminAndError`, `withOptionalAuthAndError`
  - 自動錯誤處理 + 認證檢查
  - 支援 Audit Log
- **相關檔案**：
  - `src/lib/middleware/api-middleware.ts`

#### [日誌系統標準化]
- **狀態**：✅ 已實施
- **實施日期**：2024-10 (估計)
- **類別**：架構改進
- **預期效果**：提升除錯效率、統一日誌格式
- **技術細節**：
  - 標準 logger：`apiLogger`, `dbLogger`
  - 不使用 `console.log`
  - 結構化日誌格式
- **相關檔案**：
  - `src/lib/logger.ts`

### 🔒 安全加固

#### [Bot Detection 系統]
- **狀態**：✅ 已實施
- **實施日期**：2024-10 (估計)
- **類別**：安全加固
- **預期效果**：防止惡意爬蟲、減少無效流量
- **技術細節**：
  - Global Middleware Bot Detection
  - User-Agent 過濾
  - Rate Limiting (各 API 獨立限制)
  - 允許 SEO 爬蟲通過
- **相關檔案**：
  - `src/middleware.ts`
  - 各 API 路由的 Rate Limiting 配置

#### [Discord 帳號年齡驗證]
- **狀態**：✅ 已實施
- **實施日期**：2024-10 (估計)
- **類別**：安全加固
- **預期效果**：防止新帳號濫用、提升平台信任度
- **技術細節**：
  - 刊登建立前檢查 Discord 帳號必須滿 1 年
  - Discord 伺服器成員驗證
  - 快取機制減少 Discord API 調用
- **相關檔案**：
  - `src/app/api/listings/route.ts`

#### [配額系統 (RPC 實作)]
- **狀態**：✅ 已實施
- **實施日期**：2024-10 (估計)
- **類別**：安全加固 + 架構改進
- **預期效果**：防止濫用、確保公平使用
- **技術細節**：
  - 使用 Supabase RPC `create_listing_safe` 防止競態條件
  - 最多 5 個 active listings per user
  - 原子性操作確保配額準確
- **相關檔案**：
  - `src/app/api/listings/route.ts`
  - Supabase RPC function

### 💰 成本優化

#### [調整 Middleware 匹配規則]
- **狀態**：✅ 已實施
- **實施日期**：2025-11-03
- **類別**：成本優化
- **實際效果**：待測量（預期減少 40-50% Function Invocations）
- **技術細節**：
  - 移除頁面層級 Middleware 匹配（`'/((?!_next/static|_next/image|favicon.ico).*)'`）
  - 只保留 API 路由防護（`'/api/:path*'`）
  - API 層級仍保留完整的 Bot Detection 和 Rate Limiting
  - 減少不必要的 Middleware 執行（每日約 22,500 次）
- **相關檔案**：
  - `src/middleware.ts:87-89`
- **注意事項**：
  - 部署後需監控 Vercel Dashboard 的 Function Invocations
  - 確認 API 端點的 Bot Detection 正常運作
  - 觀察頁面訪問流量是否有異常

#### [客戶端快取 - /api/auth/me]
- **狀態**：✅ 已實施
- **實施日期**：2025-11-03
- **類別**：成本優化 + 效能優化
- **實際效果**：待測量（預期減少 60-70% 調用次數）
- **技術細節**：
  - 使用 localStorage 快取用戶資訊（5 分鐘 TTL）
  - 新增 `forceRefreshUser()` 方法供關鍵操作使用
  - 快取結構：`{ data: User, timestamp: number }`
  - 登出時自動清除快取
- **相關檔案**：
  - `src/contexts/AuthContext.tsx`
- **注意事項**：
  - 配額資訊可能延遲最多 5 分鐘更新
  - 建立刊登、表達興趣後需使用 `forceRefreshUser()` 立即更新
  - 監控 `/api/auth/me` 調用次數下降情況

#### [Edge Functions 遷移 - 第一階段]
- **狀態**：✅ 已實施
- **實施日期**：2025-11-03
- **類別**：效能優化 + 成本優化
- **實際效果**：待測量（預期延遲降低 60-70%，成本降低 30-40%）
- **技術細節**：
  - 遷移 6 個輕量級 API 到 Edge Runtime
  - 每個 API 添加 `export const runtime = 'edge'`
  - 所有 API 都無 Node.js 特定依賴
  - Supabase 和 Upstash Redis 都支援 Edge Runtime
- **已遷移 API**：
  1. `GET /api/system/status` - 系統狀態查詢
  2. `GET /api/reputation/[userId]` - 用戶信譽查詢
  3. `GET /api/auth/me/roles` - 角色查詢
  4. `POST /api/auth/logout` - 登出
  5. `GET /api/interests/received` - 購買意向查詢
  6. `GET /api/market/trending` - 熱門刊登
- **相關檔案**：
  - `src/app/api/system/status/route.ts`
  - `src/app/api/reputation/[userId]/route.ts`
  - `src/app/api/auth/me/roles/route.ts`
  - `src/app/api/auth/logout/route.ts`
  - `src/app/api/interests/received/route.ts`
  - `src/app/api/market/trending/route.ts`
- **注意事項**：
  - 部署後監控 Vercel Analytics 的 Edge Request 數量
  - 確認 API 延遲降低（P95 應從 150-250ms → 50-100ms）
  - 檢查錯誤率無增加
  - Edge Runtime 有 25 秒執行時間限制（這些 API 都在 500ms 內）

---

## 📋 待評估優化 (建議項目)

### 🚀 效能優化

#### [批次 API 請求]
- **狀態**：📋 待評估
- **優先級**：🟢 中低
- **預期效果**：市場頁面從 3-4 次 API 降至 1 次
- **建議實作**：
  ```typescript
  // 新增端點: GET /api/market/batch
  - 合併 market listings, trending, user info
  - 單次請求返回所有資料
  ```
- **權衡考量**：
  - ✅ 減少 20% 市場頁面 API 調用
  - ✅ 提升用戶體驗
  - ❌ 增加單一請求複雜度
  - ❌ 可能增加單次請求時間

#### [WebSocket 即時通知]
- **狀態**：📋 待評估
- **優先級**：🟢 低
- **預期效果**：減少輪詢 API 調用
- **技術細節**：
  - 使用 Supabase Realtime 或 Pusher
  - 即時推送購買意向通知
  - 減少定期輪詢 `/api/interests/received`

#### [資料庫查詢優化]
- **狀態**：📋 待評估
- **優先級**：🟡 中
- **建議檢查**：
  - 為常用查詢欄位新增索引
  - 檢查 N+1 查詢問題
  - 使用 Supabase VIEW 預計算複雜查詢

---

## 🚫 已評估但未實施

> 目前無已拒絕的優化項目

### [範例：XXX 優化]
- **狀態**：🚫 已拒絕
- **拒絕原因**：（說明為什麼不適合實施）
- **評估日期**：YYYY-MM-DD

---

## 📈 效能指標記錄

### Vercel Function Invocations

| 期間 | Invocations/月 | 變化 | 備註 |
|------|----------------|------|------|
| 2024-11-03 (當前) | ~366 萬 (估計) | - | 每日 5000 訪客 |
| 實施 Middleware 調整後 | (待測量) | - | 預期減少 40-50% |
| 實施 Edge Functions 後 | (待測量) | - | 預期再減少 30% |
| 目標 | < 100 萬 | -73% | 符合 Hobby 方案限制 |

### API 延遲 (P95)

| API 端點 | 優化前 | 優化後 | 提升 |
|----------|--------|--------|------|
| `GET /api/auth/me` | (待測量) | - | - |
| `GET /api/market/search` | (待測量) | - | - |
| (待補充) | - | - | - |

### 成本估算

| 項目 | 優化前 | 優化後 | 節省 |
|------|--------|--------|------|
| Vercel 月費 | $20 (Pro) | $0 (Hobby) | $20/月 |
| 超額費用 | (待計算) | - | - |

---

## 🎯 下一步優化計劃

### 短期（1-2 週內）
1. ⭐ **調整 Middleware 匹配規則**（最高優先級）
2. **實施客戶端快取** (`/api/auth/me`)
3. **監控 Vercel Dashboard**（確認實際使用量）

### 中期（1 個月內）
1. **Edge Functions 遷移 - 第一階段**（6 個 API）
2. **資料庫查詢優化**（索引、VIEW）
3. **設置 Vercel Analytics 警報**

### 長期（3 個月內）
1. 評估 **WebSocket 即時通知**
2. 評估 **批次 API 請求**
3. 持續監控效能指標

---

## 📝 更新指南

每次實施優化後，請更新此文件：

1. **移動項目**：從「待評估」移至「已實施」
2. **填寫資訊**：
   - 實施日期
   - 相關 Commit hash
   - 實際效果（如果有測量數據）
3. **更新統計**：更新頂部的總覽統計
4. **記錄指標**：在「效能指標記錄」中記錄優化前後數據

### 使用 Git 記錄變更

```bash
git add docs/optimization/OPTIMIZATION_HISTORY.md
git commit -m "docs: 更新優化歷史 - 實施 [優化名稱]"
```

---

## 🔗 相關文件

- [CLAUDE.md](../../CLAUDE.md) - 開發指南
- [json-optimization-guide.md](./json-optimization-guide.md) - JSON 優化指南
- [Vercel Analytics Dashboard](https://vercel.com) - 實際效能數據

---

**最後提醒**：在建議新的優化前，請使用 `/opt-status` 指令檢查此文件，避免重複建議。
