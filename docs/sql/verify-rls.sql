-- ============================================================
-- RLS 和 Token 加密驗證查詢
-- ============================================================
-- 用途：驗證 Row Level Security 和 Token 加密是否正確配置
-- 建立日期：2025-10-26
-- ============================================================

-- ============================================================
-- 1. 檢查所有表的 RLS 狀態
-- ============================================================

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ RLS 已啟用'
    ELSE '❌ RLS 未啟用'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'sessions',
    'discord_profiles',
    'reputation_history',
    'listings',
    'interests',
    'audit_logs'
  )
ORDER BY tablename;

-- ============================================================
-- 2. 列出所有 RLS 策略（預期：無策略）
-- ============================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS operation,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 注意：我們採用「零權限 RLS」策略，所以不應該有任何策略
-- 如果此查詢返回結果，表示可能有舊的策略需要清理

-- ============================================================
-- 3. 檢查 sessions 表中的 Token 格式（加密驗證）
-- ============================================================

-- 檢查最近 5 筆 session 的 token 格式
SELECT
  id,
  user_id,
  LEFT(access_token, 50) AS access_token_sample,
  LENGTH(access_token) AS access_token_length,
  LEFT(refresh_token, 50) AS refresh_token_sample,
  LENGTH(refresh_token) AS refresh_token_length,
  CASE
    -- Base64 加密的 token 長度應該 > 100
    -- 且應該只包含 A-Z, a-z, 0-9, +, /, =
    WHEN LENGTH(access_token) > 100
     AND access_token ~ '^[A-Za-z0-9+/=]+$'
    THEN '✅ 可能已加密'
    WHEN LENGTH(access_token) < 100
    THEN '⚠️  可能是明文（舊資料）'
    ELSE '❓ 格式不明'
  END AS access_token_status,
  CASE
    WHEN LENGTH(refresh_token) > 100
     AND refresh_token ~ '^[A-Za-z0-9+/=]+$'
    THEN '✅ 可能已加密'
    WHEN LENGTH(refresh_token) < 100
    THEN '⚠️  可能是明文（舊資料）'
    ELSE '❓ 格式不明'
  END AS refresh_token_status,
  created_at,
  last_active_at
FROM sessions
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================
-- 4. 統計 Token 加密狀態
-- ============================================================

SELECT
  COUNT(*) AS total_sessions,
  SUM(CASE
    WHEN LENGTH(access_token) > 100
     AND access_token ~ '^[A-Za-z0-9+/=]+$'
    THEN 1 ELSE 0
  END) AS encrypted_sessions,
  SUM(CASE
    WHEN LENGTH(access_token) < 100
    THEN 1 ELSE 0
  END) AS plaintext_sessions,
  ROUND(
    100.0 * SUM(CASE
      WHEN LENGTH(access_token) > 100
       AND access_token ~ '^[A-Za-z0-9+/=]+$'
      THEN 1 ELSE 0
    END) / NULLIF(COUNT(*), 0),
    2
  ) || '%' AS encryption_rate
FROM sessions
WHERE revoked_at IS NULL;

-- ============================================================
-- 5. 檢查資料庫角色權限
-- ============================================================

-- 列出當前連線使用的角色
SELECT current_user AS current_role;

-- 檢查 service_role 是否有 bypassrls 權限
SELECT
  rolname,
  rolsuper AS is_superuser,
  rolcanlogin AS can_login,
  rolbypassrls AS bypass_rls,
  CASE
    WHEN rolbypassrls THEN '✅ 可繞過 RLS（預期行為）'
    ELSE '❌ 無法繞過 RLS'
  END AS rls_status
FROM pg_roles
WHERE rolname IN ('postgres', 'authenticator', 'service_role', 'anon', 'authenticated')
ORDER BY rolname;

-- ============================================================
-- 6. 測試 anon 角色訪問權限（需在 Supabase Dashboard 以 anon 身份執行）
-- ============================================================

-- 注意：此查詢需要使用 ANON_KEY 執行才能測試 RLS
-- 在 Supabase SQL Editor 中，預設使用 service_role，會繞過 RLS
-- 若要測試 anon 角色，需使用客戶端 SDK

-- 預期結果（使用 anon 角色時）：
-- SELECT * FROM users;        -- 應返回空陣列或錯誤
-- SELECT * FROM sessions;     -- 應返回空陣列或錯誤
-- SELECT * FROM listings;     -- 應返回空陣列或錯誤

-- ============================================================
-- 驗證摘要
-- ============================================================

DO $$
DECLARE
  total_tables INT;
  rls_enabled_tables INT;
  total_sessions INT;
  encrypted_sessions INT;
BEGIN
  -- 統計表的 RLS 狀態
  SELECT COUNT(*) INTO total_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('users', 'sessions', 'discord_profiles', 'reputation_history', 'listings', 'interests');

  SELECT COUNT(*) INTO rls_enabled_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('users', 'sessions', 'discord_profiles', 'reputation_history', 'listings', 'interests')
    AND c.relrowsecurity = true;

  -- 統計 token 加密狀態
  SELECT COUNT(*) INTO total_sessions
  FROM sessions
  WHERE revoked_at IS NULL;

  SELECT COUNT(*) INTO encrypted_sessions
  FROM sessions
  WHERE revoked_at IS NULL
    AND LENGTH(access_token) > 100
    AND access_token ~ '^[A-Za-z0-9+/=]+$';

  -- 輸出驗證摘要
  RAISE NOTICE '========================================';
  RAISE NOTICE '安全功能驗證摘要';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 RLS 狀態：';
  RAISE NOTICE '  - 總表數：%', total_tables;
  RAISE NOTICE '  - RLS 已啟用：%', rls_enabled_tables;
  IF rls_enabled_tables = total_tables THEN
    RAISE NOTICE '  ✅ 所有核心表都已啟用 RLS';
  ELSE
    RAISE WARNING '  ⚠️  有 % 個表尚未啟用 RLS', (total_tables - rls_enabled_tables);
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Token 加密狀態：';
  RAISE NOTICE '  - 總 Session 數：%', total_sessions;
  RAISE NOTICE '  - 已加密：%', encrypted_sessions;
  RAISE NOTICE '  - 明文（舊資料）：%', (total_sessions - encrypted_sessions);
  IF total_sessions > 0 THEN
    RAISE NOTICE '  - 加密率：%.2f%%', (100.0 * encrypted_sessions / total_sessions);
    IF encrypted_sessions = total_sessions THEN
      RAISE NOTICE '  ✅ 所有 Session 的 Token 都已加密';
    ELSIF encrypted_sessions > 0 THEN
      RAISE NOTICE '  ⚠️  部分 Session 尚未加密（舊資料將在 refresh 時自動加密）';
    ELSE
      RAISE WARNING '  ❌ 所有 Session 都是明文（可能加密功能未啟用）';
    END IF;
  ELSE
    RAISE NOTICE '  ℹ️  目前無任何 Session（尚未有用戶登入）';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '  1. 使用腳本測試 ANON_KEY 訪問（應被 RLS 阻止）';
  RAISE NOTICE '  2. 測試登入流程（新 Session 應自動加密）';
  RAISE NOTICE '  3. 測試 Token Refresh（舊資料將轉為加密）';
  RAISE NOTICE '========================================';
END $$;
