# 並發測試指南

> 驗證競態條件修復是否有效

---

## 📋 前置條件

1. **開發伺服器正在運行**
   ```bash
   npm run dev
   ```

2. **Migrations 已應用**
   - ✅ Migration 007: 唯一性約束
   - ✅ Migration 008: create_listing_safe 函數

3. **測試用戶已登入**
   - 需要有效的 session token

---

## 🚀 執行測試

### 步驟 1：取得 Session Token

1. 在瀏覽器中登入系統
2. 打開 DevTools（F12）→ Application → Cookies
3. 找到 `session_token` 並複製其值

### 步驟 2：執行測試腳本

```bash
# 設定環境變數並執行
TEST_USER_SESSION='your-session-token-here' \
  bash tests/concurrency/test-race-condition.sh
```

**可選配置**：

```bash
# 自定義 API URL（預設 http://localhost:3000/api/listings）
API_URL='http://localhost:3001/api/listings' \
TEST_USER_SESSION='your-token' \
  bash tests/concurrency/test-race-condition.sh
```

---

## 📊 測試內容

### 測試 1：並發建立相同物品

**目的**：驗證唯一性約束

**測試方法**：
- 發送 10 個並發請求，嘗試刊登相同物品（item_id: 1002000）

**預期結果**：
- ✅ **1 個成功**（HTTP 201）
- ⚠️  **9 個重複錯誤**（包含「已經刊登此物品」）

**驗證要點**：
- 資料庫唯一索引 `unique_active_listing_per_user_item` 正常運作
- 錯誤訊息友善且準確

---

### 測試 2：並發建立不同物品

**目的**：驗證配額限制

**測試方法**：
- 發送 10 個並發請求，嘗試刊登不同物品（item_id: 1002001~1002010）

**預期結果**：
- ✅ **最多 5 個成功**（配額上限）
- ⚠️  **其他請求收到配額錯誤**（包含「配額上限」）

**驗證要點**：
- `create_listing_safe()` 函數的 SELECT FOR UPDATE 鎖正常運作
- 配額計數準確，不會突破上限
- 並發請求被串行化處理

---

## ✅ 成功輸出範例

```
========================================
測試 1：並發建立相同物品
========================================

發送 10 個並發請求...
預期結果：只有 1 個成功，其他收到「已經刊登此物品」錯誤

分析結果...

請求 1: 成功 (HTTP 201)
請求 2: 重複刊登錯誤 (HTTP 400)
請求 3: 重複刊登錯誤 (HTTP 400)
...

統計結果：
  ✓ 成功: 1
  ⚠ 重複刊登錯誤: 9
  ⚠ 配額已滿錯誤: 0
  ✗ 其他錯誤: 0

✅ 測試 1 通過：唯一性約束正常運作

========================================
測試 2：並發建立不同物品
========================================

...

✅ 測試 2 通過：配額限制正常運作（成功 5 個，上限 5 個）

========================================
測試總結
========================================

🎉 所有測試通過！競態條件已成功修復

驗證結果：
  ✅ 唯一性約束有效（防止重複刊登）
  ✅ 配額限制有效（防止突破上限）
  ✅ 資料庫交易保證原子性
```

---

## ❌ 失敗情況排查

### 問題 1：測試 1 失敗（多個成功）

**可能原因**：
- 唯一性索引未正確建立
- migration 007 未執行

**解決方法**：
```bash
# 檢查索引是否存在
psql -d your_db -c "
SELECT indexname FROM pg_indexes
WHERE indexname = 'unique_active_listing_per_user_item';
"

# 如果不存在，重新執行 migration 007
```

---

### 問題 2：測試 2 失敗（成功 > 5）

**可能原因**：
- `create_listing_safe()` 函數未正確建立
- SELECT FOR UPDATE 鎖未生效
- API 路由未使用 RPC 函數

**解決方法**：
```bash
# 檢查函數是否存在
psql -d your_db -c "
SELECT proname FROM pg_proc
WHERE proname = 'create_listing_safe';
"

# 檢查 API 路由是否使用 RPC
grep -n "rpc('create_listing_safe'" src/app/api/listings/route.ts
```

---

### 問題 3：API 連線錯誤

**可能原因**：
- 開發伺服器未運行
- API URL 不正確

**解決方法**：
```bash
# 確認伺服器運行
npm run dev

# 測試 API 連線
curl http://localhost:3000/api/listings
```

---

### 問題 4：Session Token 無效

**症狀**：所有請求返回 401 Unauthorized

**解決方法**：
1. 確認已登入系統
2. 重新取得 session token（token 可能已過期）
3. 確認 cookie 名稱正確（預設為 `session_token`）

---

## 🧹 清理測試資料

測試完成後，清理產生的刊登：

1. **透過 UI**：前往「我的刊登」→ 刪除測試刊登

2. **透過 SQL**（僅限開發環境）：
   ```sql
   -- 刪除測試物品的刊登
   DELETE FROM listings
   WHERE item_id BETWEEN 1002000 AND 1002010
     AND user_id = 'your-user-id';

   -- 重置配額（如果需要）
   UPDATE user_quotas
   SET active_listings_count = 0
   WHERE user_id = 'your-user-id';
   ```

3. **清理臨時檔案**：
   ```bash
   rm -rf /tmp/trade-system-test
   ```

---

## 📝 手動測試

如果自動化測試不可行，可以手動測試：

### 手動測試 1：唯一性約束

1. 刊登一個物品（如：黑暗武士帽）
2. 快速點擊「刊登」按鈕 5-10 次（或開啟多個瀏覽器標籤頁同時刊登）
3. **預期結果**：只有 1 個成功，其他顯示「已經刊登此物品」

### 手動測試 2：配額限制

1. 快速刊登 10 個不同物品
2. **預期結果**：只能成功 5 個，第 6 個開始顯示「配額上限」

---

## 🔬 進階測試

### 測試 3：極端並發（壓力測試）

```bash
# 發送 100 個並發請求
CONCURRENT_REQUESTS=100 \
TEST_USER_SESSION='your-token' \
  bash tests/concurrency/test-race-condition.sh
```

**預期結果**：
- 配額限制仍然有效
- 資料庫無死鎖或超時錯誤
- 回應時間可接受（< 5 秒）

### 測試 4：多用戶並發

1. 取得 2-3 個不同用戶的 session token
2. 修改測試腳本，使用不同 token 同時發送請求
3. **預期結果**：每個用戶獨立計算配額，不互相影響

---

## 📚 相關文件

- [Migration 007: 唯一性約束](/home/aim840912/projects/maplestory/supabase/migrations/007_add_unique_active_listing_constraint.sql)
- [Migration 008: 安全函數](/home/aim840912/projects/maplestory/supabase/migrations/008_create_listing_safe_function.sql)
- [API 路由重構](/home/aim840912/projects/maplestory/src/app/api/listings/route.ts)
- [競態條件分析報告](/home/aim840912/projects/maplestory/docs/migrations/007-apply-unique-constraint.md)

---

**疑難排解**：如遇到問題，請檢查：
1. Migrations 是否已成功應用
2. 開發伺服器是否正常運行
3. Session token 是否有效
4. 測試用戶配額是否已清理
