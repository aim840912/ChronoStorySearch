# Row Level Security (RLS) 策略說明

> **最後更新**：2025-10-26

## 📋 概述

本專案採用 **Service Role + 最小權限 RLS** 策略，確保資料庫層級的安全防護。

## 🏗️ 架構特點

### 認證系統

- ✅ **自定義 Session 管理**（JWT + sessions 表）
- ❌ **不使用 Supabase Auth**（無 `auth.uid()`）
- ✅ **Discord OAuth 2.0** 作為身份提供者

### 資料庫訪問

```typescript
// 應用層使用 Service Role（繞過 RLS）
import { supabaseAdmin } from '@/lib/supabase/server'

const { data } = await supabaseAdmin
  .from('users')
  .select('*')
// Service Role 可以訪問所有資料
```

## 🔒 RLS 策略設計

### 核心原則

1. **所有表啟用 RLS**
   - 即使 ANON_KEY 洩漏，也無法直接訪問資料庫

2. **零權限授予**
   - `anon` 角色：**無任何權限**
   - `authenticated` 角色：**無任何權限**（因為不使用 Supabase Auth）

3. **Service Role 專屬訪問**
   - 應用層使用 Service Role 進行所有操作
   - Service Role 會繞過 RLS（PostgreSQL 預設行為）
   - 權限控制由應用層 API 中間件負責

### 安全層級

```
┌─────────────────────────────────────────┐
│  應用層防護（主要）                      │
├─────────────────────────────────────────┤
│  - withAuthAndError 中間件              │
│  - requireAuth / requireAdmin           │
│  - Session 驗證 (validateSession)       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  資料庫層防護（備用）                    │
├─────────────────────────────────────────┤
│  - RLS 啟用（防止直接訪問）             │
│  - Token 加密（XChaCha20-Poly1305）     │
│  - Service Role 專屬                    │
└─────────────────────────────────────────┘
```

## 🛡️ 防護場景

### 場景 1：ANON_KEY 洩漏

```typescript
// 攻擊者嘗試使用洩漏的 ANON_KEY
const supabase = createClient(SUPABASE_URL, LEAKED_ANON_KEY)

const { data, error } = await supabase
  .from('users')
  .select('*')

// ❌ 錯誤：RLS 策略阻止訪問
// error: "Row level security policy violation"
```

### 場景 2：直接資料庫連接

```sql
-- 攻擊者嘗試直接連接 PostgreSQL（使用洩漏的連接字串）
SELECT * FROM users;

-- ❌ 錯誤：RLS 策略阻止（除非使用 Service Role 連接）
-- ERROR:  new row violates row-level security policy
```

### 場景 3：SQL Injection

即使應用層有 SQL Injection 漏洞，RLS 也會限制可讀取的資料範圍。

## 📊 已保護的表

| 表名 | RLS 狀態 | 敏感資料 | 額外保護 |
|-----|---------|----------|---------|
| `users` | ✅ 啟用 | Discord 資訊 | - |
| `sessions` | ✅ 啟用 | access_token, refresh_token | XChaCha20-Poly1305 加密 |
| `discord_profiles` | ✅ 啟用 | 信譽分數 | - |
| `reputation_history` | ✅ 啟用 | 信譽變動記錄 | - |
| `listings` | ✅ 啟用 | 交易資訊 | - |
| `interests` | ✅ 啟用 | 購買意向 | - |
| `audit_logs` | ✅ 啟用 | 操作記錄 | - |

## 🔧 執行 RLS 配置

### 方法 1：使用 Supabase Dashboard

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇專案
3. 前往 **SQL Editor**
4. 複製貼上 `docs/sql/02-setup-rls.sql` 內容
5. 點擊 **Run** 執行

### 方法 2：使用 psql

```bash
# 取得資料庫連接字串（從 Supabase Settings → Database）
export DATABASE_URL="postgres://postgres:[password]@[host]:5432/postgres"

# 執行 RLS 配置
psql $DATABASE_URL < docs/sql/02-setup-rls.sql
```

## ✅ 驗證 RLS 是否生效

### 測試 1：使用 ANON_KEY 嘗試讀取

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // 使用 ANON_KEY
)

// 嘗試讀取 users 表
const { data, error } = await supabase
  .from('users')
  .select('*')

console.log(data)  // 預期：[]（空陣列）
console.log(error) // 預期：null 或 policy violation error
```

### 測試 2：檢查 RLS 狀態

```sql
-- 在 Supabase SQL Editor 執行
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'sessions', 'discord_profiles', 'reputation_history', 'listings', 'interests', 'audit_logs');
```

預期結果：所有表的 `rls_enabled` 都應該是 `true`。

### 測試 3：檢查策略數量

```sql
-- 在 Supabase SQL Editor 執行
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public';
```

預期結果：**無任何策略**（因為我們不授予 anon/authenticated 權限）。

## 🔄 與現有系統的整合

### API 中間件

```typescript
// src/lib/middleware/api-middleware.ts

// ✅ 應用層權限控制（主要防護）
export const withAuthAndError = (
  handler: (req: NextRequest, user: User) => Promise<Response>,
  options?: MiddlewareOptions
) => {
  return async (req: NextRequest) => {
    // 1. 驗證 session
    const { valid, user } = await validateSession(req)

    if (!valid || !user) {
      return error('需要登入', 'UNAUTHORIZED', 401)
    }

    // 2. 執行 handler（使用 supabaseAdmin，繞過 RLS）
    return handler(req, user)
  }
}
```

### Service Role 使用

```typescript
// src/lib/supabase/server.ts

// ✅ Service Role（繞過 RLS）
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey, // Service Role Key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
```

## 🚫 不適用的 RLS 策略

以下策略**不適用於本專案**（因為不使用 Supabase Auth）：

```sql
-- ❌ 不適用：無法使用 auth.uid()
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);  -- auth.uid() 在本專案中不存在

-- ❌ 不適用：不使用 authenticated 角色
CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
```

## 📚 參考文件

- [Supabase Row Level Security 文件](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [本專案架構設計](./architecture/交易系統/02-認證與資料庫.md)

## 💡 常見問題

### Q: 為什麼不使用 Supabase Auth？

A: 因為我們使用 **Discord OAuth 2.0** 作為唯一的認證方式，自定義 Session 管理更適合我們的需求：
- 完全控制 Session 生命週期
- Token 加密存儲（Discord access_token/refresh_token）
- 更靈活的權限管理

### Q: 為什麼 Service Role 可以繞過 RLS？

A: 這是 PostgreSQL 和 Supabase 的預設行為。Service Role 擁有 `bypassrls` 權限，專門用於系統管理和應用層操作。

### Q: 如果 Service Role Key 洩漏怎麼辦？

A: 這是極為嚴重的安全事件，需要立即：
1. 在 Supabase Dashboard 重新生成 Service Role Key
2. 更新所有環境變數
3. 重新部署應用
4. 審計所有資料庫操作記錄

### Q: RLS 真的有用嗎（既然 Service Role 繞過它）？

A: 有用！RLS 保護以下場景：
- ✅ ANON_KEY 洩漏（攻擊者無法讀取資料）
- ✅ 直接資料庫訪問（非 Service Role 連接）
- ✅ 應用層漏洞（SQL Injection 等）

## 📝 版本歷史

- **2025-10-26**：初版發布，配置 Service Role + 最小權限 RLS 策略
