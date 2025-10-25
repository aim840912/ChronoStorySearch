# Supabase Migrations 執行指引

本目錄包含 MapleStory Trading System 的資料庫 Schema 和 RLS 策略。

## 📋 Migration 清單

| 檔案 | 說明 | 狀態 |
|------|------|------|
| `001_initial_schema.sql` | 建立核心資料庫表（users, sessions, listings 等） | ⏳ 待執行 |
| `002_row_level_security.sql` | 設定 Row Level Security 策略 | ⏳ 待執行 |

---

## 🚀 執行步驟

### 方法 1：Supabase Dashboard（推薦）

1. **開啟 Supabase SQL Editor**
   - 前往 [Supabase Dashboard](https://supabase.com/dashboard)
   - 選擇您的專案：`kngkrgmfhihsrncovwbr`
   - 點擊左側選單 **SQL Editor**

2. **執行 Migration 001**
   - 點擊 **New Query**
   - 複製 `001_initial_schema.sql` 的完整內容
   - 貼上並點擊 **Run**
   - 確認輸出顯示：`Success. No rows returned`

3. **執行 Migration 002**
   - 建立另一個 **New Query**
   - 複製 `002_row_level_security.sql` 的完整內容
   - 貼上並點擊 **Run**
   - 確認輸出顯示：`Success. No rows returned`

4. **驗證 Schema**
   - 點擊左側選單 **Table Editor**
   - 確認以下表已建立：
     - ✅ users
     - ✅ sessions
     - ✅ discord_profiles
     - ✅ reputation_history
     - ✅ listings
     - ✅ interests
     - ✅ reports
     - ✅ user_quotas
     - ✅ ip_quotas

5. **驗證 RLS 策略**
   - 選擇任一表（如 `listings`）
   - 點擊右上角 **⚙️ Settings**
   - 查看 **Policies** 分頁
   - 確認 RLS 已啟用且策略已建立

---

### 方法 2：Supabase CLI（進階）

如果您已安裝 Supabase CLI：

```bash
# 1. 確認專案連結
supabase link --project-ref kngkrgmfhihsrncovwbr

# 2. 執行所有 migration
supabase db push

# 3. 驗證 migration
supabase db diff
```

---

## 📊 資料庫結構說明

### 核心表關聯

```
users (用戶)
  ├─→ sessions (OAuth Session)
  ├─→ discord_profiles (Discord 資料 + 信譽)
  ├─→ reputation_history (信譽變動記錄)
  ├─→ listings (刊登 - 作為賣家)
  ├─→ interests (購買意向 - 作為買家)
  ├─→ reports (舉報 - 作為舉報者)
  └─→ user_quotas (配額限制)

listings (刊登)
  ├─→ interests (收到的購買意向)
  └─→ reports (收到的舉報)

ip_quotas (IP 配額) - 獨立表，無外鍵
```

### 安全機制

**雙重防護架構**：
1. **API Middleware**：應用層認證檢查（withAuthAndError）
2. **RLS Policies**：資料庫層權限控制（ENABLE ROW LEVEL SECURITY）

**RLS 策略總覽**：
- `users`: 所有人可讀，僅自己可寫
- `sessions`: 僅自己可讀寫
- `listings`: 所有人可讀 active 刊登，僅自己可寫
- `interests`: 買家可讀寫自己的意向，賣家可讀收到的意向
- `reports`: 僅自己可讀寫自己的舉報，管理員可讀寫所有
- `discord_profiles`: 所有人可讀，系統可寫
- `user_quotas`: 僅自己可讀，系統可寫
- `ip_quotas`: 僅系統可讀寫

---

## ⚠️ 注意事項

### Migration 執行順序

**必須按照檔案編號順序執行**：
1. ✅ `001_initial_schema.sql` - 建立表結構
2. ✅ `002_row_level_security.sql` - 設定 RLS 策略

### Service Role Key

- RLS 策略中使用 `service_role` 的部分需要使用 **SUPABASE_SERVICE_ROLE_KEY**
- 此 Key 可繞過 RLS，僅能在伺服器端使用
- **永遠不要**將 Service Role Key 暴露到客戶端

### 測試 RLS

執行 Migration 後，建議在 SQL Editor 中測試 RLS：

```sql
-- 測試：嘗試以認證用戶身份查詢
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000000';

-- 應該只能看到自己的刊登
SELECT * FROM listings;

-- 重置為 service_role
RESET ROLE;
```

---

## 🚨 故障排除

### 問題 1：索引錯誤 - NOW() 函數不是 IMMUTABLE

**錯誤訊息**：
```
ERROR: 42P17: functions in index predicate must be marked IMMUTABLE
```

**原因**：
- PostgreSQL 的 partial index（帶 WHERE 條件的索引）要求條件必須是 `IMMUTABLE`
- `NOW()` 函數是 `STABLE`（不同時間調用會返回不同值）
- 不能在索引 predicate 中使用 `NOW()`、`CURRENT_TIMESTAMP` 等時間函數

**解決方式**：
✅ **已修正**：Migration 001 已移除有問題的索引
- 原：`CREATE INDEX idx_expires ON sessions(expires_at) WHERE expires_at > NOW();`
- 改：已刪除此索引（使用 `idx_user_sessions` 索引已足夠）

**如果您已經執行過舊版 Migration**：
```sql
-- 刪除舊的有問題索引（如果存在）
DROP INDEX IF EXISTS idx_expires;

-- 重新執行 Migration 001（完整內容）
```

### 問題 2：外鍵約束錯誤

**錯誤訊息**：
```
ERROR: insert or update on table violates foreign key constraint
```

**原因**：
- 嘗試插入的資料引用了不存在的外鍵

**解決方式**：
1. 確認所有 Migration 已按順序執行
2. 檢查插入順序（先插入父表，再插入子表）

### 問題 3：RLS 策略阻擋操作

**現象**：
- 查詢返回空結果
- 更新/刪除操作無效

**解決方式**：
```sql
-- 檢查 RLS 是否啟用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 檢查當前角色
SELECT current_user;

-- 使用 service_role 身份測試（繞過 RLS）
-- 在 Supabase Dashboard SQL Editor 中，預設使用 postgres 角色（等同 service_role）
```

---

## 🔄 Rollback（回滾）

如果需要回滾 migration：

```sql
-- 回滾 002: RLS 策略
DROP POLICY IF EXISTS "Users can view all user profiles" ON users;
-- ... (刪除所有策略)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ... (對所有表執行)

-- 回滾 001: 刪除表
DROP TABLE IF EXISTS ip_quotas CASCADE;
DROP TABLE IF EXISTS user_quotas CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS interests CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS reputation_history CASCADE;
DROP TABLE IF EXISTS discord_profiles CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

**⚠️ 警告**：回滾會刪除所有資料，請謹慎操作！

---

## 📚 相關文檔

- [Supabase Row Level Security 官方文檔](https://supabase.com/docs/guides/auth/row-level-security)
- [架構設計文檔](../docs/architecture/交易系統架構設計.md)
- [API 設計規範](../docs/architecture/交易系統架構設計.md#api-設計)

---

## ✅ Migration 狀態追蹤

執行完成後，請在此處標記：

- [ ] 001_initial_schema.sql - 執行完成
- [ ] 002_row_level_security.sql - 執行完成
- [ ] RLS 測試通過
- [ ] Table Editor 確認所有表存在
