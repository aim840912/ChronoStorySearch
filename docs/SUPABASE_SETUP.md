# Supabase 資料庫設定指南

> **階段 0**：基礎架構設定
>
> **預估時間**：15-30 分鐘

---

## 📚 目錄

1. [建立 Supabase 專案](#步驟-1建立-supabase-專案)
2. [執行資料庫 Migration](#步驟-2執行資料庫-migration)
3. [驗證資料庫結構](#步驟-3驗證資料庫結構)
4. [配置環境變數](#步驟-4配置環境變數)
5. [測試連線](#步驟-5測試連線)
6. [常見問題](#常見問題)

---

## 步驟 1：建立 Supabase 專案

### 1.1 前往 Supabase Dashboard

1. 打開瀏覽器，前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 使用 GitHub 帳號登入
3. 點擊 **「New project」** 按鈕

### 1.2 建立專案

填寫以下資訊：

```yaml
Project Name: maplestory-trading
Database Password: <產生強密碼並儲存>
Region: Northeast Asia (Tokyo) 或 Southeast Asia (Singapore)
Pricing Plan: Free（開發階段使用）
```

⚠️ **重要**：
- 資料庫密碼**只會顯示一次**，請立即複製儲存
- 建議使用密碼管理器（如 1Password、Bitwarden）
- Region 選擇離用戶最近的區域（降低延遲）

### 1.3 等待專案建立

專案建立需要 1-2 分鐘，完成後會看到專案 Dashboard。

---

## 步驟 2：執行資料庫 Migration

### 2.1 前往 SQL Editor

1. 在 Supabase Dashboard 左側選單，點擊 **「SQL Editor」**
2. 點擊 **「New query」** 按鈕

### 2.2 執行 Migration SQL

**情境 A**：如果您已經建立了 sessions 表（但缺少欄位）

1. 開啟檔案：`docs/sql/01-fix-sessions-schema.sql`
2. 複製完整的 SQL 內容
3. 貼到 SQL Editor
4. 點擊 **「Run」** 按鈕（或按 `Ctrl/Cmd + Enter`）

**情境 B**：如果您尚未建立任何表（全新安裝）

1. 開啟檔案：`docs/sql/00-init-schema.sql`
2. 複製完整的 SQL 內容
3. 貼到 SQL Editor
4. 點擊 **「Run」** 按鈕（或按 `Ctrl/Cmd + Enter`）

### 2.3 檢查執行結果

執行成功後，您應該看到類似以下的訊息：

```
NOTICE: Added token_expires_at column to sessions table
NOTICE: Added revoked_at column to sessions table
NOTICE: Added profile_privacy column to discord_profiles table
NOTICE: ========================================
NOTICE: Migration 01 completed successfully!
NOTICE: ========================================
```

如果看到錯誤訊息，請參考 [常見問題](#常見問題) 章節。

---

## 步驟 3：驗證資料庫結構

### 3.1 檢查表是否建立成功

在 SQL Editor 執行以下查詢：

```sql
-- 列出所有表
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**預期結果**（應該包含以下表）：
- `users`
- `sessions`
- `discord_profiles`
- `reputation_history`
- `listings`
- `interests`
- `audit_logs`

### 3.2 檢查 sessions 表結構

```sql
-- 查看 sessions 表的欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;
```

**必須包含的欄位**：
- ✅ `id` (uuid)
- ✅ `user_id` (uuid)
- ✅ `access_token` (text)
- ✅ `refresh_token` (text)
- ✅ `expires_at` (timestamp with time zone)
- ✅ `token_expires_at` (timestamp with time zone) ← **重要**
- ✅ `revoked_at` (timestamp with time zone) ← **重要**
- ✅ `created_ip` (inet)
- ✅ `user_agent` (text)
- ✅ `created_at` (timestamp with time zone)
- ✅ `last_active_at` (timestamp with time zone)

### 3.3 檢查 discord_profiles 表結構

```sql
-- 查看 discord_profiles 表的欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'discord_profiles'
ORDER BY ordinal_position;
```

**必須包含的欄位**：
- ✅ `user_id` (uuid)
- ✅ `account_created_at` (timestamp with time zone)
- ✅ `reputation_score` (integer)
- ✅ `profile_privacy` (text) ← **重要**
- ✅ `server_roles` (ARRAY)

---

## 步驟 4：配置環境變數

### 4.1 取得 Supabase 連線資訊

1. 在 Supabase Dashboard，點擊左側選單的 **「Settings」** → **「API」**
2. 找到以下資訊：

```yaml
Project URL: https://your-project-id.supabase.co
API Key (anon, public): eyJhbGci...（public key）
Service Role Key: eyJhbGci...（service role key，保密）
```

### 4.2 更新 `.env.local`

開啟專案根目錄的 `.env.local` 檔案，找到 Supabase 相關的環境變數並填入：

```bash
# ============================================================
# Supabase 資料庫配置
# ============================================================

# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Anonymous Key（前端使用）
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Supabase Service Role Key（後端使用，請勿洩漏）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

⚠️ **安全注意事項**：
- `NEXT_PUBLIC_*` 開頭的變數會暴露給前端，不要放敏感資訊
- `SUPABASE_SERVICE_ROLE_KEY` 擁有完整資料庫權限，絕對不能洩漏
- `.env.local` 已加入 `.gitignore`，不會被提交到 Git

### 4.3 重啟開發伺服器

環境變數修改後，需要重啟開發伺服器：

```bash
# 停止開發伺服器（Ctrl+C）

# 重新啟動
npm run dev
```

---

## 步驟 5：測試連線

### 5.1 測試 Supabase 連線

在專案中執行以下測試（可選）：

```bash
# 測試 Supabase 連線（如果有測試端點）
curl http://localhost:3000/api/test/supabase
```

### 5.2 測試 Discord OAuth 流程

1. 開啟瀏覽器，前往：`http://localhost:3000`
2. 點擊「使用 Discord 登入」按鈕（如果前端已實作）
3. 授權 Discord 應用程式
4. 成功：應該被重導向回首頁並看到登入狀態
5. 失敗：檢查瀏覽器 Console 和 Terminal 的錯誤訊息

---

## 常見問題

### Q1: 執行 SQL 時出現「permission denied」錯誤

**原因**：當前使用的資料庫連線沒有足夠權限。

**解決方法**：
1. 確認您在 Supabase Dashboard 的 SQL Editor 中執行
2. SQL Editor 預設使用 `postgres` 角色（有完整權限）
3. 不要使用 `anon` 或 `authenticated` 角色執行 DDL 語句

### Q2: 執行 SQL 後沒有看到新欄位

**原因**：可能 schema cache 沒有更新。

**解決方法**：
```sql
-- 刷新 schema cache
NOTIFY pgrst, 'reload schema';
```

### Q3: 「ERROR: 42P17: functions in index predicate must be marked IMMUTABLE」錯誤

**錯誤訊息範例**：
```
ERROR: 42P17: functions in index predicate must be marked IMMUTABLE
```

**原因**：PostgreSQL 不允許在索引的 WHERE 條件中使用 `NOW()` 函數（`NOW()` 是 STABLE 而非 IMMUTABLE）。

**解決方法**：

**選項 A**：使用修正後的 SQL（推薦）
- 確保使用最新版本的 migration SQL
- 檔案路徑：`docs/sql/01-fix-sessions-schema.sql`
- 最新版本已移除索引中的 `NOW()` 函數

**選項 B**：手動執行修正後的索引 SQL

```sql
-- 刪除有問題的索引（如果已建立）
DROP INDEX IF EXISTS idx_expires;
DROP INDEX IF EXISTS idx_sessions_active;
DROP INDEX IF EXISTS idx_sessions_token_expiry;

-- 重新建立索引（不含 NOW() 條件）
CREATE INDEX IF NOT EXISTS idx_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id, expires_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_token_expiry ON sessions(user_id, token_expires_at)
  WHERE revoked_at IS NULL;
```

**效能影響說明**：
- ✅ 移除 `NOW()` 後，索引稍微變大（包含已過期記錄）
- ✅ 查詢時仍需在 WHERE 條件中加上 `expires_at > NOW()` 過濾
- ✅ 實際查詢效能幾乎不受影響

### Q4: 「column already exists」錯誤

**原因**：欄位已經存在，可能之前已執行過 migration。

**解決方法**：
- 這是正常的，migration SQL 使用 `IF NOT EXISTS` 檢查
- 如果看到 `NOTICE: xxx column already exists`，表示欄位已存在
- 可以忽略此訊息，繼續後續步驟

### Q5: Discord OAuth 還是失敗，顯示「Failed to create session」

**診斷步驟**：

1. **確認欄位是否正確添加**：

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'sessions'
AND column_name IN ('token_expires_at', 'revoked_at');
```

應該返回 2 筆結果。

2. **檢查開發日誌**：

```bash
# 查看 Next.js 日誌
cat /tmp/nextjs-dev.log | grep -i "error"
```

找到具體的錯誤訊息。

3. **刷新 PostgREST Schema**：

```sql
NOTIFY pgrst, 'reload schema';
```

4. **重啟開發伺服器**：

```bash
# 停止並重啟
pkill -f "next dev"
npm run dev
```

### Q6: 找不到 Supabase Service Role Key

**位置**：
1. Supabase Dashboard → Settings → API
2. 展開 **「Service role」** 區塊
3. 點擊 **「Reveal」** 按鈕顯示完整 key
4. 點擊 **「Copy」** 複製

⚠️ **注意**：這個 key 擁有完整資料庫權限，請小心保管。

### Q7: 如何驗證環境變數是否正確設定？

```bash
# 檢查環境變數（不會顯示完整內容）
grep -E "SUPABASE" .env.local

# 應該看到三個變數
```

或在 Next.js 中測試：

```bash
# 測試環境變數是否載入
curl http://localhost:3000/api/test/env
```

---

## 下一步

資料庫設定完成後，您可以：

1. ✅ 測試 Discord OAuth 登入流程
2. ✅ 開始實作 Stage 2 核心功能（刊登、市場、意向）
3. ✅ 設定 Row Level Security (RLS) 策略（可選）

繼續前往：**[Discord OAuth 設定指南](./DISCORD_OAUTH_SETUP.md)**

---

## 參考資源

- [Supabase 官方文件](https://supabase.com/docs)
- [PostgREST API 文件](https://postgrest.org/en/stable/)
- [專案架構文件](./architecture/交易系統/02-認證與資料庫.md)

---

**疑難排解**：如遇到問題，請檢查：
1. Supabase 專案是否正常運行（Dashboard 可訪問）
2. 環境變數是否正確設定（檢查 `.env.local`）
3. 開發伺服器是否已重啟（環境變數變更後必須重啟）
4. SQL 是否成功執行（檢查 SQL Editor 的輸出）

**需要協助**？請查看：
- Supabase Community: https://github.com/supabase/supabase/discussions
- 專案 Issue Tracker: https://github.com/your-repo/issues
